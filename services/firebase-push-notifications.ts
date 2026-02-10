import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';
// import * as Device from 'expo-device';
// import { Platform } from 'react-native';
// import { DevicePlatform, RegisterDeviceDto } from '../generated/gql-operations-generated';
import { RegisterDeviceDto } from '../generated/gql-operations-generated';

/**
 * Firebase Push Notification Service - NOOP MOCK
 * Firebase has been removed; this module provides a no-op implementation.
 * Used on Android when NotificationServiceType.Push is configured.
 * Original implementation kept below as commented reference.
 */

/*
// Original Firebase implementation (commented - Firebase removed from dependencies)
import { AuthorizationStatus, FirebaseMessagingTypes, getMessaging, getToken, onMessage, onNotificationOpenedApp, onTokenRefresh, requestPermission, setBackgroundMessageHandler } from '@react-native-firebase/messaging';

class FirebasePushNotificationService {
  private isInitialized = false;
  private listenersSetup = false;
  private deviceToken: string | null = null;
  private messaging: ReturnType<typeof getMessaging> | null = null;
  private actionCallbacks: NotificationActionCallbacks | null = null;
  private backgroundMessageUnsubscribe: (() => void) | null = null;
  private foregroundMessageUnsubscribe: (() => void) | null = null;
  private tokenRefreshUnsubscribe: (() => void) | null = null;

  setActionCallbacks(callbacks: NotificationActionCallbacks) {
    this.actionCallbacks = callbacks;
  }

  async initialize(callbacks: NotificationActionCallbacks): Promise<{ deviceInfo: RegisterDeviceDto | null; hasPermissionError: boolean }> {
    if (this.isInitialized) {
      return { deviceInfo: this.getDeviceInfo(), hasPermissionError: false };
    }
    this.messaging = getMessaging();
    this.actionCallbacks = callbacks;
    try {
      const authStatus = await requestPermission(this.messaging);
      const enabled = authStatus === AuthorizationStatus.AUTHORIZED || authStatus === AuthorizationStatus.PROVISIONAL;
      if (!enabled) {
        console.error('PUSH_PERMISSION_DENIED: Firebase notification permissions not granted');
        return { deviceInfo: null, hasPermissionError: true };
      }
      this.deviceToken = await getToken(this.messaging);
      this.isInitialized = true;
      this.setupNotificationListeners();
      return { deviceInfo: this.getDeviceInfo(), hasPermissionError: false };
    } catch (error) {
      console.error('❌ Error initializing Firebase push notifications:', error);
      return { deviceInfo: null, hasPermissionError: false };
    }
  }

  public getDeviceInfo(): RegisterDeviceDto | null {
    if (!this.deviceToken) return null;
    return {
      deviceToken: this.deviceToken,
      platform: Platform.OS === 'android' ? DevicePlatform.Android : Platform.OS === 'ios' ? DevicePlatform.Ios : DevicePlatform.Web,
      deviceName: Device.deviceName || undefined,
      deviceModel: Device.modelName || undefined,
      osVersion: Device.osVersion || undefined,
    };
  }

  async setupNotificationListeners() {
    if (this.listenersSetup || !this.messaging) return;
    this.removeNotificationListeners();
    this.setupTokenRefreshListener();
    setBackgroundMessageHandler(this.messaging, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      await this.handleBackgroundNotification(remoteMessage);
    });
    this.foregroundMessageUnsubscribe = onMessage(this.messaging, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
      await this.handleForegroundNotification(remoteMessage);
    });
    onNotificationOpenedApp(this.messaging, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (remoteMessage) await this.handleNotificationResponse(remoteMessage);
    });
    this.messaging.getInitialNotification().then(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
      if (remoteMessage) await this.handleNotificationResponse(remoteMessage);
    });
    this.listenersSetup = true;
  }

  private setupTokenRefreshListener() {
    if (!this.messaging) return;
    if (this.tokenRefreshUnsubscribe) this.tokenRefreshUnsubscribe();
    this.tokenRefreshUnsubscribe = onTokenRefresh(this.messaging, async (token) => {
      if (this.deviceToken) {
        await this.actionCallbacks?.refreshPushToken({
          oldDeviceToken: this.deviceToken,
          newDeviceToken: token
        });
      }
      this.deviceToken = token;
    });
  }

  private handleBackgroundNotification = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    const notificationId = remoteMessage.data?.notificationId as string;
    if (notificationId && this.actionCallbacks && this.deviceToken) {
      try { await this.actionCallbacks.pushNotificationReceived(notificationId); } catch (e) { console.warn('⚠️ iOS pushNotificationReceived (foreground) failed:', e); }
    }
  };

  private handleForegroundNotification = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
    const notificationId = remoteMessage.data?.notificationId as string;
    if (notificationId && this.actionCallbacks && this.deviceToken) {
      try { await this.actionCallbacks.pushNotificationReceived(notificationId); } catch (e) { console.warn('⚠️ iOS pushNotificationReceived (foreground) failed:', e); }
    }
  };

  private async handleNotificationResponse(remoteMessage: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
    // Handle notification tap
  }

  getDeviceToken(): string | null { return this.deviceToken; }
  isReady(): boolean { return this.isInitialized && this.deviceToken !== null; }

  removeNotificationListeners() {
    if (this.backgroundMessageUnsubscribe) { this.backgroundMessageUnsubscribe(); this.backgroundMessageUnsubscribe = null; }
    if (this.foregroundMessageUnsubscribe) { this.foregroundMessageUnsubscribe(); this.foregroundMessageUnsubscribe = null; }
    if (this.tokenRefreshUnsubscribe) { this.tokenRefreshUnsubscribe(); this.tokenRefreshUnsubscribe = null; }
    this.listenersSetup = false;
  }
}
*/

class FirebasePushNotificationServiceNoop {
  setActionCallbacks(_callbacks: NotificationActionCallbacks) {}

  async initialize(_callbacks: NotificationActionCallbacks): Promise<{
    deviceInfo: RegisterDeviceDto | null;
    hasPermissionError: boolean;
  }> {
    return { deviceInfo: null, hasPermissionError: false };
  }

  getDeviceInfo(): RegisterDeviceDto | null {
    return null;
  }

  async setupNotificationListeners() {}

  getDeviceToken(): string | null {
    return null;
  }

  isReady(): boolean {
    return false;
  }

  removeNotificationListeners() {}
}

export const firebasePushNotificationService =
  new FirebasePushNotificationServiceNoop();
