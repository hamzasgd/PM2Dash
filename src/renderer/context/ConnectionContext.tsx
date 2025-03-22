import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';
import { HostFingerprint } from '../types';

interface ConnectionContextState {
  connected: boolean;
  lastChecked: number;
  checking: boolean;
  fingerprintVerificationNeeded: boolean;
  currentFingerprint: HostFingerprint | null;
  isFingerprintChanged: boolean;
  checkConnection: (force?: boolean) => Promise<boolean>;
  refreshConnection: () => Promise<boolean>;
  verifyFingerprint: (fingerprint: HostFingerprint) => Promise<boolean>;
  rejectFingerprint: (host: string, port: number) => Promise<boolean>;
  debouncedCheckConnection: (force?: boolean) => void;
}

const ConnectionContext = createContext<ConnectionContextState | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<number>(0);
  const [checking, setChecking] = useState<boolean>(false);
  const [fingerprintVerificationNeeded, setFingerprintVerificationNeeded] = useState<boolean>(false);
  const [currentFingerprint, setCurrentFingerprint] = useState<HostFingerprint | null>(null);
  const [isFingerprintChanged, setIsFingerprintChanged] = useState<boolean>(false);

  // Check connection status with the server
  const checkConnection = useCallback(async (force = false): Promise<boolean> => {
    try {
      // Prevent concurrent checks
      if (checking && !force) {
        console.log('[ConnectionContext] Already checking connection, skipping...');
        return connected;
      }

      const now = Date.now();
      // Increase minimum time between checks to 10 seconds (was 5)
      if (!force && now - lastChecked < 10000) {
        return connected;
      }
      
      setChecking(true);
      console.log('[ConnectionContext] Checking connection status...');
      
      try {
        setLastChecked(now);
        const result = await window.api.getSSHStatus();
        
        if (result && result.connectionState) {
          const isNowConnected = !!result.connectionState.connected;
          
          if (connected !== isNowConnected) {
            console.log(`[ConnectionContext] Connection status changed to: ${isNowConnected ? 'connected' : 'disconnected'}`);
            setConnected(isNowConnected);
          } else {
            console.log(`[ConnectionContext] Connection status unchanged: ${isNowConnected ? 'connected' : 'disconnected'}`);
          }
          
          return isNowConnected;
        } else {
          if (connected) {
            console.log('[ConnectionContext] Connection check failed, setting to disconnected');
            setConnected(false);
          }
          return false;
        }
      } finally {
        // Always reset checking state regardless of outcome
        setChecking(false);
      }
    } catch (error) {
      console.error('[ConnectionContext] Error checking connection:', error);
      setChecking(false);
      setConnected(false);
      return false;
    }
  }, [connected, checking, lastChecked]);

  // Create debounced version of checkConnection to prevent rapid calls
  const debouncedCheckConnection = useMemo(
    () => debounce((force = false) => checkConnection(force), 1000, { leading: true, trailing: false }),
    [checkConnection]
  );

  const refreshConnection = useCallback(async (): Promise<boolean> => {
    return checkConnection(true);
  }, [checkConnection]);

  // Handle fingerprint verification
  const verifyFingerprint = useCallback(async (fingerprint: HostFingerprint): Promise<boolean> => {
    try {
      console.log('[ConnectionContext] Verifying fingerprint:', fingerprint);
      const result = await window.api.saveHostFingerprint(fingerprint);
      
      if (result.success) {
        // Reset fingerprint verification state
        setFingerprintVerificationNeeded(false);
        setCurrentFingerprint(null);
        setIsFingerprintChanged(false);
        
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('[ConnectionContext] Error verifying fingerprint:', error);
      return false;
    }
  }, []);
  
  // Handle fingerprint rejection
  const rejectFingerprint = useCallback(async (host: string, port: number): Promise<boolean> => {
    try {
      console.log('[ConnectionContext] Rejecting fingerprint for:', host, port);
      
      // Reset fingerprint verification state
      setFingerprintVerificationNeeded(false);
      setCurrentFingerprint(null);
      setIsFingerprintChanged(false);
      
      return true;
    } catch (error) {
      console.error('[ConnectionContext] Error rejecting fingerprint:', error);
      return false;
    }
  }, []);

  // Listen for SSH events, including fingerprint verification requests
  useEffect(() => {
    // Initial connection check
    checkConnection();
    
    // Listen for fingerprint verification requests
    const handleFingerprintVerification = (_: any, data: any) => {
      console.log('[ConnectionContext] Fingerprint verification needed:', data);
      
      if (data && data.fingerprint) {
        setCurrentFingerprint(data.fingerprint);
        setIsFingerprintChanged(!!data.isChanged);
        setFingerprintVerificationNeeded(true);
      }
    };
    
    // Register event listener
    window.api.onFingerprintVerification(handleFingerprintVerification);
    
    // Clean up
    return () => {
      window.api.offFingerprintVerification(handleFingerprintVerification);
    };
  }, [checkConnection]);

  const contextValue = {
    connected,
    lastChecked,
    checking,
    fingerprintVerificationNeeded,
    currentFingerprint,
    isFingerprintChanged,
    checkConnection,
    refreshConnection,
    verifyFingerprint,
    rejectFingerprint,
    debouncedCheckConnection
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};

// Custom hook to use the connection context
export const useConnection = (): ConnectionContextState => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}; 