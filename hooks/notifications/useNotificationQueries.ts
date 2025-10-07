/**
 * React Query hooks for notification queries
 * Provides hooks for fetching notifications with local DB sync
 */

import {
    useQuery,
    useInfiniteQuery,
    UseQueryResult,
    UseQueryOptions,
    UseInfiniteQueryResult,
    InfiniteData,
} from '@tanstack/react-query';
import {
    NotificationFragment,
    useGetNotificationsLazyQuery,
    useGetNotificationLazyQuery,
    useMassDeleteNotificationsMutation,
} from '@/generated/gql-operations-generated';
import {
    UseNotificationsOptions,
    UseBucketNotificationsOptions,
    UseNotificationStatsOptions,
    NotificationQueryResult,
    NotificationStats,
    BucketStats,
} from '@/types/notifications';
import {
    queryNotifications,
    queryBucketNotifications,
    getNotificationById,
    getNotificationStats,
    getBucketStats,
    getUnreadCountsByBucket,
} from '@/db/repositories/notifications-query-repository';
import {
    upsertNotificationsBatch,
    saveNotificationToCache,
    deleteNotificationFromCache,
} from '@/services/notifications-repository';

// ====================
// QUERY KEYS
// ====================

/**
 * Query key factory for notifications
 * Provides consistent and hierarchical keys for react-query
 */
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (filters?: any, sort?: any, pagination?: any) =>
        [...notificationKeys.lists(), { filters, sort, pagination }] as const,
    details: () => [...notificationKeys.all, 'detail'] as const,
    detail: (id: string) => [...notificationKeys.details(), id] as const,
    buckets: () => [...notificationKeys.all, 'bucket'] as const,
    bucket: (bucketId: string, filters?: any, sort?: any, pagination?: any) =>
        [...notificationKeys.buckets(), bucketId, { filters, sort, pagination }] as const,
    stats: () => [...notificationKeys.all, 'stats'] as const,
    stat: (bucketIds?: string[]) => [...notificationKeys.stats(), { bucketIds }] as const,
    bucketStats: () => [...notificationKeys.all, 'bucketStats'] as const,
    bucketStat: (bucketId: string) => [...notificationKeys.bucketStats(), bucketId] as const,
    unreadCounts: () => [...notificationKeys.all, 'unreadCounts'] as const,
};

// ====================
// QUERY HOOKS
// ====================

/**
 * Hook for fetching notifications with filters, sorting, and pagination
 * Combines API data with local DB for offline-first approach
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useNotifications({
 *   filters: { isRead: false },
 *   sort: { field: 'createdAt', direction: 'desc' },
 *   pagination: { limit: 50, offset: 0 },
 *   autoSync: true,
 * });
 * ```
 */
export function useNotifications(
    options?: UseNotificationsOptions
): UseQueryResult<NotificationQueryResult> {
    const [fetchNotifications] = useGetNotificationsLazyQuery();
    const [massDeleteNotifications] = useMassDeleteNotificationsMutation();

    const {
        filters,
        sort,
        pagination,
        autoSync = true,
        refetchInterval = 0,
    } = options || {};

    return useQuery({
        queryKey: notificationKeys.list(filters, sort, pagination),
        queryFn: async (): Promise<NotificationQueryResult> => {
            try {
                // If autoSync is enabled, fetch from API first and sync with local DB
                if (autoSync) {
                    try {
                        // Fetch new notifications from server (no filters - get all)
                        const apiNotifications = await fetchNotificationsFromAPI(fetchNotifications);

                        if (apiNotifications.length > 0) {
                            console.log(`[useNotifications] Fetched ${apiNotifications.length} notifications from API`);

                            // Save to local DB
                            await upsertNotificationsBatch(apiNotifications);
                            console.log(`[useNotifications] Saved ${apiNotifications.length} notifications to local DB`);

                            // Delete from server immediately
                            const notificationIds = apiNotifications.map((n: NotificationFragment) => n.id);
                            await deleteNotificationsFromServer(massDeleteNotifications, notificationIds);
                            console.log(`[useNotifications] Deleted ${apiNotifications.length} notifications from server`);
                        }
                    } catch (apiError) {
                        console.warn('[useNotifications] API sync failed:', apiError);
                        // Continue to query local DB
                    }
                }

                // Always return data from local DB with filters applied
                const localResult = await queryNotifications({ filters, sort, pagination });
                return localResult;
            } catch (error) {
                console.error('[useNotifications] Error:', error);
                throw error;
            }
        },
        refetchInterval,
        staleTime: 30000, // 30 seconds
        gcTime: 5 * 60 * 1000, // 5 minutes (formerly cacheTime)
    });
}

/**
 * Hook for fetching a single notification by ID
 * 
 * @example
 * ```tsx
 * const { data: notification, isLoading } = useNotification('notification-id');
 * ```
 */
