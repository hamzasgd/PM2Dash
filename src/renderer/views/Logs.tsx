import React, { useState, useEffect, ChangeEvent, useCallback, useRef, useMemo } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  MenuItem,
  Select,
  Alert,
  AlertTitle,
  IconButton,
  TextField,
  InputAdornment,
  Divider,
  Snackbar,
  Paper,
  useTheme,
  SelectChangeEvent,
  Tooltip,
} from '@mui/material';
import { useParams, Link as RouterLink } from 'react-router-dom';
import { MdRefresh, MdSearch, MdClear, MdDownload, MdAutorenew, MdPause } from 'react-icons/md';
import ConnectionStatus from '../components/ConnectionStatus';
import LogsSkeleton from '../components/LogsSkeleton';
import PageContainer from '../components/PageContainer';
import { useConnection } from '../context/ConnectionContext';

interface Process {
  name: string;
  pm_id: number;
}

// Helper to create a debounced function
const debounce = <F extends (...args: any[]) => any>(
  func: F,
  wait: number
): ((...args: Parameters<F>) => void) => {
  let timeout: ReturnType<typeof setTimeout> | null = null;
  
  return function(...args: Parameters<F>) {
    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(() => {
      func(...args);
    }, wait);
  };
};

const Logs: React.FC = () => {
  const { processName } = useParams<{ processName?: string }>();
  const [processes, setProcesses] = useState<Process[]>([]);
  const [selectedProcess, setSelectedProcess] = useState<string | null>(processName || null);
  const [logs, setLogs] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filterText, setFilterText] = useState('');
  const [connected, setConnected] = useState(false);
  const theme = useTheme();
  const monospaceColor = theme.palette.mode === 'light' ? theme.palette.grey[800] : theme.palette.grey[100];
  const monospaceBackground = theme.palette.mode === 'light' ? theme.palette.grey[100] : theme.palette.grey[900];
  const [snackbar, setSnackbar] = useState<{open: boolean, message: string, severity: 'success' | 'error' | 'warning' | 'info'}>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  // Add refreshInterval state to control how often logs are refreshed
  const [refreshInterval, setRefreshInterval] = useState<number>(5000); // 5 seconds by default
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const logsContainerRef = useRef<HTMLDivElement>(null);

  // Add a constant for maximum lines to display
  const MAX_DISPLAYED_LINES = 1000;

  // Auto-scroll to bottom when logs update
  useEffect(() => {
    if (logsContainerRef.current && !isLoading) {
      logsContainerRef.current.scrollTop = logsContainerRef.current.scrollHeight;
    }
  }, [logs, isLoading]);

  // Define logs fetching state to track in-flight requests
  const [isFetchingLogs, setIsFetchingLogs] = useState(false);
  const [isFetchingProcesses, setIsFetchingProcesses] = useState(false);
  const lastFetchTimeRef = useRef(0);
  const lastProcessesFetchTimeRef = useRef(0);
  const fetchLogsRef = useRef<(name: string) => Promise<void>>();

  // Use connection context instead of state
  const { connected: connectionContextConnected } = useConnection();

  // Fetch process list, used on mount and when connection changes
  const fetchProcesses = useCallback(async () => {
    if (!connectionContextConnected) {
      setProcesses([]);
      return;
    }
    
    try {
      const response = await window.api.listProcesses();
      if (response && response.success) {
        if (Array.isArray(response.processes)) {
          setProcesses(response.processes);
        } else {
          console.error('Invalid processes array in response:', response.processes);
          setProcesses([]);
        }
      } else {
        console.warn('Failed to fetch processes:', response?.message);
        setProcesses([]);
      }
    } catch (error) {
      console.error('Error fetching processes:', error);
      setProcesses([]);
    }
  }, [connectionContextConnected]);

  // Fetch logs for a specific process
  const fetchLogs = useCallback(async (processName: string) => {
    if (!processName || !connectionContextConnected) {
      return;
    }

    setIsFetchingLogs(true);
    
    try {
      const response = await window.api.getProcessLogs(processName);
      if (response && response.success) {
        const logLines = response.logs
          .split('\n')
          .filter((line: string) => line.trim() !== '');
        
        setLogs(logLines);
        setLastRefreshed(new Date());
        setError(null);
      } else {
        console.warn('Failed to fetch logs:', response?.message);
        setError(`Failed to fetch logs: ${response?.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
      setError(`Error fetching logs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsFetchingLogs(false);
    }
  }, [connectionContextConnected]);

  // Store fetchLogs in a ref so we can use it in the effect dependencies
  useEffect(() => {
    fetchLogsRef.current = fetchLogs;
  }, [fetchLogs]);

  // Load processes when connected status changes
  useEffect(() => {
    fetchProcesses();
  }, [fetchProcesses, connectionContextConnected]);

  // Update the auto-refresh useEffect to depend on connected state
  useEffect(() => {
    // Skip if no process selected, auto-refresh disabled, or explicitly disconnected
    if (!selectedProcess || !autoRefresh || !connectionContextConnected) {
      return;
    }
    
    let isActive = true;
    
    // Set a sensible refresh rate (15 seconds minimum)
    const actualRefreshInterval = Math.max(refreshInterval, 15000);
    
    const refreshLogs = async () => {
      if (!isActive || !selectedProcess || isFetchingLogs || !fetchLogsRef.current || !connectionContextConnected) return;
      
      try {
        // Only refresh if we're not already fetching logs
        if (!isFetchingLogs) {
          console.log(`Auto-refreshing logs for: ${selectedProcess} (interval: ${actualRefreshInterval}ms)`);
          fetchLogsRef.current(selectedProcess);
        }
      } catch (err) {
        console.error('Error during auto-refresh:', err);
      }
    };
    
    console.log(`Starting auto-refresh with interval: ${actualRefreshInterval}ms`);
    
    // Set up polling with the current refresh interval (minimum 15 seconds)
    const intervalId = setInterval(refreshLogs, actualRefreshInterval);
    
    // Cleanup
    return () => {
      isActive = false;
      clearInterval(intervalId);
    };
  }, [selectedProcess, connectionContextConnected, refreshInterval, autoRefresh, isFetchingLogs]);
  
  // Add a useEffect to handle process list polling with a MUCH lower frequency
  useEffect(() => {
    // Skip if not connected
    if (!connectionContextConnected) {
      return;
    }
    
    // Only fetch processes every minute at most
    const processPollInterval = 60000; // 1 minute
    
    console.log(`Setting up process list polling with interval: ${processPollInterval}ms`);
    
    // Initial fetch
    fetchProcesses();
    
    // Set up a very slow polling interval to avoid hammering the server
    const intervalId = setInterval(() => {
      console.log("Periodic process list refresh");
      fetchProcesses();
    }, processPollInterval);
    
    return () => {
      clearInterval(intervalId);
    };
  }, [connectionContextConnected, fetchProcesses]);

  const handleProcessChange = (e: SelectChangeEvent) => {
    const name = e.target.value;
    setSelectedProcess(name);
    if (name) {
      fetchLogs(name);
    } else {
      setLogs([]);
    }
  };

  const handleRefresh = () => {
    if (selectedProcess) {
      fetchLogs(selectedProcess);
    }
  };

  const handleDownload = () => {
    if (!logs || logs.length === 0) {
      setSnackbar({
        open: true,
        message: 'No logs to download',
        severity: 'warning'
      });
      return;
    }

    const blob = new Blob([logs.join('\n')], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedProcess}-${new Date().toISOString()}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setSnackbar({
      open: true,
      message: 'Logs Downloaded',
      severity: 'success'
    });
  };

  // Update the filter logic
  const filteredLogs = useMemo(() => {
    // Use the array of logs directly
    let processedLines = filterText
      ? logs.filter(line => line.toLowerCase().includes(filterText.toLowerCase()))
      : logs;
      
    // Limit the number of lines to improve performance
    if (processedLines.length > MAX_DISPLAYED_LINES) {
      processedLines = processedLines.slice(0, MAX_DISPLAYED_LINES);
    }
    
    return processedLines;
  }, [logs, filterText]);

  // Add a state to track if logs were truncated
  const [logsTruncated, setLogsTruncated] = useState(false);

  // Check if logs were truncated when they change
  useEffect(() => {
    const lineCount = logs.length;
    setLogsTruncated(lineCount > MAX_DISPLAYED_LINES);
  }, [logs]);

  const handleCloseSnackbar = () => {
    setSnackbar({...snackbar, open: false});
  };

  // Function to apply syntax highlighting to log lines
  const highlightSyntax = (text: string): string => {
    if (!text) return '&nbsp;'; // Return non-breaking space for empty lines

    // Escape HTML to prevent XSS
    let escapedText = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
    
    // Highlight JSON objects and arrays
    if ((text.includes('{') && text.includes('}')) || (text.includes('[') && text.includes(']'))) {
      try {
        // Try to find JSON-like structures
        // Look for objects between { }
        escapedText = escapedText.replace(
          /(\{.*?\})/g,
          '<span style="color: #CE9178;">$1</span>'
        );
        
        // Highlight property names in objects (key: value)
        escapedText = escapedText.replace(
          /(".*?"|'.*?')(\s*:\s*)/g,
          '<span style="color: #9CDCFE;">$1</span>$2'
        );
        
        // Highlight numeric values
        escapedText = escapedText.replace(
          /:\s*(-?\d+(\.\d+)?)/g,
          ': <span style="color: #B5CEA8;">$1</span>'
        );
        
        // Highlight boolean values
        escapedText = escapedText.replace(
          /:\s*(true|false)/gi,
          ': <span style="color: #569CD6;">$1</span>'
        );
        
        // Highlight null values
        escapedText = escapedText.replace(
          /:\s*(null|undefined)/gi,
          ': <span style="color: #569CD6;">$1</span>'
        );
      } catch (e) {
        // If any error in regex, just use the original escaped text
        console.log('Error highlighting JSON:', e);
      }
    }
    
    // Highlight timestamps
    escapedText = escapedText.replace(
      /\b(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)\b/g,
      '<span style="color: #4EC9B0;">$1</span>'
    );
    
    // Highlight date/time patterns (not ISO format)
    escapedText = escapedText.replace(
      /\b(\d{1,2}\/\d{1,2}\/\d{2,4}|\d{1,2}:\d{2}(:\d{2})?(\s*(AM|PM))?)\b/gi,
      '<span style="color: #4EC9B0;">$1</span>'
    );
    
    // Highlight URLs
    escapedText = escapedText.replace(
      /(https?:\/\/[^\s]+)/g,
      '<span style="color: #3794FF; text-decoration: underline;">$1</span>'
    );
    
    // Highlight ID-like patterns (UUIDs, etc.)
    escapedText = escapedText.replace(
      /\b([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\b/gi,
      '<span style="color: #C586C0;">$1</span>'
    );
    
    return escapedText;
  };

  const toggleAutoRefresh = () => {
    setAutoRefresh(!autoRefresh);
  };

  if (connectionContextConnected === null) {
    return <LogsSkeleton />;
  }

  if (connectionContextConnected === false) {
    return (
      <ConnectionStatus 
        title="Process Logs Unavailable"
        message="Please connect to an SSH server to view logs for your PM2 processes."
      />
    );
  }

  return (
    <PageContainer
      title="Process Logs"
      description="View and filter logs from your PM2 processes"
      actions={
        <Stack direction="row" spacing={2}>
          <Select
            value={selectedProcess || ''}
            onChange={handleProcessChange}
            displayEmpty
            sx={{ width: 200 }}
            size="small"
            disabled={!connectionContextConnected}
          >
            <MenuItem value="" disabled>Select Process</MenuItem>
            {processes.map(process => (
              <MenuItem key={process.pm_id} value={process.name}>
                {process.name}
              </MenuItem>
            ))}
          </Select>
          
          <TextField
            placeholder="Filter logs..."
            value={filterText}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setFilterText(e.target.value)}
            size="small"
            sx={{ width: 300 }}
            disabled={!connectionContextConnected || !selectedProcess}
            InputProps={{
              endAdornment: filterText ? (
                <InputAdornment position="end">
                  <IconButton
                    aria-label="Clear filter"
                    onClick={() => setFilterText('')}
                    edge="end"
                    size="small"
                  >
                    <MdClear />
                  </IconButton>
                </InputAdornment>
              ) : null
            }}
          />
          
          <Button
            startIcon={autoRefresh ? <MdAutorenew /> : <MdRefresh />}
            onClick={autoRefresh ? toggleAutoRefresh : handleRefresh}
            disabled={!connectionContextConnected || !selectedProcess}
            variant="outlined"
            color={autoRefresh ? "success" : "primary"}
            sx={{
              backgroundColor: autoRefresh ? 'rgba(76, 175, 80, 0.08)' : 'transparent',
              '&:hover': {
                backgroundColor: autoRefresh ? 'rgba(76, 175, 80, 0.15)' : 'rgba(25, 118, 210, 0.08)'
              }
            }}
          >
            {autoRefresh ? "Auto-refresh ON" : "Refresh Now"}
          </Button>
          
          <IconButton
            aria-label="Download logs"
            onClick={handleDownload}
            disabled={!logs || !connectionContextConnected}
            color="primary"
          >
            <MdDownload />
          </IconButton>
        </Stack>
      }
    >
      <Snackbar 
        open={snackbar.open} 
        autoHideDuration={3000} 
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleCloseSnackbar} 
          severity={snackbar.severity} 
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>

      <Box sx={{ p: 2, height: 'calc(100vh - 120px)', display: 'flex', flexDirection: 'column' }}>
        {error && (
          <Alert 
            severity={error.includes("waiting for reconnection") ? "warning" : "error"} 
            sx={{ mb: 2 }}
            action={
              error.includes("waiting for reconnection") ? (
                <Button 
                  color="inherit" 
                  size="small"
                  onClick={handleRefresh}
                >
                  Retry
                </Button>
              ) : undefined
            }
          >
            <AlertTitle>
              {error.includes("waiting for reconnection") ? "Connection Issue" : "Error"}
            </AlertTitle>
            {error}
          </Alert>
        )}
        
        {!selectedProcess ? (
          <Alert severity="info" sx={{ my: 2 }}>
            <AlertTitle>No Process Selected</AlertTitle>
            <Typography>Select a process to view its logs</Typography>
          </Alert>
        ) : isLoading ? (
          <LogsSkeleton />
        ) : !connectionContextConnected ? (
          <Box sx={{ position: 'relative' }}>
            {/* Show logs but with overlay if we have logs but lost connection */}
            {logs && logs.length > 0 ? (
              <Paper
                sx={{
                  margin: 0,
                  padding: '0.5rem',
                  borderRadius: '4px',
                  height: '100%',
                  overflow: 'auto',
                  fontSize: '0.85rem',
                  lineHeight: '1.4',
                  fontFamily: 'monospace',
                  backgroundColor: theme.palette.mode === 'dark' ? '#1e1e1e' : '#f5f5f5',
                  color: theme.palette.mode === 'dark' ? '#f0f0f0' : '#333',
                  position: 'relative',
                  '& pre': {
                    margin: 0,
                    padding: 0,
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-all'
                  }
                }}
                ref={logsContainerRef}
              >
                {filteredLogs.map((line, index) => {
                  // Remove the PM2 prefix pattern like "0|casa-loy |" from the line
                  const cleanLine = line.replace(/^\d+\|[\w-]+\s+\|\s+/, '');
                  
                  // Format the line with syntax highlighting
                  const formattedLine = highlightSyntax(cleanLine);
                  
                  return (
                    <Box key={index} sx={{ display: 'flex', width: '100%' }}>
                      <Box 
                        sx={{ 
                          width: '40px', 
                          color: '#858585', 
                          textAlign: 'right', 
                          pr: 1,
                          mr: 1,
                          userSelect: 'none',
                          borderRight: '1px solid #333'
                        }}
                      >
                        {index + 1}
                      </Box>
                      <Box 
                        sx={{ flex: 1 }}
                        dangerouslySetInnerHTML={{ __html: formattedLine }}
                      />
                    </Box>
                  );
                })}
                
                {logsTruncated && (
                  <Alert severity="info" sx={{ mt: 2 }}>
                    Log output was truncated for performance. Download the full logs if needed.
                  </Alert>
                )}
              </Paper>
            ) : (
              <Alert severity="warning" sx={{ my: 2 }}>
                <AlertTitle>Connection Lost</AlertTitle>
                <Typography>Waiting for SSH connection to be restored...</Typography>
              </Alert>
            )}
          </Box>
        ) : filteredLogs && filteredLogs.length > 0 ? (
          <Paper
            sx={{
              p: 0,
              fontFamily: 'monospace',
              borderRadius: 1,
              bgcolor: '#1E1E1E', // Dark background like VS Code
              color: '#E0E0E0',
              height: 'calc(100vh - 200px)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
              border: '1px solid rgba(255, 255, 255, 0.1)'
            }}
          >
            <Box 
              sx={{
                p: 2,
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                bgcolor: '#252526'
              }}
            >
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#75BEFF' }}>
                {selectedProcess} - logs {logsTruncated ? `(showing last ${MAX_DISPLAYED_LINES} lines)` : ''}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                {logsTruncated && (
                  <Tooltip title={`Only displaying the last ${MAX_DISPLAYED_LINES} lines for performance reasons`}>
                    <Typography variant="caption" sx={{ color: '#FFA500', mr: 2 }}>
                      Logs truncated
                    </Typography>
                  </Tooltip>
                )}
                {autoRefresh && (
                  <Box 
                    component="span" 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center',
                      animation: 'pulse 2s infinite',
                      '@keyframes pulse': {
                        '0%': { opacity: 0.6 },
                        '50%': { opacity: 1 },
                        '100%': { opacity: 0.6 }
                      },
                      mr: 2,
                      color: '#4EC9B0'
                    }}
                  >
                    <MdAutorenew size={14} style={{ marginRight: 4 }} />
                    <Typography variant="caption">Auto-refreshing</Typography>
                  </Box>
                )}
                <Typography variant="caption" sx={{ color: '#888' }}>
                  {lastRefreshed 
                    ? `Last updated: ${lastRefreshed.toLocaleTimeString()}`
                    : 'Not yet refreshed'}
                </Typography>
              </Box>
            </Box>
            <Box
              sx={{
                p: 2,
                flex: 1,
                overflow: 'auto',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-word',
                fontFamily: '"SF Mono", Consolas, "Liberation Mono", Menlo, Courier, monospace',
                fontSize: '0.85rem',
                lineHeight: 1.5,
                '&::-webkit-scrollbar': {
                  width: '10px',
                },
                '&::-webkit-scrollbar-track': {
                  background: '#252526',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: '#555',
                  borderRadius: '5px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: '#666',
                }
              }}
              ref={logsContainerRef}
            >
              {filteredLogs.map((line, index) => {
                return (
                  <pre 
                    key={index} 
                    className="log-line"
                    dangerouslySetInnerHTML={{ 
                      __html: highlightSyntax(line) 
                    }}
                  />
                );
              })}
            </Box>
          </Paper>
        ) : (
          <Alert severity="info">
            <AlertTitle>No Logs Available</AlertTitle>
            <Typography>No logs were found for the selected process</Typography>
          </Alert>
        )}
      </Box>
    </PageContainer>
  );
};

export default Logs; 