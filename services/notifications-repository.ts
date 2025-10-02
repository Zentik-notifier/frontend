import { NotificationFragment } from '@/generated/gql-operations-generated';
import { Platform } from 'react-native';
import { openWebStorageDb } from './db-setup';
import { parseNotificationForDB, parseNotificationFromDB } from './db-setup';

/**
 * Notification repository for managing notification storage operations
 * Handles both IndexedDB (web) and SQLite (mobile) storage
 *
 * Database Structure:
 * - id: notification ID (primary key)
 * - created_at: notification creation date
 * - read_at: notification read date (nullable)
 * - bucket_id: bucket ID from notification.message.bucket.id
 * - has_attachments: boolean flag (1/0) based on attachments.length
 * - fragment: complete NotificationFragment JSON string
 *
 * @example
 * ```typescript
 * import {
 *   saveNotificationToCache,
 *   getNotificationFromCache,
 *   upsertNotificationsBatch,
 *   updateNotificationReadStatus,
 *   deleteNotificationFromCache
 * } from '@/services/notifications-repository';
 *
 * // ====================
 * // BASIC CRUD OPERATIONS
 * // ====================
 *
 * // Save single notification
 * const notification = await getNotificationFromGraphQL('id-123');
 * await saveNotificationToCache(notification);
 *
 * // Load single notification
 * const cachedNotification = await getNotificationFromCache('id-123');
 * if (cachedNotification) {
 *   console.log('Title:', cachedNotification.message.title);
 *   console.log('Read at:', cachedNotification.readAt);
 *   console.log('Bucket:', cachedNotification.message.bucket.name);
 * }
 *
 * // ====================
 * // BATCH OPERATIONS
 * // ====================
 *
 * // Batch save notifications
 * const notifications = await getNotificationsFromGraphQL();
 * await upsertNotificationsBatch(notifications);
 *
 * // ====================
 * // UPDATE OPERATIONS
 * // ====================
 *
 * // Mark single notification as read
 * await updateNotificationReadStatus('id-123', new Date().toISOString());
 *
 * // Mark single notification as unread
 * await updateNotificationReadStatus('id-123', null);
 *
 * // Batch mark multiple as read
 * await updateNotificationsReadStatus(['id1', 'id2'], new Date().toISOString());
 *
 * // ====================
 * // DELETE OPERATIONS
 * // ====================
 *
 * // Delete single notification
 * await deleteNotificationFromCache('id-123');
 *
 * // Batch delete multiple notifications
 * await deleteNotificationsFromCache(['id1', 'id2', 'id3']);
 * ```
 */

// ====================
// SINGLE NOTIFICATION OPERATIONS
// ====================

/**
 * Save a single notification to cache
 */
export async function saveNotificationToCache(notificationData: NotificationFragment): Promise<void> {
  if (Platform.OS !== 'web') return;

  const db = await openWebStorageDb();
  const parsedData = parseNotificationForDB(notificationData);
  await db.put('notifications', parsedData, parsedData.id);
}

/**
 * Get a single notification from cache
 */
export async function getNotificationFromCache(notificationId: string): Promise<NotificationFragment | null> {
  if (Platform.OS !== 'web') return null;

  try {
    const db = await openWebStorageDb();
    const result = await db.get('notifications', notificationId);
    return result ? parseNotificationFromDB(result) : null;
  } catch {
    return null;
  }
}

/**
 * Get all notifications from cache
 */
export async function getAllNotificationsFromCache(): Promise<NotificationFragment[]> {
  if (Platform.OS !== 'web') return [];

  try {
    const db = await openWebStorageDb();
    const results = await db.getAll('notifications');
    return results.map(parseNotificationFromDB);
  } catch {
    return [];
  }
}

/**
 * Remove a single notification from cache
 */
export async function removeNotificationFromCache(notificationId: string): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const db = await openWebStorageDb();
    await db.delete('notifications', notificationId);
  } catch {
    // Ignore errors
  }
}

/**
 * Clear all notifications from cache
 */
export async function clearAllNotificationsFromCache(): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const db = await openWebStorageDb();
    await db.clear('notifications');
  } catch {
    // Ignore errors
  }
}

// ====================
// BATCH NOTIFICATION OPERATIONS
// ====================

/**
 * Upsert multiple notifications to cache in batch
 */
