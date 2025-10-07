/**
 * React Query hooks for notification mutations
 * Provides hooks for creating, updating, and deleting notifications with local DB sync
 */

import {
  useMutation,
  UseMutationResult,
  UseMutationOptions,
  useQueryClient,
} from '@tanstack/react-query';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import {
  CreateNotificationInput,
  UpdateNotificationInput,
  MarkAsReadInput,
  DeleteNotificationInput,
} from '@/types/notifications';
import {
  createNotification,
  updateNotification,
  markNotificationAsRead,
  markNotificationAsUnread,
  markNotificationsAsRead,
  markAllNotificationsAsRead,
  deleteNotification,
  deleteNotifications,
} from '@/services/api/notifications-api';
import {
  saveNotificationToCache,
  updateNotificationReadStatus,
  updateNotificationsReadStatus,
  deleteNotificationFromCache,
  deleteNotificationsFromCache,
  clearAllNotificationsFromCache,
} from '@/services/notifications-repository';
import { notificationKeys } from './useNotificationQueries';

// ====================
// CREATE MUTATIONS
// ====================

/**
 * Hook for creating a new notification
 * Automatically syncs with local DB and invalidates relevant queries
 * 
 * @example
 * ```tsx
 * const createMutation = useCreateNotification();
 * 
 * const handleCreate = () => {
 *   createMutation.mutate({
 *     bucketId: 'bucket-id',
 *     title: 'New notification',
 *     body: 'Notification body',
 *   }, {
 *     onSuccess: (notification) => {
 *       console.log('Created:', notification);
 *     },
 *   });
 * };
 * ```
 */
export function useCreateNotification(
  mutationOptions?: Omit<
    UseMutationOptions<NotificationFragment, Error, CreateNotificationInput>,
    'mutationFn'
  >
): UseMutationResult<NotificationFragment, Error, CreateNotificationInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateNotificationInput) => {
      // Create via API
      const notification = await createNotification(input);

      // Sync to local DB
      await saveNotificationToCache(notification);

      return notification;
    },
    onSuccess: (notification, variables, context) => {
      // Invalidate all notification lists to trigger refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      
      // Invalidate bucket-specific queries
      queryClient.invalidateQueries({
        queryKey: notificationKeys.bucket(notification.message.bucket.id),
      });
      
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
    ...mutationOptions,
  });
}

// ====================
// UPDATE MUTATIONS
// ====================

/**
 * Hook for updating a notification
 * 
 * @example
 * ```tsx
 * const updateMutation = useUpdateNotification();
 * 
 * const handleUpdate = () => {
 *   updateMutation.mutate({
 *     id: 'notification-id',
 *     readAt: new Date().toISOString(),
 *   });
 * };
 * ```
 */
export function useUpdateNotification(
  mutationOptions?: Omit<
    UseMutationOptions<NotificationFragment, Error, UpdateNotificationInput>,
    'mutationFn'
  >
): UseMutationResult<NotificationFragment, Error, UpdateNotificationInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateNotificationInput) => {
      // Update via API
      const notification = await updateNotification(input);

      // Sync to local DB
      await saveNotificationToCache(notification);

      return notification;
    },
    onSuccess: (notification, variables, context) => {
      // Invalidate specific notification
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(notification.id),
      });
      
      // Invalidate lists
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.bucket(notification.message.bucket.id),
      });
      
      // Invalidate stats
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
    ...mutationOptions,
  });
}

// ====================
// READ STATUS MUTATIONS
// ====================

/**
 * Hook for marking a notification as read
 * 
 * @example
 * ```tsx
 * const markReadMutation = useMarkAsRead();
 * 
 * const handleMarkRead = () => {
 *   markReadMutation.mutate('notification-id');
 * };
 * ```
 */
