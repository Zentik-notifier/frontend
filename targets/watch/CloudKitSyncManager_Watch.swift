import Foundation
import CloudKit

/**
 * CloudKitSyncManager (watchOS) – Gestisce la sincronizzazione tramite file JSON da CloudKit
 * 
 * Nuovo approccio Watch:
 * - Watch scarica i file JSON da CloudKit (buckets.json e notifications.json)
 * - Salva i JSON in file locali nella cartella shared dell'app
 * - Non usa SQL, solo file JSON
 * - Notifiche modificate vengono segnalate a iOS via WatchConnectivity
 * - iOS poi riesporta il JSON aggiornato su CloudKit
 */
public class CloudKitSyncManager {
    
    // MARK: - Singleton
    
    public static let shared = CloudKitSyncManager()
    
    // MARK: - Properties
    
    private let container: CKContainer
    private let privateDatabase: CKDatabase
    private let customZone: CKRecordZone
    private let logger = LoggingSystem.shared
    
    // Zone ID per la zona condivisa con iOS
    private let zoneID: CKRecordZone.ID
    
    // Watch-specific limit for notifications (no need to read from iOS settings)
    private let watchNotificationLimit = 150
    
    // Last sync timestamp
    private var lastBucketsSyncTimestamp: String?
    private var lastNotificationsSyncTimestamp: String?
    
