import { settingsService } from '@/services/settings-service';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

let lastBadgeSyncLog: { count: number; ts: number } | null = null;

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
        const now = Date.now();
        if (!lastBadgeSyncLog || lastBadgeSyncLog.count !== count || (now - lastBadgeSyncLog.ts) > 2000) {
            console.log(`[BadgeSync] Badge count synced: ${count}`);
            lastBadgeSyncLog = { count, ts: now };
        }
    } catch (error) {
        console.error('[usePushNotifications] Error setting badge count:', error);
    }
};
