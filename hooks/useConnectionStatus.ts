import { getSdk } from '@/generated/gql-operations-generated';
import { graphqlClient } from '@/services/graphql-client';
import NetInfo from '@react-native-community/netinfo';
import * as Updates from 'expo-updates';
import { File, Paths } from 'expo-file-system/next';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { UsePushNotifications } from './usePushNotifications';
import { Platform } from 'react-native';
import { settingsService } from '@/services/settings-service';
import { mediaCache } from '@/services/media-cache-service';


interface ConnectionStatus {
  type: 'update' | 'offline' | 'backend' | 'network' | 'push-notifications' | 'push-permissions' | 'push-needs-pwa' | 'filesystem-permission';
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
  const [hasFilesystemPermission, setHasFilesystemPermission] = useState(true);

  // Manage auth state internally
  const [isOfflineAuth, setIsOfflineAuth] = useState(false);
  const [isBackendUnreachable, setIsBackendUnreachable] = useState(false);

  const sdk = getSdk(graphqlClient);
  const errorCountRef = useRef(0);
  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isPollingRef = useRef(false);
  const [userData, setUserData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // Load user data
  useEffect(() => {
    const loadUserData = async () => {
      try {
        setLoading(true);
        const result = await sdk.GetMe();
        setUserData(result.me);
      } catch (error) {
        console.warn('Failed to load user data:', error);
        setUserData(null);
      } finally {
        setLoading(false);
      }
    };
    
    loadUserData();
  }, [sdk]);

  // Check filesystem permissions (mobile only)
  useEffect(() => {
    const checkFilesystemPermissions = async () => {
      if (Platform.OS === 'web') {
        setHasFilesystemPermission(true);
        return;
      }

      try {
        // Test if we can access and write to storage using expo-file-system/next API
        const testFile = new File(Paths.cache, 'test-permission-check.txt');
        
        // Delete if exists from previous test
        if (testFile.exists) {
          testFile.delete();
        }
        
        // Test write access
        testFile.create();
        testFile.write('test', {});
        
        // Test read access
        const content = await testFile.text();
        if (content !== 'test') {
          throw new Error('Read verification failed');
        }
        
        // Clean up
        if (testFile.exists) {
          testFile.delete();
        }
        
        setHasFilesystemPermission(true);
      } catch (error: any) {
        console.warn('[useConnectionStatus] Filesystem permission check failed:', error.message);
        setHasFilesystemPermission(false);
      }
    };

    checkFilesystemPermissions();
  }, []);

  // Sync filesystem permission with MediaCache
  useEffect(() => {
    mediaCache.setFilesystemPermission(hasFilesystemPermission);
  }, [hasFilesystemPermission]);

  useEffect(() => {
    let newStatus: ConnectionStatus | undefined;

    if (isOfflineAuth) {
      newStatus = {
        type: 'offline',
        icon: 'cloud-off',
        action: null, // Si aprirà il modal di login
        color: '#FF3B30'
      };
    } else if (!hasFilesystemPermission) {
      newStatus = {
        type: 'filesystem-permission',
        icon: 'folder-lock',
        action: null,
        color: '#FF9500'
      };
    } else if (push.needsPwa) {
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
  }, [isOnline, isOfflineAuth, isBackendUnreachable, hasUpdateAvailable, hasFilesystemPermission, push.needsPwa, push.pushPermissionError, push.deviceRegistered, push.registeringDevice])

  const setBackendUnreachable = useCallback((value: boolean) => {
    setIsBackendUnreachable(value);
  }, []);

  useEffect(() => {
    setIsOfflineAuth(!userData?.me && !loading);
  }, [userData, loading])

  // Server health polling
  const checkServerHealth = async () => {
    if (isPollingRef.current) return;

    isPollingRef.current = true;
    try {
      const result = await sdk.Healthcheck();

      if (result.error) {
        // Check for 401 Unauthorized
        if (result.error.graphQLErrors?.some(err =>
          err.extensions?.code === 'UNAUTHENTICATED' ||
          err.message.includes('401')
        )) {
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
    const updateAutoDownloadStatus = () => {
      const downloadSettings = settingsService.getDownloadSettings();

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
      checkForUpdates().catch(e => {
        console.error("Error during initial OTA update check:", e);
      });
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
    hasFilesystemPermission,
    applyUpdate,
    setBackendUnreachable,
    checkForUpdates,
    isOtaUpdatesEnabled,
  };
}