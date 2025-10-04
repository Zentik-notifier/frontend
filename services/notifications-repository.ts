import { NotificationFragment } from '@/generated/gql-operations-generated';
import { Platform } from 'react-native';
import { openWebStorageDb, openSharedCacheDb } from './db-setup';
import { parseNotificationForDB, parseNotificationFromDB } from './db-setup';
import { userSettings } from './user-settings';

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
 */


// ====================
// DATABASE HELPERS
// ====================

/**
 * Get the appropriate database instance based on platform
 */
async function getDatabase() {
  if (Platform.OS === 'web') {
    return await openWebStorageDb();
  } else {
    return await openSharedCacheDb();
  }
}

/**
 * Execute a query on the appropriate database
 */
async function executeQuery<T>(queryFn: (db: any) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  return await queryFn(db);
}

// ====================
// SINGLE NOTIFICATION OPERATIONS
// ====================

/**
 * Save a single notification to cache
 */
export async function saveNotificationToCache(notificationData: NotificationFragment): Promise<void> {
  await executeQuery(async (db) => {
    const parsedData = parseNotificationForDB(notificationData);

    if (Platform.OS === 'web') {
      // IndexedDB
      await db.put('notifications', parsedData, parsedData.id);
    } else {
      // SQLite
      await db.runAsync(
        `INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, has_attachments, fragment)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          parsedData.id,
          parsedData.created_at,
          parsedData.read_at,
          parsedData.bucket_id,
          parsedData.has_attachments,
          parsedData.fragment
        ]
      );
    }
  });
}

/**
 * Get a single notification from cache
 */
export async function getNotificationFromCache(notificationId: string): Promise<NotificationFragment | null> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        const result = await db.get('notifications', notificationId);
        return result ? parseNotificationFromDB(result) : null;
      } else {
        // SQLite
        const result = await db.getFirstAsync(
          'SELECT * FROM notifications WHERE id = ?',
          [notificationId]
        );
        return result ? parseNotificationFromDB(result) : null;
      }
    } catch {
      return null;
    }
  });
}

/**
 * Get all notifications from cache
 */
export async function getAllNotificationsFromCache(): Promise<NotificationFragment[]> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        const results = await db.getAll('notifications');
        return results.map(parseNotificationFromDB);
      } else {
        // SQLite
        const results = await db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC');
        return results.map(parseNotificationFromDB);
      }
    } catch {
      return [];
    }
  });
}

/**
 * Get all raw notification records from database (for export)
 */
export async function getAllRawNotificationsFromDB(): Promise<any[]> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        return await db.getAll('notifications');
      } else {
        // SQLite
        return await db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC');
      }
    } catch {
      return [];
    }
  });
}

/**
 * Import raw notification records directly to database (for import)
 */
export async function importRawNotificationsToDB(rawNotifications: any[]): Promise<void> {
  if (rawNotifications.length === 0) return;

  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        const tx = db.transaction('notifications', 'readwrite');

        for (const notification of rawNotifications) {
          await tx.store.put(notification, notification.id);
        }

        await tx.done;
      } else {
        // SQLite - use batch insert
        for (const notification of rawNotifications) {
          await db.runAsync(
            `INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, has_attachments, fragment)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              notification.id,
              notification.created_at,
              notification.read_at,
              notification.bucket_id,
              notification.has_attachments,
              notification.fragment
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to import raw notifications to DB:', error);
      throw error;
    }
  });
}

/**
 * Remove a single notification from cache
 */
export async function removeNotificationFromCache(notificationId: string): Promise<void> {
  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        await db.delete('notifications', notificationId);
      } else {
        // SQLite
        await db.runAsync('DELETE FROM notifications WHERE id = ?', [notificationId]);
      }
    } catch {
      // Ignore errors
    }
  });
}

/**
 * Clear all notifications from cache
 */
export async function clearAllNotificationsFromCache(): Promise<void> {
  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        await db.clear('notifications');
      } else {
        // SQLite
        await db.runAsync('DELETE FROM notifications');
      }
    } catch {
      // Ignore errors
    }
  });
}

// ====================
// BATCH NOTIFICATION OPERATIONS
// ====================

/**
 * Upsert multiple notifications to cache in batch
 */
