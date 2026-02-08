/**
 * Hook for getting notification statistics (total count, unread count)
 * Uses a lightweight query to get just the counts without loading all data
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { notificationKeys } from './notificationKeys';
import { getAllNotificationsFromCache } from '@/services/notifications-repository';
import type { NotificationFragment } from '@/generated/gql-operations-generated';

export interface NotificationStatsResult {
    /**
     * Total number of notifications matching the filters
     */
    totalCount: number;

    /**
     * Number of unread notifications matching the filters
     */
    unreadCount: number;

    /**
     * Whether the stats are currently loading
     */
    isLoading: boolean;

    /**
     * Whether there was an error fetching stats
     */
    isError: boolean;
}

/**
 * Get notification statistics (counts) from local DB
 * This is a lightweight query that just counts notifications without loading full data
 * Updated automatically when mutations occur
 */
export function useGlobalNotificationStats(): NotificationStatsResult {

    // Use a dedicated stats query with staleTime: Infinity
    const {
        data,
        isLoading,
        isError,
    } = useQuery({
        queryKey: [...notificationKeys.stats()],
        queryFn: async () => {
            const allNotifications = await getAllNotificationsFromCache();

            const unreadCount = allNotifications.filter(n => !n.readAt).length;

            return {
                totalCount: allNotifications.length,
                unreadCount,
            };
        },
        staleTime: Infinity, // Never auto-refetch - updated by mutations
        gcTime: 30 * 60 * 1000, // 30 min
    });

    return {
        totalCount: data?.totalCount || 0,
        unreadCount: data?.unreadCount || 0,
        isLoading,
        isError,
    };
}
