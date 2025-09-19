import { GetNotificationsDocument, NotificationFragment, NotificationFragmentDoc, useDeleteNotificationMutation, useGetNotificationLazyQuery, useGetNotificationsLazyQuery, useMarkAllNotificationsAsReadMutation, useMarkNotificationAsReadMutation, useMarkNotificationAsUnreadMutation, useMassDeleteNotificationsMutation, useMassMarkNotificationsAsReadMutation, useMassMarkNotificationsAsUnreadMutation, useUpdateReceivedNotificationsMutation, MediaType, useGetNotificationQuery, useGetNotificationsQuery } from '@/generated/gql-operations-generated';
import { saveNotificationsToPersistedCache } from '@/config/apollo-client';
import { mediaCache } from '@/services/media-cache';
import { Reference, useApolloClient } from '@apollo/client';
import { useCallback, useEffect, useRef, useState } from 'react';

const shouldUpdateRemoteReadAt = false;

export const useSaveNotificationsToStorage = () => {
	const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const DEBOUNCE_DELAY = 2000;
	const {
		notifications,
	} = useFetchNotifications();

	const saveNotifications = useCallback(() => {
		if (debounceTimeoutRef.current) {
			clearTimeout(debounceTimeoutRef.current);
		}

		debounceTimeoutRef.current = setTimeout(async () => {
			console.log('🔄 Saving notifications to persisted cache', notifications.length);
			await saveNotificationsToPersistedCache();
		}, DEBOUNCE_DELAY);
	}, []);

	useEffect(() => {
		return () => {
			if (debounceTimeoutRef.current) {
				clearTimeout(debounceTimeoutRef.current);
			}
		};
	}, []);

	useEffect(() => {
		saveNotifications();
	}, [notifications, saveNotifications]);
}

function useNotificationCacheUpdater() {
	const apollo = useApolloClient();

	return useCallback(async (id: string, patch: { readAt?: string | null, receivedAt?: string | null }) => {
		try {
			const entityId = apollo.cache.identify({ __typename: 'Notification', id }) || `Notification:${id}`;
			apollo.cache.modify({
				id: entityId,
				fields: {
					readAt: (current: string | null) => (patch.readAt !== undefined ? patch.readAt : current),
					receivedAt: (current: string | null) => (patch.receivedAt !== undefined ? patch.receivedAt : current),
				},
			});
		} catch { }
	}, [apollo]);
}

export function useNotificationById(id?: string) {
	const apollo = useApolloClient();
	const [localNotification, setLocalNotification] = useState<NotificationFragment | null>(null);
	const [fetchOne, { data, loading, error }] = useGetNotificationLazyQuery();

	useEffect(() => {
		if (id) {
			const fetchLocal = async () => {
				const local = await readLocal(id);
				setLocalNotification(local);

				if (!local) {
					console.log(`📡 [useNotificationById] Notification ${id} not found locally, fetching from server...`);
					try {
						await fetchOne({ variables: { id } });
					} catch (error) {
						console.error(`❌ [useNotificationById] Failed to fetch notification ${id}:`, error);
					}
				}
			};
			fetchLocal();
		}
	}, [id]);

	const readLocal = useCallback(async (nid?: string) => {
		if (!nid) return null;
		try {
			const entity = apollo.readFragment({ id: `Notification:${nid}`, fragment: NotificationFragmentDoc, fragmentName: 'NotificationFragment' });
			if (entity) return entity as any;
		} catch { }
		try {
			const cached: any = apollo.readQuery({
				query: GetNotificationsDocument,
			});
			return cached?.notifications?.find((n: any) => n?.id === nid) ?? null;
		} catch { }
		return null;
	}, [apollo]);

	const notification = localNotification ?? data?.notification ?? null;
	const effectiveLoading = !!id && !notification ? loading : false;

	const effectiveError = !loading && !notification && id ? (error ?? new Error('Notification not found')) : null;
	const source = data?.notification ? 'remote' as const : (localNotification ? 'local' as const : null);

	return { notification, loading: effectiveLoading, error: effectiveError, source };
}

