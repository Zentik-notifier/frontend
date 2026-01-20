import { NativeModules, Platform } from 'react-native';

const { WidgetReloadBridge, DatabaseAccessBridge, CloudKitSyncBridge } = NativeModules;

// Debug: log available bridges
console.log('[IosBridge] Available bridges:', {
  WidgetReloadBridge: !!WidgetReloadBridge,
  DatabaseAccessBridge: !!DatabaseAccessBridge,
  CloudKitSyncBridge: !!CloudKitSyncBridge,
});

const isIOS = Platform.OS === 'ios';

// ========== IosBridgeService ==========

class IosBridgeService {

  // ========== Database Access Methods (iOS only) ==========

  /**
   * Mark a single notification as read using native DatabaseAccess library
   * This directly accesses the shared SQLite database
   */
  async dbMarkNotificationAsRead(notificationId: string): Promise<{
    success: boolean;
    notificationId: string;
    readAt?: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.markNotificationAsRead(notificationId);
      console.log('[DatabaseAccess] Marked notification as read:', notificationId);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to mark notification as read:', error);
      throw error;
    }
  }

  /**
   * Mark multiple notifications as read in bulk using native DatabaseAccess library
   */
  async dbMarkMultipleNotificationsAsRead(notificationIds: string[]): Promise<{
    success: boolean;
    count: number;
    readAt?: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    if (notificationIds.length === 0) {
      return { success: true, count: 0 };
    }

    try {
      const result = await DatabaseAccessBridge.markMultipleNotificationsAsRead(notificationIds);
      console.log('[DatabaseAccess] Marked notifications as read:', notificationIds.length);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to mark notifications as read:', error);
      throw error;
    }
  }

  /**
   * Mark a single notification as unread using native DatabaseAccess library
   */
  async dbMarkNotificationAsUnread(notificationId: string): Promise<{
    success: boolean;
    notificationId: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.markNotificationAsUnread(notificationId);
      console.log('[DatabaseAccess] Marked notification as unread:', notificationId);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to mark notification as unread:', error);
      throw error;
    }
  }

  /**
   * Delete a single notification using native DatabaseAccess library
   */
  async dbDeleteNotification(notificationId: string): Promise<{
    success: boolean;
    notificationId: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.deleteNotification(notificationId);
      console.log('[DatabaseAccess] Deleted notification:', notificationId);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to delete notification:', error);
      throw error;
    }
  }

  /**
   * Get unread notification count using native DatabaseAccess library
   */
  async dbGetNotificationCount(): Promise<{ count: number }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.getNotificationCount();
      console.log('[DatabaseAccess] Notification count:', result.count);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to get notification count:', error);
      throw error;
    }
  }

  /**
   * Check if notification exists using native DatabaseAccess library
   */
  async dbNotificationExists(notificationId: string): Promise<{
    exists: boolean;
    notificationId: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.notificationExists(notificationId);
      console.log('[DatabaseAccess] Notification exists:', notificationId, result.exists);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to check notification existence:', error);
      throw error;
    }
  }

  /**
   * Get all buckets using native DatabaseAccess library
   */
  async dbGetAllBuckets(): Promise<{
    buckets: Array<{
      id: string;
      name: string;
      unreadCount: number;
      color?: string;
      iconUrl?: string;
    }>;
    count: number;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.getAllBuckets();
      console.log('[DatabaseAccess] Retrieved buckets:', result.count);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to get buckets:', error);
      throw error;
    }
  }

  /**
   * Get recent notifications using native DatabaseAccess library
   */
  async dbGetRecentNotifications(
    limit: number = 5,
    unreadOnly: boolean = false
  ): Promise<{
    notifications: Array<{
      id: string;
      title: string;
      body: string;
      subtitle?: string;
      createdAt: string;
      isRead: boolean;
      bucketId: string;
      bucketName?: string;
      bucketColor?: string;
      bucketIconUrl?: string;
      attachments?: Array<{
        mediaType: string;
        url?: string;
        name?: string;
      }>;
      actions?: Array<{
        type: string;
        label: string;
        value?: string;
        id?: string;
        url?: string;
        bucketId?: string;
        minutes?: number;
      }>;
    }>;
    count: number;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.getRecentNotifications(limit, unreadOnly);
      console.log('[DatabaseAccess] Retrieved recent notifications:', result.count);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to get recent notifications:', error);
      throw error;
    }
  }

  /**
   * Get a setting value using native DatabaseAccess library
   */
  async dbGetSettingValue(key: string): Promise<{
    key: string;
    value: string | null;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.getSettingValue(key);
      console.log('[DatabaseAccess] Retrieved setting:', key, result.value !== null);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to get setting value:', error);
      throw error;
    }
  }

  /**
   * Set a setting value using native DatabaseAccess library
   */
  async dbSetSettingValue(key: string, value: string): Promise<{
    success: boolean;
    key: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.setSettingValue(key, value);
      console.log('[DatabaseAccess] Set setting:', key);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to set setting value:', error);
      throw error;
    }
  }

  /**
   * Remove a setting value using native DatabaseAccess library
   */
  async dbRemoveSettingValue(key: string): Promise<{
    success: boolean;
    key: string;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.removeSettingValue(key);
      console.log('[DatabaseAccess] Removed setting:', key);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to remove setting value:', error);
      throw error;
    }
  }

  /**
   * Get database path (for debugging)
   */
  async dbGetDbPath(): Promise<{ path: string }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.getDbPath();
      console.log('[DatabaseAccess] Database path:', result.path);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to get database path:', error);
      throw error;
    }
  }

  // ========== Generic SQL Operations ==========

  /**
   * Execute a generic SQL query (SELECT)
   * Returns an array of rows as objects
   */
  async dbExecuteQuery(sql: string, params: any[] = []): Promise<any[]> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const results = await DatabaseAccessBridge.executeQuery(sql, params);
      console.log('[DatabaseAccess] Query executed, rows:', results.length);
      return results;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to execute query:', error);
      throw error;
    }
  }

  /**
   * Execute a generic SQL statement (INSERT, UPDATE, DELETE)
   * Returns the number of affected rows
   */
  async dbExecuteUpdate(sql: string, params: any[] = []): Promise<{
    success: boolean;
    changes: number;
  }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    try {
      const result = await DatabaseAccessBridge.executeUpdate(sql, params);
      console.log('[DatabaseAccess] Update executed, changes:', result.changes);
      return result;
    } catch (error) {
      console.error('[DatabaseAccess] Failed to execute update:', error);
      throw error;
    }
  }

  // ========== Widget Methods ==========

  /**
   * Reload all widgets to reflect data changes
   */
  async reloadAllWidgets(): Promise<boolean> {
    if (!isIOS || !WidgetReloadBridge) {
      console.log('[Widget] Not available on this platform');
      return false;
    }

    try {
      WidgetReloadBridge.reloadAllWidgets();
      console.log('[Widget] All widgets reloaded successfully');
      return true;
    } catch (error) {
      console.error('[Widget] Failed to reload widgets:', error);
      return false;
    }
  }

  // ========== CloudKit Sync Methods ==========

  /**
   * Trigger CloudKit sync immediately (debounce removed for faster sync)
   * CloudKit sync always happens regardless of Watch availability
   * Multiple calls will trigger multiple syncs, but CloudKit handles rate limiting
   */
  async triggerCloudKitSyncWithDebounce(): Promise<void> {
    if (!isIOS || !CloudKitSyncBridge) {
      return;
    }

    try {
      await CloudKitSyncBridge.triggerSyncToCloudWithDebounce();
    } catch (error) {
      console.error('[CloudKit] Failed to trigger sync:', error);
    }
  }

  /**
   * Trigger immediate CloudKit sync
   * Returns sync statistics
   */
  async triggerCloudKitSync(): Promise<{
    success: boolean;
    notificationsSynced: number;
    bucketsSynced: number;
    notificationsUpdated: number;
    bucketsUpdated: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return {
        success: false,
        notificationsSynced: 0,
        bucketsSynced: 0,
        notificationsUpdated: 0,
        bucketsUpdated: 0,
      };
    }

    try {
      const result = await CloudKitSyncBridge.triggerSyncToCloud();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to trigger sync:', error);
      return {
        success: false,
        notificationsSynced: 0,
        bucketsSynced: 0,
        notificationsUpdated: 0,
        bucketsUpdated: 0,
      };
    }
  }

  /**
   * Update notification read status in CloudKit (single notification)
   * More efficient than triggering a full sync when only updating read status
   * readAt: null means unread, non-null means read
   */
  async updateNotificationReadStatusInCloudKit(
    notificationId: string,
    readAt: string | null
  ): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      return false;
    }

    try {
      // Convert ISO8601 string to timestamp (milliseconds since epoch)
      const readAtTimestamp = readAt ? new Date(readAt).getTime() : null;
      
      await CloudKitSyncBridge.updateNotificationReadStatus(
        notificationId,
        readAtTimestamp
      );
      return true;
    } catch (error) {
      console.error('[CloudKit] Failed to update notification read status:', error);
      return false;
    }
  }

  /**
   * Update multiple notifications read status in CloudKit (batch)
   * More efficient than triggering a full sync when updating multiple notifications
   * readAt: null means unread, non-null means read
   */
  async updateNotificationsReadStatusInCloudKit(
    notificationIds: string[],
    readAt: string | null
  ): Promise<{ success: boolean; updatedCount: number }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, updatedCount: 0 };
    }

    try {
      // Convert ISO8601 string to timestamp (milliseconds since epoch)
      const readAtTimestamp = readAt ? new Date(readAt).getTime() : null;
      
      const result = await CloudKitSyncBridge.updateNotificationsReadStatus(
        notificationIds,
        readAtTimestamp
      );
      return { success: result.success, updatedCount: result.updatedCount || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to update notifications read status:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Delete notification from CloudKit (single notification)
   * More efficient than triggering a full sync when only deleting one notification
   */
  async deleteNotificationFromCloudKit(notificationId: string): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      return false;
    }

    try {
      await CloudKitSyncBridge.deleteNotification(notificationId);
      return true;
    } catch (error) {
      console.error('[CloudKit] Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * Delete multiple notifications from CloudKit (batch)
   * More efficient than triggering a full sync when deleting multiple notifications
   */
  async deleteNotificationsFromCloudKit(
    notificationIds: string[]
  ): Promise<{ success: boolean; deletedCount: number }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, deletedCount: 0 };
    }

    try {
      const result = await CloudKitSyncBridge.deleteNotifications(notificationIds);
      return { success: result.success, deletedCount: result.deletedCount || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to delete notifications:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Trigger full sync with verification
   * Resets sync timestamp, performs complete sync, and verifies counts
   * Useful for debugging and ensuring all data is synced
   */
  /**
   * Perform incremental sync from CloudKit
   * Fetches only records that have changed since the last sync
   */
  async syncFromCloudKitIncremental(fullSync: boolean = false): Promise<{
    success: boolean;
    updatedCount: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return {
        success: false,
        updatedCount: 0,
      };
    }

    try {
      const result = await CloudKitSyncBridge.syncFromCloudKitIncremental(fullSync);
      console.log('[CloudKit] Incremental sync completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to perform incremental sync:', error);
      return {
        success: false,
        updatedCount: 0,
      };
    }
  }

  async triggerFullSyncWithVerification(): Promise<{
    success: boolean;
    sqliteNotifications: number;
    cloudKitNotifications: number;
    notificationsMatch: boolean;
    sqliteBuckets: number;
    cloudKitBuckets: number;
    bucketsMatch: boolean;
    notificationsSynced: number;
    notificationsUpdated: number;
    bucketsSynced: number;
    bucketsUpdated: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return {
        success: false,
        sqliteNotifications: 0,
        cloudKitNotifications: 0,
        notificationsMatch: false,
        sqliteBuckets: 0,
        cloudKitBuckets: 0,
        bucketsMatch: false,
        notificationsSynced: 0,
        notificationsUpdated: 0,
        bucketsSynced: 0,
        bucketsUpdated: 0,
      };
    }

    try {
      const result = await CloudKitSyncBridge.triggerFullSyncWithVerification();
      console.log('[CloudKit] Full sync with verification completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to trigger full sync with verification:', error);
      return {
        success: false,
        sqliteNotifications: 0,
        cloudKitNotifications: 0,
        notificationsMatch: false,
        sqliteBuckets: 0,
        cloudKitBuckets: 0,
        bucketsMatch: false,
        notificationsSynced: 0,
        notificationsUpdated: 0,
        bucketsSynced: 0,
        bucketsUpdated: 0,
      };
    }
  }

  /**
   * Initialize CloudKit schema if needed
   */
  async initializeCloudKitSchema(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('CloudKit schema initialization is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.initializeSchemaIfNeeded();
      console.log('[CloudKit] Schema initialization completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to initialize schema:', error);
      throw error;
    }
  }

  /**
   * Setup CloudKit subscriptions
   * Should be called after zone is initialized
   */
  async setupCloudKitSubscriptions(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('CloudKit subscriptions setup is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.setupSubscriptions();
      console.log('[CloudKit] Subscriptions setup completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to setup subscriptions:', error);
      throw error;
    }
  }

  /**
   * Check if CloudKit is enabled
   */
  async isCloudKitEnabled(): Promise<{ enabled: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { enabled: false };
    }

    try {
      const result = await CloudKitSyncBridge.isCloudKitEnabled();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to check enabled state:', error);
      return { enabled: false };
    }
  }

  /**
   * Set CloudKit enabled state
   */
  async setCloudKitEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('CloudKit enable/disable is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.setCloudKitEnabled(enabled);
      console.log('[CloudKit] Enabled state changed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to set enabled state:', error);
      throw error;
    }
  }

  /**
   * Check if initial sync has been completed
   */
  async isInitialSyncCompleted(): Promise<{ completed: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { completed: false };
    }

    try {
      const result = await CloudKitSyncBridge.isInitialSyncCompleted();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to check initial sync status:', error);
      return { completed: false };
    }
  }

  /**
   * Reset initial sync flag (to trigger initial sync again)
   */
  async resetInitialSyncFlag(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('Reset initial sync flag is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.resetInitialSyncFlag();
      console.log('[CloudKit] Initial sync flag reset:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to reset initial sync flag:', error);
      throw error;
    }
  }

  /**
   * Delete CloudKit zone and all its data
   */
  async deleteCloudKitZone(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('Delete CloudKit zone is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.deleteCloudKitZone();
      console.log('[CloudKit] Zone deleted:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to delete zone:', error);
      throw error;
    }
  }

  /**
   * Reset CloudKit zone: delete everything and re-initialize
   */
  async resetCloudKitZone(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('Reset CloudKit zone is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.resetCloudKitZone();
      console.log('[CloudKit] Zone reset:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to reset zone:', error);
      throw error;
    }
  }


  /**
   * Subscribe to CloudKit sync progress events
   * The callback will be called with progress updates during sync operations
   */
  subscribeToSyncProgress(
    callback: (progress: {
      currentItem: number;
      totalItems: number;
      itemType: 'notification' | 'bucket';
      phase: 'syncing' | 'completed';
    }) => void
  ): void {
    if (!isIOS || !CloudKitSyncBridge) {
      return;
    }

    try {
      CloudKitSyncBridge.subscribeToSyncProgress(callback);
    } catch (error) {
      console.error('[CloudKit] Failed to subscribe to sync progress:', error);
    }
  }

  /**
   * Unsubscribe from CloudKit sync progress events
   */
  unsubscribeFromSyncProgress(): void {
    if (!isIOS || !CloudKitSyncBridge) {
      return;
    }

    try {
      CloudKitSyncBridge.unsubscribeFromSyncProgress();
    } catch (error) {
      console.error('[CloudKit] Failed to unsubscribe from sync progress:', error);
    }
  }

  /**
   * Delete CloudKit zone and all its data
   * WARNING: This will permanently delete all records in the zone
   */
  async deleteCloudKitZone(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('deleteCloudKitZone is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.deleteCloudKitZone();
      console.log('[CloudKit] Zone deleted successfully');
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to delete zone:', error);
      throw error;
    }
  }

  /**
   * Reset CloudKit zone: delete everything and re-initialize
   * This will delete all data and recreate the zone with fresh schema
   */
  async resetCloudKitZone(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('resetCloudKitZone is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.resetCloudKitZone();
      console.log('[CloudKit] Zone reset completed successfully');
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to reset zone:', error);
      throw error;
    }
  }
}

export default new IosBridgeService();
