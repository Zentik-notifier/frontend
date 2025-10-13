import { useGetMeQuery, useHealthcheckLazyQuery } from '@/generated/gql-operations-generated';
import NetInfo from '@react-native-community/netinfo';
import * as Updates from 'expo-updates';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UsePushNotifications } from './usePushNotifications';
import { Platform } from 'react-native';


interface ConnectionStatus {
  type: 'update' | 'offline' | 'backend' | 'network' | 'push-notifications' | 'push-permissions' | 'push-needs-pwa';
  icon: string;
  action: (() => void) | null;
  color: string;
};

export function useConnectionStatus(push: UsePushNotifications) {
  const [isOnline, setIsOnline] = useState(true);
  const [hasUpdateAvailable, setHasUpdateAvailable] = useState(false);
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus | undefined>();
  const [isWifi, setIsWifi] = useState(true);
  const [canAutoDownload, setCanAutoDownload] = useState(true);

  // Manage auth state internally
  const [isOfflineAuth, setIsOfflineAuth] = useState(false);
  const [isBackendUnreachable, setIsBackendUnreachable] = useState(false);

  const [healthcheck] = useHealthcheckLazyQuery();
  const errorCountRef = useRef(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const { data: userData, loading } = useGetMeQuery();

  useEffect(() => {
    let newStatus: ConnectionStatus | undefined;

    if (push.needsPwa) {
      newStatus = {
        type: 'push-needs-pwa',
        icon: 'progress-download',
        action: null,
        color: '#FF3B30'
      };
    } else if (push.pushPermissionError) {
      newStatus = {
        type: 'push-permissions',
        icon: 'bell-outline',
        action: null,
        color: '#FF3B30'
      };
    } else if (push.deviceRegistered === false && !push.registeringDevice) {
      newStatus = {
        type: 'push-notifications',
        icon: 'bell-off',
        action: null,
        color: '#FF3B30'
      };
    } else if (hasUpdateAvailable) {
      newStatus = {
        type: 'update',
        icon: 'refresh',
        action: applyUpdate,
        color: '#007AFF'
      };
    } else if (isOfflineAuth) {
      newStatus = {
        type: 'offline',
        icon: 'cloud-off',
        action: null, // Si aprirà il modal di login
        color: '#FF3B30'
      };
    } else if (isBackendUnreachable) {
      newStatus = {
        type: 'backend',
        icon: 'server',
        action: null,
        color: '#FF9500'
      };
    } else if (!isOnline) {
      newStatus = {
        type: 'network',
        icon: 'wifi-off',
        action: null,
        color: '#FF3B30'
      };
    }

    setStatus(newStatus);
  }, [isOnline, isOfflineAuth, isBackendUnreachable, hasUpdateAvailable, push.needsPwa, push.pushPermissionError, push.deviceRegistered, push.registeringDevice])

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
      const newIsWifi = state.type === 'wifi';

      setIsOnline(newOnlineState);
      setIsWifi(newIsWifi);

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

  // Update canAutoDownload based on WiFi state and user settings
  useEffect(() => {
    const updateAutoDownloadStatus = async () => {
      const { userSettings } = await import('../services/user-settings');
      const downloadSettings = userSettings.getMediaCacheDownloadSettings();

      if (!downloadSettings.autoDownloadEnabled) {
        setCanAutoDownload(false);
        return;
      }

      if (downloadSettings.wifiOnlyDownload) {
        setCanAutoDownload(isOnline && isWifi);
      } else {
        setCanAutoDownload(isOnline);
      }
    };

    updateAutoDownloadStatus();
  }, [isOnline, isWifi]);

  const isOtaUpdatesEnabled = useMemo(() => {
    return !__DEV__ && Updates.isEnabled;
  }, []);

  const checkForUpdates = useCallback(async () => {
    if (!isOtaUpdatesEnabled) return; // Per PWA il check è gestito dal listener

    setIsCheckingUpdate(true);
    try {
      const update = await Updates.checkForUpdateAsync();
      setHasUpdateAvailable(update.isAvailable);
    } catch (error) {
      console.error('[useConnectionStatus] Error checking for updates:', error);
      setHasUpdateAvailable(false);
    } finally {
      setIsCheckingUpdate(false);
    }
  }, [isOtaUpdatesEnabled]);

  // Setup Service Worker update detection listener (PWA only)
  useEffect(() => {
    if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return;

    let updateListenerAttached = false;

    const setupPwaUpdateListener = async () => {
      try {
        const registration = await navigator.serviceWorker.getRegistration();
        if (!registration || updateListenerAttached) return;

        console.log('[useConnectionStatus] Setting up PWA update detection listener');

        // Check if there's already a waiting service worker
        if (registration.waiting) {
          console.log('[useConnectionStatus] Service Worker update already available');
          setHasUpdateAvailable(true);
        }

        // Listen for new service worker installing
        const handleUpdateFound = () => {
          const newWorker = registration.installing;
          if (newWorker) {
            console.log('[useConnectionStatus] New Service Worker found, waiting for installation...');
            const handleStateChange = () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('[useConnectionStatus] New Service Worker installed and waiting');
                setHasUpdateAvailable(true);
              }
            };
            newWorker.addEventListener('statechange', handleStateChange);
          }
        };

        registration.addEventListener('updatefound', handleUpdateFound);
        updateListenerAttached = true;

        // Perform initial update check
        console.log('[useConnectionStatus] Performing initial PWA update check...');
        await registration.update();
        if (registration.waiting) {
          setHasUpdateAvailable(true);
        }
      } catch (error) {
        console.warn('[useConnectionStatus] Failed to setup PWA update listener:', error);
      }
    };

    setupPwaUpdateListener();
  }, [isOtaUpdatesEnabled]);

  // Initial check for OTA updates (native apps only)
  useEffect(() => {
    if (isOtaUpdatesEnabled) {
      checkForUpdates().catch(console.error);
    }
  }, [checkForUpdates, isOtaUpdatesEnabled]);

  const applyUpdate = async () => {
    if (!hasUpdateAvailable || isUpdating) return;

    setIsUpdating(true);
    try {
      // Apply OTA update (native apps)
      if (isOtaUpdatesEnabled) {
        await Updates.reloadAsync();
        return;
      }

      // Apply Service Worker update (PWA)
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration?.waiting) {
          console.log('[useConnectionStatus] Activating new Service Worker...');

          // Tell the waiting service worker to skip waiting and become active
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });

          // Listen for the controller change, then reload
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            console.log('[useConnectionStatus] New Service Worker activated, reloading...');
            window.location.reload();
          }, { once: true });
        } else {
          // No waiting worker, just reload to get the latest version
          console.log('[useConnectionStatus] No waiting worker, reloading to fetch updates...');
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('[useConnectionStatus] Error applying update:', error);
      setIsUpdating(false);
    }
  };

  return {
    isOnline,
    isBackendUnreachable,
    isOfflineAuth,
    hasUpdateAvailable,
    isCheckingUpdate,
    isUpdating,
    status,
    isWifi,
    canAutoDownload,
    applyUpdate,
    setOfflineAuth,
    setBackendUnreachable,
    checkForUpdates,
    isOtaUpdatesEnabled,
  };
}