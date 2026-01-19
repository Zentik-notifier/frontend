import Foundation
import React

/**
 * React Native bridge for CloudKit sync operations
 * Exposes CloudKit sync trigger to JavaScript for iOS
 */
@objc(CloudKitSyncBridge)
class CloudKitSyncBridge: RCTEventEmitter {
  
  // MARK: - React Native Module Setup
  
  // MARK: - Event Emitter Setup
  
  override func supportedEvents() -> [String]! {
    return [
      "cloudKitNotificationUpdated",
      "cloudKitNotificationDeleted",
      "cloudKitBucketUpdated",
      "cloudKitBucketDeleted",
      "cloudKitRecordChanged", // New event for all record changes
      "cloudKitSyncProgress" // Progress updates during sync operations
    ]
  }
  
  // MARK: - Static Event Emitter
  
  private static var sharedInstance: CloudKitSyncBridge?
  
  @objc
  static func setSharedInstance(_ instance: CloudKitSyncBridge) {
    sharedInstance = instance
  }
  
  @objc
  static func notifyNotificationUpdated(_ notificationId: String) {
    DispatchQueue.main.async {
      sharedInstance?.sendEvent(withName: "cloudKitNotificationUpdated", body: ["notificationId": notificationId])
    }
  }
  
  @objc
  static func notifyNotificationDeleted(_ notificationId: String) {
    DispatchQueue.main.async {
      sharedInstance?.sendEvent(withName: "cloudKitNotificationDeleted", body: ["notificationId": notificationId])
    }
  }
  
  @objc
  static func notifyBucketUpdated(_ bucketId: String) {
    DispatchQueue.main.async {
      sharedInstance?.sendEvent(withName: "cloudKitBucketUpdated", body: ["bucketId": bucketId])
    }
  }
  
  @objc
  static func notifyBucketDeleted(_ bucketId: String) {
    DispatchQueue.main.async {
      sharedInstance?.sendEvent(withName: "cloudKitBucketDeleted", body: ["bucketId": bucketId])
    }
  }
  
  @objc
  static func notifyRecordChanged(recordType: String, recordId: String, reason: String, recordData: [String: Any]?) {
    DispatchQueue.main.async {
      var body: [String: Any] = [
        "recordType": recordType,
        "recordId": recordId,
        "reason": reason
      ]
      if let recordData = recordData {
        body["recordData"] = recordData
      }
      sharedInstance?.sendEvent(withName: "cloudKitRecordChanged", body: body)
    }
  }
  
  @objc
  static func notifySyncProgress(currentItem: Int, totalItems: Int, itemType: String, phase: String) {
    DispatchQueue.main.async {
      let body: [String: Any] = [
        "currentItem": currentItem,
        "totalItems": totalItems,
        "itemType": itemType,
        "phase": phase
      ]
      sharedInstance?.sendEvent(withName: "cloudKitSyncProgress", body: body)
    }
  }
  
  override init() {
    super.init()
    CloudKitSyncBridge.setSharedInstance(self)
  }
  
  // MARK: - Sync Operations
  
  /**
   * Trigger manual sync to CloudKit
   * This only triggers the sync - CloudKitManager will fetch from SQLite and update CloudKit
   */
  @objc
  func triggerSyncToCloud(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CloudKitManager.shared.triggerSyncToCloud { success, error, stats in
      if success {
        let result: [String: Any] = [
          "success": true,
          "notificationsSynced": stats?.notificationsSynced ?? 0,
          "bucketsSynced": stats?.bucketsSynced ?? 0,
          "notificationsUpdated": stats?.notificationsUpdated ?? 0,
          "bucketsUpdated": stats?.bucketsUpdated ?? 0
        ]
        resolve(result)
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        reject("SYNC_FAILED", errorMessage, error)
      }
    }
  }
  
  /**
   * Trigger immediate sync to CloudKit (debounce removed for faster sync)
   * Multiple calls will trigger multiple syncs, but CloudKit handles rate limiting
   */
  @objc
  func triggerSyncToCloudWithDebounce(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CloudKitManager.shared.triggerSyncToCloudWithDebounce()
    
    // Return immediately - sync is triggered in background
    resolve([
      "success": true,
      "message": "Sync triggered immediately"
    ])
  }
  