export function useFetchNotifications(onlyCache?: boolean) {
	const updateReceivedNotifications = useUpdateReceivedNotifications();
	const [refetching, setRefetching] = useState(false);
	const { data, loading, refetch } = useGetNotificationsQuery({
		fetchPolicy: onlyCache ? 'cache-first' : 'cache-and-network',
		errorPolicy: 'ignore'
	});

	const notifications = data?.notifications ?? [];

	const fetchNotifications = useCallback(async (): Promise<void> => {
		if (refetching) return;
		setRefetching(true);
		console.log('🔄 Fetching notifications started');
		const newData = await refetch();
		console.log('🔄 Fetching notifications finished: ', newData.data?.notifications?.length);
		await updateReceivedNotifications();
		setRefetching(false);
	}, [refetch, updateReceivedNotifications, refetching]);

	// Fetch iniziale se la cache è vuota (con debounce per evitare chiamate multiple)
	useEffect(() => {
		if (!loading && notifications.length === 0) {
			const timeoutId = setTimeout(() => {
				console.log('📥 Cache empty, performing initial fetch...');
				fetchNotifications();
			}, 200); // Piccolo delay per evitare fetch multipli simultanei

			return () => clearTimeout(timeoutId);
		}
	}, [loading, notifications.length, fetchNotifications]);

	return { fetchNotifications, notifications, loading };
}

export function useDeleteNotification() {
	const apollo = useApolloClient();
	const [deleteNotificationMutation] = useDeleteNotificationMutation();

	const deleteNotification = useCallback(async (id: string) => {
		console.log(`🗑️ Starting deletion of notification: ${id}`);

		let notificationData: NotificationFragment | null = null;
		try {
			const queryData = apollo.cache.readQuery({
				query: GetNotificationsDocument,
			}) as { notifications: NotificationFragment[] } | null;

			if (queryData?.notifications) {
				notificationData = queryData.notifications.find((n: any) => n.id === id) || null;
			}
		} catch (error) {
			console.warn(`⚠️ Could not read notification data for ${id}:`, error);
		}

		try {
			await deleteNotificationMutation({
				variables: { id }
			});
			console.log(`✅ Server deletion successful for notification: ${id}`);
		} catch (e) {
			console.warn(`⚠️ Server deletion failed for notification ${id}:`, e);
		}

		try {
			if (notificationData?.message?.attachments) {
				console.log(`🗑️ Deleting ${notificationData.message.attachments.length} attachments from local cache`);

				for (const attachment of notificationData.message.attachments) {
					try {
						if (attachment.mediaType && attachment.mediaType !== MediaType.Icon && attachment.url) {
							await mediaCache.deleteCachedMedia(attachment.url, attachment.mediaType, true);
							console.log(`🗑️ Deleted attachment from cache: ${attachment.url}`);
						}
					} catch (error) {
						console.warn(`⚠️ Failed to delete attachment ${attachment.url} from cache:`, error);
					}
				}
			}

			apollo.cache.modify({
				fields: {
					notifications(existingNotifications: readonly any[] | Reference = [], { readField }) {
						console.log(`🔍 Cache modify - processing notifications list, current length: ${Array.isArray(existingNotifications) ? existingNotifications.length : 'not array'}`);

						if (!existingNotifications || (typeof existingNotifications === 'object' && 'ref' in existingNotifications)) {
							console.log(`⚠️ Cache modify - existingNotifications is not an array, returning as-is`);
							return existingNotifications;
						}

						if (!Array.isArray(existingNotifications) || existingNotifications.length === 0) {
							console.log(`⚠️ Cache modify - existingNotifications is empty or not array`);
							return existingNotifications;
						}

						const filtered = existingNotifications.filter((notification: any) => {
							const notificationId = readField('id', notification);
							const shouldKeep = notificationId !== id;
							if (!shouldKeep) {
								console.log(`🗑️ Cache modify - removing notification ${notificationId} from list`);
							}
							return shouldKeep;
						});

						console.log(`✅ Cache modify - filtered list length: ${filtered.length} (removed: ${existingNotifications.length - filtered.length})`);
						return filtered;
					}
				}
			});

			console.log(`🗑️ Evicting notification entity: Notification:${id}`);
			const evicted = apollo.cache.evict({
				id: `Notification:${id}`,
				broadcast: true
			});
			console.log(`🗑️ Entity eviction result:`, evicted);

			const gcResult = apollo.cache.gc();
			console.log(`🧹 Cache garbage collection completed - removed ${gcResult.length} orphaned objects`);

		} catch (error) {
			console.error(`❌ Failed to remove notification ${id} from cache:`, error);
		}
	}, [apollo])

	return deleteNotification;
}

