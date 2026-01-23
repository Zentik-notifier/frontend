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

    public func ensureReady(completion: @escaping (Result<Void, Error>) -> Void) {
        infoLog("ensureReady starting")
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
                            // Fresh zone: reset local cursors so we don't skip uploads,
                            // then bootstrap a full SQLite -> CloudKit sync.
                            self.infoLog("Fresh zone detected; resetting cursors and bootstrapping full sync")
                            self.core.resetServerChangeToken()
                            self.resetLastSyncDate()
                            self.bootstrapFullSyncAfterZoneCreation()
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

    // MARK: - Incremental

    public func fetchIncrementalChanges(completion: @escaping (Result<[CloudKitManagerBase.ZoneChange], Error>) -> Void) {
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
                completion(false, error)
            case .success:
                completion(true, nil)
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
        guard isCloudKitEnabled else {
            warnLog("triggerSyncToCloud skipped (CloudKit disabled)")
            completion(false, nil, nil)
            return
        }

        infoLog("triggerSyncToCloud starting")

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
        let group = DispatchGroup()

        infoLog("fullSync starting (SQLite -> CloudKit)")

        var syncedNotifications = 0
        var syncedBuckets = 0
        var errorOut: Error?

        // 1) Sync buckets
        group.enter()
        DatabaseAccess.getAllBuckets(source: "PhoneCloudKit") { buckets in
            self.infoLog("Buckets phase starting", metadata: ["localBuckets": buckets.count])
            
            // Notify sync starting
            self.notifySyncProgress(
                currentItem: 0,
                totalItems: buckets.count,
                itemType: "bucket",
                phase: "starting",
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

            self.infoLog("Buckets records created, calling core.save", metadata: ["recordsCount": records.count])
            
            self.core.save(
                records: records,
                progressCallback: { completed, total in
                    self.infoLog("Buckets save progress", metadata: ["completed": completed, "total": total])
                    // Notify progress for each batch saved
                    self.notifySyncProgress(
                        currentItem: completed,
                        totalItems: total,
                        itemType: "bucket",
                        phase: "syncing",
                        step: "sync_buckets"
                    )
                }
            ) { result in
                self.infoLog("Buckets save callback invoked")
                switch result {
                case .success:
                    syncedBuckets = records.count
                    self.infoLog("Buckets phase completed", metadata: ["synced": syncedBuckets])
                    // Notify buckets phase completed
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
                }
                group.leave()
            }
        }

        // 2) Sync notifications
        group.enter()
        self.fetchMostRecentNotificationDateFromCloudKit { mostRecentDate in
            let lastSyncDate = self.loadLastSyncDate() ?? Date(timeIntervalSince1970: 0)
            let cutoff = max(lastSyncDate, mostRecentDate ?? Date(timeIntervalSince1970: 0))

            self.infoLog(
                "Notifications phase starting",
                metadata: [
                    "cutoff": cutoff.timeIntervalSince1970,
                    "hasMostRecentCloudDate": mostRecentDate != nil,
                    "hasLastSyncDate": self.loadLastSyncDate() != nil
                ]
            )

            DatabaseAccess.getRecentNotifications(limit: 10000, unreadOnly: false, source: "PhoneCloudKit") { notifications in
                var filtered = notifications.filter { $0.createdAtDate > cutoff }

                if let limit = CloudKitManagerBase.cloudKitNotificationLimit, filtered.count > limit {
                    filtered.sort { $0.createdAtDate > $1.createdAtDate }
                    filtered = Array(filtered.prefix(limit))
                }

                guard !filtered.isEmpty else {
                    self.infoLog("Notifications phase completed (nothing to sync)")
                    // Notify no notifications to sync
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
                
                // Notify sync starting
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: filtered.count,
                    itemType: "notification",
                    phase: "starting",
                    step: "sync_notifications"
                )

                let ids = filtered.map { $0.id }
                DatabaseAccess.fetchReadAtTimestamps(notificationIds: ids, source: "PhoneCloudKit") { readAtMap in
                    let dateFormatter = ISO8601DateFormatter()
                    dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

                    let records: [CKRecord] = filtered.map { notif in
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

                    self.infoLog("Notification records created, calling core.save", metadata: ["recordsCount": records.count])
                    
                    self.core.save(
                        records: records,
                        progressCallback: { completed, total in
                            self.infoLog("Notifications save progress", metadata: ["completed": completed, "total": total])
                            // Notify progress for each batch saved
                            self.notifySyncProgress(
                                currentItem: completed,
                                totalItems: total,
                                itemType: "notification",
                                phase: "syncing",
                                step: "sync_notifications"
                            )
                        }
                    ) { result in
                        self.infoLog("Notifications save callback invoked")
                        switch result {
                        case .success:
                            syncedNotifications = records.count
                            self.storeLastSyncDate(Date())

                            self.infoLog(
                                "Notifications phase completed",
                                metadata: [
                                    "synced": syncedNotifications,
                                    "filteredLocal": filtered.count
                                ]
                            )
                            
                            // Notify notifications phase completed
                            self.notifySyncProgress(
                                currentItem: syncedNotifications,
                                totalItems: syncedNotifications,
                                itemType: "notification",
                                phase: "completed",
                                step: "sync_notifications"
                            )

                            if let keepLimit = CloudKitManagerBase.cloudKitNotificationLimit {
                                self.cleanupOldNotificationsFromCloudKit(keepLimit: keepLimit) { _, _ in
                                    group.leave()
                                }
                            } else {
                                group.leave()
                            }
                        case .failure(let error):
                            errorOut = error
                            self.errorLog("Notifications phase failed", metadata: ["error": String(describing: error)])
                            group.leave()
                        }
                    }
                }
            }
        }

        group.notify(queue: self.syncQueue) {
            if let errorOut {
                self.warnLog("fullSync completed (failed)", metadata: ["error": String(describing: errorOut)])
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
            
            // Fetch zone changes to update server change token after full sync
            // This prevents iOS from receiving push notifications for records it just uploaded
            self.fetchIncrementalChanges { fetchResult in
                switch fetchResult {
                case .success(let changes):
                    // Token is automatically saved by fetchZoneChanges
                    // We ignore the changes since we just uploaded them
                    self.infoLog("Server change token updated after full sync", metadata: ["changesCount": "\(changes.count)"])
                case .failure(let error):
                    // Log but don't fail the sync - token update is best effort
                    self.warnLog("Failed to update server change token after full sync", metadata: ["error": error.localizedDescription])
                }
                
                // Notify watch to perform full sync
                self.notifyWatchToFullSync()
                
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
    private func notifyWatchToFullSync() {
        #if os(iOS)
        guard WCSession.isSupported() else {
            debugLog("WatchConnectivity not supported, skipping watch notification")
            return
        }
        
        let session = WCSession.default
        guard session.activationState == .activated, session.isReachable || session.isPaired else {
            debugLog("Watch session not available, skipping watch notification")
            return
        }
        
        // Send message to watch to trigger full sync
        let message: [String: Any] = [
            "type": "triggerFullSync",
            "timestamp": Date().timeIntervalSince1970
        ]
        
        session.sendMessage(message, replyHandler: { reply in
            self.infoLog("Watch acknowledged full sync request", metadata: ["reply": "\(reply)"])
        }, errorHandler: { error in
            self.warnLog("Failed to notify watch to full sync", metadata: ["error": error.localizedDescription])
        })
        #endif
    }

    private func bootstrapFullSyncAfterZoneCreation() {
        // Do not block app startup; run best-effort in the sync queue.
        syncQueue.async {
            self.triggerSyncToCloudInternal { success, error, stats in
                if success {
                    self.infoLog("✅ Zone created: bootstrap full sync completed notifications=\(stats?.notificationsSynced ?? 0) buckets=\(stats?.bucketsSynced ?? 0)")
                } else {
                    self.warnLog("⚠️ Zone created: bootstrap full sync failed error=\(error?.localizedDescription ?? "Unknown error")")
                }
            }
        }
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

    private func cleanupOldNotificationsFromCloudKit(keepLimit: Int, completion: @escaping (Int, Error?) -> Void) {
        guard keepLimit > 0 else {
            completion(0, nil)
            return
        }

        infoLog("Cleanup old notifications starting", metadata: ["keepLimit": keepLimit])

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

    public func fetchAllNotificationsFromCloudKit(completion: @escaping ([[String: Any]], Error?) -> Void) {
        core.queryRecords(
            recordType: Defaults.notificationRecordType,
            predicate: NSPredicate(value: true),
            sortDescriptors: [NSSortDescriptor(key: "createdAt", ascending: false)]
        ) { result in
            switch result {
            case .failure(let error):
                completion([], error)
            case .success(let records):
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
                completion([], error)
            case .success(let records):
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
