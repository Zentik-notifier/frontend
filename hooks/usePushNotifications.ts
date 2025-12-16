import { apolloClient } from '@/config/apollo-client';
import { deviceRegistrationInvalidatedVar } from '@/config/apollo-vars';
import { ChangelogsForModalQuery, DevicePlatform, GetBackendVersionDocument, GetUserDevicesDocument, NotificationServiceType, RegisterDeviceDto, useGetNotificationServicesLazyQuery, useGetUserDevicesLazyQuery, useRegisterDeviceMutation, useRemoveDeviceMutation } from '@/generated/gql-operations-generated';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import { translateInstant, Locale } from '@/hooks/useI18n';
import { settingsService } from '@/services/settings-service';
import { firebasePushNotificationService } from '@/services/firebase-push-notifications';
import { iosNativePushNotificationService } from '@/services/ios-push-notifications';
import { localNotifications } from '@/services/local-notifications';
import { webPushNotificationService } from '@/services/web-push-notifications';
import { checkChangelogUpdates } from '@/utils/changelogUtils';
import * as BackgroundFetch from 'expo-background-task';
import Constants from 'expo-constants';
import { getRandomBytesAsync } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import packageJson from '../package.json';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { installConsoleLoggerBridge } from '@/services/console-logger-hook';
import { useCleanup } from './useCleanup';
import { useReactiveVar } from '@apollo/client';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios' || Platform.OS === 'macos';
const isSimulator = !Device.isDevice;

const NOTIFICATION_REFRESH_TASK = 'zentik-notifications-refresh';
const CHANGELOG_CHECK_TASK = 'zentik-changelog-check';

