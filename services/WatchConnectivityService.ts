import { NativeModules, Platform } from 'react-native';

interface WatchConnectivityBridgeInterface {
  notifyWatchOfUpdate: () => Promise<{ success: boolean }>;
}

const WatchConnectivityBridge: WatchConnectivityBridgeInterface | null =
  Platform.OS === 'ios' ? NativeModules.WatchConnectivityBridge : null;

/**
 * Service to communicate with Apple Watch via WatchConnectivity
 */
class WatchConnectivityService {
  /**
   * Notify the Apple Watch that notifications data has changed
   * Call this after:
   * - Receiving a new notification
   * - Deleting a notification
   * - Marking a notification as read
   * - Any other notification data change
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

