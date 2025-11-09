import Foundation
import CloudKit
import SQLite3

/**
 * CloudKitSyncManager (iOS) – Gestisce la sincronizzazione tramite record individuali su CloudKit
 * 
 * Approccio con record individuali:
 * - iOS esporta il DB locale SQL -> record CloudKit individuali
 * - Un record per ogni bucket
 * - Un record per ogni notifica
 * - Watch scarica i record individuali e aggiorna il DB locale
 * - Messaggi real-time via WatchConnectivity per aggiornamenti immediati
 */
public class CloudKitSyncManager {
    
    // MARK: - Singleton
    
    public static let shared = CloudKitSyncManager()
    
    // MARK: - Properties
    
    private let container: CKContainer
    private let privateDatabase: CKDatabase
    private let logger = LoggingSystem.shared
    
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
        // Get container identifier from KeychainAccess
        let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
        
        self.container = CKContainer(identifier: containerIdentifier)
        self.privateDatabase = container.privateCloudDatabase
        
        // Log detailed initialization info
        logger.info(
            tag: "Initialization",
            message: "CloudKit container initialized",
            metadata: [
                "mainBundleId": KeychainAccess.getMainBundleIdentifier(),
                "containerIdentifier": containerIdentifier
            ],
            source: "CloudKit"
        )
        
