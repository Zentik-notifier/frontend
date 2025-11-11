/**
 * React Query hooks for notification queries
 * Provides hooks for fetching notifications with local DB sync
 */

import {
    BucketData,
    getAllBuckets,
    saveBuckets
} from '@/db/repositories/buckets-repository';
import {
    getAllNotificationIds,
    getNotificationById,
    getNotificationStats,
    queryNotifications
} from '@/db/repositories/notifications-query-repository';
import {
    GetBucketsQuery,
    NotificationFragment,
    useGetBucketsLazyQuery,
    useGetNotificationsLazyQuery
} from '@/generated/gql-operations-generated';
import {
    getAllNotificationsFromCache,
    upsertNotificationsBatch
} from '@/services/notifications-repository';
import {
    BucketWithStats,
    NotificationQueryResult,
    NotificationStats,
    UseBucketsStatsOptions,
    UseNotificationsOptions
} from '@/types/notifications';
import { useInfiniteQuery, useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { mediaCache } from '@/services/media-cache-service';

/**
 * Query keys for notification-related queries
 * Centralized key management for React Query
 */
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (bucketIds?: string[], unreadOnly?: boolean, withAttachments?: boolean, limit?: number) =>
        [...notificationKeys.lists(), { bucketIds, unreadOnly, withAttachments, limit }] as const,
    detail: (id: string) => [...notificationKeys.all, 'detail', id] as const,
    stats: () => [...notificationKeys.all, 'stats'] as const,
    stat: (bucketIds?: string[]) => [...notificationKeys.stats(), { bucketIds }] as const,
    bucketStat: (bucketId: string) => [...notificationKeys.stats(), 'bucket', bucketId] as const,
    bucketsStats: () => [...notificationKeys.all, 'bucketsStats'] as const,
    allIds: (bucketIds?: string[], unreadOnly?: boolean, withAttachments?: boolean) =>
        [...notificationKeys.all, 'allIds', { bucketIds, unreadOnly, withAttachments }] as const,
};

/**
 * Hook for fetching notifications with pagination and local DB sync
 * 
 * @example
 * ```tsx
 * const { data, isLoading, fetchNextPage, hasNextPage } = useInfiniteNotifications({
 *   bucketIds: ['bucket-1', 'bucket-2'],
 *   unreadOnly: true,
 * });
 * ```
 */
/**
 * Type for infinite query result with pages
 */
type InfiniteQueryResult<T> = {
    pages: T[];
    pageParams: unknown[];
};

export function useInfiniteNotifications(
    options?: UseNotificationsOptions
) {
    const {
        filters,
        sort,
        pagination,
        realtime = false,
        refetchInterval = 0,
    } = options || {};

    const limit = pagination?.limit || 20;

    return useInfiniteQuery({
        queryKey: notificationKeys.list(
            filters?.bucketId ? [filters.bucketId] : undefined,
            filters?.isRead === false,
            filters?.hasAttachments,
            limit
        ),
        queryFn: async ({ pageParam = 0 }): Promise<NotificationQueryResult> => {
            try {
                const result = await queryNotifications({
                    filters,
                    sort,
                    pagination: {
                        limit,
                        offset: (pageParam as number) * limit,
                    }
                });
                // console.log(`[useInfiniteNotifications] Loaded ${result.notifications.length} notifications (page ${pageParam})`);
                return result;
            } catch (error) {
                console.error('[useInfiniteNotifications] Error:', error);
                throw error;
            }
        },
        initialPageParam: 0,
        getNextPageParam: (lastPage: NotificationQueryResult, allPages) => {
            // If we got fewer notifications than the limit, we've reached the end
            if (lastPage.notifications.length < limit) {
                return undefined;
            }
            // Otherwise, return the next page number
            return allPages.length;
        },
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
        refetchOnWindowFocus: false, // ✅ Disable auto-refetch on focus to prevent conflicts with Watch sync
        refetchOnMount: false, // ✅ Only fetch on initial mount
        staleTime: 10000, // 10 seconds
        gcTime: 10 * 60 * 1000, // 10 minutes
        ...options,
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
                const notification = await getNotificationById(notificationId);
                return notification;
            } catch (error) {
                console.error('[useNotification] Error:', error);
                throw error;
            }
        },
        ...queryOptions,
    });
}