  /**
   * Update notification read status in CloudKit (single notification)
   * This is more efficient than triggering a full sync when only updating read status
   * readAtTimestamp: null/undefined means unread, non-null means read
   */
  @objc
  func updateNotificationReadStatus(
    _ notificationId: String,
    readAtTimestamp: Any?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    // Handle null/undefined from React Native (converted to NSNull)
    let readAt: Date?
    if let timestamp = readAtTimestamp as? NSNumber {
      readAt = Date(timeIntervalSince1970: timestamp.doubleValue / 1000.0)
    } else {
      readAt = nil
    }
    
    CloudKitManager.shared.updateNotificationReadStatusInCloudKit(
      notificationId: notificationId,
      readAt: readAt
    ) { success, error in
      if success {
        resolve(["success": true])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        reject("UPDATE_FAILED", errorMessage, error)
      }
    }
  }
  
  /**
   * Update multiple notifications read status in CloudKit (batch)
   * More efficient than triggering a full sync when updating multiple notifications
   * readAtTimestamp: null/undefined means unread, non-null means read
   */
  @objc
  func updateNotificationsReadStatus(
    _ notificationIds: [String],
    readAtTimestamp: Any?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !notificationIds.isEmpty else {
      resolve(["success": true, "updatedCount": 0])
      return
    }
    
    // Handle null/undefined from React Native (converted to NSNull)
    let readAt: Date?
    if let timestamp = readAtTimestamp as? NSNumber {
      readAt = Date(timeIntervalSince1970: timestamp.doubleValue / 1000.0)
    } else {
      readAt = nil
    }
    
    CloudKitManager.shared.updateNotificationsReadStatusInCloudKit(
      notificationIds: notificationIds,
      readAt: readAt
    ) { success, count, error in
      if success {
        resolve(["success": true, "updatedCount": count])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        reject("UPDATE_FAILED", errorMessage, error)
      }
    }
  }
  
  /**
   * Delete notification from CloudKit (single notification)
   * More efficient than triggering a full sync when only deleting one notification
   */
  @objc
  func deleteNotification(
    _ notificationId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CloudKitManager.shared.deleteNotificationFromCloudKit(notificationId: notificationId) { success, error in
      if success {
        resolve(["success": true])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        reject("DELETE_FAILED", errorMessage, error)
      }
    }
  }
  
  /**
   * Delete multiple notifications from CloudKit (batch)
   * More efficient than triggering a full sync when deleting multiple notifications
   */
  @objc
  func deleteNotifications(
    _ notificationIds: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CloudKitManager.shared.deleteNotificationsFromCloudKit(notificationIds: notificationIds) { success, count, error in
      if success {
        resolve(["success": true, "deletedCount": count])
      } else {
        let errorMessage = error?.localizedDescription ?? "Unknown error"
        reject("DELETE_FAILED", errorMessage, error)
      }
    }
  }
  
  /**
   * Perform incremental sync from CloudKit
   * Fetches only records that have changed since the last sync
   */
  @objc
  func syncFromCloudKitIncremental(
    _ fullSync: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CloudKitManager.shared.syncFromCloudKitIncremental(fullSync: fullSync) { count, error in
      if let error = error {
        let errorMessage = error.localizedDescription
        reject("SYNC_FAILED", errorMessage, error)
      } else {
        resolve(["success": true, "updatedCount": count])
      }
    }
  }
  
