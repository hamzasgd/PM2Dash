import React, { useState, useEffect, useContext } from 'react';
import { useLocation, Link as RouterLink } from 'react-router-dom';
import {
  Box,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Tooltip,
  useTheme
} from '@mui/material';
import {
  MdDashboard,
  MdList,
  MdSettings,
  MdWifi,
  MdMemory,
  MdOutlineKey
} from 'react-icons/md';
import { ColorModeContext } from '../App';

// Define the sidebar items
const sidebarItems = [
  {
    label: 'Dashboard',
    icon: <MdDashboard />,
    path: '/',
    exact: true
  },
  {
    label: 'Processes',
    icon: <MdMemory />,
    path: '/processes'
  },
  {
    label: 'Logs',
    icon: <MdList />,
    path: '/logs'
  },
  {
    label: 'SSH Keys',
    icon: <MdOutlineKey />,
    path: '/ssh-keys'
  },
  {
    label: 'Connections',
    icon: <MdWifi />,
    path: '/connections'
  },
  {
    label: 'Settings',
    icon: <MdSettings />,
    path: '/settings'
  }
];

const Sidebar: React.FC = () => {
  const location = useLocation();
  const theme = useTheme();
  const isDark = theme.palette.mode === 'dark';
  const colorMode = useContext(ColorModeContext);
  const [connected, setConnected] = useState(false);

  // Check connection status on component mount
  useEffect(() => {
    const checkConnectionStatus = async () => {
      try {
        const statusResult = await window.api.getSSHStatus();
        setConnected(statusResult.success && statusResult.connectionState?.connected);
      } catch (err) {
        console.error('Failed to check connection status:', err);
        setConnected(false);
      }
    };

    checkConnectionStatus();
    // Poll every 30 seconds
    const interval = setInterval(checkConnectionStatus, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Function to disconnect from SSH
  const handleDisconnect = async () => {
    try {
      const result = await window.api.disconnectSSH();
      if (result.success) {
        setConnected(false);
      }
    } catch (err) {
      console.error('Failed to disconnect:', err);
    }
  };

  // Function to toggle theme
  const toggleTheme = () => {
    colorMode.toggleColorMode();
  };

  // Function to determine if an item is active
  const isActive = (path: string, exact: boolean = false) => {
    if (exact) {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  // Calculate traffic light colors for macOS-style titlebar
  const red = theme.palette.error.main;
  const yellow = theme.palette.warning.main;
  const green = theme.palette.success.main;

  const isDarkMode = colorMode.mode === 'dark';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        backgroundColor: '#1d1f21',
        borderRight: '1px solid rgba(255, 255, 255, 0.08)',
      }}
    >
      {/* App title with traffic lights */}
      <Box 
        sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          p: 2,
          backgroundColor: '#2d2f31',
          borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
          height: 44
        }}
      >
        <Box sx={{ display: 'flex', mr: 2, my: 0 }}>
          <Box 
            sx={{ 
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: red,
              mr: 1
            }} 
          />
          <Box 
            sx={{ 
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: yellow,
              mr: 1
            }} 
          />
          <Box 
            sx={{ 
              width: 12,
              height: 12,
              borderRadius: '50%',
              backgroundColor: green
            }} 
          />
        </Box>
        <Typography 
          component="h1" 
          variant="subtitle1" 
          sx={{ 
            fontWeight: 600,
            color: '#f8f8f2',
            fontFamily: '"SF Mono", monospace',
            fontSize: '0.85rem',
            userSelect: 'none',
            textAlign: 'center',
            width: '100%'
          }}
        >
          PM2 GUI
        </Typography>
      </Box>

      {/* Navigation */}
      <List 
        component="nav" 
        sx={{ 
          width: '100%', 
          p: 1,
          flexGrow: 1
        }}
      >
        {sidebarItems.map((item) => (
          <ListItemButton
            key={item.path}
            component={RouterLink}
            to={item.path}
            selected={isActive(item.path, item.exact)}
            sx={{
              mb: 0.5,
              py: 1.25,
              px: 1.5,
              borderRadius: 1,
              backgroundColor: isActive(item.path, item.exact) ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
              '&.Mui-selected': {
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.15)',
                },
              },
              '&:hover': {
                backgroundColor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            <ListItemIcon 
              sx={{ 
                minWidth: 36,
                color: isActive(item.path, item.exact) 
                  ? '#f8f8f2' 
                  : 'rgba(248, 248, 242, 0.6)',
                fontSize: '1.25rem'
              }}
            >
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.label} 
              primaryTypographyProps={{ 
                sx: { 
                  fontSize: '0.9rem',
                  fontWeight: isActive(item.path, item.exact) ? 600 : 400,
                  color: isActive(item.path, item.exact) 
                    ? '#f8f8f2' 
                    : 'rgba(248, 248, 242, 0.6)',
                  fontFamily: '"SF Mono", monospace'
                } 
              }}
            />
          </ListItemButton>
        ))}
      </List>

      {/* Footer with app version */}
      <Box 
        sx={{ 
          p: 2, 
          pt: 1, 
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)'
        }}
      >
        <Typography 
          variant="caption" 
          sx={{ 
            color: 'rgba(248, 248, 242, 0.5)',
            fontSize: '0.7rem',
            fontFamily: '"SF Mono", monospace'
          }}
        >
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

export default Sidebar; 