export function useMarkAsRead(
  mutationOptions?: Omit<UseMutationOptions<NotificationFragment, Error, string>, 'mutationFn'>
): UseMutationResult<NotificationFragment, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Mark as read via API
      const notification = await markNotificationAsRead(notificationId);

      // Update local DB
      await updateNotificationReadStatus(notificationId, notification.readAt);

      return notification;
    },
    onSuccess: (notification, variables, context) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(notification.id),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.bucket(notification.message.bucket.id),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for marking a notification as unread
 * 
 * @example
 * ```tsx
 * const markUnreadMutation = useMarkAsUnread();
 * 
 * const handleMarkUnread = () => {
 *   markUnreadMutation.mutate('notification-id');
 * };
 * ```
 */
export function useMarkAsUnread(
  mutationOptions?: Omit<UseMutationOptions<NotificationFragment, Error, string>, 'mutationFn'>
): UseMutationResult<NotificationFragment, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Mark as unread via API
      const notification = await markNotificationAsUnread(notificationId);

      // Update local DB
      await updateNotificationReadStatus(notificationId, null);

      return notification;
    },
    onSuccess: (notification, variables, context) => {
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(notification.id),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({
        queryKey: notificationKeys.bucket(notification.message.bucket.id),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for marking multiple notifications as read/unread
 * 
 * @example
 * ```tsx
 * const batchMarkMutation = useBatchMarkAsRead();
 * 
 * const handleBatchMark = () => {
 *   batchMarkMutation.mutate({
 *     notificationIds: ['id1', 'id2', 'id3'],
 *     readAt: new Date().toISOString(), // or null for unread
 *   });
 * };
 * ```
 */
export function useBatchMarkAsRead(
  mutationOptions?: Omit<
    UseMutationOptions<NotificationFragment[], Error, MarkAsReadInput>,
    'mutationFn'
  >
): UseMutationResult<NotificationFragment[], Error, MarkAsReadInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: MarkAsReadInput) => {
      // Mark as read/unread via API
      const notifications = await markNotificationsAsRead(input);

      // Update local DB
      await updateNotificationsReadStatus(input.notificationIds, input.readAt);

      return notifications;
    },
    onSuccess: (notifications, variables, context) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.buckets() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });

      // Invalidate individual notification queries
      notifications.forEach(notification => {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.detail(notification.id),
        });
      });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for marking all notifications as read
 * 
 * @example
 * ```tsx
 * const markAllReadMutation = useMarkAllAsRead();
 * 
 * const handleMarkAllRead = () => {
 *   markAllReadMutation.mutate();
 * };
 * ```
 */
export function useMarkAllAsRead(
  mutationOptions?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Mark all as read via API
      await markAllNotificationsAsRead();

      // Note: We don't update local DB here because we'd need to fetch
      // all notification IDs first. Instead, we invalidate queries
      // and let them refetch with updated data.
    },
    onSuccess: (data, variables, context) => {
      // Invalidate all queries to trigger refetch
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    ...mutationOptions,
  });
}

// ====================
// DELETE MUTATIONS
// ====================

/**
 * Hook for deleting a notification
 * 
 * @example
 * ```tsx
 * const deleteMutation = useDeleteNotification();
 * 
 * const handleDelete = () => {
 *   deleteMutation.mutate('notification-id', {
 *     onSuccess: () => {
 *       console.log('Deleted successfully');
 *     },
 *   });
 * };
 * ```
 */
export function useDeleteNotification(
  mutationOptions?: Omit<UseMutationOptions<void, Error, string>, 'mutationFn'>
): UseMutationResult<void, Error, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (notificationId: string) => {
      // Delete via API
      await deleteNotification(notificationId);

      // Delete from local DB
      await deleteNotificationFromCache(notificationId);
    },
    onSuccess: (data, notificationId, context) => {
      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: notificationKeys.detail(notificationId),
      });
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.buckets() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for deleting multiple notifications
 * 
 * @example
 * ```tsx
 * const batchDeleteMutation = useBatchDeleteNotifications();
 * 
 * const handleBatchDelete = () => {
 *   batchDeleteMutation.mutate({
 *     notificationIds: ['id1', 'id2', 'id3'],
 *   });
 * };
 * ```
 */
