import Foundation
import CloudKit

/// Core CloudKit primitives shared by iOS / watchOS / NSE / NCE.
///
/// Notes
/// - This is intentionally "low level": zone/token/subscriptions + chunked modify operations.
/// - Higher-level orchestration (full sync, applying DB patches, etc.) lives in PhoneCloudKit / WatchCloudKit.
public final class CloudKitManagerBase: NSObject {

    public struct Configuration {
        public let containerIdentifier: String
        public let zoneName: String
        public let maxBatchSize: Int
        public let appGroupIdentifier: String

        public init(
            containerIdentifier: String,
            zoneName: String = "ZentikNotificationsData",
            maxBatchSize: Int = 350,
            appGroupIdentifier: String
        ) {
            self.containerIdentifier = containerIdentifier
            self.zoneName = zoneName
            self.maxBatchSize = maxBatchSize
            self.appGroupIdentifier = appGroupIdentifier
        }
    }

    public struct SubscriptionSpec {
        public let id: String
        public let recordType: String
        public let predicate: NSPredicate
        public let options: CKQuerySubscription.Options

        public init(
            id: String,
            recordType: String,
            predicate: NSPredicate = NSPredicate(value: true),
            options: CKQuerySubscription.Options = [.firesOnRecordCreation, .firesOnRecordUpdate, .firesOnRecordDeletion]
        ) {
            self.id = id
            self.recordType = recordType
            self.predicate = predicate
            self.options = options
        }
    }

    public enum ZoneChange {
        case changed(CKRecord)
        case deleted(recordID: CKRecord.ID, recordType: String?)
    }

    public static let cloudKitInitialSyncCompletedKey = "cloudkit_initial_sync_completed"

    // CloudKit debug logging (default: false)
    private static let cloudKitDebugEnabledKey = "cloudkit_debug_enabled"

