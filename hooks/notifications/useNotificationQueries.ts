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
                console.log('[useNotificationsState] Starting notifications state initialization...');

                // STEP 1: Get ALL notification stats first (this includes orphaned buckets)
                const allNotificationStats = await getNotificationStats([]);
                const allBucketFromNotifications = allNotificationStats.byBucket ?? [];


                // STEP 2: Try to sync notifications from API
                let notifications: NotificationFragment[] = [];
                let notificationSyncSuccess = false;

                try {
                    const { data } = await fetchNotifications();
                    notifications = (data?.notifications ?? []) as NotificationFragment[];

                    if (notifications.length > 0) {
                        // Save notifications to local DB
                        await upsertNotificationsBatch(notifications);
                    }

                    notificationSyncSuccess = true;
                } catch (error) {
                    console.warn('[useNotificationsState] Failed to sync notifications from API, using cache:', error);

                    // Load from local cache as fallback
                    notifications = await getAllNotificationsFromCache();
                }

                // STEP 3: Try to get buckets from API
                let apiBuckets: BucketWithUserData[] = [];
                let apiSuccess = false;

                try {
                    const result = await fetchBuckets();
                    // Check for Apollo errors (can be in result.error or result.error.networkError)
                    if (result.error) {
                        const apolloError = result.error;
                        // Network errors indicate API is unreachable
                        if (apolloError.networkError || apolloError.message?.includes('Network request failed')) {
                            throw new Error('Network request failed');
                        }
                        // For other GraphQL errors, still throw but they might be different issues
                        throw apolloError;
                    }
                    // If data is null/undefined, treat it as failure (network error)
                    if (!result.data) {
                        throw new Error('No data returned from API');
                    }
                    apiBuckets = (result.data.buckets ?? []) as BucketWithUserData[];
                    
                    // Heuristic: If API returns 0 buckets but we have cached buckets,
                    // it's likely the API is offline and returning empty/default response
                    // Check cache to decide if this is a real empty result or API failure
                    const cachedBuckets = await getAllBuckets();
                    if (apiBuckets.length === 0 && cachedBuckets.length > 0) {
                        console.warn('[useNotificationsState] API returned 0 buckets but cache has buckets - treating as API offline');
                        throw new Error('API likely offline (empty response but cache has data)');
                    }
                    
                    apiSuccess = true;
                    console.log(`[useNotificationsState] Successfully fetched ${apiBuckets.length} buckets from API`);
                } catch (error: any) {
                    // Network errors or GraphQL errors mean API is unreachable
                    const isNetworkError = error?.networkError || 
                                          error?.message?.includes('Network request failed') ||
                                          error?.message?.includes('fetch') ||
                                          error?.message?.includes('API likely offline') ||
                                          error?.code === 'NETWORK_ERROR';
                    
                    if (isNetworkError) {
                        console.warn('[useNotificationsState] Network error fetching buckets from API, attempting to use cache');
                    } else {
                        console.warn('[useNotificationsState] Failed to sync buckets from API, attempting to use cache:', error);
                    }
                    apiSuccess = false;
                }

                // STEP 4: If API failed, try to get buckets from cache
                if (!apiSuccess) {
                    const cachedBuckets = await getAllBuckets();
                    if (cachedBuckets.length > 0) {
                        console.log(`[useNotificationsState] Using ${cachedBuckets.length} buckets from cache (API offline)`);
                        // Convert cached buckets to API format
                        apiBuckets = cachedBuckets.map(bucket => ({
                            id: bucket.id,
                            name: bucket.name,
                            description: bucket.description,
                            icon: bucket.icon,
                            iconAttachmentUuid: bucket.iconAttachmentUuid,
                            color: bucket.color,
                            createdAt: bucket.createdAt,
                            updatedAt: bucket.updatedAt,
                            isProtected: bucket.isProtected,
                            isPublic: bucket.isPublic,
                            isAdmin: bucket.isAdmin,
                            userBucket: bucket.userBucket,
                            user: bucket.user,
                            permissions: bucket.permissions,
                            userPermissions: bucket.userPermissions,
                        })) as BucketWithUserData[];
                    } else {
                        console.warn('[useNotificationsState] No cached buckets found, bucket list will be empty');
                    }
                }

                // STEP 5: Save API buckets to cache if we got them from API
                if (apiSuccess && apiBuckets.length > 0) {
                    const bucketsToSave: BucketData[] = apiBuckets.map(bucket => ({
                        id: bucket.id,
                        name: bucket.name,
                        icon: bucket.icon,
                        iconAttachmentUuid: bucket.iconAttachmentUuid,
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
                    }));

                    await saveBuckets(bucketsToSave);
                }

                // STEP 6: Identify orphaned buckets (exist in notifications but not in API/cache)
                // IMPORTANT: When backend is unreachable and we relied entirely on cache (apiSuccess === false),
                // we do NOT mark any buckets as orphan/dangling to prevent confusing UX while offline.
                // Orphaned buckets are only detected when we have a successful API response to compare against.
                const apiBucketIds = new Set(apiBuckets.map(b => b.id));
                const orphanedFullBuckets = apiSuccess
                    ? allBucketFromNotifications.filter(bucket => !apiBucketIds.has(bucket.bucketId))
                    : [];

                if (!apiSuccess && orphanedFullBuckets.length > 0) {
                    console.warn(`[useNotificationsState] Skipping ${orphanedFullBuckets.length} potential orphaned buckets (API offline, using cache)`);
                }


                // STEP 7: Create orphaned bucket entries
                const orphanedBuckets: BucketWithStats[] = orphanedFullBuckets.map(bucket => {
                    const bucketStat = allNotificationStats.byBucket?.find(s => s.bucketId === bucket.bucketId);

                    return {
                        id: bucket.bucketId,
                        name: bucket.bucketName ?? `Bucket ${bucket.bucketId.slice(0, 8)}`,
                        description: null,
                        icon: null,
                        iconAttachmentUuid: null,
                        color: null,
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                        isProtected: false,
                        isPublic: false,
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
                });

                // STEP 8: Create API bucket entries
                const apiBucketIdsForStats = apiBuckets.map((b) => b.id);
                const apiNotificationStats = await getNotificationStats(apiBucketIdsForStats);

                const apiBucketsWithStats: BucketWithStats[] = apiBuckets.map((bucket) => {
                    const bucketStat = apiNotificationStats.byBucket?.find(s => s.bucketId === bucket.id);
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
                        isOrphan: false, // Not orphan
                    };
                });

                // STEP 9: Combine all buckets
                const allBucketsWithStats = [...apiBucketsWithStats, ...orphanedBuckets];

                // STEP 10: Sort by: 1) unreadCount desc, 2) lastNotificationAt desc, 3) name asc
                allBucketsWithStats.sort((a, b) => {
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

                // STEP 11: Get final notification stats (includes all buckets)
                const finalStats = await getNotificationStats([]);

                console.log(`[useNotificationsState] Complete Loaded ${notifications.length} notifications, ${allBucketsWithStats.length} buckets (${apiBucketsWithStats.length} API + ${orphanedBuckets.length} orphaned), ${finalStats.totalCount} total notifications (${finalStats.unreadCount} unread)`);

                return {
                    buckets: allBucketsWithStats,
                    notifications,
                    stats: finalStats,
                    lastSync: new Date().toISOString(),
                };

            } catch (error) {
                console.error('[useNotificationsState] Error:', error);
                throw error;
            }
        },
        enabled: true, // ✅ Always enabled - data is essential for the app
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
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