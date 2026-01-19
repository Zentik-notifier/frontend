import { NotificationFragment } from '@/generated/gql-operations-generated';
import { Platform } from 'react-native';
import { executeQuery as executeQuerySafe, parseNotificationForDB, parseNotificationFromDB } from './db-setup';
import { settingsService } from './settings-service';
import iosBridgeService from './ios-bridge';

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
 * Execute a query on the appropriate database with error handling
 * Uses the safe executeQuery from db-setup that handles race conditions
 */
async function executeQuery<T>(queryFn: (db: any) => Promise<T>, operationName: string): Promise<T> {
  return await executeQuerySafe(queryFn, operationName);
}

// ====================
// SINGLE NOTIFICATION OPERATIONS
// ====================

/**
 * Save a single notification to cache (or update existing one)
 * If notification already exists, preserve the cached readAt value
 * If notification is marked as deleted (tombstone exists), skip saving
 */
export async function saveNotificationToCache(notificationData: NotificationFragment): Promise<void> {
  await executeQuery(async (db) => {
    // Check if notification is marked as deleted (tombstone check)
    let isDeleted = false;
    
    if (Platform.OS === 'web') {
      // IndexedDB
      const tombstone = await db.get('deleted_notifications', notificationData.id);
      isDeleted = !!tombstone;
    } else {
      // SQLite
      const tombstone = await db.getFirstAsync(
        'SELECT id FROM deleted_notifications WHERE id = ?',
        [notificationData.id]
      );
      isDeleted = !!tombstone;
    }
    
    // Skip saving if notification is marked as deleted
    if (isDeleted) {
      console.log(`[saveNotificationToCache] Skipping deleted notification ${notificationData.id}`);
      return;
    }
    
    // Check if notification already exists in cache
    let existingReadAt: string | null = null;
    
    if (Platform.OS === 'web') {
      // IndexedDB
      const existing = await db.get('notifications', notificationData.id);
      if (existing) {
        existingReadAt = existing.read_at;
      }
    } else {
      // SQLite
      const existing = await db.getFirstAsync(
        'SELECT read_at FROM notifications WHERE id = ?',
        [notificationData.id]
      );
      if (existing) {
        existingReadAt = existing.read_at;
      }
    }

    const parsedData = parseNotificationForDB(notificationData);
    
    // Preserve cached readAt if exists (don't let backend overwrite local read status)
    if (existingReadAt !== null) {
      parsedData.read_at = existingReadAt;
      
      // Also update the fragment JSON to keep it consistent with the column
      const fragmentObj = JSON.parse(parsedData.fragment);
      fragmentObj.readAt = existingReadAt;
      parsedData.fragment = JSON.stringify(fragmentObj);
    }

    if (Platform.OS === 'web') {
      // IndexedDB
      await db.put('notifications', parsedData, parsedData.id);
    } else {
      // SQLite
      await db.runAsync(
        `INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, bucket_icon_url, has_attachments, fragment)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          parsedData.id,
          parsedData.created_at,
          parsedData.read_at,
          parsedData.bucket_id,
          parsedData.bucket_icon_url,
          parsedData.has_attachments,
          parsedData.fragment
        ]
      );
    }
  }, 'saveNotificationToCache');

  // Trigger CloudKit sync with debounce on iOS
  if (Platform.OS === 'ios') {
    iosBridgeService.triggerCloudKitSyncWithDebounce().catch((error) => {
      console.error('[NotificationsRepository] Failed to trigger CloudKit sync:', error);
    });
  }
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
        return result ? parseNotificationFromDB(result, db) : null;
      } else {
        // SQLite
        const result = await db.getFirstAsync(
          'SELECT * FROM notifications WHERE id = ?',
          [notificationId]
        );
        return result ? parseNotificationFromDB(result, db) : null;
      }
    } catch {
      return null;
    }
  }, 'getNotificationFromCache');
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
        const notifications = results
          .map((record: any) => parseNotificationFromDB(record, db))
          .filter((n: NotificationFragment | null): n is NotificationFragment => n !== null); // Filter out corrupted
        
        return notifications.sort((a: NotificationFragment, b: NotificationFragment) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });
      } else {
        // SQLite
        const results = await db.getAllAsync('SELECT * FROM notifications ORDER BY created_at DESC');
        const notifications = results
          .map((record: any) => parseNotificationFromDB(record, db))
          .filter((n: NotificationFragment | null): n is NotificationFragment => n !== null); // Filter out corrupted
        
        return notifications;
      }
    } catch {
      return [];
    }
  }, 'getAllNotificationsFromCache');
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
  }, 'getAllRawNotificationsFromDB');
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
          // Ensure fragment is a string for both databases
          const notificationWithStringFragment = {
            ...notification,
            fragment: typeof notification.fragment === 'string'
              ? notification.fragment
              : JSON.stringify(notification.fragment || notification)
          };
          await tx.store.put(notificationWithStringFragment, notificationWithStringFragment.id);
        }

        await tx.done;
      } else {
        // SQLite - use batch insert
        for (const notification of rawNotifications) {
          // Ensure fragment is a string for both databases
          const fragmentString = typeof notification.fragment === 'string'
            ? notification.fragment
            : JSON.stringify(notification.fragment || notification);

          await db.runAsync(
            `INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, bucket_icon_url, has_attachments, fragment)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              notification.id,
              notification.created_at,
              notification.read_at,
              notification.bucket_id,
              notification.bucket_icon_url || null,
              notification.has_attachments,
              fragmentString
            ]
          );
        }
      }
    } catch (error) {
      console.error('[importRawNotificationsToDB] Failed to import raw notifications to DB:', error);
      throw error;
    }
  }, 'importRawNotificationsToDB');
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
  }, 'removeNotificationFromCache');
}

