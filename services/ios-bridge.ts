import { NativeModules, Platform, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { WidgetReloadBridge, CloudKitSyncBridge, WatchConnectivityBridge } = NativeModules;

// Debug: log available bridges
console.log('[IosBridge] Available bridges:', {
  WidgetReloadBridge: !!WidgetReloadBridge,
  CloudKitSyncBridge: !!CloudKitSyncBridge,
  WatchConnectivityBridge: !!WatchConnectivityBridge,
});

const isIOS = Platform.OS === 'ios';

// Event emitter for CloudKit events
const cloudKitEventEmitter = isIOS && CloudKitSyncBridge 
  ? new NativeEventEmitter(CloudKitSyncBridge)
  : null;

// Event emitter for WatchConnectivity events
const watchEventEmitter = isIOS && WatchConnectivityBridge
  ? new NativeEventEmitter(WatchConnectivityBridge)
  : null;

// Event types
export type CloudKitNotificationReadEvent = {
  notificationId: string;
  timestamp: number;
};

export type CloudKitNotificationUnreadEvent = {
  notificationId: string;
  timestamp: number;
};

export type CloudKitNotificationDeletedEvent = {
  notificationId: string;
  timestamp: number;
};

export type CloudKitBucketChangedEvent = {
  bucketId: string;
  changeType: 'created' | 'updated' | 'deleted';
  timestamp: number;
};

// WatchConnectivity event types
export type WatchRefreshEvent = {
  timestamp: number;
};

export type WatchNotificationReadEvent = {
  notificationId: string;
  readAt: string;
};

export type WatchNotificationUnreadEvent = {
  notificationId: string;
};

export type WatchNotificationDeletedEvent = {
  notificationId: string;
};

class IosBridgeService {
  private cloudKitListeners: EmitterSubscription[] = [];
  private watchListeners: EmitterSubscription[] = [];

  // ========== CloudKit Event Listeners ==========

  /**
   * Listen to CloudKit notification read events (from Watch or other devices)
   */
  // onCloudKitNotificationRead(callback: (event: CloudKitNotificationReadEvent) => void): () => void {
  //   if (!cloudKitEventEmitter) {
  //     return () => {};
  //   }

  //   const subscription = cloudKitEventEmitter.addListener('onCloudKitNotificationRead', callback);
  //   this.cloudKitListeners.push(subscription);
    
  //   console.log('[CloudKitEvents] Subscribed to notification read events');
    
  //   return () => {
  //     subscription.remove();
  //     this.cloudKitListeners = this.cloudKitListeners.filter(s => s !== subscription);
  //     console.log('[CloudKitEvents] Unsubscribed from notification read events');
  //   };
  // }

  /**
   * Listen to CloudKit notification unread events (from Watch or other devices)
   */
  // onCloudKitNotificationUnread(callback: (event: CloudKitNotificationUnreadEvent) => void): () => void {
  //   if (!cloudKitEventEmitter) {
  //     return () => {};
  //   }

  //   const subscription = cloudKitEventEmitter.addListener('onCloudKitNotificationUnread', callback);
  //   this.cloudKitListeners.push(subscription);
    
  //   console.log('[CloudKitEvents] Subscribed to notification unread events');
    
  //   return () => {
  //     subscription.remove();
  //     this.cloudKitListeners = this.cloudKitListeners.filter(s => s !== subscription);
  //     console.log('[CloudKitEvents] Unsubscribed from notification unread events');
  //   };
  // }

  /**
   * Listen to CloudKit notification deleted events (from Watch or other devices)
   */
  // onCloudKitNotificationDeleted(callback: (event: CloudKitNotificationDeletedEvent) => void): () => void {
  //   if (!cloudKitEventEmitter) {
  //     return () => {};
  //   }

  //   const subscription = cloudKitEventEmitter.addListener('onCloudKitNotificationDeleted', callback);
  //   this.cloudKitListeners.push(subscription);
    
  //   console.log('[CloudKitEvents] Subscribed to notification deleted events');
    
  //   return () => {
  //     subscription.remove();
  //     this.cloudKitListeners = this.cloudKitListeners.filter(s => s !== subscription);
  //     console.log('[CloudKitEvents] Unsubscribed from notification deleted events');
  //   };
  // }

  /**
   * Listen to CloudKit bucket changed events (from Watch or other devices)
   */
  // onCloudKitBucketChanged(callback: (event: CloudKitBucketChangedEvent) => void): () => void {
  //   if (!cloudKitEventEmitter) {
  //     return () => {};
  //   }

  //   const subscription = cloudKitEventEmitter.addListener('onCloudKitBucketChanged', callback);
  //   this.cloudKitListeners.push(subscription);
    
  //   console.log('[CloudKitEvents] Subscribed to bucket changed events');
    
  //   return () => {
  //     subscription.remove();
  //     this.cloudKitListeners = this.cloudKitListeners.filter(s => s !== subscription);
  //     console.log('[CloudKitEvents] Unsubscribed from bucket changed events');
  //   };
  // }

  /**
   * Remove all CloudKit event listeners
   */
  removeAllCloudKitListeners(): void {
    this.cloudKitListeners.forEach(subscription => subscription.remove());
    this.cloudKitListeners = [];
    console.log('[CloudKitEvents] All CloudKit listeners removed');
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

  // ========== CloudKit Methods ==========

  /**
   * Sync all data (buckets and notifications) to CloudKit
   */
  async syncAllToCloudKit(): Promise<{
    success: boolean;
    bucketsCount: number;
    notificationsCount: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return { success: false, bucketsCount: 0, notificationsCount: 0 };
    }

    try {
      const result = await CloudKitSyncBridge.syncAllToCloudKit();
      console.log('[CloudKitSync] Full sync completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to sync to CloudKit:', error);
      return { success: false, bucketsCount: 0, notificationsCount: 0 };
    }
  }

  /**
   * Sync only buckets to CloudKit
   */
  async syncBucketsToCloudKit(): Promise<{
    success: boolean;
    count: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return { success: false, count: 0 };
    }

    try {
      console.log('[CloudKitSync] 🚀 Starting buckets sync to CloudKit...');
      const startTime = Date.now();
      const result = await CloudKitSyncBridge.syncBucketsToCloudKit();
      const duration = Date.now() - startTime;
      console.log(`[CloudKitSync] ✅ Buckets sync completed in ${duration}ms:`, result);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] ❌ Failed to sync buckets:', error);
      return { success: false, count: 0 };
    }
  }

  /**
   * Sync only notifications to CloudKit
   */
  async syncNotificationsToCloudKit(): Promise<{
    success: boolean;
    count: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return { success: false, count: 0 };
    }

    try {
      const result = await CloudKitSyncBridge.syncNotificationsToCloudKit();
      console.log('[CloudKitSync] Notifications sync completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to sync notifications:', error);
      return { success: false, count: 0 };
    }
  }

  /**
   * Setup CloudKit subscriptions for real-time updates
   */
  async setupSubscriptions(): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return false;
    }

    try {
      const result = await CloudKitSyncBridge.setupSubscriptions();
      console.log('[CloudKitSync] Subscriptions setup completed:', result);
      return result.success;
    } catch (error) {
      console.error('[CloudKitSync] Failed to setup subscriptions:', error);
      return false;
    }
  }

  /**
   * Delete a notification from CloudKit immediately
   */
  async deleteNotificationFromCloudKit(notificationId: string): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return false;
    }

    try {
      const result = await CloudKitSyncBridge.deleteNotificationFromCloudKit(notificationId);
      console.log('[CloudKitSync] Notification deleted from CloudKit:', notificationId);
      return result.success;
    } catch (error) {
      console.error('[CloudKitSync] Failed to delete notification from CloudKit:', error);
      return false;
    }
  }

  /**
   * Mark notification as read in CloudKit (efficient, no full update needed)
   */
  async markNotificationAsReadInCloudKit(notificationId: string): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return false;
    }

    try {
      const result = await CloudKitSyncBridge.markNotificationAsReadInCloudKit(notificationId);
      return result.success;
    } catch (error) {
      console.error('[CloudKitSync] Failed to mark notification as read:', error);
      return false;
    }
  }

  /**
   * Mark notification as unread in CloudKit (efficient, no full update needed)
   */
  async markNotificationAsUnreadInCloudKit(notificationId: string): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return false;
    }

    try {
      const result = await CloudKitSyncBridge.markNotificationAsUnreadInCloudKit(notificationId);
      return result.success;
    } catch (error) {
      console.error('[CloudKitSync] Failed to mark notification as unread:', error);
      return false;
    }
  }

  /**
   * Mark multiple notifications as read in CloudKit (batch operation)
   */
  async batchMarkNotificationsAsReadInCloudKit(notificationIds: string[]): Promise<{
    success: boolean;
    updatedCount: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return { success: false, updatedCount: 0 };
    }

    try {
      const result = await CloudKitSyncBridge.batchMarkNotificationsAsReadInCloudKit(notificationIds);
      console.log(`[CloudKitSync] Batch marked ${result.updatedCount}/${notificationIds.length} notifications as read`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to batch mark notifications as read:', error);
      return { success: false, updatedCount: 0 };
    }
  }

  /**
   * Delete a bucket from CloudKit immediately
   */
  async deleteBucketFromCloudKit(bucketId: string): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      console.log('[CloudKitSync] Not available on this platform');
      return false;
    }

    try {
      const result = await CloudKitSyncBridge.deleteBucketFromCloudKit(bucketId);
      console.log('[CloudKitSync] Bucket deleted from CloudKit:', bucketId);
      return result.success;
    } catch (error) {
      console.error('[CloudKitSync] Failed to delete bucket from CloudKit:', error);
      return false;
    }
  }

  /**
   * Fetch CloudKit records count (buckets and notifications)
   */
  async fetchCloudKitRecordsCount(): Promise<{
    success: boolean;
    bucketsCount: number;
    notificationsCount: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, bucketsCount: 0, notificationsCount: 0 };
    }

    try {
      console.log('[CloudKitSync] Fetching records count...');
      const result = await CloudKitSyncBridge.fetchCloudKitRecordsCount();
      console.log(`[CloudKitSync] ✓ Count: ${result.bucketsCount} buckets, ${result.notificationsCount} notifications`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to fetch records count:', error);
      return { success: false, bucketsCount: 0, notificationsCount: 0 };
    }
  }

  /**
   * Fetch all buckets from CloudKit with full record data
   */
  async fetchAllBucketsFromCloudKit(): Promise<{
    success: boolean;
    buckets: Array<Record<string, any>>;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, buckets: [] };
    }

    try {
      // console.log('[CloudKitSync] Fetching buckets...');
      const result = await CloudKitSyncBridge.fetchAllBucketsFromCloudKit();
      // console.log(`[CloudKitSync] ✓ Fetched ${result.buckets.length} buckets`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to fetch buckets:', error);
      return { success: false, buckets: [] };
    }
  }

  /**
   * Fetch all notifications from CloudKit with full record data
   */
  async fetchAllNotificationsFromCloudKit(): Promise<{
    success: boolean;
    notifications: Array<Record<string, any>>;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, notifications: [] };
    }

    try {
      // console.log('[CloudKitSync] Fetching notifications...');
      const result = await CloudKitSyncBridge.fetchAllNotificationsFromCloudKit();
      // console.log(`[CloudKitSync] ✓ Fetched ${result.notifications.length} notifications`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to fetch notifications:', error);
      return { success: false, notifications: [] };
    }
  }

  /**
   * Fetch a single record from CloudKit by recordName
   * @param recordName - The CloudKit record name
   * @param recordType - The record type ('buckets_data' or 'notifications_data')
   */
  async fetchRecordFromCloudKit(recordName: string, recordType: 'buckets_data' | 'notifications_data'): Promise<{
    success: boolean;
    record?: Record<string, any>;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false };
    }

    try {
      console.log(`[CloudKitSync] Fetching record: ${recordName}`);
      const result = await CloudKitSyncBridge.fetchRecordFromCloudKit(recordName, recordType);
      console.log(`[CloudKitSync] ✓ Record fetched: ${recordName}`);
      return result;
    } catch (error) {
      console.error(`[CloudKitSync] Failed to fetch record ${recordName}:`, error);
      return { success: false };
    }
  }

  /**
   * Delete a record from CloudKit by recordName
   * @param recordName - The CloudKit record name to delete
   */
  async deleteRecordFromCloudKit(recordName: string): Promise<{
    success: boolean;
    recordName?: string;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false };
    }

    try {
      console.log(`[CloudKitSync] Deleting record: ${recordName}`);
      const result = await CloudKitSyncBridge.deleteRecordFromCloudKit(recordName);
      console.log(`[CloudKitSync] ✓ Record deleted: ${recordName}`);
      return result;
    } catch (error) {
      console.error(`[CloudKitSync] Failed to delete record ${recordName}:`, error);
      return { success: false };
    }
  }

  // ========== Individual CRUD Operations ==========

  /**
   * Add a single bucket to CloudKit
   */
  async addBucketToCloudKit(bucket: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    iconUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  }): Promise<{ success: boolean; bucketId?: string }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false };
    }

    try {
      console.log(`[CloudKitSync] Adding bucket to CloudKit: ${bucket.id}`);
      const result = await CloudKitSyncBridge.addBucketToCloudKit(bucket);
      console.log(`[CloudKitSync] ✓ Bucket added: ${bucket.id}`);
      return result;
    } catch (error) {
      console.error(`[CloudKitSync] Failed to add bucket:`, error);
      return { success: false };
    }
  }

  /**
   * Update a single bucket in CloudKit
   */
  async updateBucketInCloudKit(bucket: {
    id: string;
    name: string;
    description?: string;
    color?: string;
    iconUrl?: string;
    createdAt?: string;
    updatedAt?: string;
  }): Promise<{ success: boolean; bucketId?: string }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false };
    }

    try {
      console.log(`[CloudKitSync] Updating bucket in CloudKit: ${bucket.id}`);
      const result = await CloudKitSyncBridge.updateBucketInCloudKit(bucket);
      console.log(`[CloudKitSync] ✓ Bucket updated: ${bucket.id}`);
      return result;
    } catch (error) {
      console.error(`[CloudKitSync] Failed to update bucket:`, error);
      return { success: false };
    }
  }

  /**
   * Add a single notification to CloudKit
   */
  async addNotificationToCloudKit(notification: {
    id: string;
    title: string;
    subtitle?: string;
    body?: string;
    bucketId: string;
    readAt?: string;
    sentAt?: string;
    createdAt?: string;
    updatedAt?: string;
    attachments?: Array<{
      mediaType: string;
      url?: string;
      name?: string;
    }>;
    actions?: Array<{
      type: string;
      value?: string;
      title?: string;
      icon?: string;
      destructive?: boolean;
    }>;
    tapAction?: {
      type: string;
      value?: string;
      title?: string;
      icon?: string;
      destructive?: boolean;
    };
  }): Promise<{ success: boolean; notificationId?: string }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false };
    }

    try {
      console.log(`[CloudKitSync] Adding notification to CloudKit: ${notification.id}`);
      const result = await CloudKitSyncBridge.addNotificationToCloudKit(notification);
      console.log(`[CloudKitSync] ✓ Notification added: ${notification.id}`);
      return result;
    } catch (error) {
      console.error(`[CloudKitSync] Failed to add notification:`, error);
      return { success: false };
    }
  }

  /**
   * Update a single notification in CloudKit
   */
  async updateNotificationInCloudKit(notification: {
    id: string;
    title: string;
    subtitle?: string;
    body?: string;
    bucketId: string;
    readAt?: string;
    sentAt?: string;
    createdAt?: string;
    updatedAt?: string;
    attachments?: Array<{
      mediaType: string;
      url?: string;
      name?: string;
    }>;
    actions?: Array<{
      type: string;
      value?: string;
      title?: string;
      icon?: string;
      destructive?: boolean;
    }>;
    tapAction?: {
      type: string;
      value?: string;
      title?: string;
      icon?: string;
      destructive?: boolean;
    };
  }): Promise<{ success: boolean; notificationId?: string }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false };
    }

    try {
      console.log(`[CloudKitSync] Updating notification in CloudKit: ${notification.id}`);
      const result = await CloudKitSyncBridge.updateNotificationInCloudKit(notification);
      console.log(`[CloudKitSync] ✓ Notification updated: ${notification.id}`);
      return result;
    } catch (error) {
      console.error(`[CloudKitSync] Failed to update notification:`, error);
      return { success: false };
    }
  }

  // ========== Incremental Sync ==========

  /**
   * Fetch incremental changes from CloudKit (both buckets and notifications)
   * This uses change tokens to only fetch what changed since last sync
   */
  async fetchIncrementalChanges(): Promise<{
    success: boolean;
    bucketChanges: number;
    notificationChanges: number;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, bucketChanges: 0, notificationChanges: 0 };
    }

    try {
      console.log('[CloudKitSync] Fetching incremental changes...');
      const result = await CloudKitSyncBridge.fetchIncrementalChanges();
      console.log(`[CloudKitSync] ✓ Incremental changes: ${result.bucketChanges} buckets, ${result.notificationChanges} notifications`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to fetch incremental changes:', error);
      return { success: false, bucketChanges: 0, notificationChanges: 0 };
    }
  }

  /**
   * Fetch bucket changes from CloudKit since last sync
   * Returns added, modified, and deleted buckets
   */
  async fetchBucketChanges(): Promise<{
    success: boolean;
    added: Array<any>;
    modified: Array<any>;
    deleted: Array<string>;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, added: [], modified: [], deleted: [] };
    }

    try {
      console.log('[CloudKitSync] Fetching bucket changes...');
      const result = await CloudKitSyncBridge.fetchBucketChanges();
      console.log(`[CloudKitSync] ✓ Bucket changes: +${result.added.length} ~${result.modified.length} -${result.deleted.length}`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to fetch bucket changes:', error);
      return { success: false, added: [], modified: [], deleted: [] };
    }
  }

  /**
   * Fetch notification changes from CloudKit since last sync
   * Returns added, modified, and deleted notifications
   */
  async fetchNotificationChanges(): Promise<{
    success: boolean;
    added: Array<any>;
    modified: Array<any>;
    deleted: Array<string>;
  }> {
    if (!isIOS || !CloudKitSyncBridge) {
      return { success: false, added: [], modified: [], deleted: [] };
    }

    try {
      console.log('[CloudKitSync] Fetching notification changes...');
      const result = await CloudKitSyncBridge.fetchNotificationChanges();
      console.log(`[CloudKitSync] ✓ Notification changes: +${result.added.length} ~${result.modified.length} -${result.deleted.length}`);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to fetch notification changes:', error);
      return { success: false, added: [], modified: [], deleted: [] };
    }
  }

  /**
   * Clear all sync tokens to force full sync on next fetch
   * Use this when you want to reset the sync state
   */
  async clearSyncTokens(): Promise<boolean> {
    if (!isIOS || !CloudKitSyncBridge) {
      return false;
    }

    try {
      console.log('[CloudKitSync] Clearing sync tokens...');
      const result = await CloudKitSyncBridge.clearSyncTokens();
      console.log('[CloudKitSync] ✓ Sync tokens cleared');
      return result.success;
    } catch (error) {
      console.error('[CloudKitSync] Failed to clear sync tokens:', error);
      return false;
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