export function useNotification(
    notificationId: string,
    queryOptions?: Omit<UseQueryOptions<NotificationFragment | null>, 'queryKey' | 'queryFn'>
): UseQueryResult<NotificationFragment | null> {
    return useQuery({
        queryKey: notificationKeys.detail(notificationId),
        queryFn: async (): Promise<NotificationFragment | null> => {
            try {
                // Always use local DB - notifications are already synced
                const localNotification = await getNotificationById(notificationId);
                return localNotification;
            } catch (error) {
                console.error('[useNotification] Error:', error);
                return null;
            }
        },
        staleTime: 60000, // 1 minute
        gcTime: 10 * 60 * 1000, // 10 minutes
        ...queryOptions,
    });
}

/**
 * Hook for fetching notifications for a specific bucket
 * 
 * @example
 * ```tsx
 * const { data, isLoading } = useBucketNotifications({
 *   bucketId: 'bucket-id',
 *   sort: { field: 'createdAt', direction: 'desc' },
 *   pagination: { limit: 50, offset: 0 },
 * });
 * ```
 */
export function useBucketNotifications(
    options: UseBucketNotificationsOptions
): UseQueryResult<NotificationQueryResult> {
    const [fetchNotifications] = useGetNotificationsLazyQuery();
    const [massDeleteNotifications] = useMassDeleteNotificationsMutation();
    const {
        bucketId,
        filters,
        sort,
        pagination,
        autoSync = true,
        realtime = false,
    } = options;

    return useQuery({
        queryKey: notificationKeys.bucket(bucketId, filters, sort, pagination),
        queryFn: async (): Promise<NotificationQueryResult> => {
            try {
                // If autoSync is enabled, fetch from API first
                if (autoSync) {
                    try {
                        // Fetch ALL new notifications from server (not just this bucket)
                        const apiNotifications = await fetchNotificationsFromAPI(fetchNotifications);

                        if (apiNotifications.length > 0) {
                            console.log(`[useBucketNotifications] Fetched ${apiNotifications.length} notifications from API`);

                            // Save to local DB
                            await upsertNotificationsBatch(apiNotifications);
                            console.log(`[useBucketNotifications] Saved to local DB`);

                            // Delete from server immediately
                            const notificationIds = apiNotifications.map((n: NotificationFragment) => n.id);
                            await deleteNotificationsFromServer(massDeleteNotifications, notificationIds);
                            console.log(`[useBucketNotifications] Deleted from server`);
                        }
                    } catch (apiError) {
                        console.warn('[useBucketNotifications] API sync failed:', apiError);
                        // Continue to query local DB
                    }
                }

                // Always return data from local DB with filters applied
                const localResult = await queryBucketNotifications(bucketId, { filters, sort, pagination });
                return localResult;
            } catch (error) {
                console.error('[useBucketNotifications] Error:', error);
                throw error;
            }
        },
        refetchInterval: realtime ? 5000 : 0, // 5 seconds if realtime
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });
}

/**
 * Hook for fetching notification statistics
 * 
 * @example
 * ```tsx
 * const { data: stats, isLoading } = useNotificationStats({
 *   bucketIds: ['bucket-1', 'bucket-2'],
 *   realtime: true,
 * });
 * ```
 */
