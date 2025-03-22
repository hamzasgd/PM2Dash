import { ipcMain } from 'electron';
import sshService from './ssh-service';

class PM2Service {
  // Add caching for process list
  private cachedProcesses: any[] = [];
  private lastProcessListTime: number = 0;
  private processListCacheTime: number = 10000; // 10 seconds
  private lastPm2CheckTime: number = 0;
  private hasPm2: boolean = false;
  private pm2CheckCacheTime: number = 60000; // 1 minute
  
  constructor() {
    this.registerIpcHandlers();
  }

  private registerIpcHandlers() {
    // List all PM2 processes
    ipcMain.handle('pm2:list', async () => {
      try {
        // Check SSH connection
        if (!sshService.isConnected()) {
          const connectionState = sshService.getConnectionState();
          return { 
            success: false, 
            message: 'SSH connection not established',
            connectionState,
            processes: [] // Return empty processes array for consistency
          };
        }
        
        // Check if we can use the cached process list
        const now = Date.now();
        if (this.cachedProcesses.length > 0 && (now - this.lastProcessListTime < this.processListCacheTime)) {
          console.log(`Using cached process list (age: ${now - this.lastProcessListTime}ms, count: ${this.cachedProcesses.length})`);
          return {
            success: true,
            processes: this.cachedProcesses
          };
        }
        
        // Check if PM2 is installed - use cached result if available
        if (now - this.lastPm2CheckTime < this.pm2CheckCacheTime) {
          if (!this.hasPm2) {
            console.log('Using cached PM2 check result: PM2 not installed');
            return { 
              success: false, 
              message: 'PM2 is not installed on the remote server',
              processes: [] // Return empty processes array
            };
          }
          console.log('Using cached PM2 check result: PM2 is installed');
        } else {
          // First check if PM2 is installed
          console.log('Checking if PM2 is installed on remote server');
          const checkPm2 = await sshService.executeCommand('command -v pm2 || echo "not installed"');
          this.lastPm2CheckTime = now;
          
          if (checkPm2.stdout.includes('not installed')) {
            console.log('PM2 is not installed on the remote server');
            this.hasPm2 = false;
            return { 
              success: false, 
              message: 'PM2 is not installed on the remote server',
              processes: [] // Return empty processes array
            };
          }
          this.hasPm2 = true;
          console.log('PM2 is installed, attempting to list processes');
        }
        
        // Try the most reliable command first
        let result = await sshService.executeCommand('pm2 jlist --silent');
        
        // If that fails, try alternatives
        if (result.stderr || result.stdout.includes('Error:') || result.stdout.includes('>>>> In-memory')) {
          console.log('PM2 jlist command failed or returned errors, trying alternative command');
          // Try format json
          const altResult = await sshService.executeCommand('pm2 list --format json');
          if (!altResult.stderr && !altResult.stdout.includes('Error:')) {
            const parseResult = this.parseProcessList(altResult.stdout);
            if (parseResult.success) {
              this.cachedProcesses = parseResult.processes;
              this.lastProcessListTime = now;
            }
            return parseResult;
          }
          
          // Last resort: try pm2 info for a more detailed dump
          const infoResult = await sshService.executeCommand('pm2 info');
          if (!infoResult.stderr) {
            // Extract process info from the formatted output
            // This is less reliable but might work when JSON fails
            return this.parseInfoOutput(infoResult.stdout);
          }
          
          // If all fail with stderr, return the error
          if (result.stderr) {
            return { 
              success: false, 
              message: result.stderr,
              processes: [] // Return empty processes array
            };
          }
        }
        
        const parseResult = this.parseProcessList(result.stdout);
        if (parseResult.success) {
          this.cachedProcesses = parseResult.processes;
          this.lastProcessListTime = now;
        }
        return parseResult;
      } catch (error: any) {
        console.error('Error listing PM2 processes:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}`,
          connectionState: sshService.getConnectionState(),
          processes: [] // Return empty processes array
        };
      }
    });

    // Start a PM2 process
    ipcMain.handle('pm2:start', async (_, name) => {
      try {
        if (!sshService.isConnected()) {
          return { 
            success: false, 
            message: 'SSH connection not established',
            connectionState: sshService.getConnectionState()
          };
        }
        
        const result = await sshService.executeCommand(`pm2 start ${name}`);
        return { 
          success: !result.stderr, 
          message: result.stderr || 'Process started successfully',
          output: result.stdout,
          connectionState: sshService.getConnectionState()
        };
      } catch (error: any) {
        console.error('Error starting PM2 process:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}`,
          connectionState: sshService.getConnectionState()
        };
      }
    });

    // Stop a PM2 process
    ipcMain.handle('pm2:stop', async (_, name) => {
      try {
        if (!sshService.isConnected()) {
          return { 
            success: false, 
            message: 'SSH connection not established',
            connectionState: sshService.getConnectionState()
          };
        }
        
        const result = await sshService.executeCommand(`pm2 stop ${name}`);
        return { 
          success: !result.stderr, 
          message: result.stderr || 'Process stopped successfully',
          output: result.stdout,
          connectionState: sshService.getConnectionState()
        };
      } catch (error: any) {
        console.error('Error stopping PM2 process:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}`,
          connectionState: sshService.getConnectionState()
        };
      }
    });

    // Restart a PM2 process
    ipcMain.handle('pm2:restart', async (_, name) => {
      try {
        if (!sshService.isConnected()) {
          return { 
            success: false, 
            message: 'SSH connection not established',
            connectionState: sshService.getConnectionState()
          };
        }
        
        const result = await sshService.executeCommand(`pm2 restart ${name}`);
        return { 
          success: !result.stderr, 
          message: result.stderr || 'Process restarted successfully',
          output: result.stdout,
          connectionState: sshService.getConnectionState()
        };
      } catch (error: any) {
        console.error('Error restarting PM2 process:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}`,
          connectionState: sshService.getConnectionState()
        };
      }
    });

    // Delete a PM2 process
    ipcMain.handle('pm2:delete', async (_, name) => {
      try {
        if (!sshService.isConnected()) {
          return { 
            success: false, 
            message: 'SSH connection not established',
            connectionState: sshService.getConnectionState()
          };
        }
        
        const result = await sshService.executeCommand(`pm2 delete ${name}`);
        return { 
          success: !result.stderr, 
          message: result.stderr || 'Process deleted successfully',
          output: result.stdout,
          connectionState: sshService.getConnectionState()
        };
      } catch (error: any) {
        console.error('Error deleting PM2 process:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}`,
          connectionState: sshService.getConnectionState()
        };
      }
    });

    // Get logs for a PM2 process
    ipcMain.handle('pm2:logs', async (_, name) => {
      try {
        if (!sshService.isConnected()) {
          return { 
            success: false, 
            message: 'SSH connection not established',
            connectionState: sshService.getConnectionState()
          };
        }
        
        // Get the most recent logs (last 200 lines)
        const result = await sshService.executeCommand(`pm2 logs ${name} --lines 200 --nostream`);
        return { 
          success: true,
          logs: result.stdout,
          error: result.stderr,
          connectionState: sshService.getConnectionState()
        };
      } catch (error: any) {
        console.error('Error getting PM2 logs:', error);
        return { 
          success: false, 
          message: `Error: ${error.message}`,
          connectionState: sshService.getConnectionState()
        };
      }
    });
  }