export async function upsertNotificationsBatch(notifications: NotificationFragment[]): Promise<void> {
  if (notifications.length === 0) return;

  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        const tx = db.transaction('notifications', 'readwrite');

        for (const notification of notifications) {
          const parsedData = parseNotificationForDB(notification);
          await tx.store.put(parsedData, parsedData.id);
        }

        await tx.done;
      } else {
        // SQLite - use batch insert
        for (const notification of notifications) {
          const parsedData = parseNotificationForDB(notification);
          await db.runAsync(
            `INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, has_attachments, fragment)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [
              parsedData.id,
              parsedData.created_at,
              parsedData.read_at,
              parsedData.bucket_id,
              parsedData.has_attachments,
              parsedData.fragment
            ]
          );
        }
      }
    } catch (error) {
      console.error('Failed to upsert notifications batch:', error);
    }
  });
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
  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
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
      } else {
        // SQLite
        // First get the current notification
        const existingRecord = await db.getFirstAsync(
          'SELECT * FROM notifications WHERE id = ?',
          [notificationId]
        );

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
        const updatedRecord = parseNotificationForDB(updatedNotification);

        // Save back to database
        await db.runAsync(
          `UPDATE notifications SET created_at = ?, read_at = ?, bucket_id = ?, has_attachments = ?, fragment = ?
           WHERE id = ?`,
          [
            updatedRecord.created_at,
            updatedRecord.read_at,
            updatedRecord.bucket_id,
            updatedRecord.has_attachments,
            updatedRecord.fragment,
            notificationId
          ]
        );
      }

      console.log(`✅ Updated read status for notification ${notificationId}: ${readAt ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Failed to update notification read status:', error);
      throw error;
    }
  });
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
  if (notificationIds.length === 0) return;

  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - use batch update
        const tx = db.transaction('notifications', 'readwrite');

        for (const id of notificationIds) {
          const existingRecord = await tx.store.get(id);
          if (existingRecord) {
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
            await tx.store.put(updatedRecord, id);
          }
        }

        await tx.done;
      } else {
        // SQLite - use batch update with CASE WHEN statement
        if (notificationIds.length > 0 && readAt !== null) {
          // Build CASE WHEN statement for read_at updates
          const caseStatements = notificationIds.map(id => `WHEN id = '${id}' THEN '${readAt}'`).join(' ');
          const inClause = notificationIds.map(id => `'${id}'`).join(',');

          await db.runAsync(
            `UPDATE notifications SET read_at = CASE ${caseStatements} ELSE read_at END WHERE id IN (${inClause})`
          );
        }

        // For each notification, update the fragment JSON as well
        for (const id of notificationIds) {
          const existingRecord = await db.getFirstAsync(
            'SELECT * FROM notifications WHERE id = ?',
            [id]
          );

          if (existingRecord) {
            // Parse the current notification from fragment
            const notification = parseNotificationFromDB(existingRecord);

            // Update read_at in the notification object
            const updatedNotification: NotificationFragment = {
              ...notification,
              readAt: readAt
            };

            // Update the fragment JSON as well
            const updatedRecord = parseNotificationForDB(updatedNotification);

            // Save back to database
            await db.runAsync(
              `UPDATE notifications SET created_at = ?, read_at = ?, bucket_id = ?, has_attachments = ?, fragment = ?
               WHERE id = ?`,
              [
                updatedRecord.created_at,
                updatedRecord.read_at,
                updatedRecord.bucket_id,
                updatedRecord.has_attachments,
                updatedRecord.fragment,
                id
              ]
            );
          }
        }
      }

      console.log(`✅ Updated read status for ${notificationIds.length} notifications: ${readAt ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('Failed to update notifications read status:', error);
      throw error;
    }
  });
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
  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB
        await db.delete('notifications', notificationId);
      } else {
        // SQLite
        await db.runAsync('DELETE FROM notifications WHERE id = ?', [notificationId]);
      }

      console.log(`✅ Deleted notification ${notificationId} from cache`);
    } catch (error) {
      console.error('Failed to delete notification from cache:', error);
      throw error;
    }
  });
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
  if (notificationIds.length === 0) return;

  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - use batch delete
        const tx = db.transaction('notifications', 'readwrite');

        for (const id of notificationIds) {
          await tx.store.delete(id);
        }

        await tx.done;
      } else {
        // SQLite - use batch delete with single query
        if (notificationIds.length > 0) {
          const placeholders = notificationIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM notifications WHERE id IN (${placeholders})`, notificationIds);
        }
      }

      console.log(`✅ Deleted ${notificationIds.length} notifications from cache`);
    } catch (error) {
      console.error('❌ Failed to delete notifications from cache:', error);
      throw error;
    }
  });
}

