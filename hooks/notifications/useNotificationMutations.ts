/**
 * React Query hooks for notification mutations
 * Provides hooks for creating, updating, and deleting notifications with local DB sync
 */

import {
    NotificationFragment,
    useMarkNotificationAsReadMutation,
    useMarkNotificationAsUnreadMutation,
    useMassMarkNotificationsAsReadMutation,
    useMassMarkNotificationsAsUnreadMutation,
    useMarkAllNotificationsAsReadMutation,
    useDeleteNotificationMutation
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
import { Platform } from 'react-native';
import { notificationKeys } from './useNotificationQueries';
import IosBridgeService from '@/services/ios-bridge';

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
/**
 * Update notification in appState cache
 * 
 * @param queryClient - React Query client
 * @param notificationId - ID of the notification to update
 * @param updates - Partial notification updates
 */
export function updateAppStateNotification(
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
export function removeAppStateNotification(
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

export interface MarkAsReadOptions {
    notificationId: string;
    /** Skip local SQLite database update (when already done natively) */
    skipLocalDb?: boolean;
    /** Custom readAt timestamp (from Watch event) */
    readAt?: string;
}

export function useMarkAsRead(
    mutationOptions?: Omit<UseMutationOptions<string, Error, MarkAsReadOptions>, 'mutationFn'>
): UseMutationResult<string, Error, MarkAsReadOptions> {
    const queryClient = useQueryClient();
    const [markAsReadGQL] = useMarkNotificationAsReadMutation();

    return useMutation({
        mutationFn: async (input: MarkAsReadOptions) => {
            const { notificationId, skipLocalDb = false, readAt } = input;
            const now = readAt || new Date().toISOString();

            // 1. Update local DB first (unless skipped - e.g., from Watch events where native already updated)
            if (!skipLocalDb) {
                await updateNotificationReadStatus(notificationId, now);
            }

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
        onSuccess: (id, input) => {
            const { notificationId, readAt } = input;
            const now = readAt || new Date().toISOString();
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

            // Reload iOS widgets to reflect changes
            IosBridgeService.reloadAllWidgets();
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
 *   markUnreadMutation.mutate({
 *     notificationId: 'notification-id',
 *     skipLocalDb: false, // Optional
 *   });
 * };
 * ```
 */
export interface MarkAsUnreadOptions {
    notificationId: string;
    /** Skip local SQLite database update (when already done natively) */
    skipLocalDb?: boolean;
}

export function useMarkAsUnread(
    mutationOptions?: Omit<UseMutationOptions<string, Error, MarkAsUnreadOptions>, 'mutationFn'>
): UseMutationResult<string, Error, MarkAsUnreadOptions> {
    const queryClient = useQueryClient();
    const [markAsUnreadGQL] = useMarkNotificationAsUnreadMutation();

    return useMutation({
        mutationFn: async (input: MarkAsUnreadOptions) => {
            const { notificationId, skipLocalDb = false } = input;

            // 1. Update local DB (unless skipped - e.g., from Watch events where native already updated)
            if (!skipLocalDb) {
                await updateNotificationReadStatus(notificationId, null);
            }

            // 2. Call backend GraphQL mutation
            try {
                await markAsUnreadGQL({
                    variables: { id: notificationId }
                });
            } catch (error) {
                console.warn('Backend markAsUnread failed, but local update succeeded:', error);
            }

            return notificationId;
        },
        onSuccess: (id, input) => {
            const { notificationId } = input;
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

            // Reload iOS widgets to reflect changes
            IosBridgeService.reloadAllWidgets();
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

            // 1. Update local DB first for immediate UI update
            await updateNotificationsReadStatus(input.notificationIds, input.readAt);

            // 2. Sync read status to CloudKit (iOS) so Watch and widgets stay in sync
            if (Platform.OS === 'ios' && input.notificationIds.length > 0) {
                IosBridgeService.updateNotificationsReadStatusInCloudKit(input.notificationIds, input.readAt).catch((error) => {
                    console.error('[useBatchMarkAsRead] CloudKit sync failed:', error);
                });
            }

            // 3. Call backend GraphQL batch mutation in background (this cancels reminders)
            const backendCall = isMarkingAsRead
                ? massMarkAsReadGQL({ variables: { ids: input.notificationIds } })
                : massMarkAsUnreadGQL({ variables: { ids: input.notificationIds } });
            
            // Don't await - let it run in background
            backendCall.catch(error => {
                console.warn('Backend batchMark failed, but local update completed:', error);
            });

            return input.notificationIds;
        },
        onSuccess: (notificationIds, variables) => {
            const timestamp = variables.readAt; // null = unread, string = read
            const isMarkingAsRead = timestamp !== null;

            // Track bucket changes: Map<bucketId, { unreadDelta: number }>
            const bucketChanges = new Map<string, number>();

            // 1. Update notifications in query cache
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
                                    
                                    // Track changes for bucket stats
                                    if (bucketId) {
                                        // If marking as read and was unread -> decrease unread count
                                        // If marking as unread and was read -> increase unread count
                                        if (isMarkingAsRead && !n.readAt) {
                                            const current = bucketChanges.get(bucketId) || 0;
                                            bucketChanges.set(bucketId, current - 1);
                                        } else if (!isMarkingAsRead && n.readAt) {
                                            const current = bucketChanges.get(bucketId) || 0;
                                            bucketChanges.set(bucketId, current + 1);
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

            // 2. Update bucket stats for affected buckets
            bucketChanges.forEach((unreadDelta, bucketId) => {
                updateAppStateBucketStats(queryClient, bucketId, 0, unreadDelta);
            });

            // 3. Update notifications in appState
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
                        if (notificationIds.includes(notification.id)) {
                            return { ...notification, readAt: timestamp };
                        }
                        return notification;
                    });

                    return {
                        ...oldAppState,
                        notifications: updatedNotifications,
                    };
                }
            );

            // 4. Update detail caches for affected notifications
            notificationIds.forEach(id => {
                const cachedNotification = queryClient.getQueryData<NotificationFragment>(
                    notificationKeys.detail(id)
                );
                if (cachedNotification) {
                    queryClient.setQueryData(
                        notificationKeys.detail(id),
                        { ...cachedNotification, readAt: timestamp }
                    );
                }
            });

            // 5. Reload iOS widgets to reflect changes
            IosBridgeService.reloadAllWidgets();
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
    mutationOptions?: Omit<UseMutationOptions<{ timestamp: string; unreadNotificationIds: string[] }, Error, void>, 'mutationFn'>
): UseMutationResult<{ timestamp: string; unreadNotificationIds: string[] }, Error, void> {
    const queryClient = useQueryClient();
    const [markAllAsReadGQL] = useMarkAllNotificationsAsReadMutation();

    return useMutation({
        mutationFn: async () => {
            const now = new Date().toISOString();

            // 1. Read all notifications from DB to find unread ones
            const allNotifications = await getAllNotificationsFromCache();

            // Filter for unread notifications
            const unreadNotifications = allNotifications.filter(n => !n.readAt);
            const unreadNotificationIds = unreadNotifications.map(n => n.id);

            // 2. Update local DB first for immediate UI update
            if (unreadNotificationIds.length > 0) {
                await updateNotificationsReadStatus(unreadNotificationIds, now);
                if (Platform.OS === 'ios') {
                    IosBridgeService.updateNotificationsReadStatusInCloudKit(unreadNotificationIds, now).catch((error) => {
                        console.error('[useMarkAllAsRead] CloudKit sync failed:', error);
                    });
                }
            }

            // 3. Call backend GraphQL mutation in background (this cancels all reminders)
            // Don't await - let it run in background
            markAllAsReadGQL().catch(error => {
                console.warn('Backend markAllAsRead failed, but local update completed:', error);
            });

            // Return both timestamp and unread IDs to use in onSuccess
            return { timestamp: now, unreadNotificationIds };
        },
        onSuccess: (result) => {
            const { timestamp, unreadNotificationIds } = result;
            
            // 1. Update all notifications in query cache
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
                                readAt: n.readAt || timestamp, // Only update if not already read
                            })),
                        })),
                    };
                }
            );

            // 2. Update all notifications in appState and reset bucket stats
            queryClient.setQueryData<{
                buckets: BucketWithStats[];
                notifications: NotificationFragment[];
                stats: any;
                lastSync: string;
            }>(
                ['app-state'],
                (oldAppState) => {
                    if (!oldAppState) return oldAppState;

                    // Update all notifications to be read
                    const updatedNotifications = oldAppState.notifications.map(notification => ({
                        ...notification,
                        readAt: notification.readAt || timestamp,
                    }));

                    // Reset all bucket unread counts to 0
                    const updatedBuckets = oldAppState.buckets.map(bucket => ({
                        ...bucket,
                        unreadCount: 0,
                    }));

                    // Reset overall unread count to 0
                    const updatedStats = {
                        ...oldAppState.stats,
                        unreadCount: 0,
                    };

                    return {
                        ...oldAppState,
                        notifications: updatedNotifications,
                        buckets: updatedBuckets,
                        stats: updatedStats,
                    };
                }
            );

            // 3. Update all detail caches
            const allNotificationIds = queryClient.getQueryData<{ notifications: NotificationFragment[]; }>(['app-state'])?.notifications.map(n => n.id) || [];
            allNotificationIds.forEach(id => {
                const cachedNotification = queryClient.getQueryData<NotificationFragment>(
                    notificationKeys.detail(id)
                );
                if (cachedNotification && !cachedNotification.readAt) {
                    queryClient.setQueryData(
                        notificationKeys.detail(id),
                        { ...cachedNotification, readAt: timestamp }
                    );
                }
            });

            
            // 5. Reload iOS widgets to reflect changes
            IosBridgeService.reloadAllWidgets();
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
 *   deleteMutation.mutate({
 *     notificationId: 'notification-id',
 *     skipLocalDb: false, // Optional
 *   }, {
 *     onSuccess: () => {
 *       console.log('Deleted successfully');
 *     },
 *   });
 * };
 * ```
 */
export interface DeleteNotificationOptions {
    notificationId: string;
    /** Skip local SQLite database update (when already done natively) */
    skipLocalDb?: boolean;
}

export function useDeleteNotification(
    mutationOptions?: Omit<UseMutationOptions<void, Error, DeleteNotificationOptions>, 'mutationFn'>
): UseMutationResult<void, Error, DeleteNotificationOptions> {
    const queryClient = useQueryClient();
    const [deleteNotificationGQL] = useDeleteNotificationMutation();

    return useMutation({
        mutationFn: async (input: DeleteNotificationOptions) => {
            const { notificationId, skipLocalDb = false } = input;

            // 1. Delete from local DB (unless skipped - e.g., from Watch events where native already deleted)
            if (!skipLocalDb) {
                await deleteNotificationFromCache(notificationId);
            }
            // 2. Call backend GraphQL mutation
            try {
                await deleteNotificationGQL({
                    variables: { id: notificationId }
                });
            } catch (error) {
                console.warn('Backend deleteNotification failed, but local delete succeeded:', error);
            }
        },
        onSuccess: (data, input, context) => {
            const { notificationId } = input;
            const wasUnreadRef = { current: false };
            const bucketIdRef = { current: undefined as string | undefined };

            // Update cache directly - remove deleted notification
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
                                    // Check if it was unread before and capture bucket ID
                                    if (!n.readAt) {
                                        wasUnreadRef.current = true;
                                    }
                                    bucketIdRef.current = n.message?.bucket?.id;
                                    return false;
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

            // Reload iOS widgets to reflect changes
            IosBridgeService.reloadAllWidgets();
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

            // Reload iOS widgets to reflect changes
            IosBridgeService.reloadAllWidgets();
        },
        ...mutationOptions,
    });
}
