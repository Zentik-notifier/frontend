import { useApolloClient } from '@apollo/client';
import {
  GetBucketsDocument,
  useDeleteBucketMutation,
  useSetBucketSnoozeMutation,
} from '@/generated/gql-operations-generated';
import { deleteNotificationsByBucketId } from '@/services/notifications-repository';
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bucketKeys } from './useBucketQueries';
import { notificationKeys } from './useNotificationQueries';
import { BucketWithStats } from '@/types/notifications';

/**
 * Hook for deleting a bucket and all its notifications from cache
 * Combines the useDeleteBucketMutation with local notification cleanup
 *
 * @example
 * ```typescript
 * import { useDeleteBucketWithNotifications } from '@/hooks/notifications';
 *
 * const { deleteBucketWithNotifications, loading, error } = useDeleteBucketWithNotifications({
 *   onCompleted: () => navigateToHome(),
 *   onError: (error) => console.error('Delete failed:', error),
 * });
 *
 * await deleteBucketWithNotifications('bucket-id');
 * ```
 */
export function useDeleteBucketWithNotifications(options?: {
  onCompleted?: () => void;
  onError?: (error: Error) => void;
}) {
  const apolloClient = useApolloClient();
  const [deleteBucketMutation, { loading, error }] = useDeleteBucketMutation({
    onCompleted: options?.onCompleted,
    onError: options?.onError,
    refetchQueries: [{ query: GetBucketsDocument }],
  });

  const deleteBucketWithNotifications = useCallback(
    async (bucketId: string) => {
      try {
        // First, delete all notifications for this bucket from local cache
        const deletedCount = await deleteNotificationsByBucketId(bucketId);
        console.log(
          `🗑️ Deleted ${deletedCount} notifications from local cache for bucket ${bucketId}`
        );

        // Get all notifications from Apollo cache to identify which ones belong to this bucket
        const cacheData = apolloClient.cache.extract();
        const notificationIdsToEvict: string[] = [];

        // Find all notification entities that belong to this bucket
        for (const [key, value] of Object.entries(cacheData)) {
          if (key.startsWith('Notification:') && value) {
            const notification = value as any;
            if (notification.message?.bucket?.id === bucketId) {
              notificationIdsToEvict.push(key);
            }
          }
        }

        // Then delete the bucket from the server
        await deleteBucketMutation({
          variables: { id: bucketId },
        });

        // After successful deletion, evict notifications and bucket from Apollo cache
        console.log(
          `🗑️ Evicting ${notificationIdsToEvict.length} notifications for bucket ${bucketId}`
        );

        // Evict all notifications that belonged to this bucket
        for (const notificationId of notificationIdsToEvict) {
          apolloClient.cache.evict({
            id: notificationId,
          });
        }

        // Evict the bucket itself
        apolloClient.cache.evict({
          id: `Bucket:${bucketId}`,
        });

        // Also evict from GetNotifications query cache
        apolloClient.cache.modify({
          fields: {
            notifications(existingNotifications = [], { readField }) {
              return existingNotifications.filter((notificationRef: any) => {
                const bucketIdFromCache = readField(
                  'message',
                  readField('bucket', readField('id', notificationRef))
                );
                return bucketIdFromCache !== bucketId;
              });
            },
          },
        });

        // Run garbage collection
        const gcResult = apolloClient.cache.gc();
        console.log(
          `🧹 Cache garbage collection completed - removed ${gcResult.length} orphaned objects`
        );

        console.log(
          `✅ Successfully deleted bucket ${bucketId} and evicted all related data from Apollo cache`
        );
      } catch (error) {
        console.error('❌ Failed to delete bucket with notifications:', error);
        if (options?.onError) {
          options.onError(error as Error);
        }
        throw error;
      }
    },
    [deleteBucketMutation, options?.onError, options?.onCompleted, apolloClient]
  );

  return {
    deleteBucketWithNotifications,
    loading,
    error,
  };
}

/**
 * Hook for setting bucket snooze with React Query optimistic updates
 * Updates all bucket queries (detail, lists, stats) immediately for instant UI feedback
 * 
 * @example
 * ```typescript
 * import { useSetBucketSnooze } from '@/hooks/notifications';
 * 
 * const { setSnooze, isLoading } = useSetBucketSnooze();
 * 
 * // Set snooze
 * await setSnooze({ bucketId: 'bucket-id', snoozeUntil: new Date() });
 * 
 * // Remove snooze
 * await setSnooze({ bucketId: 'bucket-id', snoozeUntil: null });
 * ```
 */
