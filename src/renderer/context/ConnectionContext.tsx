import React, { createContext, useContext, useState, useEffect, ReactNode, useCallback, useMemo } from 'react';
import debounce from 'lodash/debounce';

interface ConnectionContextType {
  connected: boolean;
  lastChecked: number;
  checkConnection: () => Promise<boolean>;
  refreshConnection: () => Promise<boolean>;
  debouncedCheckConnection: (force?: boolean) => void;
}

const ConnectionContext = createContext<ConnectionContextType | undefined>(undefined);

interface ConnectionProviderProps {
  children: ReactNode;
}

export const ConnectionProvider: React.FC<ConnectionProviderProps> = ({ children }) => {
  const [connected, setConnected] = useState<boolean>(false);
  const [lastChecked, setLastChecked] = useState<number>(0);
  const [checking, setChecking] = useState<boolean>(false);

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
      console.error('[ConnectionContext] Failed to check connection status:', error);
      setConnected(false);
      setChecking(false);
      return false;
    }
  }, [connected, lastChecked, checking]);

  // Create debounced version of checkConnection to prevent rapid calls
  const debouncedCheckConnection = useMemo(
    () => debounce((force = false) => checkConnection(force), 1000, { leading: true, trailing: false }),
    [checkConnection]
  );

  const refreshConnection = useCallback(async (): Promise<boolean> => {
    return checkConnection(true);
  }, [checkConnection]);

  // Initial check and set up event listeners
  useEffect(() => {
    console.log('[ConnectionContext] Initial connection check...');
    
    // Initial connection check - use normal version for first check
    checkConnection();
    
    // Set up periodic connection checks (every 30 seconds - increased from 15)
    const interval = setInterval(() => {
      debouncedCheckConnection();
    }, 30000);
    
    // Listen for connection change events from main process
    const handleConnectionChange = (event: Event) => {
      const customEvent = event as CustomEvent;
      console.log('[ConnectionContext] Connection event received:', customEvent.detail);
      const newConnectedState = !!customEvent.detail.connected;
      
      // Only update if there's a change to prevent unnecessary re-renders
      if (connected !== newConnectedState) {
        console.log(`[ConnectionContext] Setting connection state to: ${newConnectedState ? 'connected' : 'disconnected'}`);
        setConnected(newConnectedState);
        setLastChecked(Date.now());
      }
    };
    
    window.addEventListener('ssh-connection-change', handleConnectionChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('ssh-connection-change', handleConnectionChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [checkConnection, debouncedCheckConnection]); // Include debouncedCheckConnection in dependencies

  const contextValue = {
    connected,
    lastChecked,
    checkConnection,
    refreshConnection,
    debouncedCheckConnection
  };

  return (
    <ConnectionContext.Provider value={contextValue}>
      {children}
    </ConnectionContext.Provider>
  );
};

// Custom hook to use the connection context
export const useConnection = (): ConnectionContextType => {
  const context = useContext(ConnectionContext);
  if (context === undefined) {
    throw new Error('useConnection must be used within a ConnectionProvider');
  }
  return context;
}; 