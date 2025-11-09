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
}