export async function upsertNotificationsBatch(notifications: NotificationFragment[]): Promise<void> {
  if (Platform.OS !== 'web' || notifications.length === 0) return;

  try {
    const db = await openWebStorageDb();
    const tx = db.transaction('notifications', 'readwrite');

    for (const notification of notifications) {
      const parsedData = parseNotificationForDB(notification);
      await tx.store.put(parsedData, parsedData.id);
    }

    await tx.done;
  } catch (error) {
    console.error('Failed to upsert notifications batch:', error);
  }
}

// ====================
// NOTIFICATION UPDATE OPERATIONS
// ====================

/**
 * Update the read_at field of a notification
 * Also updates the fragment JSON to maintain consistency
 *
 * @example
 * ```typescript
 * import { updateNotificationReadStatus } from '@/services/notifications-repository';
 *
 * // Mark as read
 * await updateNotificationReadStatus('notification-id', new Date().toISOString());
 *
 * // Mark as unread
 * await updateNotificationReadStatus('notification-id', null);
 * ```
 */
export async function updateNotificationReadStatus(notificationId: string, readAt: string | null): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const db = await openWebStorageDb();

    // Get current notification from database
    const existingRecord = await db.get('notifications', notificationId);
    if (!existingRecord) {
      console.warn(`Notification ${notificationId} not found in cache for read status update`);
      return;
    }

    // Parse the current notification from fragment
    const notification = parseNotificationFromDB(existingRecord);

    // Update read_at in the notification object
    const updatedNotification: NotificationFragment = {
      ...notification,
      readAt: readAt
    };

    // Update the fragment JSON as well
    const updatedRecord = {
      ...existingRecord,
      read_at: readAt,
      fragment: JSON.stringify(updatedNotification)
    };

    // Save back to database
    await db.put('notifications', updatedRecord, notificationId);

    console.log(`✅ Updated read status for notification ${notificationId}: ${readAt ? 'read' : 'unread'}`);
  } catch (error) {
    console.error('Failed to update notification read status:', error);
    throw error;
  }
}

/**
 * Update multiple notifications' read status in batch
 * Uses the single notification update method for consistency
 *
 * @example
 * ```typescript
 * import { updateNotificationsReadStatus } from '@/services/notifications-repository';
 *
 * // Mark multiple as read
 * await updateNotificationsReadStatus(['id1', 'id2'], new Date().toISOString());
 *
 * // Mark multiple as unread
 * await updateNotificationsReadStatus(['id1', 'id2'], null);
 * ```
 */
export async function updateNotificationsReadStatus(notificationIds: string[], readAt: string | null): Promise<void> {
  if (Platform.OS !== 'web' || notificationIds.length === 0) return;

  // Use the single notification method for each ID to maintain consistency
  const promises = notificationIds.map(id => updateNotificationReadStatus(id, readAt));
  await Promise.allSettled(promises);

  console.log(`✅ Updated read status for ${notificationIds.length} notifications: ${readAt ? 'read' : 'unread'}`);
}

/**
 * Delete a notification from cache
 * Also removes it from any cached queries if needed
 *
 * @example
 * ```typescript
 * import { deleteNotificationFromCache } from '@/services/notifications-repository';
 *
 * await deleteNotificationFromCache('notification-id');
 * ```
 */
export async function deleteNotificationFromCache(notificationId: string): Promise<void> {
  if (Platform.OS !== 'web') return;

  try {
    const db = await openWebStorageDb();
    await db.delete('notifications', notificationId);

    console.log(`✅ Deleted notification ${notificationId} from cache`);
  } catch (error) {
    console.error('Failed to delete notification from cache:', error);
    throw error;
  }
}

/**
 * Delete multiple notifications from cache in batch
 * Uses the single notification delete method for consistency
 *
 * @example
 * ```typescript
 * import { deleteNotificationsFromCache } from '@/services/notifications-repository';
 *
 * await deleteNotificationsFromCache(['id1', 'id2', 'id3']);
 * ```
 */
export async function deleteNotificationsFromCache(notificationIds: string[]): Promise<void> {
  if (Platform.OS !== 'web' || notificationIds.length === 0) return;

  // Use the single notification method for each ID to maintain consistency
  const promises = notificationIds.map(id => deleteNotificationFromCache(id));
  await Promise.allSettled(promises);

  console.log(`✅ Deleted ${notificationIds.length} notifications from cache`);
}
