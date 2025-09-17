import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { DevicePlatform, NotificationActionFragment, NotificationActionType, RegisterDeviceDto } from '../generated/gql-operations-generated';
import { ApiConfigService } from './api-config';
import {
    clearPendingNavigationIntent,
    getPendingNavigationIntent,
} from './auth-storage';

class IOSNativePushNotificationService {
    private isInitialized = false;
    private deviceToken: string | null = null;
    private listenersSetup = false;
    private actionCallbacks: NotificationActionCallbacks | null = null;

    // Store subscription references for cleanup
    private notificationReceivedSubscription: any = null;
    private notificationResponseSubscription: any = null;

    /**
     * Set action callbacks from the unified service
     */
    setActionCallbacks(callbacks: NotificationActionCallbacks) {
        this.actionCallbacks = callbacks;
    }

    async registerDevice(): Promise<string | null> {
        const token = await Notifications.getDevicePushTokenAsync();
        if (token) {
            this.deviceToken = token.data;
        }
        return this.deviceToken;
    }

    /**
     * Initialize iOS native push notifications with enhanced features
     * Request permissions and register device token
     * Swift handles action buttons, React Native handles action responses
     */
    async initialize(callbacks: NotificationActionCallbacks): Promise<RegisterDeviceDto | null> {
        if (this.isInitialized) {
            // Check for pending intents even if already initialized
            await this.processPendingIntents();
            return this.getDeviceInfo();
        }

        this.actionCallbacks = callbacks;

        try {
            // Initialize API config to ensure endpoint is saved to keychain for NSE access
            await ApiConfigService.initialize();

            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== 'granted') {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== 'granted') {
                console.warn('📱 iOS Push notification permissions not granted');
                return null;
            }

            const token = await Notifications.getDevicePushTokenAsync();

            this.deviceToken = token.data;
            this.isInitialized = true;

            console.debug(`✅ iOS push notifications initialized successfully`);

            this.setupNotificationListeners();

            // Process any pending intents from NSE actions with small delay for router initialization
            setTimeout(async () => {
                await this.processPendingIntents();
            }, 500);

            return this.getDeviceInfo();
        } catch (error) {
            console.error('❌ Error initializing iOS native push notifications:', error);
            return null;
        }
    }

    /**
     * Get device information
     */
    public getDeviceInfo(): RegisterDeviceDto | null {
        if (!this.deviceToken) {
            return null;
        }

        return {
            deviceToken: this.deviceToken,
            platform: DevicePlatform.Ios,
            deviceName: Device.deviceName || undefined,
            deviceModel: Device.modelName || undefined,
            osVersion: Device.osVersion || undefined,
        };
    }

    /**
     * Get current device token
     */
    getDeviceToken(): string | null {
        return this.deviceToken;
    }

    /**
     * Check if notifications are initialized
     */
    isReady(): boolean {
        return this.isInitialized && !!this.deviceToken;
    }

    /**
     * Set up notification received listeners for iOS
     */
    setupNotificationListeners() {
        if (this.listenersSetup) {
            console.debug('📱 iOS notification listeners already setup, skipping...');
            return;
        }

        console.debug('📱 Setting up iOS notification listeners...');

        this.removeNotificationListeners();

        this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
            this.handleNotificationReceived
        );

        this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            this.handleNotificationResponse(response);
        });



        this.listenersSetup = true;
        console.debug("✅ iOS notification listeners setup complete");
    }



    /**
     * Handle notification received (when notification arrives)
     */
    private handleNotificationReceived = async (notification: Notifications.Notification) => {
        console.log('📱 iOS notification received:', JSON.stringify(notification));

        // Extract notification ID from payload
        const pushTrigger = notification.request.trigger as any;
        const payload = pushTrigger?.payload || (notification.request.content?.data as any);
        const notificationId: string | undefined = payload?.notificationId;

        if (notificationId && this.actionCallbacks) {
            try {
                await this.actionCallbacks.pushNotificationReceived(notificationId);
            } catch (e) {
                console.warn('⚠️ iOS pushNotificationReceived (foreground) failed:', e);
            }
        }
    };

    /**
     * Handle notification response (when user taps notification or action)
     */
    private handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
        console.log('👆 iOS notification response:', JSON.stringify(response));

        // Extract payload from push notification trigger (where the actual data is stored)
        const pushTrigger = response.notification.request.trigger as any;
        const payload = pushTrigger?.payload || response.notification.request.content.data as any;
        const notificationId = payload?.notificationId as string | undefined;

        // Background reception (user tapped): report received before handling actions
        if (notificationId && this.actionCallbacks && this.deviceToken) {
            try {
                await this.actionCallbacks.pushNotificationReceived(notificationId);
            } catch (e) {
                console.warn('⚠️ iOS pushNotificationReceived (tap) failed:', e);
            }
        }
        const actionIdentifier = response.actionIdentifier;

        // Handle default action (tap on notification)
        if (actionIdentifier === Notifications.DEFAULT_ACTION_IDENTIFIER) {
            // Check for pending intents when app opens from notification tap
            const hadPendingIntent = await this.processPendingIntents();

            // Only handle default tap if no pending intent was processed
            if (!hadPendingIntent) {
                await this.handleDefaultTapAction(response, payload);
            }
            return;
        }

        // Custom action buttons are always handled by Content Extension
        console.log('🎬 iOS: Custom action button pressed - delegated to Content Extension');
    };

    /**
     * Handle default notification tap
     */
    private async handleDefaultTapAction(response: Notifications.NotificationResponse, payload: any) {
        const notificationId = payload?.notificationId;
        console.log('🔔 iOS: Extracted notification ID:', notificationId);

        // Check if there's a tapAction defined
        if (payload?.tapAction) {
            console.log('🎯 iOS: Executing tapAction:', payload.tapAction);
            if (this.actionCallbacks && notificationId) {
                await this.actionCallbacks.executeAction(notificationId, payload.tapAction);
            }
            return;
        }

        // Default behavior: navigate to notification detail or notifications list
        if (notificationId) {
            const openAction: NotificationActionFragment = {
                type: NotificationActionType.OpenNotification,
                value: notificationId,
                destructive: false,
                icon: '',
                title: 'Open'
            };
            console.log('🎯 iOS: Default open action for notification:', notificationId);
            if (this.actionCallbacks) {
                await this.actionCallbacks.executeAction(notificationId, openAction);
            }
        }
    }



    /**
     * Remove notification listeners to prevent duplicates
     */
    removeNotificationListeners() {
        // Remove iOS listeners
        if (this.notificationReceivedSubscription) {
            this.notificationReceivedSubscription.remove();
            this.notificationReceivedSubscription = null;
        }

        if (this.notificationResponseSubscription) {
            this.notificationResponseSubscription.remove();
            this.notificationResponseSubscription = null;
        }

        this.listenersSetup = false;
        console.debug('🧹 iOS notification listeners removed');
    }

    /**
     * Process pending intents stored by NSE when app was terminated
     * Returns true if an intent was processed
     */
    private async processPendingIntents(): Promise<boolean> {
        try {
            // Check for pending navigation intent using keychain
            const navigationIntent = await getPendingNavigationIntent();
            if (navigationIntent && this.actionCallbacks) {
                console.log('📱 iOS: Found pending navigation intent:', navigationIntent);

                // Execute the stored navigation action
                if (navigationIntent.type === 'NAVIGATE') {
                    this.actionCallbacks.onNavigate(navigationIntent.value);
                } else if (navigationIntent.type === 'OPEN_NOTIFICATION') {
                    this.actionCallbacks.onOpenNotification({
                        type: NotificationActionType.OpenNotification,
                        value: navigationIntent.value,
                        destructive: false,
                        icon: '',
                        title: 'Open'
                    });
                }

                // Clear the processed intent
                await clearPendingNavigationIntent();
                console.log('📱 iOS: Navigation intent processed and cleared');
                return true; // Intent was processed
            }


            return false; // No navigation intent was processed

        } catch (error) {
            console.error('❌ iOS: Error processing pending intents:', error);
            return false;
        }
    }
}

// Export singleton instance
export const iosNativePushNotificationService = new IOSNativePushNotificationService();
