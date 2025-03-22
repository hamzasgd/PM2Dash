import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Button,
  Chip,
  TextField,
  InputAdornment,
  LinearProgress,
  Alert,
  AlertTitle,
  useTheme,
  Menu,
  MenuItem,
  Tooltip
} from '@mui/material';
import {
  MdPlayArrow,
  MdStop,
  MdRefresh,
  MdDeleteOutline,
  MdSearch,
  MdOutlineMemory,
  MdTimer,
  MdMoreVert,
  MdAddCircle,
  MdOutlineDescription,
  MdRestartAlt
} from 'react-icons/md';
import PageContainer from '../components/PageContainer';
import ConnectionStatus from '../components/ConnectionStatus';
import ProcessSkeleton from '../components/ProcessSkeleton';
import debounce from 'lodash/debounce';
import { useConnection } from '../context/ConnectionContext';

interface Process {
  name: string;
  pm_id: number;
  status: string;
  memory: number;
  cpu: number;
  uptime: number;
  restarts: number;
  pid?: number;
  pm2_env: {
    status?: string;
    pm_uptime?: number;
    restart_time?: number;
    created_at?: number;
    [key: string]: any;
  };
  monit?: {
    memory: number;
    cpu: number;
  };
}

const ProcessManager: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedProcess, setSelectedProcess] = useState<number | null>(null);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Use the connection context instead of local state
  const { connected } = useConnection();

  // Format bytes to more readable form
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  // Format uptime function
  const formatUptime = (timestamp: number): string => {
    if (!timestamp) return 'N/A';
    
    const uptime = Date.now() - timestamp;
    const seconds = Math.floor(uptime / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) {
      return `${days}d ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes}m ${seconds % 60}s`;
    } else {
      return `${seconds}s`;
    }
  };

  // Get status color for a process
  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'online':
        return theme.palette.success.main;
      case 'stopping':
      case 'stopped':
        return theme.palette.warning.main;
      case 'errored':
        return theme.palette.error.main;
      default:
        return theme.palette.info.main;
    }
  };

  // Function to load processes
  const loadProcesses = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Only attempt to load processes if connected
      if (!connected) {
        console.log("Process Manager: Not connected to SSH server");
        setError('Not connected to SSH server. Please connect first.');
        setProcesses([]);
        setLoading(false);
        return;
      }
      
      // Then attempt to load processes
      console.log("Process Manager: Loading processes...");
      const response = await window.api.listProcesses();
      console.log("Process Manager: Process list response:", response);
      
      if (response && response.success) {
        if (Array.isArray(response.processes)) {
          setProcesses(response.processes);
          if (response.processes.length === 0) {
            console.log("Process Manager: No processes found, but request was successful");
          }
        } else {
          console.error("Process Manager: Invalid processes array in response:", response.processes);
          setProcesses([]);
          setError('Received invalid process data from server');
        }
      } else {
        console.error("Process Manager: Failed to load processes:", response?.message);
        
        // Handle common error cases
        let errorMessage = response?.message || 'Failed to load processes';
        
        if (errorMessage.includes('PM2 is not installed')) {
          errorMessage = 'PM2 is not installed on the server. Please install PM2 to manage processes.';
        } else if (errorMessage.includes('not connected') || errorMessage.includes('Connection failed')) {
          errorMessage = 'SSH connection issue. Please reconnect to the server.';
        } else if (errorMessage.includes('channel')) {
          errorMessage = 'SSH connection was lost. Please reconnect to the server.';
        }
        
        setError(errorMessage);
        setProcesses([]);
      }
    } catch (err) {
      console.error('Process Manager: Error loading processes:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching processes');
      setProcesses([]);
    } finally {
      setLoading(false);
    }
  }, [connected]); // Only depend on connected state

  // Handler for opening process menu
  const handleMenuOpen = (event: React.MouseEvent<HTMLButtonElement>, pm_id: number) => {
    setAnchorEl(event.currentTarget);
    setSelectedProcess(pm_id);
  };

  // Handler for closing process menu
  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProcess(null);
  };

  // Handler for process actions
  const handleProcessAction = async (action: 'start' | 'stop' | 'restart' | 'delete', name: string) => {
    handleMenuClose();
    setLoading(true);
    
    try {
      let response;
      
      switch (action) {
        case 'start':
          response = await window.api.startProcess(name);
          break;
        case 'stop':
          response = await window.api.stopProcess(name);
          break;
        case 'restart':
          response = await window.api.restartProcess(name);
          break;
        case 'delete':
          response = await window.api.deleteProcess(name);
          break;
      }
      
      if (response && response.success) {
        // Wait a short time to allow PM2 to update
        setTimeout(loadProcesses, 1000);
      } else {
        setError(`Failed to ${action} process ${name}`);
        setLoading(false);
      }
    } catch (err) {
      console.error(`Error ${action}ing process:`, err);
      setError(`An error occurred while trying to ${action} the process`);
      setLoading(false);
    }
  };

  // Initial load of processes and refresh based on connection state
  useEffect(() => {
    if (connected) {
      loadProcesses();
      
      // Set up refresh interval when connected
      const intervalId = setInterval(() => {
        console.log("Periodic process list refresh in ProcessManager");
        loadProcesses();
      }, 30000); // Every 30 seconds
      
      return () => clearInterval(intervalId);
    } else {
      // Reset processes when disconnected
      setProcesses([]);
      setError('Not connected to SSH server. Please connect first.');
    }
  }, [connected, loadProcesses]);
  
  // Filter processes based on search term
  const filteredProcesses = processes.filter(
    (process) => process.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get PID from process data - need to check multiple locations
  const getPidDisplay = (process: Process): React.ReactNode => {
    // Check direct pid property
    if (typeof process.pid === 'number' && process.pid > 0) {
      return process.pid;
    }
    
    // Check pm2_env.pid
    if (process.pm2_env?.pid) {
      return process.pm2_env.pid;
    }
    
    // Look for pid in pm_pid_path - this path often contains the PID in the filename
    const pidPath = process.pm2_env?.pm_pid_path;
    if (typeof pidPath === 'string') {
      const match = pidPath.match(/(\d+)\.pid$/);
      if (match && match[1]) {
        return match[1];
      }
    }
    
    // If the process is stopped, show "Stopped" instead of N/A
    if ((process.status || process.pm2_env?.status || '').toLowerCase() === 'stopped') {
      return <span style={{ color: theme.palette.warning.main }}>Stopped</span>;
    }
    
    // Default fallback
    return 'N/A';
  };

  return (
    <PageContainer
      title="Process Manager"
      description="Monitor and control PM2 processes"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={<MdRefresh />}
            onClick={loadProcesses}
            disabled={loading}
            sx={{
              fontFamily: '"SF Mono", monospace',
              borderColor: 'rgba(255, 255, 255, 0.2)',
              color: '#f8f8f2',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.3)',
                backgroundColor: 'rgba(255, 255, 255, 0.05)'
              }
            }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            startIcon={<MdAddCircle />}
            sx={{
              fontFamily: '"SF Mono", monospace',
              backgroundColor: theme.palette.success.main,
              color: '#000',
              '&:hover': {
                backgroundColor: theme.palette.success.dark
              }
            }}
          >
            New Process
          </Button>
        </Box>
      }
    >
      {!connected ? (
        <ConnectionStatus 
          title="Process Manager Unavailable"
          message="Please connect to an SSH server to view and manage your PM2 processes."
        />
      ) : (
        <>
          {loading && processes.length > 0 && (
            <LinearProgress
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                height: 2,
                '& .MuiLinearProgress-bar': {
                  transition: 'none'
                }
              }}
            />
          )}
          
          {error && (
            <Alert
              severity="error"
              sx={{
                mb: 3,
                borderRadius: '4px',
                backgroundColor: 'rgba(255, 87, 87, 0.15)',
                color: theme.palette.error.main,
                border: `1px solid ${theme.palette.error.main}`
              }}
              action={
                <Button 
                  color="error" 
                  size="small" 
                  variant="outlined"
                  startIcon={<MdRefresh />}
                  onClick={loadProcesses}
                  sx={{ mt: 0.5 }}
                >
                  Retry
                </Button>
              }
            >
              <AlertTitle>Error</AlertTitle>
              {error}
              {error.includes('PM2 is not installed') && (
                <Typography sx={{ mt: 1, fontSize: '0.9rem' }}>
                  Please install PM2 on the remote server to manage processes.
                  <br />
                  You can install it using: <code>npm install -g pm2</code>
                </Typography>
              )}
              {error.includes('Not connected') && (
                <Typography sx={{ mt: 1, fontSize: '0.9rem' }}>
                  Please connect to a server from the Connections page.
                </Typography>
              )}
            </Alert>
          )}
          
          <Box sx={{ p: 3 }}>
            <Box
              sx={{
                mb: 3,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <TextField
                placeholder="Search processes..."
                variant="outlined"
                size="small"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <MdSearch color="rgba(248, 248, 242, 0.6)" />
                    </InputAdornment>
                  ),
                  sx: {
                    fontFamily: '"SF Mono", monospace',
                    borderRadius: '4px',
                    backgroundColor: '#2d2f31',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.1)'
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.2)'
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: 'rgba(255, 255, 255, 0.3)'
                    },
                    color: '#f8f8f2'
                  }
                }}
              />
              
              <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.6)', fontFamily: '"SF Mono", monospace' }}>
                {filteredProcesses.length} processes
              </Typography>
            </Box>
            
            {loading && !processes.length ? (
              <ProcessSkeleton rows={6} />
            ) : (
              <TableContainer 
                component={Paper} 
                elevation={0}
                sx={{
                  backgroundColor: '#2d2f31',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '4px',
                  '& .MuiTableCell-root': {
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    fontFamily: '"SF Mono", monospace',
                    fontSize: '0.85rem',
                    padding: '12px 16px'
                  }
                }}
              >
                <Table sx={{ minWidth: 650 }}>
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Name</TableCell>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Status</TableCell>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>CPU</TableCell>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Memory</TableCell>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Uptime</TableCell>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>PID</TableCell>
                      <TableCell sx={{ color: 'rgba(248, 248, 242, 0.8)', fontWeight: 600 }}>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {filteredProcesses.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'rgba(248, 248, 242, 0.6)' }}>
                          No processes found
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProcesses.map((process) => (
                        <TableRow key={process.pm_id} sx={{ '&:hover': { backgroundColor: 'rgba(255, 255, 255, 0.03)' } }}>
                          <TableCell sx={{ color: '#f8f8f2', fontWeight: 500 }}>
                            {process.name}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={process.status || process.pm2_env?.status || 'unknown'}
                              size="small"
                              sx={{
                                backgroundColor: `${getStatusColor(process.status || process.pm2_env?.status || '')}20`,
                                color: getStatusColor(process.status || process.pm2_env?.status || ''),
                                fontWeight: 500,
                                borderRadius: '4px',
                                textTransform: 'capitalize',
                                fontFamily: '"SF Mono", monospace',
                                fontSize: '0.75rem'
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ color: '#f8f8f2' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <Typography variant="body2">
                                {(process.cpu !== undefined) ? `${process.cpu.toFixed(1)}%` : 
                                 (process.monit?.cpu !== undefined) ? `${process.monit.cpu.toFixed(1)}%` : 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: '#f8f8f2' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <MdOutlineMemory 
                                style={{ marginRight: 6, color: 'rgba(248, 248, 242, 0.6)' }}
                                size={16}
                              />
                              <Typography variant="body2">
                                {(process.memory !== undefined) ? formatBytes(process.memory) : 
                                 (process.monit?.memory !== undefined) ? formatBytes(process.monit.memory) : 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: '#f8f8f2' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center' }}>
                              <MdTimer 
                                style={{ marginRight: 6, color: 'rgba(248, 248, 242, 0.6)' }}
                                size={16}
                              />
                              <Typography variant="body2">
                                {formatUptime(process.uptime || process.pm2_env?.pm_uptime || 0)}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell sx={{ color: '#f8f8f2' }}>
                            {getPidDisplay(process)}
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                              {(process.status || process.pm2_env?.status || '').toLowerCase() === 'online' ? (
                                <Tooltip title="Stop">
                                  <IconButton
                                    size="small"
                                    sx={{ 
                                      color: theme.palette.warning.main,
                                      '&:hover': {
                                        backgroundColor: 'rgba(246, 190, 44, 0.1)'
                                      }
                                    }}
                                    onClick={() => handleProcessAction('stop', process.name)}
                                  >
                                    <MdStop />
                                  </IconButton>
                                </Tooltip>
                              ) : (
                                <Tooltip title="Start">
                                  <IconButton
                                    size="small"
                                    sx={{ 
                                      color: theme.palette.success.main,
                                      '&:hover': {
                                        backgroundColor: 'rgba(40, 200, 64, 0.1)'
                                      }
                                    }}
                                    onClick={() => handleProcessAction('start', process.name)}
                                  >
                                    <MdPlayArrow />
                                  </IconButton>
                                </Tooltip>
                              )}
                              
                              <Tooltip title="Restart">
                                <IconButton
                                  size="small"
                                  sx={{ 
                                    color: '#f8f8f2',
                                    '&:hover': {
                                      backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                    }
                                  }}
                                  onClick={() => handleProcessAction('restart', process.name)}
                                >
                                  <MdRestartAlt />
                                </IconButton>
                              </Tooltip>
                              
                              <Tooltip title="Logs">
                                <IconButton
                                  size="small"
                                  sx={{ 
                                    color: theme.palette.primary.main,
                                    '&:hover': {
                                      backgroundColor: 'rgba(255, 95, 87, 0.1)'
                                    }
                                  }}
                                >
                                  <MdOutlineDescription />
                                </IconButton>
                              </Tooltip>
                              
                              <IconButton
                                size="small"
                                sx={{ 
                                  color: '#f8f8f2',
                                  '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.1)'
                                  }
                                }}
                                onClick={(event) => handleMenuOpen(event, process.pm_id)}
                              >
                                <MdMoreVert />
                              </IconButton>
                            </Box>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
          
          <Menu
            anchorEl={anchorEl}
            open={Boolean(anchorEl)}
            onClose={handleMenuClose}
            sx={{
              '& .MuiPaper-root': {
                backgroundColor: '#2d2f31',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '4px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)'
              },
              '& .MuiMenuItem-root': {
                fontFamily: '"SF Mono", monospace',
                fontSize: '0.85rem',
                color: '#f8f8f2',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.1)'
                }
              }
            }}
          >
            <MenuItem onClick={() => {
              const process = processes.find(p => p.pm_id === selectedProcess);
              if (process) {
                handleProcessAction((process.status || process.pm2_env?.status || '').toLowerCase() === 'online' ? 'stop' : 'start', process.name);
              }
            }}>
              {(processes.find(p => p.pm_id === selectedProcess)?.status || 
                processes.find(p => p.pm_id === selectedProcess)?.pm2_env?.status || '').toLowerCase() === 'online' ? 'Stop' : 'Start'}
            </MenuItem>
            <MenuItem onClick={() => {
              const process = processes.find(p => p.pm_id === selectedProcess);
              if (process) {
                handleProcessAction('restart', process.name);
              }
            }}>
              Restart
            </MenuItem>
            <MenuItem onClick={() => {
              const process = processes.find(p => p.pm_id === selectedProcess);
              if (process) {
                handleProcessAction('delete', process.name);
              }
            }} sx={{ color: theme.palette.error.main }}>
              Delete
            </MenuItem>
          </Menu>
        </>
      )}
    </PageContainer>
  );
};

export default ProcessManager; 