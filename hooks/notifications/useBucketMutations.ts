import { useApolloClient } from '@apollo/client';
import {
  GetBucketsDocument,
  useDeleteBucketMutation,
} from '@/generated/gql-operations-generated';
import { deleteNotificationsByBucketId } from '@/services/notifications-repository';
import { useCallback } from 'react';

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
