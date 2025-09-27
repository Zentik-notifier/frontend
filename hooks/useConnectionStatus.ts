import { useGetMeQuery, useHealthcheckLazyQuery } from '@/generated/gql-operations-generated';
import NetInfo from '@react-native-community/netinfo';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDeviceRegistrationStatus } from './useDeviceRegistrationStatus';
import { UsePushNotifications, usePushNotifications } from './usePushNotifications';
import { useAppContext } from '@/contexts/AppContext';


export type GetPriorityStatus = () => {
  type: 'update' | 'offline' | 'backend' | 'network' | 'push-notifications' | 'push-permissions' | 'none';
  icon: string;
  label: string;
  action: (() => void) | null;
  color: string;
};

export interface ConnectionStatus {
  isOnline: boolean;
  isBackendUnreachable: boolean;
  isOfflineAuth: boolean;
  hasUpdateAvailable: boolean;
  isCheckingUpdate: boolean;
  isUpdating: boolean;
  isDeviceRegistered: boolean;
}

export function useConnectionStatus(skip?: boolean, push?: UsePushNotifications) {
  const {
    isRegistered: isDeviceRegistered,
    isLoading: isDeviceRegistrationLoading,
    refresh: refreshDeviceRegistration
  } = useDeviceRegistrationStatus(skip);
  const [isOnline, setIsOnline] = useState(true);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Manage auth state internally
  const [isOfflineAuth, setIsOfflineAuth] = useState(false);
  const [isBackendUnreachable, setIsBackendUnreachable] = useState(false);

  const [healthcheck] = useHealthcheckLazyQuery();
  const errorCountRef = useRef(0);
  const pollingIntervalRef = useRef<number | null>(null);
  const isPollingRef = useRef(false);
  const { data: userData, loading } = useGetMeQuery();

  // Functions to update auth state (for external use)
  const setOfflineAuth = useCallback((value: boolean) => {
    setIsOfflineAuth(value);
  }, []);

  const setBackendUnreachable = useCallback((value: boolean) => {
    setIsBackendUnreachable(value);
  }, []);

  // Server health polling
  const checkServerHealth = async () => {
    if (isPollingRef.current) return;

    isPollingRef.current = true;
    try {
      const result = await healthcheck({ fetchPolicy: 'network-only' });

      if (!userData?.me && !loading) {
        setIsOfflineAuth(true);
        return;
      } else {
        setIsOfflineAuth(false);
      }

      if (result.error) {
        // Check for 401 Unauthorized
        if (result.error.graphQLErrors?.some(err =>
          err.extensions?.code === 'UNAUTHENTICATED' ||
          err.message.includes('401')
        )) {
          setIsOfflineAuth(true);
          errorCountRef.current = 0; // Reset error count for auth errors
        } else {
          // Other errors - increment counter
          errorCountRef.current++;
          if (errorCountRef.current >= 3) {
            setIsBackendUnreachable(true);
          }
        }
      } else {
        // Success - reset flags and error count
        setIsOfflineAuth(false);
        setIsBackendUnreachable(false);
        errorCountRef.current = 0;
      }
    } catch (error: any) {
      // Network or other errors
      errorCountRef.current++;
      if (errorCountRef.current >= 3) {
        setIsBackendUnreachable(true);
      }
    } finally {
      isPollingRef.current = false;
    }
  };

  // Start polling when component mounts
  useEffect(() => {
    const startPolling = () => {
      if (pollingIntervalRef.current) return;

      // Initial check
      checkServerHealth();

      pollingIntervalRef.current = setInterval(checkServerHealth, 30000);
    };

    startPolling();

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // Network connectivity monitoring
  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      const wasOnline = isOnline;
      const newOnlineState = state.isConnected ?? true;
      setIsOnline(newOnlineState);

      // If network comes back online, reset backend unreachable flag
      if (!wasOnline && newOnlineState) {
        setIsBackendUnreachable(false);
        errorCountRef.current = 0;
        // Trigger immediate health check
        checkServerHealth();
      }
    });

    return () => unsubscribe();
  }, [isOnline]);

  const isOtaUpdatesEnabled = useMemo(() => {
    return !__DEV__ && Updates.isEnabled;
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (isOtaUpdatesEnabled) {
      setIsCheckingUpdate(true);
      try {
        const update = await Updates.checkForUpdateAsync();
        setHasUpdateAvailable(update.isAvailable);
      } catch (error) {
        console.error('Error checking for updates:', error);
        setHasUpdateAvailable(false);
      } finally {
        setIsCheckingUpdate(false);
      }
    }
  }, []);

  useEffect(() => {
    checkForUpdates().catch(console.error);
  }, [checkForUpdates]);

  const applyUpdate = async () => {
    if (!hasUpdateAvailable || isUpdating) return;

    setIsUpdating(true);
    try {
      await Updates.reloadAsync();
    } catch (error) {
      console.error('Error applying update:', error);
      setIsUpdating(false);
    }
  };

  const getPriorityStatus: GetPriorityStatus = () => {
    if (push?.pushPermissionError) {
      return {
        type: 'push-permissions',
        icon: 'notifications-outline',
        label: 'Notifiche disabilitate',
        action: null,
        color: '#FF3B30'
      };
    }
    if (isDeviceRegistered === false && !isDeviceRegistrationLoading) {
      return {
        type: 'push-notifications',
        icon: 'notifications-off',
        label: 'Dispositivo non registrato per le notifiche push',
        action: null,
        color: '#FF3B30'
      };
    }

    if (hasUpdateAvailable) {
      return {
        type: 'update',
        icon: 'refresh-circle',
        label: 'Aggiornamento disponibile',
        action: applyUpdate,
        color: '#007AFF'
      };
    }

    if (isOfflineAuth) {
      return {
        type: 'offline',
        icon: 'cloud-offline',
        label: 'Modalità offline',
        action: null, // Si aprirà il modal di login
        color: '#FF3B30'
      };
    }

    if (isBackendUnreachable) {
      return {
        type: 'backend',
        icon: 'server-outline',
        label: 'Backend non raggiungibile',
        action: null,
        color: '#FF9500'
      };
    }

    if (!isOnline) {
      return {
        type: 'network',
        icon: 'wifi-outline',
        label: 'Nessuna connessione',
        action: null,
        color: '#FF3B30'
      };
    }

    return {
      type: 'none',
      icon: '',
      label: '',
      action: null,
      color: ''
    };
  };

  return {
    isOnline,
    isBackendUnreachable,
    isOfflineAuth,
    hasUpdateAvailable,
    isCheckingUpdate,
    isUpdating,
    isDeviceRegistered,
    getPriorityStatus,
    applyUpdate,
    setOfflineAuth,
    setBackendUnreachable,
    checkForUpdates,
    isOtaUpdatesEnabled,
    refreshDeviceRegistration
  };
}