import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

const { WatchConnectivityBridge, WidgetReloadBridge, CloudKitSyncBridge } = NativeModules;

// Debug: log available bridges
console.log('[IosBridge] Available bridges:', {
  WatchConnectivityBridge: !!WatchConnectivityBridge,
  WidgetReloadBridge: !!WidgetReloadBridge,
  CloudKitSyncBridge: !!CloudKitSyncBridge,
});

export type IosBridgeEventHandlers = {
  onNotificationRead?: (data: { notificationId: string; readAt: string }) => void;
  onNotificationUnread?: (data: { notificationId: string }) => void;
  onNotificationDeleted?: (data: { notificationId: string }) => void;
};

const isIOS = Platform.OS === 'ios';

const watchEventEmitter = isIOS && WatchConnectivityBridge
  ? new NativeEventEmitter(WatchConnectivityBridge)
  : null;

class IosBridgeService {
  private eventHandlers: IosBridgeEventHandlers = {};

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
      const result = await CloudKitSyncBridge.syncBucketsToCloudKit();
      console.log('[CloudKitSync] Buckets sync completed:', result);
      return result;
    } catch (error) {
      console.error('[CloudKitSync] Failed to sync buckets:', error);
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

  // ========== Event Listeners ==========

  initializeEventListeners(handlers: IosBridgeEventHandlers) {
    if (!isIOS || !watchEventEmitter) return;
    this.eventHandlers = handlers;
    watchEventEmitter.addListener('onWatchNotificationRead', (data) => {
      this.eventHandlers.onNotificationRead?.(data);
    });
    watchEventEmitter.addListener('onWatchNotificationUnread', (data) => {
      this.eventHandlers.onNotificationUnread?.(data);
    });
    watchEventEmitter.addListener('onWatchNotificationDeleted', (data) => {
      this.eventHandlers.onNotificationDeleted?.(data);
    });
  }

  removeEventListeners() {
    if (!isIOS || !watchEventEmitter) return;
    watchEventEmitter.removeAllListeners('onWatchNotificationRead');
    watchEventEmitter.removeAllListeners('onWatchNotificationUnread');
    watchEventEmitter.removeAllListeners('onWatchNotificationDeleted');
  }

  // ========== Unified Sync Methods ==========

  /**
   * Unico metodo per sincronizzare tutto: CloudKit + Watch + Widget
   * Questo è il metodo principale da chiamare dopo qualsiasi modifica ai dati
   * 
   * @param type - Tipo di azione: 'read' | 'unread' | 'delete' | 'add' | 'reload'
   * @param payload - Dati specifici per l'azione
   * @param syncCloudKit - Se true (default), sincronizza anche con CloudKit prima di notificare
   */
  async syncAll(
    type: 'read' | 'unread' | 'delete' | 'add' | 'reload',
    payload: any = {},
    syncCloudKit: boolean = true
  ): Promise<boolean> {
    if (!isIOS) return false;

    try {
      // 1. Sync to CloudKit FIRST (se richiesto)
      if (syncCloudKit) {
        console.log('[IosBridge] 🔄 Syncing to CloudKit...');
        await this.syncNotificationsToCloudKit();
        console.log('[IosBridge] ✅ CloudKit sync completed');
      }

      // 2. Notify Watch
      if (WatchConnectivityBridge) {
        console.log(`[IosBridge] 📱 Notifying Watch of '${type}' action...`);
        switch (type) {
          case 'read':
            if (payload.notificationIds && Array.isArray(payload.notificationIds)) {
              // Batch read
              await WatchConnectivityBridge.notifyWatchNotificationsRead(payload.notificationIds, payload.readAt);
            } else {
              // Single read
              await WatchConnectivityBridge.notifyWatchNotificationRead(payload.notificationId, payload.readAt);
            }
            break;
          case 'unread':
            await WatchConnectivityBridge.notifyWatchNotificationUnread(payload.notificationId);
            break;
          case 'delete':
            await WatchConnectivityBridge.notifyWatchNotificationDeleted(payload.notificationId);
            break;
          case 'add':
            if (payload.notificationId) {
              await WatchConnectivityBridge.notifyWatchNotificationAdded(payload.notificationId);
            } else {
              await WatchConnectivityBridge.notifyWatchOfUpdate();
            }
            break;
          case 'reload':
            await WatchConnectivityBridge.notifyWatchOfUpdate();
            break;
        }
        console.log(`[IosBridge] ✅ Watch notified`);
      } else {
        console.warn('[IosBridge] ⚠️ WatchConnectivityBridge not available');
      }

      // 3. Reload Widget
      console.log('[IosBridge] 🔄 Reloading widgets...');
      if (WidgetReloadBridge) {
        try {
          WidgetReloadBridge.reloadAllWidgets();
          console.log('[IosBridge] ✅ Widget reload requested');
        } catch (error) {
          console.error('[IosBridge] ❌ Widget reload error:', error);
        }
      } else {
        console.warn('[IosBridge] ⚠️ WidgetReloadBridge not available');
      }

      return true;
    } catch (e) {
      console.error('[IosBridge] syncAll error', e);
      return false;
    }
  }

  /**
   * @deprecated Use syncAll instead
   * Metodo legacy mantenuto per compatibilità
   */
  async notifyAll(type: 'read' | 'unread' | 'delete' | 'add' | 'reload', payload: any = {}): Promise<boolean> {
    return this.syncAll(type, payload, false);
  }
}

export default new IosBridgeService();