  // Helper method to parse PM2 process list with error handling
  private parseProcessList(stdout: string) {
    try {
      // Ensure we have output to parse
      if (!stdout || stdout.trim() === '') {
        console.log('Empty PM2 process list output');
        return { 
          success: true, 
          message: 'No PM2 processes running',
          processes: [] 
        };
      }
      
      // Remove any non-JSON prefixes/suffixes sometimes added by PM2
      let cleanJson = stdout.trim();
      
      // Remove any lines that don't look like JSON
      if (cleanJson.includes('\n')) {
        const lines = cleanJson.split('\n');
        cleanJson = lines.filter(line => 
          (line.startsWith('[') || line.startsWith('{')) && 
          (line.endsWith(']') || line.endsWith('}'))
        ).join('\n');
      }
      
      // Handle the case where PM2 might output multiple JSON objects
      if (!cleanJson.startsWith('[') && !cleanJson.startsWith('{')) {
        console.warn('PM2 output is not a valid JSON array or object:', cleanJson);
        return { 
          success: false, 
          message: 'Invalid PM2 process list format',
          processes: [] 
        };
      }
      
      let processes;
      try {
        // Parse the JSON
        processes = JSON.parse(cleanJson);
        
        // If it's not an array, check if it might be an object with a 'processes' property
        if (!Array.isArray(processes)) {
          console.log('PM2 output is not an array, checking for processes property');
          
          if (processes && processes.processes && Array.isArray(processes.processes)) {
            processes = processes.processes;
          } else {
            // Convert to array if it's a single object
            processes = [processes];
          }
        }
      } catch (parseError) {
        console.error('Error parsing PM2 process list JSON:', parseError);
        console.error('Raw stdout was:', stdout);
        return { 
          success: false, 
          message: 'Failed to parse PM2 process list',
          processes: [] 
        };
      }
      
      // Map the processes to a consistent format
      const mappedProcesses = processes.map((proc: any) => {
        // Extract the key fields we need
        return {
          name: proc.name || 'unknown',
          pm_id: proc.pm_id || 0,
          status: proc.pm2_env?.status || proc.status || 'unknown',
          memory: this.parseMemory(proc.monit?.memory || proc.memory || '0'),
          cpu: parseFloat((proc.monit?.cpu || proc.cpu || 0).toString()),
          uptime: this.parseUptime(proc.pm2_env?.uptime || proc.uptime || '0'),
          restarts: parseInt((proc.pm2_env?.restart || proc.restart || 0).toString(), 10),
          pm2_env: proc.pm2_env || {}
        };
      });
      
      return {
        success: true,
        message: 'Processes retrieved successfully',
        processes: mappedProcesses
      };
    } catch (error: any) {
      console.error('Error processing PM2 list output:', error);
      return { 
        success: false, 
        message: `Error processing PM2 list: ${error.message}`,
        processes: [] 
      };
    }
  }