export function useSetBucketSnooze(options?: {
  onSuccess?: (snoozeUntil: string | null) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [setBucketSnoozeMutation] = useSetBucketSnoozeMutation();

  const mutation = useMutation({
    mutationFn: async ({ bucketId, snoozeUntil }: { bucketId: string; snoozeUntil: Date | null }) => {
      const snoozeUntilISO = snoozeUntil ? snoozeUntil.toISOString() : null;
      
      console.log('[useSetBucketSnooze] Setting snooze:', { bucketId, snoozeUntil: snoozeUntilISO });
      
      const result = await setBucketSnoozeMutation({
        variables: { bucketId, snoozeUntil: snoozeUntilISO },
      });

      if (!result.data?.setBucketSnooze) {
        throw new Error('Failed to set bucket snooze');
      }

      return { bucketId, snoozeUntil: snoozeUntilISO };
    },
    onMutate: async ({ bucketId, snoozeUntil }) => {
      const snoozeUntilISO = snoozeUntil ? snoozeUntil.toISOString() : null;
      const now = new Date();
      const isSnoozed = snoozeUntil ? now.getTime() < snoozeUntil.getTime() : false;

      console.log('[useSetBucketSnooze] Optimistic update:', { bucketId, snoozeUntilISO, isSnoozed });

      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: bucketKeys.detail(bucketId) });
      await queryClient.cancelQueries({ queryKey: notificationKeys.bucketsStats() });
      await queryClient.cancelQueries({ queryKey: notificationKeys.stats() });

      // Snapshot previous values for rollback
      const previousBucketDetail = queryClient.getQueryData(bucketKeys.detail(bucketId));
      const previousBucketsStats = queryClient.getQueryData(notificationKeys.bucketsStats());
      const previousStats = queryClient.getQueryData(notificationKeys.stats());

      // 1. Update bucket detail query (useBucket)
      queryClient.setQueryData(bucketKeys.detail(bucketId), (old: any) => {
        if (!old) {
          console.log('[useSetBucketSnooze] No bucket detail cache found, skipping optimistic update');
          return old;
        }
        
        console.log(`[useSetBucketSnooze] Updating bucket ${bucketId} detail cache:`, {
          snoozeUntil: snoozeUntilISO,
        });
        
        // useBucket stores bucket directly (not in a nested object)
        return {
          ...old,
          userBucket: {
            ...old.userBucket,
            snoozeUntil: snoozeUntilISO,
          },
        };
      });

      // 2. Update GLOBAL bucketsStats query (shared by ALL components)
      queryClient.setQueryData<BucketWithStats[]>(notificationKeys.bucketsStats(), (old) => {
        if (!old) {
          console.log('[useSetBucketSnooze] No bucketsStats cache found, skipping optimistic update');
          return old;
        }
        
        console.log(`[useSetBucketSnooze] Updating bucket ${bucketId} in bucketsStats cache:`, {
          isSnoozed,
          snoozeUntil: snoozeUntilISO,
        });
        
        return old.map((bucket) =>
          bucket.id === bucketId
            ? { ...bucket, isSnoozed, snoozeUntil: snoozeUntilISO }
            : bucket
        );
      });

      console.log('[useSetBucketSnooze] Optimistic updates applied to GLOBAL cache');

      // Return context for rollback
      return { previousBucketDetail, previousBucketsStats, previousStats };
    },
    onSuccess: async (data, variables) => {
      console.log('[useSetBucketSnooze] Mutation successful, invalidating GLOBAL queries...');

      // Invalidate GLOBAL bucketsStats query - updates ALL components automatically
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.bucketsStats(),
      });
      
      // Also invalidate specific bucket detail
      await queryClient.invalidateQueries({
        queryKey: bucketKeys.detail(variables.bucketId),
      });
      
      // And notification stats
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.stats(),
      });

      console.log('[useSetBucketSnooze] GLOBAL queries invalidated - all components will update');

      if (options?.onSuccess) {
        options.onSuccess(data.snoozeUntil);
      }
    },
    onError: (error, variables, context) => {
      console.error('[useSetBucketSnooze] Mutation failed, rolling back optimistic updates:', error);

      // Rollback optimistic updates
      if (context?.previousBucketDetail) {
        queryClient.setQueryData(bucketKeys.detail(variables.bucketId), context.previousBucketDetail);
      }
      if (context?.previousBucketsStats) {
        queryClient.setQueryData(notificationKeys.bucketsStats(), context.previousBucketsStats);
      }
      if (context?.previousStats) {
        queryClient.setQueryData(notificationKeys.stats(), context.previousStats);
      }

      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });

  return {
    setSnooze: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
