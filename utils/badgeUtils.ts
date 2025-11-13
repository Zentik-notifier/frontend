import { settingsService } from '@/services/settings-service';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

export const setBadgeCount = async (count: number): Promise<void> => {
    try {
        if (Platform.OS !== 'web') {
            await Notifications.setBadgeCountAsync(count);
            await settingsService.saveBadgeCount(count);
        } else {
            if (navigator.setAppBadge) {
                navigator.setAppBadge(count);
            }
        }
        console.log(`[BadgeSync] Badge count synced: ${count}`);
    } catch (error) {
        console.error('[usePushNotifications] Error setting badge count:', error);
    }
};