export function useNotificationStats(
    options?: UseNotificationStatsOptions
): UseQueryResult<NotificationStats> {
    const {
        bucketIds,
        realtime = false,
        refetchInterval = 0,
    } = options || {};

    return useQuery({
        queryKey: notificationKeys.stat(bucketIds),
        queryFn: async (): Promise<NotificationStats> => {
            try {
                // Get stats from local DB (fast and always available)
                const stats = await getNotificationStats(bucketIds);
                return stats;
            } catch (error) {
                console.error('[useNotificationStats] Error:', error);
                throw error;
            }
        },
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
        staleTime: 10000, // 10 seconds
        gcTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Hook for fetching statistics for a specific bucket
 * 
 * @example
 * ```tsx
 * const { data: bucketStats, isLoading } = useBucketStats('bucket-id');
 * ```
 */
export function useBucketStats(
    bucketId: string
): UseQueryResult<BucketStats> {
    return useQuery({
        queryKey: notificationKeys.bucketStat(bucketId),
        queryFn: async (): Promise<BucketStats> => {
            try {
                const stats = await getBucketStats(bucketId);
                return stats;
            } catch (error) {
                console.error('[useBucketStats] Error:', error);
                throw error;
            }
        },
        staleTime: 10000,
        gcTime: 2 * 60 * 1000,
    });
}

/**
 * Hook for fetching a single notification by ID
 * Searches local DB first, then falls back to remote API if not found
 * 
 * @example
 * ```tsx
 * const { data: notification, isLoading, error } = useNotificationDetail('notification-id');
 * 
 * // Force fetch from remote
 * const { data, refetch } = useNotificationDetail('id');
 * await refetch(); // This will fetch from remote
 * ```
 */
export function useNotificationDetail(
    notificationId: string | undefined
): UseQueryResult<NotificationFragment> {
    const [fetchNotification] = useGetNotificationLazyQuery();

    return useQuery({
        queryKey: notificationKeys.detail(notificationId || ''),
        queryFn: async (): Promise<NotificationFragment> => {
            if (!notificationId) {
                throw new Error('Notification ID is required');
            }

            try {
                // First, try to get from local DB
                const localNotification = await getNotificationById(notificationId);

                if (localNotification) {
                    return localNotification;
                }

                // If not found locally, fetch from GraphQL API
                console.log(`[useNotificationDetail] Notification ${notificationId} not found locally, fetching from remote API...`);

                const { data } = await fetchNotification({
                    variables: { id: notificationId },
                    fetchPolicy: 'network-only',
                });

                if (!data?.notification) {
                    throw new Error(`Notification ${notificationId} not found`);
                }

                const remoteNotification = data.notification as NotificationFragment;

                // Save to local DB for future use
                await saveNotificationToCache(remoteNotification);

                return remoteNotification;
            } catch (error) {
                console.error('[useNotificationDetail] Error:', error);
                throw error;
            }
        },
        enabled: !!notificationId,
        staleTime: 60000, // 1 minute - use cached data for 1 minute
        gcTime: 5 * 60 * 1000, // 5 minutes - keep in memory for 5 minutes
        retry: 1, // Retry once on failure
    });
}

/**
 * Hook for fetching unread counts by bucket
 * Optimized for performance - only returns unread counts
 * 
 * @example
 * ```tsx
 * const { data: unreadCounts, isLoading } = useUnreadCountsByBucket();
 * // unreadCounts is a Map<string, number> where key is bucketId
 * ```
 */
export function useUnreadCountsByBucket(): UseQueryResult<Map<string, number>> {
    return useQuery({
        queryKey: notificationKeys.unreadCounts(),
        queryFn: async (): Promise<Map<string, number>> => {
            try {
                const counts = await getUnreadCountsByBucket();
                return counts;
            } catch (error) {
                console.error('[useUnreadCountsByBucket] Error:', error);
                throw error;
            }
        },
        staleTime: 5000, // 5 seconds
        gcTime: 1 * 60 * 1000, // 1 minute
        refetchInterval: 10000, // Refresh every 10 seconds
    });
}

// ====================
// INFINITE QUERY HOOKS
// ====================

/**
 * Hook for infinite scroll notifications with automatic pagination
 * Uses useInfiniteQuery for better UX - never shows empty state during refetch
 * 
 * @example
 * ```tsx
 * const { 
 *   data, 
 *   fetchNextPage, 
 *   hasNextPage, 
 *   isFetchingNextPage 
 * } = useInfiniteNotifications({
 *   filters: { isRead: false },
 *   sort: { field: 'createdAt', direction: 'desc' },
 *   pageSize: 50,
 * });
 * 
 * // Flatten all pages
 * const notifications = data?.pages.flatMap(page => page.notifications) || [];
 * ```
 */
export function useInfiniteNotifications(
    options?: UseNotificationsOptions & { pageSize?: number }
): UseInfiniteQueryResult<InfiniteData<NotificationQueryResult>, Error> {
    const {
        filters,
        sort,
        pageSize = 50,
        refetchInterval = 0,
    } = options || {};

    return useInfiniteQuery({
        queryKey: notificationKeys.list(filters, sort, { limit: pageSize }),
        queryFn: async ({ pageParam = 0 }): Promise<NotificationQueryResult> => {
            try {
                const localResult = await queryNotifications({
                    filters,
                    sort,
                    pagination: { limit: pageSize, offset: pageParam },
                });

                return localResult;
            } catch (error) {
                console.error('[useInfiniteNotifications] Error:', error);
                throw error;
            }
        },
        getNextPageParam: (lastPage, allPages) => {
            const currentOffset = allPages.length * pageSize;
            const hasMore = lastPage.notifications.length === pageSize;
            return hasMore ? currentOffset : undefined;
        },
        initialPageParam: 0,
        refetchInterval, // Can still be used for periodic local DB refresh
        staleTime: 30000,
        gcTime: 5 * 60 * 1000,
    });
}

// ====================
// HELPER FUNCTIONS
// ====================

/**
 * Helper function to fetch notifications from GraphQL API
 */
async function fetchNotificationsFromAPI(
    fetchNotifications: ReturnType<typeof useGetNotificationsLazyQuery>[0]
): Promise<NotificationFragment[]> {
    const { data } = await fetchNotifications();
    return (data?.notifications || []) as NotificationFragment[];
}

/**
 * Helper function to delete notifications from server using mass delete mutation
 */
async function deleteNotificationsFromServer(
    massDeleteNotifications: ReturnType<typeof useMassDeleteNotificationsMutation>[0],
    notificationIds: string[]
): Promise<void> {
    if (notificationIds.length === 0) {
        return;
    }

    try {
        const result = await massDeleteNotifications({ 
            variables: { ids: notificationIds } 
        });
        
        if (result.data?.massDeleteNotifications.success) {
            console.log(`[deleteNotificationsFromServer] Successfully deleted ${result.data.massDeleteNotifications.deletedCount} notifications from server`);
        }
    } catch (err) {
        console.warn(`[deleteNotificationsFromServer] Failed to delete ${notificationIds.length} notifications:`, err);
        throw err;
    }
}

// ====================
// SYNC UTILITIES
// ====================

/**
 * Hook for syncing notifications from API on app startup
 * Should only be called once during app initialization
 * 
 * @example
 * ```tsx
 * // In App.tsx or root component
 * function App() {
 *   const { syncNotifications } = useSyncNotificationsFromAPI();
 *   
 *   useEffect(() => {
 *     syncNotifications().catch(console.error);
 *   }, []);
 * }
 * ```
 */
export function useSyncNotificationsFromAPI() {
    const [fetchNotifications] = useGetNotificationsLazyQuery();
    const [massDeleteNotifications] = useMassDeleteNotificationsMutation();

    const syncNotifications = async (): Promise<number> => {
        try {
            console.log('[syncNotifications] Fetching notifications from server...');

            const apiNotifications = await fetchNotificationsFromAPI(fetchNotifications);

            if (apiNotifications.length > 0) {
                console.log(`[syncNotifications] Fetched ${apiNotifications.length} notifications`);

                await upsertNotificationsBatch(apiNotifications);
                console.log(`[syncNotifications] Saved ${apiNotifications.length} to local DB`);

                const notificationIds = apiNotifications.map((n: NotificationFragment) => n.id);
                await deleteNotificationsFromServer(massDeleteNotifications, notificationIds);
                console.log(`[syncNotifications] Deleted ${apiNotifications.length} from server`);

                return apiNotifications.length;
            }

            console.log('[syncNotifications] No new notifications');
            return 0;
        } catch (error) {
            console.error('[syncNotifications] Sync failed:', error);
            throw error;
        }
    };

    return { syncNotifications };
}

/**
 * Invalidate all notification queries to refresh from local DB
 * Should be called when a push notification is received
 * (notification is already saved in DB by push notification system)
 * 
 * @example
 * ```tsx
 * // When push notification arrives (already saved in DB)
 * await refreshNotificationQueries(queryClient);
 * // All lists will automatically refetch from local DB
 * ```
 */
export async function refreshNotificationQueries(
    queryClient: any
): Promise<void> {
    try {
        console.log('[refreshNotificationQueries] Invalidating all notification queries...');

        // Invalidate all relevant queries to trigger refetch from local DB
        await queryClient.invalidateQueries({ queryKey: notificationKeys.all });

        console.log('[refreshNotificationQueries] Queries invalidated, lists will refresh');
    } catch (error) {
        console.error('[refreshNotificationQueries] Failed to invalidate queries:', error);
        throw error;
    }
}

// ====================
// PREFETCH UTILITIES
// ====================

/**
 * Utility to prefetch notifications
 * Useful for optimistic navigation
 * 
 * @example
 * ```tsx
 * import { useQueryClient } from '@tanstack/react-query';
 * import { prefetchNotifications } from '@/hooks/notifications/useNotificationQueries';
 * 
 * function MyComponent() {
 *   const queryClient = useQueryClient();
 *   
 *   const handleMouseEnter = () => {
 *     prefetchNotifications(queryClient, { filters: { isRead: false } });
 *   };
 * }
 * ```
 */
export async function prefetchNotifications(
    queryClient: any, // QueryClient
    options?: UseNotificationsOptions
): Promise<void> {
    const { filters, sort, pagination } = options || {};

    await queryClient.prefetchQuery({
        queryKey: notificationKeys.list(filters, sort, pagination),
        queryFn: async () => {
            const localResult = await queryNotifications({ filters, sort, pagination });
            return localResult;
        },
    });
}

/**
 * Utility to prefetch bucket notifications
 */
export async function prefetchBucketNotifications(
    queryClient: any,
    options: UseBucketNotificationsOptions
): Promise<void> {
    const { bucketId, filters, sort, pagination } = options;

    await queryClient.prefetchQuery({
        queryKey: notificationKeys.bucket(bucketId, filters, sort, pagination),
        queryFn: async () => {
            const localResult = await queryBucketNotifications(bucketId, { filters, sort, pagination });
            return localResult;
        },
    });
}