        print("☁️ [CloudKitSync][iOS] Using container: \(containerIdentifier) (bundle: \(KeychainAccess.getMainBundleIdentifier()))")
    }
    
    // MARK: - Date Conversion Helpers
    
    /**
     * Convert ISO8601 string to Date
     */
    private func stringToDate(_ dateString: String) -> Date {
        return dateFormatter.date(from: dateString) ?? Date()
    }
    
    /**
     * Convert optional ISO8601 string to optional Date
     */
    private func stringToDate(_ dateString: String?) -> Date? {
        guard let dateString = dateString else { return nil }
        return dateFormatter.date(from: dateString)
    }
    
    /**
     * Convert Date to ISO8601 string
     */
    private func dateToString(_ date: Date) -> String {
        return dateFormatter.string(from: date)
    }
    
    /**
     * Convert optional Date to optional ISO8601 string
     */
    private func dateToString(_ date: Date?) -> String? {
        guard let date = date else { return nil }
        return dateFormatter.string(from: date)
    }
    
    // MARK: - Settings Helper
    
    /**
     * Get watchNMaxNotifications setting value
     * Parses retentionPolicies JSON to extract watchNMaxNotifications
     */
    private func getWatchNMaxNotifications() -> Int {
        var result = defaultWatchNMaxNotifications
        let semaphore = DispatchSemaphore(value: 0)
        
        DatabaseAccess.performDatabaseOperation(
            type: .read,
            name: "GetWatchMaxNotifications",
            source: "CloudKitSync"
        ) { db in
            guard let settingValue = DatabaseAccess.getSettingValue(key: self.retentionPoliciesKey),
                  let jsonData = settingValue.data(using: .utf8),
                  let json = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any],
                  let watchNMaxNotifications = json["watchNMaxNotifications"] as? Int else {
                return .success
            }
            result = watchNMaxNotifications
            return .success
        } completion: { _ in
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + 5.0)
        return result
    }
    
    // MARK: - Database to JSON Export
    
    /**
     * Esporta tutti i buckets dal database locale a un array di Bucket (JSON-serializable)
     */
    private func exportBucketsFromDatabase() throws -> [Bucket] {
        var buckets: [Bucket] = []
        var exportError: Error?
        let semaphore = DispatchSemaphore(value: 0)
        
        print("☁️ [CloudKitSync][iOS] 🔍 Starting bucket export from database...")
        
        DatabaseAccess.performDatabaseOperation(
            type: .read,
            name: "ExportBuckets",
            source: "CloudKitSync"
        ) { db in
            let sql = "SELECT id, name, fragment, updated_at FROM buckets"
            var stmt: OpaquePointer?
            
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                exportError = NSError(domain: "CloudKitSync", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare statement"])
                print("☁️ [CloudKitSync][iOS] ❌ Failed to prepare SQL statement for buckets export")
                return .failure("Failed to prepare statement")
            }
            defer { sqlite3_finalize(stmt) }
            
            var skippedOrphans = 0
            var totalRows = 0
            
            while sqlite3_step(stmt) == SQLITE_ROW {
                totalRows += 1
                
                guard let idCString = sqlite3_column_text(stmt, 0),
                      let nameCString = sqlite3_column_text(stmt, 1),
                      let fragmentCString = sqlite3_column_text(stmt, 2),
                      let updatedAtCString = sqlite3_column_text(stmt, 3) else {
                    print("☁️ [CloudKitSync][iOS] ⚠️ Skipping bucket row \(totalRows) - missing columns")
                    continue
                }
                
                let id = String(cString: idCString)
                let name = String(cString: nameCString)
                let fragment = String(cString: fragmentCString)
                let updatedAtString = String(cString: updatedAtCString)
                
                print("☁️ [CloudKitSync][iOS] 🔍 Processing bucket: \(id) - \(name)")
                
                // Parse fragment JSON
                guard let fragmentData = fragment.data(using: .utf8),
                      let fragmentJson = try? JSONSerialization.jsonObject(with: fragmentData) as? [String: Any] else {
                    print("☁️ [CloudKitSync][iOS] ⚠️ Failed to parse fragment for bucket \(id)")
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
                )
                
                print("☁️ [CloudKitSync][iOS] ✅ Added bucket to export: \(id) - \(name) (color: \(color ?? "none"))")
                buckets.append(bucket)
            }
            
            print("☁️ [CloudKitSync][iOS] 📦 Bucket export complete: \(buckets.count) exported, \(skippedOrphans) orphans skipped, \(totalRows) total rows")
            return .success
        } completion: { _ in
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + DatabaseAccess.DB_OPERATION_TIMEOUT)
        
        if let error = exportError {
            print("☁️ [CloudKitSync][iOS] ❌ Export error: \(error.localizedDescription)")
            throw error
        }
        
        print("☁️ [CloudKitSync][iOS] 🎯 Final bucket count for CloudKit: \(buckets.count)")
        return buckets
    }
    
    /**
     * Esporta le notifiche recenti dal database locale a un array di SyncNotification (JSON-serializable)
     */
    private func exportNotificationsFromDatabase(limit: Int) throws -> [SyncNotification] {
        var notifications: [SyncNotification] = []
        var exportError: Error?
        let semaphore = DispatchSemaphore(value: 0)
        
        DatabaseAccess.performDatabaseOperation(
            type: .read,
            name: "ExportNotifications",
            source: "CloudKitSync"
        ) { db in
            let sql = "SELECT id, fragment, created_at, read_at, bucket_id FROM notifications ORDER BY created_at DESC LIMIT ?"
            var stmt: OpaquePointer?
            
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                exportError = NSError(domain: "CloudKitSync", code: 3, userInfo: [NSLocalizedDescriptionKey: "Failed to prepare statement"])
                return .failure("Failed to prepare statement")
            }
            defer { sqlite3_finalize(stmt) }
            
            let safeLimit = min(limit, Int(Int32.max))
            guard sqlite3_bind_int64(stmt, 1, Int64(safeLimit)) == SQLITE_OK else {
                exportError = NSError(domain: "CloudKitSync", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to bind limit parameter"])
                return .failure("Failed to bind limit parameter")
            }
            
            var skippedOrphans = 0
            
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
            
            print("☁️ [CloudKitSync][iOS] 📦 Exported \(notifications.count) notifications from database (orphan bucket notifications excluded)")
            return .success
        } completion: { _ in
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + DatabaseAccess.DB_OPERATION_TIMEOUT)
        
        if let error = exportError {
            throw error
        }
        
        return notifications
    }
    
    // MARK: - CloudKit Sync Methods
    
    /**
     * Sincronizza i buckets su CloudKit come record individuali
     */
    public func syncBucketsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        logger.info(
            tag: "CloudKitSync",
            message: "Starting buckets sync to CloudKit",
            metadata: ["syncType": "buckets", "method": "individual-records"],
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
            
            // 2. Converti Bucket -> CloudKitBucket
            let cloudKitBuckets = buckets.map { bucket in
                CloudKitBucket(
                    id: bucket.id,
                    name: bucket.name,
                    description: bucket.description,
                    color: bucket.color,
                    iconUrl: bucket.iconUrl,
                    createdAt: self.stringToDate(bucket.createdAt),
                    updatedAt: self.stringToDate(bucket.updatedAt),
                )
            }
            
            // 3. Salva tutti i bucket come record individuali
            CloudKitAccess.saveBuckets(cloudKitBuckets) { result in
                switch result {
                case .success(let savedBuckets):
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Successfully synced buckets to CloudKit",
                        metadata: [
                            "count": String(savedBuckets.count)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    completion(true, savedBuckets.count)
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
     * Sincronizza le notifiche su CloudKit come record individuali
     */
    public func syncNotificationsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        let limit = getWatchNMaxNotifications()
        
        logger.info(
            tag: "CloudKitSync",
            message: "Starting notifications sync to CloudKit",
            metadata: [
                "syncType": "notifications",
                "method": "individual-records",
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
            
            // 2. Converti SyncNotification -> CloudKitNotification
            let cloudKitNotifications = notifications.map { notification in
                CloudKitNotification(
                    id: notification.id,
                    title: notification.title,
                    subtitle: notification.subtitle,
                    body: notification.body,
                    readAt: self.stringToDate(notification.readAt),
                    sentAt: self.stringToDate(notification.sentAt),
                    createdAt: self.stringToDate(notification.createdAt),
                    updatedAt: self.stringToDate(notification.updatedAt),
                    bucketId: notification.bucketId,
                    attachments: notification.attachments.map { attachment in
                        CloudKitAttachment(
                            mediaType: attachment.mediaType,
                            url: attachment.url,
                            name: attachment.name
                        )
                    },
                    actions: notification.actions.map { action in
                        CloudKitAction(
                            type: action.type,
                            value: action.value,
                            title: action.title,
                            icon: action.icon,
                            destructive: action.destructive
                        )
                    },
                    tapAction: notification.tapAction.map { tapAction in
                        CloudKitAction(
                            type: tapAction.type,
                            value: tapAction.value,
                            title: tapAction.title,
                            icon: tapAction.icon,
                            destructive: tapAction.destructive
                        )
                    }
                )
            }
            
            // 3. Salva tutte le notifiche come record individuali
            CloudKitAccess.saveNotifications(cloudKitNotifications) { result in
                switch result {
                case .success(let savedNotifications):
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Successfully synced notifications to CloudKit",
                        metadata: [
                            "count": String(savedNotifications.count),
                            "unreadCount": String(unreadCount)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    completion(true, savedNotifications.count)
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
    
    // MARK: - Sync All
    
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
    
    // MARK: - Download from CloudKit
    
    /**
     * Scarica i buckets da CloudKit come record individuali
     */
    public func fetchBucketsFromCloudKit(completion: @escaping ([Bucket]) -> Void) {
        CloudKitAccess.fetchAllBuckets { result in
            switch result {
            case .success(let cloudKitBuckets):
                // Converti CloudKitBucket -> Bucket
                let buckets = cloudKitBuckets.map { ckBucket in
                    Bucket(
                        id: ckBucket.id,
                        name: ckBucket.name,
                        description: ckBucket.description,
                        color: ckBucket.color,
                        iconUrl: ckBucket.iconUrl,
                        createdAt: self.dateToString(ckBucket.createdAt),
                        updatedAt: self.dateToString(ckBucket.updatedAt),
                    )
                }
                print("☁️ [CloudKitSync][iOS] ✅ Fetched \(buckets.count) buckets from CloudKit")
                completion(buckets)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to fetch buckets: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    /**
     * Scarica le notifiche da CloudKit come record individuali
     */
    public func fetchNotificationsFromCloudKit(limit: Int? = nil, completion: @escaping ([SyncNotification]) -> Void) {
        CloudKitAccess.fetchAllNotifications { result in
            switch result {
            case .success(let cloudKitNotifications):
                // Converti CloudKitNotification -> SyncNotification
                var syncNotifications = cloudKitNotifications.map { ckNotification in
                    SyncNotification(
                        id: ckNotification.id,
                        title: ckNotification.title,
                        subtitle: ckNotification.subtitle,
                        body: ckNotification.body,
                        readAt: self.dateToString(ckNotification.readAt),
                        sentAt: self.dateToString(ckNotification.sentAt),
                        createdAt: self.dateToString(ckNotification.createdAt),
                        updatedAt: self.dateToString(ckNotification.updatedAt),
                        bucketId: ckNotification.bucketId,
                        attachments: ckNotification.attachments.map { ckAttachment in
                            SyncAttachment(
                                mediaType: ckAttachment.mediaType,
                                url: ckAttachment.url,
                                name: ckAttachment.name
                            )
                        },
                        actions: ckNotification.actions.map { ckAction in
                            SyncAction(
                                type: ckAction.type,
                                value: ckAction.value,
                                title: ckAction.title,
                                icon: ckAction.icon,
                                destructive: ckAction.destructive
                            )
                        },
                        tapAction: ckNotification.tapAction.map { ckTapAction in
                            SyncAction(
                                type: ckTapAction.type,
                                value: ckTapAction.value,
                                title: ckTapAction.title,
                                icon: ckTapAction.icon,
                                destructive: ckTapAction.destructive
                            )
                        }
                    )
                }
                
                // Apply limit if specified
                if let limit = limit {
                    syncNotifications = Array(syncNotifications.prefix(limit))
                }
                
                print("☁️ [CloudKitSync][iOS] ✅ Fetched \(syncNotifications.count) notifications from CloudKit")
                completion(syncNotifications)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to fetch notifications: \(error.localizedDescription)")
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
     * Setup CloudKit subscriptions for real-time updates on individual records
     */
    public func setupSubscriptions(completion: @escaping (Bool) -> Void) {
        CloudKitAccess.setupSubscriptions { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Subscriptions setup successful")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to setup subscriptions: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    // MARK: - Individual Delete Methods
    
    /**
     * Delete a notification from CloudKit by ID
     */
    public func deleteNotificationFromCloudKit(id: String, completion: @escaping (Bool) -> Void = { _ in }) {
        CloudKitAccess.deleteNotification(id: id) { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Deleted notification \(id) from CloudKit")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to delete notification: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    /**
     * Delete a bucket from CloudKit by ID
     */
    public func deleteBucketFromCloudKit(id: String, completion: @escaping (Bool) -> Void = { _ in }) {
        CloudKitAccess.deleteBucket(id: id) { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Deleted bucket \(id) from CloudKit")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to delete bucket: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
}
