import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

// Define development flag directly instead of using electron-is-dev
const isDev = !app.isPackaged;

// Log startup information
console.log('App starting...');
console.log('App path:', app.getAppPath());
console.log('User data path:', app.getPath('userData'));
console.log('Is development:', isDev);
console.log('Is packaged:', app.isPackaged);

// Interface for system errors with code property
interface SystemError extends Error {
  code?: string;
}

// Handle credentials errors - fix for AppImage permissions issues
process.on('uncaughtException', (error: SystemError) => {
  console.error('UNCAUGHT EXCEPTION:', error);
  try {
    if (mainWindow) {
      dialog.showErrorBox('Application Error', 
        `An error occurred: ${error.message}\n\nPlease restart the application.`);
    }
  } catch (dialogError) {
    console.error('Failed to show error dialog:', dialogError);
  }
  
  // Don't quit - let the app try to continue
});

// Also log unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Declare global mainWindow variable for IPC
declare global {
  namespace NodeJS {
    interface Global {
      mainWindow: BrowserWindow | null;
    }
  }
}

// Import services
import './services/ssh-service';
import './services/pm2-service';
import './services/settings-service';
import sshService from './services/ssh-service';

// Initialize settings storage
let appSettings = {
  theme: 'light',
  refreshInterval: 5,
  autoConnect: false,
  savedConnections: [] as any[],
  savedKeys: [] as any[]
};

// Track the current SSH connection state
let sshConnectionState = {
  connected: false,
  host: '',
  username: '',
  connectionTime: null as Date | null
};

// Try to load settings from a saved file
const loadSettings = () => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    console.log('Attempting to load settings from:', settingsPath);
    
    if (fs.existsSync(settingsPath)) {
      const data = fs.readFileSync(settingsPath, 'utf-8');
      console.log('Settings file read successfully, size:', data.length, 'bytes');
      
      try {
        const settings = JSON.parse(data);
        console.log('Settings parsed successfully');
        
        // Ensure we have a valid settings object
        if (settings && typeof settings === 'object') {
          // Make sure all required arrays are initialized
          if (!settings.savedConnections) settings.savedConnections = [];
          if (!settings.savedKeys) settings.savedKeys = [];
          
          appSettings = { ...appSettings, ...settings };
          console.log('Settings loaded successfully with:', 
                      settings.savedConnections.length, 'connections,',
                      settings.savedKeys ? settings.savedKeys.length : 0, 'SSH keys');
        } else {
          console.error('Loaded settings is not a valid object:', settings);
        }
      } catch (parseError) {
        console.error('Failed to parse settings JSON:', parseError);
        // If parsing fails, create a backup of the corrupt file
        const backupPath = `${settingsPath}.backup-${Date.now()}`;
        fs.copyFileSync(settingsPath, backupPath);
        console.log('Created backup of corrupt settings file at:', backupPath);
      }
    } else {
      console.log('Settings file does not exist, using defaults');
      
      // Ensure savedKeys is initialized
      if (!appSettings.savedKeys) {
        appSettings.savedKeys = [];
      }
    }
  } catch (error) {
    console.error('Failed to load settings:', error);
    
    // Ensure savedKeys is initialized even if loading fails
    if (!appSettings.savedKeys) {
      appSettings.savedKeys = [];
      console.log('Initialized savedKeys array after load error');
    }
  }
  
  // Final check to ensure all required arrays are initialized
  if (!Array.isArray(appSettings.savedConnections)) {
    appSettings.savedConnections = [];
    console.log('Initialized savedConnections array');
  }
  
  if (!Array.isArray(appSettings.savedKeys)) {
    appSettings.savedKeys = [];
    console.log('Initialized savedKeys array');
  }
};

// Save settings to disk
const saveSettings = () => {
  const settingsPath = path.join(app.getPath('userData'), 'settings.json');
  try {
    // Create a deep copy of the settings to avoid any reference issues
    const settingsToSave = JSON.parse(JSON.stringify(appSettings));
    
    // Make sure we're saving a proper object
    if (!settingsToSave || typeof settingsToSave !== 'object') {
      console.error('Invalid settings object to save:', settingsToSave);
      throw new Error('Invalid settings object');
    }
    
    console.log('Saving settings to:', settingsPath);
    console.log('Settings size:', JSON.stringify(settingsToSave).length, 'bytes');
    
    fs.writeFileSync(settingsPath, JSON.stringify(settingsToSave, null, 2), 'utf-8');
    console.log('Settings saved successfully to', settingsPath);
  } catch (error) {
    console.error('Failed to save settings:', error);
    
    // Try to diagnose the issue
    try {
      const dirPath = path.dirname(settingsPath);
      if (!fs.existsSync(dirPath)) {
        console.error('Settings directory does not exist:', dirPath);
        // Try to create the directory
        fs.mkdirSync(dirPath, { recursive: true });
        console.log('Created settings directory:', dirPath);
      }
      
      // Check if the file already exists and is writable
      if (fs.existsSync(settingsPath)) {
        try {
          fs.accessSync(settingsPath, fs.constants.W_OK);
          console.log('Settings file exists and is writable');
        } catch (accessError) {
          console.error('Settings file exists but is not writable:', accessError);
        }
      }
    } catch (diagError) {
      console.error('Error during diagnostics:', diagError);
    }
  }
};

