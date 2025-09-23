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
import { getRandomBytesAsync } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';
import * as BackgroundFetch from 'expo-background-task';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios' || Platform.OS === 'macos';
const isSimulator = !Device.isDevice;

const NOTIFICATION_REFRESH_TASK = 'zentik-notifications-refresh';

export function usePushNotifications() {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
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

    if (pushType?.service) {
      if (pushType.service === NotificationServiceType.Push) {
        console.log("🔄 Initializing push notifications...");
        if (isWeb) {
          await webPushNotificationService.initialize(callbacks);
        } else if (isAndroid) {
          await firebasePushNotificationService.initialize(callbacks);
        } else if (isIOS) {
          await iosNativePushNotificationService.initialize(callbacks);
        }
      } else if (pushType.service === NotificationServiceType.Local) {
        console.log("🔄 Initializing local notifications...");
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
        console.warn('⚠️ Background fetch restricted on this device');
        return;
      }

      try {
        await BackgroundFetch.unregisterTaskAsync(NOTIFICATION_REFRESH_TASK);
      } catch {
      }

      try {
        TaskManager.defineTask(NOTIFICATION_REFRESH_TASK, async () => {
          try {
            await callbacks.fetchNotifications();
          } catch (e) {
            console.warn('⚠️ Background fetch task failed:', e);
          }
        });
      } catch (error) {
        console.warn('⚠️ Failed to define background task:', error);
      }

      try {
        await BackgroundFetch.registerTaskAsync(NOTIFICATION_REFRESH_TASK, {
          minimumInterval: 60
        });
        console.debug('✅ Background fetch task registered successfully');
      } catch (e) {
        // already registered or not supported
        console.debug('ℹ️ Background fetch task already registered or not supported', e);
      }
    } catch (error) {
      console.error('❌ Error enabling background fetch:', error);
    }
  }

  const registerDevice = async (): Promise<boolean> => {
    console.log('🔄 Registering device...');
    let tokenToStore: string | null = null;

    if (isIOS) {
      tokenToStore = await iosNativePushNotificationService.registerDevice();
    }

    const info = await getDeviceInfo();
    if (!info) return false;

    try {
      const res = await registerDeviceMutation({ variables: { input: info }, refetchQueries: [{ query: GetUserDevicesDocument }] });

      if (res.data?.registerDevice) {
        if (res.data.registerDevice.publicKey) {
          await savePublicKey(res.data.registerDevice.publicKey);
        }

        if (res.data.registerDevice.privateKey) {
          await savePrivateKey(res.data.registerDevice.privateKey);
        }

        if (isWeb) {
          const token = await webPushNotificationService.registerDevice(res.data.registerDevice);
          if (token) {
            tokenToStore = token;
          }
        } else {
          if (info.deviceToken) {
            tokenToStore = info.deviceToken;
          }
        }

        if (tokenToStore) {
          await saveDeviceToken(tokenToStore);
          await savePushNotificationsInitialized(true);
          setDeviceToken(tokenToStore);
        }

        console.log('🔄 Device registered successfully');

        return true;
      }

      return false;
    } catch (e) {
      console.error('❌ RegisterDevice failed:', e);
      return false;
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
      console.log('🔄 Tokens cleared');

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

  const setBadgeCount = async (count: number): Promise<void> => {
    try {
      const current = await Notifications.getBadgeCountAsync();

      if (current === count) return;

      await Notifications.setBadgeCountAsync(count);
      console.log(`📱 Badge count set to ${count}`);
    } catch (error) {
      console.error('❌ Error setting badge count:', error);
    }
  };

  const clearBadge = async (): Promise<void> => setBadgeCount(0);

  return {
    initialize,
    registerDevice,
    unregisterDevice,
    isReady,
    getDeviceInfo,
    getBasicDeviceInfo,
    setBadgeCount,
    clearBadge,
    deviceToken
  };
}
