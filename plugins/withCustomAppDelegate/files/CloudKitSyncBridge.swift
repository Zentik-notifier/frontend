import Foundation
import React
import CloudKit

// MARK: - Date Extension for ISO8601 String Conversion
extension Date {
    func toISO8601String() -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: self)
    }
}

@objc(CloudKitSyncBridge)
class CloudKitSyncBridge: RCTEventEmitter {
  
  private let logger = LoggingSystem.shared
  
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  // MARK: - Event Emitter Support
  
  override func supportedEvents() -> [String]! {
    return [
      "onCloudKitNotificationRead",
      "onCloudKitNotificationUnread",
      "onCloudKitNotificationDeleted",
      "onCloudKitBucketChanged"
    ]
  }
  
  /// Emit event when a notification is marked as read (from Watch or other device)
  func notifyNotificationRead(notificationId: String) {
    sendEvent(withName: "onCloudKitNotificationRead", body: [
      "notificationId": notificationId,
      "timestamp": Date().timeIntervalSince1970
    ])
    logger.info(
      tag: "CloudKitEvent",
      message: "Notification read event emitted",
      metadata: ["notificationId": notificationId],
      source: "CloudKitBridge"
    )
  }
  
  /// Emit event when a notification is marked as unread (from Watch or other device)
  func notifyNotificationUnread(notificationId: String) {
    sendEvent(withName: "onCloudKitNotificationUnread", body: [
      "notificationId": notificationId,
      "timestamp": Date().timeIntervalSince1970
    ])
    logger.info(
      tag: "CloudKitEvent",
      message: "Notification unread event emitted",
      metadata: ["notificationId": notificationId],
      source: "CloudKitBridge"
    )
  }
  
  /// Emit event when a notification is deleted (from Watch or other device)
  func notifyNotificationDeleted(notificationId: String) {
    sendEvent(withName: "onCloudKitNotificationDeleted", body: [
      "notificationId": notificationId,
      "timestamp": Date().timeIntervalSince1970
    ])
    logger.info(
      tag: "CloudKitEvent",
      message: "Notification deleted event emitted",
      metadata: ["notificationId": notificationId],
      source: "CloudKitBridge"
    )
  }
  