export function useBatchDeleteNotifications(
  mutationOptions?: Omit<UseMutationOptions<void, Error, DeleteNotificationInput>, 'mutationFn'>
): UseMutationResult<void, Error, DeleteNotificationInput> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: DeleteNotificationInput) => {
      // Delete via API
      await deleteNotifications(input);

      // Delete from local DB
      await deleteNotificationsFromCache(input.notificationIds);
    },
    onSuccess: (data, variables, context) => {
      // Invalidate all relevant queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.lists() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.buckets() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
      queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });

      // Invalidate individual notification queries
      variables.notificationIds.forEach(id => {
        queryClient.invalidateQueries({
          queryKey: notificationKeys.detail(id),
        });
      });
    },
    ...mutationOptions,
  });
}

/**
 * Hook for clearing all notifications
 * Use with caution!
 * 
 * @example
 * ```tsx
 * const clearAllMutation = useClearAllNotifications();
 * 
 * const handleClearAll = () => {
 *   if (confirm('Are you sure?')) {
 *     clearAllMutation.mutate();
 *   }
 * };
 * ```
 */
export function useClearAllNotifications(
  mutationOptions?: Omit<UseMutationOptions<void, Error, void>, 'mutationFn'>
): UseMutationResult<void, Error, void> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      // Clear local DB
      await clearAllNotificationsFromCache();

      // Note: This doesn't delete from backend, only local cache
      // If you want to delete from backend too, implement that logic here
    },
    onSuccess: (data, variables, context) => {
      // Invalidate all queries
      queryClient.invalidateQueries({ queryKey: notificationKeys.all });
    },
    ...mutationOptions,
  });
}

// ====================
// OPTIMISTIC UPDATES
// ====================

/**
 * Hook for marking a notification as read with optimistic update
 * Updates UI immediately, then syncs with backend
 * 
 * @example
 * ```tsx
 * const markReadMutation = useOptimisticMarkAsRead();
 * 
 * const handleMarkRead = () => {
 *   markReadMutation.mutate('notification-id');
 * };
 * ```
 */
export function useOptimisticMarkAsRead(
  mutationOptions?: Omit<UseMutationOptions<NotificationFragment, Error, string, { previousNotification?: NotificationFragment }>, 'mutationFn'>
): UseMutationResult<NotificationFragment, Error, string, { previousNotification?: NotificationFragment }> {
  const queryClient = useQueryClient();

  return useMutation<NotificationFragment, Error, string, { previousNotification?: NotificationFragment }>({
    mutationFn: async (notificationId: string) => {
      // Update local DB immediately (optimistic)
      const now = new Date().toISOString();
      await updateNotificationReadStatus(notificationId, now);

      // Then update via API
      const notification = await markNotificationAsRead(notificationId);

      return notification;
    },
    onMutate: async (notificationId) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: notificationKeys.detail(notificationId) });

      // Snapshot previous value
      const previousNotification = queryClient.getQueryData<NotificationFragment>(
        notificationKeys.detail(notificationId)
      );

      // Optimistically update cache
      if (previousNotification) {
        queryClient.setQueryData<NotificationFragment>(
          notificationKeys.detail(notificationId),
          {
            ...previousNotification,
            readAt: new Date().toISOString(),
          }
        );
      }

      return { previousNotification };
    },
    onError: (error, notificationId, context) => {
      // Rollback on error
      const ctx = context as { previousNotification?: NotificationFragment } | undefined;
      if (ctx?.previousNotification) {
        queryClient.setQueryData(
          notificationKeys.detail(notificationId),
          ctx.previousNotification
        );
      }
    },
    onSettled: (notification) => {
      if (notification) {
        // Refetch to ensure consistency
        queryClient.invalidateQueries({
          queryKey: notificationKeys.detail(notification.id),
        });
        queryClient.invalidateQueries({ queryKey: notificationKeys.stats() });
        queryClient.invalidateQueries({ queryKey: notificationKeys.unreadCounts() });
      }
    },
    ...mutationOptions,
  });
}
