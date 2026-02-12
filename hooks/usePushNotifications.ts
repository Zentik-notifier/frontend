import { apolloClient } from '@/config/apollo-client';
import { deviceRegistrationInvalidatedVar } from '@/config/apollo-vars';
import { DevicePlatform, GetNotificationsDocument, GetNotificationsQuery, GetUserDevicesDocument, NotificationDeliveryType, NotificationFragment, NotificationServiceType, RegisterDeviceDto, useGetNotificationServicesLazyQuery, useGetUserDevicesLazyQuery, useRegisterDeviceMutation, useRemoveDeviceMutation, useUpdateReceivedNotificationsMutation } from '@/generated/gql-operations-generated';
import { useNotificationActions } from '@/hooks/useNotificationActions';
import {
  enablePushBackgroundTasks,
  NO_PUSH_CHECK_TASK,
  setPushBackgroundTaskCallbacks,
  triggerBackgroundTasksForTesting,
} from '@/services/background-tasks';
import { iosNativePushNotificationService } from '@/services/ios-push-notifications';
import { localNotifications } from '@/services/local-notifications';
import { logger } from '@/services/logger';
import { settingsService } from '@/services/settings-service';
import { webPushNotificationService } from '@/services/web-push-notifications';
import { useReactiveVar } from '@apollo/client';
import * as BackgroundFetch from 'expo-background-task';
import { getRandomBytesAsync } from 'expo-crypto';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useCleanup } from './useCleanup';
import { VersionsInfo } from './useGetVersionsInfo';

const isWeb = Platform.OS === 'web';
const isAndroid = Platform.OS === 'android';
const isIOS = Platform.OS === 'ios' || Platform.OS === 'macos';
const isSimulator = !Device.isDevice;

type FirebasePushService = typeof import('@/services/firebase-push-notifications')['firebasePushNotificationService'];

