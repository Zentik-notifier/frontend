/**
 * React Query hooks for notification mutations
 * Provides hooks for creating, updating, and deleting notifications with local DB sync
 */

import { NotificationFragment } from '@/generated/gql-operations-generated';
import {
    deleteNotificationFromCache,
    deleteNotificationsFromCache,
    getAllNotificationsFromCache,
    updateNotificationReadStatus,
    updateNotificationsReadStatus
} from '@/services/notifications-repository';
import {
    DeleteNotificationInput,
    MarkAsReadInput,
    NotificationQueryResult
} from '@/types/notifications';
import {
    InfiniteData,
    useMutation,
    UseMutationOptions,
    UseMutationResult,
    useQueryClient,
} from '@tanstack/react-query';
import { notificationKeys, useRefreshBucketsStatsFromDB } from './useNotificationQueries';

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
    mutationOptions?: Omit<UseMutationOptions<string, Error, string>, 'mutationFn'>
): UseMutationResult<string, Error, string> {
    const queryClient = useQueryClient();
    const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            // LOCAL ONLY: Update local DB immediately
            const now = new Date().toISOString();
            await updateNotificationReadStatus(notificationId, now);

            return notificationId;
        },
        onSuccess: (notificationId) => {
            const now = new Date().toISOString();
            const wasUnreadRef = { current: false };

            // Update query cache directly - modify notification in all lists
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n => {
                                if (n.id === notificationId) {
                                    // Check if it was unread before
                                    if (!n.readAt) {
                                        wasUnreadRef.current = true;
                                    }
                                    return { ...n, readAt: now };
                                }
                                return n;
                            }),
                        })),
                    };
                }
            );

            // Update stats cache - decrease unread count only if it was unread
            if (wasUnreadRef.current) {
                queryClient.setQueriesData(
                    { queryKey: notificationKeys.stats() },
                    (oldStats: any) => {
                        if (!oldStats) return oldStats;
                        return {
                            ...oldStats,
                            unreadCount: Math.max(0, (oldStats.unreadCount || 0) - 1),
                        };
                    }
                );
            }

            // Update detail cache if exists
            const cachedNotification = queryClient.getQueryData<NotificationFragment>(
                notificationKeys.detail(notificationId)
            );
            if (cachedNotification) {
                queryClient.setQueryData(
                    notificationKeys.detail(notificationId),
                    { ...cachedNotification, readAt: now }
                );
            }

            // Refresh bucketsStats from local DB
            refreshBucketsStatsFromDB();
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
    mutationOptions?: Omit<UseMutationOptions<string, Error, string>, 'mutationFn'>
): UseMutationResult<string, Error, string> {
    const queryClient = useQueryClient();
    const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            // LOCAL ONLY: Mark as unread in local DB (set readAt to null)
            await updateNotificationReadStatus(notificationId, null);

            return notificationId;
        },
        onSuccess: (notificationId) => {
            const wasReadRef = { current: false };

            // Update query cache directly - modify notification in all lists
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n => {
                                if (n.id === notificationId) {
                                    // Check if it was read before
                                    if (n.readAt) {
                                        wasReadRef.current = true;
                                    }
                                    return { ...n, readAt: null };
                                }
                                return n;
                            }),
                        })),
                    };
                }
            );

            // Update stats cache - increase unread count only if it was read
            if (wasReadRef.current) {
                queryClient.setQueriesData(
                    { queryKey: notificationKeys.stats() },
                    (oldStats: any) => {
                        if (!oldStats) return oldStats;
                        return {
                            ...oldStats,
                            unreadCount: (oldStats.unreadCount || 0) + 1,
                        };
                    }
                );
            }

            // Update detail cache if exists
            const cachedNotification = queryClient.getQueryData<NotificationFragment>(
                notificationKeys.detail(notificationId)
            );
            if (cachedNotification) {
                queryClient.setQueryData(
                    notificationKeys.detail(notificationId),
                    { ...cachedNotification, readAt: null }
                );
            }

            // Refresh bucketsStats from local DB
            refreshBucketsStatsFromDB();
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
        UseMutationOptions<string[], Error, MarkAsReadInput>,
        'mutationFn'
    >
): UseMutationResult<string[], Error, MarkAsReadInput> {
    const queryClient = useQueryClient();
    const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();

    return useMutation({
        mutationFn: async (input: MarkAsReadInput) => {
            // LOCAL ONLY: Update local DB
            await updateNotificationsReadStatus(input.notificationIds, input.readAt);

            return input.notificationIds;
        },
        onSuccess: (notificationIds, variables) => {
            const isMarkingAsRead = variables.readAt !== null;
            const timestamp = variables.readAt || null;

            // Update cache directly for all affected notifications
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n =>
                                notificationIds.includes(n.id)
                                    ? { ...n, readAt: timestamp }
                                    : n
                            ),
                        })),
                    };
                }
            );

            // Recalculate stats from cache
            const allLists = queryClient.getQueriesData<InfiniteData<NotificationQueryResult>>({
                queryKey: notificationKeys.lists(),
            });

            let newUnreadCount = 0;
            allLists.forEach(([, data]) => {
                if (data) {
                    data.pages.forEach(page => {
                        page.notifications.forEach(n => {
                            if (!n.readAt) {
                                newUnreadCount++;
                            }
                        });
                    });
                }
            });

            // Update stats cache
            queryClient.setQueriesData(
                { queryKey: notificationKeys.stats() },
                (oldStats: any) => {
                    if (!oldStats) return oldStats;
                    return {
                        ...oldStats,
                        unreadCount: newUnreadCount,
                    };
                }
            );

            // Refresh bucketsStats from local DB
            refreshBucketsStatsFromDB();
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
    mutationOptions?: Omit<UseMutationOptions<string, Error, void>, 'mutationFn'>
): UseMutationResult<string, Error, void> {
    const queryClient = useQueryClient();
    const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();

    return useMutation({
        mutationFn: async () => {
            const now = new Date().toISOString();

            // LOCAL ONLY: Read all notifications from DB to find unread ones
            const allNotifications = await getAllNotificationsFromCache();

            // Filter for unread notifications
            const unreadNotifications = allNotifications.filter(n => !n.readAt);
            const unreadNotificationIds = unreadNotifications.map(n => n.id);

            // Update local DB for all unread notifications
            if (unreadNotificationIds.length > 0) {
                await updateNotificationsReadStatus(unreadNotificationIds, now);
            }

            // Return timestamp to use in onSuccess
            return now;
        },
        onSuccess: (timestamp) => {

            // Update query cache directly - mark all notifications as read in all lists
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n => ({
                                ...n,
                                readAt: n.readAt || timestamp,
                            })),
                        })),
                    };
                }
            );

            // Update stats cache - set unread count to 0
            queryClient.setQueriesData(
                { queryKey: notificationKeys.stats() },
                (oldStats: any) => {
                    if (!oldStats) return oldStats;
                    return {
                        ...oldStats,
                        unreadCount: 0,
                    };
                }
            );

            // Refresh bucketsStats from local DB
            refreshBucketsStatsFromDB();
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
    const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            // LOCAL ONLY: Delete from local DB
            await deleteNotificationFromCache(notificationId);
        },
        onSuccess: (data, notificationId, context) => {
            // Track if deleted notification was unread
            const wasUnreadRef = { current: false };

            // Update query cache directly - remove notification from all lists
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.filter(n => {
                                if (n.id === notificationId) {
                                    // Check if it was unread before deletion
                                    if (!n.readAt) {
                                        wasUnreadRef.current = true;
                                    }
                                    return false; // Filter it out
                                }
                                return true;
                            }),
                            totalCount: page.totalCount - 1,
                        })),
                    };
                }
            );

            // Update stats cache - decrease both total and unread if applicable
            queryClient.setQueriesData(
                { queryKey: notificationKeys.stats() },
                (oldStats: any) => {
                    if (!oldStats) return oldStats;
                    return {
                        ...oldStats,
                        totalCount: Math.max(0, (oldStats.totalCount || 0) - 1),
                        unreadCount: wasUnreadRef.current
                            ? Math.max(0, (oldStats.unreadCount || 0) - 1)
                            : oldStats.unreadCount,
                    };
                }
            );

            // Remove from detail cache
            queryClient.removeQueries({
                queryKey: notificationKeys.detail(notificationId),
            });

            // Refresh bucketsStats from local DB
            refreshBucketsStatsFromDB();
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
    const { refreshBucketsStatsFromDB } = useRefreshBucketsStatsFromDB();

    return useMutation({
        mutationFn: async (input: DeleteNotificationInput) => {
            // LOCAL ONLY: Delete from local DB
            await deleteNotificationsFromCache(input.notificationIds);
        },
        onSuccess: (data, variables) => {
            const deletedIds = variables.notificationIds;
            let deletedUnreadCount = 0;

            // Update cache directly - remove deleted notifications
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.filter(n => {
                                if (deletedIds.includes(n.id)) {
                                    // Count unread notifications being deleted
                                    if (!n.readAt) {
                                        deletedUnreadCount++;
                                    }
                                    return false;
                                }
                                return true;
                            }),
                            totalCount: page.totalCount - deletedIds.length,
                        })),
                    };
                }
            );

            // Update stats cache
            queryClient.setQueriesData(
                { queryKey: notificationKeys.stats() },
                (oldStats: any) => {
                    if (!oldStats) return oldStats;
                    return {
                        ...oldStats,
                        totalCount: Math.max(0, (oldStats.totalCount || 0) - deletedIds.length),
                        unreadCount: Math.max(0, (oldStats.unreadCount || 0) - deletedUnreadCount),
                    };
                }
            );

            // Remove from detail cache
            deletedIds.forEach(id => {
                queryClient.removeQueries({
                    queryKey: notificationKeys.detail(id),
                });
            });

            // Refresh bucketsStats from local DB
            refreshBucketsStatsFromDB();
        },
        ...mutationOptions,
    });
}
