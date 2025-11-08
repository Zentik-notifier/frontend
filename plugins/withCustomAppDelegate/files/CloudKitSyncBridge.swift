import Foundation
import React
import CloudKit

@objc(CloudKitSyncBridge)
class CloudKitSyncBridge: NSObject {
  
  private let logger = LoggingSystem.shared
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  /**
   * Sync all data (buckets and notifications) to CloudKit
   */
  @objc
  func syncAllToCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested full sync to CloudKit",
      metadata: ["syncType": "all"],
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.syncAllToCloudKit { (success, bucketsCount, notificationsCount) in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Full sync completed",
          metadata: [
            "success": "true",
            "bucketsCount": String(bucketsCount),
            "notificationsCount": String(notificationsCount)
          ],
          source: "CloudKitBridge"
        )
        resolve([
          "success": true,
          "bucketsCount": bucketsCount,
          "notificationsCount": notificationsCount
        ])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Full sync failed",
          source: "CloudKitBridge"
        )
        reject("SYNC_ERROR", "Failed to sync to CloudKit", nil)
      }
    }
  }
  
  /**
   * Sync only buckets to CloudKit
   */
  @objc
  func syncBucketsToCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested bucket sync to CloudKit",
      metadata: ["syncType": "buckets"],
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.syncBucketsToCloudKit { (success, count) in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Bucket sync completed",
          metadata: ["success": "true", "count": String(count)],
          source: "CloudKitBridge"
        )
        resolve([
          "success": true,
          "count": count
        ])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Bucket sync failed",
          source: "CloudKitBridge"
        )
        reject("SYNC_ERROR", "Failed to sync buckets to CloudKit", nil)
      }
    }
  }
  
  /**
   * Sync only notifications to CloudKit
   */
  @objc
  func syncNotificationsToCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested notification sync to CloudKit",
      metadata: ["syncType": "notifications"],
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.syncNotificationsToCloudKit { (success, count) in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Notification sync completed",
          metadata: ["success": "true", "count": String(count)],
          source: "CloudKitBridge"
        )
        resolve([
          "success": true,
          "count": count
        ])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Notification sync failed",
          source: "CloudKitBridge"
        )
        reject("SYNC_ERROR", "Failed to sync notifications to CloudKit", nil)
      }
    }
  }
  
  /**
   * Setup CloudKit subscriptions for real-time updates
   */
  @objc
  func setupSubscriptions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested CloudKit subscriptions setup",
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.setupSubscriptions { (success) in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Subscriptions setup completed",
          metadata: ["success": "true"],
          source: "CloudKitBridge"
        )
        resolve(["success": true])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Subscriptions setup failed",
          source: "CloudKitBridge"
        )
        reject("SUBSCRIPTION_ERROR", "Failed to setup CloudKit subscriptions", nil)
      }
    }
  }
  
  /**
   * Delete a notification from CloudKit immediately
   */
  @objc
  func deleteNotificationFromCloudKit(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested delete notification from CloudKit",
      metadata: ["notificationId": notificationId, "action": "delete"],
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.deleteNotificationFromCloudKit(id: notificationId) { success in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Notification deleted from CloudKit",
          metadata: ["success": "true", "notificationId": notificationId],
          source: "CloudKitBridge"
        )
        resolve(["success": true])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to delete notification from CloudKit",
          metadata: ["notificationId": notificationId],
          source: "CloudKitBridge"
        )
        reject("DELETE_ERROR", "Failed to delete notification from CloudKit", nil)
      }
    }
  }
  
  /**
   * Delete a bucket from CloudKit immediately
   */
  @objc
  func deleteBucketFromCloudKit(_ bucketId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("☁️ [CloudKitBridge] React Native requested to delete bucket \(bucketId) from CloudKit")
    
    CloudKitSyncManager.shared.deleteBucketFromCloudKit(id: bucketId) { success in
      if success {
        resolve(["success": true])
      } else {
        reject("DELETE_ERROR", "Failed to delete bucket from CloudKit", nil)
      }
    }
  }
}

