import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';
import { AuthorizationStatus, FirebaseMessagingTypes, getMessaging, getToken, onMessage, onNotificationOpenedApp, onTokenRefresh, requestPermission, setBackgroundMessageHandler } from '@react-native-firebase/messaging';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { DevicePlatform, RegisterDeviceDto } from '../generated/gql-operations-generated';

/**
 * Firebase Push Notification Service
 * Handles Firebase Cloud Messaging (FCM) tokens and Firebase-specific messaging
 * Includes all Firebase notification handling logic
 */
class FirebasePushNotificationService {
    private isInitialized = false;
    private listenersSetup = false;
    private deviceToken: string | null = null;
    private messaging: ReturnType<typeof getMessaging> | null = null
    private actionCallbacks: NotificationActionCallbacks | null = null;

    // Store subscription references for cleanup
    private backgroundMessageUnsubscribe: (() => void) | null = null;
    private foregroundMessageUnsubscribe: (() => void) | null = null;
    private tokenRefreshUnsubscribe: (() => void) | null = null;

    setActionCallbacks(callbacks: NotificationActionCallbacks) {
        this.actionCallbacks = callbacks;
    }
    /**
     * Initialize Firebase push notifications
     * Request permissions and get FCM token
     */
    async initialize(callbacks: NotificationActionCallbacks): Promise<RegisterDeviceDto | null> {
        if (this.isInitialized) {
            return this.getDeviceInfo();
        }

        this.messaging = getMessaging();
        this.actionCallbacks = callbacks;

        try {
            // Request notification permissions
            const authStatus = await requestPermission(this.messaging);
            const enabled =
                authStatus === AuthorizationStatus.AUTHORIZED ||
                authStatus === AuthorizationStatus.PROVISIONAL;

            if (!enabled) {
                console.warn('📱 Firebase Push notification permissions not granted');
                return null;
            }

            // Get FCM token
            this.deviceToken = await getToken(this.messaging);
            this.isInitialized = true;

            console.debug(`✅ Firebase push notifications initialized successfully`);

            this.setupNotificationListeners();

            return this.getDeviceInfo();
        } catch (error) {
            console.error('❌ Error initializing Firebase push notifications:', error);
            return null;
        }
    }

    /**
     * Get device information for Firebase push
     */
    public getDeviceInfo(): RegisterDeviceDto | null {
        if (!this.deviceToken) {
            return null;
        }

        return {
            deviceToken: this.deviceToken,
            platform: Platform.OS === 'android' ? DevicePlatform.Android : Platform.OS === 'ios' ? DevicePlatform.Ios : DevicePlatform.Web,
            deviceName: Device.deviceName || undefined,
            deviceModel: Device.modelName || undefined,
            osVersion: Device.osVersion || undefined,
        };
    }

    /**
     * Set up notification received listeners for Firebase
     */
    async setupNotificationListeners() {
        if (this.listenersSetup || !this.messaging) {
            console.debug('📱 Firebase notification listeners already setup, skipping...');
            return;
        }

        console.debug('📱 Setting up Firebase notification listeners...');

        // Remove existing listeners first (if any)
        this.removeNotificationListeners();

        // Setup token refresh listener (Firebase-specific)
        this.setupTokenRefreshListener();

        // Handle background messages (when app is in background or closed)
        setBackgroundMessageHandler(this.messaging, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            await this.handleBackgroundNotification(remoteMessage);
        });

        // Handle foreground messages (when app is open)
        this.foregroundMessageUnsubscribe = onMessage(this.messaging, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
            await this.handleForegroundNotification(remoteMessage);
        });

        // Handle notification when user taps on it (when app is opened from notification)
        onNotificationOpenedApp(this.messaging, async (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
            if (remoteMessage) {
                console.debug('👆 Firebase notification tapped (app opened):', remoteMessage);
                await this.handleNotificationResponse(remoteMessage);
            }
        });

        // Handle notification when app is opened from a terminated state
        this.messaging
            .getInitialNotification()
            .then(async (remoteMessage: FirebaseMessagingTypes.RemoteMessage | null) => {
                if (remoteMessage) {
                    console.debug('👆 Firebase notification tapped (app launched):', remoteMessage);
                    await this.handleNotificationResponse(remoteMessage);
                }
            });

        this.listenersSetup = true;
        console.debug("✅ Firebase notification listeners setup complete");
    }

    /**
     * Setup token refresh listener (Firebase-specific)
     */
    private setupTokenRefreshListener() {
        if (!this.messaging) {
            return;
        }

        if (this.tokenRefreshUnsubscribe) {
            this.tokenRefreshUnsubscribe();
        }

        this.tokenRefreshUnsubscribe = onTokenRefresh(this.messaging, async (token) => {
            console.debug('🔄 Firebase token refreshed:', token.substring(0, 20) + '...');
            if (this.deviceToken) {
                await this.actionCallbacks?.refreshPushToken({
                    oldDeviceToken: this.deviceToken,
                    newDeviceToken: token
                });
            }
            this.deviceToken = token;
        });
    }

    /**
     * Handle notification received in background
     */
    private handleBackgroundNotification = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.debug('📱 Firebase background notification:', remoteMessage);

        const notificationId = remoteMessage.data?.notificationId as string;
        if (notificationId && this.actionCallbacks && this.deviceToken) {
            try {
                await this.actionCallbacks.pushNotificationReceived(notificationId);
            } catch (e) {
                console.warn('⚠️ iOS pushNotificationReceived (foreground) failed:', e);
            }
        }
    };

    /**
     * Handle notification received in foreground
     */
    private handleForegroundNotification = async (remoteMessage: FirebaseMessagingTypes.RemoteMessage) => {
        console.debug('📱 Firebase foreground notification:', remoteMessage);

        const notificationId = remoteMessage.data?.notificationId as string;
        if (notificationId && this.actionCallbacks && this.deviceToken) {
            try {
                await this.actionCallbacks.pushNotificationReceived(notificationId);
            } catch (e) {
                console.warn('⚠️ iOS pushNotificationReceived (foreground) failed:', e);
            }
        }
    };

    /**
     * Handle notification response (when user taps notification)
     */
    private async handleNotificationResponse(remoteMessage: FirebaseMessagingTypes.RemoteMessage): Promise<void> {
        const notificationData = remoteMessage.data;

        console.debug('📱 Firebase notification response data:', JSON.stringify(notificationData, null, 2));
    }

    /**
     * Get the current FCM token
     */
    getDeviceToken(): string | null {
        return this.deviceToken;
    }

    /**
     * Check if the service is ready
     */
    isReady(): boolean {
        return this.isInitialized && this.deviceToken !== null;
    }

    /**
     * Remove notification listeners to prevent duplicates
     */
    removeNotificationListeners() {
        if (this.backgroundMessageUnsubscribe) {
            this.backgroundMessageUnsubscribe();
            this.backgroundMessageUnsubscribe = null;
        }

        if (this.foregroundMessageUnsubscribe) {
            this.foregroundMessageUnsubscribe();
            this.foregroundMessageUnsubscribe = null;
        }

        if (this.tokenRefreshUnsubscribe) {
            this.tokenRefreshUnsubscribe();
            this.tokenRefreshUnsubscribe = null;
        }

        this.listenersSetup = false;
        console.debug('🧹 Firebase notification listeners removed');
    }
}

// Export singleton instance
export const firebasePushNotificationService = new FirebasePushNotificationService();
