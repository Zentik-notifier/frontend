/**
 * React Query hooks for notification mutations
 * Provides hooks for creating, updating, and deleting notifications with local DB sync
 */

import { 
    NotificationFragment, 
    useMarkNotificationAsReadMutation, 
    useMarkNotificationAsUnreadMutation,
    useMassMarkNotificationsAsReadMutation,
    useMassMarkNotificationsAsUnreadMutation
} from '@/generated/gql-operations-generated';
import {
    deleteNotificationFromCache,
    deleteNotificationsFromCache,
    getAllNotificationsFromCache,
    updateNotificationReadStatus,
    updateNotificationsReadStatus
} from '@/services/notifications-repository';
import {
    BucketWithStats,
    DeleteNotificationInput,
    MarkAsReadInput,
    NotificationQueryResult
} from '@/types/notifications';
import {
    InfiniteData,
    QueryClient,
    useMutation,
    UseMutationOptions,
    UseMutationResult,
    useQueryClient,
} from '@tanstack/react-query';
import { notificationKeys } from './useNotificationQueries';

// ====================
// HELPER FUNCTIONS
// ====================

/**
 * Update notifications in appState cache
 * 
 * @param queryClient - React Query client
 * @param notificationId - ID of the notification to update
 * @param updates - Partial notification updates
 */
function updateAppStateNotification(
    queryClient: QueryClient,
    notificationId: string,
    updates: Partial<NotificationFragment>
): void {
    queryClient.setQueryData<{
        buckets: BucketWithStats[];
        notifications: NotificationFragment[];
        stats: any;
        lastSync: string;
    }>(
        ['app-state'],
        (oldAppState) => {
            if (!oldAppState) return oldAppState;

            const updatedNotifications = oldAppState.notifications.map(notification => {
                if (notification.id !== notificationId) return notification;
                return { ...notification, ...updates };
            });

            return {
                ...oldAppState,
                notifications: updatedNotifications,
            };
        }
    );
}

/**
 * Remove notification from appState cache
 * 
 * @param queryClient - React Query client
 * @param notificationId - ID of the notification to remove
 */
function removeAppStateNotification(
    queryClient: QueryClient,
    notificationId: string
): void {
    queryClient.setQueryData<{
        buckets: BucketWithStats[];
        notifications: NotificationFragment[];
        stats: any;
        lastSync: string;
    }>(
        ['app-state'],
        (oldAppState) => {
            if (!oldAppState) return oldAppState;

            const updatedNotifications = oldAppState.notifications.filter(
                notification => notification.id !== notificationId
            );

            return {
                ...oldAppState,
                notifications: updatedNotifications,
            };
        }
    );
}

/**
 * Remove multiple notifications from appState cache
 * 
 * @param queryClient - React Query client
 * @param notificationIds - IDs of the notifications to remove
 */
function removeAppStateNotifications(
    queryClient: QueryClient,
    notificationIds: string[]
): void {
    queryClient.setQueryData<{
        buckets: BucketWithStats[];
        notifications: NotificationFragment[];
        stats: any;
        lastSync: string;
    }>(
        ['app-state'],
        (oldAppState) => {
            if (!oldAppState) return oldAppState;

            const updatedNotifications = oldAppState.notifications.filter(
                notification => !notificationIds.includes(notification.id)
            );

            return {
                ...oldAppState,
                notifications: updatedNotifications,
            };
        }
    );
}

/**
 * Update all notifications in appState cache
 * 
 * @param queryClient - React Query client
 * @param updates - Partial notification updates to apply to all notifications
 */
function updateAllAppStateNotifications(
    queryClient: QueryClient,
    updates: Partial<NotificationFragment>
): void {
    queryClient.setQueryData<{
        buckets: BucketWithStats[];
        notifications: NotificationFragment[];
        stats: any;
        lastSync: string;
    }>(
        ['app-state'],
        (oldAppState) => {
            if (!oldAppState) return oldAppState;

            const updatedNotifications = oldAppState.notifications.map(notification => ({
                ...notification,
                ...updates,
            }));

            return {
                ...oldAppState,
                notifications: updatedNotifications,
            };
        }
    );
}
/**
 * Update stats for a specific bucket in appState cache
 * This is much more efficient than refreshing all buckets from DB
 * 
 * @param queryClient - React Query client
 * @param bucketId - ID of the bucket to update
 * @param totalDelta - Change in total count (e.g., -1 for delete)
 * @param unreadDelta - Change in unread count (e.g., -1 for mark as read)
 */