  /// Emit event when a bucket changes (from Watch or other device)
  func notifyBucketChanged(bucketId: String, changeType: String) {
    sendEvent(withName: "onCloudKitBucketChanged", body: [
      "bucketId": bucketId,
      "changeType": changeType, // "created", "updated", "deleted"
      "timestamp": Date().timeIntervalSince1970
    ])
    logger.info(
      tag: "CloudKitEvent",
      message: "Bucket changed event emitted",
      metadata: ["bucketId": bucketId, "changeType": changeType],
      source: "CloudKitBridge"
    )
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
        
        // Notify Watch via WatchConnectivity
        WatchConnectivityManager.shared.notifyWatchNotificationDeleted(notificationId: notificationId)
        
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
   * Mark notification as read in CloudKit (efficient method)
   */
  @objc
  func markNotificationAsReadInCloudKit(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    CloudKitAccess.markNotificationAsRead(id: notificationId) { result in
      switch result {
      case .success:
        // Notify Watch via WatchConnectivity
        WatchConnectivityManager.shared.notifyWatchNotificationRead(notificationId: notificationId, readAt: Date().toISO8601String())
        resolve(["success": true])
      case .failure(let error):
        reject("MARK_READ_ERROR", "Failed to mark notification as read: \(error.localizedDescription)", error)
      }
    }
  }
  
  /**
   * Mark notification as unread in CloudKit (efficient method)
   */
  @objc
  func markNotificationAsUnreadInCloudKit(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    CloudKitAccess.markNotificationAsUnread(id: notificationId) { result in
      switch result {
      case .success:
        // Notify Watch via WatchConnectivity
        WatchConnectivityManager.shared.notifyWatchNotificationUnread(notificationId: notificationId)
        resolve(["success": true])
      case .failure(let error):
        reject("MARK_UNREAD_ERROR", "Failed to mark notification as unread: \(error.localizedDescription)", error)
      }
    }
  }
  
  /**
   * Batch mark notifications as read in CloudKit
   */
  @objc
  func batchMarkNotificationsAsReadInCloudKit(_ notificationIds: [String], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let dispatchGroup = DispatchGroup()
    var successCount = 0
    var failureCount = 0
    
    for notificationId in notificationIds {
      dispatchGroup.enter()
      CloudKitAccess.markNotificationAsRead(id: notificationId) { result in
        switch result {
        case .success:
          successCount += 1
          // Notify Watch via WatchConnectivity
          WatchConnectivityManager.shared.notifyWatchNotificationRead(notificationId: notificationId, readAt: Date().toISO8601String())
        case .failure:
          failureCount += 1
        }
        dispatchGroup.leave()
      }
    }
    
    dispatchGroup.notify(queue: .main) {
      resolve([
        "success": failureCount == 0,
        "updatedCount": successCount
      ])
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
  
  /**
   * Fetch CloudKit records count (buckets and notifications)
   * Counts individual records instead of reading recordCount field
   */
  @objc
  func fetchCloudKitRecordsCount(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "Fetching CloudKit records count",
      source: "CloudKitBridge"
    )
    
    // Check iCloud account status first
    CKContainer(identifier: KeychainAccess.getCloudKitContainerIdentifier()).accountStatus { accountStatus, error in
      if let error = error {
        reject("ACCOUNT_ERROR", "iCloud account error: \(error.localizedDescription)", error)
        return
      }
      
      guard accountStatus == .available else {
        let statusMessage = self.getAccountStatusMessage(accountStatus)
        reject("ACCOUNT_UNAVAILABLE", "iCloud account not available: \(statusMessage)", nil)
        return
      }
      
      let group = DispatchGroup()
      var bucketsCount = 0
      var notificationsCount = 0
      var fetchError: Error?
      
      // Fetch buckets count using CloudKitAccess
      group.enter()
      CloudKitAccess.fetchAllBuckets { result in
        switch result {
        case .success(let buckets):
          bucketsCount = buckets.count
        case .failure(let error):
          fetchError = error
        }
        group.leave()
      }
      
      // Fetch notifications count using CloudKitAccess
      group.enter()
      CloudKitAccess.fetchAllNotifications { result in
        switch result {
        case .success(let notifications):
          notificationsCount = notifications.count
        case .failure(let error):
          if fetchError == nil {
            fetchError = error
          }
        }
        group.leave()
      }
      
      group.notify(queue: .main) {
        if let error = fetchError {
          self.logger.error(
            tag: "CloudKitFetch",
            message: "Failed to fetch CloudKit records count",
            metadata: ["error": error.localizedDescription],
            source: "CloudKitBridge"
          )
          reject("FETCH_ERROR", "Failed to fetch CloudKit records: \(error.localizedDescription)", error)
        } else {
          self.logger.info(
            tag: "CloudKitFetch",
            message: "CloudKit records count fetched",
            metadata: [
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
        }
      }
    }
  }
  
  /**
   * Helper to get human-readable account status message
   */
  private func getAccountStatusMessage(_ status: CKAccountStatus) -> String {
    switch status {
    case .available:
      return "available"
    case .noAccount:
      return "no iCloud account"
    case .restricted:
      return "restricted (parental controls)"
    case .couldNotDetermine:
      return "could not determine"
    case .temporarilyUnavailable:
      return "temporarily unavailable"
    @unknown default:
      return "unknown status"
    }
  }
  
  /**
   * Fetch all buckets from CloudKit (reads individual records)
   */
  @objc
  func fetchAllBucketsFromCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "Fetching buckets data from CloudKit",
      source: "CloudKitBridge"
    )
    
    CloudKitAccess.fetchAllBuckets { result in
      switch result {
      case .success(let cloudKitBuckets):
        // Convert CloudKitBucket to dictionary for React Native
        let buckets = cloudKitBuckets.map { bucket -> [String: Any] in
          var dict: [String: Any] = [
            "id": bucket.id,
            "name": bucket.name,
            "createdAt": bucket.createdAt,
            "updatedAt": bucket.updatedAt
          ]
          if let description = bucket.description {
            dict["description"] = description
          }
          if let color = bucket.color {
            dict["color"] = color
          }
          if let iconUrl = bucket.iconUrl {
            dict["iconUrl"] = iconUrl
          }
          return dict
        }
        
        self.logger.info(
          tag: "CloudKitFetch",
          message: "Buckets fetched successfully",
          metadata: ["count": String(buckets.count)],
          source: "CloudKitBridge"
        )
        
        resolve([
          "success": true,
          "buckets": buckets
        ])
        
      case .failure(let error):
        self.logger.error(
          tag: "CloudKitFetch",
          message: "Failed to fetch buckets",
          metadata: ["error": error.localizedDescription],
          source: "CloudKitBridge"
        )
        reject("FETCH_ERROR", "Failed to fetch buckets: \(error.localizedDescription)", error)
      }
    }
  }
  
  /**
   * Fetch all notifications from CloudKit (reads individual records)
   */
  @objc
  func fetchAllNotificationsFromCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "Fetching notifications data from CloudKit",
      source: "CloudKitBridge"
    )
    
    CloudKitAccess.fetchAllNotifications { result in
      switch result {
      case .success(let cloudKitNotifications):
        // Convert CloudKitNotification to dictionary for React Native
        let notifications = cloudKitNotifications.map { notification -> [String: Any] in
          var dict: [String: Any] = [
            "id": notification.id,
            "title": notification.title,
            "createdAt": notification.createdAt,
            "updatedAt": notification.updatedAt,
            "bucketId": notification.bucketId
          ]
          if let subtitle = notification.subtitle {
            dict["subtitle"] = subtitle
          }
          if let body = notification.body {
            dict["body"] = body
          }
          if let readAt = notification.readAt {
            dict["readAt"] = readAt
          }
          if let sentAt = notification.sentAt {
            dict["sentAt"] = sentAt
          }
          
          // Convert attachments
          dict["attachments"] = notification.attachments.map { attachment -> [String: Any] in
            var attachmentDict: [String: Any] = ["mediaType": attachment.mediaType]
            if let url = attachment.url {
              attachmentDict["url"] = url
            }
            if let name = attachment.name {
              attachmentDict["name"] = name
            }
            return attachmentDict
          }
          
          // Convert actions
          dict["actions"] = notification.actions.map { action -> [String: Any] in
            var actionDict: [String: Any] = [
              "type": action.type,
              "destructive": action.destructive
            ]
            if let value = action.value {
              actionDict["value"] = value
            }
            if let title = action.title {
              actionDict["title"] = title
            }
            if let icon = action.icon {
              actionDict["icon"] = icon
            }
            return actionDict
          }
          
          // Convert tap action
          if let tapAction = notification.tapAction {
            var tapActionDict: [String: Any] = [
              "type": tapAction.type,
              "destructive": tapAction.destructive
            ]
            if let value = tapAction.value {
              tapActionDict["value"] = value
            }
            if let title = tapAction.title {
              tapActionDict["title"] = title
            }
            if let icon = tapAction.icon {
              tapActionDict["icon"] = icon
            }
            dict["tapAction"] = tapActionDict
          }
          
          return dict
        }
        
        self.logger.info(
          tag: "CloudKitFetch",
          message: "Notifications fetched successfully",
          metadata: ["count": String(notifications.count)],
          source: "CloudKitBridge"
        )
        
        resolve([
          "success": true,
          "notifications": notifications
        ])
        
      case .failure(let error):
        self.logger.error(
          tag: "CloudKitFetch",
          message: "Failed to fetch notifications",
          metadata: ["error": error.localizedDescription],
          source: "CloudKitBridge"
        )
        reject("FETCH_ERROR", "Failed to fetch notifications: \(error.localizedDescription)", error)
      }
    }
  }
  
