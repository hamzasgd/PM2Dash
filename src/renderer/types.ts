// Define interface for the window.api object
export interface WindowApi {
  // SSH functions
  getSSHStatus: () => Promise<{
    success: boolean;
    connectionState: any;
    message?: string;
  }>;
  executeSSHCommand: (command: string) => Promise<{
    success: boolean;
    stdout?: string;
    stderr?: string;
    error?: any;
  }>;
  connectSSH: (config: SSHConfig) => Promise<{
    success: boolean;
    message?: string;
    fingerprint?: HostFingerprint;
  }>;
  disconnectSSH: () => Promise<{
    success: boolean;
    message?: string;
  }>;
  testSSHConnection: (sshConfig: any) => Promise<{
    success: boolean;
    message?: string;
    error?: any;
    hasPm2?: boolean;
    fingerprint?: HostFingerprint;
    connectionState?: {
      lastError?: {
        details: string;
      };
    };
  }>;
  
  // PTY Terminal functions
  requestSSHPty: (options: { term: string; cols: number; rows: number }) => Promise<{ success: boolean; channel: any; message?: string }>;
  writeSSHPty: (data: { data: string }) => Promise<{ success: boolean; message?: string }>;
  closeSSHPty: () => Promise<{ success: boolean; message?: string }>;
  resizeSSHPty: (dimensions: { cols: number; rows: number }) => Promise<{ success: boolean; message?: string }>;
  
  // PM2 functions
  listProcesses: () => Promise<{
    success: boolean;
    processes: any[];
    error?: any;
    message?: string;
  }>;
  getProcessLogs: (name: string) => Promise<{
    success: boolean;
    logs?: any;
    error?: string;
    message?: string;
  }>;
  startProcess: (name: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  stopProcess: (name: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  restartProcess: (name: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  reloadProcess: (name: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  deleteProcess: (name: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  
  // SSH Key Management
  saveSSHKey: (key: any) => Promise<{
    success: boolean;
    message?: string;
    error?: string;
  }>;
  getSSHKeys: () => Promise<{
    success: boolean;
    keys?: any[];
    error?: string;
  }>;
  deleteSSHKey: (keyId: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  
  // Fingerprint Management
  saveHostFingerprint: (fingerprint: HostFingerprint) => Promise<{
    success: boolean;
    message?: string;
  }>;
  getHostFingerprints: () => Promise<{
    success: boolean;
    fingerprints: HostFingerprint[];
    error?: string;
  }>;
  deleteHostFingerprint: (host: string) => Promise<{
    success: boolean;
    message?: string;
  }>;
  
  // Fingerprint event listeners
  onFingerprintVerification: (callback: (event: any, data: any) => void) => void;
  offFingerprintVerification: (callback: (event: any, data: any) => void) => void;
  
  // Settings functions
  saveSettings: (settings: any) => Promise<{
    success: boolean;
    message?: string;
  }>;
  getSettings: () => Promise<{
    success: boolean;
    settings: {
      savedConnections: SavedConnection[];
      savedKeys?: SSHKey[];
      savedFingerprints?: HostFingerprint[];
      theme?: string;
      refreshInterval?: number;
      autoConnect?: boolean;
      defaultConnection?: string | null;
    };
    error?: string;
  }>;
  
  // System functions
  getSystemStats: () => Promise<{
    success: boolean;
    stats?: any;
    error?: string;
  }>;
  getNetworkInfo: () => Promise<{
    success: boolean;
    info?: any;
    error?: string;
  }>;
}

// SSH Configuration interface
export interface SSHConfig {
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyId?: string;
  authType: string;
  allowNewFingerprint?: boolean;
}

// SSH Key interface
export interface SSHKey {
  id: string;
  name: string;
  content: string;  // Updated from privateKey to content
  publicKey?: string;
  passphrase?: string;
  createdAt: Date;
}

// Host Fingerprint interface
export interface HostFingerprint {
  host: string;
  port: number;
  hash: string;
  hashAlgorithm: string;
  keyType: string;
  verified: boolean;
  addedAt: Date;
  lastSeen?: Date;
}

// Saved Connection interface
export interface SavedConnection {
  id: string;
  name: string;
  host: string;
  port: number;
  username: string;
  password?: string;
  privateKeyId?: string;
  authType: string;
  allowNewFingerprint?: boolean;
}

// Settings interface to match the one used in Settings.tsx
export interface Settings {
  theme: 'light' | 'dark' | 'system';
  refreshInterval: number;
  defaultConnection: string | null;
  savedConnections?: SavedConnection[];
  savedKeys?: SSHKey[];
  savedFingerprints?: HostFingerprint[];
  autoConnect?: boolean;
}

declare global {
  interface Window {
    api: WindowApi;
  }
}

export {}; 