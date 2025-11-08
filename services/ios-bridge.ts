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

    const logMetadata = {
      type,
      syncCloudKit: String(syncCloudKit),
      hasPayload: String(!!payload),
      payloadKeys: payload ? Object.keys(payload).join(',') : 'none'
    };

    console.log('[IosBridge] 🚀 Starting sync flow:', JSON.stringify(logMetadata));

    try {
      // 1. Sync to CloudKit FIRST (se richiesto)
      if (syncCloudKit) {
        console.log('[IosBridge] ⬇️ Step 1/3: CloudKit sync starting...');
        const startTime = Date.now();
        
        // Sync both buckets and notifications to CloudKit
        console.log('[IosBridge] 📦 Syncing buckets to CloudKit...');
        const bucketsPromise = this.syncBucketsToCloudKit();
        
        console.log('[IosBridge] 📬 Syncing notifications to CloudKit...');
        const notificationsPromise = this.syncNotificationsToCloudKit();
        
        const [bucketsResult, notificationsResult] = await Promise.all([
          bucketsPromise,
          notificationsPromise
        ]);
        
        const duration = Date.now() - startTime;
        console.log(`[IosBridge] ✅ Step 1/3: CloudKit sync completed (${duration}ms)`);
        console.log(`[IosBridge]   - Buckets: ${bucketsResult.success ? 'SUCCESS' : 'FAILED'} (${bucketsResult.count} items)`);
        console.log(`[IosBridge]   - Notifications: ${notificationsResult.success ? 'SUCCESS' : 'FAILED'} (${notificationsResult.count} items)`);
        
        if (!bucketsResult.success) {
          console.warn('[IosBridge] ⚠️ Bucket sync failed but continuing with Watch/Widget updates');
        }
        if (!notificationsResult.success) {
          console.warn('[IosBridge] ⚠️ Notification sync failed but continuing with Watch/Widget updates');
        }
      } else {
        console.log('[IosBridge] ⏭️ Step 1/3: CloudKit sync skipped');
      }

      // 2. Notify Watch
      if (WatchConnectivityBridge) {
        console.log(`[IosBridge] ⬇️ Step 2/3: Watch notification starting (${type})...`);
        const startTime = Date.now();
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
        const duration = Date.now() - startTime;
        console.log(`[IosBridge] ✅ Step 2/3: Watch notified (${duration}ms)`);
      } else {
        console.warn('[IosBridge] ⚠️ Step 2/3: WatchConnectivityBridge not available');
      }

      // 3. Reload Widget
      console.log('[IosBridge] ⬇️ Step 3/3: Widget reload starting...');
      const widgetStartTime = Date.now();
      if (WidgetReloadBridge) {
        try {
          WidgetReloadBridge.reloadAllWidgets();
          const duration = Date.now() - widgetStartTime;
          console.log(`[IosBridge] ✅ Step 3/3: Widget reload completed (${duration}ms)`);
        } catch (error) {
          console.error('[IosBridge] ❌ Widget reload error:', error);
        }
      } else {
        console.warn('[IosBridge] ⚠️ Step 3/3: WidgetReloadBridge not available');
      }

      // 4. Request Watch logs (for debugging)
      if (type === 'reload' && WatchConnectivityBridge) {
        console.log('[IosBridge] 🔍 Requesting Watch logs for debugging...');
        try {
          await WatchConnectivityBridge.requestWatchLogs();
          console.log('[IosBridge] ✅ Watch logs requested successfully');
        } catch (error) {
          console.error('[IosBridge] ⚠️ Failed to request Watch logs:', error);
        }
      }

      console.log('[IosBridge] 🎉 Sync flow completed successfully');
      return true;
    } catch (e) {
      console.error('[IosBridge] ❌ Sync flow failed:', e);
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

  /**
   * Request Watch logs for debugging
   */
  async requestWatchLogs(): Promise<boolean> {
    if (!isIOS || !WatchConnectivityBridge) {
      console.log('[IosBridge] WatchConnectivityBridge not available');
      return false;
    }

    try {
      await WatchConnectivityBridge.requestWatchLogs();
      console.log('[IosBridge] ✅ Watch logs request sent');
      return true;
    } catch (error) {
      console.error('[IosBridge] ❌ Failed to request Watch logs:', error);
      return false;
    }
  }
}

export default new IosBridgeService();
