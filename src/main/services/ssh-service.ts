import { NodeSSH } from 'node-ssh';
import { ipcMain, app } from 'electron';
import * as fs from 'fs';
import * as path from 'path';
import { EventEmitter } from 'events';
import { getMainWindow } from '../main';
import * as ssh2 from 'ssh2';

interface SSHConnectionState {
  connected: boolean;
  host: string;
  username: string;
  connectionTime: Date | null;
  lastError?: {
    message: string;
    details?: string;
    timestamp: Date;
  };
  hasPm2: boolean;
}

interface SSHCommandResponse {
  success: boolean;
  stdout: string;
  stderr: string;
  message?: string;
}

interface SSHConnectionParams {
  host: string;
  port: number;
  username: string;
  privateKey?: string;
  password?: string;
}

class SSHService extends EventEmitter {
  private ssh: NodeSSH | null = null;
  private connectionState: SSHConnectionState = {
    connected: false,
    host: '',
    username: '',
    connectionTime: null,
    hasPm2: false
  };
  
  // Add cache for connection tests to reduce redundant SSH checks
  private lastConnectionTestTime: number = 0;
  private lastConnectionTestResult: boolean = false;
  // Increase the throttle time to 30 seconds - only test once every 30 seconds at most
  private connectionTestThrottleTime: number = 30000;
  
  private client: ssh2.Client | null = null;
  private clientConnected = false;
  private connectionParams: Partial<SSHConnectionParams> = {};
  private previousConnectionState: boolean | null = null; // Track previous connection state
  
  constructor() {
    super();
    // Register all handlers
    this.registerAllHandlers();
  }

  private registerAllHandlers() {
    // Connect handler
    ipcMain.handle('ssh:connect', this.handleConnect.bind(this));
    
    // Disconnect handler
    ipcMain.handle('ssh:disconnect', this.handleDisconnect.bind(this));
    
    // Test connection handler
    ipcMain.handle('ssh:test', this.handleTest.bind(this));
    
    // Status handler
    ipcMain.handle('ssh:status', this.handleStatus.bind(this));
    
    // Execute command handler
    ipcMain.handle('ssh:executeCommand', this.handleExecuteCommand.bind(this));
  }
  
