//
//  PhoneSyncEngineCKSync.swift
//  ZentikShared
//
//  CKSyncEngine integration for iOS. SQLite is the source of truth.
//  Requires iOS 17+.
//

#if os(iOS) && canImport(CloudKit)

import Foundation
import CloudKit
import UserNotifications

/// CKSyncEngine-based sync for iOS. SQLite is the source of truth.
@available(iOS 17.0, *)
public final class PhoneSyncEngineCKSync: NSObject {

    public static let shared = PhoneSyncEngineCKSync()

    private static let stateSerializationKey = "cksyncengine_state_serialization"

    public var isCloudKitEnabled: Bool {
        CloudKitManagerBase.isCloudKitEnabled
    }

    private let config = CloudKitManagerBase.makeDefaultConfiguration()
    private let container: CKContainer
    private let database: CKDatabase
    private let zoneID: CKRecordZone.ID

    private var _syncEngine: CKSyncEngine?
    private let syncEngineLock = NSLock()

    private var serverRecordCache: [CKRecord.ID: CKRecord] = [:]
    private let serverRecordCacheLock = NSLock()

    private var conflictRetryCount: [CKRecord.ID: Int] = [:]
    private let conflictRetryCountLock = NSLock()
    private let maxConflictRetries = 1

    private static let ckSyncCursorKey = "cksyncengine_ck_sync_cursor"

    public var syncEngine: CKSyncEngine? {
        syncEngineLock.lock()
        defer { syncEngineLock.unlock() }
        return _syncEngine
    }

    private func setSyncEngine(_ engine: CKSyncEngine?) {
        syncEngineLock.lock()
        _syncEngine = engine
        syncEngineLock.unlock()
    }

