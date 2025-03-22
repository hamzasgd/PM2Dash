import React, { useState, useEffect, useContext } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
  Divider,
  Alert,
  AlertTitle,
  Switch,
  FormControlLabel,
  Stack,
  useMediaQuery,
  useTheme,
  SelectChangeEvent,
  Tab,
  Paper,
  Tabs,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  Chip,
  Snackbar
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { MdSave, MdRefresh, MdDelete, MdOutlineFingerprint } from 'react-icons/md';
import { ColorModeContext } from '../App';
import { SavedConnection, SSHKey, HostFingerprint } from '../types';
import ConnectionStatus from '../components/ConnectionStatus';

interface Settings {
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number;
  defaultConnection: string | null;
  savedConnections: SavedConnection[];
  savedKeys: SSHKey[];
  autoConnect: boolean;
}

const Settings: React.FC = () => {
  const [settings, setSettings] = useState<Settings>({
    theme: 'dark',
    refreshInterval: 5000,
    defaultConnection: null,
    savedConnections: [],
    savedKeys: [],
    autoConnect: false
  });
  const [activeTab, setActiveTab] = useState('1');
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [fingerprints, setFingerprints] = useState<HostFingerprint[]>([]);
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info'
  });
  
  const colorMode = useContext(ColorModeContext);
  const theme = useTheme();
  const prefersDark = useMediaQuery('(prefers-color-scheme: dark)');
  
  // Load settings from main process on mount
  useEffect(() => {
    loadSettings();
  }, [colorMode]);
  
  // Extract loadSettings to a callable function
  const loadSettings = async () => {
    try {
      setLoading(true);
      setError(null); // Clear any previous errors
      console.log("Loading settings...");
      const result = await window.api.getSettings();
      console.log("Settings result:", result);
      
      if (result && result.success && result.settings) {
        // Map API settings to our Settings interface
        const mappedSettings: Settings = {
          theme: result.settings.theme as 'light' | 'dark' | 'system' || 'dark',
          refreshInterval: result.settings.refreshInterval || 5000,
          defaultConnection: (result.settings as any).defaultConnection || null,
          savedConnections: result.settings.savedConnections || [],
          savedKeys: result.settings.savedKeys || [],
          autoConnect: result.settings.autoConnect || false
        };
        
        console.log("Mapped settings:", mappedSettings);
        setSettings(mappedSettings);
        
        // Sync theme with settings
        syncThemeWithSettings(mappedSettings);
      } else if (result && typeof result === 'object' && !('success' in result)) {
        // Direct settings object (not wrapped in response)
        console.log("Detected direct settings object:", result);
        
        const directSettings: Settings = {
          theme: (result as any).theme as 'light' | 'dark' | 'system' || 'dark',
          refreshInterval: (result as any).refreshInterval || 5000,
          defaultConnection: (result as any).defaultConnection || null,
          savedConnections: (result as any).savedConnections || [],
          savedKeys: (result as any).savedKeys || [],
          autoConnect: (result as any).autoConnect || false
        };
        
        console.log("Mapped direct settings:", directSettings);
        setSettings(directSettings);
        
        // Sync theme with settings
        syncThemeWithSettings(directSettings);
      } else {
        console.error("Failed to load settings:", result);
        setError('Failed to load settings. Please try again.');
      }
      
      // Also load fingerprints
      await loadFingerprints();
    } catch (err) {
      console.error('Error loading settings:', err);
      setError('An error occurred while loading settings. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  // Sync theme with settings
  const syncThemeWithSettings = (settings: Settings) => {
    if (settings.theme === 'system') {
      // If system preference, check if we need to toggle
      if ((colorMode.mode === 'light' && prefersDark) ||
          (colorMode.mode === 'dark' && !prefersDark)) {
        colorMode.toggleColorMode();
      }
    // If explicit theme, check if we need to toggle
    } else if ((settings.theme === 'dark' && colorMode.mode === 'light') ||
              (settings.theme === 'light' && colorMode.mode === 'dark')) {
      // Toggle to match the setting
      colorMode.toggleColorMode();
    }
  };
  
  // Save settings to main process
  const saveSettings = async () => {
    try {
      await window.api.saveSettings(settings);
      setSaved(true);
      
      // Apply theme change
      syncThemeWithSettings(settings);
      
      // Reset saved state after 3 seconds
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError('Failed to save settings');
      console.error(err);
    }
  };
  
  // Handle form changes
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement> | SelectChangeEvent) => {
    const { name, value } = e.target;
    setSettings({ ...settings, [name]: value });
  };
  
  const handleRefreshChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ensure value is a number and within reasonable bounds
    let value = parseInt(e.target.value);
    if (isNaN(value) || value < 1000) value = 1000;
    if (value > 60000) value = 60000;
    
    setSettings({ ...settings, refreshInterval: value });
  };

  const handleTabChange = (event: React.SyntheticEvent, newValue: string) => {
    setActiveTab(newValue);
    
    // Load fingerprints when switching to the fingerprints tab
    if (newValue === '2') {
      loadFingerprints();
    }
  };

  // Add a useEffect to check connection status
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const result = await window.api.getSSHStatus();
        if (result.success && result.connectionState) {
          setConnected(!!result.connectionState.connected);
        } else {
          setConnected(false);
        }
      } catch (error) {
        console.error('Failed to check connection status:', error);
        setConnected(false);
      }
    };

    // Check connection on mount
    checkConnectionStatus();

    // Listen for connection change events
    const handleConnectionChange = (event: CustomEvent) => {
      console.log('Connection change detected in Settings:', event.detail);
      setConnected(!!event.detail.connected);
    };

    window.addEventListener('ssh-connection-change', handleConnectionChange as EventListener);

    return () => {
      window.removeEventListener('ssh-connection-change', handleConnectionChange as EventListener);
    };
  }, []);

  // Load fingerprints
  const loadFingerprints = async () => {
    try {
      const result = await window.api.getHostFingerprints();
      if (result.success && result.fingerprints) {
        setFingerprints(result.fingerprints);
      }
    } catch (error) {
      console.error("Error loading fingerprints:", error);
    }
  };

  // Delete a fingerprint
  const handleDeleteFingerprint = async (host: string, port: number) => {
    try {
      const result = await window.api.deleteHostFingerprint(host);
      if (result.success) {
        // Update local state
        setFingerprints(prev => prev.filter(f => !(f.host === host && f.port === port)));
        setSnackbar({
          open: true,
          message: "Fingerprint deleted successfully",
          severity: "success"
        });
      }
    } catch (error) {
      console.error("Error deleting fingerprint:", error);
      setSnackbar({
        open: true,
        message: "Failed to delete fingerprint",
        severity: "error"
      });
    }
  };

  return (
    <Box sx={{ 
      p: 3, 
      height: '100%', 
      display: 'flex', 
      flexDirection: 'column', 
      overflow: 'hidden' 
    }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Settings</Typography>
      
      {saved && (
        <Alert severity="success" sx={{ mb: 3 }}>
          <AlertTitle>Success</AlertTitle>
          Settings saved successfully
        </Alert>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <AlertTitle>Error</AlertTitle>
          {error}
          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              startIcon={<MdRefresh />}
              variant="outlined"
              onClick={loadSettings}
              disabled={loading}
            >
              Retry Loading Settings
            </Button>
          </Box>
        </Alert>
      )}
      
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <TabContext value={activeTab}>
          <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
            <TabList onChange={handleTabChange} aria-label="settings tabs">
              <Tab label="General" value="1" />
              <Tab label="Fingerprints" value="2" icon={<MdOutlineFingerprint />} iconPosition="start" />
            </TabList>
          </Box>
          
          <TabPanel value="1" sx={{ p: 0, pt: 2, height: '100%', overflow: 'auto' }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>Application Settings</Typography>
                
                <FormControl fullWidth margin="normal">
                  <InputLabel id="theme-select-label">Theme</InputLabel>
                  <Select
                    labelId="theme-select-label"
                    id="theme-select"
                    name="theme"
                    value={settings.theme}
                    label="Theme"
                    onChange={handleChange}
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">System Preference</MenuItem>
                  </Select>
                </FormControl>
                
                <FormControl fullWidth margin="normal">
                  <TextField
                    label="Refresh Interval (ms)"
                    id="refresh-interval"
                    name="refreshInterval"
                    type="number"
                    value={settings.refreshInterval}
                    onChange={handleRefreshChange}
                    helperText="Time between refreshes in milliseconds (min: 1000, max: 60000)"
                    InputProps={{
                      inputProps: { min: 1000, max: 60000 }
                    }}
                  />
                </FormControl>
                
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                  <Button
                    variant="contained"
                    color="primary"
                    startIcon={<MdSave />}
                    onClick={saveSettings}
                    disabled={loading}
                  >
                    Save Settings
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </TabPanel>
          
          <TabPanel value="2" sx={{ p: 0, pt: 2, height: '100%', overflow: 'auto' }}>
            <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                Saved SSH Host Fingerprints
              </Typography>
              
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                These are the SSH host key fingerprints you've verified and saved.
              </Typography>
              
              <Box sx={{ flex: 1, overflow: 'auto', mb: 2 }}>
                {fingerprints.length === 0 ? (
                  <Paper variant="outlined" sx={{ p: 2, textAlign: 'center' }}>
                    <Typography color="text.secondary">
                      No saved fingerprints found.
                    </Typography>
                  </Paper>
                ) : (
                  <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: '100%' }}>
                    <Table stickyHeader>
                      <TableHead>
                        <TableRow>
                          <TableCell>Host</TableCell>
                          <TableCell>Key Type</TableCell>
                          <TableCell>Fingerprint</TableCell>
                          <TableCell>Added</TableCell>
                          <TableCell>Last Seen</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {fingerprints.map((fingerprint) => (
                          <TableRow key={`${fingerprint.host}:${fingerprint.port}`}>
                            <TableCell>
                              {fingerprint.host}:{fingerprint.port}
                            </TableCell>
                            <TableCell>
                              <Chip 
                                label={fingerprint.keyType} 
                                size="small" 
                                color="primary" 
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}>
                                {fingerprint.hashAlgorithm}:{fingerprint.hash.substring(0, 20)}...
                              </Typography>
                            </TableCell>
                            <TableCell>
                              {new Date(fingerprint.addedAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              {fingerprint.lastSeen 
                                ? new Date(fingerprint.lastSeen).toLocaleDateString() 
                                : 'N/A'}
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Delete fingerprint">
                                <IconButton 
                                  size="small" 
                                  color="error" 
                                  onClick={() => handleDeleteFingerprint(fingerprint.host, fingerprint.port)}
                                >
                                  <MdDelete />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
              
              <Button 
                variant="outlined"
                onClick={loadFingerprints}
                startIcon={<MdRefresh />}
              >
                Refresh Fingerprints
              </Button>
            </Box>
          </TabPanel>
        </TabContext>
      </Box>
      
      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar(prev => ({ ...prev, open: false }))}
        message={snackbar.message}
      />
    </Box>
  );
};

export default Settings; 