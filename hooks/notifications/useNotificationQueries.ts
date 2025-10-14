/**
 * React Query hooks for notification queries
 * Provides hooks for fetching notifications with local DB sync
 */

import {
    getBucketStats,
    getNotificationById,
    getNotificationStats,
    getUnreadCountsByBucket,
    queryNotifications
} from '@/db/repositories/notifications-query-repository';
import {
    getAllBuckets,
    saveBuckets,
    BucketData
} from '@/db/repositories/buckets-repository';
import {
    GetBucketsQuery,
    NotificationFragment,
    useGetBucketsLazyQuery,
    useGetNotificationLazyQuery,
    useGetNotificationsLazyQuery,
    useMassDeleteNotificationsMutation
} from '@/generated/gql-operations-generated';
import {
    saveNotificationToCache,
    upsertNotificationsBatch
} from '@/services/notifications-repository';
import {
    BucketStats,
    BucketWithStats,
    NotificationQueryResult,
    NotificationStats,
    UseBucketsStatsOptions,
    UseNotificationsOptions,
    UseNotificationStatsOptions,
} from '@/types/notifications';
import {
    InfiniteData,
    useInfiniteQuery,
    UseInfiniteQueryResult,
    useQuery,
    useQueryClient,
    UseQueryOptions,
    UseQueryResult,
} from '@tanstack/react-query';

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
    stats: () => [...notificationKeys.all, 'stats'] as const,
    stat: (bucketIds?: string[]) => [...notificationKeys.stats(), { bucketIds }] as const,
    bucketStats: () => [...notificationKeys.all, 'bucketStats'] as const,
    bucketStat: (bucketId: string) => [...notificationKeys.bucketStats(), bucketId] as const,
    bucketsStats: () => [...notificationKeys.all, 'bucketsStats'] as const,
    unreadCounts: () => [...notificationKeys.all, 'unreadCounts'] as const,
};

// ====================
// QUERY HOOKS
// ====================

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
    const queryClient = useQueryClient();

    return useQuery({
        queryKey: notificationKeys.bucketStat(bucketId),
        queryFn: async (): Promise<BucketStats> => {
            // Always read from global bucketsStats cache
            const bucketsStats = queryClient.getQueryData<BucketWithStats[]>(
                notificationKeys.bucketsStats()
            );
            
            const bucketFromGlobal = bucketsStats?.find(b => b.id === bucketId);
            
            if (bucketFromGlobal) {
                // Return stats from global cache
                return {
                    bucketId: bucketFromGlobal.id,
                    bucketName: bucketFromGlobal.name,
                    totalCount: bucketFromGlobal.totalMessages,
                    unreadCount: bucketFromGlobal.unreadCount,
                    readCount: bucketFromGlobal.totalMessages - bucketFromGlobal.unreadCount,
                    withAttachmentsCount: 0, // Not tracked in bucketsStats
                    lastNotificationDate: bucketFromGlobal.lastNotificationAt ?? undefined,
                };
            }

            // Fallback: calculate from local DB if not in global cache
            try {
                const stats = await getBucketStats(bucketId);
                return stats;
            } catch (error) {
                console.error('[useBucketStats] Error:', error);
                throw error;
            }
        },
        // React to changes: when global bucketsStats is invalidated, this will refetch
        staleTime: 0, // Always consider stale so it refetches on invalidation
        gcTime: 5 * 60 * 1000,
    });
}

/**
 * Hook for fetching all buckets with their notification statistics
 * GLOBAL SINGLETON - Uses React Query to cache buckets data globally
 * All components share the same cached data instance
 * 
 * @example
 * ```tsx
 * const { data: bucketsWithStats, isLoading, refreshBucketsStats } = useBucketsStats({
 *   realtime: true, // Auto-refresh every 5 seconds
 * });
 * 
 * // bucketsWithStats is BucketWithStats[] - sorted by unreadCount, lastNotificationAt, name
 * // Data is SHARED across all components - updates propagate automatically
 * 
 * // To refresh buckets from API and re-calculate stats:
 * await refreshBucketsStats();
 * ```
 */