/**
 * Clear all notifications from cache
 * Only handles data deletion, query cleanup is handled by the queries layer
 */
export async function clearAllNotificationsFromCache(): Promise<void> {
  await executeQuery(async (db) => {
    try {
      console.log('[clearAllNotificationsFromCache] Starting complete cache clear...');
      
      if (Platform.OS === 'web') {
        // IndexedDB - get all notification IDs first
        const tx = db.transaction('notifications', 'readonly');
        const allNotifications = await tx.store.getAll();
        await tx.done;
        
        const notificationIds = allNotifications.map((n: any) => n.id);
        console.log(`[clearAllNotificationsFromCache] Found ${notificationIds.length} notifications to clear`);
        
        if (notificationIds.length > 0) {
          // Create tombstones for all notifications
          const tombstoneTx = db.transaction('deleted_notifications', 'readwrite');
          const now = Date.now();
          
          for (const id of notificationIds) {
            await tombstoneTx.store.put({
              id,
              deleted_at: now,
              retry_count: 0,
            }, id);
          }
          await tombstoneTx.done;
          
          // Then clear the notifications table
          await db.clear('notifications');
          
          console.log(`[clearAllNotificationsFromCache] Created ${notificationIds.length} tombstones and cleared notifications table`);
        }
      } else {
        // SQLite - get all notification IDs first
        const notifications = await db.getAllAsync('SELECT id FROM notifications');
        const notificationIds = notifications.map((n: any) => n.id);
        console.log(`[clearAllNotificationsFromCache] Found ${notificationIds.length} notifications to clear`);
        
        if (notificationIds.length > 0) {
          // Create tombstones for all notifications
          const now = Date.now();
          for (const id of notificationIds) {
            await db.runAsync(
              `INSERT OR REPLACE INTO deleted_notifications (id, deleted_at, retry_count)
               VALUES (?, ?, 0)`,
              [id, now]
            );
          }
          
          // Then clear the notifications table
          await db.runAsync('DELETE FROM notifications');
          
          console.log(`[clearAllNotificationsFromCache] Created ${notificationIds.length} tombstones and cleared notifications table`);
        }
      }
      
      console.log('[clearAllNotificationsFromCache] Cache clear completed successfully');
      
    } catch (error) {
      console.error('[clearAllNotificationsFromCache] Failed to clear notifications cache:', error);
      throw error;
    }
  }, 'clearAllNotificationsFromCache');
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
      // Get all deleted notification IDs (tombstones) to filter out
      const deletedIds = new Set<string>();
      
      if (Platform.OS === 'web') {
        // IndexedDB
        const tombstones = await db.getAll('deleted_notifications');
        tombstones.forEach((t: any) => deletedIds.add(t.id));
      } else {
        // SQLite
        const tombstones = await db.getAllAsync('SELECT id FROM deleted_notifications');
        tombstones.forEach((t: any) => deletedIds.add(t.id));
      }
      
      // Filter out deleted notifications
      const notificationsToSave = notifications.filter(n => !deletedIds.has(n.id));
      const skippedCount = notifications.length - notificationsToSave.length;
      
      if (skippedCount > 0) {
        console.log(`[upsertNotificationsBatch] Skipped ${skippedCount} deleted notifications`);
      }
      
      if (notificationsToSave.length === 0) {
        console.log('[upsertNotificationsBatch] No notifications to save after filtering deleted');
        return;
      }
      
      if (Platform.OS === 'web') {
        // IndexedDB
        const tx = db.transaction('notifications', 'readwrite');

        for (const notification of notificationsToSave) {
          // Check if notification already exists and preserve its readAt
          const existing = await tx.store.get(notification.id);
          const parsedData = parseNotificationForDB(notification);
          
          // Preserve cached readAt if exists (don't let backend overwrite local read status)
          if (existing && existing.read_at !== null) {
            parsedData.read_at = existing.read_at;
            // Also update the fragment JSON to keep it consistent
            const fragmentObj = JSON.parse(parsedData.fragment);
            fragmentObj.readAt = existing.read_at;
            parsedData.fragment = JSON.stringify(fragmentObj);
          }
          
          await tx.store.put(parsedData, parsedData.id);
        }

        await tx.done;
      } else {
        // SQLite - use batch insert with readAt preservation
        for (const notification of notificationsToSave) {
          // Check if notification already exists
          const existing = await db.getFirstAsync(
            'SELECT read_at FROM notifications WHERE id = ?',
            [notification.id]
          );
          
          const parsedData = parseNotificationForDB(notification);
          
          // Preserve cached readAt if exists (don't let backend overwrite local read status)
          if (existing && existing.read_at !== null) {
            parsedData.read_at = existing.read_at;
            // Also update the fragment JSON to keep it consistent
            const fragmentObj = JSON.parse(parsedData.fragment);
            fragmentObj.readAt = existing.read_at;
            parsedData.fragment = JSON.stringify(fragmentObj);
          }
          
          await db.runAsync(
            `INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, bucket_icon_url, has_attachments, fragment)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              parsedData.id,
              parsedData.created_at,
              parsedData.read_at,
              parsedData.bucket_id,
              parsedData.bucket_icon_url,
              parsedData.has_attachments,
              parsedData.fragment
            ]
          );
        }
      }
      
      console.log(`[upsertNotificationsBatch] Saved ${notificationsToSave.length} notifications to cache`);
    } catch (error) {
      console.error('[upsertNotificationsBatch] Failed to upsert notifications batch:', error);
    }
  }, 'upsertNotificationsBatch');
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
          console.warn(`[updateNotificationReadStatus] Notification ${notificationId} not found in cache for read status update`);
          return;
        }

        // Parse the current notification from fragment
        const notification = parseNotificationFromDB(existingRecord, db);
        if (!notification) {
          console.warn(`[updateNotificationReadStatus] Notification ${notificationId} is corrupted and was removed`);
          return;
        }

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
          console.warn(`[updateNotificationReadStatus] Notification ${notificationId} not found in cache for read status update`);
          return;
        }

        // Parse the current notification from fragment
        const notification = parseNotificationFromDB(existingRecord, db);
        if (!notification) {
          console.warn(`[updateNotificationReadStatus] Notification ${notificationId} is corrupted and was removed`);
          return;
        }

        // Update read_at in the notification object
        const updatedNotification: NotificationFragment = {
          ...notification,
          readAt
        };

        // Update the fragment JSON as well
        const updatedRecord = parseNotificationForDB(updatedNotification);

        // Save back to database
        await db.runAsync(
          `UPDATE notifications SET read_at = ?
           WHERE id = ?`,
          [
            updatedRecord.read_at,
            notificationId
          ]
        );
      }

      console.log(`[updateNotificationReadStatus] Updated read status for notification ${notificationId}: ${readAt ? 'read' : 'unread'}`);
    } catch (error) {
      console.error('[updateNotificationReadStatus] Failed to update notification read status:', error);
      throw error;
    }
  }, 'updateNotificationReadStatus');

  // Update CloudKit directly (more efficient than full sync)
  if (Platform.OS === 'ios') {
    iosBridgeService.updateNotificationReadStatusInCloudKit(
      notificationId,
      readAt
    ).catch((error) => {
      console.error('[NotificationsRepository] Failed to update CloudKit read status:', error);
    });
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
  if (notificationIds.length === 0) {
    return;
  }

  await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - use batch update
        const tx = db.transaction('notifications', 'readwrite');
        let updatedCount = 0;

        for (const id of notificationIds) {
          const existingRecord = await tx.store.get(id);
          if (existingRecord) {
            // Parse the current notification from fragment
            const notification = parseNotificationFromDB(existingRecord, db);
            if (!notification) {
              console.warn(`[updateNotificationsReadStatus] Notification ${id} is corrupted and was removed`);
              continue;
            }
            updatedCount++;

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
        let updatedCount = 0;
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
            const notification = parseNotificationFromDB(existingRecord, db);
            if (!notification) {
              console.warn(`[updateNotificationsReadStatus] Notification ${id} is corrupted and was removed`);
              continue;
            }

            // Update read_at in the notification object
            const updatedNotification: NotificationFragment = {
              ...notification,
              readAt: readAt
            };

            // Update the fragment JSON as well
            const updatedRecord = parseNotificationForDB(updatedNotification);

            // Save back to database
            await db.runAsync(
              `UPDATE notifications SET created_at = ?, read_at = ?, bucket_id = ?, bucket_icon_url = ?, has_attachments = ?, fragment = ?
               WHERE id = ?`,
              [
                updatedRecord.created_at,
                updatedRecord.read_at,
                updatedRecord.bucket_id,
                updatedRecord.bucket_icon_url,
                updatedRecord.has_attachments,
                updatedRecord.fragment,
                id
              ]
            );
            updatedCount++;
          }
        }
      }
    } catch (error) {
      console.error('[updateNotificationsReadStatus] Failed to update notifications read status:', error);
      throw error;
    }
  }, 'updateNotificationsReadStatus');

  // Update CloudKit directly (more efficient than full sync)
  if (Platform.OS === 'ios') {
    console.log(`[updateNotificationsReadStatus] Updating ${notificationIds.length} notifications in CloudKit - readAt: ${readAt !== null ? 'set' : 'null'}`);
    iosBridgeService.updateNotificationsReadStatusInCloudKit(
      notificationIds,
      readAt
    ).then((result) => {
      console.log(`[updateNotificationsReadStatus] ✅ CloudKit batch update completed - success: ${result.success}, updatedCount: ${result.updatedCount}`);
    }).catch((error) => {
      console.error('[NotificationsRepository] Failed to update CloudKit read status:', error);
    });
  }
}

/**
 * Delete a notification from cache
 * Also creates a tombstone to prevent re-adding from backend sync
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
      // Create tombstone first (before deletion)
      const now = Date.now();
      
      if (Platform.OS === 'web') {
        // IndexedDB
        await db.put('deleted_notifications', {
          id: notificationId,
          deleted_at: now,
          retry_count: 0,
        }, notificationId);
        
        // Then delete from cache
        await db.delete('notifications', notificationId);
      } else {
        // SQLite
        await db.runAsync(
          `INSERT OR REPLACE INTO deleted_notifications (id, deleted_at, retry_count)
           VALUES (?, ?, 0)`,
          [notificationId, now]
        );
        
        // Then delete from cache
        await db.runAsync('DELETE FROM notifications WHERE id = ?', [notificationId]);
      }

      console.log(`[deleteNotificationFromCache] Deleted notification ${notificationId} from cache and created tombstone`);
    } catch (error) {
      console.error('[deleteNotificationFromCache] Failed to delete notification from cache:', error);
      throw error;
    }
  }, 'deleteNotificationFromCache');

  // Delete from CloudKit directly (more efficient than full sync)
  if (Platform.OS === 'ios') {
    iosBridgeService.deleteNotificationFromCloudKit(notificationId).catch((error) => {
      console.error('[NotificationsRepository] Failed to delete notification from CloudKit:', error);
    });
  }
}

/**
 * Delete multiple notifications from cache in batch
 * Also creates tombstones to prevent re-adding from backend sync
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
      const now = Date.now();
      
      if (Platform.OS === 'web') {
        // IndexedDB - create tombstones and delete in batch
        const deleteTx = db.transaction('deleted_notifications', 'readwrite');
        for (const id of notificationIds) {
          await deleteTx.store.put({
            id,
            deleted_at: now,
            retry_count: 0,
          }, id);
        }
        await deleteTx.done;
        
        // Then delete from cache
        const cacheTx = db.transaction('notifications', 'readwrite');
        for (const id of notificationIds) {
          await cacheTx.store.delete(id);
        }
        await cacheTx.done;
      } else {
        // SQLite - create tombstones first
        for (const id of notificationIds) {
          await db.runAsync(
            `INSERT OR REPLACE INTO deleted_notifications (id, deleted_at, retry_count)
             VALUES (?, ?, 0)`,
            [id, now]
          );
        }
        
        // Then delete from cache with single query
        if (notificationIds.length > 0) {
          const placeholders = notificationIds.map(() => '?').join(',');
          await db.runAsync(`DELETE FROM notifications WHERE id IN (${placeholders})`, notificationIds);
        }
      }

      console.log(`[deleteNotificationsFromCache] Deleted ${notificationIds.length} notifications from cache`);
    } catch (error) {
      console.error('[deleteNotificationsFromCache] Failed to delete notifications from cache:', error);
      throw error;
    }
  }, 'deleteNotificationsFromCache');

  // Delete from CloudKit directly (more efficient than full sync)
  if (Platform.OS === 'ios') {
    iosBridgeService.deleteNotificationsFromCloudKit(notificationIds).catch((error) => {
      console.error('[NotificationsRepository] Failed to delete notifications from CloudKit:', error);
    });
  }
}

/**
 * Delete all notifications from cache for a specific bucket
 *
 * @example
 * ```typescript
 * import { deleteNotificationsByBucketId } from '@/services/notifications-repository';
 *
 * await deleteNotificationsByBucketId('bucket-id');
 * ```
 */
export async function deleteNotificationsByBucketId(bucketId: string): Promise<number> {
  return await executeQuery(async (db) => {
    try {
      let deletedCount = 0;
      
      if (Platform.OS === 'web') {
        // IndexedDB - get all notifications for bucket and delete them
        const tx = db.transaction('notifications', 'readwrite');
        const allNotifications = await tx.store.getAll();

        for (const notification of allNotifications) {
          if (notification.bucket_id === bucketId) {
            await tx.store.delete(notification.id);
            deletedCount++;
          }
        }

        await tx.done;
      } else {
        // SQLite - use single query to delete by bucket_id
        const result = await db.runAsync('DELETE FROM notifications WHERE bucket_id = ?', [bucketId]);
        deletedCount = result.changes || 0;
      }

      console.log(`[deleteNotificationsByBucketId] Deleted ${deletedCount} notifications for bucket ${bucketId} from cache`);
      return deletedCount;
    } catch (error) {
      console.error('[deleteNotificationsByBucketId] Failed to delete notifications by bucket ID from cache:', error);
      throw error;
    }
  }, 'deleteNotificationsByBucketId');
}

/**
 * Delete all notifications for a bucket from cache, database, and remote server
 * This is a comprehensive deletion that handles all sources
 *
 * @example
 * ```typescript
 * import { deleteBucketNotificationsCompletely } from '@/services/notifications-repository';
 *
 * const result = await deleteBucketNotificationsCompletely('bucket-id', massDeleteMutation);
 * console.log(`Deleted ${result.localCount} notifications locally and ${result.remoteCount} from server`);
 * ```
 */
export async function deleteBucketNotificationsCompletely(
  bucketId: string,
  massDeleteMutation?: any
): Promise<{ localCount: number; remoteCount: number; notificationIds: string[] }> {
  console.log(`[deleteBucketNotificationsCompletely] Starting complete deletion for bucket ${bucketId}`);
  
  // Step 1: Get all notification IDs for this bucket before deletion
  const notificationIds = await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - get all notification IDs for bucket
        const tx = db.transaction('notifications', 'readonly');
        const allNotifications = await tx.store.getAll();
        await tx.done;
        
        return allNotifications
          .filter((notification: any) => notification.bucket_id === bucketId)
          .map((notification: any) => notification.id);
      } else {
        // SQLite - get notification IDs
        const result = await db.getAllAsync('SELECT id FROM notifications WHERE bucket_id = ?', [bucketId]);
        return result.map((row: any) => row.id);
      }
    } catch (error) {
      console.error('[deleteBucketNotificationsCompletely] Failed to get notification IDs:', error);
      return [];
    }
  }, 'deleteBucketNotificationsCompletely');

  console.log(`[deleteBucketNotificationsCompletely] Found ${notificationIds.length} notifications to delete`);

  // Step 2: Delete from local cache and database
  const localCount = await deleteNotificationsByBucketId(bucketId);
  console.log(`[deleteBucketNotificationsCompletely] Deleted ${localCount} notifications from local cache/DB`);

  // Step 3: Try to delete from remote server (if mutation is provided)
  let remoteCount = 0;
  if (massDeleteMutation && notificationIds.length > 0) {
    try {
      console.log(`[deleteBucketNotificationsCompletely] Attempting to delete ${notificationIds.length} notifications from remote server`);
      
      // Use mass delete mutation for efficiency
      const { data } = await massDeleteMutation({
        variables: {
          ids: notificationIds
        }
      });

      if (data?.massDeleteNotifications?.success) {
        remoteCount = data.massDeleteNotifications.deletedCount || notificationIds.length;
        console.log(`[deleteBucketNotificationsCompletely] Successfully deleted ${remoteCount} notifications from remote server`);
      } else {
        console.warn(`[deleteBucketNotificationsCompletely] Remote deletion returned success: false`);
      }
    } catch (error: any) {
      // Log error but don't fail the entire operation
      console.error(`[deleteBucketNotificationsCompletely] Failed to delete notifications from remote server:`, error.message);
      
      // If it's a network error or server unavailable, that's OK - local deletion succeeded
      if (error.message?.includes('Network') || 
          error.message?.includes('fetch') || 
          error.message?.includes('timeout') ||
          error.message?.includes('ECONNREFUSED')) {
        console.log(`[deleteBucketNotificationsCompletely] Remote deletion failed due to network/server issues, but local deletion succeeded`);
      } else {
        // For other errors, we might want to retry later or handle differently
        console.warn(`[deleteBucketNotificationsCompletely] Remote deletion failed with unexpected error:`, error.message);
      }
    }
  } else if (!massDeleteMutation) {
    console.log(`[deleteBucketNotificationsCompletely] No mutation provided, skipping remote deletion`);
  }

  const result = {
    localCount,
    remoteCount,
    notificationIds
  };

  console.log(`[deleteBucketNotificationsCompletely] Complete deletion finished:`, result);
  return result;
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
export async function cleanupNotificationsBySettings(): Promise<NotificationCleanupResult> {
  const max = settingsService.getMaxCachedNotifications() ?? 500;
  const maxDays = settingsService.getMaxCachedNotificationsDay();

  const notifications = await getAllNotificationsFromCache();

  console.log(`[cleanupNotificationsBySettings] Starting cleanup with max=${max}, maxDays=${maxDays}`);

  const totalBefore = notifications.length;

  if (totalBefore === 0) {
    console.log('[cleanupNotificationsBySettings] No notifications to clean up');
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
      console.log(`[cleanupNotificationsBySettings] Filtered ${filteredByAge} notifications older than ${maxDays} days`);
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
    console.log(`[cleanupNotificationsBySettings] Limited to ${max} notifications, removing ${filteredByCount} excess`);
  }

  // Find notifications to delete (those not in the keep list)
  const idsToKeep = new Set(notificationsToKeep.map(n => n.id));
  const idsToDelete = notifications
    .filter(notification => !idsToKeep.has(notification.id))
    .map(notification => notification.id);

  console.log(`[cleanupNotificationsBySettings] Will delete ${idsToDelete.length} notifications from database`);

  // Delete from database (works for both IndexedDB and SQLite)
  let deletedCount = 0;
  if (idsToDelete.length > 0) {
    await deleteNotificationsFromCache(idsToDelete);
    deletedCount = idsToDelete.length;
    console.log(`[cleanupNotificationsBySettings] Deleted ${deletedCount} notifications from database`);
  }

  const totalAfter = notificationsToKeep.length;

  console.log(`[cleanupNotificationsBySettings] Cleanup completed: ${totalBefore} → ${totalAfter} notifications (${deletedCount} deleted)`);

  return {
    totalBefore,
    totalAfter,
    deletedCount,
    filteredByAge,
    filteredByCount
  };
}

// ====================
// DELETED NOTIFICATIONS TOMBSTONE MANAGEMENT
// ====================

/**
 * Mark a notification as deleted locally (tombstone)
 * This prevents it from being re-added to cache even if it comes from backend sync
 */
export async function markNotificationAsDeleted(notificationId: string): Promise<void> {
  await executeQuery(async (db) => {
    const now = Date.now();
    
    if (Platform.OS === 'web') {
      // IndexedDB
      await db.put('deleted_notifications', {
        id: notificationId,
        deleted_at: now,
        retry_count: 0,
      }, notificationId);
    } else {
      // SQLite
      await db.runAsync(
        `INSERT OR REPLACE INTO deleted_notifications (id, deleted_at, retry_count)
         VALUES (?, ?, 0)`,
        [notificationId, now]
      );
    }
    
    console.log(`[markNotificationAsDeleted] Marked notification ${notificationId} as deleted`);
  }, 'markNotificationAsDeleted');
}

/**
 * Mark multiple notifications as deleted locally (tombstone)
 */
export async function markNotificationsAsDeleted(notificationIds: string[]): Promise<void> {
  if (notificationIds.length === 0) return;
  
  await executeQuery(async (db) => {
    const now = Date.now();
    
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('deleted_notifications', 'readwrite');
      for (const id of notificationIds) {
        await tx.store.put({
          id,
          deleted_at: now,
          retry_count: 0,
        }, id);
      }
      await tx.done;
    } else {
      // SQLite
      for (const id of notificationIds) {
        await db.runAsync(
          `INSERT OR REPLACE INTO deleted_notifications (id, deleted_at, retry_count)
           VALUES (?, ?, 0)`,
          [id, now]
        );
      }
    }
    
    console.log(`[markNotificationsAsDeleted] Marked ${notificationIds.length} notifications as deleted`);
  }, 'markNotificationsAsDeleted');
}

/**
 * Check if a notification is marked as deleted (tombstone exists)
 */
export async function isNotificationDeleted(notificationId: string): Promise<boolean> {
  return await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      const tombstone = await db.get('deleted_notifications', notificationId);
      return !!tombstone;
    } else {
      // SQLite
      const result = await db.getFirstAsync(
        'SELECT id FROM deleted_notifications WHERE id = ?',
        [notificationId]
      );
      return !!result;
    }
  }, 'isNotificationDeleted');
}

/**
 * Get all deleted notification IDs (for filtering during sync)
 */
export async function getAllDeletedNotificationIds(): Promise<Set<string>> {
  return await executeQuery(async (db) => {
    const deletedIds = new Set<string>();
    
    if (Platform.OS === 'web') {
      // IndexedDB
      const tombstones = await db.getAll('deleted_notifications');
      tombstones.forEach((t: any) => deletedIds.add(t.id));
    } else {
      // SQLite
      const results = await db.getAllAsync('SELECT id FROM deleted_notifications');
      results.forEach((r: any) => deletedIds.add(r.id));
    }
    
    return deletedIds;
  }, 'getAllDeletedNotificationIds');
}

/**
 * Remove tombstone for a notification (after successful server deletion)
 */
export async function removeDeletedNotificationTombstone(notificationId: string): Promise<void> {
  await executeQuery(async (db) => {
    if (Platform.OS === 'web') {
      // IndexedDB
      await db.delete('deleted_notifications', notificationId);
    } else {
      // SQLite
      await db.runAsync(
        'DELETE FROM deleted_notifications WHERE id = ?',
        [notificationId]
      );
    }
    
    console.log(`[removeDeletedNotificationTombstone] Removed tombstone for ${notificationId}`);
  }, 'removeDeletedNotificationTombstone');
}

/**
 * Increment retry count for a deleted notification tombstone
 */
export async function incrementDeleteTombstoneRetry(notificationId: string): Promise<void> {
  await executeQuery(async (db) => {
    const now = Date.now();
    
    if (Platform.OS === 'web') {
      // IndexedDB
      const tombstone = await db.get('deleted_notifications', notificationId);
      if (tombstone) {
        await db.put('deleted_notifications', {
          ...tombstone,
          retry_count: tombstone.retry_count + 1,
          last_retry_at: now,
        }, notificationId);
      }
    } else {
      // SQLite
      await db.runAsync(
        `UPDATE deleted_notifications 
         SET retry_count = retry_count + 1, last_retry_at = ?
         WHERE id = ?`,
        [now, notificationId]
      );
    }
  }, 'incrementDeleteTombstoneRetry');
}

/**
 * Cleanup old tombstones (older than 30 days)
 * This prevents the tombstone table from growing indefinitely
 */
export async function cleanupOldDeletedTombstones(): Promise<number> {
  return await executeQuery(async (db) => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000; // 30 days ago
    
    if (Platform.OS === 'web') {
      // IndexedDB
      const tx = db.transaction('deleted_notifications', 'readwrite');
      const index = tx.store.index('deleted_at');
      let count = 0;
      
      for await (const cursor of index.iterate()) {
        if (cursor.value.deleted_at < cutoff) {
          await cursor.delete();
          count++;
        }
      }
      
      await tx.done;
      console.log(`[cleanupOldDeletedTombstones] Cleaned up ${count} old tombstones`);
      return count;
    } else {
      // SQLite
      const result = await db.runAsync(
        'DELETE FROM deleted_notifications WHERE deleted_at < ?',
        [cutoff]
      );
      const count = result.changes || 0;
      console.log(`[cleanupOldDeletedTombstones] Cleaned up ${count} old tombstones`);
      return count;
    }
  }, 'cleanupOldDeletedTombstones');
}