export function useUpdateReceivedNotifications() {
	const apollo = useApolloClient();
	const [updateReceivedMutation] = useUpdateReceivedNotificationsMutation();
	const applyLocal = useNotificationCacheUpdater();

	const updateReceivedNotifications = useCallback(async () => {
		try {
			const currentData: any = apollo.readQuery({
				query: GetNotificationsDocument,
			});

			if (currentData?.notifications && currentData.notifications.length > 0) {
				const notificationsToUpdate = currentData.notifications.filter(
					(notification: any) => !notification.receivedAt
				);

				if (notificationsToUpdate.length === 0) {
					return;
				}

				const now = new Date().toISOString();

				for (const notification of notificationsToUpdate) {
					try {
						await updateReceivedMutation({
							variables: {
								id: notification.id,
							}
						});
					} catch {
					} finally {
						try {
							await applyLocal(notification.id, { receivedAt: now });
						} catch (e) {
							console.error('Failed to update local notification:', e);
						}
					}
				}
			}
		} catch (e) {
			console.error('Failed to update received notifications:', e);
		}
	}, [updateReceivedMutation, applyLocal])

	return updateReceivedNotifications;
}

export function useMarkAllNotificationsAsRead() {
	const apollo = useApolloClient();
	const [markAllMutation] = useMarkAllNotificationsAsReadMutation();
	const [loading, setLoading] = useState(false);

	const markAllAsRead = useCallback(async () => {
		setLoading(true);
		try {
			await markAllMutation();

			const data: any = apollo.readQuery({
				query: GetNotificationsDocument,
			});

			if (data?.notifications) {
				const now = new Date().toISOString();
				for (const notification of data.notifications) {
					if (notification?.id && !notification.readAt) {
						try {
							const entityId = apollo.cache.identify({ __typename: 'Notification', id: notification.id }) || `Notification:${notification.id}`;
							apollo.cache.modify({
								id: entityId,
								fields: { readAt: () => now },
							});
						} catch { }
					}
				}
			}
		} catch (error) {
			console.error('Failed to mark all notifications as read:', error);
		} finally {
			setLoading(false);
		}
	}, [apollo])

	return { markAllAsRead, loading };
}

export function useMarkNotificationRead() {
	const apollo = useApolloClient();
	const [markReadMutation] = useMarkNotificationAsReadMutation();
	const applyLocal = useNotificationCacheUpdater();

	const markAsRead = useCallback(async (id: string) => {
		try {
			if (shouldUpdateRemoteReadAt) {
				await markReadMutation({ variables: { id } });
			}
		} catch (e) { }
		finally {
			const now = new Date().toISOString();
			await applyLocal(id, { readAt: now });
		}
	}, [markReadMutation, applyLocal])

	return markAsRead;
}

export function useMarkNotificationUnread() {
	const [markUnreadMutation] = useMarkNotificationAsUnreadMutation();
	const applyLocal = useNotificationCacheUpdater();

	const markAsUnread = useCallback(async (id: string) => {
		try {
			if (shouldUpdateRemoteReadAt) {
				await markUnreadMutation({ variables: { id } });
			}
		} catch (e) { }
		finally {
			await applyLocal(id, { readAt: null });
		}
	}, [markUnreadMutation, applyLocal])

	return markAsUnread;
}

