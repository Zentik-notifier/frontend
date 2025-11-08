import { NativeModules, Platform, NativeEventEmitter } from 'react-native';

interface WatchConnectivityBridgeInterface {
  notifyWatchOfUpdate: () => Promise<{ success: boolean }>;
  notifyWatchNotificationRead: (notificationId: string, readAt: string) => Promise<{ success: boolean }>;
  notifyWatchNotificationUnread: (notificationId: string) => Promise<{ success: boolean }>;
  notifyWatchNotificationsRead: (notificationIds: string[], readAt: string) => Promise<{ success: boolean }>;
  notifyWatchNotificationDeleted: (notificationId: string) => Promise<{ success: boolean }>;
  notifyWatchNotificationAdded: (notificationId: string) => Promise<{ success: boolean }>;
}

const WatchConnectivityBridge: WatchConnectivityBridgeInterface | null =
  Platform.OS === 'ios' ? NativeModules.WatchConnectivityBridge : null;

// Event emitter for receiving events from Watch
const watchEventEmitter = Platform.OS === 'ios' && WatchConnectivityBridge
  ? new NativeEventEmitter(NativeModules.WatchConnectivityBridge)
  : null;

// Event handlers
type WatchEventHandler = {
  onNotificationRead?: (data: { notificationId: string; readAt: string }) => void;
  onNotificationUnread?: (data: { notificationId: string }) => void;
  onNotificationDeleted?: (data: { notificationId: string }) => void;
};

let eventHandlers: WatchEventHandler = {};

/**
 * Service to communicate with Apple Watch via WatchConnectivity
 */
class WatchConnectivityService {
  /**
   * Initialize event listeners for Watch actions
   * Call this early in app lifecycle to handle Watch-initiated changes
   */
  static initializeEventListeners(handlers: WatchEventHandler) {
    if (Platform.OS !== 'ios' || !watchEventEmitter) {
      console.log('[WatchConnectivity] Event emitter not available on this platform');
      return;
    }

    eventHandlers = handlers;

    // Listen for notification read events from Watch
    watchEventEmitter.addListener('onWatchNotificationRead', (data: { notificationId: string; readAt: string }) => {
      console.log('[WatchConnectivity] 📱 Received onWatchNotificationRead event:', data);
      eventHandlers.onNotificationRead?.(data);
    });

    // Listen for notification unread events from Watch
    watchEventEmitter.addListener('onWatchNotificationUnread', (data: { notificationId: string }) => {
      console.log('[WatchConnectivity] 📱 Received onWatchNotificationUnread event:', data);
      eventHandlers.onNotificationUnread?.(data);
    });

    // Listen for notification deleted events from Watch
    watchEventEmitter.addListener('onWatchNotificationDeleted', (data: { notificationId: string }) => {
      console.log('[WatchConnectivity] 📱 Received onWatchNotificationDeleted event:', data);
      eventHandlers.onNotificationDeleted?.(data);
    });

    console.log('[WatchConnectivity] ✅ Event listeners initialized and active');
  }

  /**
   * Remove all event listeners
   */
  static removeEventListeners() {
    if (Platform.OS !== 'ios' || !watchEventEmitter) {
      return;
    }

    watchEventEmitter.removeAllListeners('onWatchNotificationRead');
    watchEventEmitter.removeAllListeners('onWatchNotificationUnread');
    watchEventEmitter.removeAllListeners('onWatchNotificationDeleted');
    
    console.log('[WatchConnectivity] Event listeners removed');
  }

  /**
   * Notify the Apple Watch that a notification was marked as read
   * Sends specific update to Watch to update local cache immediately
   */
  static async notifyWatchNotificationRead(notificationId: string, readAt: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      return false;
    }

    try {
      const result = await WatchConnectivityBridge.notifyWatchNotificationRead(notificationId, readAt);
      console.log(`[WatchConnectivity] Watch notified: notification ${notificationId} marked as read`);
      return result.success;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to notify watch of read status:', error);
      return false;
    }
  }

  /**
   * Notify the Apple Watch that a notification was marked as unread
   * Sends specific update to Watch to update local cache immediately
   */
  static async notifyWatchNotificationUnread(notificationId: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      return false;
    }

    try {
      const result = await WatchConnectivityBridge.notifyWatchNotificationUnread(notificationId);
      console.log(`[WatchConnectivity] Watch notified: notification ${notificationId} marked as unread`);
      return result.success;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to notify watch of unread status:', error);
      return false;
    }
  }

  /**
   * Notify the Apple Watch that multiple notifications were marked as read
   * Sends batch update to Watch to update local cache immediately
   */
  static async notifyWatchNotificationsRead(notificationIds: string[], readAt: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      return false;
    }

    try {
      const result = await WatchConnectivityBridge.notifyWatchNotificationsRead(notificationIds, readAt);
      console.log(`[WatchConnectivity] Watch notified: ${notificationIds.length} notifications marked as read`);
      return result.success;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to notify watch of batch read status:', error);
      return false;
    }
  }

  /**
   * Notify the Apple Watch that a notification was deleted
   * Sends specific update to Watch to remove from local cache immediately
   */
  static async notifyWatchNotificationDeleted(notificationId: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      return false;
    }

    try {
      const result = await WatchConnectivityBridge.notifyWatchNotificationDeleted(notificationId);
      console.log(`[WatchConnectivity] Watch notified: notification ${notificationId} deleted`);
      return result.success;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to notify watch of deletion:', error);
      return false;
    }
  }

  /**
   * Notify the Apple Watch that a new notification was added
   * Sends specific update to Watch to fetch from CloudKit
   */
  static async notifyWatchNotificationAdded(notificationId: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      return false;
    }

    try {
      const result = await WatchConnectivityBridge.notifyWatchNotificationAdded(notificationId);
      console.log(`[WatchConnectivity] Watch notified: notification ${notificationId} added`);
      return result.success;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to notify watch of new notification:', error);
      return false;
    }
  }

  /**
   * Notify the Apple Watch that notifications data has changed (generic reload)
   * Call this for major changes like:
   * - Receiving a new notification
   * - Deleting a notification
   * - Full sync from server
   */
  static async notifyWatchOfUpdate(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !WatchConnectivityBridge) {
      console.log('[WatchConnectivity] Not available on this platform');
      return false;
    }

    try {
      const result = await WatchConnectivityBridge.notifyWatchOfUpdate();
      console.log('[WatchConnectivity] Watch notified successfully:', result);
      return true;
    } catch (error) {
      console.error('[WatchConnectivity] Failed to notify watch:', error);
      return false;
    }
  }
}

export default WatchConnectivityService;