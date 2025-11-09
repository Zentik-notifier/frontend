import Foundation
import CloudKit

/**
 * CloudKitSyncManager (watchOS) – Approccio con record individuali
 * 
 * Gestione CloudKit con record separati:
 * - Ogni bucket è un CKRecord separato
 * - Ogni notifica è un CKRecord separato
 * - Utilizza la zona di default (_defaultZone)
 * - Watch legge i dati e li salva localmente
 * - iOS scrive e aggiorna i record
 */
public class CloudKitSyncManager {
    
    // MARK: - Singleton
    
    public static let shared = CloudKitSyncManager()
    
    // MARK: - Properties
    
    private let logger = LoggingSystem.shared
    
    // Watch-specific limit for notifications
    private let watchNotificationLimit = 150
    
    // Last sync timestamps (stored in UserDefaults)
    private var lastBucketsSyncDate: Date? {
        get {
            return UserDefaults.standard.object(forKey: "lastBucketsSyncDate") as? Date
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "lastBucketsSyncDate")
        }
    }
    
    private var lastNotificationsSyncDate: Date? {
        get {
            return UserDefaults.standard.object(forKey: "lastNotificationsSyncDate") as? Date
        }
        set {
            UserDefaults.standard.set(newValue, forKey: "lastNotificationsSyncDate")
        }
    }
    
    // MARK: - Initialization
    
    private init() {
        let containerIdentifier = CloudKitConfig.getContainerIdentifier()
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        
        logger.info(
            tag: "Initialization",
            message: "CloudKit manager initialized on Watch (new approach)",
            metadata: [
                "mainBundleId": mainBundleId,
                "containerIdentifier": containerIdentifier
            ],
            source: "CloudKit-Watch-New"
        )
        
        print("☁️ [CloudKitSync][Watch-New] Using container: \(containerIdentifier)")
        print("☁️ [CloudKitSync][Watch-New] Using default zone (_defaultZone)")
        
        // Check iCloud account status
        CloudKitAccess.checkAccountStatus { result in
            switch result {
            case .success(let status):
                let statusString = self.accountStatusToString(status)
                print("☁️ [CloudKitSync][Watch-New] iCloud account status: \(statusString)")
                
                if status != .available {
                    self.logger.warn(
                        tag: "Initialization",
                        message: "iCloud account not available",
                        metadata: ["status": statusString],
                        source: "CloudKit-Watch-New"
                    )
                }
            case .failure(let error):
                print("☁️ [CloudKitSync][Watch-New] ❌ Failed to check iCloud account: \(error.localizedDescription)")
            }
        }
    }
    
    // MARK: - Helper Methods
    
    private func accountStatusToString(_ status: CKAccountStatus) -> String {
        switch status {
        case .available:
            return "available"
        case .noAccount:
            return "noAccount"
        case .restricted:
            return "restricted"
        case .couldNotDetermine:
            return "couldNotDetermine"
        case .temporarilyUnavailable:
            return "temporarilyUnavailable"
        @unknown default:
            return "unknown"
        }
    }
    
    // MARK: - Bucket Operations
    
    /// Fetch all buckets from CloudKit
    public func fetchBuckets(completion: @escaping ([CloudKitBucket]) -> Void) {
        logger.info(
            tag: "FetchBuckets",
            message: "Fetching buckets from CloudKit",
            source: "CloudKit-Watch-New"
        )
        
        CloudKitAccess.fetchAllBuckets { result in
            switch result {
            case .success(let buckets):
                self.logger.info(
                    tag: "FetchBuckets",
                    message: "Successfully fetched buckets",
                    metadata: ["count": String(buckets.count)],
                    source: "CloudKit-Watch-New"
                )
                
                print("☁️ [CloudKitSync][Watch-New] ✅ Fetched \(buckets.count) buckets from CloudKit")
                
                // Update last sync date
                self.lastBucketsSyncDate = Date()
                
                completion(buckets)
                
            case .failure(let error):
                self.logger.error(
                    tag: "FetchBuckets",
                    message: "Failed to fetch buckets",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKit-Watch-New"
                )
                
                print("☁️ [CloudKitSync][Watch-New] ❌ Failed to fetch buckets: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    // MARK: - Notification Operations
    
    /// Fetch all notifications from CloudKit
    public func fetchNotifications(limit: Int? = nil, completion: @escaping ([CloudKitNotification]) -> Void) {
        let effectiveLimit = limit ?? watchNotificationLimit
        
        logger.info(
            tag: "FetchNotifications",
            message: "Fetching notifications from CloudKit",
            metadata: ["limit": String(effectiveLimit)],
            source: "CloudKit-Watch-New"
        )
        
        CloudKitAccess.fetchAllNotifications(limit: effectiveLimit) { result in
            switch result {
            case .success(let notifications):
                let unreadCount = notifications.filter { $0.readAt == nil }.count
                
                self.logger.info(
                    tag: "FetchNotifications",
                    message: "Successfully fetched notifications",
                    metadata: [
                        "totalCount": String(notifications.count),
                        "unreadCount": String(unreadCount)
                    ],
                    source: "CloudKit-Watch-New"
                )
                
                print("☁️ [CloudKitSync][Watch-New] ✅ Fetched \(notifications.count) notifications from CloudKit (\(unreadCount) unread)")
                
                // Update last sync date
                self.lastNotificationsSyncDate = Date()
                
                completion(notifications)
                
            case .failure(let error):
                self.logger.error(
                    tag: "FetchNotifications",
                    message: "Failed to fetch notifications",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKit-Watch-New"
                )
                
                print("☁️ [CloudKitSync][Watch-New] ❌ Failed to fetch notifications: \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    /// Fetch notifications for a specific bucket
    public func fetchNotifications(bucketId: String, limit: Int? = nil, completion: @escaping ([CloudKitNotification]) -> Void) {
        logger.info(
            tag: "FetchNotifications",
            message: "Fetching notifications for bucket",
            metadata: [
                "bucketId": bucketId,
                "limit": limit.map { String($0) } ?? "none"
            ],
            source: "CloudKit-Watch-New"
        )
        
        CloudKitAccess.fetchNotifications(bucketId: bucketId, limit: limit) { result in
            switch result {
            case .success(let notifications):
                self.logger.info(
                    tag: "FetchNotifications",
                    message: "Successfully fetched notifications for bucket",
                    metadata: [
                        "bucketId": bucketId,
                        "count": String(notifications.count)
                    ],
                    source: "CloudKit-Watch-New"
                )
                
                print("☁️ [CloudKitSync][Watch-New] ✅ Fetched \(notifications.count) notifications for bucket \(bucketId)")
                completion(notifications)
                
            case .failure(let error):
                self.logger.error(
                    tag: "FetchNotifications",
                    message: "Failed to fetch notifications for bucket",
                    metadata: [
                        "bucketId": bucketId,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKit-Watch-New"
                )
                
                print("☁️ [CloudKitSync][Watch-New] ❌ Failed to fetch notifications for bucket \(bucketId): \(error.localizedDescription)")
                completion([])
            }
        }
    }
    
    // MARK: - Sync Operations
    
    /// Fetch all data from CloudKit (buckets + notifications)
    public func fetchAll(completion: @escaping ([CloudKitBucket], [CloudKitNotification]) -> Void) {
        logger.info(
            tag: "FetchAll",
            message: "Fetching all data from CloudKit",
            source: "CloudKit-Watch-New"
        )
        
        let group = DispatchGroup()
        var fetchedBuckets: [CloudKitBucket] = []
        var fetchedNotifications: [CloudKitNotification] = []
        
        // Fetch buckets
        group.enter()
        fetchBuckets { buckets in
            fetchedBuckets = buckets
            group.leave()
        }
        
        // Fetch notifications
        group.enter()
        fetchNotifications { notifications in
            fetchedNotifications = notifications
            group.leave()
        }
        
        group.notify(queue: .main) {
            self.logger.info(
                tag: "FetchAll",
                message: "Completed fetching all data",
                metadata: [
                    "bucketsCount": String(fetchedBuckets.count),
                    "notificationsCount": String(fetchedNotifications.count)
                ],
                source: "CloudKit-Watch-New"
            )
            
            print("☁️ [CloudKitSync][Watch-New] ✅ Fetch all completed: \(fetchedBuckets.count) buckets, \(fetchedNotifications.count) notifications")
            completion(fetchedBuckets, fetchedNotifications)
        }
    }
    
    /// Force refresh - reload all data from CloudKit
    public func forceRefresh(completion: @escaping (Bool) -> Void) {
        print("☁️ [CloudKitSync][Watch-New] 🔄 Force refresh from CloudKit...")
        
        fetchAll { buckets, notifications in
            let success = !buckets.isEmpty || !notifications.isEmpty
            if success {
                print("☁️ [CloudKitSync][Watch-New] ✅ Force refresh completed: \(buckets.count) buckets, \(notifications.count) notifications")
            } else {
                print("☁️ [CloudKitSync][Watch-New] ⚠️ Force refresh returned no data")
            }
            completion(success)
        }
    }
    
    // MARK: - Subscriptions
    
    /// Setup CloudKit subscriptions for real-time updates
    public func setupSubscriptions(completion: @escaping (Bool) -> Void) {
        logger.info(
            tag: "SetupSubscriptions",
            message: "Setting up CloudKit subscriptions",
            source: "CloudKit-Watch-New"
        )
        
        CloudKitAccess.setupSubscriptions { result in
            switch result {
            case .success:
                self.logger.info(
                    tag: "SetupSubscriptions",
                    message: "Successfully setup subscriptions",
                    source: "CloudKit-Watch-New"
                )
                print("☁️ [CloudKitSync][Watch-New] ✅ Subscriptions setup successful")
                completion(true)
                
            case .failure(let error):
                self.logger.error(
                    tag: "SetupSubscriptions",
                    message: "Failed to setup subscriptions",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKit-Watch-New"
                )
                print("☁️ [CloudKitSync][Watch-New] ❌ Failed to setup subscriptions: \(error.localizedDescription)")
                completion(false)
            }
        }
    }
    
    // MARK: - Sync Status
    
    /// Get last sync information
    public func getLastSyncInfo() -> (buckets: Date?, notifications: Date?) {
        return (lastBucketsSyncDate, lastNotificationsSyncDate)
    }
    
    /// Check if sync is needed (based on time elapsed since last sync)
    public func isSyncNeeded(threshold: TimeInterval = 300) -> Bool { // 5 minutes default
        guard let lastBucketsSync = lastBucketsSyncDate,
              let lastNotificationsSync = lastNotificationsSyncDate else {
            return true // Never synced
        }
        
        let now = Date()
        let bucketsSyncAge = now.timeIntervalSince(lastBucketsSync)
        let notificationsSyncAge = now.timeIntervalSince(lastNotificationsSync)
        
        return bucketsSyncAge > threshold || notificationsSyncAge > threshold
    }
}
