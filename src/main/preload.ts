import { contextBridge, ipcRenderer } from 'electron';

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('api', {
  // SSH functions
  connectSSH: (sshConfig: any) => ipcRenderer.invoke('ssh:connect', sshConfig),
  disconnectSSH: () => ipcRenderer.invoke('ssh:disconnect'),
  testSSHConnection: (sshConfig: any) => ipcRenderer.invoke('ssh:test', sshConfig),
  getSSHStatus: () => ipcRenderer.invoke('ssh:status'),
  executeSSHCommand: (command: string) => ipcRenderer.invoke('ssh:executeCommand', command),
  
  // SSH Key Management
  saveSSHKey: (key: any) => ipcRenderer.invoke('ssh:saveKey', key),
  getSSHKeys: () => ipcRenderer.invoke('ssh:getKeys'),
  deleteSSHKey: (keyId: string) => ipcRenderer.invoke('ssh:deleteKey', keyId),
  
  // PM2 functions
  listProcesses: () => ipcRenderer.invoke('pm2:list'),
  startProcess: (name: string) => ipcRenderer.invoke('pm2:start', name),
  stopProcess: (name: string) => ipcRenderer.invoke('pm2:stop', name),
  restartProcess: (name: string) => ipcRenderer.invoke('pm2:restart', name),
  deleteProcess: (name: string) => ipcRenderer.invoke('pm2:delete', name),
  getProcessLogs: (name: string) => ipcRenderer.invoke('pm2:logs', name),
  
  // Settings functions
  saveSettings: (settings: any) => ipcRenderer.invoke('settings:save', settings),
  getSettings: () => ipcRenderer.invoke('settings:get'),
});

// Log when preload script is executed
console.log('Preload script executed'); 