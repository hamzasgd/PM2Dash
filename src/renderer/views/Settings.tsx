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
  Tab
} from '@mui/material';
import { TabContext, TabList, TabPanel } from '@mui/lab';
import { MdSave, MdRefresh } from 'react-icons/md';
import { ColorModeContext } from '../App';
import { SavedConnection, SSHKey } from '../types';
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
  const [needsConnection, setNeedsConnection] = useState(false);
  
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

  // Check if active tab needs SSH connection
  useEffect(() => {
    // Only SSH Keys and PM2 Settings require a connection
    setNeedsConnection(['2', '3'].includes(activeTab) && !connected);
  }, [activeTab, connected]);

  return (
    <Box sx={{ p: 3 }}>
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
      
      {needsConnection ? (
        <ConnectionStatus 
          title="Connection Required"
          message="Please connect to an SSH server to access this settings section."
        />
      ) : (
        <Card variant="outlined">
          <CardContent>
            <TabContext value={activeTab}>
              <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <TabList onChange={handleTabChange} aria-label="settings tabs">
                  <Tab label="General" value="1" />
                  <Tab label="SSH Keys" value="2" />
                  <Tab label="PM2 Settings" value="3" />
                </TabList>
              </Box>
            </TabContext>
            
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
      )}
    </Box>
  );
};

export default Settings; 