    // Date formatter for ISO8601 strings
    private let dateFormatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    // File paths for local JSON storage
    private var bucketsFilePath: URL {
        let sharedContainerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.\(KeychainAccess.getMainBundleIdentifier())"
        )!
        return sharedContainerURL.appendingPathComponent("buckets.json")
    }
    
    private var notificationsFilePath: URL {
        let sharedContainerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: "group.\(KeychainAccess.getMainBundleIdentifier())"
        )!
        return sharedContainerURL.appendingPathComponent("notifications.json")
    }
    
    // MARK: - Initialization
    
    private init() {
        // Use centralized CloudKit setup
        let setup = KeychainAccess.getCloudKitSetup()
        self.container = setup.container
        self.privateDatabase = setup.privateDatabase
        
        // Create custom zone using centralized method
        self.zoneID = KeychainAccess.getCloudKitZoneID()
        self.customZone = CKRecordZone(zoneID: zoneID)
        
        let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        
        logger.info(
            tag: "Initialization",
            message: "CloudKit container initialized on Watch",
            metadata: [
                "mainBundleId": mainBundleId,
                "containerIdentifier": containerIdentifier,
                "zoneName": zoneID.zoneName,
                "bucketsFilePath": bucketsFilePath.path,
                "notificationsFilePath": notificationsFilePath.path
            ],
            source: "CloudKit-Watch"
        )
        
        print("☁️ [CloudKitSync][Watch] Using container: \(containerIdentifier)")
        print("☁️ [CloudKitSync][Watch] Target zone: \(zoneID.zoneName)")
        print("☁️ [CloudKitSync][Watch] Buckets file: \(bucketsFilePath.path)")
        print("☁️ [CloudKitSync][Watch] Notifications file: \(notificationsFilePath.path)")
        
        // Check iCloud account status
        container.accountStatus { status, error in
            if let error = error {
                self.logger.error(
                    tag: "Initialization",
                    message: "Failed to check iCloud account status",
                    metadata: [
                        "error": error.localizedDescription,
                        "containerIdentifier": containerIdentifier
                    ],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ❌ Failed to check iCloud account: \(error.localizedDescription)")
            } else {
                let statusString: String
                switch status {
                case .available:
                    statusString = "available"
                case .noAccount:
                    statusString = "noAccount"
                case .restricted:
                    statusString = "restricted"
                case .couldNotDetermine:
                    statusString = "couldNotDetermine"
                case .temporarilyUnavailable:
                    statusString = "temporarilyUnavailable"
                @unknown default:
                    statusString = "unknown"
                }
                
                self.logger.info(
                    tag: "Initialization",
                    message: "iCloud account status checked",
                    metadata: [
                        "status": statusString,
                        "statusRawValue": String(status.rawValue),
                        "containerIdentifier": containerIdentifier
                    ],
                    source: "CloudKit-Watch"
                )
                
                print("☁️ [CloudKitSync][Watch] iCloud account status: \(statusString)")
                
                if status != .available {
                    self.logger.warn(
                        tag: "Initialization",
                        message: "iCloud account not available",
                        metadata: ["status": statusString],
                        source: "CloudKit-Watch"
                    )
                    print("☁️ [CloudKitSync][Watch] ⚠️ iCloud not available! Status: \(statusString)")
                }
            }
        }
        
        // Load last sync timestamps
        loadSyncTimestamps()
    }
    
    // MARK: - Sync Timestamp Management
    
    private func loadSyncTimestamps() {
        lastBucketsSyncTimestamp = UserDefaults.standard.string(forKey: "lastBucketsSyncTimestamp")
        lastNotificationsSyncTimestamp = UserDefaults.standard.string(forKey: "lastNotificationsSyncTimestamp")
    }
    
    private func saveBucketsSyncTimestamp(_ timestamp: String) {
        lastBucketsSyncTimestamp = timestamp
        UserDefaults.standard.set(timestamp, forKey: "lastBucketsSyncTimestamp")
    }
    
    private func saveNotificationsSyncTimestamp(_ timestamp: String) {
        lastNotificationsSyncTimestamp = timestamp
        UserDefaults.standard.set(timestamp, forKey: "lastNotificationsSyncTimestamp")
    }
    
    // MARK: - Zone Setup
    
    /**
     * Check if the custom zone exists (watch only checks, doesn't create)
     */
    private func checkZoneExists(completion: @escaping (Bool) -> Void) {
        let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        
        logger.info(
            tag: "ZoneCheck",
            message: "Checking if CloudKit zone exists",
            metadata: [
                "zoneName": zoneID.zoneName,
                "zoneOwner": zoneID.ownerName,
                "containerIdentifier": containerIdentifier,
                "mainBundleId": mainBundleId
            ],
            source: "CloudKit-Watch"
        )
        
        privateDatabase.fetch(withRecordZoneID: zoneID) { (zone, error) in
            if let error = error as? CKError {
                self.logger.error(
                    tag: "ZoneCheck",
                    message: "Error checking zone",
                    metadata: [
                        "error": error.localizedDescription,
                        "errorCode": String(error.code.rawValue),
                        "zoneName": self.zoneID.zoneName,
                        "isZoneNotFound": String(error.code == .zoneNotFound),
                        "isUnknownItem": String(error.code == .unknownItem)
                    ],
                    source: "CloudKit-Watch"
                )
                
                if error.code == .unknownItem || error.code == .zoneNotFound {
                    print("☁️ [CloudKitSync][Watch] ⚠️ Zone \(self.zoneID.zoneName) not found. Waiting for iOS to create it...")
                    completion(false)
                } else {
                    print("☁️ [CloudKitSync][Watch] ⚠️ Error checking zone: \(error.localizedDescription)")
                    completion(false)
                }
            } else if zone != nil {
                self.logger.info(
                    tag: "ZoneCheck",
                    message: "Custom zone exists",
                    metadata: ["zoneName": self.zoneID.zoneName],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ✅ Custom zone exists: \(self.zoneID.zoneName)")
                completion(true)
            } else {
                self.logger.warn(
                    tag: "ZoneCheck",
                    message: "Zone fetch returned nil without error",
                    metadata: ["zoneName": self.zoneID.zoneName],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ⚠️ Zone fetch returned nil without error. Waiting for iOS...")
                completion(false)
            }
        }
    }
    
    // MARK: - Local JSON File Management
    
    /**
     * Salva i buckets in un file JSON locale
     */
    private func saveBucketsToFile(_ container: BucketsDataContainer) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        
        let data = try encoder.encode(container)
        try data.write(to: bucketsFilePath, options: .atomic)
        
        print("☁️ [CloudKitSync][Watch] ✅ Saved \(container.buckets.count) buckets to file: \(bucketsFilePath.path)")
    }
    
    /**
     * Salva le notifiche in un file JSON locale
     */
    private func saveNotificationsToFile(_ container: NotificationsDataContainer) throws {
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        
        let data = try encoder.encode(container)
        try data.write(to: notificationsFilePath, options: .atomic)
        
        print("☁️ [CloudKitSync][Watch] ✅ Saved \(container.notifications.count) notifications to file: \(notificationsFilePath.path)")
    }
    
    /**
     * Carica i buckets dal file JSON locale
     */
    public func loadBucketsFromFile() -> BucketsDataContainer? {
        guard FileManager.default.fileExists(atPath: bucketsFilePath.path) else {
            print("☁️ [CloudKitSync][Watch] ⚠️ Buckets file does not exist")
            return nil
        }
        
        do {
            let data = try Data(contentsOf: bucketsFilePath)
            let container = try JSONDecoder().decode(BucketsDataContainer.self, from: data)
            print("☁️ [CloudKitSync][Watch] ✅ Loaded \(container.buckets.count) buckets from file")
            return container
        } catch {
            print("☁️ [CloudKitSync][Watch] ❌ Failed to load buckets from file: \(error.localizedDescription)")
            return nil
        }
    }
    
    /**
     * Carica le notifiche dal file JSON locale
     */
    public func loadNotificationsFromFile() -> NotificationsDataContainer? {
        guard FileManager.default.fileExists(atPath: notificationsFilePath.path) else {
            print("☁️ [CloudKitSync][Watch] ⚠️ Notifications file does not exist")
            return nil
        }
        
        do {
            let data = try Data(contentsOf: notificationsFilePath)
            let container = try JSONDecoder().decode(NotificationsDataContainer.self, from: data)
            print("☁️ [CloudKitSync][Watch] ✅ Loaded \(container.notifications.count) notifications from file")
            return container
        } catch {
            print("☁️ [CloudKitSync][Watch] ❌ Failed to load notifications from file: \(error.localizedDescription)")
            return nil
        }
    }
    
    // MARK: - CloudKit Fetch Methods
    
    /**
     * Scarica i buckets da CloudKit e salva nel file JSON locale
     */
    public func fetchBucketsFromCloudKit(completion: @escaping ([Bucket]) -> Void) {
        let recordID = CKRecord.ID(recordName: "buckets_data", zoneID: zoneID)
        let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        
        logger.info(
            tag: "FetchBuckets",
            message: "Starting fetch buckets from CloudKit",
            metadata: [
                "recordName": recordID.recordName,
                "zoneName": recordID.zoneID.zoneName,
                "zoneOwner": recordID.zoneID.ownerName,
                "containerIdentifier": containerIdentifier,
                "mainBundleId": mainBundleId,
                "databaseType": "privateDatabase"
            ],
            source: "CloudKit-Watch"
        )
        
        privateDatabase.fetch(withRecordID: recordID) { (record, error) in
            if let error = error {
                let ckError = error as? CKError
                self.logger.error(
                    tag: "FetchBuckets",
                    message: "Failed to fetch buckets",
                    metadata: [
                        "error": error.localizedDescription,
                        "errorCode": ckError.map { String($0.code.rawValue) } ?? "unknown"
                    ],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ❌ Failed to fetch buckets: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let record = record else {
                self.logger.warn(
                    tag: "FetchBuckets",
                    message: "No buckets record found in CloudKit",
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ⚠️ No buckets record found")
                completion([])
                return
            }
            
            do {
                let container = try BucketsDataContainer.from(record: record)
                
                self.logger.info(
                    tag: "FetchBuckets",
                    message: "Successfully fetched buckets from CloudKit",
                    metadata: [
                        "count": String(container.buckets.count),
                        "firstId": container.buckets.first?.id ?? "none",
                        "lastId": container.buckets.last?.id ?? "none"
                    ],
                    source: "CloudKit-Watch"
                )
                
                print("☁️ [CloudKitSync][Watch] ✅ Fetched \(container.buckets.count) buckets from CloudKit")
                
                // Save to file
                try self.saveBucketsToFile(container)
                
                // Save sync timestamp
                self.saveBucketsSyncTimestamp(container.syncTimestamp)
                
                completion(container.buckets)
            } catch {
                self.logger.error(
                    tag: "FetchBuckets",
                    message: "Error parsing/saving buckets",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ❌ Error parsing/saving buckets: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    /**
     * Scarica le notifiche da CloudKit e salva nel file JSON locale
     */
    public func fetchNotificationsFromCloudKit(limit: Int? = nil, completion: @escaping ([SyncNotification]) -> Void) {
        let recordID = CKRecord.ID(recordName: "notifications_data", zoneID: zoneID)
        let containerIdentifier = KeychainAccess.getCloudKitContainerIdentifier()
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        
        logger.info(
            tag: "FetchNotifications",
            message: "Starting fetch notifications from CloudKit",
            metadata: [
                "recordName": recordID.recordName,
                "zoneName": recordID.zoneID.zoneName,
                "zoneOwner": recordID.zoneID.ownerName,
                "containerIdentifier": containerIdentifier,
                "mainBundleId": mainBundleId,
                "databaseType": "privateDatabase",
                "limit": limit.map { String($0) } ?? "none"
            ],
            source: "CloudKit-Watch"
        )
        
        privateDatabase.fetch(withRecordID: recordID) { (record, error) in
            if let error = error {
                let ckError = error as? CKError
                self.logger.error(
                    tag: "FetchNotifications",
                    message: "Failed to fetch notifications",
                    metadata: [
                        "error": error.localizedDescription,
                        "errorCode": ckError.map { String($0.code.rawValue) } ?? "unknown"
                    ],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ❌ Failed to fetch notifications: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let record = record else {
                self.logger.warn(
                    tag: "FetchNotifications",
                    message: "No notifications record found in CloudKit",
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ⚠️ No notifications record found")
                completion([])
                return
            }
            
            do {
                let container = try NotificationsDataContainer.from(record: record)
                let syncNotifications = container.notifications
                
                // Apply limit if specified
                let limitedNotifications = limit.map { Array(syncNotifications.prefix($0)) } ?? syncNotifications
                
                let unreadCount = limitedNotifications.filter { $0.readAt == nil }.count
                
                self.logger.info(
                    tag: "FetchNotifications",
                    message: "Successfully fetched notifications from CloudKit",
                    metadata: [
                        "totalCount": String(syncNotifications.count),
                        "limitedCount": String(limitedNotifications.count),
                        "unreadCount": String(unreadCount),
                        "firstId": limitedNotifications.first?.id ?? "none",
                        "firstTitle": limitedNotifications.first?.title ?? "none",
                        "lastId": limitedNotifications.last?.id ?? "none",
                        "lastTitle": limitedNotifications.last?.title ?? "none"
                    ],
                    source: "CloudKit-Watch"
                )
                
                print("☁️ [CloudKitSync][Watch] ✅ Fetched \(limitedNotifications.count) notifications from CloudKit")
                
                // Save to file (save all, not just limited)
                try self.saveNotificationsToFile(container)
                
                // Save sync timestamp
                self.saveNotificationsSyncTimestamp(container.syncTimestamp)
                
                completion(limitedNotifications)
            } catch {
                self.logger.error(
                    tag: "FetchNotifications",
                    message: "Error parsing/saving notifications",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKit-Watch"
                )
                print("☁️ [CloudKitSync][Watch] ❌ Error parsing/saving notifications: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    /**
     * Scarica tutto da CloudKit (buckets + notifications) e aggiorna il DB locale
     */
    public func fetchAllFromCloudKit(completion: @escaping ([Bucket], [SyncNotification]) -> Void) {
        // First check if the zone exists
        checkZoneExists { zoneExists in
            guard zoneExists else {
                print("☁️ [CloudKitSync][Watch] ⚠️ Zone \(self.zoneID.zoneName) doesn't exist - iOS app needs to create it first")
                completion([], [])
                return
            }
            
            let group = DispatchGroup()
            var fetchedBuckets: [Bucket] = []
            var fetchedNotifications: [SyncNotification] = []
            
            group.enter()
            self.fetchBucketsFromCloudKit { buckets in
                fetchedBuckets = buckets
                group.leave()
            }
            
            group.enter()
            self.fetchNotificationsFromCloudKit { notifications in
                fetchedNotifications = notifications
                group.leave()
            }
            
            group.notify(queue: .main) {
                completion(fetchedBuckets, fetchedNotifications)
            }
        }
    }
    
    /**
     * Force refresh - ricarica tutto da CloudKit ignorando i timestamp
     */
    public func forceRefreshFromCloudKit(completion: @escaping (Bool) -> Void) {
        print("☁️ [CloudKitSync][Watch] 🔄 Force refresh from CloudKit...")
        
        fetchAllFromCloudKit { buckets, notifications in
            let success = !buckets.isEmpty || !notifications.isEmpty
            if success {
                print("☁️ [CloudKitSync][Watch] ✅ Force refresh completed: \(buckets.count) buckets, \(notifications.count) notifications")
            } else {
                print("☁️ [CloudKitSync][Watch] ⚠️ Force refresh returned no data")
            }
            completion(success)
        }
    }
    
    // MARK: - Subscriptions
    
    /**
     * Setup CloudKit subscriptions for real-time updates
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
                print("☁️ [CloudKitSync][Watch] ✅ Subscriptions setup successful")
                completion(true)
            case .failure(let error):
                print("☁️ [CloudKitSync][Watch] ❌ Failed to setup subscriptions: \(error.localizedDescription)")
                completion(false)
            }
        }
        
        privateDatabase.add(operation)
    }
    
    // MARK: - Deprecated Upload Methods (Watch is read-only)
    
    /**
     * DEPRECATO: Watch non scrive mai su CloudKit, solo iOS
     */
    public func syncBucketsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        print("☁️ [CloudKitSync][Watch] ⚠️ Watch cannot sync to CloudKit (read-only)")
        completion(false, 0)
    }
    
    /**
     * DEPRECATO: Watch non scrive mai su CloudKit, solo iOS
     */
    public func syncNotificationsToCloudKit(completion: @escaping (Bool, Int) -> Void) {
        print("☁️ [CloudKitSync][Watch] ⚠️ Watch cannot sync to CloudKit (read-only)")
        completion(false, 0)
    }
    
    /**
     * DEPRECATO: Watch non scrive mai su CloudKit, solo iOS
     */
    public func syncAllToCloudKit(completion: @escaping (Bool, Int, Int) -> Void) {
        print("☁️ [CloudKitSync][Watch] ⚠️ Watch cannot sync to CloudKit (read-only)")
        completion(false, 0, 0)
    }
}