  /**
   * Fetch a single record from CloudKit by recordName
   */
  @objc
  func fetchRecordFromCloudKit(_ recordName: String, recordType: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested record from CloudKit",
      metadata: ["recordName": recordName, "recordType": recordType],
      source: "CloudKitBridge"
    )
    
    let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
    let container = CKContainer(identifier: containerIdentifier)
    let privateDatabase = container.privateCloudDatabase
    let recordID = CKRecord.ID(recordName: recordName)
    
    privateDatabase.fetch(withRecordID: recordID) { record, error in
      if let error = error {
        self.logger.error(
          tag: "CloudKitFetch",
          message: "Failed to fetch record",
          metadata: [
            "recordName": recordName,
            "error": error.localizedDescription
          ],
          source: "CloudKitBridge"
        )
        reject("FETCH_ERROR", "Failed to fetch record from CloudKit: \(error.localizedDescription)", nil)
        return
      }
      
      guard let record = record else {
        reject("FETCH_ERROR", "Record not found", nil)
        return
      }
      
      var recordData: [String: Any] = [
        "recordName": record.recordID.recordName,
        "recordType": record.recordType,
        "createdAt": record.creationDate?.timeIntervalSince1970 ?? 0,
        "modifiedAt": record.modificationDate?.timeIntervalSince1970 ?? 0
      ]
      
      // Extract all fields from the record
      for key in record.allKeys() {
        if let value = record[key] {
          recordData[key] = self.convertCKValueToJSON(value)
        }
      }
      
      self.logger.info(
        tag: "CloudKitFetch",
        message: "Record fetched successfully",
        metadata: ["recordName": recordName],
        source: "CloudKitBridge"
      )
      
      resolve([
        "success": true,
        "record": recordData
      ])
    }
  }
  
  /**
   * Delete a record from CloudKit by recordName
   */
  @objc
  func deleteRecordFromCloudKit(_ recordName: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested to delete record from CloudKit",
      metadata: ["recordName": recordName],
      source: "CloudKitBridge"
    )
    
    let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
    let container = CKContainer(identifier: containerIdentifier)
    let privateDatabase = container.privateCloudDatabase
    let recordID = CKRecord.ID(recordName: recordName)
    
    privateDatabase.delete(withRecordID: recordID) { recordID, error in
      if let error = error {
        self.logger.error(
          tag: "CloudKitDelete",
          message: "Failed to delete record",
          metadata: [
            "recordName": recordName,
            "error": error.localizedDescription
          ],
          source: "CloudKitBridge"
        )
        reject("DELETE_ERROR", "Failed to delete record from CloudKit: \(error.localizedDescription)", nil)
        return
      }
      
      self.logger.info(
        tag: "CloudKitDelete",
        message: "Record deleted successfully",
        metadata: ["recordName": recordName],
        source: "CloudKitBridge"
      )
      
      resolve([
        "success": true,
        "recordName": recordName
      ])
    }
  }
  
  /**
   * Helper function to convert CKRecord values to JSON-compatible types
   */
  private func convertCKValueToJSON(_ value: Any) -> Any {
    if let stringValue = value as? String {
      return stringValue
    } else if let numberValue = value as? NSNumber {
      return numberValue
    } else if let dateValue = value as? Date {
      return dateValue.timeIntervalSince1970
    } else if let arrayValue = value as? [Any] {
      return arrayValue.map { convertCKValueToJSON($0) }
    } else if let locationValue = value as? CLLocation {
      return [
        "latitude": locationValue.coordinate.latitude,
        "longitude": locationValue.coordinate.longitude
      ]
    } else if let assetValue = value as? CKAsset {
      return [
        "fileURL": assetValue.fileURL?.absoluteString ?? ""
      ]
    } else if let referenceValue = value as? CKRecord.Reference {
      return [
        "recordName": referenceValue.recordID.recordName,
        "action": referenceValue.action.rawValue
      ]
    } else {
      return String(describing: value)
    }
  }
  
  // MARK: - Individual CRUD Operations
  
  /**
   * Add a single bucket to CloudKit
   */
  @objc
  func addBucketToCloudKit(_ bucketData: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested to add bucket to CloudKit",
      metadata: ["bucketId": bucketData["id"] as? String ?? "unknown"],
      source: "CloudKitBridge"
    )
    
    guard let bucket = parseBucketFromDict(bucketData) else {
      reject("PARSE_ERROR", "Failed to parse bucket data", nil)
      return
    }
    
    CloudKitSyncManager.shared.addBucketToCloudKit(bucket) { success in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Bucket added to CloudKit",
          metadata: ["bucketId": bucket.id],
          source: "CloudKitBridge"
        )
        resolve(["success": true, "bucketId": bucket.id])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to add bucket to CloudKit",
          metadata: ["bucketId": bucket.id],
          source: "CloudKitBridge"
        )
        reject("ADD_ERROR", "Failed to add bucket to CloudKit", nil)
      }
    }
  }
  
  /**
   * Update a single bucket in CloudKit
   */
  @objc
  func updateBucketInCloudKit(_ bucketData: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested to update bucket in CloudKit",
      metadata: ["bucketId": bucketData["id"] as? String ?? "unknown"],
      source: "CloudKitBridge"
    )
    
    guard let bucket = parseBucketFromDict(bucketData) else {
      reject("PARSE_ERROR", "Failed to parse bucket data", nil)
      return
    }
    
    CloudKitSyncManager.shared.updateBucketInCloudKit(bucket) { success in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Bucket updated in CloudKit",
          metadata: ["bucketId": bucket.id],
          source: "CloudKitBridge"
        )
        resolve(["success": true, "bucketId": bucket.id])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to update bucket in CloudKit",
          metadata: ["bucketId": bucket.id],
          source: "CloudKitBridge"
        )
        reject("UPDATE_ERROR", "Failed to update bucket in CloudKit", nil)
      }
    }
  }
  
  /**
   * Add a single notification to CloudKit
   */
  @objc
  func addNotificationToCloudKit(_ notificationData: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested to add notification to CloudKit",
      metadata: ["notificationId": notificationData["id"] as? String ?? "unknown"],
      source: "CloudKitBridge"
    )
    
    guard let notification = parseNotificationFromDict(notificationData) else {
      reject("PARSE_ERROR", "Failed to parse notification data", nil)
      return
    }
    
    CloudKitSyncManager.shared.addNotificationToCloudKit(notification) { success in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Notification added to CloudKit",
          metadata: ["notificationId": notification.id],
          source: "CloudKitBridge"
        )
        resolve(["success": true, "notificationId": notification.id])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to add notification to CloudKit",
          metadata: ["notificationId": notification.id],
          source: "CloudKitBridge"
        )
        reject("ADD_ERROR", "Failed to add notification to CloudKit", nil)
      }
    }
  }
  
  /**
   * Update a single notification in CloudKit
   */
  @objc
  func updateNotificationInCloudKit(_ notificationData: [String: Any], resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested to update notification in CloudKit",
      metadata: ["notificationId": notificationData["id"] as? String ?? "unknown"],
      source: "CloudKitBridge"
    )
    
    guard let notification = parseNotificationFromDict(notificationData) else {
      reject("PARSE_ERROR", "Failed to parse notification data", nil)
      return
    }
    
    CloudKitSyncManager.shared.updateNotificationInCloudKit(notification) { success in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Notification updated in CloudKit",
          metadata: ["notificationId": notification.id],
          source: "CloudKitBridge"
        )
        
        // Notify Watch via WatchConnectivity if readAt changed
        if let readAt = notification.readAt {
          WatchConnectivityManager.shared.notifyWatchNotificationRead(
            notificationId: notification.id,
            readAt: readAt
          )
        } else {
          // Notification was marked as unread
          WatchConnectivityManager.shared.notifyWatchNotificationUnread(
            notificationId: notification.id
          )
        }
        
        resolve(["success": true, "notificationId": notification.id])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to update notification in CloudKit",
          metadata: ["notificationId": notification.id],
          source: "CloudKitBridge"
        )
        reject("UPDATE_ERROR", "Failed to update notification in CloudKit", nil)
      }
    }
  }
  
  // MARK: - Incremental Sync
  
  /**
   * Fetch incremental changes from CloudKit (both buckets and notifications)
   */
  @objc
  func fetchIncrementalChanges(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested incremental changes from CloudKit",
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.fetchIncrementalChanges { success, bucketChanges, notificationChanges in
      if success {
        self.logger.info(
          tag: "CloudKitSync",
          message: "Incremental changes fetched successfully",
          metadata: [
            "bucketChanges": String(bucketChanges),
            "notificationChanges": String(notificationChanges)
          ],
          source: "CloudKitBridge"
        )
        resolve([
          "success": true,
          "bucketChanges": bucketChanges,
          "notificationChanges": notificationChanges
        ])
      } else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to fetch incremental changes",
          source: "CloudKitBridge"
        )
        reject("FETCH_ERROR", "Failed to fetch incremental changes from CloudKit", nil)
      }
    }
  }
  
  /**
   * Fetch bucket changes from CloudKit since last sync
   */
  @objc
  func fetchBucketChanges(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested bucket changes from CloudKit",
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.fetchBucketChanges { changes in
      guard let changes = changes else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to fetch bucket changes",
          source: "CloudKitBridge"
        )
        reject("FETCH_ERROR", "Failed to fetch bucket changes from CloudKit", nil)
        return
      }
      
      // Convert changes to React Native format
      let result: [String: Any] = [
        "success": true,
        "added": changes.added.map { self.bucketToDict($0) },
        "modified": changes.modified.map { self.bucketToDict($0) },
        "deleted": changes.deleted
      ]
      
      self.logger.info(
        tag: "CloudKitSync",
        message: "Bucket changes fetched successfully",
        metadata: [
          "added": String(changes.added.count),
          "modified": String(changes.modified.count),
          "deleted": String(changes.deleted.count)
        ],
        source: "CloudKitBridge"
      )
      
      resolve(result)
    }
  }
  
  /**
   * Fetch notification changes from CloudKit since last sync
   */
  @objc
  func fetchNotificationChanges(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested notification changes from CloudKit",
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.fetchNotificationChanges { changes in
      guard let changes = changes else {
        self.logger.error(
          tag: "CloudKitSync",
          message: "Failed to fetch notification changes",
          source: "CloudKitBridge"
        )
        reject("FETCH_ERROR", "Failed to fetch notification changes from CloudKit", nil)
        return
      }
      
      // Convert changes to React Native format
      let result: [String: Any] = [
        "success": true,
        "added": changes.added.map { self.notificationToDict($0) },
        "modified": changes.modified.map { self.notificationToDict($0) },
        "deleted": changes.deleted
      ]
      
      self.logger.info(
        tag: "CloudKitSync",
        message: "Notification changes fetched successfully",
        metadata: [
          "added": String(changes.added.count),
          "modified": String(changes.modified.count),
          "deleted": String(changes.deleted.count)
        ],
        source: "CloudKitBridge"
      )
      
      resolve(result)
    }
  }
  
  /**
   * Clear all sync tokens to force full sync on next fetch
   */
  @objc
  func clearSyncTokens(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested to clear sync tokens",
      source: "CloudKitBridge"
    )
    
    CloudKitSyncManager.shared.clearSyncTokens()
    
    logger.info(
      tag: "CloudKitSync",
      message: "Sync tokens cleared successfully",
      source: "CloudKitBridge"
    )
    
    resolve(["success": true])
  }
  
  // MARK: - Helper Methods for Data Conversion
  
  /**
   * Convert CloudKitBucket to dictionary for React Native
   */
  private func bucketToDict(_ bucket: CloudKitBucket) -> [String: Any] {
    var dict: [String: Any] = [
      "id": bucket.id,
      "name": bucket.name,
      "createdAt": DateConverter.dateToString(bucket.createdAt),
      "updatedAt": DateConverter.dateToString(bucket.updatedAt)
    ]
    if let description = bucket.description {
      dict["description"] = description
    }
    if let color = bucket.color {
      dict["color"] = color
    }
    if let iconUrl = bucket.iconUrl {
      dict["iconUrl"] = iconUrl
    }
    return dict
  }
  
  /**
   * Convert CloudKitNotification to dictionary for React Native
   */
  private func notificationToDict(_ notification: CloudKitNotification) -> [String: Any] {
    var dict: [String: Any] = [
      "id": notification.id,
      "title": notification.title,
      "createdAt": DateConverter.dateToString(notification.createdAt),
      "updatedAt": DateConverter.dateToString(notification.updatedAt),
      "bucketId": notification.bucketId
    ]
    
    if let subtitle = notification.subtitle {
      dict["subtitle"] = subtitle
    }
    if let body = notification.body {
      dict["body"] = body
    }
    if let readAt = notification.readAt {
      dict["readAt"] = DateConverter.dateToString(readAt)
    }
    if let sentAt = notification.sentAt {
      dict["sentAt"] = DateConverter.dateToString(sentAt)
    }
    
    // Convert attachments
    dict["attachments"] = notification.attachments.map { attachment -> [String: Any] in
      var attachmentDict: [String: Any] = ["mediaType": attachment.mediaType]
      if let url = attachment.url {
        attachmentDict["url"] = url
      }
      if let name = attachment.name {
        attachmentDict["name"] = name
      }
      return attachmentDict
    }
    
    // Convert actions
    dict["actions"] = notification.actions.map { action -> [String: Any] in
      var actionDict: [String: Any] = [
        "type": action.type,
        "destructive": action.destructive
      ]
      if let value = action.value {
        actionDict["value"] = value
      }
      if let title = action.title {
        actionDict["title"] = title
      }
      if let icon = action.icon {
        actionDict["icon"] = icon
      }
      return actionDict
    }
    
    // Convert tap action
    if let tapAction = notification.tapAction {
      var tapActionDict: [String: Any] = [
        "type": tapAction.type,
        "destructive": tapAction.destructive
      ]
      if let value = tapAction.value {
        tapActionDict["value"] = value
      }
      if let title = tapAction.title {
        tapActionDict["title"] = title
      }
      if let icon = tapAction.icon {
        tapActionDict["icon"] = icon
      }
      dict["tapAction"] = tapActionDict
    }
    
    return dict
  }
  
  /**
   * Parse Bucket from React Native dictionary
   */
  private func parseBucketFromDict(_ dict: [String: Any]) -> Bucket? {
    guard let id = dict["id"] as? String,
          let name = dict["name"] as? String else {
      return nil
    }
    
    let description = dict["description"] as? String
    let color = dict["color"] as? String
    let iconUrl = dict["iconUrl"] as? String
    let createdAt = dict["createdAt"] as? String ?? DateConverter.dateToString(Date())
    let updatedAt = dict["updatedAt"] as? String ?? DateConverter.dateToString(Date())
    
    return Bucket(
      id: id,
      name: name,
      description: description,
      color: color,
      iconUrl: iconUrl,
      createdAt: createdAt,
      updatedAt: updatedAt
    )
  }
  
  /**
   * Parse SyncNotification from React Native dictionary
   */
  private func parseNotificationFromDict(_ dict: [String: Any]) -> SyncNotification? {
    guard let id = dict["id"] as? String,
          let title = dict["title"] as? String,
          let bucketId = dict["bucketId"] as? String else {
      return nil
    }
    
    let subtitle = dict["subtitle"] as? String
    let body = dict["body"] as? String
    let readAt = dict["readAt"] as? String
    let sentAt = dict["sentAt"] as? String
    let createdAt = dict["createdAt"] as? String ?? DateConverter.dateToString(Date())
    let updatedAt = dict["updatedAt"] as? String ?? DateConverter.dateToString(Date())
    
    // Parse attachments
    var attachments: [SyncAttachment] = []
    if let attachmentsArray = dict["attachments"] as? [[String: Any]] {
      attachments = attachmentsArray.compactMap { attachmentDict in
        guard let mediaType = attachmentDict["mediaType"] as? String else { return nil }
        let url = attachmentDict["url"] as? String
        let name = attachmentDict["name"] as? String
        return SyncAttachment(mediaType: mediaType, url: url, name: name)
      }
    }
    
    // Parse actions
    var actions: [SyncAction] = []
    if let actionsArray = dict["actions"] as? [[String: Any]] {
      actions = actionsArray.compactMap { actionDict in
        guard let type = actionDict["type"] as? String else { return nil }
        let value = actionDict["value"] as? String
        let title = actionDict["title"] as? String
        let icon = actionDict["icon"] as? String
        let destructive = actionDict["destructive"] as? Bool ?? false
        return SyncAction(type: type, value: value, title: title, icon: icon, destructive: destructive)
      }
    }
    
    // Parse tap action
    var tapAction: SyncAction? = nil
    if let tapActionDict = dict["tapAction"] as? [String: Any],
       let type = tapActionDict["type"] as? String {
      let value = tapActionDict["value"] as? String
      let title = tapActionDict["title"] as? String
      let icon = tapActionDict["icon"] as? String
      let destructive = tapActionDict["destructive"] as? Bool ?? false
      tapAction = SyncAction(type: type, value: value, title: title, icon: icon, destructive: destructive)
    }
    
    return SyncNotification(
      id: id,
      title: title,
      subtitle: subtitle,
      body: body,
      readAt: readAt,
      sentAt: sentAt,
      createdAt: createdAt,
      updatedAt: updatedAt,
      bucketId: bucketId,
      attachments: attachments,
      actions: actions,
      tapAction: tapAction
    )
  }
}