export function usePushNotifications(versions: VersionsInfo) {
  const [deviceToken, setDeviceToken] = useState<string | null>(null);
  const [deviceRegistered, setDeviceRegistered] = useState<boolean | undefined>(undefined);
  const [registeringDevice, setRegisteringDevice] = useState(false);
  const [pushPermissionError, setPushPermissionError] = useState(false);
  const [init, setInit] = useState(false);
  const [needsPwa, setNeedsPwa] = useState(false);
  const callbacks = useNotificationActions();
  const { cleanup } = useCleanup();
  const firebaseServiceRef = useRef<FirebasePushService | null>(null);

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
  const [updateReceivedNotifications] = useUpdateReceivedNotificationsMutation();

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
          const { firebasePushNotificationService } = await import('@/services/firebase-push-notifications');
          firebaseServiceRef.current = firebasePushNotificationService;
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
      setPushBackgroundTaskCallbacks({
        cleanup,
        registerDevice,
        updateReceivedNotifications: async (variables: { id: string }) => {
          return updateReceivedNotifications({ variables });
        },
      });

      await enablePushBackgroundTasks();
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
    const isNewDeviceRegistration = !storedDeviceId;
    if (storedDeviceId) {
      console.log("[usePushNotifications] Found stored deviceId, will update existing device:", storedDeviceId);
      info.deviceId = storedDeviceId;
    }

    // For new devices, include versions/build info directly in the register mutation
    if (isNewDeviceRegistration) {
      try {
        info.metadata = JSON.stringify(versions);
      } catch (e) {
        console.warn('[usePushNotifications] Failed to serialize versions metadata for registration', e);
      }
    }

    try {
      const res = await registerDeviceMutation({ variables: { input: info } });
      const device = res.data?.registerDevice;

      console.log("[usePushNotifications] RegisterDevice response:", device);

      if (device) {
        await settingsService.saveDeviceId(device.id);

        if (isIOS) {
          const iosResult = await iosNativePushNotificationService.registerDevice();
          if (device.privateKey) {
            await settingsService.savePrivateKey(device.privateKey);
          }
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
    if (isAndroid) return firebaseServiceRef.current?.isReady() ?? false;
    if (isIOS) return iosNativePushNotificationService.isReady();
    return false;
  };

  const getDeviceToken = async (): Promise<string | null> => {
    if (isSimulator) return settingsService.getAuthData().deviceToken ?? `${await generateSimulatorToken(32)}`;
    if (isWeb) return webPushNotificationService.getDeviceToken();
    if (isAndroid) {
      if (!firebaseServiceRef.current) {
        const { firebasePushNotificationService } = await import('@/services/firebase-push-notifications');
        firebaseServiceRef.current = firebasePushNotificationService;
      }
      return firebaseServiceRef.current.getDeviceToken();
    }
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
    if (isAndroid) {
      if (!firebaseServiceRef.current) {
        const { firebasePushNotificationService } = await import('@/services/firebase-push-notifications');
        firebaseServiceRef.current = firebasePushNotificationService;
      }
      return firebaseServiceRef.current.getDeviceInfo();
    }
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

  const testNoPushCheckTask = async (): Promise<void> => {
    console.log('[usePushNotifications] Manually triggering NO_PUSH check task...');
    try {
      if (!apolloClient) {
        console.warn('[usePushNotifications] Apollo client not available for test');
        return;
      }

      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '[Test] NO_PUSH Check Task (Manual)',
            body: `Task eseguito manualmente alle ${new Date().toLocaleTimeString()}`,
            data: {
              test: true,
              manual: true,
              timestamp: new Date().toISOString(),
            },
          },
          trigger: null,
        });
        console.log('[usePushNotifications] Test notification sent (manual trigger)');
      } catch (error) {
        console.warn('[usePushNotifications] Failed to send test notification:', error);
      }

      const result = await apolloClient.query<GetNotificationsQuery>({
        query: GetNotificationsDocument,
        fetchPolicy: 'network-only',
      });
      const notifications: NotificationFragment[] = result.data?.notifications || [];

      console.log(`[usePushNotifications] Found ${notifications.length} total notifications`);

      if (notifications.length === 0) {
        console.log('[usePushNotifications] No notifications found');
        return;
      }

      const noPushUnreceived: NotificationFragment[] = notifications.filter(
        (notification: NotificationFragment) =>
          notification.message.deliveryType === NotificationDeliveryType.NoPush &&
          !notification.receivedAt
      );

      console.log(`[usePushNotifications] Found ${noPushUnreceived.length} unreceived NO_PUSH notifications`);

      if (noPushUnreceived.length === 0) {
        console.log('[usePushNotifications] No unreceived NO_PUSH notifications found');
        return;
      }

      for (const notification of noPushUnreceived) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: notification.message.title,
              body: notification.message.body || notification.message.subtitle || '',
              data: {
                id: notification.id,
                route: `/notification/${notification.id}`,
                bucketId: notification.message.bucket.id,
                bucketColor: notification.message.bucket.color,
                deliveryType: notification.message.deliveryType,
              },
            },
            trigger: null,
          });
          console.log(
            `[usePushNotifications] Scheduled local notification for NO_PUSH notification ${notification.id}`
          );
        } catch (error) {
          console.warn(
            `[usePushNotifications] Failed to schedule notification for ${notification.id}:`,
            error
          );
        }
      }

      if (noPushUnreceived.length > 0) {
        const latestNotificationId = noPushUnreceived[0].id;
        try {
          await updateReceivedNotifications({
            variables: { id: latestNotificationId },
          });
          console.log(
            `[usePushNotifications] Marked ${noPushUnreceived.length} NO_PUSH notifications as received (up to ${latestNotificationId})`
          );
        } catch (error) {
          console.warn(
            '[usePushNotifications] Failed to mark notifications as received:',
            error
          );
        }
      }
    } catch (e) {
      console.error('[usePushNotifications] Test task failed:', e);
    }
  };

  const checkBackgroundTaskStatus = async (): Promise<void> => {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      logger.info('Background task status', {
        status: BackgroundFetch.BackgroundTaskStatus[status],
        task: NO_PUSH_CHECK_TASK,
        minInterval: '15 min',
      }, 'usePushNotifications');
    } catch (e) {
      logger.warn('Failed to check background task status', e, 'usePushNotifications');
    }
  };

  const triggerBackgroundTasks = async (): Promise<boolean> => {
    return triggerBackgroundTasksForTesting();
  };

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
    testNoPushCheckTask,
    checkBackgroundTaskStatus,
    triggerBackgroundTasks,
  };
}

export type UsePushNotifications = ReturnType<typeof usePushNotifications>;