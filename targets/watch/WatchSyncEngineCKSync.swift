//
//  WatchSyncEngineCKSync.swift
//  ZentikShared
//
//  CKSyncEngine integration for watchOS. WatchDataStore (JSON cache) is the source of truth.
//  Requires watchOS 10+.
//

#if os(watchOS) && canImport(CloudKit)

import Foundation
import CloudKit

/// CKSyncEngine-based sync for watchOS. WatchDataStore is the source of truth.
@available(watchOS 10.0, *)
public final class WatchSyncEngineCKSync: NSObject {

    public static let shared = WatchSyncEngineCKSync()

    private static let stateSerializationKey = "cksyncengine_watch_state_serialization"

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
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: message, metadata: metadata, source: "WatchSyncEngineCKSync")
    }

    private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: message, metadata: metadata, source: "WatchSyncEngineCKSync")
    }

    private func errorLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: message, metadata: metadata, source: "WatchSyncEngineCKSync")
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

    public func fetchChangesNow(completion: ((Error?) -> Void)? = nil) {
        Task {
            do {
                try await syncEngine?.fetchChanges()
                completion?(nil)
            } catch {
                completion?(error)
            }
        }
    }

    public func resetStateAndFetchFullSync(completion: @escaping (Error?) -> Void) {
        lastKnownStateSerialization = nil
        setSyncEngine(nil)
        Task {
            await initializeSyncEngine()
            fetchChangesNow { completion($0) }
        }
    }

    private func initializeSyncEngine() async {
        var configuration = CKSyncEngine.Configuration(
            database: database,
            stateSerialization: lastKnownStateSerialization,
            delegate: self
        )
        configuration.automaticallySync = true
        let engine = CKSyncEngine(configuration)
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

    public func updateNotificationsReadStatusInCloudKit(notificationIds: [String], readAt: Date?, completion: @escaping (Bool, Int, Error?) -> Void) {
        guard isCloudKitEnabled else {
            completion(true, 0, nil)
            return
        }
        for id in notificationIds {
            setReadAtOverride(notificationId: id, readAt: readAt)
            addPendingReadStatusChange(notificationId: id)
        }
        infoLog("Queued read status update to CK", metadata: ["count": notificationIds.count, "isRead": readAt != nil])
        sendChangesNow { error in
            if let error {
                self.warnLog("Read status CK sync failed", metadata: ["error": error.localizedDescription, "count": notificationIds.count])
            }
            completion(error == nil, notificationIds.count, error)
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
                self.warnLog("Deletion CK sync failed", metadata: ["error": error.localizedDescription, "notificationId": notificationId])
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
                self.warnLog("Batch deletion CK sync failed", metadata: ["error": error.localizedDescription, "count": notificationIds.count])
            }
            completion(error == nil, notificationIds.count, error)
        }
    }

    public func sendChangesNow(completion: ((Error?) -> Void)? = nil) {
        Task {
            do {
                try await syncEngine?.sendChanges()
                completion?(nil)
            } catch let error as CKError where error.code == .partialFailure {
                completion?(nil)
            } catch {
                warnLog("sendChanges failed", metadata: ["error": error.localizedDescription])
                completion?(error)
            }
        }
    }

    private var readAtOverrides: [String: Date?] = [:]
    private let readAtOverridesLock = NSLock()

    private func setReadAtOverride(notificationId: String, readAt: Date?) {
        readAtOverridesLock.lock()
        readAtOverrides[notificationId] = readAt
        readAtOverridesLock.unlock()
    }

    private func consumeReadAtOverride(notificationId: String) -> Date?? {
        readAtOverridesLock.lock()
        defer { readAtOverridesLock.unlock() }
        if let override = readAtOverrides.removeValue(forKey: notificationId) {
            return override
        }
        return nil
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

    private func buildNotificationRecord(from recordID: CKRecord.ID, notificationId: String) -> CKRecord? {
        let cache = WatchDataStore.shared.loadCache()
        guard let n = cache.notifications.first(where: { $0.id == notificationId }) else { return nil }

        let record = consumeCachedServerRecord(for: recordID) ?? CKRecord(recordType: "Notifications", recordID: recordID)
        record["id"] = n.id
        record["bucketId"] = n.bucketId
        record["title"] = n.title
        record["body"] = n.body
        record["subtitle"] = n.subtitle
        record["createdAt"] = createdAtDate(from: n.createdAt)

        if let override = consumeReadAtOverride(notificationId: notificationId) {
            record["readAt"] = override
        } else {
            record["readAt"] = n.isRead ? Date() : nil
        }

        if let attachmentsData = try? JSONSerialization.data(withJSONObject: serializeCachedAttachments(n.attachments)),
           let s = String(data: attachmentsData, encoding: .utf8) {
            record["attachments"] = s
        } else {
            record["attachments"] = "[]"
        }
        if let actionsData = try? JSONSerialization.data(withJSONObject: serializeCachedActions(n.actions)),
           let s = String(data: actionsData, encoding: .utf8) {
            record["actions"] = s
        } else {
            record["actions"] = "[]"
        }
        return record
    }

    private func buildBucketRecord(from recordID: CKRecord.ID, bucketId: String) -> CKRecord? {
        let cache = WatchDataStore.shared.loadCache()
        guard let b = cache.buckets.first(where: { $0.id == bucketId }) else { return nil }

        let record = consumeCachedServerRecord(for: recordID) ?? CKRecord(recordType: "Buckets", recordID: recordID)
        record["id"] = b.id
        record["name"] = b.name
        record["color"] = b.color
        record["iconUrl"] = b.iconUrl
        return record
    }

    private func serializeCachedAttachments(_ attachments: [WatchDataStore.CachedAttachment]) -> [[String: Any]] {
        attachments.map { a in
            var d: [String: Any] = ["mediaType": a.mediaType]
            if let url = a.url { d["url"] = url }
            if let name = a.name { d["name"] = name }
            return d
        }
    }

    private func serializeCachedActions(_ actions: [WatchDataStore.CachedAction]) -> [[String: Any]] {
        actions.map { a in
            var d: [String: Any] = ["type": a.type, "label": a.label]
            if let v = a.value { d["value"] = v }
            if let id = a.id { d["id"] = id }
            if let url = a.url { d["url"] = url }
            if let bucketId = a.bucketId { d["bucketId"] = bucketId }
            if let minutes = a.minutes { d["minutes"] = minutes }
            return d
        }
    }

    private func createdAtDate(from iso8601String: String) -> Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.date(from: iso8601String)
            ?? ISO8601DateFormatter().date(from: iso8601String)
            ?? .distantPast
    }
}

