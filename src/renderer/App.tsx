import React, { useState, useMemo, createContext, useEffect } from 'react';
import { ThemeProvider } from '@mui/material/styles';
import { CssBaseline, Box, PaletteMode } from '@mui/material';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useConnection } from './context/ConnectionContext';

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
const AppContent: React.FC = () => {
  // Get connection state and methods
  const { checkConnection, refreshConnection, debouncedCheckConnection } = useConnection();
  
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

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AppContent />
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
};

export default App; 