    private func infoLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: message, metadata: metadata, source: "PhoneSyncEngineCKSync")
    }

    private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: message, metadata: metadata, source: "PhoneSyncEngineCKSync")
    }

    private func errorLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: message, metadata: metadata, source: "PhoneSyncEngineCKSync")
    }

    private var lastKnownStateSerialization: CKSyncEngine.State.Serialization? {
        get {
            guard let data = (UserDefaults(suiteName: config.appGroupIdentifier) ?? UserDefaults.standard)
                .data(forKey: Self.stateSerializationKey) else { return nil }
            return try? PropertyListDecoder().decode(CKSyncEngine.State.Serialization.self, from: data)
        }
        set {
            guard let serialization = newValue else {
                (UserDefaults(suiteName: config.appGroupIdentifier) ?? UserDefaults.standard)
                    .removeObject(forKey: Self.stateSerializationKey)
                return
            }
            if let data = try? PropertyListEncoder().encode(serialization) {
                (UserDefaults(suiteName: config.appGroupIdentifier) ?? UserDefaults.standard)
                    .set(data, forKey: Self.stateSerializationKey)
            }
        }
    }

    private override init() {
        self.container = CKContainer(identifier: config.containerIdentifier)
        self.database = container.privateCloudDatabase
        self.zoneID = CKRecordZone.ID(zoneName: config.zoneName, ownerName: CKCurrentUserDefaultName)
        super.init()
    }

    public func initialize() {
        guard config.appGroupIdentifier.isEmpty == false else { return }
        Task {
            await initializeSyncEngine()
        }
    }

    private var lastCKSyncCursor: Date? {
        get {
            let defaults = UserDefaults(suiteName: config.appGroupIdentifier) ?? .standard
            let ts = defaults.double(forKey: Self.ckSyncCursorKey)
            return ts > 0 ? Date(timeIntervalSince1970: ts) : nil
        }
        set {
            let defaults = UserDefaults(suiteName: config.appGroupIdentifier) ?? .standard
            if let date = newValue {
                defaults.set(date.timeIntervalSince1970, forKey: Self.ckSyncCursorKey)
            } else {
                defaults.removeObject(forKey: Self.ckSyncCursorKey)
            }
        }
    }

    private func initializeSyncEngine() async {
        let engine: CKSyncEngine
        var configuration = CKSyncEngine.Configuration(
            database: database,
            stateSerialization: lastKnownStateSerialization,
            delegate: self
        )
        configuration.automaticallySync = true
        engine = CKSyncEngine(configuration)
        setSyncEngine(engine)
        infoLog("CKSyncEngine initialized")
    }

    public func addPendingNotification(notificationId: String) {
        guard let engine = syncEngine else { return }
        let recordID = CKRecord.ID(recordName: "Notification-\(notificationId)", zoneID: zoneID)
        engine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
        infoLog("Added pending notification", metadata: ["notificationId": notificationId])
    }

    public func addPendingBucket(bucketId: String) {
        guard let engine = syncEngine else { return }
        let recordID = CKRecord.ID(recordName: "Bucket-\(bucketId)", zoneID: zoneID)
        engine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
        infoLog("Added pending bucket", metadata: ["bucketId": bucketId])
    }

    public func addPendingReadStatusChange(notificationId: String) {
        addPendingNotification(notificationId: notificationId)
    }

    public func addPendingDeletion(notificationId: String) {
        guard let engine = syncEngine else { return }
        let recordID = CKRecord.ID(recordName: "Notification-\(notificationId)", zoneID: zoneID)
        engine.state.add(pendingRecordZoneChanges: [.deleteRecord(recordID)])
        infoLog("Added pending deletion", metadata: ["notificationId": notificationId])
    }

    public func triggerFullSyncToCloud(completion: @escaping (Bool, Int, Int, Error?) -> Void) {
        guard isCloudKitEnabled, let engine = syncEngine else {
            completion(true, 0, 0, nil)
            return
        }
        let limit = CloudKitManagerBase.cloudKitNotificationLimit ?? 10000
        DatabaseAccess.getAllBuckets(source: "PhoneSyncEngineCKSync") { buckets in
            DatabaseAccess.getRecentNotifications(limit: limit, unreadOnly: false, source: "PhoneSyncEngineCKSync") { notifications in
                for b in buckets {
                    let recordID = CKRecord.ID(recordName: "Bucket-\(b.id)", zoneID: self.zoneID)
                    engine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
                }
                for n in notifications {
                    let recordID = CKRecord.ID(recordName: "Notification-\(n.id)", zoneID: self.zoneID)
                    engine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
                }
                self.infoLog("Full sync to Cloud queued", metadata: ["buckets": buckets.count, "notifications": notifications.count])
                self.sendChangesNow { error in
                    if let error {
                        self.errorLog("Full sync to Cloud failed", metadata: ["error": error.localizedDescription])
                    } else {
                        self.infoLog("Full sync to Cloud completed", metadata: ["buckets": buckets.count, "notifications": notifications.count])
                    }
                    completion(error == nil, buckets.count, notifications.count, error)
                }
            }
        }
    }

    public func addPendingForRecentNotifications(limit: Int = 5, completion: ((Int, Error?) -> Void)? = nil) {
        guard isCloudKitEnabled, let engine = syncEngine else {
            completion?(0, nil)
            return
        }
        let cursor = self.lastCKSyncCursor
        DatabaseAccess.getRecentNotifications(limit: limit, unreadOnly: false, source: "PhoneSyncEngineCKSync") { notifications in
            let unsynced: [WidgetNotification]
            if let cursor {
                unsynced = notifications.filter { $0.createdAtDate > cursor }
            } else {
                unsynced = notifications
            }
            for n in unsynced {
                let recordID = CKRecord.ID(recordName: "Notification-\(n.id)", zoneID: self.zoneID)
                engine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
            }
            if unsynced.count > 0 {
                self.infoLog("Added pending for NSE notifications", metadata: [
                    "count": unsynced.count,
                    "skippedByCursor": notifications.count - unsynced.count
                ])
            } else if notifications.count > 0 {
                self.infoLog("All recent notifications already synced (cursor up to date)", metadata: ["checked": notifications.count])
            }
            self.lastCKSyncCursor = Date()
            if unsynced.isEmpty {
                completion?(0, nil)
            } else {
                self.sendChangesNow { completion?(unsynced.count, $0) }
            }
        }
    }

    public func updateNotificationsReadStatusInCloudKit(notificationIds: [String], readAt: Date?, completion: @escaping (Bool, Error?) -> Void) {
        guard isCloudKitEnabled else {
            completion(true, nil)
            return
        }
        for id in notificationIds {
            addPendingReadStatusChange(notificationId: id)
        }
        infoLog("Queued read status update to CK", metadata: ["count": notificationIds.count, "isRead": readAt != nil])
        sendChangesNow { error in
            if let error {
                self.errorLog("Read status CK sync failed", metadata: ["error": error.localizedDescription, "count": notificationIds.count])
            }
            completion(error == nil, error)
        }
    }

    public func deleteNotificationFromCloudKit(notificationId: String, completion: @escaping (Bool, Error?) -> Void) {
        guard isCloudKitEnabled else {
            completion(true, nil)
            return
        }
        addPendingDeletion(notificationId: notificationId)
        infoLog("Queued deletion to CK", metadata: ["notificationId": notificationId])
        sendChangesNow { error in
            if let error {
                self.errorLog("Deletion CK sync failed", metadata: ["error": error.localizedDescription, "notificationId": notificationId])
            }
            completion(error == nil, error)
        }
    }

    public func deleteNotificationsFromCloudKit(notificationIds: [String], completion: @escaping (Bool, Int, Error?) -> Void) {
        guard isCloudKitEnabled else {
            completion(true, 0, nil)
            return
        }
        for id in notificationIds {
            addPendingDeletion(notificationId: id)
        }
        infoLog("Queued batch deletion to CK", metadata: ["count": notificationIds.count])
        sendChangesNow { error in
            if let error {
                self.errorLog("Batch deletion CK sync failed", metadata: ["error": error.localizedDescription, "count": notificationIds.count])
            }
            completion(error == nil, notificationIds.count, error)
        }
    }

    public func fetchChangesNow(completion: ((Error?) -> Void)? = nil) {
        Task {
            do {
                try await syncEngine?.fetchChanges()
                completion?(nil)
            } catch {
                errorLog("fetchChanges failed", metadata: ["error": error.localizedDescription])
                completion?(error)
            }
        }
    }

    public func sendChangesNow(completion: ((Error?) -> Void)? = nil) {
        Task {
            do {
                try await syncEngine?.sendChanges()
                completion?(nil)
            } catch let error as CKError where error.code == .partialFailure {
                // Partial failures (e.g. serverRecordChanged) are already handled by the delegate.
                // Don't propagate them to callers - the delegate retries or accepts server versions.
                completion?(nil)
            } catch {
                errorLog("sendChanges failed", metadata: ["error": error.localizedDescription])
                completion?(error)
            }
        }
    }

    // MARK: - Record builders (pre-fetched data, no blocking)

    private func buildNotificationRecord(from recordID: CKRecord.ID, notification n: WidgetNotification, readAtTimestamp: String?) -> CKRecord {
        let record = consumeCachedServerRecord(for: recordID) ?? CKRecord(recordType: "Notifications", recordID: recordID)
        record["id"] = n.id
        record["bucketId"] = n.bucketId
        record["title"] = n.title
        record["body"] = n.body
        record["subtitle"] = n.subtitle
        record["createdAt"] = n.createdAtDate

        if let readAtStr = readAtTimestamp {
            if let readAtMs = Int64(readAtStr) {
                record["readAt"] = Date(timeIntervalSince1970: Double(readAtMs) / 1000.0)
            } else {
                let iso = ISO8601DateFormatter()
                iso.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = iso.date(from: readAtStr) {
                    record["readAt"] = date
                } else {
                    let isoBasic = ISO8601DateFormatter()
                    isoBasic.formatOptions = [.withInternetDateTime]
                    record["readAt"] = isoBasic.date(from: readAtStr)
                }
            }
        } else {
            record["readAt"] = nil
        }

        if let attachmentsData = try? JSONSerialization.data(withJSONObject: NotificationParser.serializeAttachments(n.attachments)),
           let s = String(data: attachmentsData, encoding: .utf8) {
            record["attachments"] = s
        } else {
            record["attachments"] = "[]"
        }
        if let actionsData = try? JSONSerialization.data(withJSONObject: NotificationParser.serializeActions(n.actions)),
           let s = String(data: actionsData, encoding: .utf8) {
            record["actions"] = s
        } else {
            record["actions"] = "[]"
        }
        return record
    }

    private func buildBucketRecord(from recordID: CKRecord.ID, bucket b: WidgetBucket) -> CKRecord {
        let record = consumeCachedServerRecord(for: recordID) ?? CKRecord(recordType: "Buckets", recordID: recordID)
        record["id"] = b.id
        record["name"] = b.name
        record["color"] = b.color
        record["iconUrl"] = b.iconUrl
        return record
    }
}