/**
 * SINGLE UNIFIED QUERY: Complete app state initialization
 * This replaces ALL fragmented queries and ensures complete consistency
 * 
 * Manages:
 * - Bucket stats (API + orphaned from notifications)
 * - Notification stats (overall + by bucket)
 * - Notification sync from API
 * - Bucket sync from API
 * - Cache management
 * - Orphaned data cleanup
 * 
 * @example
 * ```tsx
 * const { data: appState, isLoading, refreshAll } = useNotificationsState({
 *   realtime: true, // Auto-refresh every 5 seconds
 * });
 * 
 * // appState contains everything: buckets, notifications, stats
 * // Data is SHARED across all components - updates propagate automatically
 * 
 * // To refresh everything from API:
 * await refreshAll();
 * ```
 */
export function useNotificationsState(
    options?: UseBucketsStatsOptions
): UseQueryResult<{
    buckets: BucketWithStats[];
    notifications: NotificationFragment[];
    stats: NotificationStats;
    lastSync: string;
}> & { refreshAll: () => Promise<void> } {
    const queryClient = useQueryClient();
    const {
        realtime = false,
        refetchInterval = 0,
        forceFullDetails = false,
    } = options || {};

    // Use lazy queries for manual control
    const [fetchBuckets] = useGetBucketsLazyQuery({
        fetchPolicy: 'network-only', // Don't use Apollo cache
    });
    const [fetchNotifications] = useGetNotificationsLazyQuery({
        fetchPolicy: 'network-only', // Don't use Apollo cache
    });

    // Type for bucket from GetBucketsQuery (includes userBucket)
    type BucketWithUserData = NonNullable<GetBucketsQuery['buckets']>[number];

    const queryResult = useQuery({
        queryKey: ['app-state'],
        queryFn: async (): Promise<{
            buckets: BucketWithStats[];
            notifications: NotificationFragment[];
            stats: NotificationStats;
            lastSync: string;
        }> => {
            try {
                console.log('[useNotificationsState] Starting simplified state initialization...');

                // ============================================================
                // PHASE 1: Load from cache (FAST - immediate response)
                // ============================================================
                const cachedNotifications = await getAllNotificationsFromCache();
                const cachedBuckets = await getAllBuckets();

                // Preload icons immediately from cache (non-blocking)
                Promise.all(
                    cachedBuckets.map(async (bucket) => {
                        try {
                            await mediaCache.getBucketIcon(
                                bucket.id,
                                bucket.name,
                                bucket.iconUrl ?? undefined
                            );
                        } catch (error) {
                            console.debug(`[useNotificationsState] Failed to preload icon for ${bucket.name}:`, error);
                        }
                    })
                ).then(() => {
                    console.log(`[useNotificationsState] Preloaded ${cachedBuckets.length} bucket icons`);
                }).catch((error) => {
                    console.error('[useNotificationsState] Error preloading bucket icons:', error);
                });

                // Calculate stats from cache
                const cachedStats = await getNotificationStats([]);

                console.log(`[useNotificationsState] Cache loaded: ${cachedNotifications.length} notifications, ${cachedBuckets.length} buckets, ${cachedStats.totalCount} total (${cachedStats.unreadCount} unread)`);

                // ============================================================
                // PHASE 2: Fetch from API in parallel (SLOW - background update)
                // ============================================================
                const [notificationsResult, bucketsResult] = await Promise.allSettled([
                    fetchNotifications(),
                    fetchBuckets(),
                ]);

                // Process notifications from API
                const apiNotifications: NotificationFragment[] = [];

                // Process buckets from API
                let apiBuckets: BucketWithUserData[] = [];
                let apiSuccess = false;
                
                if (bucketsResult.status === 'fulfilled' && bucketsResult.value.data?.buckets) {
                    apiBuckets = bucketsResult.value.data.buckets as BucketWithUserData[];
                    apiSuccess = true;
                    console.log(`[useNotificationsState] API synced: ${apiBuckets.length} buckets`);
                } else {
                    console.warn('[useNotificationsState] Failed to fetch buckets from API:', 
                        bucketsResult.status === 'rejected' ? bucketsResult.reason : 'No data');
                }

                // ============================================================
                // PHASE 3: Merge cache + API and detect orphans
                // ============================================================
                
                // Calculate fresh stats after API sync
                const freshStats = await getNotificationStats([]);
                const allBucketFromNotifications = freshStats.byBucket ?? [];

                let finalBuckets: BucketWithStats[];

                if (apiSuccess && apiBuckets.length > 0) {
                    // API is available: merge API buckets with orphans
                    const apiBucketIds = new Set(apiBuckets.map(b => b.id));
                    
                    // Identify orphans: buckets in cache but NOT in API
                    const orphanedCachedBuckets = cachedBuckets.filter(b => !apiBucketIds.has(b.id));
                    
                    // Also check notification stats for buckets not in API (true orphans)
                    const orphanedFromNotifications = allBucketFromNotifications
                        .filter(bucket => !apiBucketIds.has(bucket.bucketId))
                        .map(bucket => bucket.bucketId);
                    
                    const allOrphanIds = new Set([
                        ...orphanedCachedBuckets.map(b => b.id),
                        ...orphanedFromNotifications
                    ]);

                    console.log(`[useNotificationsState] Detected ${allOrphanIds.size} orphaned buckets`);

                    // Convert API buckets to BucketWithStats
                    const apiBucketsWithStats: BucketWithStats[] = apiBuckets.map((bucket) => {
                        const bucketStat = freshStats.byBucket?.find(s => s.bucketId === bucket.id);
                        const snoozeUntil = bucket.userBucket?.snoozeUntil;
                        const isSnoozed = snoozeUntil
                            ? new Date().getTime() < new Date(snoozeUntil).getTime()
                            : false;

                        return {
                            id: bucket.id,
                            name: bucket.name,
                            description: bucket.description,
                            icon: bucket.icon,
                            iconAttachmentUuid: bucket.iconAttachmentUuid,
                            iconUrl: bucket.iconUrl,
                            color: bucket.color,
                            createdAt: bucket.createdAt,
                            updatedAt: bucket.updatedAt,
                            isProtected: bucket.isProtected,
                            isPublic: bucket.isPublic,
                            isAdmin: bucket.isAdmin,
                            totalMessages: bucketStat?.totalCount ?? 0,
                            unreadCount: bucketStat?.unreadCount ?? 0,
                            lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                            isSnoozed,
                            snoozeUntil: snoozeUntil ?? null,
                            user: bucket.user,
                            permissions: bucket.permissions,
                            userPermissions: bucket.userPermissions,
                            userBucket: bucket.userBucket,
                            magicCode: bucket.userBucket?.magicCode ?? null,
                            isOrphan: false,
                        };
                    });

                    // Create orphaned bucket entries
                    const orphanedBuckets: BucketWithStats[] = Array.from(allOrphanIds).map(orphanId => {
                        // Try to get from cache first (has full data)
                        const cachedBucket = cachedBuckets.find(b => b.id === orphanId);
                        const bucketStat = freshStats.byBucket?.find(s => s.bucketId === orphanId);
                        const notificationBucket = allBucketFromNotifications.find(b => b.bucketId === orphanId);

                        if (cachedBucket) {
                            // Use cached bucket data
                            return {
                                id: cachedBucket.id,
                                name: cachedBucket.name,
                                description: cachedBucket.description,
                                icon: cachedBucket.icon,
                                iconAttachmentUuid: cachedBucket.iconAttachmentUuid,
                                iconUrl: cachedBucket.iconUrl,
                                color: cachedBucket.color,
                                createdAt: cachedBucket.createdAt,
                                updatedAt: cachedBucket.updatedAt,
                                isProtected: cachedBucket.isProtected ?? false,
                                isPublic: cachedBucket.isPublic ?? false,
                                isAdmin: cachedBucket.isAdmin ?? false,
                                totalMessages: bucketStat?.totalCount ?? 0,
                                unreadCount: bucketStat?.unreadCount ?? 0,
                                lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                                isSnoozed: false,
                                snoozeUntil: null,
                                user: cachedBucket.user,
                                permissions: cachedBucket.permissions ?? [],
                                userPermissions: cachedBucket.userPermissions,
                                userBucket: cachedBucket.userBucket,
                                magicCode: cachedBucket.userBucket?.magicCode ?? null,
                                isOrphan: true,
                            };
                        } else {
                            // Create minimal bucket from notification data
                            return {
                                id: orphanId,
                                name: notificationBucket?.bucketName ?? `Bucket ${orphanId.slice(0, 8)}`,
                                description: null,
                                icon: null,
                                iconAttachmentUuid: null,
                                iconUrl: null,
                                color: null,
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                isProtected: false,
                                isPublic: false,
                                isAdmin: false,
                                totalMessages: bucketStat?.totalCount ?? 0,
                                unreadCount: bucketStat?.unreadCount ?? 0,
                                lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                                isSnoozed: false,
                                snoozeUntil: null,
                                user: null,
                                permissions: [],
                                userBucket: null,
                                isOrphan: true,
                            };
                        }
                    });

                    // Save API buckets + orphans to cache
                    const bucketsToSave: BucketData[] = [
                        ...apiBuckets.map(bucket => ({
                            id: bucket.id,
                            name: bucket.name,
                            icon: bucket.icon,
                            iconAttachmentUuid: bucket.iconAttachmentUuid,
                            iconUrl: bucket.iconUrl,
                            description: bucket.description,
                            updatedAt: bucket.updatedAt,
                            color: bucket.color,
                            createdAt: bucket.createdAt,
                            isProtected: bucket.isProtected,
                            isPublic: bucket.isPublic,
                            isAdmin: bucket.isAdmin,
                            userBucket: bucket.userBucket,
                            user: bucket.user,
                            permissions: bucket.permissions,
                            userPermissions: bucket.userPermissions,
                            isOrphan: false,
                        })),
                        ...orphanedBuckets.map(bucket => ({
                            id: bucket.id,
                            name: bucket.name,
                            icon: bucket.icon,
                            iconAttachmentUuid: bucket.iconAttachmentUuid,
                            iconUrl: bucket.iconUrl,
                            description: bucket.description,
                            updatedAt: bucket.updatedAt,
                            color: bucket.color,
                            createdAt: bucket.createdAt,
                            isProtected: bucket.isProtected,
                            isPublic: bucket.isPublic,
                            isAdmin: bucket.isAdmin ?? false,
                            userBucket: bucket.userBucket,
                            user: bucket.user,
                            permissions: bucket.permissions,
                            userPermissions: bucket.userPermissions,
                            isOrphan: true,
                        }))
                    ];

                    await saveBuckets(bucketsToSave);
                    console.log(`[useNotificationsState] Saved ${bucketsToSave.length} buckets to cache (${apiBuckets.length} API + ${orphanedBuckets.length} orphans)`);

                    // Combine all buckets
                    finalBuckets = [...apiBucketsWithStats, ...orphanedBuckets];
                } else {
                    // API offline: use cache only
                    console.log('[useNotificationsState] API offline - using cache only');
                    
                    finalBuckets = cachedBuckets.map((bucket) => {
                        const bucketStat = freshStats.byBucket?.find(s => s.bucketId === bucket.id);
                        const snoozeUntil = bucket.userBucket?.snoozeUntil;
                        const isSnoozed = snoozeUntil
                            ? new Date().getTime() < new Date(snoozeUntil).getTime()
                            : false;

                        return {
                            id: bucket.id,
                            name: bucket.name,
                            description: bucket.description,
                            icon: bucket.icon,
                            iconAttachmentUuid: bucket.iconAttachmentUuid,
                            iconUrl: bucket.iconUrl,
                            color: bucket.color,
                            createdAt: bucket.createdAt,
                            updatedAt: bucket.updatedAt,
                            isProtected: bucket.isProtected ?? false,
                            isPublic: bucket.isPublic ?? false,
                            isAdmin: bucket.isAdmin ?? false,
                            totalMessages: bucketStat?.totalCount ?? 0,
                            unreadCount: bucketStat?.unreadCount ?? 0,
                            lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                            isSnoozed,
                            snoozeUntil: snoozeUntil ?? null,
                            user: bucket.user,
                            permissions: bucket.permissions ?? [],
                            userPermissions: bucket.userPermissions,
                            userBucket: bucket.userBucket,
                            magicCode: bucket.userBucket?.magicCode ?? null,
                            isOrphan: bucket.isOrphan ?? false,
                        };
                    });
                }

                // Sort buckets: 1) unreadCount desc, 2) lastNotificationAt desc, 3) name asc
                finalBuckets.sort((a, b) => {
                    if (a.unreadCount !== b.unreadCount) {
                        return b.unreadCount - a.unreadCount;
                    }
                    const aTime = a.lastNotificationAt ? new Date(a.lastNotificationAt).getTime() : 0;
                    const bTime = b.lastNotificationAt ? new Date(b.lastNotificationAt).getTime() : 0;
                    if (aTime !== bTime) {
                        return bTime - aTime;
                    }
                    return a.name.localeCompare(b.name);
                });

                // After API sync, re-fetch from cache to get the complete merged state
                const finalNotifications = apiNotifications.length > 0 
                    ? await getAllNotificationsFromCache() 
                    : cachedNotifications;

                console.log(`[useNotificationsState] ✅ Complete: ${finalNotifications.length} notifications, ${finalBuckets.length} buckets, ${freshStats.totalCount} total (${freshStats.unreadCount} unread)`);

                return {
                    buckets: finalBuckets,
                    notifications: finalNotifications,
                    stats: freshStats,
                    lastSync: new Date().toISOString(),
                };

            } catch (error) {
                console.error('[useNotificationsState] Error:', error);
                throw error;
            }
        },
        enabled: true, // ✅ Always enabled - data is essential for the app
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
        refetchOnWindowFocus: false, // ✅ Disable auto-refetch on focus to prevent conflicts with Watch sync
        refetchOnMount: false, // ✅ Only fetch on initial mount
        staleTime: forceFullDetails ? 0 : 30000, // ✅ 30 seconds stale time for normal use
        gcTime: Infinity, // ✅ Keep in cache forever (until app restart)
    });

    /**
     * Refresh everything from API and re-calculate stats
     * Forces a fresh fetch from the server
     * Updates ALL components using useNotificationsState automatically
     */
    const refreshAll = async (): Promise<void> => {
        try {
            // Force refetch
            // This ensures fresh data from the server
            await queryClient.refetchQueries({
                queryKey: ['app-state'],
                type: 'active', // Only refetch if query is mounted
            });
        } catch (error) {
            console.error('[refreshAll] Error refreshing complete app state:', error);
            throw error;
        }
    };

    return {
        ...queryResult,
        refreshAll,
    };
}

