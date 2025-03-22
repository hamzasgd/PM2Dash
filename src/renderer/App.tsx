import React, { useState, useMemo, createContext, useEffect } from 'react';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline, Box, PaletteMode } from '@mui/material';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useConnection } from './context/ConnectionContext';
import FingerprintVerifier from './components/FingerprintVerifier';
import { blue, grey } from '@mui/material/colors';

// Theme
import theme from './theme';

// Layout
import Sidebar from './components/Sidebar';

// Pages
import Dashboard from './views/Dashboard';
import ProcessManager from './views/ProcessManager';
import Logs from './views/Logs';
import Settings from './views/Settings';
import ConnectionManager from './views/ConnectionManager';
import SSHKeyManager from './views/SSHKeyManager';

// Create a ThemeContext for sharing the theme state
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  mode: 'dark' as PaletteMode
});

// Component that wraps the app content and handles connection checks
const AppContent: React.FC<{ toggleTheme: () => void }> = ({ toggleTheme }) => {
  // Get connection state and methods
  const { checkConnection, refreshConnection, debouncedCheckConnection, fingerprintVerificationNeeded, currentFingerprint, isFingerprintChanged, verifyFingerprint, rejectFingerprint } = useConnection();
  
  // Check connection status when app loads
  useEffect(() => {
    console.log('[App] Checking initial connection status...');
    const checkInitialConnection = async () => {
      try {
        await refreshConnection();
      } catch (error) {
        console.error('[App] Error checking initial connection:', error);
      }
    };
    
    checkInitialConnection();
    
    // Set up interval to periodically refresh connection state (every 2 minutes)
    const interval = setInterval(() => {
      debouncedCheckConnection();
    }, 120000); // 2 minutes instead of 1 minute
    
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps array to run only once at mount, functions accessed via closure

  const handleVerifyFingerprint = async (fingerprint: any) => {
    await verifyFingerprint(fingerprint);
  };

  const handleRejectFingerprint = async (host: string, port: number) => {
    await rejectFingerprint(host, port);
  };

  return (
    <Box sx={{ 
      display: 'flex', 
      height: '100vh',
      overflow: 'hidden',
      backgroundColor: '#1d1f21', 
      color: '#f8f8f2' 
    }}>
      {/* Sidebar */}
      <Box 
        component="nav" 
        sx={{ 
          width: 240, 
          flexShrink: 0, 
          height: '100%' 
        }}
      >
        <Sidebar />
      </Box>
      
      {/* Main content */}
      <Box 
        component="main" 
        sx={{ 
          flexGrow: 1, 
          height: '100%',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/processes" element={<ProcessManager />} />
          <Route path="/logs" element={<Logs />} />
          <Route path="/connections" element={<ConnectionManager />} />
          <Route path="/ssh-keys" element={<SSHKeyManager />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/terminal" element={<Navigate to="/" replace />} />
        </Routes>
      </Box>
      
      {/* Fingerprint verification dialog */}
      <FingerprintVerifier
        open={fingerprintVerificationNeeded}
        fingerprint={currentFingerprint}
        isChanged={isFingerprintChanged}
        onVerify={handleVerifyFingerprint}
        onReject={handleRejectFingerprint}
      />
    </Box>
  );
};

const App: React.FC = () => {
  // State for the theme mode
  const [mode, setMode] = useState<PaletteMode>('dark');

  // Create color mode context value
  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode],
  );

  // Function to set theme mode
  const toggleTheme = () => {
    setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
  };

  // Create theme based on mode
  const theme = React.useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: blue[700],
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : grey[900],
            paper: mode === 'light' ? '#ffffff' : grey[800],
          },
        },
      }),
    [mode]
  );

  // Check for saved theme preference
  useEffect(() => {
    // Check system preference first
    const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const savedMode = localStorage.getItem('theme');
    
    if (savedMode === 'light' || savedMode === 'dark') {
      setMode(savedMode);
    } else if (prefersDarkMode) {
      setMode('dark');
    } else {
      setMode('light');
    }
  }, []);

  // Save theme changes to localStorage
  useEffect(() => {
    localStorage.setItem('theme', mode);
  }, [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppContent toggleTheme={toggleTheme} />
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App; 