@available(iOS 17.0, *)
extension PhoneSyncEngineCKSync: CKSyncEngineDelegate {

    public func handleEvent(_ event: CKSyncEngine.Event, syncEngine: CKSyncEngine) async {
        switch event {
        case .stateUpdate(let event):
            lastKnownStateSerialization = event.stateSerialization

        case .accountChange(let event):
            switch event.changeType {
            case .signIn:
                infoLog("Account signed in")
            case .signOut:
                lastKnownStateSerialization = nil
                lastCKSyncCursor = nil
                infoLog("Account signed out")
            case .switchAccounts:
                lastKnownStateSerialization = nil
                lastCKSyncCursor = nil
                infoLog("Account switched")
            @unknown default:
                break
            }

        case .fetchedRecordZoneChanges(let event):
            applyFetchedRecordZoneChanges(event)

        case .fetchedDatabaseChanges(let event):
            for deletion in event.deletions {
                if deletion.zoneID.zoneName == config.zoneName {
                    warnLog("Zone deleted from server - full sync may be needed")
                }
            }

        case .sentRecordZoneChanges(let event):
            handleSentRecordZoneChanges(event, syncEngine: syncEngine)

        case .willFetchChanges, .willFetchRecordZoneChanges, .didFetchRecordZoneChanges, .didFetchChanges,
             .willSendChanges, .didSendChanges:
            break

        case .sentDatabaseChanges:
            break

        @unknown default:
            infoLog("Unknown event received")
        }
    }