  /**
   * Trigger full sync with verification
   * Resets sync timestamp and performs complete sync, then verifies counts
   */
  @objc
  func triggerFullSyncWithVerification(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Swift.print("☁️ [CloudKitSyncBridge] Triggering full sync with verification...")
    
    // Reset last sync timestamp to force full sync
    UserDefaults.standard.removeObject(forKey: "cloudkit_last_sync_timestamp")
    
    // Get count from SQLite first (total count, not just unread)
    DatabaseAccess.getTotalNotificationCount(source: "CloudKitSyncBridge") { sqliteNotificationCount in
      DatabaseAccess.getAllBuckets(source: "CloudKitSyncBridge") { buckets in
        let sqliteBucketCount = buckets.count
        
        Swift.print("☁️ [CloudKitSyncBridge] SQLite counts - Notifications: \(sqliteNotificationCount), Buckets: \(sqliteBucketCount)")
        
        // Perform full sync (will sync all records since epoch)
        CloudKitManager.shared.triggerSyncToCloud { success, error, stats in
          if success {
            Swift.print("☁️ [CloudKitSyncBridge] ✅ Full sync completed - Notifications: \(stats?.notificationsSynced ?? 0) synced, \(stats?.notificationsUpdated ?? 0) updated, Buckets: \(stats?.bucketsSynced ?? 0) synced, \(stats?.bucketsUpdated ?? 0) updated")
            
            // Wait a bit for CloudKit to process (increased delay due to rate limiting)
            Swift.print("☁️ [CloudKitSyncBridge] Waiting 5 seconds before verification to allow CloudKit to process")
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
              let group = DispatchGroup()
              var cloudKitNotificationCount = 0
              var cloudKitBucketCount = 0
              var fetchError: Error?
              
              // Fetch notifications from CloudKit
              group.enter()
              CloudKitManager.shared.fetchAllNotificationsFromCloudKit { notifications, error in
                if let error = error {
                  fetchError = error
                } else {
                  cloudKitNotificationCount = notifications.count
                }
                group.leave()
              }
              
              // Fetch buckets from CloudKit
              group.enter()
              CloudKitManager.shared.fetchAllBucketsFromCloudKit { buckets, error in
                if let error = error {
                  fetchError = error
                } else {
                  cloudKitBucketCount = buckets.count
                }
                group.leave()
              }
              
              group.notify(queue: .main) {
                let notificationsMatch = cloudKitNotificationCount == sqliteNotificationCount
                let bucketsMatch = cloudKitBucketCount == sqliteBucketCount
                
                let result: [String: Any] = [
                  "success": true,
                  "sqliteNotifications": sqliteNotificationCount,
                  "cloudKitNotifications": cloudKitNotificationCount,
                  "notificationsMatch": notificationsMatch,
                  "sqliteBuckets": sqliteBucketCount,
                  "cloudKitBuckets": cloudKitBucketCount,
                  "bucketsMatch": bucketsMatch,
                  "notificationsSynced": stats?.notificationsSynced ?? 0,
                  "notificationsUpdated": stats?.notificationsUpdated ?? 0,
                  "bucketsSynced": stats?.bucketsSynced ?? 0,
                  "bucketsUpdated": stats?.bucketsUpdated ?? 0
                ]
                
                Swift.print("☁️ [CloudKitSyncBridge] ✅ Verification completed: \(result)")
                resolve(result)
              }
            }
          } else {
            let errorMessage = error?.localizedDescription ?? "Unknown error"
            Swift.print("☁️ [CloudKitSyncBridge] ❌ Full sync failed: \(errorMessage)")
            reject("SYNC_FAILED", errorMessage, error)
          }
        }
      }
    }
  }
  
  /**
   * Fetch and delete Watch logs from CloudKit
   * Returns array of log entries that were fetched and deleted
   */
  @objc
  func fetchAndDeleteWatchLogs(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    CloudKitManager.shared.fetchAndDeleteWatchLogs { logs, error in
      if let error = error {
        let errorMessage = error.localizedDescription
        reject("FETCH_LOGS_FAILED", errorMessage, error)
      } else {
        resolve(["logs": logs, "count": logs.count])
      }
    }
  }
  
  /**
   * Subscribe to CloudKit sync progress events
   * Note: Progress events are automatically emitted via notifySyncProgress
   * This method is kept for API consistency but doesn't require explicit subscription
   */
  @objc
  func subscribeToSyncProgress(_ callback: @escaping RCTResponseSenderBlock) {
    // Progress events are automatically emitted via notifySyncProgress
    // No explicit subscription needed, but we keep this method for API consistency
    callback([NSNull()])
  }
  
  /**
   * Unsubscribe from CloudKit sync progress events
   * Note: Progress events are automatically emitted via notifySyncProgress
   * This method is kept for API consistency but doesn't require explicit unsubscription
   */
  @objc
  func unsubscribeFromSyncProgress() {
    // Progress events are automatically emitted via notifySyncProgress
    // No explicit unsubscription needed, but we keep this method for API consistency
  }
  
  /**
   * Delete CloudKit zone and all its data
   * WARNING: This will permanently delete all records in the zone
   */
  @objc
  func deleteCloudKitZone(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    CloudKitManager.shared.deleteCloudKitZone { success, error in
      if let error = error {
        let errorMessage = error.localizedDescription
        reject("DELETE_ZONE_FAILED", errorMessage, error)
      } else {
        resolve(["success": success])
      }
    }
    #else
    reject("NOT_SUPPORTED", "deleteCloudKitZone is only available on iOS", nil)
    #endif
  }
  
  /**
   * Reset CloudKit zone: delete everything and re-initialize
   * This will delete all data and recreate the zone with fresh schema
   */
  @objc
  func resetCloudKitZone(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    CloudKitManager.shared.resetCloudKitZone { success, error in
      if let error = error {
        let errorMessage = error.localizedDescription
        reject("RESET_ZONE_FAILED", errorMessage, error)
      } else {
        resolve(["success": success])
      }
    }
    #else
    reject("NOT_SUPPORTED", "resetCloudKitZone is only available on iOS", nil)
    #endif
  }

}
