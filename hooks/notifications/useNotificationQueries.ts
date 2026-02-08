/**
 * React Query hooks for notification queries
 * Provides hooks for fetching notifications with local DB sync
 */

import {
    getAllBuckets,
} from '@/db/repositories/buckets-repository';
import {
    getAllNotificationIds,
    getNotificationById,
    getNotificationStats,
    queryNotifications
} from '@/db/repositories/notifications-query-repository';
import {
    NotificationFragment,
} from '@/generated/gql-operations-generated';
import {
    getAllNotificationsFromCache,
} from '@/services/notifications-repository';
import { mediaCache } from '@/services/media-cache-service';
import {
    BucketWithStats,
    NotificationQueryResult,
    NotificationStats,
    UseBucketsStatsOptions,
    UseNotificationsOptions
} from '@/types/notifications';
import { useContext } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useInfiniteQuery, useQuery, useQueryClient, UseQueryOptions, UseQueryResult } from '@tanstack/react-query';
import { useNetworkSync } from './useNetworkSync';

/**
 * Query keys for notification-related queries
 * Centralized key management for React Query
 */
export const notificationKeys = {
    all: ['notifications'] as const,
    lists: () => [...notificationKeys.all, 'list'] as const,
    list: (filters?: any, sort?: any, limit?: number) =>
        [...notificationKeys.lists(), { filters, sort, limit }] as const,
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
        queryKey: notificationKeys.list(filters, sort, limit),
        queryFn: async ({ pageParam = 0 }): Promise<NotificationQueryResult> => {
            try {
                // console.log(`[useInfiniteNotifications] Fetching page ${pageParam} with limit ${limit}...`);
                const result = await queryNotifications({
                    filters,
                    sort,
                    pagination: {
                        limit,
                        offset: (pageParam as number) * limit,
                    }
                });

                // Preload bucket icons for this page (non-blocking, deduped by MediaCacheService)
                // Extracts unique buckets from notifications and warms the in-memory icon cache
                // so BucketIcon components render icons instantly without triggering individual fetches
                const bucketInfoMap = new Map<string, { id: string; name: string; iconUrl?: string | null }>();
                for (const notif of result.notifications) {
                    const bucket = notif.message?.bucket;
                    if (bucket?.id && bucket?.name && !bucketInfoMap.has(bucket.id)) {
                        bucketInfoMap.set(bucket.id, {
                            id: bucket.id,
                            name: bucket.name,
                            iconUrl: bucket.iconUrl,
                        });
                    }
                }
                if (bucketInfoMap.size > 0) {
                    mediaCache.preloadBucketIcons(
                        Array.from(bucketInfoMap.values())
                    ).catch(() => {});
                }

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
}> & { refreshAll: (skipNetwork?: boolean) => Promise<{ networkTime: number; mergeTime: number }> } {
    const queryClient = useQueryClient();
    const appContext = useContext(AppContext);
    const isLoggedIn = !!appContext?.lastUserId;
    const { syncFromNetwork } = useNetworkSync();
    const {
        realtime = false,
        refetchInterval = 0,
        forceFullDetails = false,
    } = options || {};

    const queryResult = useQuery({
        queryKey: ['app-state'],
        enabled: isLoggedIn,
        queryFn: async (): Promise<{
            buckets: BucketWithStats[];
            notifications: NotificationFragment[];
            stats: NotificationStats;
            lastSync: string;
        }> => {
            try {
                // ============================================================
                // PHASE 1: Load from cache (FAST - immediate response)
                // ============================================================
                const cachedNotifications = await getAllNotificationsFromCache();
                const cachedBuckets = await getAllBuckets();

                const cachedStats = await getNotificationStats([]);

                // Backfill: preserve fields from previous React Query state
                // that may not be stored in the local DB fragment yet
                const prevState = queryClient.getQueryData<{
                    buckets: BucketWithStats[];
                }>(['app-state']);
                const prevBucketsMap = new Map(
                    (prevState?.buckets ?? []).map(b => [b.id, b])
                );

                // Build buckets with stats from cache
                const cachedBucketsWithStats: BucketWithStats[] = cachedBuckets.map((bucket) => {
                    const prev = prevBucketsMap.get(bucket.id);
                    const bucketStat = cachedStats.byBucket?.find(s => s.bucketId === bucket.id);
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
                        preset: bucket.preset ?? null,
                        externalNotifySystem: bucket.externalNotifySystem ?? prev?.externalNotifySystem ?? null,
                        externalSystemChannel: bucket.externalSystemChannel ?? prev?.externalSystemChannel ?? null,
                        totalMessages: bucketStat?.totalCount ?? 0,
                        unreadCount: bucketStat?.unreadCount ?? 0,
                        lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                        isSnoozed,
                        snoozeUntil: snoozeUntil ?? null,
                        user: bucket.user,
                        permissions: bucket.permissions ?? [],
                        userPermissions: bucket.userPermissions ?? prev?.userPermissions,
                        userBucket: bucket.userBucket,
                        magicCode: bucket.userBucket?.magicCode ?? null,
                        isOrphan: bucket.isOrphan ?? false,
                    };
                });

                // Sort buckets
                cachedBucketsWithStats.sort((a, b) => {
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

                // ============================================================
                // PHASE 2: Warm bucket icon cache (NON-BLOCKING)
                // Pre-load bucket icons into MediaCacheService memory cache
                // so BucketIcon components find them synchronously on first render
                // ============================================================
                const bucketsWithIcons = cachedBucketsWithStats.filter(b => b.iconUrl && b.name);
                if (bucketsWithIcons.length > 0) {
                    mediaCache.preloadBucketIcons(bucketsWithIcons).catch(() => {});
                }

                // ============================================================
                // PHASE 3: Return cache data immediately (FAST - UI updates)
                // ============================================================
                const cacheData = {
                    buckets: cachedBucketsWithStats,
                    notifications: cachedNotifications,
                    stats: cachedStats,
                    lastSync: new Date().toISOString(),
                };

                // ============================================================
                // PHASE 4: Fetch from API in background (SLOW - background update)
                // ============================================================
                // Start network sync in background (non-blocking)
                // This will update the query when complete
                syncFromNetwork().catch((error) => {
                    console.error('[useNotificationsState] Background network sync failed:', error);
                });

                // Return cache data immediately
                return cacheData;

            } catch (error) {
                console.error('[useNotificationsState] Error:', error);
                throw error;
            }
        },
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
        refetchOnWindowFocus: false, // ✅ Disable auto-refetch on focus to prevent conflicts with Watch sync
        refetchOnMount: true, // ✅ Refetch on mount to ensure fresh data (fixes unread count issue)
        staleTime: forceFullDetails ? 0 : 0, // ✅ Consider stale immediately to force refetch if needed
        gcTime: Infinity, // ✅ Keep in cache forever (until app restart)
    });

    /**
     * Refresh everything from API and re-calculate stats
     * Optimized flow:
     * 1. First: Do all local operations to fill cache immediately (FAST)
     * 2. Then: Fetch from backend and update local entities (SLOW) - uses useNetworkSync
     * 3. Finally: Update React Query cache to propagate changes
     * 
     * This ensures UI updates immediately with local data,
     * then refreshes with backend data when available
     */
    const refreshAll = async (skipNetwork: boolean = false): Promise<{ networkTime: number; mergeTime: number }> => {
        try {
            // ============================================================
            // PHASE 1: LOCAL OPERATIONS (FAST - fill cache immediately)
            // ============================================================
            
            // Load from cache
            const cachedNotifications = await getAllNotificationsFromCache();
            const cachedBuckets = await getAllBuckets();
            
            // Calculate fresh stats from local data
            const freshStats = await getNotificationStats([]);
            
            // Build buckets with stats from cache (no API yet)
            const finalBuckets: BucketWithStats[] = cachedBuckets.map((bucket) => {
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
                    preset: bucket.preset ?? null,
                    externalNotifySystem: bucket.externalNotifySystem ?? null,
                    externalSystemChannel: bucket.externalSystemChannel ?? null,
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

            // Sort buckets
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

            // Update React Query cache with local data (instant UI update)
            queryClient.setQueryData(['app-state'], {
                buckets: finalBuckets,
                notifications: cachedNotifications,
                stats: freshStats,
                lastSync: new Date().toISOString(),
            });

            // ============================================================
            // PHASE 2: BACKEND OPERATIONS (SLOW - uses useNetworkSync hook)
            // ============================================================
            if (!skipNetwork) {
                return await syncFromNetwork();
            }
            
            return { networkTime: 0, mergeTime: 0 };

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
                const ids = await getAllNotificationIds(filters);
                // console.log(`[useAllNotificationIds] Loaded ${ids.length} notification IDs`);
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
        // console.log('[refreshNotificationQueries] Invalidating all notification queries...');

        // Invalidate all notification-related queries
        await queryClient.invalidateQueries({
            predicate: (query: any) => {
                return query.queryKey?.[0] === 'notifications' ||
                    query.queryKey?.[0] === 'app-state';
            }
        });

        // console.log('[refreshNotificationQueries] Queries invalidated, lists will refresh');
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
    // console.log('[clearAllNotificationsFromCache] Starting notification cache clear with query cleanup...');

    try {
        // Import the repository function dynamically to avoid circular dependencies
        const { clearAllNotificationsFromCache: repositoryClear } = await import('@/services/notifications-repository');

        // Call the repository function WITHOUT queryClient (no cleanup there)
        await repositoryClear();

        // Handle query cleanup here in the queries layer
        if (queryClient) {
            // console.log('[clearAllNotificationsFromCache] Invalidating notification queries...');
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
            // console.log('[clearAllNotificationsFromCache] Notification queries invalidated');
        }

        // console.log('[clearAllNotificationsFromCache] Notification cache clear completed successfully');
    } catch (error) {
        console.error('[clearAllNotificationsFromCache] Failed to clear notification cache:', error);
        throw error;
    }
}