@available(watchOS 10.0, *)
extension WatchSyncEngineCKSync: CKSyncEngineDelegate {

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
                infoLog("Account signed out")
            case .switchAccounts:
                lastKnownStateSerialization = nil
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

        return await CKSyncEngine.RecordZoneChangeBatch(pendingChanges: changes) { [weak self] recordID in
            guard let self else { return nil }
            if recordID.recordName.hasPrefix("Notification-") {
                let id = recordID.recordName.replacingOccurrences(of: "Notification-", with: "")
                return self.buildNotificationRecord(from: recordID, notificationId: id)
            }
            if recordID.recordName.hasPrefix("Bucket-") {
                let id = recordID.recordName.replacingOccurrences(of: "Bucket-", with: "")
                return self.buildBucketRecord(from: recordID, bucketId: id)
            }
            return nil
        }
    }

    private func applyFetchedRecordZoneChanges(_ event: CKSyncEngine.Event.FetchedRecordZoneChanges) {
        let dataStore = WatchDataStore.shared
        var cache = dataStore.loadCache()
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

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
            if record.recordType == "Buckets" {
                applyBucketToWatchCache(record, cache: &cache)
                if let id = record["id"] as? String { modifiedBucketIds.append(id) }
            }
        }
        for modification in event.modifications {
            let record = modification.record
            if pendingSaveRecordIDs.contains(record.recordID) || hasActiveConflict(for: record.recordID) {
                continue
            }
            cacheServerRecord(record)
            if record.recordType == "Notifications" {
                applyNotificationToWatchCache(record, cache: &cache, dateFormatter: dateFormatter)
                if let id = record["id"] as? String {
                    modifiedNotificationIds.append(id)
                    let readAt = record["readAt"] as? Date
                    infoLog("Applied remote notification to Watch cache", metadata: ["id": id, "status": readAt != nil ? "read" : "unread"])
                }
            }
        }

        for deletion in event.deletions {
            if deletion.recordID.recordName.hasPrefix("Notification-") {
                let id = deletion.recordID.recordName.replacingOccurrences(of: "Notification-", with: "")
                cache.notifications.removeAll(where: { $0.id == id })
                deletedNotificationIds.append(id)
                infoLog("Applied remote deletion to Watch cache", metadata: ["notificationId": id])
            } else if deletion.recordID.recordName.hasPrefix("Bucket-") {
                let id = deletion.recordID.recordName.replacingOccurrences(of: "Bucket-", with: "")
                cache.buckets.removeAll(where: { $0.id == id })
            }
        }

        cache.unreadCount = cache.notifications.filter { !$0.isRead }.count
        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            WatchDataStore.CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }
        cache.lastUpdate = Date()

        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        if cache.notifications.count > maxLimit {
            cache.notifications.sort { parseCreatedAt($0.createdAt) > parseCreatedAt($1.createdAt) }
            cache.notifications = Array(cache.notifications.prefix(maxLimit))
        }

        dataStore.saveCache(cache)

        if !modifiedNotificationIds.isEmpty || !deletedNotificationIds.isEmpty || !modifiedBucketIds.isEmpty {
            infoLog("Applied remote changes from CK to Watch cache", metadata: [
                "modifiedNotifications": modifiedNotificationIds.count,
                "deletedNotifications": deletedNotificationIds.count,
                "modifiedBuckets": modifiedBucketIds.count
            ])
        }

        let userInfo: [AnyHashable: Any] = [
            "changedNotificationIds": modifiedNotificationIds,
            "deletedNotificationIds": deletedNotificationIds,
            "changedBucketIds": modifiedBucketIds,
            "cacheNotificationCount": cache.notifications.count,
            "cacheBucketCount": cache.buckets.count,
            "lastUpdateTimestamp": cache.lastUpdate.timeIntervalSince1970
        ]
        NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil, userInfo: userInfo)
    }

    private func parseCreatedAt(_ value: String) -> Date {
        let iso8601Fractional = ISO8601DateFormatter()
        iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso8601NoFractional = ISO8601DateFormatter()
        iso8601NoFractional.formatOptions = [.withInternetDateTime]
        if let d = iso8601Fractional.date(from: value) { return d }
        if let d = iso8601NoFractional.date(from: value) { return d }
        return .distantPast
    }

    private func applyNotificationToWatchCache(_ record: CKRecord, cache: inout WatchDataStore.WatchCache, dateFormatter: ISO8601DateFormatter) {
        guard let id = record["id"] as? String,
              let bucketId = record["bucketId"] as? String,
              let title = record["title"] as? String,
              let body = record["body"] as? String,
              let createdAt = record["createdAt"] as? Date else {
            return
        }
        let readAt = record["readAt"] as? Date
        let isRead = readAt != nil
        let subtitle = record["subtitle"] as? String
        let createdAtStr = dateFormatter.string(from: createdAt)

        var attachments: [WatchDataStore.CachedAttachment] = []
        if let attachmentsString = record["attachments"] as? String,
           let attachmentsData = attachmentsString.data(using: .utf8),
           let attachmentsArray = try? JSONSerialization.jsonObject(with: attachmentsData) as? [[String: Any]] {
            attachments = attachmentsArray.compactMap { dict in
                guard let mediaType = dict["mediaType"] as? String else { return nil }
                return WatchDataStore.CachedAttachment(
                    mediaType: mediaType,
                    url: dict["url"] as? String,
                    name: dict["name"] as? String
                )
            }
        }

        var actions: [WatchDataStore.CachedAction] = []
        if let actionsString = record["actions"] as? String,
           let actionsData = actionsString.data(using: .utf8),
           let actionsArray = try? JSONSerialization.jsonObject(with: actionsData) as? [[String: Any]] {
            actions = actionsArray.compactMap { dict in
                guard let type = dict["type"] as? String else { return nil }
                return WatchDataStore.CachedAction(
                    type: type,
                    label: dict["label"] as? String ?? "",
                    value: dict["value"] as? String,
                    id: dict["id"] as? String,
                    url: dict["url"] as? String,
                    bucketId: dict["bucketId"] as? String,
                    minutes: dict["minutes"] as? Int
                )
            }
        }

        let bucket = cache.buckets.first(where: { $0.id == bucketId })
        let notification = WatchDataStore.CachedNotification(
            id: id,
            title: title,
            body: body,
            subtitle: subtitle,
            createdAt: createdAtStr,
            isRead: isRead,
            bucketId: bucketId,
            bucketName: bucket?.name,
            bucketColor: bucket?.color,
            bucketIconUrl: bucket?.iconUrl,
            attachments: attachments,
            actions: actions
        )

        if let idx = cache.notifications.firstIndex(where: { $0.id == id }) {
            cache.notifications[idx] = notification
        } else {
            cache.notifications.append(notification)
        }
        infoLog("Applied notification to WatchDataStore", metadata: ["id": id])
    }

    private func applyBucketToWatchCache(_ record: CKRecord, cache: inout WatchDataStore.WatchCache) {
        guard let id = record["id"] as? String,
              let name = record["name"] as? String else {
            return
        }
        let color = record["color"] as? String
        let iconUrl = record["iconUrl"] as? String

        let bucket = WatchDataStore.CachedBucket(
            id: id,
            name: name,
            unreadCount: 0,
            color: color,
            iconUrl: iconUrl
        )

        if let idx = cache.buckets.firstIndex(where: { $0.id == id }) {
            cache.buckets[idx] = bucket
        } else {
            cache.buckets.append(bucket)
        }
        infoLog("Applied bucket to WatchDataStore", metadata: ["id": id])
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
                        var cache = WatchDataStore.shared.loadCache()
                        let dateFormatter = ISO8601DateFormatter()
                        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        if serverRecord.recordType == "Notifications" {
                            applyNotificationToWatchCache(serverRecord, cache: &cache, dateFormatter: dateFormatter)
                        } else if serverRecord.recordType == "Buckets" {
                            applyBucketToWatchCache(serverRecord, cache: &cache)
                        }
                        WatchDataStore.shared.saveCache(cache)
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
