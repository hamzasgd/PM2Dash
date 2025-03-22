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
  
  // Fingerprint Management
  saveHostFingerprint: (fingerprint: any) => ipcRenderer.invoke('ssh:saveHostFingerprint', fingerprint),
  getHostFingerprints: () => ipcRenderer.invoke('ssh:getHostFingerprints'),
  getHostFingerprint: (host: string, port: number) => ipcRenderer.invoke('ssh:getHostFingerprint', host, port),
  deleteHostFingerprint: (host: string, port: number) => ipcRenderer.invoke('ssh:deleteHostFingerprint', host, port),
  verifyFingerprint: (fingerprint: any) => ipcRenderer.invoke('ssh:verify-fingerprint', fingerprint),
  rejectFingerprint: (host: string, port: number) => ipcRenderer.invoke('ssh:reject-fingerprint', host, port),
  
  // Fingerprint verification events
  onFingerprintVerification: (callback: (event: any, data: any) => void) => {
    const listener = (_: any, data: any) => callback(_, data);
    ipcRenderer.on('ssh:fingerprint-verification', listener);
    return () => ipcRenderer.removeListener('ssh:fingerprint-verification', listener);
  },
  offFingerprintVerification: (callback: (event: any, data: any) => void) => {
    ipcRenderer.removeListener('ssh:fingerprint-verification', callback);
  },
  
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