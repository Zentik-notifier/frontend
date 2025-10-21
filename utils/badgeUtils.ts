import { settingsService } from '@/services/settings-service';
import * as Notifications from 'expo-notifications';

export const setBadgeCount = async (count: number): Promise<void> => {
    try {
        await Notifications.setBadgeCountAsync(count);
        await settingsService.saveBadgeCount(count);
        console.log(`[BadgeSync] Badge count synced: ${count}`);
    } catch (error) {
        console.error('[usePushNotifications] Error setting badge count:', error);
    }
};
