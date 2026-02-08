import { NativeModules, Platform } from 'react-native';
import { settingsService } from './settings-service';

const { WidgetReloadBridge, DatabaseAccessBridge, CloudKitSyncBridge } = NativeModules;

const isIOS = Platform.OS === 'ios';

const isCloudKitDebugEnabled = () => settingsService.getSettings().cloudKitDebug === true;

// ========== IosBridgeService ==========

class IosBridgeService {

  // CloudKit readiness gate: resolves once initializeCloudKitSchema() completes.
  // Per-record CloudKit operations wait for this before proceeding.
  private _cloudKitReadyResolve: (() => void) | null = null;
  private _cloudKitReady: Promise<void>;
  private _cloudKitInitialized = false;

  constructor() {
    this._cloudKitReady = new Promise<void>((resolve) => {
      this._cloudKitReadyResolve = resolve;
    });
  }

  /**
   * Wait for CloudKit to be initialized before performing operations.
   * Times out after maxWaitMs to avoid permanent blockage.
   */
  private async waitForCloudKitReady(maxWaitMs = 10_000): Promise<void> {
    if (this._cloudKitInitialized) return;
    await Promise.race([
      this._cloudKitReady,
      new Promise<void>((resolve) => setTimeout(resolve, maxWaitMs)),
    ]);
  }

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

