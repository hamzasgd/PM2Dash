import React, { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Alert,
  AlertTitle,
  LinearProgress,
  CircularProgress,
  Stack,
  Paper,
  Divider,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  useTheme,
  Chip
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import { 
  MdMemory, 
  MdStorage, 
  MdSpeed, 
  MdAccessTime,
  MdDeveloperBoard,
  MdPlayArrow,
  MdStop,
  MdError,
  MdWifi,
  MdRefresh,
  MdOpenInNew
} from 'react-icons/md';
import PageContainer from '../components/PageContainer';
import '../types'; // Import the types
import ConnectionStatus from '../components/ConnectionStatus';
import DashboardSkeleton from '../components/DashboardSkeleton';
import { useConnection } from '../context/ConnectionContext';

interface SystemStats {
  memory: {
    total: number;
    free: number;
    used: number;
  };
  cpu: {
    cores: number;
    load: number[];
    coreInfo?: {
      load: number;
    }[];
  };
  uptime: number;
  processCount: number;
  onlineCount: number;
  errorCount: number;
  disk: {
    total: number; // In MB
    used: number;  // In MB
    free: number;  // In MB
    usedPercent: number;
    filesystems?: {
      mountpoint: string;
      size: number;
      used: number;
    }[];
  };
  node?: {
    version: string;
    npmVersion: string;
  };
}

interface ConnectionState {
  connected: boolean;
  host: string;
  username: string;
  connectionTime: Date | null;
  lastError?: {
    message: string;
    details?: string;
    timestamp: Date;
  };
}

const Dashboard: React.FC = () => {
  const [systemStats, setSystemStats] = useState<SystemStats | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionState, setConnectionState] = useState<ConnectionState | null>(null);
  const [showErrorDetails, setShowErrorDetails] = useState<boolean>(false);
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  
  // Use connection context instead of local state
  const { connected } = useConnection();

  // Helper functions
  const parseSize = (sizeStr: string): number => {
    const size = parseFloat(sizeStr.replace(/[^0-9.]/g, ''));
    if (sizeStr.includes('G')) {
      return size * 1024; // Convert GB to MB
    } else if (sizeStr.includes('T')) {
      return size * 1024 * 1024; // Convert TB to MB
    } else if (sizeStr.includes('K')) {
      return size / 1024; // Convert KB to MB
    }
    return size; // Already in MB
  };

  const formatUptime = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    return `${days}d ${hours}h ${minutes}m`;
  };

  const formatMemory = (mb: number): string => {
    if (mb >= 1024) {
      return `${(mb / 1024).toFixed(2)} GB`;
    }
    return `${mb} MB`;
  };

  // Memoize fetch functions to prevent unnecessary re-renders
  const fetchStats = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Define a type for the SSH command response
      type SSHCommandResponse = {
        success: boolean;
        stdout: string;
        stderr: string;
      };

      // Check if we are connected to SSH
      if (!connected) {
        throw new Error('Not connected to SSH. Please connect first.');
      }

      // Function to safely execute SSH commands with fallback values
      const safeExecuteCommand = async (command: string, fallbackValue: string): Promise<SSHCommandResponse> => {
        try {
          const result = await window.api.executeSSHCommand(command);
          if (!result.success) {
            console.warn(`Command failed but didn't throw: ${command}`, result);
            return {
              success: false,
              stdout: fallbackValue,
              stderr: result.stderr || "Command failed"
            };
          }
          // Ensure result has all required properties of SSHCommandResponse
          return {
            success: result.success,
            stdout: result.stdout || fallbackValue, // Ensure stdout is never undefined
            stderr: result.stderr || ""
          };
        } catch (error) {
          console.error(`Error executing SSH command: ${command}`, error);
          return {
            success: false,
            stdout: fallbackValue,
            stderr: error instanceof Error ? error.message : "Unknown error",
          };
        }
      };

      // Use individual try/catch blocks for each command instead of Promise.all to handle failures more gracefully
      const memoryResult = await safeExecuteCommand('free -m', 'Mem: 1024 512 512');
      const cpuInfoResult = await safeExecuteCommand('cat /proc/cpuinfo | grep processor | wc -l', '2');
      const loadAvgResult = await safeExecuteCommand('cat /proc/loadavg', '0.1 0.1 0.1');
      const uptimeResult = await safeExecuteCommand('cat /proc/uptime', '3600 0');
      const dfResult = await safeExecuteCommand('df -h /', 'Filesystem Size Used Avail Use% Mounted\n/ 50G 25G 25G 50% /');
      const nodeVersionResult = await safeExecuteCommand('node --version', 'v0.0.0');
      const npmVersionResult = await safeExecuteCommand('npm --version', '0.0.0');
      
      // Handle PM2 processes separately as it has a different response structure
      let processesResult;
      try {
        processesResult = await window.api.listProcesses();
      } catch (error) {
        console.error('Error fetching PM2 processes:', error);
        processesResult = { 
          success: true, 
          processes: [] 
        };
      }
      
      // Parse memory information
      let memTotal = 1024, memUsed = 512, memFree = 512;
      try {
        if (memoryResult.stdout && typeof memoryResult.stdout === 'string') {
          const memLines = memoryResult.stdout.split('\n');
          if (memLines.length > 1) {
            const memParts = memLines[1].trim().split(/\s+/);
            if (memParts.length >= 3) {
              memTotal = parseInt(memParts[1], 10) || 1024;
              memUsed = parseInt(memParts[2], 10) || 512;
              memFree = parseInt(memParts[3], 10) || 512;
            }
          }
        }
      } catch (err) {
        console.error('Error parsing memory info:', err);
        // Use defaults defined above
      }
      
      // Parse CPU cores
      let cpuCores = 2;
      try {
        if (cpuInfoResult.stdout && typeof cpuInfoResult.stdout === 'string') {
          cpuCores = parseInt(cpuInfoResult.stdout.trim(), 10) || 2; // Default to 2 if parsing fails
        }
      } catch (err) {
        console.error('Error parsing CPU info:', err);
        // Use default defined above
      }
      
      // Parse load average
      let loadAvg = [0.1, 0.1, 0.1];
      try {
        if (loadAvgResult.stdout && typeof loadAvgResult.stdout === 'string') {
          const loadParts = loadAvgResult.stdout.trim().split(' ');
          loadAvg = [
            parseFloat(loadParts[0] || '0.1'), 
            parseFloat(loadParts[1] || '0.1'), 
            parseFloat(loadParts[2] || '0.1')
          ];
        }
      } catch (err) {
        console.error('Error parsing load average:', err);
        // Use defaults defined above
      }
      
      // Parse uptime
      let uptime = 3600;
      try {
        if (uptimeResult.stdout && typeof uptimeResult.stdout === 'string') {
          const uptimeParts = uptimeResult.stdout.trim().split(' ');
          uptime = parseFloat(uptimeParts[0] || '3600');
        }
      } catch (err) {
        console.error('Error parsing uptime:', err);
        // Use default defined above
      }
      
      // Parse disk usage
      let diskTotal = 50 * 1024, diskUsed = 25 * 1024, diskFree = 25 * 1024, diskUsedPercent = 50;
      try {
        if (dfResult.stdout && typeof dfResult.stdout === 'string') {
          const dfLines = dfResult.stdout.split('\n');
          if (dfLines.length > 1) {
            const dfParts = dfLines[1].trim().split(/\s+/);
            if (dfParts.length >= 5) {
              diskTotal = parseSize(dfParts[1] || '50G');
              diskUsed = parseSize(dfParts[2] || '25G');
              diskFree = parseSize(dfParts[3] || '25G');
              diskUsedPercent = parseInt(dfParts[4].replace('%', '') || '50', 10);
            }
          }
        }
      } catch (err) {
        console.error('Error parsing disk usage:', err);
        // Use defaults defined above
      }
      
      // Process PM2 information
      const processes = processesResult?.processes || [];
      const onlineCount = processes.filter((p: any) => p.pm2_env?.status === 'online').length;
      const errorCount = processes.filter((p: any) => p.pm2_env?.status === 'errored').length;
      
      // Parse Node.js and npm versions
      let nodeVersion = 'Unknown';
      let npmVersion = 'Unknown';
      try {
        if (nodeVersionResult.stdout && typeof nodeVersionResult.stdout === 'string') {
          nodeVersion = nodeVersionResult.stdout.trim();
        }
        if (npmVersionResult.stdout && typeof npmVersionResult.stdout === 'string') {
          npmVersion = npmVersionResult.stdout.trim();
        }
      } catch (err) {
        console.error('Error parsing Node.js/npm version info:', err);
      }
      
      const newStats: SystemStats = {
        memory: {
          total: memTotal,
          used: memUsed,
          free: memFree
        },
        cpu: {
          cores: cpuCores,
          load: loadAvg
        },
        uptime: uptime,
        processCount: processes.length,
        onlineCount: onlineCount,
        errorCount: errorCount,
        disk: {
          total: diskTotal, 
          used: diskUsed,
          free: diskFree,
          usedPercent: diskUsedPercent
        },
        node: {
          version: nodeVersion,
          npmVersion: npmVersion
        }
      };

      setSystemStats(newStats);
    } catch (err) {
      console.error('Error fetching system stats:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while fetching system stats');
    } finally {
      setLoading(false);
    }
  }, [connected]);

  // Only fetch stats when connection status changes
  useEffect(() => {
    if (connected) {
      fetchStats();
      
      // Set up polling interval when connected
      const intervalId = setInterval(() => {
        fetchStats();
      }, 30000); // Poll every 30 seconds when connected
      
      return () => clearInterval(intervalId);
    } else {
      // Clear stats when disconnected
      setSystemStats(null);
      setError('Not connected to SSH. Please connect first.');
      setLoading(false);
    }
  }, [connected, fetchStats]);

  // Handle refresh button click
  const handleRefresh = () => {
    fetchStats();
  };

  const renderStatCard = (
    title: string,
    value: string,
    icon: React.ReactNode,
    subtitle?: string,
    progress?: number
  ) => (
    <Grid item xs={12} md={6} lg={3}>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          backgroundColor: '#2d2f31',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '6px',
          height: '100%',
        }}
      >
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace' }}>
            {title}
          </Typography>
          {icon}
        </Box>
        
        <Typography variant="h5" sx={{ mb: 1, color: '#f8f8f2', fontFamily: '"SF Mono", monospace' }}>
          {value}
        </Typography>
        
        {subtitle && (
          <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.6)', fontFamily: '"SF Mono", monospace' }}>
            {subtitle}
          </Typography>
        )}
        
        {progress !== undefined && (
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{
              mt: 1.5,
              height: 6,
              borderRadius: 1,
              backgroundColor: 'rgba(248, 248, 242, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: 
                  progress > 0.9 ? theme.palette.error.main :
                  progress > 0.7 ? theme.palette.warning.main :
                  theme.palette.primary.main,
              },
            }}
          />
        )}
      </Paper>
    </Grid>
  );

  // Render content based on state
  let content;

  if (!connected) {
    content = (
      <ConnectionStatus 
        title="Dashboard Unavailable"
        message="Please connect to an SSH server to view system statistics and information."
      />
    );
  } else if (loading && !systemStats) {
    content = (
      <DashboardSkeleton />
    );
  } else if (error) {
    content = (
      <Alert 
        severity="error" 
        sx={{ 
          mt: 2,
          borderRadius: '4px',
          backgroundColor: 'rgba(255, 87, 87, 0.15)',
          color: theme.palette.error.main,
          border: `1px solid ${theme.palette.error.main}`
        }}
      >
        <AlertTitle>Failed to load system stats</AlertTitle>
        {error}
        <Button 
          color="error" 
          size="small" 
          variant="outlined"
          startIcon={<MdRefresh />}
          onClick={handleRefresh}
          sx={{ mt: 1 }}
        >
          Retry
        </Button>
      </Alert>
    );
  } else if (systemStats) {
    content = (
      <Box sx={{ p: 3 }}>
        {/* Stats cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {renderStatCard(
            'CPU Load',
            `${(systemStats.cpu.load[0] * 100).toFixed(1)}%`,
            <MdSpeed color={theme.palette.primary.main} size={24} />,
            `${systemStats.cpu.cores} Cores`,
            systemStats.cpu.load[0]
          )}
          
          {renderStatCard(
            'Memory Usage',
            formatMemory(systemStats.memory.used),
            <MdMemory color={theme.palette.primary.main} size={24} />,
            `${formatMemory(systemStats.memory.total)} Total`,
            systemStats.memory.used / systemStats.memory.total
          )}
          
          {renderStatCard(
            'Disk Usage',
            `${systemStats.disk.usedPercent.toFixed(1)}%`,
            <MdStorage color={theme.palette.primary.main} size={24} />,
            `${formatMemory(systemStats.disk.free)} Free`,
            systemStats.disk.usedPercent / 100
          )}
          
          {renderStatCard(
            'Uptime',
            formatUptime(systemStats.uptime),
            <MdAccessTime color={theme.palette.primary.main} size={24} />,
            'System running since'
          )}
        </Grid>
        
        {/* System details */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                backgroundColor: '#2d2f31',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#f8f8f2', fontFamily: '"SF Mono", monospace' }}>
                  CPU Information
                </Typography>
                <MdDeveloperBoard color="rgba(248, 248, 242, 0.6)" size={24} />
              </Box>
              
              {systemStats.cpu.coreInfo && systemStats.cpu.coreInfo.map((core, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace' }}>
                      Core {index}
                    </Typography>
                    <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace' }}>
                      {(core.load * 100).toFixed(1)}%
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={core.load * 100}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: theme.palette.primary.main,
                      },
                    }}
                  />
                </Box>
              ))}
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace', mb: 1 }}>
                  Load Averages
                </Typography>
                <Stack direction="row" spacing={2}>
                  <Chip
                    label={`1m: ${systemStats.cpu.load[0].toFixed(2)}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      color: '#f8f8f2',
                      fontFamily: '"SF Mono", monospace',
                    }}
                  />
                  <Chip
                    label={`5m: ${systemStats.cpu.load[1].toFixed(2)}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      color: '#f8f8f2',
                      fontFamily: '"SF Mono", monospace',
                    }}
                  />
                  <Chip
                    label={`15m: ${systemStats.cpu.load[2].toFixed(2)}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      color: '#f8f8f2',
                      fontFamily: '"SF Mono", monospace',
                    }}
                  />
                </Stack>
              </Box>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 3,
                height: '100%',
                backgroundColor: '#2d2f31',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '6px',
              }}
            >
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h6" sx={{ color: '#f8f8f2', fontFamily: '"SF Mono", monospace' }}>
                  Disk Usage
                </Typography>
                <MdStorage color="rgba(248, 248, 242, 0.6)" size={24} />
              </Box>
              
              {systemStats.disk.filesystems && systemStats.disk.filesystems.map((fs, index) => (
                <Box key={index} sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                    <Tooltip title={fs.mountpoint} placement="top-start">
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          color: 'rgba(248, 248, 242, 0.8)', 
                          fontFamily: '"SF Mono", monospace',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {fs.mountpoint}
                      </Typography>
                    </Tooltip>
                    <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace' }}>
                      {formatMemory(fs.used)} / {formatMemory(fs.size)}
                    </Typography>
                  </Box>
                  <LinearProgress
                    variant="determinate"
                    value={(fs.used / fs.size) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 1,
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      '& .MuiLinearProgress-bar': {
                        backgroundColor: 
                          (fs.used / fs.size) > 0.9 ? theme.palette.error.main :
                          (fs.used / fs.size) > 0.7 ? theme.palette.warning.main :
                          theme.palette.primary.main,
                      },
                    }}
                  />
                </Box>
              ))}
              
              <Box sx={{ mt: 3 }}>
                <Typography variant="h6" sx={{ color: '#f8f8f2', fontFamily: '"SF Mono", monospace', mb: 2 }}>
                  Memory Usage
                </Typography>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.5 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace' }}>
                    Used: {formatMemory(systemStats.memory.used)}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.8)', fontFamily: '"SF Mono", monospace' }}>
                    {((systemStats.memory.used / systemStats.memory.total) * 100).toFixed(1)}%
                  </Typography>
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(systemStats.memory.used / systemStats.memory.total) * 100}
                  sx={{
                    height: 8,
                    borderRadius: 1,
                    backgroundColor: 'rgba(248, 248, 242, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      backgroundColor: 
                        (systemStats.memory.used / systemStats.memory.total) > 0.9 ? theme.palette.error.main :
                        (systemStats.memory.used / systemStats.memory.total) > 0.7 ? theme.palette.warning.main :
                        theme.palette.primary.main,
                    },
                  }}
                />
                
                <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                  <Chip
                    label={`Total: ${formatMemory(systemStats.memory.total)}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      color: '#f8f8f2',
                      fontFamily: '"SF Mono", monospace',
                    }}
                  />
                  <Chip
                    label={`Free: ${formatMemory(systemStats.memory.free)}`}
                    size="small"
                    sx={{
                      backgroundColor: 'rgba(248, 248, 242, 0.1)',
                      color: '#f8f8f2',
                      fontFamily: '"SF Mono", monospace',
                    }}
                  />
                </Stack>
              </Box>
            </Paper>
          </Grid>
        </Grid>
        
        {/* New Node.js information card */}
        <Grid item xs={12}>
          <Paper
            elevation={0}
            sx={{
              p: 3,
              backgroundColor: '#2d2f31',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '6px',
              mb: 3
            }}
          >
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#f8f8f2', fontFamily: '"SF Mono", monospace' }}>
                Node.js Environment
              </Typography>
              <MdDeveloperBoard color="rgba(248, 248, 242, 0.6)" size={24} />
            </Box>
            
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.6)', fontFamily: '"SF Mono", monospace' }}>
                    Node.js Version
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#f8f8f2', fontFamily: '"SF Mono", monospace' }}>
                    {systemStats.node?.version || 'Not detected'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12} md={6}>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.6)', fontFamily: '"SF Mono", monospace' }}>
                    npm Version
                  </Typography>
                  <Typography variant="h6" sx={{ color: '#f8f8f2', fontFamily: '"SF Mono", monospace' }}>
                    {systemStats.node?.npmVersion || 'Not detected'}
                  </Typography>
                </Box>
              </Grid>
              
              <Grid item xs={12}>
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" sx={{ color: 'rgba(248, 248, 242, 0.6)', fontFamily: '"SF Mono", monospace' }}>
                    PM2 Processes
                  </Typography>
                  <Stack direction="row" spacing={2} sx={{ mt: 1 }}>
                    <Chip
                      label={`Total: ${systemStats.processCount}`}
                      size="small"
                      sx={{
                        backgroundColor: 'rgba(248, 248, 242, 0.1)',
                        color: '#f8f8f2',
                        fontFamily: '"SF Mono", monospace',
                      }}
                    />
                    <Chip
                      label={`Online: ${systemStats.onlineCount}`}
                      size="small"
                      sx={{
                        backgroundColor: `${theme.palette.success.main}20`,
                        color: theme.palette.success.main,
                        fontFamily: '"SF Mono", monospace',
                      }}
                    />
                    {systemStats.errorCount > 0 && (
                      <Chip
                        label={`Errors: ${systemStats.errorCount}`}
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.error.main}20`,
                          color: theme.palette.error.main,
                          fontFamily: '"SF Mono", monospace',
                        }}
                      />
                    )}
                    {systemStats.processCount - systemStats.onlineCount - systemStats.errorCount > 0 && (
                      <Chip
                        label={`Stopped: ${systemStats.processCount - systemStats.onlineCount - systemStats.errorCount}`}
                        size="small"
                        sx={{
                          backgroundColor: `${theme.palette.warning.main}20`,
                          color: theme.palette.warning.main,
                          fontFamily: '"SF Mono", monospace',
                        }}
                      />
                    )}
                  </Stack>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>
      </Box>
    );
  }

  return (
    <PageContainer 
      title="Dashboard" 
      description="System Overview"
      actions={
        <Button
          variant="outlined"
          startIcon={<MdRefresh />}
          onClick={handleRefresh}
          disabled={!connected || loading}
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
          Refresh Stats
        </Button>
      }
    >
      {!connected ? (
        <ConnectionStatus 
          title="Dashboard Unavailable"
          message="Please connect to an SSH server to view system statistics and information."
        />
      ) : loading && !systemStats ? (
        <DashboardSkeleton />
      ) : error ? (
        <Alert 
          severity="error" 
          sx={{ 
            mt: 2,
            borderRadius: '4px',
            backgroundColor: 'rgba(255, 87, 87, 0.15)',
            color: theme.palette.error.main,
            border: `1px solid ${theme.palette.error.main}`
          }}
        >
          <AlertTitle>Failed to load system stats</AlertTitle>
          {error}
          <Button 
            color="error" 
            size="small" 
            variant="outlined"
            startIcon={<MdRefresh />}
            onClick={handleRefresh}
            sx={{ mt: 1 }}
          >
            Retry
          </Button>
        </Alert>
      ) : systemStats ? (
        content
      ) : null}
    </PageContainer>
  );
};

export default Dashboard; 