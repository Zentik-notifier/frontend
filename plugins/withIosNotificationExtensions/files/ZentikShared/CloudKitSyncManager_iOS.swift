import Foundation
import CloudKit
import SQLite3

/**
 * CloudKitSyncManager (iOS) – Gestisce la sincronizzazione tramite file JSON su CloudKit
 * 
 * Nuovo approccio:
 * - iOS esporta il DB locale SQL -> file JSON -> carica su CloudKit come CKAsset
 * - Un record per i buckets (buckets.json)
 * - Un record per le notifications (notifications.json)
 * - Watch scarica i JSON e sostituisce il DB locale
 * - Messaggi real-time via WatchConnectivity per aggiornamenti immediati
 */
public class CloudKitSyncManager {
    
    // MARK: - Singleton
    
    public static let shared = CloudKitSyncManager()
    
    // MARK: - Properties
    
    private let container: CKContainer
    private let privateDatabase: CKDatabase
    private let customZone: CKRecordZone
    private let logger = LoggingSystem.shared
    
    // Zone ID for custom zone
    private let zoneID: CKRecordZone.ID
    
    // Settings key for retentionPolicies
    private let retentionPoliciesKey = "retentionPolicies"
    
    // Default value if setting not found
    private let defaultWatchNMaxNotifications = 150
    
    // Date formatter for ISO8601 strings
    private let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    // MARK: - Initialization
    
    private init() {
        // Get container identifier from bundle
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        let containerIdentifier = "iCloud.\(mainBundleId)"
        
        self.container = CKContainer(identifier: containerIdentifier)
        self.privateDatabase = container.privateCloudDatabase
        
        // Create custom zone for better performance and atomic operations
        self.zoneID = CKRecordZone.ID(zoneName: "ZentikSyncZone", ownerName: CKCurrentUserDefaultName)
        self.customZone = CKRecordZone(zoneID: zoneID)
        
        // Log detailed initialization info
        logger.info(
            tag: "Initialization",
            message: "CloudKit container initialized",
            metadata: [
                "mainBundleId": mainBundleId,
                "containerIdentifier": containerIdentifier,
                "zoneName": zoneID.zoneName
            ],
            source: "CloudKit"
        )
        
        print("☁️ [CloudKitSync][iOS] Using container: \(containerIdentifier) (bundle: \(mainBundleId))")
        print("☁️ [CloudKitSync][iOS] Target zone: \(zoneID.zoneName)")
        ensureCustomZoneExists()
    }
    
    // MARK: - Zone Setup
    
    /**
     * Ensure custom zone exists in CloudKit
     */
    private func ensureCustomZoneExists(completion: @escaping (Bool) -> Void = { _ in }) {
        logger.debug(
            tag: "ZoneSetup",
            message: "Checking if custom zone exists",
            metadata: ["zoneName": zoneID.zoneName],
            source: "CloudKit"
        )
        
        privateDatabase.fetch(withRecordZoneID: zoneID) { (zone, error) in
            if let error = error as? CKError {
                self.logger.warn(
                    tag: "ZoneSetup",
                    message: "Error fetching zone",
                    metadata: [
                        "errorCode": String(error.code.rawValue),
                        "errorDescription": error.localizedDescription
                    ],
                    source: "CloudKit"
                )
                
                if error.code == .unknownItem || error.code == .zoneNotFound {
                    self.logger.info(
                        tag: "ZoneSetup",
                        message: "Zone not found, creating new zone",
                        source: "CloudKit"
                    )
                    self.privateDatabase.save(self.customZone) { (zone, error) in
                        if let error = error {
                            self.logger.error(
                                tag: "ZoneSetup",
                                message: "Failed to create custom zone",
                                metadata: ["error": error.localizedDescription],
                                source: "CloudKit"
                            )
                            completion(false)
                        } else {
                            self.logger.info(
                                tag: "ZoneSetup",
                                message: "Successfully created custom zone",
                                metadata: ["zoneName": self.zoneID.zoneName],
                                source: "CloudKit"
                            )
                            completion(true)
                        }
                    }
                } else {
                    self.logger.error(
                        tag: "ZoneSetup",
                        message: "Unexpected error checking zone",
                        metadata: ["error": error.localizedDescription],
                        source: "CloudKit"
                    )
                    completion(false)
                }
            } else if zone != nil {
                self.logger.info(
                    tag: "ZoneSetup",
                    message: "Custom zone already exists",
                    metadata: ["zoneName": self.zoneID.zoneName],
                    source: "CloudKit"
                )
                completion(true)
            } else {
                self.logger.warn(
                    tag: "ZoneSetup",
                    message: "Zone fetch returned nil without error, retrying creation",
                    source: "CloudKit"
                )
                self.privateDatabase.save(self.customZone) { (zone, error) in
                    if let error = error {
                        self.logger.error(
                            tag: "ZoneSetup",
                            message: "Failed to create custom zone on retry",
                            metadata: ["error": error.localizedDescription],
                            source: "CloudKit"
                        )
                        completion(false)
                    } else {
                        self.logger.info(
                            tag: "ZoneSetup",
                            message: "Successfully created custom zone on retry",
                            metadata: ["zoneName": self.zoneID.zoneName],
                            source: "CloudKit"
                        )
                        completion(true)
                    }
                }
            }
        }
    }
    