function updateAppStateBucketStats(
    queryClient: QueryClient,
    bucketId: string | undefined,
    totalDelta: number,
    unreadDelta: number
): void {
    if (!bucketId) return;

    queryClient.setQueryData<{
        buckets: BucketWithStats[];
        notifications: NotificationFragment[];
        stats: any;
        lastSync: string;
    }>(
        ['app-state'],
        (oldAppState) => {
            if (!oldAppState) return oldAppState;

            const updatedBuckets = oldAppState.buckets.map(bucket => {
                if (bucket.id !== bucketId) return bucket;

                const newTotalMessages = Math.max(0, bucket.totalMessages + totalDelta);
                const newUnreadCount = Math.max(0, bucket.unreadCount + unreadDelta);

                return {
                    ...bucket,
                    totalMessages: newTotalMessages,
                    unreadCount: newUnreadCount,
                };
            });

            // Update overall stats
            const updatedStats = {
                ...oldAppState.stats,
                totalCount: Math.max(0, oldAppState.stats.totalCount + totalDelta),
                unreadCount: Math.max(0, oldAppState.stats.unreadCount + unreadDelta),
            };

            return {
                ...oldAppState,
                buckets: updatedBuckets,
                stats: updatedStats,
            };
        }
    );
}

export function useMarkAsRead(
    mutationOptions?: Omit<UseMutationOptions<string, Error, string>, 'mutationFn'>
): UseMutationResult<string, Error, string> {
    const queryClient = useQueryClient();
    const [markAsReadGQL] = useMarkNotificationAsReadMutation();

    return useMutation({
        mutationFn: async (notificationId: string) => {
            const now = new Date().toISOString();
            
            // 1. Update local DB first (optimistic update)
            await updateNotificationReadStatus(notificationId, now);

            // 2. Try to call backend GraphQL mutation (this cancels reminders)
            try {
                await markAsReadGQL({
                    variables: { id: notificationId }
                });
            } catch (error) {
                // If backend fails, we still want to update the cache
                // The local DB is already updated, so we proceed
                console.warn('Backend markAsRead failed, but local update succeeded:', error);
            }

            return notificationId;
        },
        onSuccess: (notificationId) => {
            const now = new Date().toISOString();
            const wasUnreadRef = { current: false };
            const bucketIdRef = { current: undefined as string | undefined };

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
                                    // Check if it was unread before and capture bucket ID
                                    if (!n.readAt) {
                                        wasUnreadRef.current = true;
                                    }
                                    bucketIdRef.current = n.message?.bucket?.id;
                                    return { ...n, readAt: now };
                                }
                                return n;
                            }),
                        })),
                    };
                }
            );

            // Update bucket stats: decrease unread count by 1
            if (wasUnreadRef.current) {
                updateAppStateBucketStats(queryClient, bucketIdRef.current, 0, -1);
            }

            // Update notification in appState
            updateAppStateNotification(queryClient, notificationId, { readAt: now });

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

    return useMutation({
        mutationFn: async (notificationId: string) => {
            // LOCAL ONLY: Mark as unread in local DB (set readAt to null)
            await updateNotificationReadStatus(notificationId, null);

            return notificationId;
        },
        onSuccess: (notificationId) => {
            const wasReadRef = { current: false };
            const bucketIdRef = { current: undefined as string | undefined };

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
                                    // Check if it was read before and capture bucket ID
                                    if (n.readAt) {
                                        wasReadRef.current = true;
                                    }
                                    bucketIdRef.current = n.message?.bucket?.id;
                                    return { ...n, readAt: null };
                                }
                                return n;
                            }),
                        })),
                    };
                }
            );

            // Update bucket stats: increase unread count by 1
            if (wasReadRef.current) {
                updateAppStateBucketStats(queryClient, bucketIdRef.current, 0, +1);
            }

            // Update notification in appState
            updateAppStateNotification(queryClient, notificationId, { readAt: null });

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
    const [massMarkAsReadGQL] = useMassMarkNotificationsAsReadMutation();
    const [massMarkAsUnreadGQL] = useMassMarkNotificationsAsUnreadMutation();

    return useMutation({
        mutationFn: async (input: MarkAsReadInput) => {
            const isMarkingAsRead = input.readAt !== null;
            
            // 1. Call backend GraphQL batch mutation (this cancels reminders)
            if (isMarkingAsRead) {
                await massMarkAsReadGQL({ 
                    variables: { ids: input.notificationIds } 
                });
            } else {
                await massMarkAsUnreadGQL({ 
                    variables: { ids: input.notificationIds } 
                });
            }

            // 2. Update local DB
            await updateNotificationsReadStatus(input.notificationIds, input.readAt);

            return input.notificationIds;
        },
        onSuccess: (notificationIds, variables) => {
            const isMarkingAsRead = variables.readAt !== null;
            const timestamp = variables.readAt || null;

            // Track bucket changes: Map<bucketId, unreadDelta>
            const bucketChanges = new Map<string, number>();

            // Update cache directly for all affected notifications
            queryClient.setQueriesData<InfiniteData<NotificationQueryResult>>(
                { queryKey: notificationKeys.lists() },
                (oldData) => {
                    if (!oldData) return oldData;

                    return {
                        ...oldData,
                        pages: oldData.pages.map(page => ({
                            ...page,
                            notifications: page.notifications.map(n => {
                                if (notificationIds.includes(n.id)) {
                                    const bucketId = n.message?.bucket?.id;
                                    
                                    // Track bucket changes
                                    if (bucketId) {
                                        if (isMarkingAsRead && !n.readAt) {
                                            // Was unread, now read: -1 unread
                                            bucketChanges.set(bucketId, (bucketChanges.get(bucketId) || 0) - 1);
                                        } else if (!isMarkingAsRead && n.readAt) {
                                            // Was read, now unread: +1 unread
                                            bucketChanges.set(bucketId, (bucketChanges.get(bucketId) || 0) + 1);
                                        }
                                    }
                                    
                                    return { ...n, readAt: timestamp };
                                }
                                return n;
                            }),
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

            // Update bucket stats for affected buckets
            bucketChanges.forEach((unreadDelta, bucketId) => {
                if (unreadDelta !== 0) {
                    updateAppStateBucketStats(queryClient, bucketId, 0, unreadDelta);
                }
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
    mutationOptions?: Omit<UseMutationOptions<string, Error, void>, 'mutationFn'>
): UseMutationResult<string, Error, void> {
    const queryClient = useQueryClient();

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

            // Update app state - set all bucket unread counts to 0
            queryClient.setQueryData<{
                buckets: BucketWithStats[];
                notifications: NotificationFragment[];
                stats: any;
                lastSync: string;
            }>(
                ['app-state'],
                (oldAppState) => {
                    if (!oldAppState) return oldAppState;

                    const updatedBuckets = oldAppState.buckets.map(bucket => ({
                        ...bucket,
                        unreadCount: 0,
                    }));

                    const updatedNotifications = oldAppState.notifications.map(notification => ({
                        ...notification,
                        readAt: notification.readAt || timestamp,
                    }));

                    const updatedStats = {
                        ...oldAppState.stats,
                        unreadCount: 0,
                    };

                    return {
                        ...oldAppState,
                        buckets: updatedBuckets,
                        notifications: updatedNotifications,
                        stats: updatedStats,
                    };
                }
            );
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
            // LOCAL ONLY: Delete from local DB
            await deleteNotificationFromCache(notificationId);
        },
        onSuccess: (data, notificationId, context) => {
            // Track if deleted notification was unread and its bucket
            const wasUnreadRef = { current: false };
            const bucketIdRef = { current: undefined as string | undefined };

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
                                    // Check if it was unread before deletion and capture bucket ID
                                    if (!n.readAt) {
                                        wasUnreadRef.current = true;
                                    }
                                    bucketIdRef.current = n.message?.bucket?.id;
                                    return false; // Filter it out
                                }
                                return true;
                            }),
                            totalCount: page.totalCount - 1,
                        })),
                    };
                }
            );

            // Update bucket stats: decrease total by 1, decrease unread by 1 if was unread
            updateAppStateBucketStats(
                queryClient, 
                bucketIdRef.current, 
                -1, 
                wasUnreadRef.current ? -1 : 0
            );

            // Remove notification from appState
            removeAppStateNotification(queryClient, notificationId);

            // Remove from detail cache
            queryClient.removeQueries({
                queryKey: notificationKeys.detail(notificationId),
            });
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
            // LOCAL ONLY: Delete from local DB
            await deleteNotificationsFromCache(input.notificationIds);
        },
        onSuccess: (data, variables) => {
            const deletedIds = variables.notificationIds;
            let deletedUnreadCount = 0;

            // Track bucket changes: Map<bucketId, { total: number, unread: number }>
            const bucketChanges = new Map<string, { total: number, unread: number }>();

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
                                    const bucketId = n.message?.bucket?.id;
                                    
                                    // Count unread notifications being deleted
                                    const wasUnread = !n.readAt;
                                    if (wasUnread) {
                                        deletedUnreadCount++;
                                    }

                                    // Track bucket changes
                                    if (bucketId) {
                                        const current = bucketChanges.get(bucketId) || { total: 0, unread: 0 };
                                        bucketChanges.set(bucketId, {
                                            total: current.total + 1,
                                            unread: current.unread + (wasUnread ? 1 : 0),
                                        });
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

            // Update bucket stats for affected buckets
            bucketChanges.forEach(({ total, unread }, bucketId) => {
                updateAppStateBucketStats(queryClient, bucketId, -total, -unread);
            });

            // Remove notifications from appState
            removeAppStateNotifications(queryClient, deletedIds);

            // Remove from detail cache
            deletedIds.forEach(id => {
                queryClient.removeQueries({
                    queryKey: notificationKeys.detail(id),
                });
            });
        },
        ...mutationOptions,
    });
}
