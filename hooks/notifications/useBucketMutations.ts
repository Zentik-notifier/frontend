import { deleteBucket, saveBuckets } from '@/db/repositories/buckets-repository';
import { getNotificationStats } from '@/db/repositories/notifications-query-repository';
import {
  NotificationFragment,
  ResourceType,
  ShareBucketMutationVariables,
  SnoozeScheduleInput,
  UnshareBucketMutationVariables,
  UpdateBucketSnoozesMutationVariables,
  useCreateBucketMutation,
  useDeleteBucketMutation,
  UserRole,
  useSetBucketSnoozeMutation,
  useShareBucketMutation,
  useUnshareBucketMutation,
  useUpdateBucketMutation,
  useUpdateBucketSnoozesMutation
} from '@/generated/gql-operations-generated';
import IosBridgeService from '@/services/ios-bridge';
import { deleteNotificationsByBucketId } from '@/services/notifications-repository';
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

      // Step 5: Update appState with recalculated stats
      try {
        const updatedStats = await getNotificationStats([]);
        console.log(`[useDeleteBucketWithNotifications] Recalculated stats: ${updatedStats.totalCount} total notifications (${updatedStats.unreadCount} unread)`);

        // Update appState cache with new stats
        queryClient.setQueryData(['app-state'], (oldAppState: any) => {
          if (!oldAppState) return oldAppState;

          return {
            ...oldAppState,
            // Remove deleted bucket from buckets list
            buckets: (oldAppState.buckets || []).filter(
              (bucket: BucketWithStats) => bucket.id !== bucketId
            ),
            stats: updatedStats,
            lastSync: new Date().toISOString(),
          };
        });
        console.log('[useDeleteBucketWithNotifications] AppState updated with recalculated stats');
      } catch (error) {
        console.error('[useDeleteBucketWithNotifications] Error recalculating stats:', error);
      }

      console.log('[useDeleteBucketWithNotifications] AppState updated with recalculated stats');

      if (options?.onSuccess) {
        options.onSuccess();
      }
    },
    onError: async (error, variables, context) => {
      // Check if error is "Bucket not found" - in this case, don't rollback
      const isBucketNotFound = error.message?.includes('Bucket not found') ||
        (error as any).graphQLErrors?.[0]?.message?.includes('Bucket not found');

      if (isBucketNotFound) {
        console.log('[useDeleteBucketWithNotifications] Bucket not found on server, treating as success');
        // Don't rollback - bucket was already deleted
        // Update appState with recalculated stats
        try {
          const updatedStats = await getNotificationStats([]);
          console.log(`[useDeleteBucketWithNotifications] Recalculated stats after bucket not found: ${updatedStats.totalCount} total notifications (${updatedStats.unreadCount} unread)`);

          // Update appState cache with new stats
          queryClient.setQueryData(['app-state'], (oldAppState: any) => {
            if (!oldAppState) return oldAppState;

            return {
              ...oldAppState,
              // Ensure deleted bucket is removed from buckets list even if server didn't find it
              buckets: (oldAppState.buckets || []).filter(
                (bucket: BucketWithStats) => bucket.id !== variables
              ),
              stats: updatedStats,
              lastSync: new Date().toISOString(),
            };
          });
          console.log('[useDeleteBucketWithNotifications] AppState updated with recalculated stats after bucket not found');
        } catch (error) {
          console.error('[useDeleteBucketWithNotifications] Error recalculating stats after bucket not found:', error);
        }

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
      await queryClient.cancelQueries({ queryKey: ['app-state'] });

      // Snapshot previous values for rollback
      const previousBucketDetail = queryClient.getQueryData(bucketKeys.detail(bucketId));
      const previousAppState = queryClient.getQueryData(['app-state']);

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

      // 2. Update appState cache
      queryClient.setQueryData<{
        buckets: BucketWithStats[];
        notifications: NotificationFragment[];
        stats: any;
        lastSync: string;
      }>(['app-state'], (oldAppState) => {
        if (!oldAppState) {
          console.log('[useSetBucketSnooze] No appState cache found, skipping optimistic update');
          return oldAppState;
        }

        console.log(`[useSetBucketSnooze] Updating bucket ${bucketId} in appState cache:`, {
          isSnoozed,
          snoozeUntil: snoozeUntilISO,
        });

        const updatedBuckets = oldAppState.buckets.map((bucket) =>
          bucket.id === bucketId
            ? { ...bucket, isSnoozed, snoozeUntil: snoozeUntilISO }
            : bucket
        );

        return {
          ...oldAppState,
          buckets: updatedBuckets,
        };
      });

      console.log('[useSetBucketSnooze] Optimistic updates applied to appState cache');

      // Return context for rollback
      return { previousBucketDetail, previousAppState };
    },
    onSuccess: async (data, variables) => {
      console.log('[useSetBucketSnooze] Mutation successful, invalidating appState...');

      // Invalidate appState query - updates ALL components automatically
      await queryClient.invalidateQueries({
        queryKey: ['app-state'],
      });

      // Also invalidate specific bucket detail
      await queryClient.invalidateQueries({
        queryKey: bucketKeys.detail(variables.bucketId),
      });

      console.log('[useSetBucketSnooze] appState invalidated - all components will update');

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
      if (context?.previousAppState) {
        queryClient.setQueryData(['app-state'], context.previousAppState);
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
      const previousAppState = queryClient.getQueryData(['app-state']);

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
          id: targetUserId || '',
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
      } as any;

      // Optimistically add new permission to the bucket
      queryClient.setQueryData<BucketDetailData>(
        bucketKeys.detail(bucketId),
        (old) => {
          if (!old || !targetUserId) {
            console.log('[useShareBucket] No bucket detail cache found or no targetUserId, skipping optimistic update');
            return old;
          }

          console.log(`[useShareBucket] Adding optimistic permission for user ${targetUserId}`);

          return {
            ...old,
            permissions: [...(old.permissions || []), optimisticPermission],
          };
        }
      );

      console.log('[useShareBucket] Optimistic permission added to bucket detail cache');

      // Update appState with optimistic permission
      queryClient.setQueryData(['app-state'], (oldAppState: any) => {
        if (!oldAppState) return oldAppState;

        const updatedBuckets = oldAppState.buckets.map((bucket: any) => {
          if (bucket.id === bucketId) {
            return {
              ...bucket,
              permissions: [...(bucket.permissions || []), optimisticPermission],
            };
          }
          return bucket;
        });

        return {
          ...oldAppState,
          buckets: updatedBuckets,
          lastSync: new Date().toISOString(),
        };
      });
      console.log('[useShareBucket] AppState updated with optimistic permission');

      // Return context for rollback
      return { previousBucket, previousAppState, bucketId };
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

      // Update appState with new permission
      queryClient.setQueryData(['app-state'], (oldAppState: any) => {
        if (!oldAppState) return oldAppState;

        const updatedBuckets = oldAppState.buckets.map((bucket: any) => {
          if (bucket.id === bucketId) {
            return {
              ...bucket,
              permissions: [
                ...(bucket.permissions || []).filter((p: any) => !p.id.startsWith('temp-')),
                newPermission,
              ],
            };
          }
          return bucket;
        });

        return {
          ...oldAppState,
          buckets: updatedBuckets,
          lastSync: new Date().toISOString(),
        };
      });
      console.log('[useShareBucket] AppState updated with new permission');

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

      // Rollback appState
      if (context?.previousAppState) {
        queryClient.setQueryData(['app-state'], context.previousAppState);
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
      const previousAppState = queryClient.getQueryData(['app-state']);

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

      // Update appState with optimistic permission removal
      queryClient.setQueryData(['app-state'], (oldAppState: any) => {
        if (!oldAppState) return oldAppState;

        const updatedBuckets = oldAppState.buckets.map((bucket: any) => {
          if (bucket.id === bucketId) {
            return {
              ...bucket,
              permissions: (bucket.permissions || []).filter((p: any) => p.user.id !== targetUserId),
            };
          }
          return bucket;
        });

        return {
          ...oldAppState,
          buckets: updatedBuckets,
          lastSync: new Date().toISOString(),
        };
      });
      console.log('[useUnshareBucket] AppState updated with permission removal');

      // Return context for rollback
      return { previousBucket, previousAppState, bucketId };
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

      // Rollback appState
      if (context?.previousAppState) {
        queryClient.setQueryData(['app-state'], context.previousAppState);
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

/**
 * Hook for creating a bucket with proper cache updates
 * Updates appState, bucketsStats, and local database
 * 
 * @example
 * ```typescript
 * import { useCreateBucket } from '@/hooks/notifications';
 * 
 * const { createBucket, isLoading } = useCreateBucket({
 *   onSuccess: (bucket) => console.log('Bucket created:', bucket.id),
 *   onError: (error) => console.error('Create failed:', error)
 * });
 * 
 * await createBucket({
 *   name: 'My Bucket',
 *   description: 'Bucket description',
 *   color: '#2196F3',
 *   icon: 'inbox',
 *   isProtected: false,
 *   isPublic: false,
 * });
 * ```
 */
export function useCreateBucket(options?: {
  onSuccess?: (bucket: any) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [createBucketMutation] = useCreateBucketMutation();

  const mutation = useMutation({
    mutationFn: async (input: {
      name: string;
      description?: string;
      color?: string;
      icon?: string;
      isProtected?: boolean;
      isPublic?: boolean;
      generateMagicCode?: boolean;
      preset?: string;
      externalNotifySystemId?: string | null;
      externalSystemChannel?: string | null;
    }) => {
      console.log('[useCreateBucket] Creating bucket:', input.name);

      const { data } = await createBucketMutation({
        variables: { input },
      });

      if (!data?.createBucket) {
        throw new Error('Failed to create bucket');
      }

      return data.createBucket;
    },
    onMutate: async (input) => {
      console.log('[useCreateBucket] Optimistic update:', input.name);

      // Cancel all queries to prevent refetch during creation
      await queryClient.cancelQueries();
      console.log('[useCreateBucket] Cancelled all queries');
    },
    onSuccess: async (bucket, variables) => {
      console.log('[useCreateBucket] Bucket created successfully:', bucket.id);

      // Step 1: Save bucket to local database
      try {
        await saveBuckets([{
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
          preset: bucket.preset ?? null,
          userBucket: bucket.userBucket,
          user: bucket.user,
          permissions: bucket.permissions,
          userPermissions: bucket.userPermissions,
          isOrphan: false, // Newly created buckets are never orphans
        }]);
        console.log('[useCreateBucket] Bucket saved to local database');
      } catch (error) {
        console.error('[useCreateBucket] Error saving bucket to local database:', error);
      }

      // Step 2: Update appState with new bucket and recalculated stats
      try {
        const updatedStats = await getNotificationStats([]);
        console.log(`[useCreateBucket] Recalculated stats: ${updatedStats.totalCount} total notifications (${updatedStats.unreadCount} unread)`);

        // Update appState cache with new bucket and stats
        queryClient.setQueryData(['app-state'], (oldAppState: any) => {
          if (!oldAppState) return oldAppState;

          // Add new bucket to buckets list
          const newBucket: BucketWithStats = {
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
            preset: bucket.preset ?? null,
            totalMessages: 0,
            unreadCount: 0,
            lastNotificationAt: null,
            isSnoozed: false,
            snoozeUntil: null,
            user: bucket.user,
            permissions: bucket.permissions,
            userPermissions: bucket.userPermissions,
            userBucket: bucket.userBucket,
            magicCode: bucket.userBucket?.magicCode ?? null,
            isOrphan: false,
          };

          return {
            ...oldAppState,
            buckets: [...oldAppState.buckets, newBucket],
            stats: updatedStats,
            lastSync: new Date().toISOString(),
          };
        });
        console.log('[useCreateBucket] AppState updated with new bucket and recalculated stats');
      } catch (error) {
        console.error('[useCreateBucket] Error updating appState:', error);
      }

      // Step 2.5: Also update bucket detail cache for immediate use
      try {
        queryClient.setQueryData(bucketKeys.detail(bucket.id), bucket);
        console.log('[useCreateBucket] Bucket detail cache updated');
      } catch (error) {
        console.error('[useCreateBucket] Error updating bucket detail cache:', error);
      }

      // Step 3: Invalidate related queries
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.bucketsStats(),
        refetchType: 'none',
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.stats(),
        refetchType: 'none',
      });
      console.log('[useCreateBucket] Related queries invalidated');

      if (options?.onSuccess) {
        options.onSuccess(bucket);
      }
    },
    onError: (error, variables) => {
      console.error('[useCreateBucket] Mutation failed:', error);

      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });

  return {
    createBucket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook for updating an existing bucket with Cloudkit sync
 * 
 * @example
 * ```typescript
 * import { useUpdateBucket } from '@/hooks/notifications';
 * 
 * const { updateBucket, isLoading } = useUpdateBucket({
 *   onSuccess: () => router.back(),
 *   onError: (error) => Alert.alert('Error', error.message)
 * });
 * 
 * await updateBucket({
 *   bucketId: 'bucket-id',
 *   data: { name: 'New Name', color: '#FF0000' }
 * });
 * ```
 */
export function useUpdateBucket(options?: {
  onSuccess?: (bucketId: string) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  const [updateBucketMutation] = useUpdateBucketMutation();

  const mutation = useMutation({
    mutationFn: async (variables: {
      bucketId: string;
      data: {
        name?: string | null;
        description?: string | null;
        color?: string | null;
        icon?: string | null;
        generateIconWithInitials?: boolean | null;
        externalNotifySystemId?: string | null;
        externalSystemChannel?: string | null;
      };
    }) => {
      console.log('[useUpdateBucket] Updating bucket:', variables.bucketId);

      // Call GraphQL mutation
      const result = await updateBucketMutation({
        variables: {
          id: variables.bucketId,
          input: variables.data,
        },
      });

      if (!result.data?.updateBucket) {
        throw new Error('Failed to update bucket');
      }

      return result.data.updateBucket;
    },
    onSuccess: async (bucket, variables) => {
      console.log('[useUpdateBucket] Bucket updated successfully:', bucket.id);

      // Step 1: Save bucket to local database
      try {
        await saveBuckets([{
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
          preset: bucket.preset ?? null,
          userBucket: bucket.userBucket,
          user: bucket.user,
          permissions: bucket.permissions,
          userPermissions: bucket.userPermissions,
          isOrphan: false,
        }]);
        console.log('[useUpdateBucket] Bucket saved to local database');
      } catch (error) {
        console.error('[useUpdateBucket] Error saving bucket to local database:', error);
      }

      // Step 2: Update bucket detail cache
      queryClient.setQueryData<BucketDetailData>(
        bucketKeys.detail(bucket.id),
        (old) => {
          if (!old) return old;
          return {
            ...old,
            name: bucket.name,
            description: bucket.description,
            color: bucket.color,
            icon: bucket.icon,
            iconAttachmentUuid: bucket.iconAttachmentUuid,
            iconUrl: bucket.iconUrl,
            updatedAt: bucket.updatedAt,
          };
        }
      );

      // Step 3: Update bucket in appState
      queryClient.setQueryData(['app-state'], (oldAppState: any) => {
        if (!oldAppState) return oldAppState;

        const updatedBuckets = oldAppState.buckets.map((b: BucketWithStats) => {
          if (b.id === bucket.id) {
            return {
              ...b,
              name: bucket.name,
              description: bucket.description,
              color: bucket.color,
              icon: bucket.icon,
              iconAttachmentUuid: bucket.iconAttachmentUuid,
              iconUrl: bucket.iconUrl,
              preset: bucket.preset ?? b.preset ?? null,
              updatedAt: bucket.updatedAt,
            };
          }
          return b;
        });

        return {
          ...oldAppState,
          buckets: updatedBuckets,
          lastSync: new Date().toISOString(),
        };
      });
      console.log('[useUpdateBucket] Bucket updated in appState');

      // Step 4: Invalidate related queries
      await queryClient.invalidateQueries({
        queryKey: bucketKeys.detail(bucket.id),
        refetchType: 'none',
      });
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.bucketsStats(),
        refetchType: 'none',
      });
      console.log('[useUpdateBucket] Related queries invalidated');

      if (options?.onSuccess) {
        options.onSuccess(bucket.id);
      }
    },
    onError: (error, variables) => {
      console.error('[useUpdateBucket] Mutation failed:', error);

      if (options?.onError) {
        options.onError(error as Error);
      }
    },
  });

  return {
    updateBucket: mutation.mutateAsync,
    isLoading: mutation.isPending,
    error: mutation.error,
  };
}