export function useBucketsStats(
    options?: UseBucketsStatsOptions
): UseQueryResult<BucketWithStats[]> & { refreshBucketsStats: () => Promise<void> } {
    const queryClient = useQueryClient();
    const {
        realtime = false,
        refetchInterval = 0,
    } = options || {};

    // Use lazy query for manual control
    const [fetchBuckets] = useGetBucketsLazyQuery({
        fetchPolicy: 'network-only', // Don't use Apollo cache
    });

    // Type for bucket from GetBucketsQuery (includes userBucket)
    type BucketWithUserData = NonNullable<GetBucketsQuery['buckets']>[number];

    const queryResult = useQuery({
        queryKey: notificationKeys.bucketsStats(),
        queryFn: async (): Promise<BucketWithStats[]> => {
            try {
                console.log('[useBucketsStats] Fetching buckets from GraphQL...');
                
                // 1. Fetch buckets from GraphQL API
                const { data } = await fetchBuckets();
                const buckets = (data?.buckets ?? []) as BucketWithUserData[];
                
                console.log(`[useBucketsStats] Fetched ${buckets.length} buckets from API`);

                // 2. Save buckets to local DB for offline access
                if (buckets.length > 0) {
                    const bucketsToSave: BucketData[] = buckets.map(bucket => ({
                        id: bucket.id,
                        name: bucket.name,
                        icon: bucket.icon,
                        description: bucket.description,
                        updatedAt: bucket.updatedAt,
                        // Include all bucket fields for complete caching
                        color: bucket.color,
                        createdAt: bucket.createdAt,
                        isProtected: bucket.isProtected,
                        isPublic: bucket.isPublic,
                        userBucket: bucket.userBucket,
                    }));
                    
                    await saveBuckets(bucketsToSave);
                    console.log(`[useBucketsStats] Saved ${bucketsToSave.length} buckets to local DB`);
                }

                // 3. Get all bucket IDs
                const bucketIds = buckets.map((b) => b.id);

                // 4. Get notification stats from local DB
                const notificationStats = await getNotificationStats(bucketIds);

                // 5. Combine bucket metadata with stats
                const bucketsWithStats: BucketWithStats[] = buckets.map((bucket) => {
                    // Find stats for this bucket
                    const bucketStat = notificationStats.byBucket?.find(s => s.bucketId === bucket.id);

                    // Calculate isSnoozed from bucket.userBucket.snoozeUntil
                    const snoozeUntil = bucket.userBucket?.snoozeUntil;
                    const isSnoozed = snoozeUntil
                        ? new Date().getTime() < new Date(snoozeUntil).getTime()
                        : false;

                    return {
                        id: bucket.id,
                        name: bucket.name,
                        description: bucket.description,
                        icon: bucket.icon,
                        color: bucket.color,
                        createdAt: bucket.createdAt,
                        updatedAt: bucket.updatedAt,
                        isProtected: bucket.isProtected,
                        isPublic: bucket.isPublic,
                        totalMessages: bucketStat?.totalCount ?? 0,
                        unreadCount: bucketStat?.unreadCount ?? 0,
                        lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                        isSnoozed,
                        snoozeUntil: snoozeUntil ?? null,
                    };
                });

                // 6. Sort by: 1) unreadCount desc, 2) lastNotificationAt desc, 3) name asc
                bucketsWithStats.sort((a, b) => {
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

                console.log(`[useBucketsStats] Processed ${bucketsWithStats.length} buckets with stats`);
                return bucketsWithStats;
            } catch (error) {
                console.error('[useBucketsStats] Error:', error);
                throw error;
            }
        },
        enabled: false, // ✅ MANUAL FETCH ONLY - initialized by useCleanup
        refetchInterval: realtime ? (refetchInterval || 5000) : refetchInterval,
        staleTime: Infinity, // ✅ Never auto-refetch, always manual
        gcTime: Infinity, // ✅ Keep in cache forever (until app restart)
    });

    /**
     * Refresh buckets from API (GraphQL) and re-calculate stats
     * Forces a fresh fetch from the server (even with enabled: false)
     * Updates ALL components using useBucketsStats automatically
     */
    const refreshBucketsStats = async (): Promise<void> => {
        try {
            console.log('[refreshBucketsStats] Manually fetching bucketsStats from API...');
            
            // Force refetch even with enabled: false
            // This is the ONLY way to populate the cache for bucketsStats
            await queryClient.refetchQueries({ 
                queryKey: notificationKeys.bucketsStats(),
                type: 'active', // Only refetch if query is mounted
            });
            
            console.log('[refreshBucketsStats] Buckets stats fetched and cached - all components updated');
        } catch (error) {
            console.error('[refreshBucketsStats] Error refreshing buckets stats:', error);
            throw error;
        }
    };

    return {
        ...queryResult,
        refreshBucketsStats,
    };
}

/**
 * Hook for MANUALLY initializing/refreshing the GLOBAL bucketsStats cache
 * This is used by useCleanup to populate the cache on app startup
 * and by user pull-to-refresh gestures
 * 
 * @example
 * ```tsx
 * const { initializeBucketsStats } = useInitializeBucketsStats();
 * await initializeBucketsStats(); // Fetches and caches buckets
 * ```
 */
export function useInitializeBucketsStats() {
    const queryClient = useQueryClient();
    const [fetchBuckets] = useGetBucketsLazyQuery({
        fetchPolicy: 'network-only',
    });

    type BucketWithUserData = NonNullable<GetBucketsQuery['buckets']>[number];

    const initializeBucketsStats = async (): Promise<void> => {
        try {
            // STEP 1: Load buckets from LOCAL CACHE immediately for instant UI
            console.log('[initializeBucketsStats] Loading buckets from local cache...');
            const cachedBuckets = await getAllBuckets();
            
            if (cachedBuckets.length > 0) {
                console.log(`[initializeBucketsStats] Found ${cachedBuckets.length} cached buckets`);
                
                // Get bucket IDs from cached buckets
                const cachedBucketIds = cachedBuckets.map((b) => b.id);
                
                // Get notification stats from local DB
                const cachedStats = await getNotificationStats(cachedBucketIds);
                
                // Combine cached bucket metadata with stats
                const cachedBucketsWithStats: BucketWithStats[] = cachedBuckets.map((bucket) => {
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
                        color: bucket.color,
                        createdAt: bucket.createdAt,
                        updatedAt: bucket.updatedAt,
                        isProtected: bucket.isProtected,
                        isPublic: bucket.isPublic,
                        totalMessages: bucketStat?.totalCount ?? 0,
                        unreadCount: bucketStat?.unreadCount ?? 0,
                        lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                        isSnoozed,
                        snoozeUntil: snoozeUntil ?? null,
                    };
                });
                
                // Sort cached buckets
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
                
                // Set cached data in React Query IMMEDIATELY for instant UI
                queryClient.setQueryData(notificationKeys.bucketsStats(), cachedBucketsWithStats);
                console.log(`[initializeBucketsStats] ✅ Cached ${cachedBucketsWithStats.length} buckets loaded instantly`);
            } else {
                console.log('[initializeBucketsStats] No cached buckets found');
            }
            
            // STEP 2: Fetch fresh buckets from GraphQL API in background
            console.log('[initializeBucketsStats] Fetching fresh buckets from GraphQL...');
            
            const { data } = await fetchBuckets();
            const buckets = (data?.buckets ?? []) as BucketWithUserData[];
            
            console.log(`[initializeBucketsStats] Fetched ${buckets.length} buckets from API`);

            // STEP 3: Save fresh buckets to local DB for next launch
            if (buckets.length > 0) {
                const bucketsToSave: BucketData[] = buckets.map(bucket => ({
                    id: bucket.id,
                    name: bucket.name,
                    icon: bucket.icon,
                    description: bucket.description,
                    updatedAt: bucket.updatedAt,
                    // Include all bucket fields for complete caching
                    color: bucket.color,
                    createdAt: bucket.createdAt,
                    isProtected: bucket.isProtected,
                    isPublic: bucket.isPublic,
                    userBucket: bucket.userBucket,
                }));
                
                await saveBuckets(bucketsToSave);
                console.log(`[initializeBucketsStats] Saved ${bucketsToSave.length} buckets to local DB`);
            }

            // STEP 4: Get all bucket IDs
            const bucketIds = buckets.map((b) => b.id);

            // STEP 5: Get notification stats from local DB
            const notificationStats = await getNotificationStats(bucketIds);

            // STEP 6: Combine bucket metadata with stats
            const bucketsWithStats: BucketWithStats[] = buckets.map((bucket) => {
                const bucketStat = notificationStats.byBucket?.find(s => s.bucketId === bucket.id);
                const snoozeUntil = bucket.userBucket?.snoozeUntil;
                const isSnoozed = snoozeUntil
                    ? new Date().getTime() < new Date(snoozeUntil).getTime()
                    : false;

                return {
                    id: bucket.id,
                    name: bucket.name,
                    description: bucket.description,
                    icon: bucket.icon,
                    color: bucket.color,
                    createdAt: bucket.createdAt,
                    updatedAt: bucket.updatedAt,
                    isProtected: bucket.isProtected,
                    isPublic: bucket.isPublic,
                    totalMessages: bucketStat?.totalCount ?? 0,
                    unreadCount: bucketStat?.unreadCount ?? 0,
                    lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                    isSnoozed,
                    snoozeUntil: snoozeUntil ?? null,
                };
            });

            // STEP 7: Sort by: 1) unreadCount desc, 2) lastNotificationAt desc, 3) name asc
            bucketsWithStats.sort((a, b) => {
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

            // STEP 8: Update React Query cache with fresh data from backend
            queryClient.setQueryData(notificationKeys.bucketsStats(), bucketsWithStats);

            console.log(`[initializeBucketsStats] ✅ Updated cache with ${bucketsWithStats.length} fresh buckets from backend`);
        } catch (error) {
            console.error('[initializeBucketsStats] Error:', error);
            throw error;
        }
    };

    return { initializeBucketsStats };
}

/**
 * Hook for loading bucketsStats from LOCAL DB cache (instant display on startup)
 * Loads cached bucket metadata from local DB and combines with fresh notification stats
 * Used on app startup to show buckets immediately before backend sync
 * 
 * @example
 * ```tsx
 * const { loadBucketsFromCache } = useLoadBucketsFromCache();
 * await loadBucketsFromCache(); // Loads from DB and sets in React Query cache
 * ```
 */
export function useLoadBucketsFromCache() {
    const queryClient = useQueryClient();

    const loadBucketsFromCache = async (): Promise<void> => {
        try {
            console.log('[loadBucketsFromCache] Loading buckets from local DB...');
            
            // 1. Load buckets from local DB
            const cachedBuckets = await getAllBuckets();
            
            if (cachedBuckets.length === 0) {
                console.log('[loadBucketsFromCache] No cached buckets found in DB');
                return;
            }

            console.log(`[loadBucketsFromCache] Loaded ${cachedBuckets.length} buckets from local DB`);

            // 2. Get all bucket IDs
            const bucketIds = cachedBuckets.map((b) => b.id);

            // 3. Get fresh notification stats from local DB
            const notificationStats = await getNotificationStats(bucketIds);

            // 4. Combine cached bucket metadata with fresh stats
            const bucketsWithStats: BucketWithStats[] = cachedBuckets.map((bucket) => {
                const bucketStat = notificationStats.byBucket?.find(s => s.bucketId === bucket.id);
                const snoozeUntil = bucket.userBucket?.snoozeUntil;
                const isSnoozed = snoozeUntil
                    ? new Date().getTime() < new Date(snoozeUntil).getTime()
                    : false;

                return {
                    id: bucket.id,
                    name: bucket.name,
                    description: bucket.description,
                    icon: bucket.icon,
                    color: bucket.color,
                    createdAt: bucket.createdAt,
                    updatedAt: bucket.updatedAt,
                    isProtected: bucket.isProtected,
                    isPublic: bucket.isPublic,
                    totalMessages: bucketStat?.totalCount ?? 0,
                    unreadCount: bucketStat?.unreadCount ?? 0,
                    lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                    isSnoozed,
                    snoozeUntil: snoozeUntil ?? null,
                };
            });

            // 5. Sort by: 1) unreadCount desc, 2) lastNotificationAt desc, 3) name asc
            bucketsWithStats.sort((a, b) => {
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

            // 6. Set data directly in React Query GLOBAL cache
            queryClient.setQueryData(notificationKeys.bucketsStats(), bucketsWithStats);

            console.log(`[loadBucketsFromCache] Cached ${bucketsWithStats.length} buckets from DB in React Query`);
        } catch (error) {
            console.error('[loadBucketsFromCache] Error:', error);
            // Don't throw - allow app to continue with backend fetch
        }
    };

    return { loadBucketsFromCache };
}

/**
 * Hook for refreshing bucketsStats from LOCAL DB ONLY (no GraphQL fetch)
 * Updates stats (totalMessages, unreadCount, lastNotificationAt) for existing buckets in cache
 * Used by notification mutations to update stats after mark/delete operations
 * 
 * @example
 * ```tsx
 * const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();
 * await refreshBucketsStatsFromDB(); // Recalculates stats from local DB
 * ```
 */
export function useRefreshBucketsStatsFromDB() {
    const queryClient = useQueryClient();

    const refreshBucketsStatsFromDB = async (): Promise<void> => {
        try {
            // Get current bucketsStats from cache
            const currentBucketsStats = queryClient.getQueryData<BucketWithStats[]>(
                notificationKeys.bucketsStats()
            );

            if (!currentBucketsStats || currentBucketsStats.length === 0) {
                console.log('[refreshBucketsStatsFromDB] No buckets in cache, skipping');
                return;
            }

            console.log(`[refreshBucketsStatsFromDB] Recalculating stats for ${currentBucketsStats.length} buckets from local DB...`);

            // Get all bucket IDs
            const bucketIds = currentBucketsStats.map((b) => b.id);

            // Get fresh notification stats from local DB
            const notificationStats = await getNotificationStats(bucketIds);

            // Update only the stats fields, keep all other bucket data unchanged
            const updatedBucketsStats: BucketWithStats[] = currentBucketsStats.map((bucket) => {
                const bucketStat = notificationStats.byBucket?.find(s => s.bucketId === bucket.id);

                return {
                    ...bucket, // Keep all existing fields (name, icon, color, isSnoozed, etc.)
                    totalMessages: bucketStat?.totalCount ?? 0,
                    unreadCount: bucketStat?.unreadCount ?? 0,
                    lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                };
            });

            // Re-sort by: 1) unreadCount desc, 2) lastNotificationAt desc, 3) name asc
            updatedBucketsStats.sort((a, b) => {
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

            // Update React Query GLOBAL cache
            queryClient.setQueryData(notificationKeys.bucketsStats(), updatedBucketsStats);

            // Invalidate all individual bucket stats queries to trigger re-read from global cache
            await queryClient.invalidateQueries({
                queryKey: notificationKeys.bucketStats(),
                refetchType: 'none', // Don't refetch, just mark as stale so components re-read
            });

            console.log(`[refreshBucketsStatsFromDB] Updated stats for ${updatedBucketsStats.length} buckets`);
        } catch (error) {
            console.error('[refreshBucketsStatsFromDB] Error:', error);
            throw error;
        }
    };

    return { refreshBucketsStatsFromDB };
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
    const [fetchNotification] = useGetNotificationLazyQuery({
        fetchPolicy: 'network-only', // Don't use Apollo cache
    });

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
    const [fetchNotifications] = useGetNotificationsLazyQuery({
        fetchPolicy: 'network-only', // Don't use Apollo cache
    });
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
 * Hook for refreshing notifications with remote sync
 * Combines remote sync + cache invalidation + query refetch
 * Perfect for pull-to-refresh functionality
 * 
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { data, refetch } = useInfiniteNotifications();
 *   const refreshWithSync = useRefreshNotifications();
 *   const [isRefreshing, setIsRefreshing] = useState(false);
 *   
 *   const handleRefresh = async () => {
 *     setIsRefreshing(true);
 *     try {
 *       await refreshWithSync(refetch);
 *     } finally {
 *       setIsRefreshing(false);
 *     }
 *   };
 * }
 * ```
 */
export function useRefreshNotifications() {
    const queryClient = useQueryClient();
    const { syncNotifications } = useSyncNotificationsFromAPI();

    const refreshWithSync = async (refetchFn?: () => Promise<any>): Promise<number> => {
        // 1. Sync from remote API first (fetch new notifications, save to DB, delete from server)
        console.log('[useRefreshNotifications] Syncing from remote...');
        const syncedCount = await syncNotifications();
        console.log(`[useRefreshNotifications] Synced ${syncedCount} notifications from remote`);

        // 2. Invalidate all queries to refresh UI with new data from local DB
        await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
        console.log('[useRefreshNotifications] React Query cache invalidated');

        // 3. Optionally refetch specific query if provided
        if (refetchFn) {
            await refetchFn();
        }

        return syncedCount;
    };

    return refreshWithSync;
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




