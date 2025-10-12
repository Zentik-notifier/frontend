import { DevicePlatform, GetUserDevicesDocument, NotificationServiceType, RegisterDeviceDto, useGetNotificationServicesLazyQuery, useGetUserDevicesLazyQuery, useRegisterDeviceMutation, useRemoveDeviceMutation } from '@/generated/gql-operations-generated';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import {
  clearDeviceTokens,
  getPushNotificationsInitialized,
  getStoredDeviceToken,
  saveDeviceToken,
  savePrivateKey,
  savePublicKey,
  savePushNotificationsInitialized
} from '@/services/auth-storage';
import { firebasePushNotificationService } from '@/services/firebase-push-notifications';
import { iosNativePushNotificationService } from '@/services/ios-push-notifications';
import { localNotifications } from '@/services/local-notifications';
import { webPushNotificationService } from '@/services/web-push-notifications';
import * as BackgroundFetch from 'expo-background-task';
import { getRandomBytesAsync } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import { useCleanup } from './useCleanup';
import { apolloClient } from '@/config/apollo-client';
import { installConsoleLoggerBridge } from '@/services/console-logger-hook';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios' || Platform.OS === 'macos';
const isSimulator = !Device.isDevice;

const NOTIFICATION_REFRESH_TASK = 'zentik-notifications-refresh';

export function usePushNotifications() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState<boolean | undefined>(undefined);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [pushPermissionError, setPushPermissionError] = useState(false);
  const [needsPwa, setNeedsPwa] = useState(false);
  const callbacks = useNotificationActions();

  useEffect(() => {
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      })
    });

    getStoredDeviceToken().then((tok) => setDeviceToken(tok ?? null)).catch(() => setDeviceToken(null));
  }, []);

  const [registerDeviceMutation] = useRegisterDeviceMutation();
  const [removeDeviceMutation] = useRemoveDeviceMutation();
  const [fetchUserDevices] = useGetUserDevicesLazyQuery();
  const [getPushTypes] = useGetNotificationServicesLazyQuery();

  const initialize = async () => {
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
          setDeviceRegistered(false);
        } else if (isReady()) {
          setPushPermissionError(false);
          setDeviceRegistered(true);
        } else {
          setDeviceRegistered(false);
        }
      } else if (pushType.service === NotificationServiceType.Local) {
        console.log("[usePushNotifications] Initializing local notifications...");
        await localNotifications.initialize(callbacks);
      }
    }

    const pushNotificationsInitialized =
      await getPushNotificationsInitialized();


    if (!pushNotificationsInitialized) {
      await registerDevice();
      await savePushNotificationsInitialized(true);
    }

    await enableBackgroundFetch();
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
        TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
          try {
            console.log("[BackgroundTask] Starting background task");
            installConsoleLoggerBridge();
            await callbacks.cleanup({ immediate: true, force: true });
          } catch (e) {
            console.warn("[BackgroundTask] Background fetch task failed:", e);
          }
        });
      } catch (error) {
        console.warn("[BackgroundTask] Failed to define background task:", error);
      }

      try {
        await BackgroundFetch.registerTaskAsync(NOTIFICATION_REFRESH_TASK, {
          minimumInterval: 60
        });
        console.debug("[usePushNotifications] Background fetch task registered successfully");
      } catch (e) {
        // already registered or not supported
        console.debug("[usePushNotifications] Background fetch task already registered or not supported", e);
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

    try {
      const res = await registerDeviceMutation({ variables: { input: info } });
      const device = res.data?.registerDevice;

      console.log("[usePushNotifications] RegisterDevice response:", device);

      if (device) {
        if (device.publicKey) {
          await savePublicKey(device.publicKey);
        }

        if (device.privateKey) {
          await savePrivateKey(device.privateKey);
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
        await saveDeviceToken(tokenToStore);
        await savePushNotificationsInitialized(true);
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
      const token = (await getStoredDeviceToken()) || (await getDeviceToken());
      if (isWeb) {
        await webPushNotificationService.unregisterDevice();
      }
      const current = devices?.find(d => d?.deviceToken === token);
      if (current) {
        await removeDeviceMutation({ variables: { deviceId: current.id }, refetchQueries: [{ query: GetUserDevicesDocument }] });
      }

      await clearDeviceTokens();
      setDeviceToken(null);
      console.log('[usePushNotifications] Tokens cleared');

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
    if (isSimulator) return (await getStoredDeviceToken()) ?? `${await generateSimulatorToken(32)}`;
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
      deviceToken: (await getStoredDeviceToken()) ?? `${await generateSimulatorToken(32)}`,
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
    deviceToken,
    deviceRegistered,
    registeringDevice,
    pushPermissionError,
    needsPwa,
  };
}

export type UsePushNotifications = ReturnType<typeof usePushNotifications>;