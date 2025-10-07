import { useAppContext } from '@/contexts/AppContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Alert, Platform } from 'react-native';
import { useI18n } from './useI18n';
import { useMarkAllNotificationsAsRead } from './useNotifications';
import { setBadgeCount } from '@/utils/badgeUtils';

/**
 * Hook to sync app badge count with unread notifications
 */
export function useBadgeSync() {
    const { t } = useI18n();
    const { notifications, isLoadingGqlData } = useAppContext();
    const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

    const { markAllAsRead, loading } =
        useMarkAllNotificationsAsRead();

    const unreadNotifications = useMemo(() => {
        return notifications.filter((notification) => !notification.readAt);
    }, [notifications]);
    const hasUnreadNotifications = !!unreadNotifications.length;
    const unreadCount = unreadNotifications.length;

    useEffect(() => {
        const exec = async () => {
            if (!isMarkingAllAsRead && !isLoadingGqlData) {
                await setBadgeCount(unreadCount);
            }
        }

        if (Platform.OS !== 'web') {
            exec();
        } else {
            if (navigator.setAppBadge) {
                navigator.setAppBadge(unreadCount);
            }
        }
        // Platform.OS !== 'web' && exec();
    }, [unreadCount, isMarkingAllAsRead, isLoadingGqlData]);

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
        unreadNotifications,
        unreadCount,
        hasUnreadNotifications,
        handleMarkAllAsRead,
        isMarkingAllAsRead: isMarkingAllAsRead || loading
    };
}
