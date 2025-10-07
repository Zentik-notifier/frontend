/**
 * React Query hooks for notification queries
 * Provides hooks for fetching notifications with local DB sync
 */

import { useQuery, UseQueryResult, UseQueryOptions } from '@tanstack/react-query';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import {
  UseNotificationsOptions,
  UseBucketNotificationsOptions,
  UseNotificationStatsOptions,
  NotificationQueryResult,
  NotificationStats,
  BucketStats,
} from '@/types/notifications';
import {
  fetchNotifications,
  fetchNotificationById,
  fetchBucketNotifications,
} from '@/services/api/notifications-api';
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
        // First, try to get from local DB (fast)
        const localResult = await queryNotifications({ filters, sort, pagination });

        // If autoSync is enabled, fetch from API and sync with local DB
        if (autoSync) {
          try {
            const apiNotifications = await fetchNotifications(filters, sort, pagination);
            
            // Sync to local DB in background
            if (apiNotifications.length > 0) {
              upsertNotificationsBatch(apiNotifications).catch(error => {
                console.error('[useNotifications] Failed to sync to local DB:', error);
              });
            }

            // Return API data with local structure
            return {
              notifications: apiNotifications,
              totalCount: apiNotifications.length,
              filters,
              sort,
              pagination: pagination
                ? {
                    limit: pagination.limit || 50,
                    offset: pagination.offset || 0,
                    hasMore: apiNotifications.length === (pagination.limit || 50),
                  }
                : undefined,
            };
          } catch (apiError) {
            console.warn('[useNotifications] API fetch failed, using local data:', apiError);
            // Return local data if API fails
            return localResult;
          }
        }

        // Return local data if autoSync is disabled
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
        // First check local DB
        const localNotification = await getNotificationById(notificationId);

        // Try to fetch from API
        try {
          const apiNotification = await fetchNotificationById(notificationId);
          
          // Sync to local DB in background
          if (apiNotification) {
            upsertNotificationsBatch([apiNotification]).catch(error => {
              console.error('[useNotification] Failed to sync to local DB:', error);
            });
          }

          return apiNotification;
        } catch (apiError) {
          console.warn('[useNotification] API fetch failed, using local data:', apiError);
          return localNotification;
        }
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
        // First, get from local DB
        const localResult = await queryBucketNotifications(bucketId, { filters, sort, pagination });

        // If autoSync is enabled, fetch from API
        if (autoSync) {
          try {
            const apiNotifications = await fetchBucketNotifications(bucketId, sort, pagination);
            
            // Sync to local DB in background
            if (apiNotifications.length > 0) {
              upsertNotificationsBatch(apiNotifications).catch(error => {
                console.error('[useBucketNotifications] Failed to sync to local DB:', error);
              });
            }

            return {
              notifications: apiNotifications,
              totalCount: apiNotifications.length,
              filters: { ...filters, bucketId },
              sort,
              pagination: pagination
                ? {
                    limit: pagination.limit || 50,
                    offset: pagination.offset || 0,
                    hasMore: apiNotifications.length === (pagination.limit || 50),
                  }
                : undefined,
            };
          } catch (apiError) {
            console.warn('[useBucketNotifications] API fetch failed, using local data:', apiError);
            return localResult;
          }
        }

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
