import {
  ResourceType,
  ShareBucketMutationVariables,
  SnoozeScheduleInput,
  UnshareBucketMutationVariables,
  UpdateBucketSnoozesMutationVariables,
  useDeleteBucketMutation,
  UserRole,
  useSetBucketSnoozeMutation,
  useShareBucketMutation,
  useUnshareBucketMutation,
  useUpdateBucketSnoozesMutation
} from '@/generated/gql-operations-generated';
import { deleteNotificationsByBucketId } from '@/services/notifications-repository';
import { deleteBucket } from '@/db/repositories/buckets-repository';
import { mediaCache } from '@/services/media-cache-service';
import { BucketWithStats } from '@/types/notifications';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { BucketDetailData, bucketKeys } from './useBucketQueries';
import { notificationKeys } from './useNotificationQueries';

/**
 * Hook for deleting a bucket and all its notifications with optimistic updates
 * Removes bucket from all React Query caches and deletes local notifications
 * 
 * @example
 * ```typescript
 * import { useDeleteBucketWithNotifications } from '@/hooks/notifications';
 * 
 * const { deleteBucket, isLoading } = useDeleteBucketWithNotifications();
 * 
 * await deleteBucket({
 *   bucketId: 'bucket-id',
 *   onSuccess: () => navigateToHome(),
 *   onError: (error) => console.error('Delete failed:', error)
 * });
 * ```
 */
export function useDeleteBucketWithNotifications(options?: {
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [deleteBucketMutation] = useDeleteBucketMutation();

  const mutation = useMutation({
    mutationFn: async (bucketId: string) => {
      console.log('[useDeleteBucketWithNotifications] Deleting bucket:', bucketId);
      
      // Step 1: Delete all notifications for this bucket from local database
      const deletedCount = await deleteNotificationsByBucketId(bucketId);
      console.log(
        `[useDeleteBucketWithNotifications] Deleted ${deletedCount} notifications from local database for bucket ${bucketId}`
      );

      // Step 2: Delete the bucket from local database
      await deleteBucket(bucketId);
      console.log(`[useDeleteBucketWithNotifications] Deleted bucket ${bucketId} from local database`);

      // Step 3: Delete bucket icon from cache
      await mediaCache.invalidateBucketIcon(bucketId);
      console.log(`[useDeleteBucketWithNotifications] Deleted bucket ${bucketId} icon from cache`);

      // Step 4: Delete the bucket from the server
      try {
        const result = await deleteBucketMutation({
          variables: { id: bucketId },
        });

        if (!result.data?.deleteBucket) {
          console.warn('[useDeleteBucketWithNotifications] Server returned false, but continuing with local cleanup');
        }
      } catch (serverError: any) {
        // If bucket not found on server, that's OK - it was already deleted
        if (serverError.message?.includes('Bucket not found') || 
            serverError.graphQLErrors?.[0]?.message?.includes('Bucket not found')) {
          console.log('[useDeleteBucketWithNotifications] Bucket already deleted on server, continuing with local cleanup');
        } else {
          // For other errors, log but still continue with local cleanup
          console.error('[useDeleteBucketWithNotifications] Server deletion failed, but local cleanup completed:', serverError.message);
        }
      }

      return { bucketId };
    },
    onMutate: async (bucketId) => {
      console.log('[useDeleteBucketWithNotifications] Optimistic update:', { bucketId });

      // Cancel ALL queries to prevent any refetch during deletion
      await queryClient.cancelQueries();
      console.log('[useDeleteBucketWithNotifications] Cancelled all queries');

      // Snapshot previous values for rollback
      const previousBucketDetail = queryClient.getQueryData(bucketKeys.detail(bucketId));
      const previousBucketsStats = queryClient.getQueryData(notificationKeys.bucketsStats());
      const previousStats = queryClient.getQueryData(notificationKeys.stats());

      // Optimistically remove bucket from bucketsStats
      queryClient.setQueryData<BucketWithStats[]>(notificationKeys.bucketsStats(), (old) => {
        if (!old) {
          console.log('[useDeleteBucketWithNotifications] No bucketsStats cache found, skipping optimistic update');
          return old;
        }
        
        console.log(`[useDeleteBucketWithNotifications] Removing bucket ${bucketId} from bucketsStats cache`);
        return old.filter((bucket) => bucket.id !== bucketId);
      });

      // Remove ALL queries that reference this bucket
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return JSON.stringify(queryKey).includes(bucketId);
        },
      });
      console.log(`[useDeleteBucketWithNotifications] Removed all queries containing bucketId ${bucketId}`);

      console.log('[useDeleteBucketWithNotifications] Optimistic updates applied');

      // Return context for rollback
      return { previousBucketDetail, previousBucketsStats, previousStats, bucketId };
    },
    onSuccess: async (data, variables, context) => {
      console.log('[useDeleteBucketWithNotifications] Mutation successful, cleaning up...');

      const bucketId = data.bucketId;

      // Step 1: Remove ALL queries related to this specific bucket (prevent refetch)
      queryClient.removeQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          // Remove any query that references this bucketId
          return JSON.stringify(queryKey).includes(bucketId);
        },
      });
      console.log(`[useDeleteBucketWithNotifications] Removed all queries containing bucketId ${bucketId}`);

      // Step 2: Remove all notifications queries that might reference this bucket
      queryClient.removeQueries({
        queryKey: notificationKeys.all,
      });
      console.log('[useDeleteBucketWithNotifications] Removed all notification queries');

      // Step 3: Invalidate global queries (bucketsStats, stats)
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.bucketsStats(),
        refetchType: 'none', // Don't refetch immediately
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.stats(),
        refetchType: 'none',
      });

      console.log('[useDeleteBucketWithNotifications] Global queries invalidated (no immediate refetch)');

      // Step 4: Force remove bucket from bucketsStats cache to prevent any race conditions
      queryClient.setQueryData<BucketWithStats[]>(notificationKeys.bucketsStats(), (old) => {
        if (!old) return old;
        const filtered = old.filter((bucket) => bucket.id !== bucketId);
        console.log(`[useDeleteBucketWithNotifications] BucketsStats: ${old.length} → ${filtered.length} buckets`);
        return filtered;
      });
      console.log(`[useDeleteBucketWithNotifications] Bucket ${bucketId} force-removed from bucketsStats cache`);

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: (error, variables, context) => {
      // Check if error is "Bucket not found" - in this case, don't rollback
      const isBucketNotFound = error.message?.includes('Bucket not found') || 
        (error as any).graphQLErrors?.[0]?.message?.includes('Bucket not found');

      if (isBucketNotFound) {
        console.log('[useDeleteBucketWithNotifications] Bucket not found on server, treating as success');
        // Don't rollback - bucket was already deleted
        // Call onSuccess callback
        if (options?.onSuccess) {
          options.onSuccess();
        }
        return;
      }

      console.error('[useDeleteBucketWithNotifications] Mutation failed, rolling back optimistic updates:', error);

      // Rollback optimistic updates only for real errors
      if (context?.previousBucketDetail) {
        queryClient.setQueryData(bucketKeys.detail(context.bucketId), context.previousBucketDetail);
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
    deleteBucket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
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
            inviteCodeId: null,
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
              devices: null,
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