    public func nextRecordZoneChangeBatch(_ context: CKSyncEngine.SendChangesContext, syncEngine: CKSyncEngine) async -> CKSyncEngine.RecordZoneChangeBatch? {
        let scope = context.options.scope
        let changes = syncEngine.state.pendingRecordZoneChanges.filter { scope.contains($0) }
        guard !changes.isEmpty else { return nil }

        let saveRecordIDs = changes.compactMap { change -> CKRecord.ID? in
            if case .saveRecord(let recordID) = change { return recordID }
            return nil
        }
        let uncachedRecordIDs = saveRecordIDs.filter { !hasCachedServerRecord(for: $0) }
        if !uncachedRecordIDs.isEmpty {
            await prefetchRecordsFromCloud(recordIDs: uncachedRecordIDs)
        }

        let notificationIds = changes.compactMap { change -> String? in
            if case .saveRecord(let recordID) = change, recordID.recordName.hasPrefix("Notification-") {
                return recordID.recordName.replacingOccurrences(of: "Notification-", with: "")
            }
            return nil
        }
        let bucketIds = changes.compactMap { change -> String? in
            if case .saveRecord(let recordID) = change, recordID.recordName.hasPrefix("Bucket-") {
                return recordID.recordName.replacingOccurrences(of: "Bucket-", with: "")
            }
            return nil
        }

        let limit = CloudKitManagerBase.cloudKitNotificationLimit ?? 10000
        let notifications = await withCheckedContinuation { (continuation: CheckedContinuation<[WidgetNotification], Never>) in
            DatabaseAccess.getRecentNotifications(limit: limit, unreadOnly: false, source: "PhoneSyncEngineCKSync") { result in
                continuation.resume(returning: result)
            }
        }
        let buckets = await withCheckedContinuation { (continuation: CheckedContinuation<[WidgetBucket], Never>) in
            DatabaseAccess.getAllBuckets(source: "PhoneSyncEngineCKSync") { result in
                continuation.resume(returning: result)
            }
        }
        let readAtMap: [String: String] = notificationIds.isEmpty ? [:] : await withCheckedContinuation { (continuation: CheckedContinuation<[String: String], Never>) in
            DatabaseAccess.fetchReadAtTimestamps(notificationIds: notificationIds, source: "PhoneSyncEngineCKSync") { result in
                continuation.resume(returning: result)
            }
        }

        let notificationsById = Dictionary(notifications.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })
        let bucketsById = Dictionary(buckets.map { ($0.id, $0) }, uniquingKeysWith: { first, _ in first })