    // MARK: - Settings Helper
    
    /**
     * Get watchNMaxNotifications setting value
     * Parses retentionPolicies JSON to extract watchNMaxNotifications
     */
    private func getWatchNMaxNotifications() -> Int {
        guard let settingValue = DatabaseAccess.getSettingValue(key: retentionPoliciesKey),
              let jsonData = settingValue.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
              let watchNMaxNotifications = json["watchNMaxNotifications"] as? Int else {
            return defaultWatchNMaxNotifications
        }
        return watchNMaxNotifications
    }
    
    // MARK: - Database to JSON Export
    
    /**
     * Esporta tutti i buckets dal database locale a un array di Bucket (JSON-serializable)
     */
    private func exportBucketsFromDatabase() throws -> [Bucket] {
        guard let dbPath = DatabaseAccess.getDbPath() else {
            throw NSError(domain: "CloudKitSync", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to get database path"])
        }
        
        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            throw NSError(domain: "CloudKitSync", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to open database"])
        }
        defer { sqlite3_close(db) }
        
        let sql = "SELECT id, name, fragment, updated_at FROM buckets"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            throw NSError(domain: "CloudKitSync", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare statement"])
        }
        defer { sqlite3_finalize(stmt) }
        
        var buckets: [Bucket] = []
        var skippedOrphans = 0
        
        while sqlite3_step(stmt) == SQLITE_ROW {
            guard let idCString = sqlite3_column_text(stmt, 0),
                  let nameCString = sqlite3_column_text(stmt, 1),
                  let fragmentCString = sqlite3_column_text(stmt, 2),
                  let updatedAtCString = sqlite3_column_text(stmt, 3) else {
                continue
            }
            
            let id = String(cString: idCString)
            let name = String(cString: nameCString)
            let fragment = String(cString: fragmentCString)
            let updatedAtString = String(cString: updatedAtCString)
            
            // Parse fragment JSON
            guard let fragmentData = fragment.data(using: .utf8),
                  let fragmentJson = try? JSONSerialization.jsonObject(with: fragmentData) as? [String: Any] else {
                print("☁️ [CloudKitSync][iOS] ⚠️ Failed to parse fragment for bucket \(id)")
                continue
            }
            
            // Skip orphan buckets
            let isOrphan = fragmentJson["isOrphan"] as? Bool ?? false
            if isOrphan {
                skippedOrphans += 1
                continue
            }
            
            let description = fragmentJson["description"] as? String
            let color = fragmentJson["color"] as? String
            let iconUrl = fragmentJson["iconUrl"] as? String
            let createdAtString = fragmentJson["createdAt"] as? String ?? updatedAtString
            
            let bucket = Bucket(
                id: id,
                name: name,
                description: description,
                color: color,
                iconUrl: iconUrl,
                createdAt: createdAtString,
                updatedAt: updatedAtString,
                isOrphan: false
            )
            
            buckets.append(bucket)
        }
        
        print("☁️ [CloudKitSync][iOS] 📦 Exported \(buckets.count) buckets from database (\(skippedOrphans) orphans skipped)")
        return buckets
    }
    
    /**
     * Esporta le notifiche recenti dal database locale a un array di SyncNotification (JSON-serializable)
     */
    private func exportNotificationsFromDatabase(limit: Int) throws -> [SyncNotification] {
        guard let dbPath = DatabaseAccess.getDbPath() else {
            throw NSError(domain: "CloudKitSync", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to get database path"])
        }
        
        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            throw NSError(domain: "CloudKitSync", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to open database"])
        }
        defer { sqlite3_close(db) }
        
        let sql = "SELECT id, fragment, created_at, read_at, bucket_id FROM notifications ORDER BY created_at DESC LIMIT ?"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            throw NSError(domain: "CloudKitSync", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare statement"])
        }
        defer { sqlite3_finalize(stmt) }
        
        let safeLimit = min(limit, Int(Int32.max))
        guard sqlite3_bind_int64(stmt, 1, Int64(safeLimit)) == SQLITE_OK else {
            throw NSError(domain: "CloudKitSync", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to bind limit parameter"])
        }
        
        var notifications: [SyncNotification] = []
        
        while sqlite3_step(stmt) == SQLITE_ROW {
            guard let idCString = sqlite3_column_text(stmt, 0),
                  let fragmentCString = sqlite3_column_text(stmt, 1),
                  let createdAtCString = sqlite3_column_text(stmt, 2),
                  let bucketIdCString = sqlite3_column_text(stmt, 4) else {
                continue
            }
            
            let id = String(cString: idCString)
            let fragment = String(cString: fragmentCString)
            let createdAtString = String(cString: createdAtCString)
            let bucketId = String(cString: bucketIdCString)
            let readAtString = sqlite3_column_text(stmt, 3).map { String(cString: $0) }
            
            // Parse fragment JSON
            guard let fragmentData = fragment.data(using: .utf8),
                  let fragmentJson = try? JSONSerialization.jsonObject(with: fragmentData) as? [String: Any],
                  let message = fragmentJson["message"] as? [String: Any] else {
                print("☁️ [CloudKitSync][iOS] ⚠️ Failed to parse fragment for notification \(id)")
                continue
            }
            
            let title = message["title"] as? String ?? ""
            let subtitle = message["subtitle"] as? String
            let body = message["body"] as? String
            
            let sentAtString = fragmentJson["sentAt"] as? String ?? createdAtString
            let updatedAtString = fragmentJson["updatedAt"] as? String ?? createdAtString
            
            // Extract attachments
            var attachments: [SyncAttachment] = []
            if let attachmentsArray = message["attachments"] as? [[String: Any]] {
                attachments = attachmentsArray.compactMap { attDict in
                    guard let mediaType = attDict["mediaType"] as? String else { return nil }
                    let url = attDict["url"] as? String
                    let name = attDict["name"] as? String
                    return SyncAttachment(mediaType: mediaType, url: url, name: name)
                }
            }
            
            // Extract actions
            var actions: [SyncAction] = []
            if let actionsArray = message["actions"] as? [[String: Any]] {
                actions = actionsArray.compactMap { actionDict in
                    guard let type = actionDict["type"] as? String else { return nil }
                    let value = actionDict["value"] as? String
                    let title = actionDict["title"] as? String
                    let icon = actionDict["icon"] as? String
                    let destructive = actionDict["destructive"] as? Bool ?? false
                    return SyncAction(type: type, value: value, title: title, icon: icon, destructive: destructive)
                }
            }
            
            // Extract tapAction
            var tapAction: SyncAction? = nil
            if let tapActionDict = message["tapAction"] as? [String: Any],
               let type = tapActionDict["type"] as? String {
                let value = tapActionDict["value"] as? String
                let title = tapActionDict["title"] as? String
                let icon = tapActionDict["icon"] as? String
                let destructive = tapActionDict["destructive"] as? Bool ?? false
                tapAction = SyncAction(type: type, value: value, title: title, icon: icon, destructive: destructive)
            }
            
            let notification = SyncNotification(
                id: id,
                title: title,
                subtitle: subtitle,
                body: body,
                readAt: readAtString,
                sentAt: sentAtString,
                createdAt: createdAtString,
                updatedAt: updatedAtString,
                bucketId: bucketId,
                attachments: attachments,
                actions: actions,
                tapAction: tapAction
            )
            
            notifications.append(notification)
        }
        
        print("☁️ [CloudKitSync][iOS] 📦 Exported \(notifications.count) notifications from database")
        return notifications
    }
    
    // MARK: - CloudKit Sync Methods
    
    /**
     * Sincronizza i buckets su CloudKit come file JSON
     */
    public func syncBucketsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        logger.info(
            tag: "CloudKitSync",
            message: "Starting buckets sync to CloudKit",
            metadata: ["syncType": "buckets", "method": "JSON"],
            source: "CloudKitSyncManager"
        )
        
        do {
            // 1. Esporta buckets dal DB
            let buckets = try exportBucketsFromDatabase()
            
            logger.debug(
                tag: "CloudKitSync",
                message: "Exported buckets from database",
                metadata: [
                    "count": String(buckets.count),
                    "firstId": buckets.first?.id ?? "none",
                    "lastId": buckets.last?.id ?? "none"
                ],
                source: "CloudKitSyncManager"
            )
            
            // 2. Crea container JSON
            let container = BucketsDataContainer(buckets: buckets)
            
            // 3. Crea CKRecord con JSON come CKAsset
            let record = try container.toCKRecord(zoneID: zoneID)
            
            logger.debug(
                tag: "CloudKitSync",
                message: "Created CloudKit record",
                metadata: [
                    "recordName": record.recordID.recordName,
                    "zoneName": record.recordID.zoneID.zoneName
                ],
                source: "CloudKitSyncManager"
            )
            
            // 4. Usa CKModifyRecordsOperation per UPDATE o INSERT automatico
            let operation = CKModifyRecordsOperation(recordsToSave: [record], recordIDsToDelete: nil)
            operation.savePolicy = .changedKeys  // Permette UPDATE se esiste, INSERT se non esiste
            operation.qualityOfService = .userInitiated
            
            operation.modifyRecordsResultBlock = { result in
                switch result {
                case .success():
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Successfully synced buckets to CloudKit",
                        metadata: [
                            "count": String(buckets.count),
                            "recordName": record.recordID.recordName
                        ],
                        source: "CloudKitSyncManager"
                    )
                    completion(true, buckets.count)
                case .failure(let error):
                    self.logger.error(
                        tag: "CloudKitSync",
                        message: "Failed to sync buckets",
                        metadata: [
                            "error": error.localizedDescription,
                            "count": String(buckets.count)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    completion(false, 0)
                }
            }
            
            privateDatabase.add(operation)
        } catch {
            logger.error(
                tag: "CloudKitSync",
                message: "Error exporting buckets",
                metadata: ["error": error.localizedDescription],
                source: "CloudKitSyncManager"
            )
            completion(false, 0)
        }
    }
    
    /**
     * Sincronizza le notifiche su CloudKit come file JSON
     */
    public func syncNotificationsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        let limit = getWatchNMaxNotifications()
        
        logger.info(
            tag: "CloudKitSync",
            message: "Starting notifications sync to CloudKit",
            metadata: [
                "syncType": "notifications",
                "method": "JSON",
                "limit": String(limit)
            ],
            source: "CloudKitSyncManager"
        )
        
        do {
            // 1. Esporta notifiche dal DB
            let notifications = try exportNotificationsFromDatabase(limit: limit)
            
            // Log estremi identificativi
            let firstNotification = notifications.first
            let lastNotification = notifications.last
            let unreadCount = notifications.filter { $0.readAt == nil }.count
            
            logger.debug(
                tag: "CloudKitSync",
                message: "Exported notifications from database",
                metadata: [
                    "count": String(notifications.count),
                    "unreadCount": String(unreadCount),
                    "firstId": firstNotification?.id ?? "none",
                    "firstBucket": firstNotification?.bucketId ?? "none",
                    "firstTitle": firstNotification?.title ?? "none",
                    "lastId": lastNotification?.id ?? "none",
                    "lastBucket": lastNotification?.bucketId ?? "none",
                    "lastTitle": lastNotification?.title ?? "none"
                ],
                source: "CloudKitSyncManager"
            )
            
            // 2. Crea container JSON
            let container = NotificationsDataContainer(notifications: notifications)
            
            // 3. Crea CKRecord con JSON come CKAsset
            let record = try container.toCKRecord(zoneID: zoneID)
            
            logger.debug(
                tag: "CloudKitSync",
                message: "Created CloudKit record",
                metadata: [
                    "recordName": record.recordID.recordName,
                    "zoneName": record.recordID.zoneID.zoneName
                ],
                source: "CloudKitSyncManager"
            )
            
            // 4. Usa CKModifyRecordsOperation per UPDATE o INSERT automatico
            let operation = CKModifyRecordsOperation(recordsToSave: [record], recordIDsToDelete: nil)
            operation.savePolicy = .changedKeys  // Permette UPDATE se esiste, INSERT se non esiste
            operation.qualityOfService = .userInitiated
            
            operation.modifyRecordsResultBlock = { result in
                switch result {
                case .success():
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Successfully synced notifications to CloudKit",
                        metadata: [
                            "count": String(notifications.count),
                            "unreadCount": String(unreadCount),
                            "recordName": record.recordID.recordName
                        ],
                        source: "CloudKitSyncManager"
                    )
                    completion(true, notifications.count)
                case .failure(let error):
                    self.logger.error(
                        tag: "CloudKitSync",
                        message: "Failed to sync notifications",
                        metadata: [
                            "error": error.localizedDescription,
                            "count": String(notifications.count)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    completion(false, 0)
                }
            }
            
            privateDatabase.add(operation)
        } catch {
            logger.error(
                tag: "CloudKitSync",
                message: "Error exporting notifications",
                metadata: ["error": error.localizedDescription],
                source: "CloudKitSyncManager"
            )
            completion(false, 0)
        }
    }
    
    /**
     * Sincronizza sia buckets che notifications su CloudKit
     */
    public func syncAllToCloudKit(completion: @escaping (Bool, Int, Int) -> Void) {
        logger.info(
            tag: "CloudKitSync",
            message: "Starting full sync to CloudKit",
            metadata: ["syncType": "all"],
            source: "CloudKitSyncManager"
        )
        
        var bucketsSynced = 0
        var notificationsSynced = 0
        var bucketsSuccess = false
        var notificationsSuccess = false
        var bucketsDone = false
        var notificationsDone = false
        
        let checkCompletion: () -> Void = {
            if bucketsDone && notificationsDone {
                let success = bucketsSuccess && notificationsSuccess
                
                if success {
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Full sync completed successfully",
                        metadata: [
                            "bucketsCount": String(bucketsSynced),
                            "notificationsCount": String(notificationsSynced)
                        ],
                        source: "CloudKitSyncManager"
                    )
                } else {
                    self.logger.error(
                        tag: "CloudKitSync",
                        message: "Full sync completed with errors",
                        metadata: [
                            "bucketsSuccess": String(bucketsSuccess),
                            "notificationsSuccess": String(notificationsSuccess),
                            "bucketsCount": String(bucketsSynced),
                            "notificationsCount": String(notificationsSynced)
                        ],
                        source: "CloudKitSyncManager"
                    )
                }
                
                completion(success, bucketsSynced, notificationsSynced)
            }
        }
        
        syncBucketsToCloudKit { success, count in
            bucketsSuccess = success
            bucketsSynced = count
            bucketsDone = true
            checkCompletion()
        }
        
        syncNotificationsToCloudKit { success, count in
            notificationsSuccess = success
            notificationsSynced = count
            notificationsDone = true
            checkCompletion()
        }
    }
    
    // MARK: - Download from CloudKit (per compatibilità)
    
    /**
     * Scarica i buckets da CloudKit (iOS normalmente non ne ha bisogno, solo Watch)
     */
    public func fetchBucketsFromCloudKit(completion: @escaping ([Bucket]) -> Void) {
        let recordID = CKRecord.ID(recordName: "buckets_data", zoneID: zoneID)
        
        privateDatabase.fetch(withRecordID: recordID) { (record, error) in
            if let error = error {
                print("☁️ [CloudKitSync][iOS] ❌ Failed to fetch buckets: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let record = record else {
                print("☁️ [CloudKitSync][iOS] ⚠️ No buckets record found")
                completion([])
                return
            }
            
            do {
                let container = try BucketsDataContainer.from(record: record)
                print("☁️ [CloudKitSync][iOS] ✅ Fetched \(container.buckets.count) buckets from CloudKit")
                completion(container.buckets)
            } catch {
                print("☁️ [CloudKitSync][iOS] ❌ Error parsing buckets: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    /**
     * Scarica le notifiche da CloudKit (iOS normalmente non ne ha bisogno, solo Watch)
     */
    public func fetchNotificationsFromCloudKit(limit: Int? = nil, completion: @escaping ([SyncNotification]) -> Void) {
        let recordID = CKRecord.ID(recordName: "notifications_data", zoneID: zoneID)
        
        privateDatabase.fetch(withRecordID: recordID) { (record, error) in
            if let error = error {
                print("☁️ [CloudKitSync][iOS] ❌ Failed to fetch notifications: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let record = record else {
                print("☁️ [CloudKitSync][iOS] ⚠️ No notifications record found")
                completion([])
                return
            }
            
            do {
                let container = try NotificationsDataContainer.from(record: record)
                let notifications = container.notifications
                
                // Apply limit if specified
                let limitedNotifications = limit.map { Array(notifications.prefix($0)) } ?? notifications
                
                print("☁️ [CloudKitSync][iOS] ✅ Fetched \(limitedNotifications.count) notifications from CloudKit")
                completion(limitedNotifications)
            } catch {
                print("☁️ [CloudKitSync][iOS] ❌ Error parsing notifications: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    /**
     * Scarica tutto da CloudKit (buckets + notifications)
     */
    public func fetchAllFromCloudKit(completion: @escaping ([Bucket], [SyncNotification]) -> Void) {
        let group = DispatchGroup()
        var fetchedBuckets: [Bucket] = []
        var fetchedNotifications: [SyncNotification] = []
        
        group.enter()
        fetchBucketsFromCloudKit { buckets in
            fetchedBuckets = buckets
            group.leave()
        }
        
        group.enter()
        fetchNotificationsFromCloudKit { notifications in
            fetchedNotifications = notifications
            group.leave()
        }
        
        group.notify(queue: .main) {
            completion(fetchedBuckets, fetchedNotifications)
        }
    }
    
    // MARK: - Subscriptions
    
    /**
     * Setup CloudKit subscriptions for real-time updates
     * Subscription sui record BucketsData e NotificationsData
     */
    public func setupSubscriptions(completion: @escaping (Bool) -> Void) {
        // Subscription for buckets data
        let bucketSubscription = CKQuerySubscription(
            recordType: CloudKitRecordType.bucketsData,
            predicate: NSPredicate(value: true),
            subscriptionID: "ZentikBucketsDataSubscription",
            options: [.firesOnRecordCreation, .firesOnRecordUpdate]
        )
        
        let bucketNotification = CKSubscription.NotificationInfo()
        bucketNotification.shouldSendContentAvailable = true
        bucketSubscription.notificationInfo = bucketNotification
        
        // Subscription for notifications data
        let notificationSubscription = CKQuerySubscription(
            recordType: CloudKitRecordType.notificationsData,
            predicate: NSPredicate(value: true),
            subscriptionID: "ZentikNotificationsDataSubscription",
            options: [.firesOnRecordCreation, .firesOnRecordUpdate]
        )
        
        let notificationNotification = CKSubscription.NotificationInfo()
        notificationNotification.shouldSendContentAvailable = true
        notificationSubscription.notificationInfo = notificationNotification
        
        // Save subscriptions
        let operation = CKModifySubscriptionsOperation(
            subscriptionsToSave: [bucketSubscription, notificationSubscription],
            subscriptionIDsToDelete: nil
        )
        operation.qualityOfService = .utility
        
        operation.modifySubscriptionsResultBlock = { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Subscriptions setup successful")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to setup subscriptions: \(error.localizedDescription)")
                completion(false)
            }
        }
        
        privateDatabase.add(operation)
    }
    
    // MARK: - Individual Delete Methods (deprecati nel nuovo approccio)
    
    /**
     * DEPRECATO: Nel nuovo approccio basato su JSON, non si cancellano record individuali.
     * Le modifiche vengono applicate al DB locale e poi si riesporta tutto il JSON.
     */
    public func deleteNotificationFromCloudKit(id: String, completion: @escaping (Bool) -> Void = { _ in }) {
        print("☁️ [CloudKitSync][iOS] ⚠️ deleteNotificationFromCloudKit is deprecated with JSON sync")
        print("☁️ [CloudKitSync][iOS] ℹ️ Please update local DB and call syncNotificationsToCloudKit()")
        completion(false)
    }
    
    /**
     * DEPRECATO: Nel nuovo approccio basato su JSON, non si cancellano record individuali.
     * Le modifiche vengono applicate al DB locale e poi si riesporta tutto il JSON.
     */
    public func deleteBucketFromCloudKit(id: String, completion: @escaping (Bool) -> Void = { _ in }) {
        print("☁️ [CloudKitSync][iOS] ⚠️ deleteBucketFromCloudKit is deprecated with JSON sync")
        print("☁️ [CloudKitSync][iOS] ℹ️ Please update local DB and call syncBucketsToCloudKit()")
        completion(false)
    }
}
