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
        // Get container identifier from bundle
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        let containerIdentifier = "iCloud.\(mainBundleId)"
        
        self.container = CKContainer(identifier: containerIdentifier)
        self.privateDatabase = container.privateCloudDatabase
        
        // Create custom zone for better performance and atomic operations
        self.zoneID = CKRecordZone.ID(zoneName: "ZentikSyncZone", ownerName: CKCurrentUserDefaultName)
        self.customZone = CKRecordZone(zoneID: zoneID)
        
        print("☁️ [CloudKitSync][Watch] Using container: \(containerIdentifier)")
        print("☁️ [CloudKitSync][Watch] Target zone: \(zoneID.zoneName)")
        print("☁️ [CloudKitSync][Watch] Buckets file: \(bucketsFilePath.path)")
        print("☁️ [CloudKitSync][Watch] Notifications file: \(notificationsFilePath.path)")
        
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
        privateDatabase.fetch(withRecordZoneID: zoneID) { (zone, error) in
            if let error = error as? CKError {
                if error.code == .unknownItem || error.code == .zoneNotFound {
                    print("☁️ [CloudKitSync][Watch] ⚠️ Zone \(self.zoneID.zoneName) not found. Waiting for iOS to create it...")
                    completion(false)
                } else {
                    print("☁️ [CloudKitSync][Watch] ⚠️ Error checking zone: \(error.localizedDescription)")
                    completion(false)
                }
            } else if zone != nil {
                print("☁️ [CloudKitSync][Watch] ✅ Custom zone exists: \(self.zoneID.zoneName)")
                completion(true)
            } else {
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
        
        privateDatabase.fetch(withRecordID: recordID) { (record, error) in
            if let error = error {
                print("☁️ [CloudKitSync][Watch] ❌ Failed to fetch buckets: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let record = record else {
                print("☁️ [CloudKitSync][Watch] ⚠️ No buckets record found")
                completion([])
                return
            }
            
            do {
                let container = try BucketsDataContainer.from(record: record)
                print("☁️ [CloudKitSync][Watch] ✅ Fetched \(container.buckets.count) buckets from CloudKit")
                
                // Save to file
                try self.saveBucketsToFile(container)
                
                // Save sync timestamp
                self.saveBucketsSyncTimestamp(container.syncTimestamp)
                
                completion(container.buckets)
            } catch {
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
        
        privateDatabase.fetch(withRecordID: recordID) { (record, error) in
            if let error = error {
                print("☁️ [CloudKitSync][Watch] ❌ Failed to fetch notifications: \(error.localizedDescription)")
                completion([])
                return
            }
            
            guard let record = record else {
                print("☁️ [CloudKitSync][Watch] ⚠️ No notifications record found")
                completion([])
                return
            }
            
            do {
                let container = try NotificationsDataContainer.from(record: record)
                let syncNotifications = container.notifications
                
                // Apply limit if specified
                let limitedNotifications = limit.map { Array(syncNotifications.prefix($0)) } ?? syncNotifications
                
                print("☁️ [CloudKitSync][Watch] ✅ Fetched \(limitedNotifications.count) notifications from CloudKit")
                
                // Save to file (save all, not just limited)
                try self.saveNotificationsToFile(container)
                
                // Save sync timestamp
                self.saveNotificationsSyncTimestamp(container.syncTimestamp)
                
                completion(limitedNotifications)
            } catch {
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