/**
 * Hook for fetching all notification IDs matching the given filters
 * Useful for "select all" functionality
 * 
 * @example
 * ```tsx
 * const { data: notificationIds, isLoading } = useAllNotificationIds({
 *   bucketIds: ['bucket-1', 'bucket-2'],
 *   unreadOnly: true,
 * });
 * ```
 */
export function useAllNotificationIds(
    options?: UseNotificationsOptions
): UseQueryResult<string[]> {
    const {
        filters,
        realtime = false,
        refetchInterval = 0,
    } = options || {};

    return useQuery({
        queryKey: notificationKeys.allIds(
            filters?.bucketId ? [filters.bucketId] : undefined,
            filters?.isRead === false,
            filters?.hasAttachments
        ),
        queryFn: async (): Promise<string[]> => {
            try {
                const ids = await getAllNotificationIds();
                console.log(`[useAllNotificationIds] Loaded ${ids.length} notification IDs`);
                return ids;
            } catch (error) {
                console.error('[useAllNotificationIds] Error:', error);
                throw error;
            }
        },
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
        refetchOnWindowFocus: false, // ✅ Disable auto-refetch on focus to prevent conflicts with Watch sync
        refetchOnMount: false, // ✅ Only fetch on initial mount
        staleTime: 10000, // 10 seconds
        gcTime: 2 * 60 * 1000, // 2 minutes
    });
}