// ====================
// NOTIFICATION CLEANUP OPERATIONS
// ====================

export interface NotificationCleanupResult {
  totalBefore: number;
  totalAfter: number;
  deletedCount: number;
  filteredByAge: number;
  filteredByCount: number;
}

/**
 * Cleanup notifications based on user settings for maximum cached notifications and days
 * This mirrors the logic used in Apollo cache merging to keep local database in sync
 *
 * @example
 * ```typescript
 * import { cleanupNotificationsBySettings } from '@/services/notifications-repository';
 *
 * const result = await cleanupNotificationsBySettings(notifications);
 * console.log(`Cleaned up ${result.deletedCount} notifications`);
 * ```
 */
export async function cleanupNotificationsBySettings(notifications: NotificationFragment[]): Promise<NotificationCleanupResult> {
  const max = userSettings.getMaxCachedNotifications?.() ?? 500;
  const maxDays = userSettings.getMaxCachedNotificationsDay?.();

  console.log(`🧹 [Notifications Cleanup] Starting cleanup with max=${max}, maxDays=${maxDays}`);

  const totalBefore = notifications.length;

  if (totalBefore === 0) {
    console.log('📭 [Notifications Cleanup] No notifications to clean up');
    return {
      totalBefore: 0,
      totalAfter: 0,
      deletedCount: 0,
      filteredByAge: 0,
      filteredByCount: 0
    };
  }

  // Filter by age if maxDays is set
  let filteredNotifications = notifications;
  let filteredByAge = 0;

  if (typeof maxDays === 'number' && maxDays > 0) {
    const cutoff = Date.now() - maxDays * 24 * 60 * 60 * 1000;

    const beforeFilter = filteredNotifications.length;
    filteredNotifications = filteredNotifications.filter(notification => {
      const createdTime = new Date(notification.createdAt).getTime();
      return createdTime >= cutoff;
    });
    filteredByAge = beforeFilter - filteredNotifications.length;

    if (filteredByAge > 0) {
      console.log(`🧹 [Notifications Cleanup] Filtered ${filteredByAge} notifications older than ${maxDays} days`);
    }
  }

  // Sort by creation date (newest first) - same logic as Apollo cache
  filteredNotifications.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();
    return bTime - aTime;
  });

  // Limit to maximum count
  let notificationsToKeep = filteredNotifications;
  let filteredByCount = 0;

  if (max > 0 && filteredNotifications.length > max) {
    filteredByCount = filteredNotifications.length - max;
    notificationsToKeep = filteredNotifications.slice(0, max);
    console.log(`🧹 [Notifications Cleanup] Limited to ${max} notifications, removing ${filteredByCount} excess`);
  }

  // Find notifications to delete (those not in the keep list)
  const idsToKeep = new Set(notificationsToKeep.map(n => n.id));
  const idsToDelete = notifications
    .filter(notification => !idsToKeep.has(notification.id))
    .map(notification => notification.id);

  console.log(`🗑️ [Notifications Cleanup] Will delete ${idsToDelete.length} notifications from database`);

  // Delete from database (works for both IndexedDB and SQLite)
  let deletedCount = 0;
  if (idsToDelete.length > 0) {
    await deleteNotificationsFromCache(idsToDelete);
    deletedCount = idsToDelete.length;
    console.log(`💾 [Notifications Cleanup] Deleted ${deletedCount} notifications from database`);
  }

  const totalAfter = notificationsToKeep.length;

  console.log(`✅ [Notifications Cleanup] Cleanup completed: ${totalBefore} → ${totalAfter} notifications (${deletedCount} deleted)`);

  return {
    totalBefore,
    totalAfter,
    deletedCount,
    filteredByAge,
    filteredByCount
  };
}
