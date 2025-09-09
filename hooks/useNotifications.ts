import { GetNotificationsDocument, NotificationFragment, NotificationFragmentDoc, useDeleteNotificationMutation, useGetNotificationLazyQuery, useGetNotificationsLazyQuery, useMarkAllNotificationsAsReadMutation, useMarkNotificationAsReadMutation, useMarkNotificationAsUnreadMutation, useMassDeleteNotificationsMutation, useMassMarkNotificationsAsReadMutation, useMassMarkNotificationsAsUnreadMutation, useUpdateReceivedNotificationsMutation, MediaType } from '@/generated/gql-operations-generated';
import { mediaCache } from '@/services/media-cache';
// import { useAppContext } from '@/services/app-context';
import { Reference, useApolloClient } from '@apollo/client';
import { useCallback, useEffect, useState } from 'react';

const shouldUpdateRemoteReadAt = false;

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

	// Local-first lookup with robust server fallback
	useEffect(() => {
		if (id) {
			const fetchLocal = async () => {
				const local = await readLocal(id);
				setLocalNotification(local);

				// Always try to fetch from server if not found locally or to get fresh data
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

	// Only show error if we've finished loading and still don't have the notification
	const effectiveError = !loading && !notification && id ? (error ?? new Error('Notification not found')) : null;
	const source = data?.notification ? 'remote' as const : (localNotification ? 'local' as const : null);

	return { notification, loading: effectiveLoading, error: effectiveError, source };
}

export function useFetchNotifications() {
	const apollo = useApolloClient();
	const [fetchRemote, { data }] = useGetNotificationsLazyQuery({ errorPolicy: 'ignore' });
	const updateReceivedNotifications = useUpdateReceivedNotifications();
	const [notifications, setNotifications] = useState<NotificationFragment[]>([]);
	const [loading, setLoading] = useState(false);

	// Keep local state in sync with cache-observed query result
	useEffect(() => {
		if (data?.notifications) setNotifications(data.notifications as NotificationFragment[]);
	}, [data?.notifications]);

	const fetchNotifications = useCallback(async (): Promise<void> => {
		setLoading(true);
		try {
			await fetchRemote({
				fetchPolicy: 'network-only',
			});
			await updateReceivedNotifications();
			// After merge via typePolicy, read merged list from cache
			try {
				const merged: any = apollo.readQuery({ query: GetNotificationsDocument });
				setNotifications(merged?.notifications ?? []);
			} catch { }
		} catch (e) {
		} finally {
			setLoading(false);
		}
	}, [fetchRemote])

	return { fetchNotifications, notifications, loading };
}

export function useDeleteNotification() {
	const apollo = useApolloClient();
	const [deleteNotificationMutation] = useDeleteNotificationMutation();

	const deleteNotification = useCallback(async (id: string) => {
		console.log(`🗑️ Starting deletion of notification: ${id}`);

		// First, get the notification data to extract attachments before deletion
		let notificationData: NotificationFragment | null = null;
		try {
			const notificationRef = apollo.cache.readFragment({
				id: `Notification:${id}`,
				fragment: NotificationFragmentDoc,
			});
			notificationData = notificationRef as NotificationFragment;
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
			// Delete all attachments from local cache if notification data is available
			if (notificationData?.message?.attachments) {
				console.log(`🗑️ Deleting ${notificationData.message.attachments.length} attachments from local cache`);

				for (const attachment of notificationData.message.attachments) {
					try {
						// Only delete media attachments (not icons) and ensure URL exists
						if (attachment.mediaType && attachment.mediaType !== MediaType.Icon && attachment.url) {
							await mediaCache.deleteCachedMedia(attachment.url, attachment.mediaType);
							console.log(`🗑️ Deleted attachment from cache: ${attachment.url}`);
						}
					} catch (error) {
						console.warn(`⚠️ Failed to delete attachment ${attachment.url} from cache:`, error);
					}
				}
			}

			// First, remove from Query.notifications list
			apollo.cache.modify({
				fields: {
					notifications(existingNotifications: readonly any[] | Reference = [], { readField }) {
						console.log(`🔍 Cache modify - processing notifications list, current length: ${Array.isArray(existingNotifications) ? existingNotifications.length : 'not array'}`);

						// Handle both array and Reference types
						if (!existingNotifications || (typeof existingNotifications === 'object' && 'ref' in existingNotifications)) {
							console.log(`⚠️ Cache modify - existingNotifications is not an array, returning as-is`);
							return existingNotifications;
						}

						if (!Array.isArray(existingNotifications) || existingNotifications.length === 0) {
							console.log(`⚠️ Cache modify - existingNotifications is empty or not array`);
							return existingNotifications;
						}

						// Filter out the deleted notification
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

			// Then evict the entity itself
			console.log(`🗑️ Evicting notification entity: Notification:${id}`);
			const evicted = apollo.cache.evict({
				id: `Notification:${id}`,
				broadcast: true // Forza il broadcast dell'aggiornamento
			});
			console.log(`🗑️ Entity eviction result:`, evicted);

			// Force garbage collection (non distruttivo)
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
			// Get all notifications from cache to update them
			const currentData: any = apollo.readQuery({
				query: GetNotificationsDocument,
			});

			if (currentData?.notifications && currentData.notifications.length > 0) {
				// Find notifications that don't have receivedAt set
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

// Mark all as read (wraps mutation and updates local cache entities in batch)
export function useMarkAllNotificationsAsRead() {
	const apollo = useApolloClient();
	const [markAllMutation] = useMarkAllNotificationsAsReadMutation();
	const [loading, setLoading] = useState(false);

	const markAllAsRead = useCallback(async () => {
		setLoading(true);
		try {
			// Execute server mutation first
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

// Mark as Read (local-first, with server mutation)
export function useMarkNotificationRead() {
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

// Mark as Unread (local-first, with server mutation)
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

// Mass Delete Notifications
export function useMassDeleteNotifications() {
	const apollo = useApolloClient();
	const [massDeleteNotificationsMutation] = useMassDeleteNotificationsMutation();
	const [loading, setLoading] = useState(false);

	const massDelete = useCallback(async (notificationIds: string[]) => {
		if (notificationIds.length === 0) return;

		setLoading(true);
		console.log(`🗑️ Starting mass deletion of ${notificationIds.length} notifications`);

		// First, collect all attachments from notifications before deletion
		const allAttachments: Array<{ url: string; mediaType: MediaType }> = [];
		for (const id of notificationIds) {
			try {
				const notificationRef = apollo.cache.readFragment({
					id: `Notification:${id}`,
					fragment: NotificationFragmentDoc,
				});
				const notificationData = notificationRef as NotificationFragment;

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
			} catch (error) {
				console.warn(`⚠️ Could not read notification data for ${id}:`, error);
			}
		}

		try {
			// Execute mass delete mutation on backend
			const result = await massDeleteNotificationsMutation({
				variables: { ids: notificationIds },
				errorPolicy: 'all'
			});

			console.log(`✅ Server mass deletion completed: ${result.data?.massDeleteNotifications.deletedCount} notifications deleted`);

			// Delete all attachments from local cache
			if (allAttachments.length > 0) {
				console.log(`🗑️ Deleting ${allAttachments.length} attachments from local cache`);

				for (const attachment of allAttachments) {
					try {
						await mediaCache.deleteCachedMedia(attachment.url, attachment.mediaType);
						console.log(`🗑️ Deleted attachment from cache: ${attachment.url}`);
					} catch (error) {
						console.warn(`⚠️ Failed to delete attachment ${attachment.url} from cache:`, error);
					}
				}
			}

			// Update cache in batch
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

			// Evict entities in batch
			for (const id of notificationIds) {
				apollo.cache.evict({ id: `Notification:${id}` });
			}

			// Single garbage collection at the end
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

// Mass Mark as Read
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

			// Execute mass mark as read mutation on backend (if enabled)
			if (shouldUpdateRemoteReadAt) {
				const result = await massMarkNotificationsAsReadMutation({
					variables: { ids: notificationIds },
					errorPolicy: 'all'
				});
				console.log(`✅ Server mass mark as read completed: ${result.data?.massMarkNotificationsAsRead.updatedCount} notifications updated`);
			}

			// Update local cache in batch
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

// Mass Mark as Unread
export function useMassMarkNotificationsAsUnread() {
	const [massMarkNotificationsAsUnreadMutation] = useMassMarkNotificationsAsUnreadMutation();
	const applyLocal = useNotificationCacheUpdater();
	const [loading, setLoading] = useState(false);

	const massMarkAsUnread = useCallback(async (notificationIds: string[]) => {
		if (notificationIds.length === 0) return;

		setLoading(true);
		console.log(`📝 Starting mass mark as unread for ${notificationIds.length} notifications`);

		try {
			// Execute mass mark as unread mutation on backend (if enabled)
			if (shouldUpdateRemoteReadAt) {
				const result = await massMarkNotificationsAsUnreadMutation({
					variables: { ids: notificationIds },
					errorPolicy: 'all'
				});
				console.log(`✅ Server mass mark as unread completed: ${result.data?.massMarkNotificationsAsUnread.updatedCount} notifications updated`);
			}

			// Update local cache in batch
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