        return await CKSyncEngine.RecordZoneChangeBatch(pendingChanges: changes) { [weak self] recordID in
            guard let self else { return nil }
            if recordID.recordName.hasPrefix("Notification-") {
                let id = recordID.recordName.replacingOccurrences(of: "Notification-", with: "")
                guard let n = notificationsById[id] else { return nil }
                return self.buildNotificationRecord(from: recordID, notification: n, readAtTimestamp: readAtMap[id])
            }
            if recordID.recordName.hasPrefix("Bucket-") {
                let id = recordID.recordName.replacingOccurrences(of: "Bucket-", with: "")
                guard let b = bucketsById[id] else { return nil }
                return self.buildBucketRecord(from: recordID, bucket: b)
            }
            return nil
        }
    }

    private func applyFetchedRecordZoneChanges(_ event: CKSyncEngine.Event.FetchedRecordZoneChanges) {
        var modifiedNotificationIds: [String] = []
        var deletedNotificationIds: [String] = []
        var modifiedBucketIds: [String] = []

        let pendingSaveRecordIDs: Set<CKRecord.ID> = {
            guard let engine = syncEngine else { return [] }
            return Set(engine.state.pendingRecordZoneChanges.compactMap { change in
                if case .saveRecord(let recordID) = change { return recordID }
                return nil
            })
        }()

        for modification in event.modifications {
            let record = modification.record

            if pendingSaveRecordIDs.contains(record.recordID) || hasActiveConflict(for: record.recordID) {
                infoLog("Skipping fetched record (pending local save)", metadata: ["recordID": record.recordID.recordName])
                cacheServerRecord(record)
                continue
            }

            cacheServerRecord(record)
            if record.recordType == "Notifications" {
                applyNotificationToSQLite(record)
                if let id = record["id"] as? String { modifiedNotificationIds.append(id) }
            } else if record.recordType == "Buckets" {
                applyBucketToSQLite(record)
                if let id = record["id"] as? String { modifiedBucketIds.append(id) }
            }
        }
        for deletion in event.deletions {
            if deletion.recordID.recordName.hasPrefix("Notification-") {
                let id = deletion.recordID.recordName.replacingOccurrences(of: "Notification-", with: "")
                deletedNotificationIds.append(id)
                DatabaseAccess.deleteNotification(notificationId: id, source: "PhoneSyncEngineCKSync") { success in
                    if success {
                        self.infoLog("Applied remote deletion to SQLite", metadata: ["notificationId": id])
                    } else {
                        self.errorLog("Failed to apply remote deletion to SQLite", metadata: ["notificationId": id])
                    }
                }
            }
        }

        if !modifiedNotificationIds.isEmpty || !deletedNotificationIds.isEmpty || !modifiedBucketIds.isEmpty {
            infoLog("Applied remote changes from CK to SQLite", metadata: [
                "modifiedNotifications": modifiedNotificationIds.count,
                "deletedNotifications": deletedNotificationIds.count,
                "modifiedBuckets": modifiedBucketIds.count
            ])

            let userInfo: [AnyHashable: Any] = [
                "changedNotificationIds": modifiedNotificationIds,
                "deletedNotificationIds": deletedNotificationIds,
                "changedBucketIds": modifiedBucketIds
            ]
            DispatchQueue.main.async {
                NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil, userInfo: userInfo)
            }

            if !modifiedNotificationIds.isEmpty || !deletedNotificationIds.isEmpty {
                updateAppBadge()
            }
        }
    }

    private func applyNotificationToSQLite(_ record: CKRecord) {
        guard let id = record["id"] as? String,
              let bucketId = record["bucketId"] as? String,
              let title = record["title"] as? String,
              let body = record["body"] as? String,
              let createdAt = record["createdAt"] as? Date else {
            return
        }
        let readAt = record["readAt"] as? Date
        let subtitle = record["subtitle"] as? String
        let attachments = (record["attachments"] as? String).flatMap { data in
            (try? JSONSerialization.jsonObject(with: data.data(using: .utf8) ?? Data())) as? [[String: Any]]
        } ?? []
        let actions = (record["actions"] as? String).flatMap { data in
            (try? JSONSerialization.jsonObject(with: data.data(using: .utf8) ?? Data())) as? [[String: Any]]
        } ?? []

        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let createdAtStr = formatter.string(from: createdAt)

        let readStatus = readAt != nil ? "read" : "unread"
        infoLog("Applying remote notification to SQLite", metadata: ["id": id, "status": readStatus])

        DatabaseAccess.upsertNotificationFromCloudKit(
            id: id,
            bucketId: bucketId,
            title: title,
            body: body,
            subtitle: subtitle,
            createdAt: createdAtStr,
            readAt: readAt,
            attachments: attachments,
            actions: actions,
            source: "PhoneSyncEngineCKSync"
        ) { success in
            if !success {
                self.errorLog("Failed to apply remote notification to SQLite", metadata: ["id": id])
            }
        }
    }

    private func applyBucketToSQLite(_ record: CKRecord) {
        guard let id = record["id"] as? String,
              let name = record["name"] as? String else {
            return
        }
        let color = record["color"] as? String
        let iconUrl = record["iconUrl"] as? String

        DatabaseAccess.upsertBucketFromCloudKit(
            id: id,
            name: name,
            color: color,
            iconUrl: iconUrl,
            source: "PhoneSyncEngineCKSync"
        ) { success in
            if !success {
                self.errorLog("Failed to apply remote bucket to SQLite", metadata: ["id": id])
            }
        }
    }

    private func updateAppBadge() {
        DatabaseAccess.getNotificationCount(source: "PhoneSyncEngineCKSync") { unreadCount in
            DispatchQueue.main.async {
                UNUserNotificationCenter.current().setBadgeCount(unreadCount) { error in
                    if let error {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to update badge", metadata: ["error": error.localizedDescription], source: "PhoneSyncEngineCKSync")
                    }
                }
            }
            KeychainAccess.saveBadgeCountToKeychain(count: unreadCount)
        }
    }

    private func cacheServerRecord(_ record: CKRecord) {
        serverRecordCacheLock.lock()
        serverRecordCache[record.recordID] = record
        serverRecordCacheLock.unlock()
    }

    private func consumeCachedServerRecord(for recordID: CKRecord.ID) -> CKRecord? {
        serverRecordCacheLock.lock()
        defer { serverRecordCacheLock.unlock() }
        return serverRecordCache.removeValue(forKey: recordID)
    }

    private func hasCachedServerRecord(for recordID: CKRecord.ID) -> Bool {
        serverRecordCacheLock.lock()
        defer { serverRecordCacheLock.unlock() }
        return serverRecordCache[recordID] != nil
    }

    private func prefetchRecordsFromCloud(recordIDs: [CKRecord.ID]) async {
        for recordID in recordIDs {
            do {
                let record = try await database.record(for: recordID)
                cacheServerRecord(record)
            } catch {
                // Record doesn't exist on CloudKit yet - will create new
            }
        }
    }

    private func hasActiveConflict(for recordID: CKRecord.ID) -> Bool {
        conflictRetryCountLock.lock()
        defer { conflictRetryCountLock.unlock() }
        return (conflictRetryCount[recordID] ?? 0) > 0
    }

    private func incrementConflictRetry(for recordID: CKRecord.ID) -> Int {
        conflictRetryCountLock.lock()
        defer { conflictRetryCountLock.unlock() }
        let count = (conflictRetryCount[recordID] ?? 0) + 1
        conflictRetryCount[recordID] = count
        return count
    }

    private func clearConflictRetry(for recordID: CKRecord.ID) {
        conflictRetryCountLock.lock()
        conflictRetryCount.removeValue(forKey: recordID)
        conflictRetryCountLock.unlock()
    }

    private func handleSentRecordZoneChanges(_ event: CKSyncEngine.Event.SentRecordZoneChanges, syncEngine: CKSyncEngine) {
        for savedRecord in event.savedRecords {
            clearConflictRetry(for: savedRecord.recordID)
            cacheServerRecord(savedRecord)
        }
        if !event.savedRecords.isEmpty {
            let notifCount = event.savedRecords.filter { $0.recordType == "Notifications" }.count
            let bucketCount = event.savedRecords.filter { $0.recordType == "Buckets" }.count
            infoLog("Records sent to CK", metadata: ["notifications": notifCount, "buckets": bucketCount])
        }
        if !event.deletedRecordIDs.isEmpty {
            for deletedID in event.deletedRecordIDs {
                clearConflictRetry(for: deletedID)
            }
            infoLog("Records deleted from CK", metadata: ["count": event.deletedRecordIDs.count])
        }
        for failedRecordSave in event.failedRecordSaves {
            let recordID = failedRecordSave.record.recordID
            switch failedRecordSave.error.code {
            case .serverRecordChanged:
                if let serverRecord = failedRecordSave.error.serverRecord {
                    let retryCount = incrementConflictRetry(for: recordID)
                    if retryCount <= maxConflictRetries {
                        cacheServerRecord(serverRecord)
                        syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
                        warnLog("Server record conflict - will retry with server etag (local data preserved)", metadata: ["recordID": recordID.recordName, "retry": retryCount])
                    } else {
                        clearConflictRetry(for: recordID)
                        if serverRecord.recordType == "Notifications" {
                            applyNotificationToSQLite(serverRecord)
                        } else if serverRecord.recordType == "Buckets" {
                            applyBucketToSQLite(serverRecord)
                        }
                        infoLog("Server record conflict - accepted server version after max retries", metadata: ["recordID": recordID.recordName])
                    }
                }
            case .zoneNotFound:
                syncEngine.state.add(pendingDatabaseChanges: [.saveZone(CKRecordZone(zoneID: self.zoneID))])
                syncEngine.state.add(pendingRecordZoneChanges: [.saveRecord(recordID)])
                warnLog("Zone not found - recreating", metadata: ["recordID": recordID.recordName])
            default:
                errorLog("Record save failed", metadata: [
                    "recordID": recordID.recordName,
                    "error": failedRecordSave.error.localizedDescription
                ])
            }
        }
    }
}

#endif
