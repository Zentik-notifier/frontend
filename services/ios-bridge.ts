import { NativeModules, Platform, NativeEventEmitter, EmitterSubscription } from 'react-native';

const { WidgetReloadBridge, WatchConnectivityBridge } = NativeModules;

// Debug: log available bridges
console.log('[IosBridge] Available bridges:', {
  WidgetReloadBridge: !!WidgetReloadBridge,
  WatchConnectivityBridge: !!WatchConnectivityBridge,
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
