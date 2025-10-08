import { useApolloClient } from '@apollo/client';
import {
  GetBucketsDocument,
  useDeleteBucketMutation,
  useSetBucketSnoozeMutation,
  SnoozeScheduleInput,
  UpdateBucketSnoozesDocument,
  UpdateBucketSnoozesMutationVariables,
  ShareBucketDocument,
  ShareBucketMutationVariables,
  UnshareBucketDocument,
  UnshareBucketMutationVariables,
  Permission,
  ResourceType,
  UserRole,
  useUpdateBucketSnoozesMutation,
  useShareBucketMutation,
  useUnshareBucketMutation,
} from '@/generated/gql-operations-generated';
import { deleteNotificationsByBucketId } from '@/services/notifications-repository';
import { useCallback } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { bucketKeys, BucketDetailData } from './useBucketQueries';
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

/**
 * Hook for updating bucket snooze schedules with optimistic updates
 * Updates the bucket detail cache immediately for instant UI feedback
 * 
 * @example
 * ```typescript
 * import { useUpdateBucketSnoozes } from '@/hooks/notifications';
 * 
 * const { updateSnoozes, isLoading } = useUpdateBucketSnoozes();
 * 
 * await updateSnoozes({
 *   bucketId: 'bucket-id',
 *   snoozes: [{ days: ['monday'], timeFrom: '09:00', timeTill: '17:00', isEnabled: true }]
 * });
 * ```
 */