export function usePushNotifications() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState<boolean | undefined>(undefined);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [pushPermissionError, setPushPermissionError] = useState(false);
  const [init, setInit] = useState(false);
  const [needsPwa, setNeedsPwa] = useState(false);
  const callbacks = useNotificationActions();
  const { cleanup } = useCleanup();

  const deviceRegistrationInvalidated = useReactiveVar(deviceRegistrationInvalidatedVar);

  useEffect(() => {
    if (!deviceRegistrationInvalidated) return;
    console.warn('[usePushNotifications] Device registration invalidated by backend; setting deviceRegistered=false');
    setDeviceRegistered(false);
  }, [deviceRegistrationInvalidated]);

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      })
    });
  }, []);

  const [registerDeviceMutation] = useRegisterDeviceMutation();
  const [removeDeviceMutation] = useRemoveDeviceMutation();
  const [fetchUserDevices] = useGetUserDevicesLazyQuery();
  const [getPushTypes] = useGetNotificationServicesLazyQuery();

  const initialize = async () => {
    const { pushNotificationsInitialized, deviceId, deviceToken } = settingsService.getAuthData();
    const pushTypes = await getPushTypes({ fetchPolicy: 'network-only' });
    const pushType = pushTypes.data?.notificationServices?.find(
      (service) => service?.devicePlatform === (
        isIOS ? DevicePlatform.Ios :
          isAndroid ? DevicePlatform.Android :
            DevicePlatform.Web)
    );
    console.log("[usePushNotifications] Detected push type:", pushType);

    if (pushType?.service) {
      if (pushType.service === NotificationServiceType.Push) {
        console.log("[usePushNotifications] Initializing push notifications...");
        let result;
        if (isWeb) {
          result = await webPushNotificationService.initialize(callbacks);
          setNeedsPwa(result?.needsPwa ?? false);
        } else if (isAndroid) {
          result = await firebasePushNotificationService.initialize(callbacks);
        } else if (isIOS) {
          result = await iosNativePushNotificationService.initialize(callbacks);
        }

        console.log(`[usePushNotifications] Initialize result:`, result);

        if (result?.hasPermissionError) {
          setPushPermissionError(true);
        } else if (isReady()) {
          setPushPermissionError(false);
        }

        setDeviceRegistered(!!deviceId && !!deviceToken);
      } else if (pushType.service === NotificationServiceType.Local) {
        console.log("[usePushNotifications] Initializing local notifications...");
        await localNotifications.initialize(callbacks);
      }
    }

    if (!pushNotificationsInitialized) {
      await registerDevice();
      await settingsService.savePushNotificationsInitialized(true);
    }

    await enableBackgroundFetch();
    setInit(true);
  };

  const enableBackgroundFetch = async () => {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundTaskStatus.Restricted) {
        console.warn("[usePushNotifications] Background fetch restricted on this device");
        return;
      }

      try {
        await BackgroundFetch.unregisterTaskAsync(NOTIFICATION_REFRESH_TASK);
      } catch {
      }

      try {
        await BackgroundFetch.unregisterTaskAsync(CHANGELOG_CHECK_TASK);
      } catch {
      }

      try {
        TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
          try {
            console.log("[BackgroundTask] Starting background task");
            installConsoleLoggerBridge();
            await cleanup({ force: true });
          } catch (e) {
            console.warn("[BackgroundTask] Background fetch task failed:", e);
          }
        });
      } catch (error) {
        console.warn("[BackgroundTask] Failed to define background task:", error);
      }

      try {
        TaskManager.defineTask(CHANGELOG_CHECK_TASK, async () => {
          try {
            console.log('[ChangelogBackgroundTask] Starting changelog background task');
            installConsoleLoggerBridge();

            const apiBase = settingsService.getApiBaseWithPrefix().replace(/\/$/, '');

            let changelogData: ChangelogsForModalQuery | undefined;
            try {
              const res = await fetch(`${apiBase}/changelogs`);
              if (!res.ok) {
                console.warn('[ChangelogBackgroundTask] Failed to fetch changelogs via REST:', res.status);
              } else {
                const list = (await res.json()) as ChangelogsForModalQuery['changelogs'];
                changelogData = { changelogs: list };
              }
            } catch (e) {
              console.warn('[ChangelogBackgroundTask] Error fetching changelogs via REST', e);
            }

            let backendVersion: string | null | undefined = undefined;
            try {
              if (apolloClient) {
                const backendRes = await apolloClient.query({
                  query: GetBackendVersionDocument,
                  fetchPolicy: 'network-only',
                });
                backendVersion = (backendRes.data as any)?.getBackendVersion;
              }
            } catch (e) {
              console.warn('[ChangelogBackgroundTask] Failed to fetch backend version', e);
            }

            const showNativeVersion = Platform.OS !== 'web';
            const nativeVersion = showNativeVersion
              ? Constants.expoConfig?.version || 'unknown'
              : undefined;
            const appVersion = (packageJson as any).version || 'unknown';

            const { latestEntry, unreadIds, shouldOpenModal } = checkChangelogUpdates(
              changelogData,
              {
                appVersion,
                backendVersion,
                nativeVersion,
              },
            );

            if (!shouldOpenModal || !latestEntry || unreadIds.length === 0) {
              return;
            }

            const settings = settingsService.getSettings();
            const locale = (settings.locale || 'en-EN') as Locale;

            const title = translateInstant(locale, 'changelog.backgroundNotificationTitle') as string;
            const bodyTemplate = translateInstant(locale, 'changelog.backgroundNotificationBody') as string;

            const body =
              (bodyTemplate.includes('{{version}}') && latestEntry.uiVersion
                ? bodyTemplate.replace('{{version}}', latestEntry.uiVersion)
                : bodyTemplate) || latestEntry.description;

            await Notifications.scheduleNotificationAsync({
              content: {
                title,
                body,
                data: { changelogId: latestEntry.id },
              },
              trigger: null,
            });
          } catch (e) {
            console.warn('[ChangelogBackgroundTask] Background fetch task failed:', e);
          }
        });
      } catch (error) {
        console.warn('[BackgroundTask] Failed to define changelog background task:', error);
      }

      try {
        await BackgroundFetch.registerTaskAsync(NOTIFICATION_REFRESH_TASK, {
          minimumInterval: 180
        });
        console.debug("[usePushNotifications] Background fetch task registered successfully");
      } catch (e) {
        // already registered or not supported
        console.debug("[usePushNotifications] Background fetch task already registered or not supported", e);
      }

      try {
        await BackgroundFetch.registerTaskAsync(CHANGELOG_CHECK_TASK, {
          minimumInterval: 15,
        });
        console.debug('[usePushNotifications] Changelog background task registered successfully');
      } catch (e) {
        console.debug('[usePushNotifications] Changelog background task already registered or not supported', e);
      }
    } catch (error) {
      console.error("[usePushNotifications] Error enabling background fetch:", error);
    }
  }

  const registerDevice = async (): Promise<boolean> => {
    console.log("[usePushNotifications] Registering device...");
    setRegisteringDevice(true);
    let tokenToStore: string | null = null;
    let hasPermissionError = false;

    const info = await getDeviceInfo();
    if (!info) {
      console.error("[usePushNotifications] Device infos not retrieved");
      return false;
    };

    // Get stored deviceId if available
    const storedDeviceId = settingsService.getAuthData().deviceId;
    if (storedDeviceId) {
      console.log("[usePushNotifications] Found stored deviceId, will update existing device:", storedDeviceId);
      info.deviceId = storedDeviceId;
    }

    try {
      const res = await registerDeviceMutation({ variables: { input: info } });
      const device = res.data?.registerDevice;

      console.log("[usePushNotifications] RegisterDevice response:", device);

      if (device) {
        await settingsService.saveDeviceId(device.id);

        if (device.publicKey) {
          await settingsService.savePublicKey(device.publicKey);
        }

        if (device.privateKey) {
          await settingsService.savePrivateKey(device.privateKey);
        }

        if (isIOS) {
          const iosResult = await iosNativePushNotificationService.registerDevice();

          hasPermissionError = iosResult?.hasPermissionError;
          tokenToStore = iosResult?.deviceToken ?? null;
        } else if (isWeb) {
          const webResult = await webPushNotificationService.registerDevice(device);

          hasPermissionError = webResult?.hasPermissionError

          const json = webResult?.infoJson;

          if (json) {
            const endpoint = json.endpoint ?? null;
            console.log("[usePushNotifications] Updating user device with json:", json, endpoint);
            await callbacks.useUpdateUserDevice({
              deviceId: device.id,
              subscriptionFields: {
                endpoint,
                p256dh: json.keys?.p256dh,
                auth: json.keys?.auth,
              },
              deviceToken: endpoint
            });
            tokenToStore = endpoint;
          }
        }
      }

      setPushPermissionError(!!hasPermissionError);
      setDeviceRegistered(!!tokenToStore);

      if (tokenToStore) {
        await settingsService.saveDeviceToken(tokenToStore);
        await settingsService.savePushNotificationsInitialized(true);
        setDeviceToken(tokenToStore);

        console.log('[usePushNotifications] Device registered successfully');
      } else {
        console.log('[usePushNotifications] Device registration failed, token not found');
      }

      return !hasPermissionError && !!tokenToStore;
    } catch (e) {
      console.error('[usePushNotifications] RegisterDevice failed:', e);
      return false;
    } finally {
      setRegisteringDevice(false);
    }
  };

  const unregisterDevice = async (): Promise<boolean> => {
    try {
      const res = await fetchUserDevices({ fetchPolicy: 'network-only' });
      const devices = res.data?.userDevices;
      const token = settingsService.getAuthData().deviceToken || (await getDeviceToken());
      if (isWeb) {
        await webPushNotificationService.unregisterDevice();
      }
      const current = devices?.find(d => d?.deviceToken === token);
      if (current) {
        await removeDeviceMutation({ variables: { deviceId: current.id }, refetchQueries: [{ query: GetUserDevicesDocument }] });
      }

      await settingsService.clearKeyPair();
      await settingsService.saveDeviceToken('');
      await settingsService.saveDeviceId('');
      setDeviceToken(null);
      setDeviceRegistered(false);
      console.log('[usePushNotifications] Tokens and device ID cleared');

      return true;
    } catch (e) {
      throw e;
    }
  };

  const isReady = (): boolean => {
    if (isSimulator) return true;
    if (isWeb) return webPushNotificationService.isReady();
    if (isAndroid) return firebasePushNotificationService.isReady();
    if (isIOS) return iosNativePushNotificationService.isReady();
    return false;
  };

  const getDeviceToken = async (): Promise<string | null> => {
    if (isSimulator) return settingsService.getAuthData().deviceToken ?? `${await generateSimulatorToken(32)}`;
    if (isWeb) return webPushNotificationService.getDeviceToken();
    if (isAndroid) return firebasePushNotificationService.getDeviceToken();
    if (isIOS) return iosNativePushNotificationService.getDeviceToken();
    return null;
  };

  const getBasicDeviceInfo = (): RegisterDeviceDto => {
    return {
      platform:
        Platform.OS === "android"
          ? DevicePlatform.Android
          : Platform.OS === "ios"
            ? DevicePlatform.Ios
            : DevicePlatform.Web,
      deviceName: Device.deviceName || undefined,
      deviceModel: Device.modelName || undefined,
      osVersion: Device.osVersion || undefined,
    }
  };

  const getDeviceInfo = async (): Promise<RegisterDeviceDto | null> => {
    if (isSimulator) return {
      ...getBasicDeviceInfo(),
      deviceToken: settingsService.getAuthData().deviceToken ?? `${await generateSimulatorToken(32)}`,
      onlyLocal: true
    };
    if (isWeb) return webPushNotificationService.getDeviceInfo();
    if (isAndroid) return firebasePushNotificationService.getDeviceInfo();
    if (isIOS) return iosNativePushNotificationService.getDeviceInfo();
    return null;
  };

  async function generateSimulatorToken(length: number) {
    const bytes = Math.ceil(length / 2);
    const arr = (await getRandomBytesAsync(bytes)) as Uint8Array;
    const hex = Array.from(arr)
      .map((b: number) => b.toString(16).padStart(2, "0"))
      .join("")
      .slice(0, length);
    return `local-${hex}`;
  }

  return {
    initialize,
    registerDevice,
    unregisterDevice,
    isReady,
    getDeviceInfo,
    getBasicDeviceInfo,
    init,
    deviceToken,
    deviceRegistered,
    registeringDevice,
    pushPermissionError,
    needsPwa,
  };
}

export type UsePushNotifications = ReturnType<typeof usePushNotifications>;