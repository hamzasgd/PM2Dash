import { ipcMain, app } from 'electron';
import * as path from 'path';
import * as fs from 'fs';

interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  authType: 'password' | 'privateKey';
  // We don't store passwords in plain text
  // Only store paths to private keys or encrypted password hashes if implementing that
  privateKeyPath?: string;
  privateKeyId?: string;
}

interface SSHKey {
  id: string;
  name: string;
  content: string;
  createdAt: Date;
}

interface Settings {
  savedConnections: SavedConnection[];
  savedKeys: SSHKey[];
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number; // in seconds
  autoConnect: boolean;
}

class SettingsService {
  private settingsPath: string;
  private settings: Settings;

  constructor() {
    this.settingsPath = path.join(app.getPath('userData'), 'settings.json');
    this.settings = this.loadSettings();
    this.registerIpcHandlers();
  }

  private loadSettings(): Settings {
    try {
      if (fs.existsSync(this.settingsPath)) {
        const data = fs.readFileSync(this.settingsPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error: any) {
      console.error('Error loading settings:', error);
    }

    // Default settings
    return {
      savedConnections: [],
      savedKeys: [],
      theme: 'system',
      refreshInterval: 5,
      autoConnect: false
    };
  }

  private saveSettingsToFile() {
    try {
      fs.writeFileSync(this.settingsPath, JSON.stringify(this.settings, null, 2));
    } catch (error: any) {
      console.error('Error saving settings:', error);
    }
  }

  private registerIpcHandlers() {
    ipcMain.handle('settings:save', (_, newSettings) => {
      this.settings = { ...this.settings, ...newSettings };
      this.saveSettingsToFile();
      return { success: true };
    });

    ipcMain.handle('settings:get', () => {
      return this.settings;
    });

    // Add a new saved connection
    ipcMain.handle('settings:addConnection', (_, connection) => {
      // Generate a unique ID if not provided
      if (!connection.id) {
        connection.id = Date.now().toString();
      }
      
      // Check if connection with this ID already exists
      const existingIndex = this.settings.savedConnections.findIndex(
        conn => conn.id === connection.id
      );
      
      if (existingIndex >= 0) {
        // Update existing connection
        this.settings.savedConnections[existingIndex] = connection;
      } else {
        // Add new connection
        this.settings.savedConnections.push(connection);
      }
      
      this.saveSettingsToFile();
      return { success: true, id: connection.id };
    });

    // Delete a saved connection
    ipcMain.handle('settings:deleteConnection', (_, id) => {
      this.settings.savedConnections = this.settings.savedConnections.filter(
        conn => conn.id !== id
      );
      this.saveSettingsToFile();
      return { success: true };
    });

    // Get all saved connections
    ipcMain.handle('settings:getConnections', () => {
      return this.settings.savedConnections;
    });
    
    // SSH Key Management
    ipcMain.handle('ssh:saveKey', async (_, key) => {
      try {
        console.log('SSH key save requested', key.name);
        
        // Generate a unique ID if not provided
        if (!key.id) {
          key.id = Date.now().toString();
        }
        
        // Add createdAt timestamp if not present
        if (!key.createdAt) {
          key.createdAt = new Date();
        }
        
        // Check if key with same ID exists and update, or add new key
        const existingKeyIndex = this.settings.savedKeys.findIndex(k => k.id === key.id);
        if (existingKeyIndex >= 0) {
          console.log('Updating existing key with ID:', key.id);
          this.settings.savedKeys[existingKeyIndex] = key;
        } else {
          console.log('Adding new key with ID:', key.id);
          this.settings.savedKeys.push(key);
        }
        
        this.saveSettingsToFile();
        console.log('Settings saved successfully');
        
        return { success: true, keyId: key.id };
      } catch (error: any) {
        console.error('Error saving SSH key:', error);
        return { success: false, error: error.message };
      }
    });

    ipcMain.handle('ssh:getKeys', async () => {
      console.log('SSH keys requested');
      return { success: true, keys: this.settings.savedKeys || [] };
    });

    ipcMain.handle('ssh:deleteKey', async (_, keyId) => {
      console.log('SSH key delete requested', keyId);
      this.settings.savedKeys = this.settings.savedKeys.filter(key => key.id !== keyId);
      this.saveSettingsToFile();
      return { success: true };
    });
  }
}

export default new SettingsService(); 