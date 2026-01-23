import Foundation
import React
#if os(iOS)
import WatchConnectivity
import CloudKit
#endif

/**
 * React Native bridge for CloudKit sync operations
 * Exposes CloudKit sync trigger to JavaScript for iOS
 */
@objc(CloudKitSyncBridge)
class CloudKitSyncBridge: RCTEventEmitter {

  private var hasListeners: Bool = false

  private func infoLog(_ message: String, metadata: [String: Any]? = nil) {
    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: message, metadata: metadata, source: "CloudKitSyncBridge")
  }

  private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: message, metadata: metadata, source: "CloudKitSyncBridge")
  }

  private func errorLog(_ message: String, metadata: [String: Any]? = nil) {
    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: message, metadata: metadata, source: "CloudKitSyncBridge")
  }

  private func debugLog(_ message: String, metadata: [String: Any]? = nil) {
    guard CloudKitManagerBase.isCloudKitDebugEnabled() else { return }
    LoggingSystem.shared.log(level: "DEBUG", tag: "CloudKit", message: message, metadata: metadata, source: "CloudKitSyncBridge")
  }

  // Backward-compatible wrapper (gated debug)
  private func debugPrint(_ message: String) {
    debugLog(message)
  }
  
  // MARK: - React Native Module Setup
  
  // MARK: - Event Emitter Setup
  
  override func supportedEvents() -> [String]! {
    return [
      "cloudKitNotificationUpdated",
      "cloudKitNotificationDeleted",
      "cloudKitBucketUpdated",
      "cloudKitBucketDeleted",
      "cloudKitRecordChanged", // New event for all record changes
      "cloudKitSyncProgress", // Progress updates during sync operations
      "watchLogsTransferProgress", // Progress updates during watch logs transfer
      "cloudKitNotificationsBatchUpdated" // Batch update event for multiple notifications
    ]
  }
  
  // MARK: - Static Event Emitter
  
  private static var sharedInstance: CloudKitSyncBridge?

  // When RN has no listeners yet (cold start / early native events), RCTEventEmitter will drop events.
  // Keep a small queue and flush once JS starts observing.
  private static let pendingEventLock = NSLock()
  private static var pendingRecordChangedEvents: [[String: Any]] = []
  private static var pendingNotificationDeletedIds: [String] = []
  private static var pendingBucketUpdatedIds: [String] = []
  private static var pendingBucketDeletedIds: [String] = []
  private static let pendingEventsMax = 100
  
  // Debounce mechanism for batch updates
  private static var pendingNotificationIds: Set<String> = []
  private static var notificationDebounceTimer: Timer?
  private static let notificationDebounceInterval: TimeInterval = 0.5 // 500ms debounce
  private static let batchThreshold = 10 // Emit batch event immediately if more than 10 updates
  private static let notificationDebounceLock = NSLock()
  
  @objc
  static func setSharedInstance(_ instance: CloudKitSyncBridge) {
    sharedInstance = instance
  }
  
  @objc
  static func notifyNotificationUpdated(_ notificationId: String) {
    notificationDebounceLock.lock()
    pendingNotificationIds.insert(notificationId)
    let currentCount = pendingNotificationIds.count
    notificationDebounceLock.unlock()
    
    // All timer operations must be on main thread
    DispatchQueue.main.async {
      // Cancel existing timer
      notificationDebounceTimer?.invalidate()
      notificationDebounceTimer = nil

      // If JS isn't listening yet, keep pending IDs and wait for startObserving.
      if let instance = sharedInstance, instance.hasListeners == false {
        return
      }
      
      // If we have many updates, emit batch event immediately
      if currentCount >= batchThreshold {
        emitBatchNotificationUpdate()
        return
      }
      
      // Schedule debounced batch update (Timer must be on main thread)
      notificationDebounceTimer = Timer.scheduledTimer(withTimeInterval: notificationDebounceInterval, repeats: false) { _ in
        emitBatchNotificationUpdate()
      }
    }
  }
  
  private static func emitBatchNotificationUpdate() {
    // If JS isn't listening yet, do not flush; keep pending IDs.
    if let instance = sharedInstance, instance.hasListeners == false {
      return
    }

    notificationDebounceLock.lock()
    let notificationIds = Array(pendingNotificationIds)
    pendingNotificationIds.removeAll()
    notificationDebounceLock.unlock()
    
    notificationDebounceTimer?.invalidate()
    notificationDebounceTimer = nil
    
    guard !notificationIds.isEmpty else { return }
    
    DispatchQueue.main.async {
      if notificationIds.count == 1 {
        // Single notification - emit individual event for backward compatibility
        sharedInstance?.sendEvent(withName: "cloudKitNotificationUpdated", body: ["notificationId": notificationIds[0]])
      } else {
        // Multiple notifications - emit batch event
        sharedInstance?.sendEvent(withName: "cloudKitNotificationsBatchUpdated", body: [
          "notificationIds": notificationIds,
          "count": notificationIds.count
        ])
      }
    }
  }
  
  @objc
  static func notifyNotificationDeleted(_ notificationId: String) {
    DispatchQueue.main.async {
      if let instance = sharedInstance, instance.hasListeners {
        instance.sendEvent(withName: "cloudKitNotificationDeleted", body: ["notificationId": notificationId])
      } else {
        pendingEventLock.lock()
        pendingNotificationDeletedIds.append(notificationId)
        if pendingNotificationDeletedIds.count > pendingEventsMax {
          pendingNotificationDeletedIds.removeFirst(pendingNotificationDeletedIds.count - pendingEventsMax)
        }
        pendingEventLock.unlock()
      }
    }
  }
  
  @objc
  static func notifyBucketUpdated(_ bucketId: String) {
    DispatchQueue.main.async {
      if let instance = sharedInstance, instance.hasListeners {
        instance.sendEvent(withName: "cloudKitBucketUpdated", body: ["bucketId": bucketId])
      } else {
        pendingEventLock.lock()
        pendingBucketUpdatedIds.append(bucketId)
        if pendingBucketUpdatedIds.count > pendingEventsMax {
          pendingBucketUpdatedIds.removeFirst(pendingBucketUpdatedIds.count - pendingEventsMax)
        }
        pendingEventLock.unlock()
      }
    }
  }
  
  @objc
  static func notifyBucketDeleted(_ bucketId: String) {
    DispatchQueue.main.async {
      if let instance = sharedInstance, instance.hasListeners {
        instance.sendEvent(withName: "cloudKitBucketDeleted", body: ["bucketId": bucketId])
      } else {
        pendingEventLock.lock()
        pendingBucketDeletedIds.append(bucketId)
        if pendingBucketDeletedIds.count > pendingEventsMax {
          pendingBucketDeletedIds.removeFirst(pendingBucketDeletedIds.count - pendingEventsMax)
        }
        pendingEventLock.unlock()
      }
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

      // Base log for push-driven events
      if reason.hasPrefix("push") {
        sharedInstance?.infoLog("CloudKit subscription event received", metadata: ["recordType": recordType, "recordId": recordId, "reason": reason])
      }

      if let instance = sharedInstance, instance.hasListeners {
        instance.sendEvent(withName: "cloudKitRecordChanged", body: body)
      } else {
        pendingEventLock.lock()
        pendingRecordChangedEvents.append(body)
        if pendingRecordChangedEvents.count > pendingEventsMax {
          pendingRecordChangedEvents.removeFirst(pendingRecordChangedEvents.count - pendingEventsMax)
        }
        pendingEventLock.unlock()
      }
    }
  }
  
  @objc
  static func notifySyncProgress(currentItem: Int, totalItems: Int, itemType: String, phase: String, step: String = "") {
    DispatchQueue.main.async {
      var body: [String: Any] = [
        "currentItem": currentItem,
        "totalItems": totalItems,
        "itemType": itemType,
        "phase": phase
      ]
      if !step.isEmpty {
        body["step"] = step
      }
      sharedInstance?.sendEvent(withName: "cloudKitSyncProgress", body: body)
    }
  }
  
  // Helper method for dynamic calls from extensions where CloudKitSyncBridge may not be in scope
  @objc
  static func notifySyncProgressWithDictionary(_ dict: [String: Any]) {
    let currentItem = dict["currentItem"] as? Int ?? 0
    let totalItems = dict["totalItems"] as? Int ?? 0
    let itemType = dict["itemType"] as? String ?? ""
    let phase = dict["phase"] as? String ?? ""
    let step = dict["step"] as? String ?? ""
    notifySyncProgress(currentItem: currentItem, totalItems: totalItems, itemType: itemType, phase: phase, step: step)
  }
  
  /**
   * Notify React Native of watch logs transfer progress
   */
  @objc
  static func notifyWatchLogsTransferProgress(currentBatch: Int, totalBatches: Int, logsInBatch: Int, phase: String) {
    DispatchQueue.main.async {
      let body: [String: Any] = [
        "currentBatch": currentBatch,
        "totalBatches": totalBatches,
        "logsInBatch": logsInBatch,
        "phase": phase
      ]
      sharedInstance?.sendEvent(withName: "watchLogsTransferProgress", body: body)
    }
  }
  
  /**
   * Helper method for dynamic calls from extensions where CloudKitSyncBridge may not be in scope
   */
  @objc
  static func notifyWatchLogsTransferProgressWithDictionary(_ dict: [String: Any]) {
    let currentBatch = dict["currentBatch"] as? Int ?? 0
    let totalBatches = dict["totalBatches"] as? Int ?? 0
    let logsInBatch = dict["logsInBatch"] as? Int ?? 0
    let phase = dict["phase"] as? String ?? ""
    notifyWatchLogsTransferProgress(currentBatch: currentBatch, totalBatches: totalBatches, logsInBatch: logsInBatch, phase: phase)
  }
  
  override init() {
    super.init()
    CloudKitSyncBridge.setSharedInstance(self)
  }

  override func startObserving() {
    hasListeners = true
    infoLog("RN started observing CloudKit events")

    // Flush any queued events + debounced notification updates.
    CloudKitSyncBridge.emitBatchNotificationUpdate()

    CloudKitSyncBridge.pendingEventLock.lock()
    let recordEvents = CloudKitSyncBridge.pendingRecordChangedEvents
    CloudKitSyncBridge.pendingRecordChangedEvents.removeAll()
    let deletedIds = CloudKitSyncBridge.pendingNotificationDeletedIds
    CloudKitSyncBridge.pendingNotificationDeletedIds.removeAll()
    let bucketUpdated = CloudKitSyncBridge.pendingBucketUpdatedIds
    CloudKitSyncBridge.pendingBucketUpdatedIds.removeAll()
    let bucketDeleted = CloudKitSyncBridge.pendingBucketDeletedIds
    CloudKitSyncBridge.pendingBucketDeletedIds.removeAll()
    CloudKitSyncBridge.pendingEventLock.unlock()

    for body in recordEvents {
      sendEvent(withName: "cloudKitRecordChanged", body: body)
    }
    for id in deletedIds {
      sendEvent(withName: "cloudKitNotificationDeleted", body: ["notificationId": id])
    }
    for id in bucketUpdated {
      sendEvent(withName: "cloudKitBucketUpdated", body: ["bucketId": id])
    }
    for id in bucketDeleted {
      sendEvent(withName: "cloudKitBucketDeleted", body: ["bucketId": id])
    }
  }

  override func stopObserving() {
    hasListeners = false
    infoLog("RN stopped observing CloudKit events")
  }
  
  // MARK: - Sync Operations
  
  /**
   * Trigger manual sync to CloudKit
    * This only triggers the sync - PhoneCloudKit will fetch from SQLite and update CloudKit
   */
  @objc
  func triggerSyncToCloud(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    PhoneCloudKit.shared.triggerSyncToCloud { success, error, stats in
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
    PhoneCloudKit.shared.triggerSyncToCloudWithDebounce()
    
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
    
    PhoneCloudKit.shared.updateNotificationReadStatusInCloudKit(
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
    
    PhoneCloudKit.shared.updateNotificationsReadStatusInCloudKit(
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
    PhoneCloudKit.shared.deleteNotificationFromCloudKit(notificationId: notificationId) { success, error in
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
    PhoneCloudKit.shared.deleteNotificationsFromCloudKit(notificationIds: notificationIds) { success, count, error in
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
    if fullSync {
      PhoneCloudKit.shared.resetIncrementalToken()
    }

    PhoneCloudKit.shared.fetchIncrementalChanges { result in
      switch result {
      case .failure(let error):
        reject("SYNC_FAILED", error.localizedDescription, error)
      case .success(let changes):
        // Process changes in batch to avoid blocking and reduce event spam
        var notificationIds: [String] = []
        var bucketIds: [String] = []
        var deletedNotificationIds: [String] = []
        
        // First pass: apply database changes and collect IDs
        for change in changes {
          switch change {
          case .changed(let record):
            let recordType = record.recordType
            let recordName = record.recordID.recordName
            let recordData = self.serializeRecordForJS(record)

            if recordType == PhoneCloudKit.Defaults.notificationRecordType,
               let id = record["id"] as? String {
              let readAtDate = record["readAt"] as? Date
              let readAtMs: Int64? = readAtDate.map { Int64($0.timeIntervalSince1970 * 1000) }
              DatabaseAccess.setNotificationReadAt(
                notificationId: id,
                readAtMs: readAtMs,
                source: "CloudKitSyncBridge"
              )
              notificationIds.append(id)
            } else if recordType == PhoneCloudKit.Defaults.bucketRecordType,
                      let id = record["id"] as? String {
              bucketIds.append(id)
            }

            CloudKitSyncBridge.notifyRecordChanged(
              recordType: recordType,
              recordId: recordName,
              reason: "incremental_changed",
              recordData: recordData
            )

          case .deleted(let recordID, let recordType):
            let recordName = recordID.recordName
            let resolvedType = recordType ?? self.inferRecordType(from: recordName)

            if recordName.hasPrefix("Notification-"),
               let id = self.stripPrefix("Notification-", from: recordName) {
              DatabaseAccess.deleteNotification(notificationId: id, source: "CloudKitSyncBridge")
              deletedNotificationIds.append(id)
            }

            CloudKitSyncBridge.notifyRecordChanged(
              recordType: resolvedType,
              recordId: recordName,
              reason: "incremental_deleted",
              recordData: nil
            )
          }
        }
        
        // Second pass: notify in batch to reduce event spam
        for id in notificationIds {
          CloudKitSyncBridge.notifyNotificationUpdated(id)
        }
        for id in bucketIds {
          CloudKitSyncBridge.notifyBucketUpdated(id)
        }
        for id in deletedNotificationIds {
          CloudKitSyncBridge.notifyNotificationDeleted(id)
        }

        resolve(["success": true, "updatedCount": changes.count])
      }
    }
  }

  /**
   * Fetch all notifications currently stored in CloudKit.
   * NOTE: This returns notifications only (no buckets) and is intended for recovery flows.
   */
  @objc
  func fetchAllNotificationsFromCloudKit(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    PhoneCloudKit.shared.fetchAllNotificationsFromCloudKit { notifications, error in
      if let error = error {
        reject("FETCH_FAILED", error.localizedDescription, error)
        return
      }
      resolve([
        "success": true,
        "count": notifications.count,
        "notifications": notifications
      ])
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
    self.infoLog("Triggering full sync with verification")
    
    // Reset last sync timestamp to force full sync
    // (Key is container-specific in the legacy implementation; remove both to be safe)
    UserDefaults.standard.removeObject(forKey: "cloudkit_last_sync_timestamp")
    let containerId = CloudKitManagerBase.makeDefaultConfiguration().containerIdentifier
    UserDefaults.standard.removeObject(forKey: "cloudkit_last_sync_timestamp_\(containerId)")
    
    // Get count from SQLite first (total count, not just unread)
    DatabaseAccess.getTotalNotificationCount(source: "CloudKitSyncBridge") { sqliteNotificationCount in
      DatabaseAccess.getAllBuckets(source: "CloudKitSyncBridge") { buckets in
        let sqliteBucketCount = buckets.count
        
        self.infoLog(
          "SQLite counts",
          metadata: [
            "notifications": sqliteNotificationCount,
            "buckets": sqliteBucketCount
          ]
        )
        
        // Perform full sync (will sync all records since epoch)
        PhoneCloudKit.shared.triggerSyncToCloud { success, error, stats in
          if success {
            self.infoLog(
              "Full sync completed",
              metadata: [
                "notificationsSynced": stats?.notificationsSynced ?? 0,
                "notificationsUpdated": stats?.notificationsUpdated ?? 0,
                "bucketsSynced": stats?.bucketsSynced ?? 0,
                "bucketsUpdated": stats?.bucketsUpdated ?? 0
              ]
            )
            
            // Wait a bit for CloudKit to process (increased delay due to rate limiting)
            self.debugLog("Waiting before verification")
            DispatchQueue.main.asyncAfter(deadline: .now() + 5.0) {
              let group = DispatchGroup()
              var cloudKitNotificationCount = 0
              var cloudKitBucketCount = 0
              var fetchError: Error?
              
              // Fetch notifications from CloudKit
              group.enter()
              PhoneCloudKit.shared.fetchAllNotificationsFromCloudKit { notifications, error in
                if let error = error {
                  fetchError = error
                } else {
                  cloudKitNotificationCount = notifications.count
                }
                group.leave()
              }
              
              // Fetch buckets from CloudKit
              group.enter()
              PhoneCloudKit.shared.fetchAllBucketsFromCloudKit { buckets, error in
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
                
                self.infoLog(
                  "Verification completed",
                  metadata: [
                    "notificationsMatch": notificationsMatch,
                    "bucketsMatch": bucketsMatch,
                    "sqliteNotifications": sqliteNotificationCount,
                    "cloudKitNotifications": cloudKitNotificationCount,
                    "sqliteBuckets": sqliteBucketCount,
                    "cloudKitBuckets": cloudKitBucketCount
                  ]
                )
                resolve(result)
              }
            }
          } else {
            let errorMessage = error?.localizedDescription ?? "Unknown error"
            self.errorLog("Full sync failed", metadata: ["error": errorMessage])
            reject("SYNC_FAILED", errorMessage, error)
          }
        }
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
    PhoneCloudKit.shared.deleteCloudKitZone { success, error in
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
    PhoneCloudKit.shared.resetCloudKitZone { success, error in
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
  
  /**
   * Initialize CloudKit schema if needed
   */
  @objc
  func initializeSchemaIfNeeded(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    PhoneCloudKit.shared.initializeSchemaIfNeeded { success, error in
      if let error = error {
        let errorMessage = error.localizedDescription
        reject("INIT_SCHEMA_FAILED", errorMessage, error)
      } else {
        resolve(["success": success])
      }
    }
    #else
    reject("NOT_SUPPORTED", "initializeSchemaIfNeeded is only available on iOS", nil)
    #endif
  }
  
  /**
   * Setup CloudKit subscriptions
   * Should be called after zone is initialized
   */
  @objc
  func setupSubscriptions(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    PhoneCloudKit.shared.setupSubscriptions { success, error in
      if let error = error {
        let errorMessage = error.localizedDescription
        reject("SETUP_SUBSCRIPTIONS_FAILED", errorMessage, error)
      } else {
        resolve(["success": success])
      }
    }
    #else
    reject("NOT_SUPPORTED", "setupSubscriptions is only available on iOS", nil)
    #endif
  }
  
  /**
   * Check if CloudKit is enabled
   */
  @objc
  func isCloudKitEnabled(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    let enabled = PhoneCloudKit.shared.isCloudKitEnabled
    resolve(["enabled": enabled])
    #else
    reject("NOT_SUPPORTED", "isCloudKitEnabled is only available on iOS", nil)
    #endif
  }

  /**
   * Check if CloudKit debug logging is enabled
   */
  @objc
  func isCloudKitDebugEnabled(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    let enabled = CloudKitManagerBase.isCloudKitDebugEnabled()
    resolve(["enabled": enabled])
    #else
    reject("NOT_SUPPORTED", "isCloudKitDebugEnabled is only available on iOS", nil)
    #endif
  }

  /**
   * Set CloudKit debug logging enabled state
   */
  @objc
  func setCloudKitDebugEnabled(
    _ enabled: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    CloudKitManagerBase.setCloudKitDebugEnabled(enabled)
    resolve(["success": true, "enabled": enabled])
    #else
    reject("NOT_SUPPORTED", "setCloudKitDebugEnabled is only available on iOS", nil)
    #endif
  }
  
  /**
   * Set CloudKit enabled state (convenience method - internally uses disabled flag)
   */
  @objc
  func setCloudKitEnabled(
    _ enabled: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    CloudKitManagerBase.setCloudKitEnabled(enabled)
    resolve(["success": true, "enabled": enabled, "disabled": !enabled])
    #else
    reject("NOT_SUPPORTED", "setCloudKitEnabled is only available on iOS", nil)
    #endif
  }
  
  /**
   * Set CloudKit disabled state
   */
  @objc
  func setCloudKitDisabled(
    _ disabled: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    CloudKitManagerBase.setCloudKitDisabled(disabled)
    resolve(["success": true, "disabled": disabled, "enabled": !disabled])
    #else
    reject("NOT_SUPPORTED", "setCloudKitDisabled is only available on iOS", nil)
    #endif
  }
  
  /**
   * Get CloudKit notification limit
   * Returns nil if limit is not set (unlimited)
   */
  @objc
  func getCloudKitNotificationLimit(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    let limit = CloudKitManagerBase.cloudKitNotificationLimit
    resolve(["limit": limit as Any])
    #else
    reject("NOT_SUPPORTED", "getCloudKitNotificationLimit is only available on iOS", nil)
    #endif
  }
  
  /**
   * Set CloudKit notification limit
   * Pass nil/undefined to remove limit (unlimited)
   */
  @objc
  func setCloudKitNotificationLimit(
    _ limit: NSNumber?,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    if let limitValue = limit {
      CloudKitManagerBase.cloudKitNotificationLimit = limitValue.intValue
    } else {
      CloudKitManagerBase.cloudKitNotificationLimit = nil
    }
    resolve(["success": true, "limit": limit as Any])
    #else
    reject("NOT_SUPPORTED", "setCloudKitNotificationLimit is only available on iOS", nil)
    #endif
  }
  
  /**
   * Check if initial sync has been completed
   */
  @objc
  func isInitialSyncCompleted(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    let completed = UserDefaults.standard.bool(forKey: CloudKitManagerBase.cloudKitInitialSyncCompletedKey)
    resolve(["completed": completed])
    #else
    reject("NOT_SUPPORTED", "isInitialSyncCompleted is only available on iOS", nil)
    #endif
  }
  
  /**
   * Reset initial sync flag (to trigger initial sync again)
   */
  @objc
  func resetInitialSyncFlag(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    UserDefaults.standard.removeObject(forKey: CloudKitManagerBase.cloudKitInitialSyncCompletedKey)
    resolve(["success": true])
    #else
    reject("NOT_SUPPORTED", "resetInitialSyncFlag is only available on iOS", nil)
    #endif
  }

  // MARK: - Helpers

  private func stripPrefix(_ prefix: String, from value: String) -> String? {
    guard value.hasPrefix(prefix) else { return nil }
    return String(value.dropFirst(prefix.count))
  }

  private func inferRecordType(from recordName: String) -> String {
    if recordName.hasPrefix("Notification-") {
      return PhoneCloudKit.Defaults.notificationRecordType
    }
    if recordName.hasPrefix("Bucket-") {
      return PhoneCloudKit.Defaults.bucketRecordType
    }
    return "Unknown"
  }

  private func serializeRecordForJS(_ record: CKRecord) -> [String: Any] {
    let formatter = ISO8601DateFormatter()
    formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

    var dict: [String: Any] = [
      "recordName": record.recordID.recordName,
      "recordType": record.recordType
    ]

    // Whitelist a small set of fields that we know are JSON-safe
    for key in ["id", "bucketId", "title", "body", "subtitle", "createdAt", "readAt", "name", "iconUrl", "color"] {
      if let value = record[key] {
        if let date = value as? Date {
          dict[key] = formatter.string(from: date)
        } else if let str = value as? String {
          dict[key] = str
        } else if let num = value as? NSNumber {
          dict[key] = num
        }
      }
    }
    return dict
  }
  
  /**
   * Send Watch token and server address to Watch app
   */
  @objc
  func sendWatchTokenSettings(
    _ token: String,
    serverAddress: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    #if os(iOS)
    guard WCSession.isSupported() else {
      reject("NOT_SUPPORTED", "WatchConnectivity is not supported on this device", nil)
      return
    }
    
    // Use AppDelegate's method to send token settings
    // We'll use a notification with a completion handler pattern
    let notificationName = NSNotification.Name("SendWatchTokenSettings")
    var observer: NSObjectProtocol?
    
    var observerRemoved = false
    
    observer = NotificationCenter.default.addObserver(
      forName: notificationName,
      object: nil,
      queue: .main
    ) { notification in
      guard !observerRemoved else { return }
      
      if let observer = observer {
        NotificationCenter.default.removeObserver(observer)
        observerRemoved = true
      }
      
      guard let userInfo = notification.userInfo,
            let success = userInfo["success"] as? Bool else {
        reject("SEND_FAILED", "Invalid response from AppDelegate", nil)
        return
      }
      
      if success {
        resolve(["success": true])
      } else {
        let error = userInfo["error"] as? String ?? "Unknown error"
        reject("SEND_FAILED", error, nil)
      }
    }
    
    // Post notification to AppDelegate
    NotificationCenter.default.post(
      name: notificationName,
      object: nil,
      userInfo: [
        "token": token,
        "serverAddress": serverAddress
      ]
    )
    
    // Timeout after 10 seconds
    DispatchQueue.main.asyncAfter(deadline: .now() + 10.0) {
      if !observerRemoved, let observer = observer {
        NotificationCenter.default.removeObserver(observer)
        observerRemoved = true
        reject("TIMEOUT", "Timeout waiting for Watch response", nil)
      }
    }
    #else
    reject("NOT_SUPPORTED", "sendWatchTokenSettings is only available on iOS", nil)
    #endif
  }

}