export function useMassDeleteNotifications() {
	const apollo = useApolloClient();
	const [massDeleteNotificationsMutation] = useMassDeleteNotificationsMutation();
	const [loading, setLoading] = useState(false);

	const massDelete = useCallback(async (notificationIds: string[]) => {
		if (notificationIds.length === 0) return;

		setLoading(true);
		console.log(`🗑️ Starting mass deletion of ${notificationIds.length} notifications`);

		const allAttachments: Array<{ url: string; mediaType: MediaType }> = [];

		let cachedNotifications: NotificationFragment[] = [];
		try {
			const queryData = apollo.cache.readQuery({
				query: GetNotificationsDocument,
			}) as { notifications: NotificationFragment[] } | null;
			cachedNotifications = queryData?.notifications || [];
		} catch (error) {
			console.warn(`⚠️ Could not read notifications query:`, error);
		}

		for (const id of notificationIds) {
			let notificationData: NotificationFragment | null = null;

			notificationData = cachedNotifications.find((n: any) => n.id === id) || null;

			if (notificationData?.message?.attachments) {
				for (const attachment of notificationData.message.attachments) {
					if (attachment.mediaType && attachment.mediaType !== MediaType.Icon && attachment.url) {
						allAttachments.push({
							url: attachment.url,
							mediaType: attachment.mediaType
						});
					}
				}
			}
		}

		try {
			const result = await massDeleteNotificationsMutation({
				variables: { ids: notificationIds },
				errorPolicy: 'all'
			});

			console.log(`✅ Server mass deletion completed: ${result.data?.massDeleteNotifications.deletedCount} notifications deleted`);

			if (allAttachments.length > 0) {
				console.log(`🗑️ Deleting ${allAttachments.length} attachments from local cache`);

				for (const attachment of allAttachments) {
					try {
						await mediaCache.deleteCachedMedia(attachment.url, attachment.mediaType, true);
						console.log(`🗑️ Deleted attachment from cache: ${attachment.url}`);
					} catch (error) {
						console.warn(`⚠️ Failed to delete attachment ${attachment.url} from cache:`, error);
					}
				}
			}

			apollo.cache.modify({
				fields: {
					notifications(existingNotifications: readonly any[] | Reference = [], { readField }) {
						if (!Array.isArray(existingNotifications)) {
							return existingNotifications;
						}

						const idsToDelete = new Set(notificationIds);
						const filtered = existingNotifications.filter((notification: any) => {
							const notificationId = readField('id', notification) as string;
							return !idsToDelete.has(notificationId);
						});

						console.log(`✅ Cache mass delete - removed ${existingNotifications.length - filtered.length} notifications`);
						return filtered;
					}
				}
			});

			for (const id of notificationIds) {
				apollo.cache.evict({ id: `Notification:${id}` });
			}

			const gcResult = apollo.cache.gc();
			console.log(`🧹 Mass delete cache cleanup - removed ${gcResult.length} orphaned objects`);

		} catch (error) {
			console.error('❌ Mass delete operation failed:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [apollo])

	return { massDelete, loading };
}

export function useMassMarkNotificationsAsRead() {
	const [massMarkNotificationsAsReadMutation] = useMassMarkNotificationsAsReadMutation();
	const applyLocal = useNotificationCacheUpdater();
	const [loading, setLoading] = useState(false);

	const massMarkAsRead = useCallback(async (notificationIds: string[]) => {
		if (notificationIds.length === 0) return;

		setLoading(true);
		console.log(`✅ Starting mass mark as read for ${notificationIds.length} notifications`);

		try {
			const now = new Date().toISOString();

			if (shouldUpdateRemoteReadAt) {
				const result = await massMarkNotificationsAsReadMutation({
					variables: { ids: notificationIds },
					errorPolicy: 'all'
				});
				console.log(`✅ Server mass mark as read completed: ${result.data?.massMarkNotificationsAsRead.updatedCount} notifications updated`);
			}

			for (const id of notificationIds) {
				await applyLocal(id, { readAt: now });
			}

			console.log(`✅ Mass mark as read completed for ${notificationIds.length} notifications`);
		} catch (error) {
			console.error('❌ Mass mark as read operation failed:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [massMarkNotificationsAsReadMutation, applyLocal])

	return { massMarkAsRead, loading };
}

export function useMassMarkNotificationsAsUnread() {
	const [massMarkNotificationsAsUnreadMutation] = useMassMarkNotificationsAsUnreadMutation();
	const applyLocal = useNotificationCacheUpdater();
	const [loading, setLoading] = useState(false);

	const massMarkAsUnread = useCallback(async (notificationIds: string[]) => {
		if (notificationIds.length === 0) return;

		setLoading(true);
		console.log(`📝 Starting mass mark as unread for ${notificationIds.length} notifications`);

		try {
			if (shouldUpdateRemoteReadAt) {
				const result = await massMarkNotificationsAsUnreadMutation({
					variables: { ids: notificationIds },
					errorPolicy: 'all'
				});
				console.log(`✅ Server mass mark as unread completed: ${result.data?.massMarkNotificationsAsUnread.updatedCount} notifications updated`);
			}

			for (const id of notificationIds) {
				await applyLocal(id, { readAt: null });
			}

			console.log(`✅ Mass mark as unread completed for ${notificationIds.length} notifications`);
		} catch (error) {
			console.error('❌ Mass mark as unread operation failed:', error);
			throw error;
		} finally {
			setLoading(false);
		}
	}, [massMarkNotificationsAsUnreadMutation, applyLocal])

	return { massMarkAsUnread, loading };
}
