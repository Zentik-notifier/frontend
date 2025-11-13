import { NativeModules, Platform, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { WidgetReloadBridge, WatchConnectivityBridge, DatabaseAccessBridge } = NativeModules;

// Debug: log available bridges
console.log('[IosBridge] Available bridges:', {
  WidgetReloadBridge: !!WidgetReloadBridge,
  WatchConnectivityBridge: !!WatchConnectivityBridge,
  DatabaseAccessBridge: !!DatabaseAccessBridge,
});

const isIOS = Platform.OS === 'ios';

// Event emitter for WatchConnectivity events
const watchEventEmitter = isIOS && WatchConnectivityBridge
  ? new NativeEventEmitter(WatchConnectivityBridge)
  : null;

// ========== WatchConnectivity Event Types ==========

export type WatchRefreshEvent = {
  timestamp: number;
};

export type WatchNotificationReadEvent = {
  notificationId: string;
  readAt: string;
};

export type WatchNotificationsReadEvent = {
  notificationIds: string[];
  readAt: string;
  count: number;
};

export type WatchNotificationUnreadEvent = {
  notificationId: string;
};

export type WatchNotificationDeletedEvent = {
  notificationId: string;
};

// ========== IosBridgeService ==========

class IosBridgeService {
  private watchListeners: EmitterSubscription[] = [];

  // ========== Watch Connectivity Availability ==========

  /**
   * Check if WatchConnectivity is available on this platform
   * Returns true only on iOS when WatchConnectivityBridge native module is available
   */
  isWatchConnectivityAvailable(): boolean {
    return isIOS && !!WatchConnectivityBridge && !!watchEventEmitter;
  }

  // ========== WatchConnectivity Event Listeners ==========

  /**
   * Listen to Watch refresh events (when Watch requests a full sync)
   */
  onWatchRefresh(callback: (event: WatchRefreshEvent) => void): () => void {
    if (!watchEventEmitter) {
      return () => {};
    }

    const subscription = watchEventEmitter.addListener('onWatchRefresh', callback);
    this.watchListeners.push(subscription);
    
    return () => {
      subscription.remove();
      this.watchListeners = this.watchListeners.filter(s => s !== subscription);
      console.log('[WatchEvents] Unsubscribed from Watch refresh events');
    };
  }

  /**
   * Listen to Watch notification read events
   */
  onWatchNotificationRead(callback: (event: WatchNotificationReadEvent) => void): () => void {
    if (!watchEventEmitter) {
      return () => {};
    }

    const subscription = watchEventEmitter.addListener('onWatchNotificationRead', callback);
    this.watchListeners.push(subscription);
    
    return () => {
      subscription.remove();
      this.watchListeners = this.watchListeners.filter(s => s !== subscription);
      console.log('[WatchEvents] Unsubscribed from Watch notification read events');
    };
  }

  /**
   * Listen to Watch notifications read events (bulk)
   */
  onWatchNotificationsRead(callback: (event: WatchNotificationsReadEvent) => void): () => void {
    if (!watchEventEmitter) {
      return () => {};
    }

    const subscription = watchEventEmitter.addListener('onWatchNotificationsRead', callback);
    this.watchListeners.push(subscription);
    
    return () => {
      subscription.remove();
      this.watchListeners = this.watchListeners.filter(s => s !== subscription);
      console.log('[WatchEvents] Unsubscribed from Watch notifications read events (bulk)');
    };
  }

  /**
   * Listen to Watch notification unread events
   */
  onWatchNotificationUnread(callback: (event: WatchNotificationUnreadEvent) => void): () => void {
    if (!watchEventEmitter) {
      return () => {};
    }

    const subscription = watchEventEmitter.addListener('onWatchNotificationUnread', callback);
    this.watchListeners.push(subscription);
    
    return () => {
      subscription.remove();
      this.watchListeners = this.watchListeners.filter(s => s !== subscription);
      console.log('[WatchEvents] Unsubscribed from Watch notification unread events');
    };
  }

  /**
   * Listen to Watch notification deleted events
   */
  onWatchNotificationDeleted(callback: (event: WatchNotificationDeletedEvent) => void): () => void {
    if (!watchEventEmitter) {
      return () => {};
    }

    const subscription = watchEventEmitter.addListener('onWatchNotificationDeleted', callback);
    this.watchListeners.push(subscription);
    
    return () => {
      subscription.remove();
      this.watchListeners = this.watchListeners.filter(s => s !== subscription);
      console.log('[WatchEvents] Unsubscribed from Watch notification deleted events');
    };
  }

  /**
   * Remove all Watch event listeners
   */
  removeAllWatchListeners(): void {
    this.watchListeners.forEach(subscription => subscription.remove());
    this.watchListeners = [];
    console.log('[WatchEvents] All Watch listeners removed');
  }

  // ========== WatchConnectivity Methods ==========

  /**
   * Send full sync data to Watch via transferFile
   * This will export all notifications and buckets from SQLite and send as JSON file
   */
  async sendFullSyncToWatch(): Promise<{
    success: boolean;
    notificationsCount: number;
    bucketsCount: number;
  }> {
    if (!isIOS || !WatchConnectivityBridge) {
      console.log('[WatchSync] Not available on this platform');
      return { success: false, notificationsCount: 0, bucketsCount: 0 };
    }

    try {
      console.log('[WatchSync] 🚀 Starting full sync to Watch via transferFile...');
      const result = await WatchConnectivityBridge.sendFullSyncToWatch();
      console.log('[WatchSync] ✅ Full sync sent:', result);
      return result;
    } catch (error) {
      console.error('[WatchSync] ❌ Failed to send full sync to Watch:', error);
      return { success: false, notificationsCount: 0, bucketsCount: 0 };
    }
  }

  /**
   * Notify Watch that a notification was marked as read
   */
  async notifyWatchNotificationRead(notificationId: string, readAt: string): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      return false;
    }

    try {
      await WatchConnectivityBridge.notifyWatchNotificationRead(notificationId, readAt);
      console.log('[WatchSync] Notified Watch: notification read', notificationId);
      return true;
    } catch (error) {
      console.error('[WatchSync] Failed to notify Watch about notification read:', error);
      return false;
    }
  }

  /**
   * Notify Watch that a notification was marked as unread
   */
  async notifyWatchNotificationUnread(notificationId: string): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      return false;
    }

    try {
      await WatchConnectivityBridge.notifyWatchNotificationUnread(notificationId);
      console.log('[WatchSync] Notified Watch: notification unread', notificationId);
      return true;
    } catch (error) {
      console.error('[WatchSync] Failed to notify Watch about notification unread:', error);
      return false;
    }
  }

  /**
   * Notify Watch that multiple notifications were marked as read or unread
   * @param notificationIds - IDs of the notifications
   * @param readAt - Timestamp if marking as read, null if marking as unread
   */
  async notifyWatchNotificationsRead(notificationIds: string[], readAt: string | null): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      return false;
    }

    try {
      await WatchConnectivityBridge.notifyWatchNotificationsRead(notificationIds, readAt);
      console.log('[WatchSync] Notified Watch: bulk notifications status change', notificationIds.length, readAt ? 'read' : 'unread');
      return true;
    } catch (error) {
      console.error('[WatchSync] Failed to notify Watch about bulk notifications status change:', error);
      return false;
    }
  }

  /**
   * Notify Watch that a notification was deleted
   */
  async notifyWatchNotificationDeleted(notificationId: string): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      return false;
    }

    try {
      await WatchConnectivityBridge.notifyWatchNotificationDeleted(notificationId);
      console.log('[WatchSync] Notified Watch: notification deleted', notificationId);
      return true;
    } catch (error) {
      console.error('[WatchSync] Failed to notify Watch about notification deleted:', error);
      return false;
    }
  }

  /**
   * Notify Watch that a new notification was added
   */
  async notifyWatchNotificationAdded(notificationId: string): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      return false;
    }

    try {
      await WatchConnectivityBridge.notifyWatchNotificationAdded(notificationId);
      console.log('[WatchSync] Notified Watch: notification added', notificationId);
      return true;
    } catch (error) {
      console.error('[WatchSync] Failed to notify Watch about notification added:', error);
      return false;
    }
  }

  /**
   * Send generic update notification to Watch
   */
  async notifyWatchOfUpdate(): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      return false;
    }

    try {
      await WatchConnectivityBridge.notifyWatchOfUpdate();
      console.log('[WatchSync] Notified Watch: generic update');
      return true;
    } catch (error) {
      console.error('[WatchSync] Failed to notify Watch about update:', error);
      return false;
    }
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
}

export default new IosBridgeService();