  // Parse pm2 info output as a fallback when JSON parsing fails
  private parseInfoOutput(stdout: string) {
    try {
      // Create a simple processes array from the formatted output
      const processes: any[] = [];
      const processBlocks = stdout.split('│ App name │');
      
      // Skip the first block which is just headers
      if (processBlocks.length > 1) {
        for (let i = 1; i < processBlocks.length; i++) {
          const block = processBlocks[i];
          
          // Try to extract the process name (usually the first line of each block)
          const nameMatch = block.match(/\s+([^│]+)│/);
          if (nameMatch && nameMatch[1]) {
            const name = nameMatch[1].trim();
            
            // Extract other fields
            const statusMatch = block.match(/status\s+│\s+([^│]+)│/i);
            const uptimeMatch = block.match(/uptime\s+│\s+([^│]+)│/i);
            const restartMatch = block.match(/restarts\s+│\s+([^│]+)│/i);
            const cpuMatch = block.match(/cpu\s+│\s+([^%│]+)%/i);
            const memoryMatch = block.match(/memory\s+│\s+([^│]+)│/i);
            
            processes.push({
              name,
              pm_id: i - 1, // Just assign a sequential ID
              status: statusMatch ? statusMatch[1].trim() : 'unknown',
              uptime: uptimeMatch ? this.parseUptime(uptimeMatch[1].trim()) : 0,
              restarts: restartMatch ? parseInt(restartMatch[1].trim(), 10) || 0 : 0,
              cpu: cpuMatch ? parseFloat(cpuMatch[1].trim()) || 0 : 0,
              memory: memoryMatch ? this.parseMemory(memoryMatch[1].trim()) : 0,
              pid: 0, // Unknown from this output
              id: i - 1 // Just assign a sequential ID
            });
          }
        }
      }
      
      console.log(`Parsed ${processes.length} processes from pm2 info output`);
      
      return {
        success: true,
        processes,
        connectionState: sshService.getConnectionState(),
        note: 'Used fallback parsing method - some process data may be limited'
      };
    } catch (error: any) {
      console.error('Failed to parse PM2 info output:', error);
      return {
        success: false,
        message: `Failed to parse PM2 process info: ${error.message}`,
        connectionState: sshService.getConnectionState()
      };
    }
  }
  
  // Helper to parse uptime string like "2d 3h" to seconds
  private parseUptime(uptimeStr: string): number {
    let seconds = 0;
    
    const daysMatch = uptimeStr.match(/(\d+)d/);
    if (daysMatch) {
      seconds += parseInt(daysMatch[1], 10) * 86400;
    }
    
    const hoursMatch = uptimeStr.match(/(\d+)h/);
    if (hoursMatch) {
      seconds += parseInt(hoursMatch[1], 10) * 3600;
    }
    
    const minutesMatch = uptimeStr.match(/(\d+)m/);
    if (minutesMatch) {
      seconds += parseInt(minutesMatch[1], 10) * 60;
    }
    
    const secondsMatch = uptimeStr.match(/(\d+)s/);
    if (secondsMatch) {
      seconds += parseInt(secondsMatch[1], 10);
    }
    
    return seconds;
  }
  
  // Helper to parse memory string like "15.5 MB" to bytes
  private parseMemory(memoryStr: string | number | undefined): number {
    // Handle non-string inputs
    if (typeof memoryStr !== 'string') {
      // If it's a number, return it directly
      if (typeof memoryStr === 'number') {
        return memoryStr;
      }
      // If it's undefined or any other type, return 0
      return 0;
    }
    
    const value = parseFloat(memoryStr.replace(/[^0-9.]/g, '')) || 0;
    
    if (memoryStr.includes('GB')) {
      return value * 1024 * 1024 * 1024;
    } else if (memoryStr.includes('MB')) {
      return value * 1024 * 1024;
    } else if (memoryStr.includes('KB')) {
      return value * 1024;
    }
    
    return value;
  }
}

export default new PM2Service(); 