  /**
   * Get lock file path in App Group (for debugging). Logs are in JSON files, not in cache.db.
   */
  async dbGetSharedCacheLockPath(): Promise<{ path: string }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    const result = await DatabaseAccessBridge.getSharedCacheLockPath();
    return result;
  }

  /**
   * Get total notification count (read + unread)
   */
  async dbGetTotalNotificationCount(): Promise<{ count: number }> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    return await DatabaseAccessBridge.getTotalNotificationCount();
  }

  /**
   * Ensure shared cache.db exists with full schema (tables, indexes, migrations).
   * Idempotent; call once at app startup on iOS before using cache via bridge.
   */
  async dbEnsureCacheDbInitialized(): Promise<void> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    await DatabaseAccessBridge.ensureCacheDbInitialized();
  }

  /**
   * Run PRAGMA quick_check under lock (integrity check). For recovery flows on iOS.
   */
  async dbRunIntegrityCheck(): Promise<boolean> {
    if (!isIOS || !DatabaseAccessBridge) {
      throw new Error('Database access is only available on iOS');
    }

    await DatabaseAccessBridge.runIntegrityCheck();
    return true;
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

    await this.waitForCloudKitReady();

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

    await this.waitForCloudKitReady();

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

    await this.waitForCloudKitReady();

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

    await this.waitForCloudKitReady();

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

    await this.waitForCloudKitReady();

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

    await this.waitForCloudKitReady();

    try {
      const result = await CloudKitSyncBridge.deleteNotifications(notificationIds);
      return { success: result.success, deletedCount: result.deletedCount || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to delete notifications:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Retry sending notifications to CloudKit that were saved by NSE but failed to send
   * This is called at app startup to ensure all notifications are synced to CloudKit
   */
  async retryNSENotificationsToCloudKit(): Promise<{ success: boolean; count: number }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, count: 0 };
    }

    try {
      const result = await CloudKitSyncBridge.retryNSENotificationsToCloudKit();
      console.log('[CloudKit] Retried NSE notifications to CloudKit:', result.count);
      return { success: result.success || false, count: result.count || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to retry NSE notifications to CloudKit:', error);
      return { success: false, count: 0 };
    }
  }

  /**
   * Update all CloudKit notification records that don't have readAt set
   * This is useful for initializing or fixing records that are missing the readAt field
   * 
   * @param readAtTimestamp Optional timestamp (in milliseconds since epoch) to set for readAt.
   *                        If undefined, sets readAt to nil (unread).
   *                        If provided, sets all records to that timestamp (e.g., to mark all as read).
   */
  async updateAllNotificationsWithoutReadAt(
    readAtTimestamp?: number
  ): Promise<{ success: boolean; count: number }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, count: 0 };
    }

    try {
      const result = await CloudKitSyncBridge.updateAllNotificationsWithoutReadAt(
        readAtTimestamp ? readAtTimestamp : undefined
      );
      console.log('[CloudKit] Updated notifications without readAt:', result.count);
      return { success: result.success || false, count: result.count || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to update notifications without readAt:', error);
      return { success: false, count: 0 };
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
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Incremental sync completed:', result);
      }
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to perform incremental sync:', error);
      return {
        success: false,
        updatedCount: 0,
      };
    }
  }

  /**
   * Fetch all notifications currently stored in CloudKit.
   * Intended for recovery flows (notifications only).
   */
  async fetchAllNotificationsFromCloudKit(): Promise<{
    success: boolean;
    count: number;
    notifications: Array<{
      id: string;
      bucketId: string;
      title: string;
      body: string;
      subtitle?: string;
      createdAt: string;
      readAt?: string;
      isRead?: boolean;
      attachments?: any[];
      actions?: any[];
    }>;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, count: 0, notifications: [] };
    }

    try {
      const result = await CloudKitSyncBridge.fetchAllNotificationsFromCloudKit();
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] fetchAllNotificationsFromCloudKit completed:', {
          success: result?.success,
          count: result?.count,
        });
      }
      return {
        success: !!result?.success,
        count: result?.count || 0,
        notifications: result?.notifications || [],
      };
    } catch (error) {
      console.error('[CloudKit] Failed to fetch all notifications from CloudKit:', error);
      return { success: false, count: 0, notifications: [] };
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
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Full sync with verification completed:', result);
      }
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
   * Initialize CloudKit schema if needed.
   * Also marks CloudKit as ready so queued operations can proceed.
   */
  async initializeCloudKitSchema(): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('CloudKit schema initialization is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.initializeSchemaIfNeeded();
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Schema initialization completed:', result);
      }
      // Signal readiness to any operations waiting for CloudKit init
      this._cloudKitInitialized = true;
      this._cloudKitReadyResolve?.();
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
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Subscriptions setup completed:', result);
      }
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to setup subscriptions:', error);
      throw error;
    }
  }

  /**
   * Check if Watch is supported (WCSession.isSupported()).
   * On macOS Catalyst this is true only when a Watch is paired.
   * When false, CloudKit section should be hidden and CK must not run.
   */
  async isWatchSupported(): Promise<{ supported: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { supported: false };
    }
    try {
      const fn = (CloudKitSyncBridge as any).isWatchSupported;
      if (typeof fn !== 'function') {
        return { supported: false };
      }
      const result = await fn();
      return { supported: !!result?.supported };
    } catch (error) {
      console.error('[CloudKit] Failed to check watch support:', error);
      return { supported: false };
    }
  }

  async getProcessMemoryUsage(): Promise<{ residentMB: number; virtualMB: number } | null> {
    if (!isIOS || !CloudKitSyncBridge) {
      return null;
    }
    try {
      const fn = (CloudKitSyncBridge as any).getProcessMemoryUsage;
      if (typeof fn !== 'function') {
        return null;
      }
      const result = await fn();
      if (result && typeof result.residentMB === 'number' && typeof result.virtualMB === 'number') {
        return { residentMB: result.residentMB, virtualMB: result.virtualMB };
      }
      return null;
    } catch {
      return null;
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
   * Check if CloudKit debug logging is enabled
   */
  async isCloudKitDebugEnabled(): Promise<{ enabled: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { enabled: false };
    }

    try {
      const fn = (CloudKitSyncBridge as any).isCloudKitDebugEnabled;
      if (typeof fn !== 'function') {
        // Backward compatibility: native module built without debug methods.
        return { enabled: false };
      }

      const result = await fn();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to check debug enabled state:', error);
      return { enabled: false };
    }
  }

  /**
   * Set CloudKit debug logging enabled state
   */
  async setCloudKitDebugEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('CloudKit debug flag is only available on iOS');
    }

    try {
      const fn = (CloudKitSyncBridge as any).setCloudKitDebugEnabled;
      if (typeof fn !== 'function') {
        throw new Error('CloudKit debug methods are not available in this build (rebuild iOS app)');
      }

      const result = await fn(enabled);
      console.log('[CloudKit] Debug enabled state changed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to set debug enabled state:', error);
      throw error;
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
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Enabled state changed:', result);
      }
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to set enabled state:', error);
      throw error;
    }
  }

  /**
   * Get CloudKit notification limit
   * Returns null if limit is not set (unlimited)
   */
  async getCloudKitNotificationLimit(): Promise<{ limit: number | null }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { limit: null };
    }

    try {
      const result = await CloudKitSyncBridge.getCloudKitNotificationLimit();
      return { limit: result.limit ?? null };
    } catch (error) {
      console.error('[CloudKit] Failed to get CloudKit notification limit:', error);
      throw error;
    }
  }

  /**
   * Set CloudKit notification limit
   * Pass null/undefined to remove limit (unlimited)
   */
  async setCloudKitNotificationLimit(limit: number | null): Promise<{ success: boolean; limit: number | null }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('CloudKit notification limit is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.setCloudKitNotificationLimit(limit ?? undefined);
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Notification limit changed:', limit);
      }
      return { success: result.success, limit: result.limit ?? null };
    } catch (error) {
      console.error('[CloudKit] Failed to set notification limit:', error);
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
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Initial sync flag reset:', result);
      }
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
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Zone deleted:', result);
      }
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to delete zone:', error);
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

  /**
   * Send Watch token and server address to Watch app
   */
  async sendWatchTokenSettings(token: string, serverAddress: string): Promise<{ success: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('sendWatchTokenSettings is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.sendWatchTokenSettings(token, serverAddress);
      console.log('[WatchConnectivity] Token settings sent to Watch');
      return result;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to send token settings to Watch:', error);
      throw error;
    }
  }

  /**
   * Get Watch subscription sync mode
   * Returns: "foregroundOnly" | "alwaysActive" | "backgroundInterval"
   */
  async getWatchSubscriptionSyncMode(): Promise<{ mode: string }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { mode: 'foregroundOnly' };
    }

    try {
      const result = await CloudKitSyncBridge.getWatchSubscriptionSyncMode();
      return { mode: result.mode ?? 'foregroundOnly' };
    } catch (error) {
      console.error('[WatchConnectivity] Failed to get subscription sync mode:', error);
      return { mode: 'foregroundOnly' };
    }
  }

  /**
   * Set Watch subscription sync mode and send to Watch via WatchConnectivity
   * @param mode - "foregroundOnly" | "alwaysActive" | "backgroundInterval"
   */
  async setWatchSubscriptionSyncMode(mode: string): Promise<{ success: boolean; mode: string; sentToWatch: boolean }> {
    if (!isIOS || !CloudKitSyncBridge) {
      throw new Error('setWatchSubscriptionSyncMode is only available on iOS');
    }

    try {
      const result = await CloudKitSyncBridge.setWatchSubscriptionSyncMode(mode);
      console.log('[WatchConnectivity] Subscription sync mode set:', mode);
      return result;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to set subscription sync mode:', error);
      throw error;
    }
  }
}

export default new IosBridgeService();