// Create a global reference for BrowserWindow
// This avoids TypeScript errors with the global object
let mainWindow: BrowserWindow | null = null;

// Function to get the main window for other modules
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

function createWindow() {
  try {
    console.log('Creating window...');
    mainWindow = new BrowserWindow({
      width: 1200,
      height: 800,
      show: false, // Don't show until content is loaded
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, '../main/preload.js'),
        devTools: isDev // Only enable DevTools in development mode
      },
    });
    
    console.log('Window created');
    
    // Show window when ready to avoid blank flashes
    mainWindow.once('ready-to-show', () => {
      console.log('Window ready to show');
      if (mainWindow) {
        mainWindow.show();
      }
    });

    // Only open DevTools in development mode
    if (isDev) {
      mainWindow.webContents.openDevTools();
      console.log('DevTools opened in development mode');
    }

    // Set event listeners for debugging
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
      // Handle the error - show a message in the window
      if (mainWindow) {
        const errorHTML = `
          <html>
          <head>
            <title>Error Loading Application</title>
            <style>
              body { font-family: Arial; padding: 20px; color: #333; }
              h1 { color: #e74c3c; }
              .error-code { font-family: monospace; background: #f5f5f5; padding: 10px; }
            </style>
          </head>
          <body>
            <h1>Failed to Load Application</h1>
            <p>There was an error loading the application content.</p>
            <div class="error-code">
              Error Code: ${errorCode}<br>
              Description: ${errorDescription}
            </div>
            <p>Please try restarting the application.</p>
          </body>
          </html>
        `;
        mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHTML)}`);
      }
    });

    // For now, always use the built HTML file
    const htmlPath = path.join(__dirname, '../renderer/index.html');
    console.log('Loading HTML from:', htmlPath);
    
    // Check if HTML file exists
    if (fs.existsSync(htmlPath)) {
      console.log('HTML file exists at:', htmlPath);
      try {
        mainWindow.loadFile(htmlPath);
        console.log('Loading index.html file');
      } catch (loadError) {
        console.error('Error loading index.html:', loadError);
        throw loadError;
      }
    } else {
      console.error('HTML file not found at:', htmlPath);
      
      // Fallback to loading from source directory in case this is a development build without webpack
      const fallbackPath = path.join(__dirname, '../../src/renderer/index.html');
      console.log('Trying fallback path:', fallbackPath);
      
      if (fs.existsSync(fallbackPath)) {
        console.log('Found HTML at fallback path');
        mainWindow.loadFile(fallbackPath);
      } else {
        console.error('HTML file not found at fallback path either');
        
        // Create a simple HTML as last resort
        const tempHtml = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <title>PM2 GUI Manager</title>
            <style>
              body { font-family: Arial; margin: 0; padding: 20px; }
              h1 { color: #1976d2; }
              p { margin: 10px 0; }
              pre { background: #f5f5f5; padding: 10px; border-radius: 4px; }
            </style>
          </head>
          <body>
            <h1>PM2 GUI Manager</h1>
            <p>Could not load application HTML files.</p>
            <p>Current directory: ${__dirname}</p>
            <p>Attempted paths:</p>
            <pre>${htmlPath}\n${fallbackPath}</pre>
          </body>
          </html>
        `;
        
        // Write temp file and load it
        const tempPath = path.join(__dirname, 'temp.html');
        fs.writeFileSync(tempPath, tempHtml);
        mainWindow.loadFile(tempPath);
      }
    }

    mainWindow.on('closed', () => {
      mainWindow = null;
    });
  } catch (error) {
    console.error('Failed to create window:', error);
  }
}

// NOTE: All settings, SSH connection and PM2 handlers are now implemented 
// in the respective service files.

// Handle app ready
app.whenReady().then(() => {
  console.log('App is ready');
  try {
    // Load settings before creating window
    console.log('Loading settings...');
    loadSettings();
    
    console.log('Creating main window...');
    createWindow();
    
    // Check if window was created successfully
    if (!mainWindow) {
      console.error('Failed to create main window');
      throw new Error('Failed to create main window');
    }
    
  } catch (startupError: unknown) {
    console.error('Error during startup:', startupError);
    
    // Try to show an error dialog even if window creation failed
    try {
      const errorMessage = startupError instanceof Error 
        ? startupError.message 
        : String(startupError);
      
      dialog.showErrorBox('Startup Error', 
        `Failed to start the application: ${errorMessage}\n\nCheck the logs for more details.`);
    } catch (dialogError) {
      console.error('Failed to show error dialog:', dialogError);
    }
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      console.log('Reactivating app, creating window');
      createWindow();
    }
  });
});

// Handle app quit
app.on('window-all-closed', () => {
  console.log('All windows closed');
  if (process.platform !== 'darwin') {
    console.log('Quitting app');
    app.quit();
  }
}); 