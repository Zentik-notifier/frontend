import { useAppContext } from '@/contexts/AppContext';
import { saveBadgeCount } from '@/services/auth-storage';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useI18n } from './useI18n';
import { useMarkAllNotificationsAsRead } from './useNotifications';

/**
 * Hook to sync app badge count with unread notifications
 */
export function useBadgeSync() {
    const { t } = useI18n();
    const { notifications, push, isLoadingGqlData } = useAppContext();
    const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

    const { markAllAsRead, loading } =
        useMarkAllNotificationsAsRead();

    const unreadNotifications = useMemo(() => {
        return notifications.filter((notification) => !notification.readAt);
    }, [notifications]);
    const hasUnreadNotifications = !!unreadNotifications.length;
    const unreadCount = unreadNotifications.length;

    useEffect(() => {
        // TODO: Implement PWA badges
        const exec = async () => {
            if (!isMarkingAllAsRead && !isLoadingGqlData) {
                push.setBadgeCount(unreadCount);
                await saveBadgeCount(unreadCount);
                console.log(`📱 Badge count synced: ${unreadCount}`);
            }
        }

        Platform.OS !== 'web' && exec();
    }, [unreadCount, isMarkingAllAsRead, isLoadingGqlData]);

    // Return a function to manually clear the badge
    const clearBadge = async () => {
        console.debug('🧹 Clearing badge manually');
        push.clearBadge();
        await saveBadgeCount(0);
        console.log('📱 Badge cleared');
    };

    const handleMarkAllAsRead = useCallback(async () => {
        if (!hasUnreadNotifications || isMarkingAllAsRead) return;
        setIsMarkingAllAsRead(true);

        try {
            await markAllAsRead();
            // Badge will be updated automatically by the useEffect when unreadCount changes
            // No need to manually clear it here
        } catch (error) {
            console.error("Error marking all notifications as read:", error);
            Alert.alert(
                t("common.error"),
                t("notifications.errors.markAllAsReadFailed"),
                [{ text: t("common.ok") }]
            );
        } finally {
            setIsMarkingAllAsRead(false);
        }
    }, [hasUnreadNotifications, isMarkingAllAsRead, markAllAsRead, t]);

    return {
        clearBadge,
        unreadNotifications,
        unreadCount,
        hasUnreadNotifications,
        handleMarkAllAsRead,
        isMarkingAllAsRead: isMarkingAllAsRead || loading
    };
}
