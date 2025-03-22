import { app, BrowserWindow, ipcMain } from 'electron';
import * as path from 'path';
import * as isDev from 'electron-is-dev';
import * as fs from 'fs';

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
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../main/preload.js'),
      devTools: true
    },
  });

  // Always open DevTools
  mainWindow.webContents.openDevTools();

  // Set event listeners for debugging
  mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
    console.error('Failed to load:', errorCode, errorDescription);
  });

  // For now, always use the built HTML file
  const htmlPath = path.join(__dirname, '../renderer/index.html');
  console.log('Loading HTML from:', htmlPath);
  
  // Check if HTML file exists
  if (fs.existsSync(htmlPath)) {
    console.log('HTML file exists at:', htmlPath);
    mainWindow.loadFile(htmlPath);
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
}

// NOTE: All settings, SSH connection and PM2 handlers are now implemented 
// in the respective service files.

app.whenReady().then(() => {
  // Load settings before creating window
  loadSettings();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
}); 