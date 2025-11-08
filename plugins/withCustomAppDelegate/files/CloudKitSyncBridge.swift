import Foundation
import React
import CloudKit

@objc(CloudKitSyncBridge)
class CloudKitSyncBridge: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  /**
   * Sync all data (buckets and notifications) to CloudKit
   */
  @objc
  func syncAllToCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("☁️ [CloudKitBridge] React Native requested full sync to CloudKit")
    
    CloudKitSyncManager.shared.syncAllToCloudKit { (success, bucketsCount, notificationsCount) in
      if success {
        resolve([
          "success": true,
          "bucketsCount": bucketsCount,
          "notificationsCount": notificationsCount
        ])
      } else {
        reject("SYNC_ERROR", "Failed to sync to CloudKit", nil)
      }
    }
  }
  
  /**
   * Sync only buckets to CloudKit
   */
  @objc
  func syncBucketsToCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("☁️ [CloudKitBridge] React Native requested bucket sync to CloudKit")
    
    CloudKitSyncManager.shared.syncBucketsToCloudKit { (success, count) in
      if success {
        resolve([
          "success": true,
          "count": count
        ])
      } else {
        reject("SYNC_ERROR", "Failed to sync buckets to CloudKit", nil)
      }
    }
  }
  
  /**
   * Sync only notifications to CloudKit
   */
  @objc
  func syncNotificationsToCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("☁️ [CloudKitBridge] React Native requested notification sync to CloudKit")
    
    CloudKitSyncManager.shared.syncNotificationsToCloudKit { (success, count) in
      if success {
        resolve([
          "success": true,
          "count": count
        ])
      } else {
        reject("SYNC_ERROR", "Failed to sync notifications to CloudKit", nil)
      }
    }
  }
  
  /**
   * Setup CloudKit subscriptions for real-time updates
   */
  @objc
  func setupSubscriptions(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("☁️ [CloudKitBridge] React Native requested to setup CloudKit subscriptions")
    
    CloudKitSyncManager.shared.setupSubscriptions { (success) in
      if success {
        resolve(["success": true])
      } else {
        reject("SUBSCRIPTION_ERROR", "Failed to setup CloudKit subscriptions", nil)
      }
    }
  }
  
  /**
   * Delete a notification from CloudKit immediately
   */
  @objc
  func deleteNotificationFromCloudKit(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("☁️ [CloudKitBridge] React Native requested to delete notification \(notificationId) from CloudKit")
    
    CloudKitSyncManager.shared.deleteNotificationFromCloudKit(id: notificationId) { success in
      if success {
        resolve(["success": true])
      } else {
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

