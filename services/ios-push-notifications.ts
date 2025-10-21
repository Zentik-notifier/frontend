import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { DevicePlatform, NotificationActionFragment, NotificationActionType, RegisterDeviceDto } from '../generated/gql-operations-generated';
import { settingsService } from './settings-service';
import { settingsRepository } from './settings-repository';

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

    async registerDevice() {
        const hasPermission = await this.checkPermissions();

        if (!hasPermission) {
            console.error('[IOSNativePushNotificationService] Permissions not granted');
            return { deviceToken: null, hasPermissionError: true };
        }

        const token = await Notifications.getDevicePushTokenAsync();
        if (token) {
            this.deviceToken = token.data;
            return { deviceToken: this.deviceToken, hasPermissionError: false };
        } else {
            console.error('[IOSNativePushNotificationService] Device token not found');
            return { deviceToken: null, hasPermissionError: false };
        }
    }

    async checkPermissions() {
        const { status: existingStatus, ios } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;

        if (existingStatus !== 'granted') {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
        }

        if (finalStatus !== 'granted') {
            console.error('[IOSNativePushNotificationService] Permissions not granted', finalStatus, JSON.stringify(ios));
            return false
        } else {
            return true
        }
    }

    /**
     * Register DYNAMIC notification category (Home Assistant approach)
     * This category has no predefined actions - the NCE will inject them at runtime
     * based on the notification's userInfo data.
     */
    async registerDynamicCategory() {
        try {
            await Notifications.setNotificationCategoryAsync('DYNAMIC', [], {
                customDismissAction: true,
            });
            console.log('[IOSNativePushNotificationService] 🎭 DYNAMIC category registered successfully');
        } catch (error) {
            console.error('[IOSNativePushNotificationService] ❌ Failed to register DYNAMIC category:', error);
        }
    }

    /**
     * Initialize iOS native push notifications with enhanced features
     * Request permissions and register device token
     * Swift handles action buttons, React Native handles action responses
     */
    async initialize(callbacks: NotificationActionCallbacks) {
        if (this.isInitialized) {
            return { deviceInfo: this.getDeviceInfo(), hasPermissionError: false };
        }

        this.actionCallbacks = callbacks;

        try {
            // Initialize API config to ensure endpoint is saved to keychain for NSE access
            await Promise.resolve();

            const hasPermission = await this.checkPermissions();

            if (!hasPermission) {
                console.error('[IOSNativePushNotificationService] Permissions not granted');
                return { deviceInfo: null, hasPermissionError: true };
            }

            // Register DYNAMIC category (Home Assistant approach)
            // The category has no predefined actions - NCE will inject them at runtime
            await this.registerDynamicCategory();

            const token = await Notifications.getDevicePushTokenAsync();

            this.deviceToken = token.data;
            this.isInitialized = true;

            this.setupNotificationListeners();

            if (this.deviceToken) {
                console.debug(`[IOSNativePushNotificationService] Initialized successfully`);
                return { deviceInfo: this.getDeviceInfo(), hasPermissionError: false };
            } else {
                console.error('[IOSNativePushNotificationService] Device token not found');
                return { deviceInfo: null, hasPermissionError: false };
            }
        } catch (error: any) {
            console.error('[IOSNativePushNotificationService] Error initializing:', error);
            const hasPermissionError = error?.code === 'ERR_PERMISSIONS_REQUEST_NOTIFICATIONS';
            return { deviceInfo: null, hasPermissionError };
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
            console.log('[IOSNativePushNotificationService] iOS notification listeners already setup, skipping...');
            return;
        }

        this.removeNotificationListeners();

        this.notificationReceivedSubscription = Notifications.addNotificationReceivedListener(
            this.handleNotificationReceived
        );

        this.notificationResponseSubscription = Notifications.addNotificationResponseReceivedListener((response) => {
            this.handleNotificationResponse(response);
        });

        this.listenersSetup = true;
        console.debug("[IOSNativePushNotificationService] iOS notification listeners setup complete");

        // Check if there's a notification tap that happened while the app was closed
        this.checkLastNotificationResponse();
    }

    /**
     * Check for notification response that happened while app was closed
     */
    private async checkLastNotificationResponse() {
        try {
            const lastResponse = Notifications.getLastNotificationResponse();
            if (lastResponse) {
                console.log('[IOSNativePushNotificationService] Found last notification response from cold start:', JSON.stringify(lastResponse));
                // Process it as if it just happened
                await this.handleNotificationResponse(lastResponse);
            } else {
                console.debug('[IOSNativePushNotificationService] No last notification response found');
            }
        } catch (error) {
            console.error('[IOSNativePushNotificationService] Error checking last notification response:', error);
        }
    }



    /**
     * Handle notification received (when notification arrives)
     */
    private handleNotificationReceived = async (notification: Notifications.Notification) => {
        console.log('[IOSNativePushNotificationService] iOS notification received:', JSON.stringify(notification));

        // Extract notification ID from payload
        const pushTrigger = notification.request.trigger as any;
        const payload = pushTrigger?.payload || (notification.request.content?.data as any);
        const notificationId: string | undefined = payload?.notificationId;

        if (notificationId && this.actionCallbacks) {
            try {
                await this.actionCallbacks.pushNotificationReceived(notificationId);
            } catch (e) {
                console.warn('[IOSNativePushNotificationService] iOS pushNotificationReceived (foreground) failed:', e);
            }
        }
    };

    /**
     * Handle notification response (when user taps notification or action)
     */
    private handleNotificationResponse = async (response: Notifications.NotificationResponse) => {
        console.log('[IOSNativePushNotificationService] iOS notification response:', JSON.stringify(response));

        // Extract payload from push notification trigger (where the actual data is stored)
        const pushTrigger = response.notification.request.trigger as any;
        const payload = pushTrigger?.payload || response.notification.request.content.data as any;
        const notificationId = payload?.notificationId as string | undefined;

        // Background reception (user tapped): report received before handling actions
        if (notificationId && this.actionCallbacks && this.deviceToken) {
            this.actionCallbacks.pushNotificationReceived(notificationId).catch(console.error);
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
    };

    /**
     * Handle default notification tap
     * Waits for cleanup to complete before executing navigation to ensure bucket data is loaded
     */
    private async handleDefaultTapAction(response: Notifications.NotificationResponse, payload: any) {
        const notificationId = payload?.notificationId;
        console.log('[IOSNativePushNotificationService] Extracted notification ID:', notificationId);

        // // IMPORTANT: Run cleanup BEFORE navigation to ensure bucket data is loaded
        // // This prevents missing bucket icons when opening notification detail from cold start
        // if (this.actionCallbacks?.cleanup) {
        //     console.log('[IOSNativePushNotificationService] Running cleanup before navigation...');
        //     try {
        //         await this.actionCallbacks.cleanup({ immediate: true });
        //         console.log('[IOSNativePushNotificationService] Cleanup completed, proceeding with navigation');
        //     } catch (error) {
        //         console.warn('[IOSNativePushNotificationService] Cleanup failed, but proceeding with navigation:', error);
        //     }
        // }

        // Check if there's a tapAction defined
        if (payload?.tapAction) {
            console.log('[IOSNativePushNotificationService] Executing tapAction:', payload.tapAction);
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
            console.log('[IOSNativePushNotificationService] Default open action for notification:', notificationId);
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
    }

    /**
     * Process pending intents stored by NSE when app was terminated
     * Returns true if an intent was processed
     */
    private async processPendingIntents(): Promise<boolean> {
        try {
            // Read directly from database (realtime) instead of cached value
            const intentStr = await settingsRepository.getSetting('auth_pendingNavigationIntent');
            if (!intentStr) {
                return false; // No navigation intent was processed
            }

            const navigationIntent = JSON.parse(intentStr);
            if (navigationIntent && this.actionCallbacks) {
                console.log('[IOSNativePushNotificationService] Found pending navigation intent:', navigationIntent);

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

                // Clear the processed intent directly from database
                await settingsRepository.removeSetting('auth_pendingNavigationIntent');
                console.log('[IOSNativePushNotificationService] Navigation intent processed and cleared');
                return true; // Intent was processed
            }

            return false; // No navigation intent was processed

        } catch (error) {
            console.error('[IOSNativePushNotificationService] Error processing pending intents:', error);
            return false;
        }
    }
}

// Export singleton instance
export const iosNativePushNotificationService = new IOSNativePushNotificationService();
