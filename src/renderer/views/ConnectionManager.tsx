import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Stack,
  Grid,
  TextField,
  InputAdornment,
  IconButton,
  Snackbar,
  Alert,
  AlertTitle,
  Tabs,
  Tab,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  Divider,
  Paper,
  Tooltip,
  useTheme,
  FormControl,
  FormLabel,
  FormHelperText,
  Select,
  MenuItem,
  Chip,
  SelectChangeEvent,
  InputLabel,
  OutlinedInput,
  FormControlLabel,
  Checkbox
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { 
  MdVisibility, 
  MdVisibilityOff, 
  MdAdd, 
  MdSave, 
  MdDelete,
  MdLink,
  MdRefresh,
  MdWifi,
  MdKey,
  MdArrowForward
} from 'react-icons/md';
import { SSHConfig, SSHKey, SavedConnection } from '../types';
import PageContainer from '../components/PageContainer';
import { useConnection } from '../context/ConnectionContext';

interface ConnectionForm {
  name: string;
  host: string;
  port: string;
  username: string;
  password: string;
  privateKeyId?: string;
  authType: 'password' | 'privateKey';
  allowNewFingerprint?: boolean;
}

const initialFormState: ConnectionForm = {
  name: '',
  host: '',
  port: '22',
  username: '',
  password: '',
  privateKeyId: '',
  authType: 'password',
  allowNewFingerprint: false,
};

