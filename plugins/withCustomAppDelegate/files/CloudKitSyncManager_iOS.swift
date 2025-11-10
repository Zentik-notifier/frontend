import Foundation
import CloudKit
import SQLite3
#if os(iOS)
import UIKit
import WatchConnectivity
#endif

/**
 * CloudKitSyncManager (iOS) – Gestisce la sincronizzazione tramite record individuali su CloudKit
 * 
 * Approccio con record individuali:
 * - iOS esporta il DB locale SQL -> record CloudKit individuali
 * - Un record per ogni bucket
 * - Un record per ogni notifica
 * - Watch scarica i record individuali e aggiorna il DB locale
 * - Messaggi real-time via WatchConnectivity per aggiornamenti immediati
 * 
 * IMPORTANTE: CloudKit sync è attivo SOLO se:
 * 1. Siamo su iPhone (non iPad/Mac)
 * 2. Un Apple Watch è abbinato
 */
public class CloudKitSyncManager {
    
    // MARK: - Singleton
    
    public static let shared = CloudKitSyncManager()
    
    // MARK: - Properties
    
    private let container: CKContainer
    private let privateDatabase: CKDatabase
    private let logger = LoggingSystem.shared
    private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
    
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
    
    // MARK: - Watch Pairing Check
    
    /**
     * Verifica se il sync con CloudKit è necessario.
     * 
     * CloudKit sync è attivo SOLO se:
     * 1. Siamo su iPhone (non iPad/Mac)
     * 2. Un Apple Watch è abbinato
     * 
     * Se non c'è un Watch abbinato, non ha senso sprecare risorse per CloudKit.
     */
    private func shouldSyncWithCloudKit() -> Bool {
        #if targetEnvironment(simulator)
        // Nel simulatore, permettiamo il sync per testing
        logger.info(
            tag: "CloudKitSync",
            message: "🧪 Simulator detected - allowing CloudKit sync for testing",
            source: "CloudKitSyncManager"
        )
        return true
        #else
        // Verifica che siamo su iPhone
        #if os(iOS)
        let device = UIDevice.current.userInterfaceIdiom
        guard device == .phone else {
            logger.info(
                tag: "CloudKitSync",
                message: "⏭️ Skipping CloudKit sync - not an iPhone (device: \(device.rawValue))",
                source: "CloudKitSyncManager"
            )
            return false
        }
        #endif
        
        // Verifica che WatchConnectivity sia supportato
        guard WCSession.isSupported() else {
            logger.info(
                tag: "CloudKitSync",
                message: "⏭️ Skipping CloudKit sync - WatchConnectivity not supported",
                source: "CloudKitSyncManager"
            )
            return false
        }
        
        // Verifica che un Watch sia abbinato
        let session = WCSession.default
        guard session.isPaired else {
            logger.info(
                tag: "CloudKitSync",
                message: "⏭️ Skipping CloudKit sync - no Apple Watch paired",
                source: "CloudKitSyncManager"
            )
            return false
        }
        
        logger.info(
            tag: "CloudKitSync",
            message: "✅ CloudKit sync enabled - iPhone with paired Watch",
            source: "CloudKitSyncManager"
        )
        return true
        #endif
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
                
                // print("☁️ [CloudKitSync][iOS] 🔍 Processing bucket: \(id) - \(name)")
                
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
                
                // print("☁️ [CloudKitSync][iOS] ✅ Added bucket to export: \(id) - \(name) (color: \(color ?? "none"))")
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
     * Strategia: MASS REPLACEMENT - elimina tutti i record esistenti e carica solo i buckets attuali
     */
    public func syncBucketsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false, 0)
            return
        }
        
        logger.info(
            tag: "CloudKitSync",
            message: "Starting buckets sync to CloudKit (MASS REPLACEMENT)",
            metadata: ["syncType": "buckets", "method": "mass-replacement"],
            source: "CloudKitSyncManager"
        )
        
        // Ensure custom zone exists before syncing
        CloudKitAccess.ensureCustomZoneExists { result in
            switch result {
            case .failure(let error):
                self.logger.error(
                    tag: "CloudKitSync",
                    message: "Failed to ensure custom zone exists",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitSyncManager"
                )
                completion(false, 0)
                return
            case .success:
                self.logger.debug(
                    tag: "CloudKitSync",
                    message: "Custom zone verified/created successfully",
                    source: "CloudKitSyncManager"
                )
            }
            
            // Step 1: Fetch ALL existing bucket IDs from CloudKit
            self.logger.info(
                tag: "CloudKitSync",
                message: "Fetching existing buckets from CloudKit for cleanup",
                source: "CloudKitSyncManager"
            )
            
            CloudKitAccess.fetchAllBuckets { fetchResult in
                var existingBucketIDs: [String] = []
                
                switch fetchResult {
                case .success(let existingBuckets):
                    existingBucketIDs = existingBuckets.map { $0.id }
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Found existing buckets in CloudKit",
                        metadata: ["count": String(existingBucketIDs.count)],
                        source: "CloudKitSyncManager"
                    )
                case .failure(let error):
                    self.logger.warn(
                        tag: "CloudKitSync",
                        message: "Failed to fetch existing buckets (will proceed anyway)",
                        metadata: ["error": error.localizedDescription],
                        source: "CloudKitSyncManager"
                    )
                }
                
                // Step 2: Export current buckets from local database
                do {
                    let buckets = try self.exportBucketsFromDatabase()
                    
                    self.logger.debug(
                        tag: "CloudKitSync",
                        message: "Exported buckets from database",
                        metadata: [
                            "count": String(buckets.count),
                            "firstId": buckets.first?.id ?? "none",
                            "lastId": buckets.last?.id ?? "none"
                        ],
                        source: "CloudKitSyncManager"
                    )
                    
                    // Step 3: Determine which IDs to delete (exist in CloudKit but not in local DB)
                    let localBucketIDs = Set(buckets.map { $0.id })
                    let idsToDelete = existingBucketIDs.filter { !localBucketIDs.contains($0) }
                    
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Calculated sync changes",
                        metadata: [
                            "localCount": String(buckets.count),
                            "cloudCount": String(existingBucketIDs.count),
                            "toDelete": String(idsToDelete.count)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    
                    // Step 4: Delete obsolete records from CloudKit
                    if !idsToDelete.isEmpty {
                        self.logger.info(
                            tag: "CloudKitSync",
                            message: "Deleting obsolete buckets from CloudKit",
                            metadata: ["count": String(idsToDelete.count)],
                            source: "CloudKitSyncManager"
                        )
                        
                        CloudKitAccess.deleteBuckets(ids: idsToDelete) { deleteResult in
                            switch deleteResult {
                            case .success:
                                self.logger.info(
                                    tag: "CloudKitSync",
                                    message: "Successfully deleted obsolete buckets",
                                    metadata: ["count": String(idsToDelete.count)],
                                    source: "CloudKitSyncManager"
                                )
                            case .failure(let error):
                                self.logger.warn(
                                    tag: "CloudKitSync",
                                    message: "Failed to delete some obsolete buckets (non-critical)",
                                    metadata: ["error": error.localizedDescription],
                                    source: "CloudKitSyncManager"
                                )
                            }
                            
                            // Step 5: Save/update all current local buckets to CloudKit
                            self.saveBucketsToCloudKit(buckets: buckets, completion: completion)
                        }
                    } else {
                        // No deletions needed, proceed directly to save
                        self.logger.debug(
                            tag: "CloudKitSync",
                            message: "No obsolete buckets to delete",
                            source: "CloudKitSyncManager"
                        )
                        self.saveBucketsToCloudKit(buckets: buckets, completion: completion)
                    }
                    
                } catch {
                    self.logger.error(
                        tag: "CloudKitSync",
                        message: "Error exporting buckets",
                        metadata: ["error": error.localizedDescription],
                        source: "CloudKitSyncManager"
                    )
                    completion(false, 0)
                }
            }
        } // End ensureCustomZoneExists
    }
    
    /**
     * Helper: Save buckets to CloudKit (called by syncBucketsToCloudKit)
     */
    private func saveBucketsToCloudKit(buckets: [Bucket], completion: @escaping (Bool, Int) -> Void) {
        // Convert Bucket -> CloudKitBucket
        let cloudKitBuckets = buckets.map { bucket in
            CloudKitBucket(
                id: bucket.id,
                name: bucket.name,
                description: bucket.description,
                color: bucket.color,
                iconUrl: bucket.iconUrl,
                createdAt: DateConverter.stringToDate(bucket.createdAt),
                updatedAt: DateConverter.stringToDate(bucket.updatedAt),
            )
        }
        
        // Save all buckets to CloudKit
        CloudKitAccess.saveBuckets(cloudKitBuckets) { result in
            switch result {
            case .success(let savedBuckets):
                self.logger.info(
                    tag: "CloudKitSync",
                    message: "Successfully synced buckets to CloudKit",
                    metadata: ["count": String(savedBuckets.count)],
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
    }
    
    /**
     * Sincronizza le notifiche su CloudKit come record individuali
     * Strategia: MASS REPLACEMENT - elimina tutti i record esistenti e carica solo le notifiche attuali
     */
    public func syncNotificationsToCloudKit(limit: Int, completion: @escaping (Bool, Int) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false, 0)
            return
        }
        
        logger.info(
            tag: "CloudKitSync",
            message: "Starting notifications sync to CloudKit (MASS REPLACEMENT)",
            metadata: [
                "syncType": "notifications",
                "method": "mass-replacement",
                "limit": String(limit)
            ],
            source: "CloudKitSyncManager"
        )
        
        // Ensure custom zone exists before syncing
        CloudKitAccess.ensureCustomZoneExists { result in
            switch result {
            case .failure(let error):
                self.logger.error(
                    tag: "CloudKitSync",
                    message: "Failed to ensure custom zone exists",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitSyncManager"
                )
                completion(false, 0)
                return
            case .success:
                self.logger.debug(
                    tag: "CloudKitSync",
                    message: "Custom zone verified/created successfully",
                    source: "CloudKitSyncManager"
                )
            }
            
            // Step 1: Fetch ALL existing notification IDs from CloudKit
            self.logger.info(
                tag: "CloudKitSync",
                message: "Fetching existing notifications from CloudKit for cleanup",
                source: "CloudKitSyncManager"
            )
            
            CloudKitAccess.fetchAllNotifications { fetchResult in
                var existingNotificationIDs: [String] = []
                
                switch fetchResult {
                case .success(let existingNotifications):
                    existingNotificationIDs = existingNotifications.map { $0.id }
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Found existing notifications in CloudKit",
                        metadata: ["count": String(existingNotificationIDs.count)],
                        source: "CloudKitSyncManager"
                    )
                case .failure(let error):
                    self.logger.warn(
                        tag: "CloudKitSync",
                        message: "Failed to fetch existing notifications (will proceed anyway)",
                        metadata: ["error": error.localizedDescription],
                        source: "CloudKitSyncManager"
                    )
                }
                
                // Step 2: Export current notifications from local database
                do {
                    let notifications = try self.exportNotificationsFromDatabase(limit: limit)
                    
                    let firstNotification = notifications.first
                    let lastNotification = notifications.last
                    let unreadCount = notifications.filter { $0.readAt == nil }.count
                    
                    self.logger.debug(
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
                    
                    // Step 3: Determine which IDs to delete (exist in CloudKit but not in local DB)
                    let localNotificationIDs = Set(notifications.map { $0.id })
                    let idsToDelete = existingNotificationIDs.filter { !localNotificationIDs.contains($0) }
                    
                    self.logger.info(
                        tag: "CloudKitSync",
                        message: "Calculated sync changes",
                        metadata: [
                            "localCount": String(notifications.count),
                            "cloudCount": String(existingNotificationIDs.count),
                            "toDelete": String(idsToDelete.count)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    
                    // Step 4: Delete obsolete records from CloudKit
                    if !idsToDelete.isEmpty {
                        self.logger.info(
                            tag: "CloudKitSync",
                            message: "Deleting obsolete notifications from CloudKit",
                            metadata: ["count": String(idsToDelete.count)],
                            source: "CloudKitSyncManager"
                        )
                        
                        CloudKitAccess.deleteNotifications(ids: idsToDelete) { deleteResult in
                            switch deleteResult {
                            case .success:
                                self.logger.info(
                                    tag: "CloudKitSync",
                                    message: "Successfully deleted obsolete notifications",
                                    metadata: ["count": String(idsToDelete.count)],
                                    source: "CloudKitSyncManager"
                                )
                            case .failure(let error):
                                self.logger.warn(
                                    tag: "CloudKitSync",
                                    message: "Failed to delete some obsolete notifications (non-critical)",
                                    metadata: ["error": error.localizedDescription],
                                    source: "CloudKitSyncManager"
                                )
                            }
                            
                            // Step 5: Save/update all current local notifications to CloudKit
                            self.saveNotificationsToCloudKit(notifications: notifications, unreadCount: unreadCount, completion: completion)
                        }
                    } else {
                        // No deletions needed, proceed directly to save
                        self.logger.debug(
                            tag: "CloudKitSync",
                            message: "No obsolete notifications to delete",
                            source: "CloudKitSyncManager"
                        )
                        self.saveNotificationsToCloudKit(notifications: notifications, unreadCount: unreadCount, completion: completion)
                    }
                    
                } catch {
                    self.logger.error(
                        tag: "CloudKitSync",
                        message: "Error exporting notifications",
                        metadata: ["error": error.localizedDescription],
                        source: "CloudKitSyncManager"
                    )
                    completion(false, 0)
                }
            }
        } // End ensureCustomZoneExists
    }
    
    /**
     * Helper: Save notifications to CloudKit (called by syncNotificationsToCloudKit)
     */
    private func saveNotificationsToCloudKit(notifications: [SyncNotification], unreadCount: Int, completion: @escaping (Bool, Int) -> Void) {
        // Convert SyncNotification -> CloudKitNotification
        let cloudKitNotifications = notifications.map { notification in
            CloudKitNotification(
                id: notification.id,
                title: notification.title,
                subtitle: notification.subtitle,
                body: notification.body,
                readAt: DateConverter.stringToDate(notification.readAt),
                sentAt: DateConverter.stringToDate(notification.sentAt),
                createdAt: DateConverter.stringToDate(notification.createdAt),
                updatedAt: DateConverter.stringToDate(notification.updatedAt),
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
        
        // Save all notifications to CloudKit
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
    }
    
    // MARK: - Sync All
    
    /**
     * Sincronizza sia buckets che notifications su CloudKit
     */
    public func syncAllToCloudKit(limit: Int, completion: @escaping (Bool, Int, Int) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false, 0, 0)
            return
        }
        
        logger.info(
            tag: "CloudKitSync",
            message: "Starting full sync to CloudKit",
            metadata: [
                "syncType": "all",
                "limit": String(limit)
            ],
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
        
        syncNotificationsToCloudKit(limit: limit) { success, count in
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
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion([])
            return
        }
        
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
                        createdAt: DateConverter.dateToString(ckBucket.createdAt),
                        updatedAt: DateConverter.dateToString(ckBucket.updatedAt),
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
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion([])
            return
        }
        
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
                        readAt: DateConverter.dateToString(ckNotification.readAt),
                        sentAt: DateConverter.dateToString(ckNotification.sentAt),
                        createdAt: DateConverter.dateToString(ckNotification.createdAt),
                        updatedAt: DateConverter.dateToString(ckNotification.updatedAt),
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
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion([], [])
            return
        }
        
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
    /**
     * Setup CloudKit subscriptions (DISABLED - using WatchConnectivity only)
     */
    public func setupSubscriptions(completion: @escaping (Bool) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
        print("☁️ [CloudKitSync][iOS] ℹ️ CloudKit subscriptions disabled - using WatchConnectivity for sync")
        completion(true)
        
        // CloudKit subscriptions not used - WatchConnectivity provides real-time sync
        // CloudKitAccess.setupSubscriptions { result in
        //     switch result {
        //     case .success:
        //         print("☁️ [CloudKitSync][iOS] ✅ Subscriptions setup successful")
        //         completion(true)
        //     case .failure(let error):
        //         print("☁️ [CloudKitSync][iOS] ❌ Failed to setup subscriptions: \(error.localizedDescription)")
        //         completion(false)
        //     }
        // }
    }
    
    // MARK: - Individual Delete Methods
    
    /**
     * Delete a notification from CloudKit by ID
     */
    public func deleteNotificationFromCloudKit(id: String, completion: @escaping (Bool) -> Void = { _ in }) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
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
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
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
    
    // MARK: - Individual Add/Update Methods
    
    /**
     * Add a single notification to CloudKit
     */
    public func addNotificationToCloudKit(_ notification: SyncNotification, completion: @escaping (Bool) -> Void = { _ in }) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
        let cloudKitNotification = CloudKitNotification(
            id: notification.id,
            title: notification.title,
            subtitle: notification.subtitle,
            body: notification.body,
            readAt: DateConverter.stringToDate(notification.readAt),
            sentAt: DateConverter.stringToDate(notification.sentAt),
            createdAt: DateConverter.stringToDate(notification.createdAt),
            updatedAt: DateConverter.stringToDate(notification.updatedAt),
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
        
        CloudKitAccess.addNotification(cloudKitNotification) { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Added notification \(notification.id) to CloudKit")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to add notification: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    /**
     * Update a single notification in CloudKit
     */
    public func updateNotificationInCloudKit(_ notification: SyncNotification, completion: @escaping (Bool) -> Void = { _ in }) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
        let cloudKitNotification = CloudKitNotification(
            id: notification.id,
            title: notification.title,
            subtitle: notification.subtitle,
            body: notification.body,
            readAt: DateConverter.stringToDate(notification.readAt),
            sentAt: DateConverter.stringToDate(notification.sentAt),
            createdAt: DateConverter.stringToDate(notification.createdAt),
            updatedAt: DateConverter.stringToDate(notification.updatedAt),
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
        
        CloudKitAccess.updateNotification(cloudKitNotification) { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Updated notification \(notification.id) in CloudKit")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to update notification: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    /**
     * Add a single bucket to CloudKit
     */
    public func addBucketToCloudKit(_ bucket: Bucket, completion: @escaping (Bool) -> Void = { _ in }) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
        let cloudKitBucket = CloudKitBucket(
            id: bucket.id,
            name: bucket.name,
            description: bucket.description,
            color: bucket.color,
            iconUrl: bucket.iconUrl,
            createdAt: DateConverter.stringToDate(bucket.createdAt),
            updatedAt: DateConverter.stringToDate(bucket.updatedAt)
        )
        
        CloudKitAccess.addBucket(cloudKitBucket) { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Added bucket \(bucket.id) to CloudKit")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to add bucket: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    /**
     * Update a single bucket in CloudKit
     */
    public func updateBucketInCloudKit(_ bucket: Bucket, completion: @escaping (Bool) -> Void = { _ in }) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false)
            return
        }
        
        let cloudKitBucket = CloudKitBucket(
            id: bucket.id,
            name: bucket.name,
            description: bucket.description,
            color: bucket.color,
            iconUrl: bucket.iconUrl,
            createdAt: DateConverter.stringToDate(bucket.createdAt),
            updatedAt: DateConverter.stringToDate(bucket.updatedAt)
        )
        
        CloudKitAccess.updateBucket(cloudKitBucket) { result in
            switch result {
            case .success:
                print("☁️ [CloudKitSync][iOS] ✅ Updated bucket \(bucket.id) in CloudKit")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][iOS] ❌ Failed to update bucket: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    // MARK: - Incremental Sync with Change Tokens
    
    /**
     * Fetch changes from CloudKit since the last sync using stored tokens
     * AND apply them to the local SQLite database
     * This is the recommended approach for efficient syncing
     */
    public func fetchIncrementalChanges(completion: @escaping (Bool, Int, Int) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(false, 0, 0)
            return
        }
        
        logger.info(
            tag: "IncrementalSync",
            message: "Fetching incremental changes from CloudKit",
            source: "CloudKitSyncManager"
        )
        
        // Ensure custom zone exists before fetching
        CloudKitAccess.ensureCustomZoneExists { result in
            switch result {
            case .failure(let error):
                self.logger.error(
                    tag: "IncrementalSync",
                    message: "Failed to ensure custom zone exists",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitSyncManager"
                )
                completion(false, 0, 0)
                return
            case .success:
                self.logger.debug(
                    tag: "IncrementalSync",
                    message: "Custom zone verified/created successfully",
                    source: "CloudKitSyncManager"
                )
            }
            
            CloudKitAccess.fetchAllChanges { result in
                switch result {
                case .success(let (bucketChanges, notificationChanges)):
                    let totalBucketChanges = bucketChanges.added.count + bucketChanges.modified.count + bucketChanges.deleted.count
                    let totalNotificationChanges = notificationChanges.added.count + notificationChanges.modified.count + notificationChanges.deleted.count
                    
                    self.logger.info(
                        tag: "IncrementalSync",
                        message: "Successfully fetched incremental changes",
                        metadata: [
                            "bucketsAdded": String(bucketChanges.added.count),
                            "bucketsModified": String(bucketChanges.modified.count),
                            "bucketsDeleted": String(bucketChanges.deleted.count),
                            "notificationsAdded": String(notificationChanges.added.count),
                            "notificationsModified": String(notificationChanges.modified.count),
                            "notificationsDeleted": String(notificationChanges.deleted.count)
                        ],
                        source: "CloudKitSyncManager"
                    )
                    
                    // Apply changes to local SQLite database
                    self.applyChangesToDatabase(
                        // bucketChanges: bucketChanges,
                        notificationChanges: notificationChanges
                    ) { dbSuccess in
                        if dbSuccess {
                            self.logger.info(
                                tag: "IncrementalSync",
                                message: "Successfully applied changes to local database",
                                source: "CloudKitSyncManager"
                            )
                        } else {
                            self.logger.error(
                                tag: "IncrementalSync",
                                message: "Failed to apply some changes to local database",
                                source: "CloudKitSyncManager"
                            )
                        }
                        
                        completion(dbSuccess, totalBucketChanges, totalNotificationChanges)
                    }
                    
                case .failure(let error):
                    self.logger.error(
                        tag: "IncrementalSync",
                        message: "Failed to fetch incremental changes",
                        metadata: ["error": error.localizedDescription],
                        source: "CloudKitSyncManager"
                    )
                    completion(false, 0, 0)
                }
            }
        }
    }
    
    /**
     * Apply CloudKit changes to local SQLite database
     */
    private func applyChangesToDatabase(
        // bucketChanges: CloudKitAccess.BucketChanges,
        notificationChanges: CloudKitAccess.NotificationChanges,
        completion: @escaping (Bool) -> Void
    ) {
        var allSuccess = true
        let group = DispatchGroup()
        
        // Apply bucket changes
        // for bucket in bucketChanges.added + bucketChanges.modified {
        //     group.enter()
        //     self.saveBucketToDatabase(bucket) { success in
        //         if !success { allSuccess = false }
        //         group.leave()
        //     }
        // }
        
        // for bucketId in bucketChanges.deleted {
        //     group.enter()
        //     self.deleteBucketFromDatabase(bucketId) { success in
        //         if !success { allSuccess = false }
        //         group.leave()
        //     }
        // }
        
        // Apply notification changes
        
        // Log added notifications
        if !notificationChanges.added.isEmpty {
            logger.info(
                tag: "IncrementalSync",
                message: "Processing ADDED notifications",
                metadata: [
                    "count": String(notificationChanges.added.count),
                    "ids": notificationChanges.added.map { $0.id }.joined(separator: ", ")
                ],
                source: "CloudKitSyncManager"
            )
            
            // Log each added notification details
            for notification in notificationChanges.added {
                logger.debug(
                    tag: "IncrementalSync",
                    message: "Added notification details",
                    metadata: [
                        "id": notification.id,
                        "title": notification.title,
                        "bucketId": notification.bucketId,
                        "hasReadAt": notification.readAt != nil ? "true" : "false",
                        "readAt": notification.readAt != nil ? DateConverter.dateToString(notification.readAt!) : "null",
                        "createdAt": DateConverter.dateToString(notification.createdAt),
                        "updatedAt": DateConverter.dateToString(notification.updatedAt)
                    ],
                    source: "CloudKitSyncManager"
                )
            }
        }
        
        // Log modified notifications with details
        if !notificationChanges.modified.isEmpty {
            logger.info(
                tag: "IncrementalSync",
                message: "Processing MODIFIED notifications",
                metadata: [
                    "count": String(notificationChanges.modified.count),
                    "ids": notificationChanges.modified.map { $0.id }.joined(separator: ", ")
                ],
                source: "CloudKitSyncManager"
            )
            
            // Log each modified notification details
            for notification in notificationChanges.modified {
                logger.debug(
                    tag: "IncrementalSync",
                    message: "Modified notification details",
                    metadata: [
                        "id": notification.id,
                        "title": notification.title,
                        "bucketId": notification.bucketId,
                        "hasReadAt": notification.readAt != nil ? "true" : "false",
                    ],
                    source: "CloudKitSyncManager"
                )
            }
        }
        
        for notification in notificationChanges.added + notificationChanges.modified {
            group.enter()
            self.saveNotificationToDatabase(notification) { success in
                if !success { allSuccess = false }
                group.leave()
            }
        }
        
        for notificationId in notificationChanges.deleted {
            group.enter()
            self.deleteNotificationFromDatabase(notificationId) { success in
                if !success { allSuccess = false }
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            completion(allSuccess)
        }
    }
    
    /**
     * Save/update bucket in local database
     */
    private func saveBucketToDatabase(_ bucket: CloudKitBucket, completion: @escaping (Bool) -> Void) {
        DatabaseAccess.performDatabaseOperation(
            type: .write,
            name: "SaveBucket",
            source: "CloudKitSync"
        ) { db in
            let fragment: [String: Any?] = [
                "description": bucket.description,
                "color": bucket.color,
                "iconUrl": bucket.iconUrl,
                "createdAt": DateConverter.dateToString(bucket.createdAt) as String,
                "updatedAt": DateConverter.dateToString(bucket.updatedAt) as String
            ]
            
            guard let fragmentData = try? JSONSerialization.data(withJSONObject: fragment),
                  let fragmentString = String(data: fragmentData, encoding: .utf8) else {
                return .failure("Failed to serialize bucket fragment")
            }
            
            let sql = """
                INSERT OR REPLACE INTO buckets (id, name, fragment, updated_at)
                VALUES (?, ?, ?, ?)
            """
            
            let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
            
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                let errMsg = String(cString: sqlite3_errmsg(db))
                return .failure("Failed to prepare bucket statement: \(errMsg)")
            }
            defer { sqlite3_finalize(stmt) }
            
            sqlite3_bind_text(stmt, 1, bucket.id, -1, SQLITE_TRANSIENT)
            sqlite3_bind_text(stmt, 2, bucket.name, -1, SQLITE_TRANSIENT)
            sqlite3_bind_text(stmt, 3, fragmentString, -1, SQLITE_TRANSIENT)
            sqlite3_bind_text(stmt, 4, (DateConverter.dateToString(bucket.updatedAt) as String), -1, SQLITE_TRANSIENT)
            
            guard sqlite3_step(stmt) == SQLITE_DONE else {
                let errMsg = String(cString: sqlite3_errmsg(db))
                let errCode = sqlite3_errcode(db)
                return .failure("Failed to save bucket (code \(errCode)): \(errMsg)")
            }
            
            return .success
        } completion: { result in
            switch result {
            case .success:
                completion(true)
            case .failure, .timeout, .locked:
                completion(false)
            }
        }
    }
    
    /**
     * Delete bucket from local database
     */
    private func deleteBucketFromDatabase(_ bucketId: String, completion: @escaping (Bool) -> Void) {
        DatabaseAccess.performDatabaseOperation(
            type: .write,
            name: "DeleteBucket",
            source: "CloudKitSync"
        ) { db in
            let sql = "DELETE FROM buckets WHERE id = ?"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                return .failure("Failed to prepare statement")
            }
            defer { sqlite3_finalize(stmt) }
            
            sqlite3_bind_text(stmt, 1, bucketId, -1, self.SQLITE_TRANSIENT)
            
            guard sqlite3_step(stmt) == SQLITE_DONE else {
                return .failure("Failed to delete bucket")
            }
            
            return .success
        } completion: { result in
            switch result {
            case .success:
                completion(true)
            case .failure, .timeout, .locked:
                completion(false)
            }
        }
    }
    
    /**
     * Save/update notification in local database
     */
    private func saveNotificationToDatabase(_ notification: CloudKitNotification, completion: @escaping (Bool) -> Void) {
        DatabaseAccess.performDatabaseOperation(
            type: .write,
            name: "SaveNotification",
            source: "CloudKitSync"
        ) { db in
            // Build message fragment
            var message: [String: Any?] = [
                "title": notification.title,
                "subtitle": notification.subtitle,
                "body": notification.body,
                "bucket": ["id": notification.bucketId] // Include bucket in fragment for TypeScript parser
            ]
            
            if !notification.attachments.isEmpty {
                message["attachments"] = notification.attachments.map { att in
                    ["mediaType": att.mediaType, "url": att.url, "name": att.name]
                }
            }
            
            if !notification.actions.isEmpty {
                message["actions"] = notification.actions.map { action in
                    [
                        "type": action.type,
                        "value": action.value,
                        "title": action.title,
                        "icon": action.icon,
                        "destructive": action.destructive
                    ]
                }
            }
            
            if let tapAction = notification.tapAction {
                message["tapAction"] = [
                    "type": tapAction.type,
                    "value": tapAction.value,
                    "title": tapAction.title,
                    "icon": tapAction.icon,
                    "destructive": tapAction.destructive
                ]
            }
            
            
            let sentAtString: String? = DateConverter.dateToString(notification.sentAt)
            let createdAtString: String = DateConverter.dateToString(notification.createdAt)
            let readAtString: String? = DateConverter.dateToString(notification.readAt)
            let updatedAtString: String = DateConverter.dateToString(notification.updatedAt)
            
            let fragment: [String: Any?] = [
                "id": notification.id, // Include ID in fragment for JavaScript parser
                "message": message,
                "bucketId": notification.bucketId, // Include bucketId at root for fallback parsing
                "sentAt": sentAtString,
                "createdAt": createdAtString,
                "readAt": readAtString,
                "updatedAt": updatedAtString
            ]
            
            guard let fragmentData = try? JSONSerialization.data(withJSONObject: fragment),
                  let fragmentString = String(data: fragmentData, encoding: .utf8) else {
                return .failure("Failed to serialize notification fragment")
            }
            
            let sql = """
                INSERT OR REPLACE INTO notifications (id, fragment, created_at, read_at, bucket_id)
                VALUES (?, ?, ?, ?, ?)
            """
            
            let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)
            
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                let errMsg = String(cString: sqlite3_errmsg(db))
                return .failure("Failed to prepare notification statement: \(errMsg)")
            }
            defer { sqlite3_finalize(stmt) }
            
            sqlite3_bind_text(stmt, 1, notification.id, -1, SQLITE_TRANSIENT)
            sqlite3_bind_text(stmt, 2, fragmentString, -1, SQLITE_TRANSIENT)
            sqlite3_bind_text(stmt, 3, (DateConverter.dateToString(notification.createdAt) as String), -1, SQLITE_TRANSIENT)
            
            if let readAt = notification.readAt {
                sqlite3_bind_text(stmt, 4, (DateConverter.dateToString(readAt) as String), -1, SQLITE_TRANSIENT)
            } else {
                sqlite3_bind_null(stmt, 4)
            }
            
            sqlite3_bind_text(stmt, 5, notification.bucketId, -1, SQLITE_TRANSIENT)
            
            guard sqlite3_step(stmt) == SQLITE_DONE else {
                let errMsg = String(cString: sqlite3_errmsg(db))
                let errCode = sqlite3_errcode(db)
                return .failure("Failed to save notification (code \(errCode)): \(errMsg)")
            }
            
            return .success
        } completion: { result in
            switch result {
            case .success:
                completion(true)
            case .failure, .timeout, .locked:
                completion(false)
            }
        }
    }
    
    /**
     * Delete notification from local database
     */
    private func deleteNotificationFromDatabase(_ notificationId: String, completion: @escaping (Bool) -> Void) {
        DatabaseAccess.performDatabaseOperation(
            type: .write,
            name: "DeleteNotification",
            source: "CloudKitSync"
        ) { db in
            let sql = "DELETE FROM notifications WHERE id = ?"
            var stmt: OpaquePointer?
            guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                return .failure("Failed to prepare statement")
            }
            defer { sqlite3_finalize(stmt) }
            
            sqlite3_bind_text(stmt, 1, notificationId, -1, self.SQLITE_TRANSIENT)
            
            guard sqlite3_step(stmt) == SQLITE_DONE else {
                return .failure("Failed to delete notification")
            }
            
            return .success
        } completion: { result in
            switch result {
            case .success:
                completion(true)
            case .failure, .timeout, .locked:
                completion(false)
            }
        }
    }
    
    /**
     * Fetch bucket changes only from CloudKit since the last sync
     */
    public func fetchBucketChanges(completion: @escaping (CloudKitAccess.BucketChanges?) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(nil)
            return
        }
        
        logger.info(
            tag: "IncrementalSync",
            message: "Fetching bucket changes from CloudKit",
            source: "CloudKitSyncManager"
        )
        
        CloudKitAccess.fetchBucketChanges { result in
            switch result {
            case .success(let changes):
                self.logger.info(
                    tag: "IncrementalSync",
                    message: "Successfully fetched bucket changes",
                    metadata: [
                        "added": String(changes.added.count),
                        "modified": String(changes.modified.count),
                        "deleted": String(changes.deleted.count)
                    ],
                    source: "CloudKitSyncManager"
                )
                completion(changes)
                
            case .failure(let error):
                self.logger.error(
                    tag: "IncrementalSync",
                    message: "Failed to fetch bucket changes",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitSyncManager"
                )
                completion(nil)
            }
        }
    }
    
    /**
     * Fetch notification changes only from CloudKit since the last sync
     */
    public func fetchNotificationChanges(completion: @escaping (CloudKitAccess.NotificationChanges?) -> Void) {
        // Verifica se il sync è necessario (Watch abbinato)
        guard shouldSyncWithCloudKit() else {
            completion(nil)
            return
        }
        
        logger.info(
            tag: "IncrementalSync",
            message: "Fetching notification changes from CloudKit",
            source: "CloudKitSyncManager"
        )
        
        CloudKitAccess.fetchNotificationChanges { result in
            switch result {
            case .success(let changes):
                self.logger.info(
                    tag: "IncrementalSync",
                    message: "Successfully fetched notification changes",
                    metadata: [
                        "added": String(changes.added.count),
                        "modified": String(changes.modified.count),
                        "deleted": String(changes.deleted.count)
                    ],
                    source: "CloudKitSyncManager"
                )
                completion(changes)
                
            case .failure(let error):
                self.logger.error(
                    tag: "IncrementalSync",
                    message: "Failed to fetch notification changes",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitSyncManager"
                )
                completion(nil)
            }
        }
    }
    
    /**
     * Clear all stored change tokens to force a full sync next time
     */
    public func clearSyncTokens() {
        CloudKitAccess.clearAllChangeTokens()
        logger.info(
            tag: "IncrementalSync",
            message: "Cleared all sync tokens - next sync will be full",
            source: "CloudKitSyncManager"
        )
    }
}