export function useUpdateBucketSnoozes(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [updateBucketSnoozesMutation] = useUpdateBucketSnoozesMutation();

  const mutation = useMutation({
    mutationFn: async (variables: UpdateBucketSnoozesMutationVariables) => {
      console.log('[useUpdateBucketSnoozes] Updating snooze schedules:', variables);
      
      const result = await updateBucketSnoozesMutation({
        variables,
      });

      if (!result.data?.updateBucketSnoozes) {
        throw new Error('Failed to update bucket snooze schedules');
      }

      return { bucketId: variables.bucketId, snoozes: variables.snoozes };
    },
    onMutate: async (variables) => {
      const { bucketId, snoozes } = variables;
      // Normalize snoozes to array (it can be array or single object)
      const snoozesArray = Array.isArray(snoozes) ? snoozes : [snoozes];

      console.log('[useUpdateBucketSnoozes] Optimistic update:', { bucketId, snoozes: snoozesArray });

      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: bucketKeys.detail(bucketId) });

      // Snapshot previous value for rollback
      const previousBucket = queryClient.getQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId)
      );

      // Optimistically update the bucket detail cache
      queryClient.setQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId),
        (old) => {
          if (!old) {
            console.log('[useUpdateBucketSnoozes] No bucket detail cache found, skipping optimistic update');
            return old;
          }

          console.log(`[useUpdateBucketSnoozes] Updating bucket ${bucketId} detail cache with snoozes`);

          return {
            ...old,
            userBucket: old.userBucket
              ? {
                  ...old.userBucket,
                  snoozes: snoozesArray.map((s: SnoozeScheduleInput) => ({
                    __typename: 'SnoozeSchedule' as const,
                    days: s.days,
                    timeFrom: s.timeFrom,
                    timeTill: s.timeTill,
                    isEnabled: s.isEnabled,
                  })),
                }
              : null,
          };
        }
      );

      console.log('[useUpdateBucketSnoozes] Optimistic update applied to bucket detail cache');

      // Return context for rollback
      return { previousBucket };
    },
    onSuccess: async (data, variables) => {
      console.log('[useUpdateBucketSnoozes] Mutation successful, invalidating queries...');

      // Invalidate bucket detail query to refetch from server
      await queryClient.invalidateQueries({
        queryKey: bucketKeys.detail(variables.bucketId),
      });

      console.log('[useUpdateBucketSnoozes] Queries invalidated');

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error, variables, context) => {
      console.error('[useUpdateBucketSnoozes] Mutation failed, rolling back optimistic update:', error);

      // Rollback optimistic update
      if (context?.previousBucket) {
        queryClient.setQueryData(
          bucketKeys.detail(variables.bucketId),
          context.previousBucket
        );
      }

      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });

  return {
    updateSnoozes: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for sharing bucket with user with optimistic updates
 * Immediately adds the permission to the bucket detail cache
 * 
 * @example
 * ```typescript
 * import { useShareBucket } from '@/hooks/notifications';
 * 
 * const { shareBucket, isLoading } = useShareBucket();
 * 
 * await shareBucket({
 *   bucketId: 'bucket-id',
 *   targetUserId: 'user-id',
 *   permissions: [Permission.Read, Permission.Write]
 * });
 * ```
 */
export function useShareBucket(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [shareBucketMutation] = useShareBucketMutation();

  const mutation = useMutation({
    mutationFn: async (variables: ShareBucketMutationVariables) => {
      console.log('[useShareBucket] Sharing bucket:', variables);
      
      const result = await shareBucketMutation({
        variables,
      });

      if (!result.data?.shareBucket) {
        throw new Error('Failed to share bucket');
      }

      return { 
        bucketId: variables.input.resourceId, 
        targetUserId: variables.input.userId,
        newPermission: result.data.shareBucket,
      };
    },
    onMutate: async (variables) => {
      const { resourceId: bucketId, userId: targetUserId, permissions } = variables.input;

      console.log('[useShareBucket] Optimistic update:', { bucketId, targetUserId, permissions });

      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: bucketKeys.detail(bucketId) });

      // Snapshot previous value for rollback
      const previousBucket = queryClient.getQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId)
      );

      // Optimistically add new permission to the bucket
      queryClient.setQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId),
        (old) => {
          if (!old || !targetUserId) {
            console.log('[useShareBucket] No bucket detail cache found or no targetUserId, skipping optimistic update');
            return old;
          }

          console.log(`[useShareBucket] Adding optimistic permission for user ${targetUserId}`);

          // Create optimistic permission with temporary ID
          const optimisticPermission = {
            __typename: 'EntityPermission' as const,
            id: `temp-${Date.now()}`, // Temporary ID
            resourceId: bucketId,
            resourceType: String(ResourceType.Bucket),
            permissions: permissions,
            expiresAt: null,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            user: {
              __typename: 'User' as const,
              id: targetUserId,
              email: '', // Will be filled by server response
              username: '', // Will be filled by server response
              firstName: null,
              lastName: null,
              avatar: null,
              hasPassword: true,
              role: UserRole.User,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              identities: null,
              buckets: null,
            },
            grantedBy: null,
          };

          return {
            ...old,
            permissions: [...(old.permissions || []), optimisticPermission],
          };
        }
      );

      console.log('[useShareBucket] Optimistic permission added to bucket detail cache');

      // Return context for rollback
      return { previousBucket, bucketId };
    },
    onSuccess: async (data, variables, context) => {
      console.log('[useShareBucket] Mutation successful, updating cache with server response...');

      const { bucketId, newPermission } = data;

      // Update cache with real permission from server (replace optimistic one)
      queryClient.setQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId),
        (old) => {
          if (!old) return old;

          console.log(`[useShareBucket] Replacing optimistic permission with server response`);

          // Remove optimistic permission and add real one
          const updatedPermissions = [
            ...(old.permissions || []).filter((p) => !p.id.startsWith('temp-')),
            newPermission,
          ];

          return {
            ...old,
            permissions: updatedPermissions,
          };
        }
      );

      console.log('[useShareBucket] Cache updated with server response');

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error, variables, context) => {
      console.error('[useShareBucket] Mutation failed, rolling back optimistic update:', error);

      // Rollback optimistic update
      if (context?.previousBucket && context?.bucketId) {
        queryClient.setQueryData(
          bucketKeys.detail(context.bucketId),
          context.previousBucket
        );
      }

      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });

  return {
    shareBucket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for removing bucket sharing with optimistic updates
 * Immediately removes the permission from the bucket detail cache
 * 
 * @example
 * ```typescript
 * import { useUnshareBucket } from '@/hooks/notifications';
 * 
 * const { unshareBucket, isLoading } = useUnshareBucket();
 * 
 * await unshareBucket({
 *   input: {
 *     resourceId: 'bucket-id',
 *     resourceType: ResourceType.Bucket,
 *     userId: 'user-id'
 *   }
 * });
 * ```
 */
export function useUnshareBucket(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [unshareBucketMutation] = useUnshareBucketMutation();

  const mutation = useMutation({
    mutationFn: async (variables: UnshareBucketMutationVariables) => {
      console.log('[useUnshareBucket] Unsharing bucket:', variables);
      
      const result = await unshareBucketMutation({
        variables,
      });

      if (!result.data?.unshareBucket) {
        throw new Error('Failed to unshare bucket');
      }

      return { 
        bucketId: variables.input.resourceId, 
        targetUserId: variables.input.userId 
      };
    },
    onMutate: async (variables) => {
      const { resourceId: bucketId, userId: targetUserId } = variables.input;

      console.log('[useUnshareBucket] Optimistic update:', { bucketId, targetUserId });

      // Cancel outgoing queries to prevent overwriting optimistic update
      await queryClient.cancelQueries({ queryKey: bucketKeys.detail(bucketId) });

      // Snapshot previous value for rollback
      const previousBucket = queryClient.getQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId)
      );

      // Optimistically remove permission from the bucket
      queryClient.setQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId),
        (old) => {
          if (!old || !targetUserId) {
            console.log('[useUnshareBucket] No bucket detail cache found or no targetUserId, skipping optimistic update');
            return old;
          }

          console.log(`[useUnshareBucket] Removing permission for user ${targetUserId}`);

          return {
            ...old,
            permissions: (old.permissions || []).filter((p) => p.user.id !== targetUserId),
          };
        }
      );

      console.log('[useUnshareBucket] Permission removed from bucket detail cache');

      // Return context for rollback
      return { previousBucket, bucketId };
    },
    onSuccess: async (data, variables, context) => {
      console.log('[useUnshareBucket] Mutation successful');

      // No need to update cache again, optimistic update is already correct
      console.log('[useUnshareBucket] Optimistic update confirmed');

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error, variables, context) => {
      console.error('[useUnshareBucket] Mutation failed, rolling back optimistic update:', error);

      // Rollback optimistic update
      if (context?.previousBucket && context?.bucketId) {
        queryClient.setQueryData(
          bucketKeys.detail(context.bucketId),
          context.previousBucket
        );
      }

      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });

  return {
    unshareBucket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