const ConnectionManager: React.FC = () => {
  const [form, setForm] = useState<ConnectionForm>(initialFormState);
  const [showPassword, setShowPassword] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [savedConnections, setSavedConnections] = useState<SavedConnection[]>([]);
  const [sshKeys, setSSHKeys] = useState<SSHKey[]>([]);
  const [tabValue, setTabValue] = useState('1');
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    title: string;
    severity: 'success' | 'error' | 'warning' | 'info';
    details?: string | null;
  }>({
    open: false,
    message: '',
    title: '',
    severity: 'info'
  });
  const theme = useTheme();
  const isDarkMode = theme.palette.mode === 'dark';
  
  // Use connection context instead of local state
  const { connected, refreshConnection } = useConnection();

  // Check connection status on mount and listen for connection change events
  useEffect(() => {
    console.log("ConnectionManager mounted, loading data...");
    loadData();
  }, []);
  
  // Log when savedConnections changes
  useEffect(() => {
    console.log("savedConnections state changed:", savedConnections);
  }, [savedConnections]);
  
  // Function to check the current connection status
  const checkConnectionStatus = async () => {
    console.log("Checking current SSH connection status...");
    return refreshConnection();
  };

  // Add debug function
  const debugObject = (obj: any, prefix: string = "") => {
    console.log(`${prefix} OBJECT DUMP:`);
    if (!obj) {
      console.log(`${prefix} Object is null or undefined`);
      return;
    }
    
    console.log(`${prefix} Keys:`, Object.keys(obj));
    if (obj.savedConnections) {
      console.log(`${prefix} savedConnections:`, obj.savedConnections);
    }
  };

  const loadData = async () => {
    try {
      console.log("Starting to load data...");
      
      // Load settings
      const response = await window.api.getSettings();
      console.log("Settings response:", response);
      debugObject(response, "Settings Response");
      
      // Extract settings from response - handle both direct and wrapped formats
      const settings = (response?.settings || response) as {
        savedConnections?: SavedConnection[];
        savedKeys?: SSHKey[];
        theme?: string;
        refreshInterval?: number;
        autoConnect?: boolean;
      };
      
      if (settings) {
        // Access savedConnections directly from settings
        if (Array.isArray(settings.savedConnections)) {
          console.log("Found connections in settings:", settings.savedConnections.length);
          setSavedConnections(settings.savedConnections);
        } else {
          console.warn("No saved connections found in settings");
          setSavedConnections([]);
        }
        
        // Load SSH keys
        const keysResponse = await window.api.getSSHKeys();
        if (keysResponse && keysResponse.success && Array.isArray(keysResponse.keys)) {
          console.log(`Loaded ${keysResponse.keys.length} SSH keys`);
          setSSHKeys(keysResponse.keys);
        } else {
          console.log("No SSH keys found or failed to load keys");
          setSSHKeys([]);
        }
      } else {
        console.error("Failed to load settings");
        showToast("Error", "Failed to load settings data", "error");
        setSavedConnections([]);
        setSSHKeys([]);
      }
    } catch (error) {
      console.error("Error loading data:", error);
      showToast("Error", "Failed to load settings data", "error");
      setSavedConnections([]);
      setSSHKeys([]);
    }
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setTabValue(newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSelectChange = (e: SelectChangeEvent) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSnackbarClose = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  const showToast = (title: string, message: string, severity: 'success' | 'error' | 'warning' | 'info', details?: string | null) => {
    setSnackbar({
      open: true,
      title,
      message,
      severity,
      details: details || undefined
    });
  };

  const handleConnect = async (connection?: SavedConnection) => {
    try {
      const connectionToUse = connection || {
        id: '',
        name: form.name,
        host: form.host,
        port: parseInt(form.port) || 22,
        username: form.username,
        authType: form.authType,
        privateKeyId: form.privateKeyId,
        allowNewFingerprint: form.allowNewFingerprint
      };
      
      console.log('Connecting using:', connectionToUse);
      setIsConnecting(true);
      
      // Prepare SSH config for connection
      const sshConfig: SSHConfig = {
        host: connectionToUse.host,
        port: connectionToUse.port,
        username: connectionToUse.username,
        authType: connectionToUse.authType,
        allowNewFingerprint: connectionToUse.allowNewFingerprint
      };
      
      // Add authentication credentials
      if (connectionToUse.authType === 'password') {
        sshConfig.password = form.password;
      } else if (connectionToUse.authType === 'privateKey') {
        // For private key authentication, use the key ID
        sshConfig.privateKeyId = connectionToUse.privateKeyId;
      }
      
      // Connect using the API
      console.log('Sending connection request with config:', {
        ...sshConfig,
        password: sshConfig.password ? '*****' : undefined
      });
      
      const result = await window.api.connectSSH(sshConfig);
      console.log('Connection result:', result);
      
      // Process connection result
      if (result && result.success) {
        showToast(
          'Connected', 
          `Successfully connected to ${connectionToUse.host}`, 
          'success'
        );
        
        // Force refresh connection status
        refreshConnection();
        
        // If this was a newly entered connection, save it if it has a name
        if (!connection && form.name) {
          handleSaveConnection();
        }
        
        // Clear sensitive data
        if (form.authType === 'password') {
          setForm(prev => ({ ...prev, password: '' }));
        }
      } else {
        const errorDetails = result && result.message ? result.message : 'Unknown error';
        showToast(
          'Connection Failed', 
          `Failed to connect to ${connectionToUse.host}`, 
          'error',
          errorDetails
        );
      }
    } catch (error: any) {
      console.error('Error during connect operation:', error);
      showToast(
        'Connection Error', 
        'An error occurred while connecting', 
        'error',
        error.toString()
      );
    } finally {
      setIsConnecting(false);
    }
  };

  const handleTestConnection = async () => {
    setIsTesting(true);

    try {
      // Basic validation
      if (!form.host) {
        throw new Error('Host is required');
      }
      
      if (!form.username) {
        throw new Error('Username is required');
      }
      
      // Normalize authType for consistent handling
      const authType = form.authType ? String(form.authType).toLowerCase() : '';
      
      // Authentication method validation
      if (authType === 'password') {
        if (!form.password) {
          throw new Error('Password is required when using password authentication');
        }
      } else if (authType === 'privatekey') {
        if (!form.privateKeyId) {
          throw new Error('SSH key is required when using key-based authentication');
        }
      } else {
        throw new Error('Please select a valid authentication method');
      }

      // Prepare connection config
      const sshConfig = {
        host: form.host,
        port: parseInt(form.port) || 22,
        username: form.username,
        password: authType === 'password' ? form.password : undefined,
        privateKeyId: authType === 'privatekey' ? form.privateKeyId : undefined,
        authType: form.authType, // Keep original authType for compatibility
        allowNewFingerprint: form.allowNewFingerprint
      };

      console.log('Testing connection with config:', { 
        ...sshConfig, 
        password: sshConfig.password ? '****' : undefined 
      });

      // Test connection
      const result = await window.api.testSSHConnection(sshConfig);

      if (result.success) {
        showToast('Connection Test Successful', 'SSH connection test passed', 'success');
        
        // Add message about PM2 availability if that information is present
        if (result.hasPm2 === false) {
          showToast(
            'Warning: PM2 Not Found', 
            'SSH connection succeeded, but PM2 was not found on the remote system. You may need to install it.',
            'warning'
          );
        }
      } else {
        let errorDetails = '';
        
        // Extract detailed error information if available
        if (result.message) {
          errorDetails = result.message;
        }
        
        showToast(
          'Connection Test Failed', 
          'Failed to test connection', 
          'error',
          errorDetails
        );
      }
    } catch (err: any) {
      showToast('Connection Test Error', err.message || 'An unknown error occurred', 'error');
    } finally {
      setIsTesting(false);
    }
  };

  const handleUseConnection = (connection: SavedConnection) => {
    // When clicking "Connect" on a saved connection, directly connect instead of switching tabs
    handleConnect(connection);
  };

  const handleDeleteConnection = async (id: string) => {
    try {
      console.log(`Deleting connection with ID: ${id}`);
      const updatedConnections = savedConnections.filter(conn => conn.id !== id);
      console.log(`Updated connections count: ${updatedConnections.length}`);
      
      // Update local state first for immediate UI feedback
      setSavedConnections(updatedConnections);
      
      // Get current settings to preserve other values
      const settingsResult = await window.api.getSettings();
      console.log("Current settings before deletion:", settingsResult);
      
      // Create updated settings object
      let updatedSettings: any = { savedConnections: updatedConnections };
      
      // If we have existing settings, preserve them
      if (settingsResult && settingsResult.settings) {
        updatedSettings = {
          ...settingsResult.settings,
          savedConnections: updatedConnections
        };
      }
      
      console.log("Saving updated settings after deletion:", {
        ...updatedSettings,
        savedConnections: updatedConnections.length
      });
      
      // Save to settings API
      const saveResult = await window.api.saveSettings(updatedSettings);
      console.log("Save result after deletion:", saveResult);
      
      if (saveResult.success) {
        showToast('Connection Deleted', 'Connection successfully removed', 'success');
      } else {
        throw new Error('Failed to save settings after deletion: ' + (saveResult.message || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error deleting connection:', error);
      showToast('Error', 'Failed to delete connection. Check console for details.', 'error');
      
      // Reload data to ensure UI is in sync with actual data
      loadData();
    }
  };

  // Save connection to settings
  const handleSaveConnection = async () => {
    try {
      // Validate form
      if (!form.name || !form.host || !form.username) {
        showToast('Validation Error', 'Please fill in all required fields', 'error');
        return;
      }

      // Create connection object
      const newConnection: SavedConnection = {
        id: Date.now().toString(), // Simple ID generation
        name: form.name,
        host: form.host,
        port: parseInt(form.port) || 22,
        username: form.username,
        authType: form.authType,
        privateKeyId: form.authType === 'privateKey' ? form.privateKeyId : undefined,
        password: form.authType === 'password' ? form.password : undefined,
        allowNewFingerprint: form.allowNewFingerprint
      };

      console.log("Saving new connection:", { ...newConnection, password: newConnection.password ? '***' : undefined });

      // Add to saved connections
      const updatedConnections = [...savedConnections, newConnection];
      setSavedConnections(updatedConnections);

      // Save to settings
      try {
        // First get existing settings to preserve other values
        const result = await window.api.getSettings();
        console.log("Current settings before saving:", result);

        // Create settings object
        let updatedSettings: any = { savedConnections: updatedConnections };
        
        // If we have existing settings, preserve them
        if (result && result.settings) {
          updatedSettings = {
            ...result.settings,
            savedConnections: updatedConnections
          };
        }
        
        console.log("Saving updated settings:", {
          ...updatedSettings,
          savedConnections: updatedConnections.length
        });
        
        const saveResult = await window.api.saveSettings(updatedSettings);
        console.log("Save result:", saveResult);
        
        if (saveResult.success) {
          showToast('Success', `Connection "${form.name}" saved successfully`, 'success');
          // Switch to saved connections tab
          setTabValue('2');
        } else {
          throw new Error('Failed to save settings: ' + (saveResult.message || 'Unknown error'));
        }
      } catch (settingsError) {
        console.error('Settings error:', settingsError);
        throw settingsError;
      }
    } catch (error) {
      console.error('Failed to save connection:', error);
      showToast('Error', 'Failed to save connection. Please check the console for details.', 'error');
    }
  };

  return (
    <PageContainer 
      title="Connection Manager" 
      description="Add and manage SSH connections to remote servers"
      actions={
        <Box sx={{ display: 'flex', gap: 1 }}>
          {!connected && savedConnections.length > 0 && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              startIcon={<MdRefresh />}
              onClick={checkConnectionStatus}
              disabled={isConnecting}
              sx={{
                backgroundColor: theme.palette.success.main,
                color: '#000',
                fontFamily: '"SF Mono", monospace',
                '&:hover': {
                  backgroundColor: theme.palette.success.dark
                }
              }}
            >
              {isConnecting ? "Connecting..." : "Reconnect"}
            </Button>
          )}
          <Button
            variant="outlined"
            size="small"
            startIcon={<MdRefresh />}
            onClick={loadData}
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
          <Box>
            <Chip
              label={connected ? "Connected" : "Disconnected"}
              size="small"
              sx={{ 
                borderRadius: '4px',
                backgroundColor: connected 
                  ? `${theme.palette.success.main}20` 
                  : `${theme.palette.error.main}20`,
                color: connected ? theme.palette.success.main : theme.palette.error.main,
                fontWeight: 500,
                fontFamily: '"SF Mono", monospace',
                fontSize: '0.75rem',
              }}
            />
          </Box>
        </Box>
      }
    >
      <Snackbar
        open={snackbar.open}
        autoHideDuration={snackbar.severity === 'error' ? 6000 : 3000}
        onClose={handleSnackbarClose}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      >
        <Alert 
          onClose={handleSnackbarClose}
          severity={snackbar.severity}
          sx={{ width: '100%', maxWidth: snackbar.details ? '600px' : '400px' }}
        >
          <AlertTitle>{snackbar.title}</AlertTitle>
          <Box sx={{ mb: snackbar.details ? 2 : 0 }}>
            {snackbar.message}
          </Box>
          
          {snackbar.details && (
            <Paper 
              variant="outlined" 
              sx={{ 
                mt: 1,
                p: 1,
                maxHeight: '150px',
                overflow: 'auto',
                fontSize: '0.75rem',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
                wordBreak: 'break-all'
              }}
            >
              {snackbar.details}
            </Paper>
          )}
        </Alert>
      </Snackbar>

      <TabContext value={tabValue}>
        <Box sx={{ 
          borderBottom: 1, 
          borderColor: 'divider',
          backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.6)' : 'rgba(249, 250, 251, 0.8)',
          px: 3,
          pt: 2
        }}>
          <TabList onChange={handleTabChange} aria-label="Connection tabs">
            <Tab 
              label="New Connection" 
              value="1" 
              icon={<MdWifi />}
              iconPosition="start"
              sx={{ 
                textTransform: 'none', 
                fontWeight: 500,
                minHeight: '48px'
              }}
            />
            <Tab 
              label={`Saved Connections (${savedConnections.length})`} 
              value="2" 
              icon={<MdSave />}
              iconPosition="start"
              sx={{ 
                textTransform: 'none', 
                fontWeight: 500,
                minHeight: '48px'
              }}
            />
          </TabList>
        </Box>

        <TabPanel value="1" sx={{ p: 0, height: '100%' }}>
          <Box sx={{ 
            p: 3, 
            height: '100%', 
            overflow: 'auto',
            backgroundColor: isDarkMode ? 'rgba(17, 24, 39, 0.4)' : '#ffffff'
          }}>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                    backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : '#ffffff',
                    height: '100%'
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, fontSize: '1.125rem' }}>
                    SSH Connection Details
                  </Typography>

                  <Stack spacing={3}>
                    <TextField
                      fullWidth
                      label="Connection Name"
                      name="name"
                      value={form.name}
                      onChange={handleInputChange}
                      placeholder="My Server"
                      variant="outlined"
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                        }
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Hostname / IP Address"
                      name="host"
                      value={form.host}
                      onChange={handleInputChange}
                      placeholder="server.example.com or 192.168.1.1"
                      variant="outlined"
                      required
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                        }
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Port"
                      name="port"
                      value={form.port}
                      onChange={handleInputChange}
                      placeholder="22"
                      variant="outlined"
                      size="small"
                      type="number"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                        }
                      }}
                    />

                    <TextField
                      fullWidth
                      label="Username"
                      name="username"
                      value={form.username}
                      onChange={handleInputChange}
                      placeholder="root"
                      variant="outlined"
                      required
                      size="small"
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          borderRadius: '6px',
                        }
                      }}
                    />

                    <FormControl fullWidth size="small">
                      <InputLabel id="auth-type-label">Authentication Method</InputLabel>
                      <Select
                        labelId="auth-type-label"
                        name="authType"
                        value={form.authType}
                        onChange={handleSelectChange}
                        input={<OutlinedInput label="Authentication Method" />}
                        sx={{ borderRadius: '6px' }}
                      >
                        <MenuItem value="password">Password</MenuItem>
                        <MenuItem value="privateKey">SSH Key</MenuItem>
                      </Select>
                    </FormControl>

                    {form.authType === 'password' ? (
                      <TextField
                        fullWidth
                        label="Password"
                        name="password"
                        value={form.password}
                        onChange={handleInputChange}
                        variant="outlined"
                        type={showPassword ? 'text' : 'password'}
                        size="small"
                        sx={{
                          '& .MuiOutlinedInput-root': {
                            borderRadius: '6px',
                          }
                        }}
                        InputProps={{
                          endAdornment: (
                            <InputAdornment position="end">
                              <IconButton
                                aria-label="toggle password visibility"
                                onClick={() => setShowPassword(!showPassword)}
                                edge="end"
                                size="small"
                              >
                                {showPassword ? <MdVisibilityOff /> : <MdVisibility />}
                              </IconButton>
                            </InputAdornment>
                          ),
                        }}
                      />
                    ) : (
                      <FormControl fullWidth size="small">
                        <InputLabel id="ssh-key-label">SSH Key</InputLabel>
                        <Select
                          labelId="ssh-key-label"
                          name="privateKeyId"
                          value={form.privateKeyId || ''}
                          onChange={handleSelectChange}
                          input={<OutlinedInput label="SSH Key" />}
                          sx={{ borderRadius: '6px' }}
                        >
                          {sshKeys.map((key) => (
                            <MenuItem key={key.id} value={key.id}>
                              {key.name}
                            </MenuItem>
                          ))}
                          {sshKeys.length === 0 && (
                            <MenuItem disabled value="">
                              No SSH keys available
                            </MenuItem>
                          )}
                        </Select>
                        {sshKeys.length === 0 && (
                          <FormHelperText>
                            Please add an SSH key in the SSH Keys section
                          </FormHelperText>
                        )}
                      </FormControl>
                    )}

                    {/* Allow New Fingerprints Option */}
                    <Grid item xs={12}>
                      <FormControl fullWidth>
                        <FormControlLabel
                          control={
                            <Checkbox
                              checked={form.allowNewFingerprint}
                              onChange={(e) => setForm({...form, allowNewFingerprint: e.target.checked})}
                              name="allowNewFingerprint"
                            />
                          }
                          label="Automatically accept new host fingerprints"
                        />
                        <FormHelperText>
                          Enable this for unattended connections, but be aware this reduces security. 
                          When disabled, you'll be prompted to verify new fingerprints.
                        </FormHelperText>
                      </FormControl>
                    </Grid>
                  </Stack>
                </Paper>
              </Grid>

              <Grid item xs={12} md={6}>
                <Paper
                  elevation={0}
                  sx={{
                    p: 3,
                    borderRadius: '8px',
                    border: `1px solid ${isDarkMode ? 'rgba(55, 65, 81, 0.5)' : 'rgba(229, 231, 235, 0.8)'}`,
                    backgroundColor: isDarkMode ? 'rgba(31, 41, 55, 0.5)' : '#ffffff',
                    display: 'flex',
                    flexDirection: 'column',
                    height: '100%'
                  }}
                >
                  <Typography variant="h6" sx={{ mb: 3, fontWeight: 600, fontSize: '1.125rem' }}>
                    Connection Actions
                  </Typography>

                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      Test the connection before connecting or click Connect to connect directly.
                      {form.name && ' You can also save this connection for future use.'}
                    </Typography>
                  </Box>

                  <Stack spacing={2} sx={{ mt: 'auto' }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      color="primary"
                      startIcon={<MdRefresh />}
                      onClick={handleTestConnection}
                      disabled={isConnecting || isTesting}
                      sx={{ 
                        py: 1.5,
                        borderRadius: '6px'
                      }}
                    >
                      {isTesting ? 'Testing...' : 'Test Connection'}
                    </Button>

                    <Button
                      fullWidth
                      variant="contained"
                      color="primary"
                      startIcon={<MdWifi />}
                      onClick={() => handleConnect()}
                      disabled={isConnecting || isTesting}
                      sx={{ 
                        py: 1.5,
                        borderRadius: '6px',
                        fontWeight: 500
                      }}
                    >
                      {isConnecting ? 'Connecting...' : 'Connect'}
                    </Button>

                    {form.name && (
                      <Button
                        fullWidth
                        variant="outlined"
                        color="secondary"
                        startIcon={<MdSave />}
                        onClick={handleSaveConnection}
                        disabled={isConnecting || isTesting}
                        sx={{ 
                          py: 1.5,
                          borderRadius: '6px'
                        }}
                      >
                        Save Connection
                      </Button>
                    )}
                  </Stack>
                </Paper>
              </Grid>
            </Grid>
          </Box>
        </TabPanel>

        <TabPanel value="2">
          {/* Debug statement outside JSX to avoid React node issues */}
          {(() => { console.log("TabPanel rendering - savedConnections:", savedConnections); return null; })()}
          
          {savedConnections.length === 0 ? (
            <Alert severity="info" sx={{ my: 2 }}>
              <AlertTitle>No Saved Connections</AlertTitle>
              <Typography>Create and save a connection to see it here.</Typography>
              <Button 
                size="small" 
                startIcon={<MdRefresh />} 
                onClick={loadData} 
                sx={{ mt: 2 }}
              >
                Refresh Connections
              </Button>
            </Alert>
          ) : (
            <Grid container spacing={3}>
              {savedConnections.map((connection) => (
                <Grid item xs={12} md={6} key={connection.id}>
                  <Card 
                    sx={{ 
                      transition: "transform 0.2s", 
                      "&:hover": { transform: "translateY(-4px)" } 
                    }}
                  >
                    <CardHeader 
                      title={connection.name}
                      action={
                        <Chip 
                          label={connection.authType} 
                          color="primary" 
                          size="small" 
                          variant="outlined"
                        />
                      }
                    />
                    <CardContent>
                      <Typography variant="body2" color="text.secondary">
                        {connection.username}@{connection.host}:{connection.port}
                      </Typography>
                    </CardContent>
                    <CardActions>
                      <Button
                        size="small"
                        startIcon={<MdLink />}
                        variant="contained"
                        color="primary"
                        onClick={() => handleUseConnection(connection)}
                      >
                        Connect
                      </Button>
                      <Button
                        size="small"
                        startIcon={<MdDelete />}
                        color="error"
                        onClick={() => handleDeleteConnection(connection.id)}
                      >
                        Delete
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}
        </TabPanel>
      </TabContext>
    </PageContainer>
  );
};

export default ConnectionManager; 