import { NativeModules, Platform } from 'react-native';
import { settingsService } from './settings-service';

const { WidgetReloadBridge, DatabaseAccessBridge, CKSyncBridge } = NativeModules;

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

  async checkDecryptionFailureFlag(): Promise<boolean> {
    if (!isIOS || !DatabaseAccessBridge) return false;
    try {
      const result = await DatabaseAccessBridge.checkDecryptionFailureFlag();
      return result?.needsReregistration === true;
    } catch {
      return false;
    }
  }

  async clearDecryptionFailureFlag(): Promise<void> {
    if (!isIOS || !DatabaseAccessBridge) return;
    try {
      await DatabaseAccessBridge.clearDecryptionFailureFlag();
    } catch {}
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
    if (!DatabaseAccessBridge) return;
    if (!isIOS) return;

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
    if (!DatabaseAccessBridge || !isIOS) return [];

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
    if (!DatabaseAccessBridge || !isIOS) return { success: true, changes: 0 };

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
   * Trigger CloudKit sync for recent notifications (lightweight).
   * CKSyncEngine handles scheduling; this just adds pending changes.
   */
  async triggerCloudKitSyncWithDebounce(): Promise<void> {
    if (!isIOS || !CKSyncBridge) {
      return;
    }

    await this.waitForCloudKitReady();

    try {
      await CKSyncBridge.triggerSyncToCloudWithDebounce();
    } catch (error) {
      console.error('[CloudKit] Failed to trigger sync:', error);
    }
  }

  /**
   * Trigger immediate full CloudKit sync.
   */
  async triggerCloudKitSync(): Promise<{
    success: boolean;
    notificationsSynced: number;
    bucketsSynced: number;
    notificationsUpdated: number;
    bucketsUpdated: number;
  }> {
    if (!isIOS || !CKSyncBridge) {
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
      const result = await CKSyncBridge.triggerFullSyncToCloud();
      return {
        success: result?.success ?? false,
        notificationsSynced: result?.notificationsSynced ?? 0,
        bucketsSynced: result?.bucketsSynced ?? 0,
        notificationsUpdated: 0,
        bucketsUpdated: 0,
      };
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
   * Trigger a DESTRUCTIVE CloudKit sync with full zone reset.
   * Deletes the zone, recreates it, and re-uploads everything.
   */
  async triggerCloudKitSyncWithReset(): Promise<{
    success: boolean;
    notificationsSynced: number;
    bucketsSynced: number;
    notificationsUpdated: number;
    bucketsUpdated: number;
  }> {
    if (!isIOS || !CKSyncBridge) {
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
      const result = await CKSyncBridge.triggerSyncToCloudWithReset();
      return {
        success: result?.success ?? false,
        notificationsSynced: result?.notificationsSynced ?? 0,
        bucketsSynced: result?.bucketsSynced ?? 0,
        notificationsUpdated: 0,
        bucketsUpdated: 0,
      };
    } catch (error) {
      console.error('[CloudKit] Failed to trigger sync with reset:', error);
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
   * Update notification read status in CloudKit (single notification).
   * readAt: null means unread, non-null means read.
   */
  async updateNotificationReadStatusInCloudKit(
    notificationId: string,
    readAt: string | null
  ): Promise<boolean> {
    if (!isIOS || !CKSyncBridge) {
      return false;
    }

    await this.waitForCloudKitReady();

    try {
      const readAtTimestamp = readAt ? new Date(readAt).getTime() : null;
      await CKSyncBridge.updateNotificationReadStatus(notificationId, readAtTimestamp);
      return true;
    } catch (error) {
      console.error('[CloudKit] Failed to update notification read status:', error);
      return false;
    }
  }

  /**
   * Update multiple notifications read status in CloudKit (batch).
   */
  async updateNotificationsReadStatusInCloudKit(
    notificationIds: string[],
    readAt: string | null
  ): Promise<{ success: boolean; updatedCount: number }> {
    if (!isIOS || !CKSyncBridge) {
      return { success: false, updatedCount: 0 };
    }

    await this.waitForCloudKitReady();

    try {
      const readAtTimestamp = readAt ? new Date(readAt).getTime() : null;
      const result = await CKSyncBridge.updateNotificationsReadStatus(notificationIds, readAtTimestamp);
      return { success: result.success, updatedCount: result.updatedCount || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to update notifications read status:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Delete notification from CloudKit (single notification).
   */
  async deleteNotificationFromCloudKit(notificationId: string): Promise<boolean> {
    if (!isIOS || !CKSyncBridge) {
      return false;
    }

    await this.waitForCloudKitReady();

    try {
      await CKSyncBridge.deleteNotification(notificationId);
      return true;
    } catch (error) {
      console.error('[CloudKit] Failed to delete notification:', error);
      return false;
    }
  }

  /**
   * Delete multiple notifications from CloudKit (batch).
   */
  async deleteNotificationsFromCloudKit(
    notificationIds: string[]
  ): Promise<{ success: boolean; deletedCount: number }> {
    if (!isIOS || !CKSyncBridge) {
      return { success: false, deletedCount: 0 };
    }

    await this.waitForCloudKitReady();

    try {
      const result = await CKSyncBridge.deleteNotifications(notificationIds);
      return { success: result.success, deletedCount: result.deletedCount || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to delete notifications:', error);
      return { success: false, deletedCount: 0 };
    }
  }

  /**
   * Retry sending recent notifications to CloudKit (NSE catch-up).
   */
  async retryNSENotificationsToCloudKit(): Promise<{ success: boolean; count: number }> {
    if (!isIOS || !CKSyncBridge) {
      return { success: false, count: 0 };
    }

    try {
      const result = await CKSyncBridge.retryNSENotificationsToCloudKit();
      return { success: result.success || false, count: result.count || 0 };
    } catch (error) {
      console.error('[CloudKit] Failed to retry NSE notifications to CloudKit:', error);
      return { success: false, count: 0 };
    }
  }

  /**
   * Perform incremental sync from CloudKit.
   * CKSyncEngine fetches only changes since last state serialization.
   */
  async syncFromCloudKitIncremental(fullSync: boolean = false): Promise<{
    success: boolean;
    updatedCount: number;
  }> {
    if (!isIOS || !CKSyncBridge) {
      return { success: false, updatedCount: 0 };
    }

    try {
      const result = await CKSyncBridge.syncFromCloudKitIncremental(fullSync);
      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Incremental sync completed:', result);
      }
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to perform incremental sync:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Fetch all notifications currently stored in CloudKit (recovery).
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
    if (!isIOS || !CKSyncBridge) {
      return { success: false, count: 0, notifications: [] };
    }

    try {
      const result = await CKSyncBridge.fetchAllNotificationsFromCloudKit();
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
    if (!isIOS || !CKSyncBridge) {
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
      const cloudResult = await CKSyncBridge.triggerFullSyncToCloud();
      const bucketsSynced = cloudResult?.bucketsSynced ?? 0;
      const notificationsSynced = cloudResult?.notificationsSynced ?? 0;
      const cloudSuccess = cloudResult?.success ?? false;

      await CKSyncBridge.triggerWatchFullSync();

      if (isCloudKitDebugEnabled()) {
        console.log('[CloudKit] Full sync completed:', { cloudSuccess, bucketsSynced, notificationsSynced });
      }
      return {
        success: cloudSuccess,
        sqliteNotifications: notificationsSynced,
        cloudKitNotifications: notificationsSynced,
        notificationsMatch: true,
        sqliteBuckets: bucketsSynced,
        cloudKitBuckets: bucketsSynced,
        bucketsMatch: true,
        notificationsSynced,
        notificationsUpdated: 0,
        bucketsSynced,
        bucketsUpdated: 0,
      };
    } catch (error) {
      console.error('[CloudKit] Failed to trigger full sync:', error);
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
    if (!isIOS || !CKSyncBridge) {
      throw new Error('CloudKit schema initialization is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.initializeSchemaIfNeeded();
      this._cloudKitInitialized = true;
      this._cloudKitReadyResolve?.();
      return { success: !!result?.success };
    } catch (error) {
      console.error('[CloudKit] Failed to initialize schema:', error);
      throw error;
    }
  }

  async setupCloudKitSubscriptions(): Promise<{ success: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('CloudKit subscriptions setup is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.setupSubscriptions();
      return { success: !!result?.success };
    } catch (error) {
      console.error('[CloudKit] Failed to setup subscriptions:', error);
      throw error;
    }
  }

  async isWatchSupported(): Promise<{ supported: boolean }> {
    if (!isIOS) {
      return { supported: false };
    }
    const isIphone = !(Platform as { isPad?: boolean }).isPad;
    try {
      if (!CKSyncBridge?.isWatchSupported) {
        return { supported: isIphone };
      }
      const result = await CKSyncBridge.isWatchSupported();
      return { supported: !!result?.supported };
    } catch (error) {
      console.error('[CloudKit] Failed to check watch support:', error);
      return { supported: isIphone };
    }
  }

  async getProcessMemoryUsage(): Promise<{ residentMB: number; virtualMB: number } | null> {
    return null;
  }

  async isCloudKitEnabled(): Promise<{ enabled: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      return { enabled: false };
    }

    try {
      const result = await CKSyncBridge.isCloudKitEnabled();
      return { enabled: !!result?.enabled };
    } catch (error) {
      console.error('[CloudKit] Failed to check enabled state:', error);
      return { enabled: false };
    }
  }

  async isCloudKitDebugEnabled(): Promise<{ enabled: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      return { enabled: false };
    }

    try {
      const result = await CKSyncBridge.isCloudKitDebugEnabled();
      return { enabled: !!result?.enabled };
    } catch (error) {
      console.error('[CloudKit] Failed to check debug enabled state:', error);
      return { enabled: false };
    }
  }

  async setCloudKitDebugEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('CloudKit debug flag is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.setCloudKitDebugEnabled(enabled);
      return { success: !!result?.success, enabled: !!result?.enabled };
    } catch (error) {
      console.error('[CloudKit] Failed to set debug enabled state:', error);
      throw error;
    }
  }

  async setCloudKitEnabled(enabled: boolean): Promise<{ success: boolean; enabled: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('CloudKit enable/disable is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.setCloudKitEnabled(enabled);
      return { success: !!result?.success, enabled: !!result?.enabled };
    } catch (error) {
      console.error('[CloudKit] Failed to set enabled state:', error);
      throw error;
    }
  }

  async getCloudKitNotificationLimit(): Promise<{ limit: number | null }> {
    if (!isIOS || !CKSyncBridge) {
      return { limit: null };
    }

    try {
      const result = await CKSyncBridge.getCloudKitNotificationLimit();
      return { limit: result.limit ?? null };
    } catch (error) {
      console.error('[CloudKit] Failed to get CloudKit notification limit:', error);
      throw error;
    }
  }

  async setCloudKitNotificationLimit(limit: number | null): Promise<{ success: boolean; limit: number | null }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('CloudKit notification limit is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.setCloudKitNotificationLimit(limit ?? undefined);
      return { success: result.success, limit: result.limit ?? null };
    } catch (error) {
      console.error('[CloudKit] Failed to set notification limit:', error);
      throw error;
    }
  }

  async isInitialSyncCompleted(): Promise<{ completed: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      return { completed: false };
    }

    try {
      const result = await CKSyncBridge.isInitialSyncCompleted();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to check initial sync status:', error);
      return { completed: false };
    }
  }

  async resetInitialSyncFlag(): Promise<{ success: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('Reset initial sync flag is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.resetInitialSyncFlag();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to reset initial sync flag:', error);
      throw error;
    }
  }

  async deleteCloudKitZone(): Promise<{ success: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('Delete CloudKit zone is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.deleteCloudKitZone();
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to delete zone:', error);
      throw error;
    }
  }

  subscribeToSyncProgress(
    _callback: (progress: {
      currentItem: number;
      totalItems: number;
      itemType: 'notification' | 'bucket';
      phase: 'syncing' | 'completed';
    }) => void
  ): void {
    // CKSyncEngine handles progress internally - no-op
  }

  unsubscribeFromSyncProgress(): void {
    // CKSyncEngine handles progress internally - no-op
  }

  async resetCloudKitZone(): Promise<{ success: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('resetCloudKitZone is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.resetCloudKitZone();
      console.log('[CloudKit] Zone reset completed successfully');
      return result;
    } catch (error) {
      console.error('[CloudKit] Failed to reset zone:', error);
      throw error;
    }
  }

  async sendWatchTokenSettings(token: string, serverAddress: string): Promise<{ success: boolean }> {
    if (!isIOS || !CKSyncBridge) {
      throw new Error('sendWatchTokenSettings is only available on iOS');
    }

    try {
      const result = await CKSyncBridge.sendWatchTokenSettings(token, serverAddress);
      return result;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to send token settings to Watch:', error);
      throw error;
    }
  }

}

export default new IosBridgeService();