  // Handler for execute command
  private async handleExecuteCommand(_: any, command: string) {
    try {
      console.log('SSH execute command requested:', command);
      
      // Check if we're connected
      if (!this.isConnected()) {
        return { 
          success: false, 
          message: 'SSH connection not established',
          connectionState: this.getConnectionState()
        };
      }
      
      // Executing a command already tests the connection implicitly
      this.updateLastConnectionTest(true);
      
      // Execute the command
      const result = await this.executeCommand(command);
      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr,
        connectionState: this.getConnectionState()
      };
    } catch (error: any) {
      console.error('Error executing SSH command:', error);
      
      // If command execution fails, the connection might be broken
      this.updateLastConnectionTest(false);
      
      return {
        success: false,
        message: error.message,
        connectionState: this.getConnectionState()
      };
    }
  }
  
  // Helper to update connection test cache
  private updateLastConnectionTest(isConnected: boolean) {
    this.lastConnectionTestTime = Date.now();
    this.lastConnectionTestResult = isConnected;
    
    // Only update the connection state if it's different
    if (this.connectionState.connected !== isConnected) {
      this.connectionState.connected = isConnected;
      if (!isConnected) {
        this.ssh = null;
      }
    }
    
    // Notify of connection state change
    this.notifyConnectionStateChange(isConnected);
    
    return isConnected;
  }
  
  // Handler for status
  private async handleStatus() {
    try {
      // If we have a recent connection test result, use that
      const now = Date.now();
      if (now - this.lastConnectionTestTime < this.connectionTestThrottleTime) {
        console.log(`Using cached SSH connection status: ${this.lastConnectionTestResult ? 'Connected' : 'Disconnected'} (${Math.round((now - this.lastConnectionTestTime) / 1000)}s ago)`);
        return {
          success: true,
          connectionState: {
            connected: this.clientConnected,
            params: this.connectionParams,
          },
        };
      }

      // Otherwise do an actual connection test
      if (this.client && this.clientConnected) {
        try {
          // Use the verifyConnectionActive method for the actual test
          return {
            success: await this.verifyConnectionActive(),
            connectionState: {
              connected: this.clientConnected,
              params: this.connectionParams,
            },
          };
        } catch (err) {
          console.error('Error checking SSH connection status:', err);
          this.updateLastConnectionTest(false);
          return {
            success: false,
            error: err instanceof Error ? err.message : 'Unknown error',
            connectionState: {
              connected: false,
              params: this.connectionParams,
            },
          };
        }
      }

      return {
        success: true,
        connectionState: {
          connected: false,
          params: this.connectionParams,
        },
      };
    } catch (error: any) {
      console.error('Error getting SSH status:', error);
      return {
        success: false,
        message: error.message,
        connectionState: this.connectionState
      };
    }
  }
  
  // Handler for connection
  private async handleConnect(_: any, sshConfig: any) {
    try {
      console.log('SSH connect requested:', sshConfig.name || 'Unnamed connection');
      
      // Close any existing connections first
      if (this.ssh || this.client) {
        console.log('Closing existing SSH connection before connecting...');
        await this.disconnect();
      }
      
      // Set connection params
      this.connectionParams = {
        host: sshConfig.host,
        port: sshConfig.port || 22,
        username: sshConfig.username
      };
      
      // Prepare basic client config
      const config: ssh2.ConnectConfig = {
        host: sshConfig.host,
        port: parseInt(sshConfig.port) || 22,
        username: sshConfig.username,
        keepaliveInterval: 10000, // Send keepalive every 10 seconds
        readyTimeout: 30000 // 30 second timeout
      };
      
      // Add authentication based on type
      if (sshConfig.authType === 'password') {
        if (!sshConfig.password) {
          throw new Error('Password is required for password authentication');
        }
        config.password = sshConfig.password;
      } else if (sshConfig.authType === 'privateKey') {
        let privateKey = '';
        
        // If privateKeyId is provided, load from saved keys
        if (sshConfig.privateKeyId) {
          console.log('Using saved private key with ID:', sshConfig.privateKeyId);
          
          // Get settings from file directly instead of using window.api
          try {
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            if (fs.existsSync(settingsPath)) {
              const settingsData = fs.readFileSync(settingsPath, 'utf8');
              const settings = JSON.parse(settingsData);
              
              if (settings && settings.savedKeys) {
                const key = settings.savedKeys.find((k: any) => k.id === sshConfig.privateKeyId);
                if (key) {
                  privateKey = key.content;
                  console.log('Found private key:', key.name);
                } else {
                  throw new Error(`Private key with ID ${sshConfig.privateKeyId} not found`);
                }
              } else {
                throw new Error('No SSH keys found in settings');
              }
            } else {
              throw new Error('Settings file not found');
            }
          } catch (error: any) {
            throw new Error(`Failed to load SSH key: ${error.message}`);
          }
        } else if (sshConfig.privateKeyPath) {
          console.log('Loading private key from file:', sshConfig.privateKeyPath);
          try {
            privateKey = fs.readFileSync(sshConfig.privateKeyPath, 'utf8');
          } catch (error: any) {
            throw new Error(`Failed to read private key file: ${error.message}`);
          }
        } else {
          throw new Error('Either privateKeyId or privateKeyPath is required for key authentication');
        }
        
        config.privateKey = privateKey;
      } else {
        throw new Error(`Unsupported authentication type: ${sshConfig.authType}`);
      }
      
      // Create SSH client
      this.client = new ssh2.Client();
      
      // Connect
      await new Promise<void>((resolve, reject) => {
        this.client!.on('ready', () => {
          console.log('SSH2 client ready');
          resolve();
        });
        
        this.client!.on('error', (err) => {
          console.error('SSH2 client error:', err);
          this.clientConnected = false;
          reject(err);
        });
        
        this.client!.on('end', () => {
          console.log('SSH2 client connection ended');
          this.clientConnected = false;
        });
        
        this.client!.on('close', () => {
          console.log('SSH2 client connection closed');
          this.clientConnected = false;
        });
        
        // Connect to server
        try {
          this.client!.connect(config);
        } catch (error) {
          reject(error);
        }
      });
      
      // Create NodeSSH instance
      this.ssh = new NodeSSH();
      
      // Connect using NodeSSH
      await this.ssh.connect({
        host: sshConfig.host,
        port: parseInt(sshConfig.port) || 22,
        username: sshConfig.username,
        password: sshConfig.authType === 'password' ? sshConfig.password : undefined,
        privateKey: sshConfig.authType === 'privateKey' && config.privateKey ? config.privateKey.toString() : undefined,
        keepaliveInterval: 10000
      });
      
      // Update state
      this.connectionState = {
        connected: true,
        host: sshConfig.host,
        username: sshConfig.username,
        connectionTime: new Date(),
        hasPm2: false
      };
      
      this.clientConnected = true;
      this.updateLastConnectionTest(true);
      
      // Notify renderer process
      this.notifyConnectionStateChange(true);
      
      return {
        success: true,
        connectionState: this.connectionState
      };
    } catch (error: any) {
      console.error('SSH connection error:', error);
      
      // Update state to reflect error
      this.connectionState = {
        ...this.connectionState,
        connected: false,
        lastError: {
          message: error.message,
          details: error.stack,
          timestamp: new Date()
        }
      };
      
      this.clientConnected = false;
      this.updateLastConnectionTest(false);
      
      // Notify renderer process
      this.notifyConnectionStateChange(false);
      
      return {
        success: false,
        error: error.message,
        details: error.stack,
        connectionState: this.connectionState
      };
    }
  }

  // Method to execute a command on the SSH connection
  async executeCommand(command: string): Promise<SSHCommandResponse> {
    if (!this.ssh || !this.connectionState.connected) {
      console.warn('Attempted to execute command when not connected');
      return {
        success: false,
        message: 'SSH connection not established',
        stdout: '',
        stderr: ''
      };
    }

    try {
      // Wrap in timeout to avoid hanging commands
      const result = await Promise.race([
        this.ssh.execCommand(command),
        new Promise<any>((_, reject) => {
          setTimeout(() => reject(new Error('Command execution timeout')), 30000);
        })
      ]);

      return {
        success: true,
        stdout: result.stdout,
        stderr: result.stderr
      };
    } catch (error: any) {
      console.error(`SSH command execution failed: ${command}`, error);
      
      // Check if this is a channel error, which often indicates the connection is dead
      const isChannelError = error.message?.includes('Channel') || error.message?.includes('channel');
      
      if (isChannelError) {
        // The connection is likely broken, so update state
        console.warn('SSH channel error detected, connection appears to be broken');
        this.connectionState.connected = false;
        
        // Attempt to clean up the client
        try {
          if (this.ssh) {
            await this.ssh.dispose();
          }
        } catch (closeError) {
          console.error('Error closing broken SSH connection:', closeError);
        }
        
        this.ssh = null;
        
        // Emit connection change event
        this.emit('connection-change', { 
          connected: false, 
          error: 'SSH connection lost due to channel error'
        });
      }
      
      return {
        success: false,
        message: error.message || 'Unknown SSH command error',
        stdout: '',
        stderr: error.message || ''
      };
    }
  }

  // Check if connected
  isConnected(): boolean {
    return this.ssh !== null && this.clientConnected === true;
  }
  
  // Get connection state
  getConnectionState(): SSHConnectionState {
    return this.connectionState;
  }

  // Handler for disconnect
  private async handleDisconnect() {
    // Implementation
    try {
      console.log('SSH disconnect requested');
      if (this.ssh) {
        this.ssh.dispose();
        this.ssh = null;
      }
      
      // Update connection state
      this.connectionState = {
        connected: false,
        host: '',
        username: '',
        connectionTime: null,
        hasPm2: false
      };
      
      console.log('SSH connection closed');
      return { 
        success: true, 
        message: 'Disconnected successfully',
        connectionState: this.connectionState
      };
    } catch (error: any) {
      console.error('SSH disconnect error:', error);
      
      // Update connection state with error
      this.connectionState.lastError = {
        message: `Disconnect error: ${error.message}`,
        details: error.stack,
        timestamp: new Date()
      };
      
      return { 
        success: false, 
        message: `Disconnect error: ${error.message}`,
        connectionState: this.connectionState
      };
    }
  }
  
  // Handler for test
  private async handleTest(_: any, sshConfig: any) {
    try {
      console.log('SSH test connection requested for host:', sshConfig.host);
      
      // Create a new SSH instance for testing
      const ssh = new NodeSSH();
      
      // Connect using same logic as handleConnect
      const connectConfig: any = {
        host: sshConfig.host,
        username: sshConfig.username,
        port: sshConfig.port || 22,
        readyTimeout: 10000
      };
      
      // Determine auth type and add credentials
      if (sshConfig.authType === 'password') {
        if (!sshConfig.password) {
          throw new Error('Password is required for password authentication');
        }
        connectConfig.password = sshConfig.password;
      } else if (sshConfig.authType === 'privateKey') {
        // If we have a privateKeyId, load it from saved keys
        if (sshConfig.privateKeyId) {
          console.log('Loading key with ID:', sshConfig.privateKeyId);
          
          // Get settings from file directly instead of using window.api
          try {
            const settingsPath = path.join(app.getPath('userData'), 'settings.json');
            if (fs.existsSync(settingsPath)) {
              const settingsData = fs.readFileSync(settingsPath, 'utf8');
              const settings = JSON.parse(settingsData);
              
              if (settings && settings.savedKeys) {
                const key = settings.savedKeys.find((k: any) => k.id === sshConfig.privateKeyId);
                if (key) {
                  connectConfig.privateKey = key.content;
                  console.log('Found private key for test:', key.name);
                } else {
                  throw new Error(`Private key with ID ${sshConfig.privateKeyId} not found`);
                }
              } else {
                throw new Error('No SSH keys found in settings');
              }
            } else {
              throw new Error('Settings file not found');
            }
          } catch (error: any) {
            throw new Error(`Failed to load SSH key: ${error.message}`);
          }
        } else if (sshConfig.privateKey) {
          connectConfig.privateKey = sshConfig.privateKey;
        } else {
          throw new Error('Either privateKeyId or privateKey is required for key authentication');
        }
      } else {
        throw new Error(`Unsupported authentication type: ${sshConfig.authType}`);
      }
      
      // Try to connect
      await ssh.connect(connectConfig);
      
      // Execute a simple command to test connection
      const result = await ssh.execCommand('echo "Connection successful" && command -v pm2 || echo "PM2 not found"');
      
      // Check if PM2 is installed
      const hasPm2 = !result.stdout.includes("PM2 not found");
      
      // Clean up the test connection
      ssh.dispose();
      
      return {
        success: true,
        message: 'Test connection successful',
        hasPm2: hasPm2,
        output: result.stdout
      };
    } catch (error: any) {
      console.error('SSH test connection failed:', error);
      
      return {
        success: false,
        message: error.message,
        error: error.stack
      };
    }
  }

  // Create a new method that can be explicitly called when we REALLY need to test the connection
  public async verifyConnectionActive(): Promise<boolean> {
    try {
      if (!this.ssh || !this.client) {
        console.log('No active SSH connection object found');
        this.updateLastConnectionTest(false);
        this.clientConnected = false;
        return false;
      }
      
      // Execute a simple command to test connection
      const result = await this.executeCommand('echo "connection_test"');
      const isConnected = result.stdout.includes('connection_test');
      
      // Update connection state
      this.updateLastConnectionTest(isConnected);
      this.clientConnected = isConnected;
      
      if (!isConnected) {
        console.log('SSH connection test failed');
        // Force disconnect to clean up
        await this.disconnect();
      } else {
        console.log('SSH connection is active');
      }
      
      return isConnected;
    } catch (error) {
      console.error('Error verifying SSH connection:', error);
      this.updateLastConnectionTest(false);
      this.clientConnected = false;
      
      // Force disconnect on error
      try {
        await this.disconnect();
      } catch (disconnectError) {
        console.error('Error while disconnecting after verification failure:', disconnectError);
      }
      
      return false;
    }
  }

  // Add method to notify renderer of connection state changes
  private notifyConnectionStateChange(connected: boolean) {
    if (this.previousConnectionState === connected) {
      return; // No change, don't notify
    }
    
    console.log(`SSH connection state changed: ${connected ? 'Connected' : 'Disconnected'}`);
    this.previousConnectionState = connected;
    
    // Send event to all windows
    const mainWindow = getMainWindow();
    if (mainWindow) {
      mainWindow.webContents.send('ssh-connection-change', { connected });
    }
  }

  // Private method to disconnect
  private async disconnect(): Promise<void> {
    try {
      if (this.ssh) {
        await this.ssh.dispose();
        this.ssh = null;
      }
      
      if (this.client) {
        this.client.end();
        this.client = null;
      }
      
      this.clientConnected = false;
      this.connectionState.connected = false;
      this.notifyConnectionStateChange(false);
      console.log('SSH connection has been closed');
    } catch (error) {
      console.error('Error during SSH disconnect:', error);
      throw error;
    }
  }
}

export default new SSHService(); 