import { setBadgeCount } from '@/utils/badgeUtils';
import { useCallback, useEffect, useState } from 'react';
import { Alert } from 'react-native';
import { useAppState, useMarkAllAsRead } from './notifications';
import { useI18n } from './useI18n';

/**
 * Hook to sync app badge count with unread notifications
 */
export function useBadgeSync() {
    const { t } = useI18n();
    const [isMarkingAllAsRead, setIsMarkingAllAsRead] = useState(false);

    // Use React Query stats hook
    const { data: appState, isLoading } = useAppState();
    const stats = appState?.stats;
    const markAllAsReadMutation = useMarkAllAsRead();

    const unreadCount = stats?.unreadCount || 0;
    const hasUnreadNotifications = unreadCount > 0;

    useEffect(() => {
        if (!isMarkingAllAsRead && !isLoading) {
            setBadgeCount(unreadCount).then();
        }

    }, [unreadCount, isMarkingAllAsRead, isLoading]);

    const handleMarkAllAsRead = useCallback(async () => {
        if (!hasUnreadNotifications || isMarkingAllAsRead) return;
        setIsMarkingAllAsRead(true);

        try {
            await markAllAsReadMutation.mutateAsync();
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
    }, [hasUnreadNotifications, isMarkingAllAsRead, markAllAsReadMutation, t]);

    return {
        unreadCount,
        hasUnreadNotifications,
        handleMarkAllAsRead,
        isMarkingAllAsRead: isMarkingAllAsRead || markAllAsReadMutation.isPending
    };
}
