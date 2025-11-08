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
   */
  @objc
  func fetchCloudKitRecordsCount(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested CloudKit records count",
      source: "CloudKitBridge"
    )
    
    // Check iCloud account status first
    CKContainer(identifier: KeychainAccess.getCloudKitContainerIdentifier()).accountStatus { accountStatus, error in
      if let error = error {
        self.logger.error(
          tag: "CloudKitFetch",
          message: "Failed to check iCloud account status",
          metadata: ["error": error.localizedDescription],
          source: "CloudKitBridge"
        )
        reject("ACCOUNT_ERROR", "iCloud account error: \(error.localizedDescription)", error)
        return
      }
      
      guard accountStatus == .available else {
        let statusMessage = self.getAccountStatusMessage(accountStatus)
        self.logger.error(
          tag: "CloudKitFetch",
          message: "iCloud account not available",
          metadata: ["status": statusMessage],
          source: "CloudKitBridge"
        )
        reject("ACCOUNT_UNAVAILABLE", "iCloud account not available: \(statusMessage)", nil)
        return
      }
      
      // Use centralized CloudKit setup
      let setup = KeychainAccess.getCloudKitSetup()
      let group = DispatchGroup()
      var bucketsCount = 0
      var notificationsCount = 0
      var fetchError: Error?
      
      // Fetch buckets count
      group.enter()
      setup.privateDatabase.fetch(withQuery: setup.bucketsQuery, inZoneWith: setup.customZone.zoneID, desiredKeys: nil, resultsLimit: CKQueryOperation.maximumResults) { result in
        switch result {
        case .success(let queryResult):
          bucketsCount = queryResult.matchResults.count
          self.logger.info(
            tag: "CloudKitFetch",
            message: "Buckets count fetched",
            metadata: ["count": String(bucketsCount)],
            source: "CloudKitBridge"
          )
        case .failure(let error):
          self.logger.error(
            tag: "CloudKitFetch",
            message: "Failed to fetch buckets count",
            metadata: ["error": error.localizedDescription],
            source: "CloudKitBridge"
          )
          if fetchError == nil {
            fetchError = error
          }
        }
        group.leave()
      }
      
      // Fetch notifications count
      group.enter()
      setup.privateDatabase.fetch(withQuery: setup.notificationsQuery, inZoneWith: setup.customZone.zoneID, desiredKeys: nil, resultsLimit: CKQueryOperation.maximumResults) { result in
        switch result {
        case .success(let queryResult):
          notificationsCount = queryResult.matchResults.count
          self.logger.info(
            tag: "CloudKitFetch",
            message: "Notifications count fetched",
            metadata: ["count": String(notificationsCount)],
            source: "CloudKitBridge"
          )
        case .failure(let error):
          self.logger.error(
            tag: "CloudKitFetch",
            message: "Failed to fetch notifications count",
            metadata: ["error": error.localizedDescription],
            source: "CloudKitBridge"
          )
          if fetchError == nil {
            fetchError = error
          }
        }
        group.leave()
      }
      
      group.notify(queue: .main) {
        if let error = fetchError {
          reject("FETCH_ERROR", "Failed to fetch CloudKit records: \(error.localizedDescription)", error)
        } else {
          self.logger.info(
            tag: "CloudKitFetch",
            message: "CloudKit records count completed",
            metadata: [
              "bucketsCount": String(bucketsCount),
              "notificationsCount": String(notificationsCount),
              "containerIdentifier": KeychainAccess.getCloudKitContainerIdentifier()
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
   * Fetch all buckets from CloudKit
   */
  @objc
  func fetchAllBucketsFromCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested all buckets from CloudKit",
      source: "CloudKitBridge"
    )
    
    let setup = KeychainAccess.getCloudKitSetup()
    
    setup.privateDatabase.fetch(withQuery: setup.bucketsQuery, inZoneWith: setup.customZone.zoneID, desiredKeys: nil, resultsLimit: CKQueryOperation.maximumResults) { result in
      switch result {
      case .success(let queryResult):
        var buckets: [[String: Any]] = []
        
        for (_, recordResult) in queryResult.matchResults {
          switch recordResult {
          case .success(let record):
            var bucketData: [String: Any] = [
              "recordName": record.recordID.recordName,
              "createdAt": record.creationDate?.timeIntervalSince1970 ?? 0,
              "modifiedAt": record.modificationDate?.timeIntervalSince1970 ?? 0
            ]
            
            // Extract all fields from the record
            for key in record.allKeys() {
              if let value = record[key] {
                bucketData[key] = self.convertCKValueToJSON(value)
              }
            }
            
            buckets.append(bucketData)
          case .failure(let error):
            self.logger.error(
              tag: "CloudKitFetch",
              message: "Failed to fetch bucket record",
              metadata: ["error": error.localizedDescription],
              source: "CloudKitBridge"
            )
          }
        }
        
        self.logger.info(
          tag: "CloudKitFetch",
          message: "All buckets fetched",
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
        reject("FETCH_ERROR", "Failed to fetch buckets from CloudKit: \(error.localizedDescription)", nil)
      }
    }
  }
  
  /**
   * Fetch all notifications from CloudKit
   */
  @objc
  func fetchAllNotificationsFromCloudKit(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→CloudKit",
      message: "React Native requested all notifications from CloudKit",
      source: "CloudKitBridge"
    )
    
    let setup = KeychainAccess.getCloudKitSetup()
    
    setup.privateDatabase.fetch(withQuery: setup.notificationsQuery, inZoneWith: setup.customZone.zoneID, desiredKeys: nil, resultsLimit: CKQueryOperation.maximumResults) { result in
      switch result {
      case .success(let queryResult):
        var notifications: [[String: Any]] = []
        
        for (_, recordResult) in queryResult.matchResults {
          switch recordResult {
          case .success(let record):
            var notificationData: [String: Any] = [
              "recordName": record.recordID.recordName,
              "createdAt": record.creationDate?.timeIntervalSince1970 ?? 0,
              "modifiedAt": record.modificationDate?.timeIntervalSince1970 ?? 0
            ]
            
            // Extract all fields from the record
            for key in record.allKeys() {
              if let value = record[key] {
                notificationData[key] = self.convertCKValueToJSON(value)
              }
            }
            
            notifications.append(notificationData)
          case .failure(let error):
            self.logger.error(
              tag: "CloudKitFetch",
              message: "Failed to fetch notification record",
              metadata: ["error": error.localizedDescription],
              source: "CloudKitBridge"
            )
          }
        }
        
        self.logger.info(
          tag: "CloudKitFetch",
          message: "All notifications fetched",
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
        reject("FETCH_ERROR", "Failed to fetch notifications from CloudKit: \(error.localizedDescription)", nil)
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
    
    let setup = KeychainAccess.getCloudKitSetup()
    let recordID = CKRecord.ID(recordName: recordName, zoneID: setup.customZone.zoneID)
    
    setup.privateDatabase.fetch(withRecordID: recordID) { record, error in
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
    
    let setup = KeychainAccess.getCloudKitSetup()
    let recordID = CKRecord.ID(recordName: recordName, zoneID: setup.customZone.zoneID)
    
    setup.privateDatabase.delete(withRecordID: recordID) { recordID, error in
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

