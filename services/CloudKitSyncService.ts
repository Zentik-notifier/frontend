import { NativeModules, Platform } from 'react-native';

interface CloudKitSyncBridgeInterface {
  syncAllToCloudKit: () => Promise<{
    success: boolean;
    bucketsCount: number;
    notificationsCount: number;
  }>;
  syncBucketsToCloudKit: () => Promise<{
    success: boolean;
    count: number;
  }>;
  syncNotificationsToCloudKit: () => Promise<{
    success: boolean;
    count: number;
  }>;
  setupSubscriptions: () => Promise<{ success: boolean }>;
  deleteNotificationFromCloudKit: (notificationId: string) => Promise<{ success: boolean }>;
  deleteBucketFromCloudKit: (bucketId: string) => Promise<{ success: boolean }>;
}

const CloudKitSyncBridge: CloudKitSyncBridgeInterface | null =
  Platform.OS === 'ios' ? NativeModules.CloudKitSyncBridge : null;

/**
 * Service to synchronize data with iCloud via CloudKit
 */
class CloudKitSyncService {
  /**
   * Sync all data (buckets and notifications) to CloudKit
   */
  static async syncAllToCloudKit(): Promise<{
    success: boolean;
    bucketsCount: number;
    notificationsCount: number;
  }> {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
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
  static async syncBucketsToCloudKit(): Promise<{
    success: boolean;
    count: number;
  }> {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
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
  static async syncNotificationsToCloudKit(): Promise<{
    success: boolean;
    count: number;
  }> {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
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
  static async setupSubscriptions(): Promise<boolean> {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
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
  static async deleteNotificationFromCloudKit(notificationId: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
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
  static async deleteBucketFromCloudKit(bucketId: string): Promise<boolean> {
    if (Platform.OS !== 'ios' || !CloudKitSyncBridge) {
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
}

export default CloudKitSyncService;

