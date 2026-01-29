import Foundation
import CloudKit
#if os(iOS)
import WatchConnectivity
#endif

#if os(iOS)

/// iOS-side CloudKit orchestrator.
///
/// Responsibilities (high level):
/// - Ensure zone/subscriptions
/// - Provide primitives for realtime (per-record fetch) + incremental changes
/// - Full-sync orchestration is implemented by higher layers (e.g. SQLite → CK mass upload)
public final class PhoneCloudKit {

    public static let shared = PhoneCloudKit()

    public struct Defaults {
        public static let notificationSubscriptionID = "NotificationChanges"
        public static let bucketSubscriptionID = "BucketChanges"
        public static let notificationRecordType = "Notifications"
        public static let bucketRecordType = "Buckets"
    }

    private let core: CloudKitManagerBase

    private let syncQueue = DispatchQueue(label: "com.zentik.cloudkit.phone.sync", qos: .utility)

    public init(core: CloudKitManagerBase = CloudKitManagerBase()) {
        self.core = core
    }

    private func infoLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: message, metadata: metadata, source: "PhoneCloudKit")
    }

    private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: message, metadata: metadata, source: "PhoneCloudKit")
    }

    private func errorLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: message, metadata: metadata, source: "PhoneCloudKit")
    }

    private func debugLog(_ message: String) {
        guard CloudKitManagerBase.isCloudKitDebugEnabled(appGroupIdentifier: core.config.appGroupIdentifier) else {
            return
        }
        LoggingSystem.shared.log(level: "DEBUG", tag: "CloudKit", message: message, source: "PhoneCloudKit")
    }
    
    /// Helper to notify sync progress - uses CloudKitSyncBridge if available, otherwise NotificationCenter
    private func notifySyncProgress(currentItem: Int, totalItems: Int, itemType: String, phase: String, step: String = "") {
        let dict: [String: Any] = [
            "currentItem": currentItem,
            "totalItems": totalItems,
            "itemType": itemType,
            "phase": phase,
            "step": step
        ]
        
        // Try to use CloudKitSyncBridge if available (main app)
        if let bridgeClass = NSClassFromString("CloudKitSyncBridge") as? NSObject.Type {
            let selector = NSSelectorFromString("notifySyncProgressWithDictionary:")
            if bridgeClass.responds(to: selector) {
                _ = bridgeClass.perform(selector, with: dict)
                return
            }
        }
        
        // Fallback to NotificationCenter (for extensions)
        NotificationCenter.default.post(
            name: NSNotification.Name("CloudKitSyncProgress"),
            object: nil,
            userInfo: dict
        )
    }

    private var lastSyncTimestampKey: String {
        "cloudkit_last_sync_timestamp_\(core.config.containerIdentifier)"
    }

    public struct SyncStats {
        public let notificationsSynced: Int
        public let bucketsSynced: Int
        public let notificationsUpdated: Int
        public let bucketsUpdated: Int
    }

    public var isCloudKitEnabled: Bool {
        core.isCloudKitEnabled
    }

    /// CloudKit must only run when a Watch is supported (paired on Mac). Otherwise CK is disabled.
    public static var isWatchSupported: Bool {
        WCSession.isSupported()
    }

    public func ensureReady(completion: @escaping (Result<Void, Error>) -> Void) {
        guard Self.isWatchSupported else {
            warnLog("ensureReady skipped (Watch not supported or not paired)")
            completion(.failure(NSError(domain: "PhoneCloudKit", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch is not supported or not paired. CloudKit is only available with a paired Apple Watch."])))
            return
        }
        core.ensureZoneWithStatus { result in
            switch result {
            case .failure(let error):
                self.errorLog("ensureReady failed (ensureZone)", metadata: ["error": String(describing: error)])
                completion(.failure(error))

            case .success(let didCreateZone):
                self.core.ensureSubscriptions(self.defaultSubscriptions()) { subResult in
                    switch subResult {
                    case .failure(let error):
                        self.errorLog("ensureReady failed (ensureSubscriptions)", metadata: ["error": String(describing: error)])
                        completion(.failure(error))

                    case .success:
                        if didCreateZone {
                            // Fresh zone: trigger full sync without CloudKit reset
                            // (zone is already created, just need to sync data)
                            // Do not block app startup; run best-effort in the sync queue
                            self.syncQueue.async {
                                self.performFullSyncWithReset(skipReset: true) { success, error, stats in
                                    if success {
                                        self.infoLog("✅ Zone created: bootstrap full sync completed notifications=\(stats?.notificationsSynced ?? 0) buckets=\(stats?.bucketsSynced ?? 0)")
                                    } else {
                                        self.warnLog("⚠️ Zone created: bootstrap full sync failed error=\(error?.localizedDescription ?? "Unknown error")")
                                    }
                                }
                            }
                        }
                        self.infoLog("ensureReady completed", metadata: ["didCreateZone": didCreateZone])
                        completion(.success(()))
                    }
                }
            }
        }
    }

    public func initializeSchemaIfNeeded(completion: @escaping (Bool, Error?) -> Void) {
        ensureReady { result in
            switch result {
            case .success:
                completion(true, nil)
            case .failure(let error):
                completion(false, error)
            }
        }
    }

    public func setupSubscriptions(completion: @escaping (Bool, Error?) -> Void) {
        ensureReady { result in
            switch result {
            case .success:
                completion(true, nil)
            case .failure(let error):
                completion(false, error)
            }
        }
    }

    /// Ensures the custom zone exists (no subscriptions).
    /// Useful for extensions (NSE/NCE) that only need basic CloudKit I/O.
    public func ensureZoneOnlyReady(completion: @escaping (Result<Void, Error>) -> Void) {
        core.ensureZone(completion: completion)
    }

    public func defaultSubscriptions() -> [CloudKitManagerBase.SubscriptionSpec] {
        [
            .init(id: Defaults.notificationSubscriptionID, recordType: Defaults.notificationRecordType),
            .init(id: Defaults.bucketSubscriptionID, recordType: Defaults.bucketRecordType)
        ]
    }
    
    public func deleteAllSubscriptions(completion: @escaping (Result<Void, Error>) -> Void) {
        let subscriptionIDs = [
            Defaults.notificationSubscriptionID,
            Defaults.bucketSubscriptionID
        ]
        core.deleteSubscriptions(subscriptionIDs, completion: completion)
    }

    // MARK: - Incremental

    public func fetchIncrementalChanges(completion: @escaping (Result<[CloudKitManagerBase.ZoneChange], Error>) -> Void) {
        guard Self.isWatchSupported else {
            completion(.failure(NSError(domain: "PhoneCloudKit", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch not supported or not paired"])))
            return
        }
        core.fetchZoneChanges(completion: completion)
    }

    public func resetIncrementalToken() {
        core.resetServerChangeToken()
    }

    // MARK: - Zone lifecycle

    public func deleteCloudKitZone(completion: @escaping (Bool, Error?) -> Void) {
        core.deleteZone { result in
            switch result {
            case .success:
                self.core.resetServerChangeToken()
                completion(true, nil)
            case .failure(let error):
                completion(false, error)
            }
        }
    }

    public func resetCloudKitZone(completion: @escaping (Bool, Error?) -> Void) {
        deleteCloudKitZone { success, error in
            if !success {
                completion(false, error)
                return
            }

            self.ensureReady { result in
                switch result {
                case .success:
                    completion(true, nil)
                case .failure(let error):
                    completion(false, error)
                }
            }
        }
    }

    // MARK: - Realtime (per-record)

    /// Parses a CloudKit push payload. Returns nil if payload is not CloudKit.
    public func parseCloudKitNotification(from userInfo: [AnyHashable: Any]) -> CKNotification? {
        CKNotification(fromRemoteNotificationDictionary: userInfo)
    }

    public func fetchRecord(recordID: CKRecord.ID, completion: @escaping (Result<CKRecord?, Error>) -> Void) {
        core.fetchRecord(recordID: recordID, completion: completion)
    }

    public func fetchRecords(recordIDs: [CKRecord.ID], completion: @escaping (Result<[CKRecord.ID: CKRecord], Error>) -> Void) {
        core.fetchRecords(recordIDs: recordIDs, completion: completion)
    }

    // MARK: - Modify (batch-only)

    public func save(records: [CKRecord], completion: @escaping (Result<Void, Error>) -> Void) {
        core.save(records: records, progressCallback: nil, completion: completion)
    }

    public func delete(recordIDs: [CKRecord.ID], completion: @escaping (Result<Void, Error>) -> Void) {
        core.delete(recordIDs: recordIDs, completion: completion)
    }

    public func modify(
        recordsToSave: [CKRecord],
        recordIDsToDelete: [CKRecord.ID],
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        core.modify(recordsToSave: recordsToSave, recordIDsToDelete: recordIDsToDelete, completion: completion)
    }

    // MARK: - Zentik domain helpers (shared with extensions)

    private func notificationRecordID(_ notificationId: String) -> CKRecord.ID {
        CKRecord.ID(recordName: "Notification-\(notificationId)", zoneID: core.zoneID)
    }

    private func bucketRecordID(_ bucketId: String) -> CKRecord.ID {
        CKRecord.ID(recordName: "Bucket-\(bucketId)", zoneID: core.zoneID)
    }

    /// Save a single notification to CloudKit (create or update). Safe to call from NSE.
    public func saveNotificationToCloudKit(
        notificationId: String,
        bucketId: String,
        title: String,
        body: String,
        subtitle: String?,
        createdAt: Date,
        readAt: Date?,
        attachments: [[String: Any]],
        actions: [[String: Any]],
        completion: @escaping (Bool, Error?) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(false, nil)
            return
        }

        ensureZoneOnlyReady { result in
            switch result {
            case .failure(let error):
                completion(false, error)
            case .success:
                let recordID = self.notificationRecordID(notificationId)
                let record = CKRecord(recordType: Defaults.notificationRecordType, recordID: recordID)

                record["id"] = notificationId
                record["bucketId"] = bucketId
                record["title"] = title
                record["body"] = body
                record["subtitle"] = subtitle
                record["createdAt"] = createdAt
                record["readAt"] = readAt

                if let attachmentsData = try? JSONSerialization.data(withJSONObject: attachments),
                   let attachmentsString = String(data: attachmentsData, encoding: .utf8) {
                    record["attachments"] = attachmentsString
                } else {
                    record["attachments"] = "[]"
                }

                if let actionsData = try? JSONSerialization.data(withJSONObject: actions),
                   let actionsString = String(data: actionsData, encoding: .utf8) {
                    record["actions"] = actionsString
                } else {
                    record["actions"] = "[]"
                }

                // Use .allKeys for new notifications to ensure readAt is properly set (even if nil)
                // This ensures that readAt: nil explicitly overwrites any existing value
                self.infoLog("Calling core.save for notification", metadata: [
                    "notificationId": notificationId,
                    "bucketId": bucketId,
                    "title": title,
                    "hasSubtitle": subtitle != nil,
                    "attachmentsCount": attachments.count,
                    "actionsCount": actions.count
                ])
                self.core.save(records: [record], savePolicy: .allKeys) { saveResult in
                    self.infoLog("core.save completion invoked for notification", metadata: ["notificationId": notificationId])
                    var success = false
                    var errorOut: Error?
                    switch saveResult {
                    case .failure(let error):
                        self.errorLog("core.save failed for notification", metadata: [
                            "notificationId": notificationId,
                            "error": String(describing: error)
                        ])
                        errorOut = error
                    case .success:
                        self.infoLog("core.save succeeded for notification", metadata: [
                            "notificationId": notificationId
                        ])
                        let sharedDefaults = UserDefaults(suiteName: self.core.config.appGroupIdentifier)
                        sharedDefaults?.set(notificationId, forKey: "lastNSENotificationSentToCloudKit")
                        sharedDefaults?.set(createdAt.timeIntervalSince1970, forKey: "lastNSENotificationSentTimestamp")
                        sharedDefaults?.synchronize()
                        success = true
                    }
                    DispatchQueue.main.async {
                        completion(success, errorOut)
                    }
                }
            }
        }
    }

    /// Batch-only read/unread update (chunked by CloudKitManagerBase). Pass a single ID as a 1-element array.
    public func updateNotificationsReadStatusInCloudKit(
        notificationIds: [String],
        readAt: Date?,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(false, nil)
            return
        }

        // Ensure zone is ready before saving (prevents silent failures when CloudKit is not initialized)
        ensureZoneOnlyReady { [weak self] result in
            guard let self = self else {
                completion(false, NSError(domain: "PhoneCloudKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Self deallocated"]))
                return
            }
            
            switch result {
            case .failure(let error):
                self.warnLog("updateNotificationsReadStatusInCloudKit failed (ensureZone)", metadata: ["error": String(describing: error), "notificationIds": "\(notificationIds.count)"])
                completion(false, error)
            case .success:
                // Create records directly with known recordIDs - no fetch needed
                // CloudKit will merge with existing records when using .changedKeys savePolicy
                let recordsToSave: [CKRecord] = notificationIds.map { notificationId in
                    let recordID = self.notificationRecordID(notificationId)
                    let record = CKRecord(recordType: Defaults.notificationRecordType, recordID: recordID)
                    record["readAt"] = readAt
                    return record
                }

                self.core.save(records: recordsToSave, savePolicy: .changedKeys) { saveResult in
                    switch saveResult {
                    case .failure(let error):
                        self.warnLog("updateNotificationsReadStatusInCloudKit save failed", metadata: ["error": String(describing: error), "notificationIds": "\(notificationIds.count)"])
                        completion(false, error)
                    case .success:
                        self.infoLog("updateNotificationsReadStatusInCloudKit completed", metadata: ["notificationIds": "\(notificationIds.count)", "readAt": readAt != nil ? "set" : "nil"])
                        completion(true, nil)
                    }
                }
            }
        }
    }

    public func updateNotificationsReadStatusInCloudKit(
        notificationIds: [String],
        readAt: Date?,
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        updateNotificationsReadStatusInCloudKit(notificationIds: notificationIds, readAt: readAt) { success, error in
            completion(success, success ? notificationIds.count : 0, error)
        }
    }

    public func updateNotificationReadStatusInCloudKit(
        notificationId: String,
        readAt: Date?,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        updateNotificationsReadStatusInCloudKit(notificationIds: [notificationId], readAt: readAt) { success, _, error in
            completion(success, error)
        }
    }

    public func deleteNotificationFromCloudKit(
        notificationId: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(false, nil)
            return
        }

        core.delete(recordIDs: [notificationRecordID(notificationId)]) { result in
            switch result {
            case .failure(let error):
                completion(false, error)
            case .success:
                completion(true, nil)
            }
        }
    }

    public func deleteNotificationsFromCloudKit(
        notificationIds: [String],
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(false, 0, nil)
            return
        }

        let recordIDs = notificationIds.map { self.notificationRecordID($0) }
        core.delete(recordIDs: recordIDs) { result in
            switch result {
            case .failure(let error):
                completion(false, 0, error)
            case .success:
                completion(true, notificationIds.count, nil)
            }
        }
    }

    public func saveBucketToCloudKit(
        bucketId: String,
        name: String,
        iconUrl: String?,
        color: String?,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(false, nil)
            return
        }

        ensureZoneOnlyReady { result in
            switch result {
            case .failure(let error):
                completion(false, error)
            case .success:
                let recordID = self.bucketRecordID(bucketId)
                let record = CKRecord(recordType: Defaults.bucketRecordType, recordID: recordID)
                record["id"] = bucketId
                record["name"] = name
                record["iconUrl"] = iconUrl
                record["color"] = color

                self.core.save(records: [record]) { saveResult in
                    switch saveResult {
                    case .failure(let error):
                        completion(false, error)
                    case .success:
                        completion(true, nil)
                    }
                }
            }
        }
    }

    // MARK: - Bulk sync (SQLite -> CloudKit)

    public func triggerSyncToCloud(completion: @escaping (Bool, Error?, SyncStats?) -> Void) {
        guard Self.isWatchSupported else {
            warnLog("triggerSyncToCloud skipped (Watch not supported or not paired)")
            completion(false, NSError(domain: "PhoneCloudKit", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch is not supported or not paired. CloudKit is only available with a paired Apple Watch."]), nil)
            return
        }
        guard isCloudKitEnabled else {
            warnLog("triggerSyncToCloud skipped (CloudKit disabled)")
            completion(false, nil, nil)
            return
        }

        syncQueue.async {
            self.ensureReady { readyResult in
                switch readyResult {
                case .failure(let error):
                    self.errorLog("triggerSyncToCloud failed (ensureReady)", metadata: ["error": String(describing: error)])
                    completion(false, error, nil)
                case .success:
                    self.triggerSyncToCloudInternal(completion: completion)
                }
            }
        }
    }

    public func triggerSyncToCloudWithDebounce() {
        // Debounce is no longer needed; keep API for compatibility.
        triggerSyncToCloud { _, _, _ in }
    }

    private func triggerSyncToCloudInternal(completion: @escaping (Bool, Error?, SyncStats?) -> Void) {
        performFullSyncWithReset(skipReset: false, completion: completion)
    }
    
    private func performFullSyncWithReset(skipReset: Bool, completion: @escaping (Bool, Error?, SyncStats?) -> Void) {
        // EVENT 1: FullSync started
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "",
            phase: "starting",
            step: "full_sync"
        )
        
        if skipReset {
            // Zone was just created, reset local cursors and sync without CloudKit reset
            self.core.resetServerChangeToken()
            self.resetLastSyncDate()
            // Continue with sync (always do cleanup after full sync)
            self.performFullSync(completion: completion)
        } else {
            // PHASE 0: Reset CloudKit (delete zone, token, subscriptions)
            self.performCloudKitReset { resetResult in
                switch resetResult {
                case .failure(let error):
                    self.errorLog("CloudKit reset failed", metadata: ["error": String(describing: error)])
                    // EVENT: Reset failed
                    self.notifySyncProgress(
                        currentItem: 0,
                        totalItems: 0,
                        itemType: "",
                        phase: "failed",
                        step: "reset_cloudkit"
                    )
                    completion(false, error, nil)
                    return
                case .success:
                    // Step 4: Ensure zone exists before loading records
                    // This is critical: after deleting the zone, we need to recreate it
                    // before loading records, otherwise CloudKit might not propagate the zone
                    // in time for subsequent queries
                    self.core.ensureZone { ensureResult in
                        switch ensureResult {
                        case .failure(let error):
                            self.errorLog("Failed to ensure zone before full sync", metadata: ["error": String(describing: error)])
                            completion(false, error, nil)
                        case .success:
                            self.performFullSync(completion: completion)
                        }
                    }
                }
            }
        }
    }
    
    private func performCloudKitReset(completion: @escaping (Result<Void, Error>) -> Void) {
        // EVENT 2: Reset started
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "",
            phase: "starting",
            step: "reset_cloudkit"
        )
        
        // Step 1: Delete subscriptions
        self.deleteAllSubscriptions { deleteSubsResult in
            switch deleteSubsResult {
            case .failure(let error):
                self.warnLog("Failed to delete subscriptions (non-fatal)", metadata: ["error": String(describing: error)])
                // Continue anyway
            case .success:
                self.infoLog("Subscriptions deleted")
            }
            
            // Step 2: Delete zone
            self.core.deleteZone { deleteZoneResult in
                switch deleteZoneResult {
                case .failure(let error):
                    // If zone doesn't exist, that's okay
                    if let ckError = error as? CKError, ckError.code == .zoneNotFound {
                        self.infoLog("Zone not found (already deleted)")
                    } else {
                        self.warnLog("Failed to delete zone (non-fatal)", metadata: ["error": String(describing: error)])
                    }
                case .success:
                    self.infoLog("Zone deleted")
                }
                
                // Step 3: Reset token
                self.core.resetServerChangeToken()
                
                // EVENT 3: Reset completed
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: 0,
                    itemType: "",
                    phase: "completed",
                    step: "reset_cloudkit"
                )
                
                completion(.success(()))
            }
        }
    }
    
    private func performFullSync(completion: @escaping (Bool, Error?, SyncStats?) -> Void) {
        let group = DispatchGroup()

        var syncedNotifications = 0
        var syncedBuckets = 0
        var errorOut: Error?

        // 1) Sync buckets
        group.enter()
        
        // EVENT: Buckets preparing (loading from DB)
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "bucket",
            phase: "preparing",
            step: "sync_buckets"
        )
        
        DatabaseAccess.getAllBuckets(source: "PhoneCloudKit") { buckets in
            // EVENT: Buckets found (show count in label)
            self.notifySyncProgress(
                currentItem: buckets.count,
                totalItems: buckets.count,
                itemType: "bucket",
                phase: "found",
                step: "sync_buckets"
            )
            
            let records: [CKRecord] = buckets.map { bucket in
                let recordID = self.bucketRecordID(bucket.id)
                let record = CKRecord(recordType: Defaults.bucketRecordType, recordID: recordID)
                record["id"] = bucket.id
                record["name"] = bucket.name
                record["iconUrl"] = bucket.iconUrl
                record["color"] = bucket.color
                return record
            }

            // EVENT: Buckets uploading (upload started, show progress bar)
            self.notifySyncProgress(
                currentItem: 0,
                totalItems: records.count,
                itemType: "bucket",
                phase: "uploading",
                step: "sync_buckets"
            )
            
            self.core.save(
                records: records,
                progressCallback: { completed, total in
                    // EVENT: Buckets syncing (progress update - only called after successful chunk upload)
                    self.notifySyncProgress(
                        currentItem: completed,
                        totalItems: total,
                        itemType: "bucket",
                        phase: "syncing",
                        step: "sync_buckets"
                    )
                }
            ) { result in
                switch result {
                case .success:
                    syncedBuckets = records.count
                    self.infoLog("Buckets phase completed", metadata: ["synced": syncedBuckets])
                    // EVENT 4: Buckets phase completed
                    self.notifySyncProgress(
                        currentItem: syncedBuckets,
                        totalItems: syncedBuckets,
                        itemType: "bucket",
                        phase: "completed",
                        step: "sync_buckets"
                    )
                case .failure(let error):
                    errorOut = error
                    self.errorLog("Buckets phase failed", metadata: ["error": String(describing: error)])
                    // EVENT 5: Buckets phase failed
                    self.notifySyncProgress(
                        currentItem: 0,
                        totalItems: buckets.count,
                        itemType: "bucket",
                        phase: "failed",
                        step: "sync_buckets"
                    )
                }
                group.leave()
            }
        }

        // 2) Sync notifications
        group.enter()
        
        // EVENT: Notifications preparing (loading from DB)
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "notification",
            phase: "preparing",
            step: "sync_notifications"
        )
        
        // FullSync: get ALL notifications (no date filtering)
        // Use a very high limit to get all notifications
        let maxLimit = 1000000 // High enough to get all notifications
        DatabaseAccess.getRecentNotifications(limit: maxLimit, unreadOnly: false, source: "PhoneCloudKit") { notifications in
            var notificationsToSync = notifications
            
            // Apply cloudKitNotificationLimit if set (but don't filter by date)
            if let limit = CloudKitManagerBase.cloudKitNotificationLimit, notificationsToSync.count > limit {
                notificationsToSync.sort { $0.createdAtDate > $1.createdAtDate }
                notificationsToSync = Array(notificationsToSync.prefix(limit))
                self.infoLog("Limited notifications to CloudKit limit", metadata: ["limit": limit, "originalCount": notifications.count, "limitedCount": notificationsToSync.count])
            }

            guard !notificationsToSync.isEmpty else {
                self.infoLog("Notifications phase completed (nothing to sync)")
                // EVENT: Notifications completed (nothing to sync)
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: 0,
                    itemType: "notification",
                    phase: "completed",
                    step: "sync_notifications"
                )
                group.leave()
                return
            }
            
            // EVENT: Notifications found (show count in label)
            self.notifySyncProgress(
                currentItem: notificationsToSync.count,
                totalItems: notificationsToSync.count,
                itemType: "notification",
                phase: "found",
                step: "sync_notifications"
            )

            let ids = notificationsToSync.map { $0.id }
            DatabaseAccess.fetchReadAtTimestamps(notificationIds: ids, source: "PhoneCloudKit") { readAtMap in
                let dateFormatter = ISO8601DateFormatter()
                dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

                let records: [CKRecord] = notificationsToSync.map { notif in
                        let recordID = self.notificationRecordID(notif.id)
                        let record = CKRecord(recordType: Defaults.notificationRecordType, recordID: recordID)
                        record["id"] = notif.id
                        record["bucketId"] = notif.bucketId
                        record["title"] = notif.title
                        record["body"] = notif.body
                        record["subtitle"] = notif.subtitle
                        record["createdAt"] = notif.createdAtDate

                        if let readAtStr = readAtMap[notif.id] {
                            if let ms = Double(readAtStr) {
                                record["readAt"] = Date(timeIntervalSince1970: ms / 1000.0)
                            } else if let parsed = dateFormatter.date(from: readAtStr) {
                                record["readAt"] = parsed
                            }
                        } else {
                            record["readAt"] = nil
                        }

                        let attachmentsDict = NotificationParser.serializeAttachments(notif.attachments)
                        if let data = try? JSONSerialization.data(withJSONObject: attachmentsDict),
                           let string = String(data: data, encoding: .utf8) {
                            record["attachments"] = string
                        } else {
                            record["attachments"] = "[]"
                        }

                        let actionsDict = NotificationParser.serializeActions(notif.actions)
                        if let data = try? JSONSerialization.data(withJSONObject: actionsDict),
                           let string = String(data: data, encoding: .utf8) {
                            record["actions"] = string
                        } else {
                            record["actions"] = "[]"
                        }

                    return record
                }

                // EVENT: Notifications uploading (upload started, show progress bar)
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: records.count,
                    itemType: "notification",
                    phase: "uploading",
                    step: "sync_notifications"
                )
                
                self.core.save(
                    records: records,
                    progressCallback: { completed, total in
                        // EVENT: Notifications syncing (progress update - only called after successful chunk upload)
                        self.notifySyncProgress(
                            currentItem: completed,
                            totalItems: total,
                            itemType: "notification",
                            phase: "syncing",
                            step: "sync_notifications"
                        )
                    }
                ) { result in
                    switch result {
                    case .success:
                        syncedNotifications = records.count
                        // Don't store lastSyncDate for fullSync - we sync everything
                        // The incrementalSync uses the server change token for incremental updates

                        self.infoLog(
                            "Notifications phase completed",
                            metadata: [
                                "synced": syncedNotifications,
                                "totalLocal": notificationsToSync.count
                            ]
                        )
                        
                        // EVENT 9: Notifications phase completed
                        self.notifySyncProgress(
                            currentItem: syncedNotifications,
                            totalItems: syncedNotifications,
                            itemType: "notification",
                            phase: "completed",
                            step: "sync_notifications"
                        )

                        // Always perform cleanup after full sync
                        if let keepLimit = CloudKitManagerBase.cloudKitNotificationLimit {
                            // EVENT 10: CloudKit cleanup started
                            self.notifySyncProgress(
                                currentItem: 0,
                                totalItems: 0,
                                itemType: "",
                                phase: "starting",
                                step: "cleanup_old_notifications_cloudkit"
                            )
                            self.cleanupOldNotificationsFromCloudKit(keepLimit: keepLimit) { deletedCount, error in
                                if let error = error {
                                    self.errorLog("CloudKit cleanup failed", metadata: ["error": String(describing: error)])
                                } else {
                                    self.infoLog("CloudKit cleanup completed", metadata: ["deletedCount": deletedCount])
                                }
                                // EVENT 11: CloudKit cleanup completed
                                self.notifySyncProgress(
                                    currentItem: deletedCount,
                                    totalItems: deletedCount,
                                    itemType: "",
                                    phase: "completed",
                                    step: "cleanup_old_notifications_cloudkit"
                                )
                                
                                // EVENT 12: Database cleanup started
                                self.notifySyncProgress(
                                    currentItem: 0,
                                    totalItems: 0,
                                    itemType: "",
                                    phase: "starting",
                                    step: "cleanup_database"
                                )
                                
                                // Cleanup local database (tombstones, old data, etc.)
                                self.cleanupLocalDatabase { cleanupResult in
                                    switch cleanupResult {
                                    case .failure(let error):
                                        self.warnLog("Database cleanup failed (non-fatal)", metadata: ["error": String(describing: error)])
                                    case .success(let stats):
                                        self.infoLog("Database cleanup completed", metadata: ["stats": "\(stats)"])
                                    }
                                    
                                    // EVENT 13: Database cleanup completed
                                    self.notifySyncProgress(
                                        currentItem: 0,
                                        totalItems: 0,
                                        itemType: "",
                                        phase: "completed",
                                        step: "cleanup_database"
                                    )
                                    
                                    group.leave()
                                }
                            }
                        } else {
                            // EVENT 12: Database cleanup started (no CloudKit cleanup)
                            self.notifySyncProgress(
                                currentItem: 0,
                                totalItems: 0,
                                itemType: "",
                                phase: "starting",
                                step: "cleanup_database"
                            )
                            
                            // Cleanup local database
                            self.cleanupLocalDatabase { cleanupResult in
                                switch cleanupResult {
                                case .failure(let error):
                                    self.warnLog("Database cleanup failed (non-fatal)", metadata: ["error": String(describing: error)])
                                case .success(let stats):
                                    self.infoLog("Database cleanup completed", metadata: ["stats": "\(stats)"])
                                }
                                
                                // EVENT 13: Database cleanup completed
                                self.notifySyncProgress(
                                    currentItem: 0,
                                    totalItems: 0,
                                    itemType: "",
                                    phase: "completed",
                                    step: "cleanup_database"
                                )
                                
                                group.leave()
                            }
                        }
                    case .failure(let error):
                        errorOut = error
                        self.errorLog("Notifications phase failed", metadata: ["error": String(describing: error)])
                        // EVENT 14: Notifications phase failed
                        self.notifySyncProgress(
                            currentItem: 0,
                            totalItems: notificationsToSync.count,
                            itemType: "notification",
                            phase: "failed",
                            step: "sync_notifications"
                        )
                        group.leave()
                    }
                }
            }
        }

        group.notify(queue: self.syncQueue) {
            if let errorOut {
                self.warnLog("fullSync completed (failed)", metadata: ["error": String(describing: errorOut)])
                // EVENT 15: FullSync failed
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: 0,
                    itemType: "",
                    phase: "failed",
                    step: "full_sync"
                )
                completion(false, errorOut, nil)
                return
            }

            self.infoLog(
                "fullSync completed",
                metadata: [
                    "notificationsSynced": syncedNotifications,
                    "bucketsSynced": syncedBuckets
                ]
            )
            
            // EVENT 16: Token update started
            self.notifySyncProgress(
                currentItem: 0,
                totalItems: 0,
                itemType: "",
                phase: "starting",
                step: "update_server_token"
            )
            
            // Fetch zone changes to update server change token after full sync
            // This prevents iOS from receiving push notifications for records it just uploaded
            self.fetchIncrementalChanges { fetchResult in
                switch fetchResult {
                case .success(let changes):
                    // Token is automatically saved by fetchZoneChanges
                    // We ignore the changes since we just uploaded them
                    self.infoLog("Server change token updated after full sync", metadata: ["changesCount": "\(changes.count)"])
                    // EVENT 17: Token update completed
                    self.notifySyncProgress(
                        currentItem: changes.count,
                        totalItems: changes.count,
                        itemType: "",
                        phase: "completed",
                        step: "update_server_token"
                    )
                case .failure(let error):
                    // Log but don't fail the sync - token update is best effort
                    self.warnLog("Failed to update server change token after full sync", metadata: ["error": error.localizedDescription])
                    // EVENT 18: Token update failed (non-fatal)
                    self.notifySyncProgress(
                        currentItem: 0,
                        totalItems: 0,
                        itemType: "",
                        phase: "failed",
                        step: "update_server_token"
                    )
                }
                
                // PHASE: Restart subscriptions
                self.restartSubscriptions { subResult in
                    switch subResult {
                    case .failure(let error):
                        self.warnLog("Failed to restart subscriptions (non-fatal)", metadata: ["error": String(describing: error)])
                    case .success:
                        self.infoLog("Subscriptions restarted")
                    }
                    
                    // Save timestamp of iPhone full sync completion in shared UserDefaults
                    // This allows watch to detect if iPhone did full sync while watch was in background
                    let sharedDefaults = UserDefaults(suiteName: self.core.config.appGroupIdentifier)
                    sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "iphone_last_fullsync_timestamp")
                    sharedDefaults?.synchronize()
                    
                    // Notify watch to perform full sync
                    self.notifyWatchToFullSync()
                    
                    // EVENT 19: FullSync completed successfully
                    self.notifySyncProgress(
                        currentItem: syncedBuckets + syncedNotifications,
                        totalItems: syncedBuckets + syncedNotifications,
                        itemType: "",
                        phase: "completed",
                        step: "full_sync"
                    )
                    
                    completion(
                        true,
                        nil,
                        SyncStats(
                            notificationsSynced: syncedNotifications,
                            bucketsSynced: syncedBuckets,
                            notificationsUpdated: 0,
                            bucketsUpdated: 0
                        )
                    )
                }
            }
        }
    }
    
    private func restartSubscriptions(completion: @escaping (Result<Void, Error>) -> Void) {
        // EVENT: Restart subscriptions started
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "",
            phase: "starting",
            step: "restart_subscriptions"
        )
        
        // First ensure zone exists
        self.core.ensureZone { ensureZoneResult in
            switch ensureZoneResult {
            case .failure(let error):
                completion(.failure(error))
                return
            case .success:
                // Then setup subscriptions
                self.core.ensureSubscriptions(self.defaultSubscriptions()) { subResult in
                    switch subResult {
                    case .failure(let error):
                        // EVENT: Restart subscriptions failed
                        self.notifySyncProgress(
                            currentItem: 0,
                            totalItems: 0,
                            itemType: "",
                            phase: "failed",
                            step: "restart_subscriptions"
                        )
                        completion(.failure(error))
                    case .success:
                        // EVENT: Restart subscriptions completed
                        self.notifySyncProgress(
                            currentItem: 0,
                            totalItems: 0,
                            itemType: "",
                            phase: "completed",
                            step: "restart_subscriptions"
                        )
                        completion(.success(()))
                    }
                }
            }
        }
    }

    private func loadLastSyncDate() -> Date? {
        if let ts = UserDefaults.standard.object(forKey: lastSyncTimestampKey) as? TimeInterval {
            return Date(timeIntervalSince1970: ts)
        }
        if let date = UserDefaults.standard.object(forKey: lastSyncTimestampKey) as? Date {
            return date
        }
        return nil
    }

    private func storeLastSyncDate(_ date: Date) {
        UserDefaults.standard.set(date.timeIntervalSince1970, forKey: lastSyncTimestampKey)
        UserDefaults.standard.synchronize()
    }

    private func resetLastSyncDate() {
        UserDefaults.standard.removeObject(forKey: lastSyncTimestampKey)
        UserDefaults.standard.synchronize()
    }
    
    /// Notify watch to perform full sync after iPhone completes its sync
    /// Works in both foreground and background using sendMessage + updateApplicationContext
    private func notifyWatchToFullSync() {
        #if os(iOS)
        guard WCSession.isSupported() else {
            debugLog("WatchConnectivity not supported, skipping watch notification")
            return
        }
        
        let session = WCSession.default
        guard session.activationState == .activated, session.isPaired else {
            debugLog("Watch session not available, skipping watch notification")
            return
        }
        
        // Prepare message to send to watch
        let message: [String: Any] = [
            "type": "triggerFullSync",
            "timestamp": Date().timeIntervalSince1970
        ]
        
        // Always update application context first (works in background)
        // This ensures the watch receives the notification even if it's not reachable
        do {
            try session.updateApplicationContext(message)
            self.infoLog("Updated application context with full sync request")
        } catch {
            self.warnLog("Failed to update application context", metadata: ["error": error.localizedDescription])
        }
        
        // If watch is reachable, send message directly for immediate confirmation
        if session.isReachable {
            session.sendMessage(message, replyHandler: { reply in
                self.infoLog("Watch acknowledged full sync request", metadata: ["reply": "\(reply)"])
            }, errorHandler: { error in
                self.warnLog("Failed to send message to watch (non-fatal, context was updated)", metadata: ["error": error.localizedDescription])
            })
        } else {
            // Watch is not reachable, but we've updated the context
            // The watch will receive it when it becomes active
            self.infoLog("Watch not reachable, full sync request queued in application context")
        }
        #endif
    }


    private func fetchMostRecentNotificationDateFromCloudKit(completion: @escaping (Date?) -> Void) {
        core.queryRecords(
            recordType: Defaults.notificationRecordType,
            predicate: NSPredicate(value: true),
            sortDescriptors: [NSSortDescriptor(key: "createdAt", ascending: false)],
            resultsLimit: 1,
            desiredKeys: ["createdAt"]
        ) { result in
            switch result {
            case .failure:
                completion(nil)
            case .success(let records):
                completion(records.first?["createdAt"] as? Date)
            }
        }
    }
    
    /// Retry sending notifications to CloudKit that were saved by NSE but failed to send
    /// This is called at app startup to ensure all notifications are synced to CloudKit
    public func retryNSENotificationsToCloudKit(completion: @escaping (Int, Error?) -> Void) {
        guard isCloudKitEnabled else {
            completion(0, nil)
            return
        }
        
        let sharedDefaults = UserDefaults(suiteName: core.config.appGroupIdentifier)
        let lastSentNotificationId = sharedDefaults?.string(forKey: "lastNSENotificationSentToCloudKit")
        let lastSentTimestamp = sharedDefaults?.double(forKey: "lastNSENotificationSentTimestamp")
        let lastSentDate: Date
        if let ts = lastSentTimestamp, ts > 0 {
            lastSentDate = Date(timeIntervalSince1970: ts)
            infoLog("Retrying NSE notifications (cursor found)", metadata: [
                "lastSentNotificationId": lastSentNotificationId ?? "",
                "lastSentTimestamp": "\(ts)"
            ])
        } else {
            lastSentDate = Date().addingTimeInterval(-24 * 3600)
            infoLog("No NSE cursor found, pushing recent notifications from DB (last 24h)")
        }
        
        DatabaseAccess.getRecentNotifications(limit: 10000, unreadOnly: false, source: "PhoneCloudKit") { notifications in
            let notificationsToRetry: [WidgetNotification]
            if let lastId = lastSentNotificationId, lastSentTimestamp ?? 0 > 0 {
                notificationsToRetry = notifications.filter { notif in
                    notif.createdAtDate > lastSentDate || (notif.createdAtDate == lastSentDate && notif.id != lastId)
                }
            } else {
                notificationsToRetry = notifications.filter { notif in notif.createdAtDate > lastSentDate }
            }
            
            guard !notificationsToRetry.isEmpty else {
                self.infoLog("No notifications to retry from NSE")
                completion(0, nil)
                return
            }
            
            self.infoLog("Found notifications to retry from NSE", metadata: ["count": "\(notificationsToRetry.count)"])
            
            // Send notifications to CloudKit in batches
            self.ensureZoneOnlyReady { result in
                switch result {
                case .failure(let error):
                    self.errorLog("Failed to ensure zone for NSE retry", metadata: ["error": String(describing: error)])
                    completion(0, error)
                case .success:
                    let dateFormatter = ISO8601DateFormatter()
                    dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    
                    // Get readAt timestamps for all notifications
                    let ids = notificationsToRetry.map { $0.id }
                    DatabaseAccess.fetchReadAtTimestamps(notificationIds: ids, source: "PhoneCloudKit") { readAtMap in
                        let records: [CKRecord] = notificationsToRetry.map { notif in
                            let recordID = self.notificationRecordID(notif.id)
                            let record = CKRecord(recordType: Defaults.notificationRecordType, recordID: recordID)
                            record["id"] = notif.id
                            record["bucketId"] = notif.bucketId
                            record["title"] = notif.title
                            record["body"] = notif.body
                            record["subtitle"] = notif.subtitle
                            record["createdAt"] = notif.createdAtDate
                            
                            if let readAtStr = readAtMap[notif.id] {
                                if let ms = Double(readAtStr) {
                                    record["readAt"] = Date(timeIntervalSince1970: ms / 1000.0)
                                } else if let parsed = dateFormatter.date(from: readAtStr) {
                                    record["readAt"] = parsed
                                }
                            } else {
                                record["readAt"] = nil
                            }
                            
                            let attachmentsDict = NotificationParser.serializeAttachments(notif.attachments)
                            if let data = try? JSONSerialization.data(withJSONObject: attachmentsDict),
                               let string = String(data: data, encoding: .utf8) {
                                record["attachments"] = string
                            } else {
                                record["attachments"] = "[]"
                            }
                            
                            let actionsDict = NotificationParser.serializeActions(notif.actions)
                            if let data = try? JSONSerialization.data(withJSONObject: actionsDict),
                               let string = String(data: data, encoding: .utf8) {
                                record["actions"] = string
                            } else {
                                record["actions"] = "[]"
                            }
                            
                            return record
                        }
                        
                        // Save all records to CloudKit
                        self.core.save(records: records, savePolicy: .allKeys) { saveResult in
                            switch saveResult {
                            case .failure(let error):
                                self.errorLog("Failed to retry NSE notifications to CloudKit", metadata: ["error": String(describing: error), "count": "\(records.count)"])
                                completion(0, error)
                            case .success:
                                // Update cursor to the most recent notification
                                if let mostRecent = notificationsToRetry.max(by: { $0.createdAtDate < $1.createdAtDate }) {
                                    sharedDefaults?.set(mostRecent.id, forKey: "lastNSENotificationSentToCloudKit")
                                    sharedDefaults?.set(mostRecent.createdAtDate.timeIntervalSince1970, forKey: "lastNSENotificationSentTimestamp")
                                }
                                
                                self.infoLog("Successfully retried NSE notifications to CloudKit", metadata: ["count": "\(records.count)"])
                                completion(records.count, nil)
                            }
                        }
                    }
                }
            }
        }
    }

    private func cleanupLocalDatabase(completion: @escaping (Result<String, Error>) -> Void) {
        // Cleanup old tombstones (deleted notifications older than 30 days)
        // This is handled by the React Native side via cleanupOldDeletedTombstones
        // For now, we just log that cleanup should happen
        // In the future, we could call a native method to trigger this
        
        infoLog("Local database cleanup completed (handled by React Native side)")
        completion(.success("cleanup_completed"))
    }
    
    private func cleanupOldNotificationsFromCloudKit(keepLimit: Int, completion: @escaping (Int, Error?) -> Void) {
        guard keepLimit > 0 else {
            completion(0, nil)
            return
        }

        core.queryRecords(
            recordType: Defaults.notificationRecordType,
            predicate: NSPredicate(value: true),
            sortDescriptors: [NSSortDescriptor(key: "createdAt", ascending: false)],
            resultsLimit: nil,
            desiredKeys: ["createdAt"]
        ) { result in
            switch result {
            case .failure(let error):
                self.errorLog("Cleanup old notifications failed (query)", metadata: ["error": String(describing: error)])
                completion(0, error)
            case .success(let records):
                guard records.count > keepLimit else {
                    self.infoLog("Cleanup old notifications skipped", metadata: ["count": records.count, "keepLimit": keepLimit])
                    completion(0, nil)
                    return
                }

                let toDelete = records.dropFirst(keepLimit).map { $0.recordID }
                self.core.delete(recordIDs: Array(toDelete)) { deleteResult in
                    switch deleteResult {
                    case .failure(let error):
                        self.errorLog("Cleanup old notifications failed (delete)", metadata: ["error": String(describing: error), "toDelete": toDelete.count])
                        completion(0, error)
                    case .success:
                        self.infoLog("Cleanup old notifications completed", metadata: ["deleted": toDelete.count, "keepLimit": keepLimit])
                        completion(toDelete.count, nil)
                    }
                }
            }
        }
    }

    // MARK: - Verification helpers
    
    /// Update all CloudKit notification records that don't have readAt set
    /// This is useful for initializing or fixing records that are missing the readAt field
    /// 
    /// - Parameters:
    ///   - readAtValue: The value to set for readAt. If nil, explicitly sets readAt to nil (unread).
    ///                  If provided, sets all records to that timestamp (e.g., to mark all as read).
    ///   - completion: Called with the count of updated records and any error
    public func updateAllNotificationsWithoutReadAt(
        readAtValue: Date? = nil,
        completion: @escaping (Int, Error?) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(0, nil)
            return
        }
        
        ensureZoneOnlyReady { [weak self] result in
            guard let self = self else {
                completion(0, NSError(domain: "PhoneCloudKit", code: -1, userInfo: [NSLocalizedDescriptionKey: "Self deallocated"]))
                return
            }
            
            switch result {
            case .failure(let error):
                self.warnLog("updateAllNotificationsWithoutReadAt failed (ensureZone)", metadata: ["error": error.localizedDescription])
                completion(0, error)
            case .success:
                // Query all notifications from CloudKit
                // Note: CloudKit doesn't support direct "field is nil" predicates,
                // so we fetch all and filter client-side
                self.core.queryRecords(
                    recordType: Defaults.notificationRecordType,
                    predicate: NSPredicate(value: true),
                    sortDescriptors: [],
                    resultsLimit: nil,
                    desiredKeys: ["id", "readAt"] // Only fetch what we need
                ) { queryResult in
                    switch queryResult {
                    case .failure(let error):
                        self.warnLog("updateAllNotificationsWithoutReadAt query failed", metadata: ["error": error.localizedDescription])
                        completion(0, error)
                    case .success(let records):
                        // Filter records that don't have readAt set
                        // A record doesn't have readAt if:
                        // 1. The field is missing (nil in CKRecord)
                        // 2. The field exists but is nil
                        let recordsWithoutReadAt = records.filter { record in
                            let currentReadAt = record["readAt"] as? Date
                            // If we want to set to nil, include records that are nil or missing
                            // If we want to set to a value, only include records that are nil or missing
                            if readAtValue == nil {
                                return currentReadAt == nil
                            } else {
                                return currentReadAt == nil
                            }
                        }
                        
                        guard !recordsWithoutReadAt.isEmpty else {
                            self.infoLog("updateAllNotificationsWithoutReadAt: no records to update", metadata: ["totalRecords": records.count])
                            completion(0, nil)
                            return
                        }
                        
                        self.infoLog("updateAllNotificationsWithoutReadAt: found records to update", metadata: [
                            "totalRecords": records.count,
                            "recordsToUpdate": recordsWithoutReadAt.count
                        ])
                        
                        // Create update records with only readAt field changed
                        // This uses .changedKeys savePolicy to only update readAt
                        let recordsToSave: [CKRecord] = recordsWithoutReadAt.map { record in
                            // Create a new record with the same ID (CloudKit will merge)
                            let recordID = record.recordID
                            let updateRecord = CKRecord(recordType: Defaults.notificationRecordType, recordID: recordID)
                            updateRecord["readAt"] = readAtValue
                            return updateRecord
                        }
                        
                        // Save in batch (CloudKitManagerBase handles chunking automatically)
                        self.core.save(records: recordsToSave, savePolicy: .changedKeys) { saveResult in
                            switch saveResult {
                            case .failure(let error):
                                self.warnLog("updateAllNotificationsWithoutReadAt save failed", metadata: [
                                    "error": error.localizedDescription,
                                    "count": recordsToSave.count
                                ])
                                completion(0, error)
                            case .success:
                                self.infoLog("updateAllNotificationsWithoutReadAt completed", metadata: [
                                    "updatedCount": recordsToSave.count,
                                    "readAtValue": readAtValue != nil ? "set" : "nil"
                                ])
                                completion(recordsToSave.count, nil)
                            }
                        }
                    }
                }
            }
        }
    }

    public func fetchAllNotificationsFromCloudKit(completion: @escaping ([[String: Any]], Error?) -> Void) {
        core.queryRecords(
            recordType: Defaults.notificationRecordType,
            predicate: NSPredicate(value: true),
            sortDescriptors: [NSSortDescriptor(key: "createdAt", ascending: false)]
        ) { result in
            switch result {
            case .failure(let error):
                self.warnLog("fetchAllNotificationsFromCloudKit failed", metadata: ["error": error.localizedDescription])
                completion([], error)
            case .success(let records):
                self.infoLog("fetchAllNotificationsFromCloudKit success", metadata: ["count": records.count])
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

                var notifications: [[String: Any]] = []
                notifications.reserveCapacity(records.count)

                for record in records {
                    guard let id = record["id"] as? String,
                          let bucketId = record["bucketId"] as? String,
                          let title = record["title"] as? String,
                          let body = record["body"] as? String,
                          let createdAt = record["createdAt"] as? Date else {
                        continue
                    }

                    let subtitle = record["subtitle"] as? String
                    let readAt = record["readAt"] as? Date

                    var attachments: [[String: Any]] = []
                    if let attachmentsString = record["attachments"] as? String,
                       let attachmentsData = attachmentsString.data(using: .utf8),
                       let attachmentsArray = try? JSONSerialization.jsonObject(with: attachmentsData) as? [[String: Any]] {
                        attachments = attachmentsArray
                    }

                    var actions: [[String: Any]] = []
                    if let actionsString = record["actions"] as? String,
                       let actionsData = actionsString.data(using: .utf8),
                       let actionsArray = try? JSONSerialization.jsonObject(with: actionsData) as? [[String: Any]] {
                        actions = actionsArray
                    }

                    var dict: [String: Any] = [
                        "id": id,
                        "bucketId": bucketId,
                        "title": title,
                        "body": body,
                        "createdAt": formatter.string(from: createdAt),
                        "isRead": readAt != nil,
                        "attachments": attachments,
                        "actions": actions
                    ]

                    if let subtitle {
                        dict["subtitle"] = subtitle
                    }

                    if let readAt {
                        dict["readAt"] = formatter.string(from: readAt)
                    }

                    notifications.append(dict)
                }

                completion(notifications, nil)
            }
        }
    }

    public func fetchAllBucketsFromCloudKit(completion: @escaping ([[String: Any]], Error?) -> Void) {
        core.queryRecords(
            recordType: Defaults.bucketRecordType,
            predicate: NSPredicate(value: true),
            sortDescriptors: [NSSortDescriptor(key: "name", ascending: true)]
        ) { result in
            switch result {
            case .failure(let error):
                self.warnLog("fetchAllBucketsFromCloudKit failed", metadata: ["error": error.localizedDescription])
                completion([], error)
            case .success(let records):
                self.infoLog("fetchAllBucketsFromCloudKit success", metadata: ["count": records.count])
                var buckets: [[String: Any]] = []
                buckets.reserveCapacity(records.count)
                for record in records {
                    guard let id = record["id"] as? String,
                          let name = record["name"] as? String else {
                        continue
                    }

                    var dict: [String: Any] = [
                        "id": id,
                        "name": name,
                        "unreadCount": 0
                    ]
                    if let iconUrl = record["iconUrl"] as? String {
                        dict["iconUrl"] = iconUrl
                    }
                    if let color = record["color"] as? String {
                        dict["color"] = color
                    }
                    buckets.append(dict)
                }
                completion(buckets, nil)
            }
        }
    }

    // MARK: - Incremental (events only; no DB apply)

    public func syncFromCloudKitIncremental(fullSync: Bool, completion: @escaping (Int, Error?) -> Void) {
        guard Self.isWatchSupported else {
            completion(0, NSError(domain: "PhoneCloudKit", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch not supported or not paired"]))
            return
        }
        if fullSync {
            resetIncrementalToken()
        }

        fetchIncrementalChanges { result in
            switch result {
            case .failure(let error):
                completion(0, error)
            case .success(let changes):
                completion(changes.count, nil)
            }
        }
    }
}

#endif