/**
 * Utility function to refresh all notification-related queries
 * Useful for manual refresh after mutations
 * 
 * @example
 * ```tsx
 * await refreshNotificationQueries(queryClient);
 * ```
 */
export async function refreshNotificationQueries(
    queryClient: any
): Promise<void> {
    try {
        console.log('[refreshNotificationQueries] Invalidating all notification queries...');

        // Invalidate all notification-related queries
        await queryClient.invalidateQueries({
            predicate: (query: any) => {
                return query.queryKey?.[0] === 'notifications' ||
                    query.queryKey?.[0] === 'app-state';
            }
        });

        console.log('[refreshNotificationQueries] Queries invalidated, lists will refresh');
    } catch (error) {
        console.error('[refreshNotificationQueries] Failed to invalidate queries:', error);
        throw error;
    }
}

/**
 * Proxy function to clear all notifications from cache with proper query cleanup
 * This centralizes the cleanup logic in the queries layer rather than the repository
 * 
 * @example
 * ```tsx
 * import { clearAllNotificationsFromCache } from '@/hooks/notifications/useNotificationQueries';
 * 
 * await clearAllNotificationsFromCache(queryClient);
 * ```
 */
export async function clearAllNotificationsFromCache(queryClient?: any): Promise<void> {
    console.log('[clearAllNotificationsFromCache] Starting notification cache clear with query cleanup...');

    try {
        // Import the repository function dynamically to avoid circular dependencies
        const { clearAllNotificationsFromCache: repositoryClear } = await import('@/services/notifications-repository');

        // Call the repository function WITHOUT queryClient (no cleanup there)
        await repositoryClear();

        // Handle query cleanup here in the queries layer
        if (queryClient) {
            console.log('[clearAllNotificationsFromCache] Invalidating notification queries...');
            await Promise.all([
                queryClient.invalidateQueries({
                    queryKey: notificationKeys.stats(),
                    refetchType: 'none', // Don't refetch immediately
                }),
                queryClient.invalidateQueries({
                    queryKey: notificationKeys.bucketsStats(),
                    refetchType: 'none',
                }),
                queryClient.invalidateQueries({
                    queryKey: ['app-state'],
                    refetchType: 'none',
                }),
                queryClient.invalidateQueries({
                    queryKey: notificationKeys.lists(),
                    refetchType: 'none',
                }),
            ]);
            console.log('[clearAllNotificationsFromCache] Notification queries invalidated');
        }

        console.log('[clearAllNotificationsFromCache] Notification cache clear completed successfully');
    } catch (error) {
        console.error('[clearAllNotificationsFromCache] Failed to clear notification cache:', error);
        throw error;
    }
}