    private static func resolveDefaults(appGroupIdentifier: String?) -> UserDefaults {
        if let appGroupIdentifier, let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) {
            return sharedDefaults
        }
        return UserDefaults.standard
    }

    public static func isCloudKitDebugEnabled(appGroupIdentifier: String? = nil) -> Bool {
        let resolvedAppGroupId = appGroupIdentifier ?? resolveDefaultAppGroupIdentifier()
        return resolveDefaults(appGroupIdentifier: resolvedAppGroupId).bool(forKey: cloudKitDebugEnabledKey)
    }

    public static func setCloudKitDebugEnabled(_ enabled: Bool) {
        let appGroupId = resolveDefaultAppGroupIdentifier()
        let defaults = resolveDefaults(appGroupIdentifier: appGroupId)
        defaults.set(enabled, forKey: cloudKitDebugEnabledKey)
        defaults.synchronize()
    }

    // CloudKit notification limit (nil = unlimited, default: nil for backward compatibility)
    private static let cloudKitNotificationLimitKey = "cloudkit_notification_limit"
    public static var cloudKitNotificationLimit: Int? {
        get {
            let value = UserDefaults.standard.integer(forKey: cloudKitNotificationLimitKey)
            return value > 0 ? value : nil
        }
        set {
            if let limit = newValue {
                UserDefaults.standard.set(limit, forKey: cloudKitNotificationLimitKey)
            } else {
                UserDefaults.standard.removeObject(forKey: cloudKitNotificationLimitKey)
            }
            UserDefaults.standard.synchronize()
        }
    }

    private static let cloudKitDisabledKey = "cloudkit_disabled"

    public let config: Configuration
    public let container: CKContainer
    public let privateDatabase: CKDatabase

    public var zoneID: CKRecordZone.ID {
        CKRecordZone.ID(zoneName: config.zoneName, ownerName: CKCurrentUserDefaultName)
    }

    private var logSource: String {
        #if os(iOS)
        return "CloudKitCoreIos"
        #elseif os(watchOS)
        return "CloudKitCoreWatch"
        #else
        return "CloudKitCore"
        #endif
    }

    private func infoLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: message, metadata: metadata, source: logSource)
    }

    private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: message, metadata: metadata, source: logSource)
    }

    private func debugLog(_ message: String, metadata: [String: Any]? = nil) {
        guard CloudKitManagerBase.isCloudKitDebugEnabled(appGroupIdentifier: config.appGroupIdentifier) else {
            return
        }
        LoggingSystem.shared.log(level: "DEBUG", tag: "CloudKit", message: message, metadata: metadata, source: logSource)
    }

    private func logError(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: message, metadata: metadata, source: logSource)
    }

    private var sharedUserDefaults: UserDefaults? {
        UserDefaults(suiteName: config.appGroupIdentifier)
    }

    private var lastChangeTokenKey: String {
        "cloudkit_last_change_token_\(config.containerIdentifier)"
    }

    /// CloudKit is enabled by default unless explicitly disabled.
    public var isCloudKitEnabled: Bool {
        guard let sharedDefaults = sharedUserDefaults else {
            return !UserDefaults.standard.bool(forKey: CloudKitManagerBase.cloudKitDisabledKey)
        }
        if sharedDefaults.object(forKey: CloudKitManagerBase.cloudKitDisabledKey) == nil {
            return true
        }
        return !sharedDefaults.bool(forKey: CloudKitManagerBase.cloudKitDisabledKey)
    }

    public static func setCloudKitDisabled(_ disabled: Bool) {
        let appGroupId = resolveDefaultAppGroupIdentifier()
        if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
            sharedDefaults.set(disabled, forKey: cloudKitDisabledKey)
            sharedDefaults.synchronize()
        } else {
            UserDefaults.standard.set(disabled, forKey: cloudKitDisabledKey)
            UserDefaults.standard.synchronize()
        }
    }

    public static func setCloudKitEnabled(_ enabled: Bool) {
        setCloudKitDisabled(!enabled)
    }

    /// Uses the app's production iCloud container by default (strips `.dev`).
    public static func makeDefaultConfiguration(
        zoneName: String = "ZentikNotificationsData",
        maxBatchSize: Int = 350
    ) -> Configuration {
        let containerId: String

        // Allow override for local testing
        let overrideKey = "cloudkit_container_override"
        if let overrideContainerId = UserDefaults.standard.string(forKey: overrideKey), !overrideContainerId.isEmpty {
            containerId = overrideContainerId
        } else {
            var bundleId = resolveMainBundleIdentifier()
            if bundleId.hasSuffix(".dev") {
                bundleId = String(bundleId.dropLast(4))
            }
            containerId = "iCloud.\(bundleId)"
        }

        let appGroupId = resolveDefaultAppGroupIdentifier()

        return Configuration(
            containerIdentifier: containerId,
            zoneName: zoneName,
            maxBatchSize: maxBatchSize,
            appGroupIdentifier: appGroupId
        )
    }

    public init(configuration: Configuration = CloudKitManagerBase.makeDefaultConfiguration()) {
        self.config = configuration
        self.container = CKContainer(identifier: configuration.containerIdentifier)
        self.privateDatabase = self.container.privateCloudDatabase
        super.init()

        infoLog(
            "CloudKitManagerBase initialized",
            metadata: [
                "containerId": configuration.containerIdentifier,
                "zoneName": configuration.zoneName,
                "maxBatchSize": configuration.maxBatchSize,
                "appGroupId": configuration.appGroupIdentifier
            ]
        )
    }

    // MARK: - Zone

    /// Ensures the custom zone exists.
    /// - Returns: `true` if the zone was created now, `false` if it already existed.
    public func ensureZoneWithStatus(completion: @escaping (Result<Bool, Error>) -> Void) {
        guard isCloudKitEnabled else {
            completion(.success(false))
            return
        }

        infoLog("ensureZone starting", metadata: ["zoneName": config.zoneName])

        privateDatabase.fetch(withRecordZoneID: zoneID) { _, fetchError in
            if fetchError == nil {
                self.infoLog("ensureZone completed (already exists)", metadata: ["zoneName": self.config.zoneName])
                completion(.success(false))
                return
            }

            if let ckError = fetchError as? CKError, ckError.code == .zoneNotFound || ckError.code == .userDeletedZone {
                let zone = CKRecordZone(zoneID: self.zoneID)
                self.privateDatabase.save(zone) { _, saveError in
                    if let saveError {
                        // Another device/thread may have created it concurrently.
                        // Some SDKs don't expose a dedicated "zone already exists" error code,
                        // so we fallback to a fetch check.
                        self.privateDatabase.fetch(withRecordZoneID: self.zoneID) { _, refetchError in
                            if refetchError == nil {
                                completion(.success(false))
                                return
                            }

                            self.logError("ensureZone save failed error=\(String(describing: saveError))")
                            completion(.failure(saveError))
                        }
                        return

                    }
                    self.infoLog("ensureZone completed (created)", metadata: ["zoneName": self.config.zoneName])
                    completion(.success(true))
                }
                return
            }

            self.logError("ensureZone fetch failed error=\(String(describing: fetchError))")
            completion(.failure(fetchError!))
        }
    }

    public func ensureZone(completion: @escaping (Result<Void, Error>) -> Void) {
        ensureZoneWithStatus { result in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let error):
                completion(.failure(error))
            }
        }
    }

    public func deleteZone(completion: @escaping (Result<Void, Error>) -> Void) {
        guard isCloudKitEnabled else {
            completion(.success(()))
            return
        }

        privateDatabase.delete(withRecordZoneID: zoneID) { _, error in
            if let error {
                self.logCloudKitError("deleteZone failed", error: error)
                completion(.failure(error))
                return
            }
            completion(.success(()))
        }
    }

    // MARK: - Token

    public func loadServerChangeToken() -> CKServerChangeToken? {
        guard let defaults = sharedUserDefaults else { return nil }
        guard let data = defaults.data(forKey: lastChangeTokenKey) else { return nil }
        do {
            return try NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: data)
        } catch {
            warnLog("Failed to decode server change token", metadata: ["error": String(describing: error)])
            return nil
        }
    }

    public func storeServerChangeToken(_ token: CKServerChangeToken?) {
        guard let defaults = sharedUserDefaults else { return }

        if let token {
            do {
                let data = try NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true)
                defaults.set(data, forKey: lastChangeTokenKey)
            } catch {
                warnLog("Failed to encode server change token", metadata: ["error": String(describing: error)])
            }
        } else {
            defaults.removeObject(forKey: lastChangeTokenKey)
        }

        defaults.synchronize()
    }

    public func resetServerChangeToken() {
        storeServerChangeToken(nil)
    }

    // MARK: - Incremental changes (Zone Changes)

    private func isRecoverableZonePurgeError(_ error: Error) -> Bool {
        // When a user purges the zone, CloudKit may invalidate the server change token and/or
        // report the zone as deleted. In these cases we should reset the token and retry.
        if let ckError = error as? CKError {
            switch ckError.code {
            case .userDeletedZone, .zoneNotFound, .changeTokenExpired:
                return true
            case .partialFailure:
                // Some operations report per-item failures (e.g. per-zone) under partialFailure.
                if let partial = ckError.partialErrorsByItemID {
                    for (_, itemError) in partial {
                        if isRecoverableZonePurgeError(itemError) {
                            return true
                        }
                    }
                }
                return false
            default:
                break
            }
        }

        // Fallback: match human-readable descriptions (works across iOS/watchOS SDKs).
        let nsError = error as NSError
        let candidates: [String] = [
            (nsError.userInfo[NSLocalizedDescriptionKey] as? String) ?? "",
            String(describing: error)
        ]
        for text in candidates {
            let lower = text.lowercased()
            if lower.contains("zone was purged") || lower.contains("user deleted zone") {
                return true
            }
        }

        return false
    }

    /// Fetches zone changes using the stored server change token.
    /// Returns record changes and deletions. Callers decide how to apply them.
    public func fetchZoneChanges(completion: @escaping (Result<[ZoneChange], Error>) -> Void) {
        fetchZoneChangesInternal(hasRetriedAfterZoneReset: false, completion: completion)
    }

    private func fetchZoneChangesInternal(
        hasRetriedAfterZoneReset: Bool,
        completion: @escaping (Result<[ZoneChange], Error>) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(.success([]))
            return
        }

        let previousToken = loadServerChangeToken()
        var changes: [ZoneChange] = []

        infoLog(
            "fetchZoneChanges starting",
            metadata: [
                "zoneName": config.zoneName,
                "hasPreviousToken": previousToken != nil
            ]
        )

        let op = CKFetchRecordZoneChangesOperation()
        op.recordZoneIDs = [zoneID]

        var configurations: [CKRecordZone.ID: CKFetchRecordZoneChangesOperation.ZoneConfiguration] = [:]
        configurations[zoneID] = CKFetchRecordZoneChangesOperation.ZoneConfiguration(
            previousServerChangeToken: previousToken,
            resultsLimit: nil,
            desiredKeys: nil
        )
        op.configurationsByRecordZoneID = configurations

        op.recordWasChangedBlock = { _, result in
            switch result {
            case .success(let record):
                changes.append(.changed(record))
            case .failure:
                // Ignore per-record failures
                break
            }
        }

        op.recordWithIDWasDeletedBlock = { recordID, recordType in
            changes.append(.deleted(recordID: recordID, recordType: recordType))
        }

        op.recordZoneChangeTokensUpdatedBlock = { _, token, _ in
            // Persist intermediate tokens to reduce replay work on long syncs
            self.storeServerChangeToken(token)
        }

        var zoneFetchError: Error?
        op.recordZoneFetchResultBlock = { _, result in
            switch result {
            case .success(let payload):
                self.storeServerChangeToken(payload.serverChangeToken)
            case .failure(let error):
                zoneFetchError = error
                self.logCloudKitError("fetchZoneChanges zone fetch failed", error: error)
            }
        }

        op.fetchRecordZoneChangesResultBlock = { result in
            if let zoneFetchError {
                if !hasRetriedAfterZoneReset, self.isRecoverableZonePurgeError(zoneFetchError) {
                    self.warnLog(
                        "fetchZoneChanges detected purged/deleted zone; resetting token and retrying",
                        metadata: [
                            "zoneName": self.config.zoneName,
                            "hasPreviousToken": previousToken != nil,
                            "error": String(describing: zoneFetchError)
                        ]
                    )
                    self.resetServerChangeToken()
                    self.ensureZone { ensureResult in
                        switch ensureResult {
                        case .failure(let ensureError):
                            completion(.failure(ensureError))
                        case .success:
                            self.fetchZoneChangesInternal(hasRetriedAfterZoneReset: true, completion: completion)
                        }
                    }
                    return
                }

                completion(.failure(zoneFetchError))
                return
            }

            switch result {
            case .success:
                let changedCount = changes.reduce(0) { count, change in
                    if case .changed = change { return count + 1 }
                    return count
                }
                let deletedCount = changes.reduce(0) { count, change in
                    if case .deleted = change { return count + 1 }
                    return count
                }
                self.infoLog(
                    "fetchZoneChanges completed",
                    metadata: [
                        "zoneName": self.config.zoneName,
                        "total": changes.count,
                        "changed": changedCount,
                        "deleted": deletedCount
                    ]
                )
                completion(.success(changes))
            case .failure(let error):
                if !hasRetriedAfterZoneReset, self.isRecoverableZonePurgeError(error) {
                    self.warnLog(
                        "fetchZoneChanges failed due to purged/deleted zone; resetting token and retrying",
                        metadata: [
                            "zoneName": self.config.zoneName,
                            "hasPreviousToken": previousToken != nil,
                            "error": String(describing: error)
                        ]
                    )
                    self.resetServerChangeToken()
                    self.ensureZone { ensureResult in
                        switch ensureResult {
                        case .failure(let ensureError):
                            completion(.failure(ensureError))
                        case .success:
                            self.fetchZoneChangesInternal(hasRetriedAfterZoneReset: true, completion: completion)
                        }
                    }
                    return
                }

                self.logCloudKitError("fetchZoneChanges failed", error: error)
                completion(.failure(error))
            }
        }

        privateDatabase.add(op)
    }

    // MARK: - Fetch (for realtime per-record updates)

    public func fetchRecord(
        recordID: CKRecord.ID,
        completion: @escaping (Result<CKRecord?, Error>) -> Void
    ) {
        fetchRecords(recordIDs: [recordID]) { result in
            switch result {
            case .failure(let error):
                completion(.failure(error))
            case .success(let recordsByID):
                completion(.success(recordsByID[recordID]))
            }
        }
    }

    /// Fetch records by IDs. Chunked using `config.maxBatchSize`.
    /// Missing IDs will simply be absent from the returned dictionary.
    public func fetchRecords(
        recordIDs: [CKRecord.ID],
        desiredKeys: [String]? = nil,
        completion: @escaping (Result<[CKRecord.ID: CKRecord], Error>) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(.success([:]))
            return
        }

        let chunks = recordIDs.chunked(into: config.maxBatchSize)
        var merged: [CKRecord.ID: CKRecord] = [:]

        runSerial(chunks, label: "fetch") { chunk, chunkDone in
            let fetchOperation = CKFetchRecordsOperation(recordIDs: chunk)
            fetchOperation.database = self.privateDatabase
            fetchOperation.desiredKeys = desiredKeys

            fetchOperation.perRecordResultBlock = { recordID, result in
                if case .success(let record) = result {
                    merged[recordID] = record
                }
                // Ignore per-record failures
            }

            fetchOperation.fetchRecordsResultBlock = { result in
                switch result {
                case .success:
                    chunkDone(.success(()))
                case .failure(let error):
                    self.logCloudKitError("fetchRecords chunk failed", error: error)
                    chunkDone(.failure(error))
                }
            }

            self.privateDatabase.add(fetchOperation)
        } completion: { result in
            switch result {
            case .failure(let error):
                completion(.failure(error))
            case .success:
                completion(.success(merged))
            }
        }
    }

    // MARK: - Query (for verification / listing)

    public func queryRecords(
        recordType: String,
        predicate: NSPredicate = NSPredicate(value: true),
        sortDescriptors: [NSSortDescriptor] = [],
        resultsLimit: Int? = nil,
        desiredKeys: [String]? = nil,
        completion: @escaping (Result<[CKRecord], Error>) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(.success([]))
            return
        }

        let query = CKQuery(recordType: recordType, predicate: predicate)
        query.sortDescriptors = sortDescriptors

        var allRecords: [CKRecord] = []

        func run(cursor: CKQueryOperation.Cursor?) {
            let op: CKQueryOperation
            if let cursor {
                op = CKQueryOperation(cursor: cursor)
            } else {
                op = CKQueryOperation(query: query)
            }

            op.zoneID = self.zoneID
            op.desiredKeys = desiredKeys
            if let resultsLimit {
                op.resultsLimit = resultsLimit
            }

            op.recordMatchedBlock = { _, result in
                if case .success(let record) = result {
                    allRecords.append(record)
                }
            }

            op.queryResultBlock = { result in
                switch result {
                case .success(let nextCursor):
                    // If a resultsLimit is set, we only need the first page.
                    if resultsLimit != nil {
                        completion(.success(allRecords))
                        return
                    }

                    if let nextCursor {
                        run(cursor: nextCursor)
                    } else {
                        completion(.success(allRecords))
                    }
                case .failure(let error):
                    self.logCloudKitError("queryRecords failed", error: error)
                    completion(.failure(error))
                }
            }

            self.privateDatabase.add(op)
        }

        run(cursor: nil)
    }

    // MARK: - Modify (batch-only)

    public func save(
        records: [CKRecord],
        savePolicy: CKModifyRecordsOperation.RecordSavePolicy = .changedKeys,
        progressCallback: ((Int, Int) -> Void)? = nil,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        infoLog("save called", metadata: ["recordsCount": records.count, "savePolicy": "\(savePolicy)"])
        modify(recordsToSave: records, recordIDsToDelete: [], savePolicy: savePolicy, progressCallback: progressCallback, completion: completion)
    }

    public func delete(recordIDs: [CKRecord.ID], completion: @escaping (Result<Void, Error>) -> Void) {
        modify(recordsToSave: [], recordIDsToDelete: recordIDs, savePolicy: .changedKeys, completion: completion)
    }

    /// Low-level batch primitive.
    ///
    /// - Important: this method is batch-only and chunks inputs using `config.maxBatchSize`.
    public func modify(
        recordsToSave: [CKRecord],
        recordIDsToDelete: [CKRecord.ID],
        savePolicy: CKModifyRecordsOperation.RecordSavePolicy = .changedKeys,
        progressCallback: ((Int, Int) -> Void)? = nil,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        infoLog("modify called", metadata: ["recordsToSave": recordsToSave.count, "recordIDsToDelete": recordIDsToDelete.count, "isCloudKitEnabled": isCloudKitEnabled])
        
        guard isCloudKitEnabled else {
            warnLog("modify skipped (CloudKit disabled)")
            completion(.success(()))
            return
        }

        // CloudKit limit applies to total number of records (save + delete).
        // We keep it simple and safe by chunking saves and deletes into separate operations.
        runChunkedModifySaves(recordsToSave, savePolicy: savePolicy, progressCallback: progressCallback) { saveResult in
            switch saveResult {
            case .failure(let error):
                self.infoLog("modify save phase failed", metadata: ["error": String(describing: error)])
                completion(.failure(error))
            case .success:
                self.infoLog("modify save phase completed, starting delete phase", metadata: ["deletesCount": recordIDsToDelete.count])
                self.runChunkedModifyDeletes(recordIDsToDelete) { deleteResult in
                    switch deleteResult {
                    case .success:
                        self.infoLog("modify completed (success)")
                    case .failure(let error):
                        self.infoLog("modify completed (delete failed)", metadata: ["error": String(describing: error)])
                    }
                    completion(deleteResult)
                }
            }
        }
    }

    // MARK: - Helpers

    private func runChunkedModifySaves(
        _ records: [CKRecord],
        savePolicy: CKModifyRecordsOperation.RecordSavePolicy,
        progressCallback: ((Int, Int) -> Void)?,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        var currentBatchSize = config.maxBatchSize
        var completedItems = 0
        let totalItems = records.count
        var processedCount = 0
        
        infoLog("runChunkedModifySaves starting", metadata: ["totalRecords": totalItems, "maxBatchSize": currentBatchSize])
        
        func processNextChunk() {
            guard processedCount < records.count else {
                completion(.success(()))
                return
            }
            
            // Get next chunk with current batch size
            let remainingCount = records.count - processedCount
            let chunkSize = min(currentBatchSize, remainingCount)
            let chunk = Array(records[processedCount..<processedCount + chunkSize])
            
            infoLog("Processing chunk", metadata: ["chunkSize": chunk.count, "processedCount": processedCount, "remainingCount": remainingCount, "currentBatchSize": currentBatchSize])
            
            self.saveChunkWithRetry(
                chunk: chunk,
                savePolicy: savePolicy,
                maxRetries: 3,
                retryCount: 0
            ) { result in
                switch result {
                case .success:
                    self.infoLog("CKModifyRecordsOperation result received (success)", metadata: ["chunkSize": chunk.count, "completedItems": completedItems + chunk.count, "totalItems": totalItems])
                    completedItems += chunk.count
                    processedCount += chunk.count
                    // Call progress callback if provided (only on success, not during retry)
                    progressCallback?(completedItems, totalItems)
                    // Continue with next chunk
                    processNextChunk()
                case .failure(let error):
                    self.infoLog("CKModifyRecordsOperation result received (failure after retries)", metadata: ["chunkSize": chunk.count, "error": String(describing: error)])
                    self.logCloudKitError("modify save chunk failed", error: error)
                    
                    // Reduce batch size by 50 (minimum 100) on error
                    let previousBatchSize = currentBatchSize
                    currentBatchSize = max(100, currentBatchSize - 50)
                    if currentBatchSize < previousBatchSize {
                        self.warnLog("Reducing batch size due to error", metadata: [
                            "previousBatchSize": previousBatchSize,
                            "newBatchSize": currentBatchSize,
                            "error": String(describing: error)
                        ])
                        // Retry current chunk with reduced batch size (if chunk is larger than new batch size, split it)
                        if chunk.count > currentBatchSize {
                            // Split chunk into smaller chunks
                            let smallerChunks = chunk.chunked(into: currentBatchSize)
                            self.infoLog("Splitting failed chunk into smaller chunks", metadata: ["originalSize": chunk.count, "newChunks": smallerChunks.count, "newBatchSize": currentBatchSize])
                            // Process smaller chunks sequentially
                            var subCompletedItems = 0
                            let subTotalItems = chunk.count
                            self.processChunksSequentially(
                                chunks: smallerChunks,
                                savePolicy: savePolicy,
                                progressCallback: nil, // Don't emit progress during retry
                                completion: { result in
                                    switch result {
                                    case .success:
                                        completedItems += chunk.count
                                        processedCount += chunk.count
                                        // Emit progress only after successful retry
                                        progressCallback?(completedItems, totalItems)
                                        // Continue with next chunk using reduced batch size
                                        processNextChunk()
                                    case .failure(let err):
                                        completion(.failure(err))
                                    }
                                }
                            )
                        } else {
                            // Chunk is already small enough, just retry it once more with same size
                            // (batch size reduction will apply to next chunks)
                            self.saveChunkWithRetry(
                                chunk: chunk,
                                savePolicy: savePolicy,
                                maxRetries: 3,
                                retryCount: 0
                            ) { retryResult in
                                switch retryResult {
                                case .success:
                                    completedItems += chunk.count
                                    processedCount += chunk.count
                                    progressCallback?(completedItems, totalItems)
                                    processNextChunk()
                                case .failure(let retryError):
                                    completion(.failure(retryError))
                                }
                            }
                        }
                    } else {
                        // Batch size already at minimum, fail
                        completion(.failure(error))
                    }
                }
            }
        }
        
        processNextChunk()
    }
    
    private func processChunksSequentially(
        chunks: [[CKRecord]],
        savePolicy: CKModifyRecordsOperation.RecordSavePolicy,
        progressCallback: ((Int, Int) -> Void)?,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard !chunks.isEmpty else {
            completion(.success(()))
            return
        }
        
        var completedItems = 0
        let totalItems = chunks.reduce(0) { $0 + $1.count }
        var chunkIndex = 0
        
        func processNext() {
            guard chunkIndex < chunks.count else {
                completion(.success(()))
                return
            }
            
            let chunk = chunks[chunkIndex]
            chunkIndex += 1
            
            self.saveChunkWithRetry(
                chunk: chunk,
                savePolicy: savePolicy,
                maxRetries: 3,
                retryCount: 0
            ) { result in
                switch result {
                case .success:
                    completedItems += chunk.count
                    progressCallback?(completedItems, totalItems)
                    processNext()
                case .failure(let error):
                    completion(.failure(error))
                }
            }
        }
        
        processNext()
    }
    
    private func saveChunkWithRetry(
        chunk: [CKRecord],
        savePolicy: CKModifyRecordsOperation.RecordSavePolicy,
        maxRetries: Int,
        retryCount: Int,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        self.infoLog("Creating CKModifyRecordsOperation", metadata: ["chunkSize": chunk.count, "recordTypes": Array(Set(chunk.map { $0.recordType })), "retryCount": retryCount])
        let op = CKModifyRecordsOperation(recordsToSave: chunk, recordIDsToDelete: nil)
        op.savePolicy = savePolicy
        op.isAtomic = false
        op.modifyRecordsResultBlock = { result in
            switch result {
            case .success:
                completion(.success(()))
            case .failure(let error):
                // Check if it's a retryable error
                if let ckError = error as? CKError,
                   (ckError.code == .serviceUnavailable || ckError.code == .requestRateLimited),
                   retryCount < maxRetries {
                    let retryAfter = ckError.retryAfterSeconds ?? 1.0
                    self.warnLog(
                        "CloudKit service unavailable, retrying",
                        metadata: [
                            "chunkSize": chunk.count,
                            "retryCount": retryCount + 1,
                            "maxRetries": maxRetries,
                            "retryAfter": retryAfter,
                            "error": String(describing: error)
                        ]
                    )
                    DispatchQueue.global(qos: .utility).asyncAfter(deadline: .now() + retryAfter) {
                        self.saveChunkWithRetry(
                            chunk: chunk,
                            savePolicy: savePolicy,
                            maxRetries: maxRetries,
                            retryCount: retryCount + 1,
                            completion: completion
                        )
                    }
                } else {
                    completion(.failure(error))
                }
            }
        }
        self.infoLog("Adding CKModifyRecordsOperation to database", metadata: ["chunkSize": chunk.count])
        self.privateDatabase.add(op)
        self.infoLog("CKModifyRecordsOperation added to database", metadata: ["chunkSize": chunk.count])
    }

    private func runChunkedModifyDeletes(
        _ recordIDs: [CKRecord.ID],
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        let chunks = recordIDs.chunked(into: config.maxBatchSize)
        runSerial(chunks, label: "delete") { chunk, chunkDone in
            let op = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: chunk)
            op.isAtomic = false
            op.modifyRecordsResultBlock = { result in
                switch result {
                case .success:
                    chunkDone(.success(()))
                case .failure(let error):
                    self.logCloudKitError("modify delete chunk failed", error: error)
                    chunkDone(.failure(error))
                }
            }
            self.privateDatabase.add(op)
        } completion: { completion($0) }
    }

    private func runSerial<T>(
        _ items: [T],
        label: String,
        work: @escaping (T, @escaping (Result<Void, Error>) -> Void) -> Void,
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        guard !items.isEmpty else {
            completion(.success(()))
            return
        }

        var index = 0
        func next() {
            if index >= items.count {
                completion(.success(()))
                return
            }
            let item = items[index]
            index += 1
            work(item) { result in
                switch result {
                case .success:
                    next()
                case .failure(let error):
                    self.logError(
                        "Chunked operation failed",
                        metadata: [
                            "label": label,
                            "error": String(describing: error)
                        ]
                    )
                    completion(.failure(error))
                }
            }
        }
        next()
    }

    // MARK: - Subscriptions

    public func ensureSubscriptions(_ specs: [SubscriptionSpec], completion: @escaping (Result<Void, Error>) -> Void) {
        guard isCloudKitEnabled else {
            completion(.success(()))
            return
        }

        infoLog(
            "ensureSubscriptions starting",
            metadata: [
                "count": specs.count,
                "recordTypes": specs.map { $0.recordType }.joined(separator: ",")
            ]
        )

        let subscriptions: [CKSubscription] = specs.map { spec in
            let sub = CKQuerySubscription(
                recordType: spec.recordType,
                predicate: spec.predicate,
                subscriptionID: spec.id,
                options: spec.options
            )
            let info = CKSubscription.NotificationInfo()
            info.shouldSendContentAvailable = true
            sub.notificationInfo = info
            return sub
        }

        runSerial(subscriptions, label: "subscriptions") { subscription, subDone in
            self.privateDatabase.save(subscription) { _, error in
                if let error {
                    self.logCloudKitError("ensureSubscriptions failed", error: error)
                    subDone(.failure(error))
                    return
                }
                subDone(.success(()))
            }
        } completion: {
            switch $0 {
            case .success:
                self.infoLog("ensureSubscriptions completed", metadata: ["count": specs.count])
            case .failure:
                break
            }
            completion($0)
        }
    }
    
    public func deleteSubscriptions(_ subscriptionIDs: [String], completion: @escaping (Result<Void, Error>) -> Void) {
        guard isCloudKitEnabled else {
            completion(.success(()))
            return
        }
        
        guard !subscriptionIDs.isEmpty else {
            completion(.success(()))
            return
        }
        
        infoLog(
            "deleteSubscriptions starting",
            metadata: [
                "count": subscriptionIDs.count,
                "subscriptionIDs": subscriptionIDs.joined(separator: ",")
            ]
        )
        
        runSerial(subscriptionIDs, label: "delete_subscriptions") { subscriptionID, deleteDone in
            self.privateDatabase.delete(withSubscriptionID: subscriptionID) { _, error in
                if let error {
                    // Ignore "not found" errors - subscription might not exist
                    if let ckError = error as? CKError, ckError.code == .unknownItem {
                        self.debugLog("Subscription not found (already deleted)", metadata: ["subscriptionID": subscriptionID])
                        deleteDone(.success(()))
                    } else {
                        self.logCloudKitError("deleteSubscriptions failed", error: error)
                        deleteDone(.failure(error))
                    }
                    return
                }
                deleteDone(.success(()))
            }
        } completion: {
            switch $0 {
            case .success:
                self.infoLog("deleteSubscriptions completed", metadata: ["count": subscriptionIDs.count])
            case .failure:
                break
            }
            completion($0)
        }
    }

    private func logCloudKitError(_ message: String, error: Error) {
        var metadata: [String: Any] = [
            "error": String(describing: error)
        ]
        if let ckError = error as? CKError {
            metadata["ckErrorCode"] = ckError.code.rawValue
            metadata["ckError"] = String(describing: ckError)
        }
        logError(message, metadata: metadata)
    }

    // MARK: - Bundle/AppGroup resolution (standalone; no external dependencies)

    private static func resolveDefaultAppGroupIdentifier() -> String {
        "group.\(resolveMainBundleIdentifier())"
    }

    private static func resolveMainBundleIdentifier() -> String {
        guard let bundleId = Bundle.main.bundleIdentifier else {
            return "com.apocaliss92.zentik.dev"
        }

        let extensionSuffixes: Set<String> = [
            "NotificationServiceExtension",
            "NotificationContentExtension",
            "ZentikNotificationService",
            "ZentikNotificationContentExtension",
            "WatchExtension",
            "WidgetExtension"
        ]

        let components = bundleId.components(separatedBy: ".")
        if components.count > 2, let last = components.last, extensionSuffixes.contains(last) {
            return components.dropLast().joined(separator: ".")
        }

        return bundleId
    }
}

private extension Array {
    func chunked(into size: Int) -> [[Element]] {
        guard size > 0, !isEmpty else { return [] }
        var result: [[Element]] = []
        result.reserveCapacity((count + size - 1) / size)

        var index = 0
        while index < count {
            let end = Swift.min(index + size, count)
            result.append(Array(self[index..<end]))
            index = end
        }
        return result
    }
}
