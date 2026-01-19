import Foundation
import CloudKit
#if os(iOS)
import UIKit
#endif
#if os(watchOS)
import WatchKit
#endif

/**
 * CloudKitManager - CloudKit management for iPhone ↔ Watch synchronization
 * 
 * Handles:
 * - Automatic CloudKit schema initialization
 * - Notification and bucket synchronization between devices
 * - Conflict resolution
 */
public class CloudKitManager: NSObject {
    public static let shared = CloudKitManager()
    
    private let container: CKContainer
    private let privateDatabase: CKDatabase
    
    // Subscription IDs
    private let notificationSubscriptionID = "NotificationChanges"
    private let bucketSubscriptionID = "BucketChanges"
    #if os(iOS)
    private let watchLogSubscriptionID = "WatchLogChanges"
    #endif
    
    // Custom CloudKit Zone (supports incremental sync)
    private let customZoneName = "ZentikDataZone"
    private var customZoneID: CKRecordZone.ID {
        return CKRecordZone.ID(zoneName: customZoneName, ownerName: CKCurrentUserDefaultName)
    }
    
    // Record Types
    public enum RecordType: String {
        case notification = "Notification"
        case bucket = "Bucket"
        case watchLog = "WatchLog"
    }
    
    // UserDefaults keys
    private let schemaInitializedKey = "cloudkit_schema_initialized"
    private let zoneInitializedKey = "cloudkit_zone_initialized"
    private let lastSyncTimestampKey = "cloudkit_last_sync_timestamp"
    private let lastChangeTokenKey = "cloudkit_last_change_token"
    
    // Log source name (different for iOS and Watch to distinguish log files)
    private var logSource: String {
        #if os(iOS)
        return "CloudKitIos"
        #else
        return "CloudKitWatch"
        #endif
    }
    
    // DatabaseAccess source name (different for iOS and Watch to distinguish log files)
    private var databaseSource: String {
        #if os(iOS)
        return "CloudKitIos"
        #else
        return "CloudKitWatch"
        #endif
    }
    
    // Debounce timer for sync operations (deprecated - sync is now immediate)
    private var syncDebounceTimer: Timer?
    private let syncDebounceInterval: TimeInterval = 5.0 // Not used anymore
    private let syncQueue = DispatchQueue(label: "com.zentik.cloudkit.sync", qos: .utility)
    
    // Flag to prevent concurrent syncs and batch notifications
    private var isIncrementalSyncInProgress = false
    private let syncLock = NSLock()
    
    // Sync statistics structure
    public struct SyncStats {
        let notificationsSynced: Int
        let bucketsSynced: Int
        let notificationsUpdated: Int
        let bucketsUpdated: Int
    }
    
    // Sync progress structure
    public struct SyncProgress {
        let currentItem: Int
        let totalItems: Int
        let itemType: String // "notification" or "bucket"
        let phase: String // "syncing" or "completed"
    }
    
    // Notification names for sync progress
    public static let syncProgressNotification = Notification.Name("CloudKitSyncProgress")
    
    private override init() {
        let bundleId = KeychainAccess.getMainBundleIdentifier()
        let containerId = "iCloud.\(bundleId)"
        self.container = CKContainer(identifier: containerId)
        self.privateDatabase = container.privateCloudDatabase
        super.init()
    }
    
    // MARK: - Helper Methods
    
    /**
     * Creates a CKRecord.ID for a notification in the custom zone
     */
    private func notificationRecordID(_ notificationId: String) -> CKRecord.ID {
        return CKRecord.ID(recordName: "Notification-\(notificationId)", zoneID: customZoneID)
    }
    
    /**
     * Creates a CKRecord.ID for a bucket in the custom zone
     */
    private func bucketRecordID(_ bucketId: String) -> CKRecord.ID {
        return CKRecord.ID(recordName: "Bucket-\(bucketId)", zoneID: customZoneID)
    }
    
    /**
     * Parses an ISO8601 date string, trying both with and without fractional seconds
     * Handles formats like:
     * - 2026-01-17T12:19:10Z (without fractional seconds)
     * - 2026-01-17T12:19:10.123Z (with fractional seconds)
     */
    private static func parseISO8601Date(_ dateString: String) -> Date? {
        // Try with fractional seconds first
        let formatterWithFractional = ISO8601DateFormatter()
        formatterWithFractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatterWithFractional.date(from: dateString) {
            return date
        }
        
        // Try without fractional seconds
        let formatterWithoutFractional = ISO8601DateFormatter()
        formatterWithoutFractional.formatOptions = [.withInternetDateTime]
        return formatterWithoutFractional.date(from: dateString)
    }
    
    // MARK: - Schema Initialization
    
    /**
     * Initializes the custom CloudKit zone if it doesn't exist
     * This zone supports incremental sync operations
     * @param completion Callback with (success, wasNewlyCreated, error)
     */
    private func initializeZoneIfNeeded(completion: @escaping (Bool, Bool, Error?) -> Void) {
        let flagIsSet = UserDefaults.standard.bool(forKey: zoneInitializedKey)
        
        // Always verify zone exists, even if flag is set (in case of previous failed creation)
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Checking if custom zone exists", metadata: ["zoneName": customZoneName, "zoneID": "\(customZoneID)", "flagIsSet": "\(flagIsSet)"], source: self.logSource)
        
        privateDatabase.fetch(withRecordZoneID: customZoneID) { zone, error in
            if zone != nil {
                // Zone exists - ensure flag is set
                if !flagIsSet {
                    UserDefaults.standard.set(true, forKey: self.zoneInitializedKey)
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone exists, flag updated", source: self.logSource)
                }
                completion(true, false, nil)
                return
            }
            
            // Zone does not exist or was purged
            if let ckError = error as? CKError {
                if ckError.code == .zoneNotFound || 
                   (ckError.localizedDescription.contains("Zone was purged") || 
                    ckError.errorUserInfo["ServerErrorDescription"] as? String == "Zone was purged by user") {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone does not exist or was purged, will create it", metadata: ["flagWasSet": "\(flagIsSet)", "error": ckError.localizedDescription], source: self.logSource)
                    
                    // Reset flag if it was set (zone was purged or doesn't exist)
                    if flagIsSet {
                        UserDefaults.standard.removeObject(forKey: self.zoneInitializedKey)
                        UserDefaults.standard.removeObject(forKey: self.schemaInitializedKey)
                        UserDefaults.standard.removeObject(forKey: self.lastSyncTimestampKey)
                        UserDefaults.standard.removeObject(forKey: self.lastChangeTokenKey)
                        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Zone was purged or doesn't exist, resetting all flags", source: self.logSource)
                    }
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error checking zone existence", metadata: ["error": ckError.localizedDescription], source: self.logSource)
                    completion(false, false, ckError)
                    return
                }
            } else if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error checking zone existence", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, false, error)
                return
            }
            
            // Create the zone
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Creating custom CloudKit zone", metadata: ["zoneName": self.customZoneName, "zoneID": "\(self.customZoneID)"], source: self.logSource)
            
            // Check account status before creating zone
            self.checkAccountStatus { status, accountError in
                guard status == .available else {
                    let errorMsg = "iCloud account not available (status: \(status.rawValue))"
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Cannot create zone - \(errorMsg)", source: self.logSource)
                    completion(false, false, NSError(domain: "CloudKitManager", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMsg]))
                    return
                }
                
                let customZone = CKRecordZone(zoneName: self.customZoneName)
                self.privateDatabase.save(customZone) { savedZone, error in
                    if let error = error {
                        // Log detailed error information
                        if let ckError = error as? CKError {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to create custom zone", metadata: [
                                "error": error.localizedDescription,
                                "code": "\(ckError.code.rawValue)",
                                "errorCode": "\(ckError.errorCode)",
                                "errorUserInfo": "\(ckError.errorUserInfo)"
                            ], source: self.logSource)
                            
                            if ckError.code == .serverRecordChanged {
                                // Zone already exists on server (race condition)
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Custom zone already exists on server", source: self.logSource)
                                UserDefaults.standard.set(true, forKey: self.zoneInitializedKey)
                                completion(true, false, nil)
                                return
                            }
                        } else {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to create custom zone", metadata: ["error": error.localizedDescription], source: self.logSource)
                        }
                        completion(false, false, error)
                    } else {
                        // Zone was newly created - verify it was actually saved
                        if let savedZone = savedZone {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Custom CloudKit zone created successfully", metadata: ["zoneID": "\(savedZone.zoneID)"], source: self.logSource)
                        } else {
                            LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Zone save completed but savedZone is nil", source: self.logSource)
                        }
                        
                        UserDefaults.standard.set(true, forKey: self.zoneInitializedKey)
                        
                        // Wait and verify zone exists with retry logic
                        self.verifyZoneExistsWithRetry(maxRetries: 5, retryDelay: 2.0) { zoneExists in
                            if zoneExists {
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone verified and ready", source: self.logSource)
                                completion(true, true, nil)
                            } else {
                                LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Zone verification failed after retries, but continuing", source: self.logSource)
                                // Still complete successfully - zone might propagate later
                                completion(true, true, nil)
                            }
                        }
                    }
                }
            }
        }
    }
    
    #if os(iOS)
    /**
     * Delete the CloudKit zone and all its data
     * WARNING: This will permanently delete all records in the zone
     */
    public func deleteCloudKitZone(completion: @escaping (Bool, Error?) -> Void) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Deleting CloudKit zone and all its data", metadata: ["zoneName": customZoneName], source: self.logSource)
        
        // First, delete all records in the zone
        // Fetch all records and delete them
        let dispatchGroup = DispatchGroup()
        var deleteErrors: [Error] = []
        
        // Delete all Notification records
        dispatchGroup.enter()
        let notificationPredicate = NSPredicate(value: true)
        let notificationQuery = CKQuery(recordType: RecordType.notification.rawValue, predicate: notificationPredicate)
        let notificationOperation = CKQueryOperation(query: notificationQuery)
        var notificationRecordIDs: [CKRecord.ID] = []
        
        notificationOperation.recordMatchedBlock = { recordID, result in
            if case .success(let record) = result {
                notificationRecordIDs.append(record.recordID)
            }
        }
        
        notificationOperation.queryResultBlock = { result in
            if case .failure(let error) = result {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Table doesn't exist - that's OK
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification table doesn't exist, skipping deletion", source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching Notification records for deletion", metadata: ["error": error.localizedDescription], source: self.logSource)
                    deleteErrors.append(error)
                }
            } else {
                // Delete all fetched records
                if !notificationRecordIDs.isEmpty {
                    let deleteOperation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: notificationRecordIDs)
                    deleteOperation.database = self.privateDatabase
                    deleteOperation.modifyRecordsResultBlock = { deleteResult in
                        if case .failure(let deleteError) = deleteResult {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting Notification records", metadata: ["error": deleteError.localizedDescription, "count": "\(notificationRecordIDs.count)"], source: self.logSource)
                            deleteErrors.append(deleteError)
                        } else {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Deleted Notification records", metadata: ["count": "\(notificationRecordIDs.count)"], source: self.logSource)
                        }
                    }
                    self.privateDatabase.add(deleteOperation)
                }
            }
            dispatchGroup.leave()
        }
        privateDatabase.add(notificationOperation)
        
        // Delete all Bucket records
        dispatchGroup.enter()
        let bucketPredicate = NSPredicate(value: true)
        let bucketQuery = CKQuery(recordType: RecordType.bucket.rawValue, predicate: bucketPredicate)
        let bucketOperation = CKQueryOperation(query: bucketQuery)
        var bucketRecordIDs: [CKRecord.ID] = []
        
        bucketOperation.recordMatchedBlock = { recordID, result in
            if case .success(let record) = result {
                bucketRecordIDs.append(record.recordID)
            }
        }
        
        bucketOperation.queryResultBlock = { result in
            if case .failure(let error) = result {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Table doesn't exist - that's OK
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket table doesn't exist, skipping deletion", source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching Bucket records for deletion", metadata: ["error": error.localizedDescription], source: self.logSource)
                    deleteErrors.append(error)
                }
            } else {
                // Delete all fetched records
                if !bucketRecordIDs.isEmpty {
                    let deleteOperation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: bucketRecordIDs)
                    deleteOperation.database = self.privateDatabase
                    deleteOperation.modifyRecordsResultBlock = { deleteResult in
                        if case .failure(let deleteError) = deleteResult {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting Bucket records", metadata: ["error": deleteError.localizedDescription, "count": "\(bucketRecordIDs.count)"], source: self.logSource)
                            deleteErrors.append(deleteError)
                        } else {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Deleted Bucket records", metadata: ["count": "\(bucketRecordIDs.count)"], source: self.logSource)
                        }
                    }
                    self.privateDatabase.add(deleteOperation)
                }
            }
            dispatchGroup.leave()
        }
        privateDatabase.add(bucketOperation)
        
        // Delete all WatchLog records
        dispatchGroup.enter()
        let watchLogPredicate = NSPredicate(value: true)
        let watchLogQuery = CKQuery(recordType: RecordType.watchLog.rawValue, predicate: watchLogPredicate)
        let watchLogOperation = CKQueryOperation(query: watchLogQuery)
        var watchLogRecordIDs: [CKRecord.ID] = []
        
        watchLogOperation.recordMatchedBlock = { recordID, result in
            if case .success(let record) = result {
                watchLogRecordIDs.append(record.recordID)
            }
        }
        
        watchLogOperation.queryResultBlock = { result in
            if case .failure(let error) = result {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Table doesn't exist - that's OK
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "WatchLog table doesn't exist, skipping deletion", source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching WatchLog records for deletion", metadata: ["error": error.localizedDescription], source: self.logSource)
                    deleteErrors.append(error)
                }
            } else {
                // Delete all fetched records
                if !watchLogRecordIDs.isEmpty {
                    let deleteOperation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: watchLogRecordIDs)
                    deleteOperation.database = self.privateDatabase
                    deleteOperation.modifyRecordsResultBlock = { deleteResult in
                        if case .failure(let deleteError) = deleteResult {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting WatchLog records", metadata: ["error": deleteError.localizedDescription, "count": "\(watchLogRecordIDs.count)"], source: self.logSource)
                            deleteErrors.append(deleteError)
                        } else {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Deleted WatchLog records", metadata: ["count": "\(watchLogRecordIDs.count)"], source: self.logSource)
                        }
                    }
                    self.privateDatabase.add(deleteOperation)
                }
            }
            dispatchGroup.leave()
        }
        privateDatabase.add(watchLogOperation)
        
        // After deleting all records, delete the zone itself
        dispatchGroup.notify(queue: .main) {
            // Wait a bit for record deletions to complete
            DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) {
                self.privateDatabase.delete(withRecordZoneID: self.customZoneID) { zoneID, error in
                    if let error = error {
                        if let ckError = error as? CKError, ckError.code == .unknownItem {
                            // Zone doesn't exist - that's OK
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone doesn't exist, nothing to delete", source: self.logSource)
                        } else {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting CloudKit zone", metadata: ["error": error.localizedDescription], source: self.logSource)
                            deleteErrors.append(error)
                        }
                    } else {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit zone deleted successfully", source: self.logSource)
                    }
                    
                    // Reset flags
                    UserDefaults.standard.removeObject(forKey: self.zoneInitializedKey)
                    UserDefaults.standard.removeObject(forKey: self.schemaInitializedKey)
                    UserDefaults.standard.removeObject(forKey: self.lastSyncTimestampKey)
                    UserDefaults.standard.removeObject(forKey: self.lastChangeTokenKey)
                    
                    if deleteErrors.isEmpty {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit zone and all data deleted successfully", source: self.logSource)
                        completion(true, nil)
                    } else {
                        let combinedError = NSError(domain: "CloudKitManager", code: -1, userInfo: [
                            NSLocalizedDescriptionKey: "Some errors occurred during deletion: \(deleteErrors.map { $0.localizedDescription }.joined(separator: "; "))"
                        ])
                        completion(false, combinedError)
                    }
                }
            }
        }
    }
    
    /**
     * Reset CloudKit zone: delete everything and re-initialize
     * This will delete all data and recreate the zone with fresh schema
     */
    public func resetCloudKitZone(completion: @escaping (Bool, Error?) -> Void) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Resetting CloudKit zone - this will delete all data", source: self.logSource)
        
        deleteCloudKitZone { success, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to delete zone during reset", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, error)
                return
            }
            
            // Wait a bit for zone deletion to propagate
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) {
                // Re-initialize zone and schema
                self.initializeSchemaIfNeeded { schemaSuccess, schemaError in
                    if let schemaError = schemaError {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to re-initialize schema after reset", metadata: ["error": schemaError.localizedDescription], source: self.logSource)
                        completion(false, schemaError)
                    } else {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit zone reset completed successfully", source: self.logSource)
                        completion(true, nil)
                    }
                }
            }
        }
    }
    #endif
    
    /**
     * Initializes CloudKit schema by creating "seed" records with all required fields
     * CloudKit will automatically create record types when the first records are created
     */
    public func initializeSchemaIfNeeded(completion: @escaping (Bool, Error?) -> Void) {
        // Always ensure zone is initialized first
        initializeZoneIfNeeded { zoneSuccess, wasNewlyCreated, zoneError in
            guard zoneSuccess else {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to initialize custom zone", metadata: ["error": zoneError?.localizedDescription ?? "Unknown"], source: self.logSource)
                completion(false, zoneError)
                return
            }
            
            // Initialize schema by creating seed records for all record types first
            // This ensures tables are created before syncing data
            #if os(iOS)
            self.initializeSchemaWithSeedRecords { schemaInitialized in
                if schemaInitialized {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit schema initialized with seed records", source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "CloudKit schema initialization had warnings - tables may not exist yet", source: self.logSource)
                }
                
                // Check if tables already have real data before syncing
                self.checkIfTablesHaveRealData { hasRealData in
                    if hasRealData {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit tables already contain real data, skipping initial sync", source: self.logSource)
                        // Mark as initialized to avoid unnecessary checks
                        UserDefaults.standard.set(true, forKey: self.schemaInitializedKey)
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit schema initialization completed", source: self.logSource)
                        completion(true, nil)
                    } else {
                        // Tables are empty or only contain seed records, trigger initial sync
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit tables are empty, triggering initial sync from SQLite to CloudKit", source: self.logSource)
                        // Reset last sync timestamp to force full sync
                        UserDefaults.standard.removeObject(forKey: self.lastSyncTimestampKey)
                        // Trigger sync to CloudKit (will sync all records from SQLite)
                        self.triggerSyncToCloud { success, error, stats in
                            if success {
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Initial sync to CloudKit completed", metadata: [
                                    "notificationsSynced": "\(stats?.notificationsSynced ?? 0)",
                                    "bucketsSynced": "\(stats?.bucketsSynced ?? 0)"
                                ], source: self.logSource)
                            } else {
                                LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Initial sync to CloudKit failed", metadata: ["error": error?.localizedDescription ?? "Unknown"], source: self.logSource)
                            }
                            // Mark as initialized to avoid unnecessary checks
                            UserDefaults.standard.set(true, forKey: self.schemaInitializedKey)
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit schema initialization completed", source: self.logSource)
                            completion(true, nil)
                        }
                    }
                }
            }
            #else
            // Mark as initialized to avoid unnecessary checks
            UserDefaults.standard.set(true, forKey: self.schemaInitializedKey)
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit schema will be created automatically on first record save", source: self.logSource)
            completion(true, nil)
            #endif
        }
    }
    
    #if os(iOS)
    /**
     * Check if CloudKit tables have real data (not just seed records)
     * Returns true if tables exist and have real data, false otherwise
     */
    private func checkIfTablesHaveRealData(completion: @escaping (Bool) -> Void) {
        let dispatchGroup = DispatchGroup()
        var hasRealData = false
        var hasErrors = false
        
        // Check Notification table
        dispatchGroup.enter()
        let notificationPredicate = NSPredicate(format: "createdAt >= %@", Date.distantPast as NSDate)
        let notificationQuery = CKQuery(recordType: RecordType.notification.rawValue, predicate: notificationPredicate)
        let notificationOperation = CKQueryOperation(query: notificationQuery)
        notificationOperation.resultsLimit = 1 // We only need to know if at least one record exists
        notificationOperation.recordMatchedBlock = { recordID, result in
            if case .success(let record) = result {
                // Check if this is a real notification (not a seed record)
                // Seed records have title "Schema initialization"
                if let title = record["title"] as? String, title != "Schema initialization" {
                    hasRealData = true
                }
            }
        }
        notificationOperation.queryResultBlock = { result in
            if case .failure(let error) = result {
                // If query fails, table might not exist yet - that's OK, we'll sync
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Table doesn't exist - that's fine, we'll sync
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification table doesn't exist yet", source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Error checking Notification table", metadata: ["error": error.localizedDescription], source: self.logSource)
                    hasErrors = true
                }
            }
            dispatchGroup.leave()
        }
        privateDatabase.add(notificationOperation)
        
        // Check Bucket table
        dispatchGroup.enter()
        let bucketPredicate = NSPredicate(format: "name != %@", "")
        let bucketQuery = CKQuery(recordType: RecordType.bucket.rawValue, predicate: bucketPredicate)
        let bucketOperation = CKQueryOperation(query: bucketQuery)
        bucketOperation.resultsLimit = 1
        bucketOperation.recordMatchedBlock = { recordID, result in
            if case .success(let record) = result {
                // Check if this is a real bucket (not a seed record)
                if let name = record["name"] as? String, name != "Schema initialization" {
                    hasRealData = true
                }
            }
        }
        bucketOperation.queryResultBlock = { result in
            if case .failure(let error) = result {
                // If query fails, table might not exist yet - that's OK, we'll sync
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Table doesn't exist - that's fine, we'll sync
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket table doesn't exist yet", source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Error checking Bucket table", metadata: ["error": error.localizedDescription], source: self.logSource)
                    hasErrors = true
                }
            }
            dispatchGroup.leave()
        }
        privateDatabase.add(bucketOperation)
        
        dispatchGroup.notify(queue: .main) {
            if hasRealData {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit tables contain real data", source: self.logSource)
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit tables are empty or don't exist", source: self.logSource)
            }
            completion(hasRealData)
        }
    }
    
    /**
     * Initialize CloudKit schema by creating seed records for all record types
     * This ensures all fields become queryable (CloudKit marks fields as queryable when used in queries)
     * Seed records are temporary and will be deleted after schema initialization
     */
    private func initializeSchemaWithSeedRecords(completion: @escaping (Bool) -> Void) {
        // Check if schema has already been initialized
        if UserDefaults.standard.bool(forKey: schemaInitializedKey) {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Schema already initialized, skipping seed records creation", source: self.logSource)
            completion(true)
            return
        }
        
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Starting schema initialization with seed records", source: self.logSource)
        
        let dispatchGroup = DispatchGroup()
        var savedRecords: [CKRecord] = []
        var hasErrors = false
        
        // Create seed record for Notification
        dispatchGroup.enter()
        let notificationSeedId = UUID().uuidString
        let notificationRecordID = CKRecord.ID(recordName: "Notification-\(notificationSeedId)", zoneID: customZoneID)
        let notificationRecord = CKRecord(recordType: RecordType.notification.rawValue, recordID: notificationRecordID)
        notificationRecord["id"] = notificationSeedId
        notificationRecord["title"] = "Schema initialization"
        notificationRecord["body"] = "Temporary seed record"
        notificationRecord["createdAt"] = Date()
        notificationRecord["bucketId"] = ""
        notificationRecord["readAt"] = nil
        notificationRecord["actions"] = "[]"
        
        privateDatabase.save(notificationRecord) { savedRecord, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to create Notification seed record", metadata: ["error": error.localizedDescription, "recordID": notificationRecordID.recordName], source: self.logSource)
                hasErrors = true
            } else if let savedRecord = savedRecord {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification seed record created successfully", metadata: ["recordID": savedRecord.recordID.recordName], source: self.logSource)
                savedRecords.append(savedRecord)
            }
            dispatchGroup.leave()
        }
        
        // Create seed record for Bucket
        dispatchGroup.enter()
        let bucketSeedId = UUID().uuidString
        let bucketRecordID = CKRecord.ID(recordName: "Bucket-\(bucketSeedId)", zoneID: customZoneID)
        let bucketRecord = CKRecord(recordType: RecordType.bucket.rawValue, recordID: bucketRecordID)
        bucketRecord["id"] = bucketSeedId
        bucketRecord["name"] = "Schema initialization"
        bucketRecord["iconUrl"] = ""
        bucketRecord["color"] = ""
        
        privateDatabase.save(bucketRecord) { savedRecord, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to create Bucket seed record", metadata: ["error": error.localizedDescription, "recordID": bucketRecordID.recordName], source: self.logSource)
                hasErrors = true
            } else if let savedRecord = savedRecord {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket seed record created successfully", metadata: ["recordID": savedRecord.recordID.recordName], source: self.logSource)
                savedRecords.append(savedRecord)
            }
            dispatchGroup.leave()
        }
        
        // Create seed record for WatchLog
        dispatchGroup.enter()
        let watchLogSeedId = UUID().uuidString
        let watchLogRecordID = CKRecord.ID(recordName: "WatchLog-\(watchLogSeedId)", zoneID: customZoneID)
        let watchLogRecord = CKRecord(recordType: RecordType.watchLog.rawValue, recordID: watchLogRecordID)
        watchLogRecord["id"] = watchLogSeedId
        watchLogRecord["level"] = "INFO"
        watchLogRecord["tag"] = "CloudKit"
        watchLogRecord["message"] = "Schema initialization"
        watchLogRecord["timestamp"] = Date()
        watchLogRecord["source"] = "CloudKitManager"
        watchLogRecord["metadata"] = "{}"
        
        privateDatabase.save(watchLogRecord) { savedRecord, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to create WatchLog seed record", metadata: ["error": error.localizedDescription, "recordID": watchLogRecordID.recordName], source: self.logSource)
                hasErrors = true
            } else if let savedRecord = savedRecord {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "WatchLog seed record created successfully", metadata: ["recordID": savedRecord.recordID.recordName], source: self.logSource)
                savedRecords.append(savedRecord)
            }
            dispatchGroup.leave()
        }
        
        // Wait for all seed records to be created, then query them to make fields queryable
        dispatchGroup.notify(queue: .main) {
            // Add a small delay to allow CloudKit to propagate the schema
            DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                // Query each record type with sortDescriptors to make fields queryable
                let queryGroup = DispatchGroup()
                var querySuccess = true
                
                // Query Notification with createdAt sortDescriptor
                queryGroup.enter()
                let notificationPredicate = NSPredicate(format: "createdAt >= %@", Date.distantPast as NSDate)
                let notificationQuery = CKQuery(recordType: RecordType.notification.rawValue, predicate: notificationPredicate)
                notificationQuery.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: true)]
                self.privateDatabase.perform(notificationQuery, inZoneWith: self.customZoneID) { _, queryError in
                    if let queryError = queryError {
                        let errorDescription = queryError.localizedDescription
                        // Ignore "not queryable" errors - fields will become queryable on first real use
                        if !errorDescription.contains("queryable") {
                            LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to query Notification seed record", metadata: ["error": errorDescription], source: self.logSource)
                            querySuccess = false
                        }
                    }
                    queryGroup.leave()
                }
                
                // Query Bucket with name sortDescriptor
                queryGroup.enter()
                let bucketPredicate = NSPredicate(format: "name != %@", "")
                let bucketQuery = CKQuery(recordType: RecordType.bucket.rawValue, predicate: bucketPredicate)
                bucketQuery.sortDescriptors = [NSSortDescriptor(key: "name", ascending: true)]
                self.privateDatabase.perform(bucketQuery, inZoneWith: self.customZoneID) { _, queryError in
                    if let queryError = queryError {
                        let errorDescription = queryError.localizedDescription
                        // Ignore "not queryable" errors - fields will become queryable on first real use
                        if !errorDescription.contains("queryable") {
                            LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to query Bucket seed record", metadata: ["error": errorDescription], source: self.logSource)
                            querySuccess = false
                        }
                    }
                    queryGroup.leave()
                }
                
                // Query WatchLog with timestamp sortDescriptor
                queryGroup.enter()
                let watchLogPredicate = NSPredicate(format: "timestamp >= %@", Date.distantPast as NSDate)
                let watchLogQuery = CKQuery(recordType: RecordType.watchLog.rawValue, predicate: watchLogPredicate)
                watchLogQuery.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: true)]
                self.privateDatabase.perform(watchLogQuery, inZoneWith: self.customZoneID) { _, queryError in
                    if let queryError = queryError {
                        let errorDescription = queryError.localizedDescription
                        // Ignore "not queryable" errors - fields will become queryable on first real use
                        if !errorDescription.contains("queryable") {
                            LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to query WatchLog seed record", metadata: ["error": errorDescription], source: self.logSource)
                            querySuccess = false
                        }
                    }
                    queryGroup.leave()
                }
                
                // After queries complete, delete all seed records
                queryGroup.notify(queue: .main) {
                if !savedRecords.isEmpty {
                    let deleteGroup = DispatchGroup()
                    for record in savedRecords {
                        deleteGroup.enter()
                        self.privateDatabase.delete(withRecordID: record.recordID) { _, _ in
                            deleteGroup.leave()
                        }
                    }
                    deleteGroup.notify(queue: .main) {
                        if querySuccess && !hasErrors {
                            UserDefaults.standard.set(true, forKey: self.schemaInitializedKey)
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Schema initialized successfully - all fields are now queryable", source: self.logSource)
                            completion(true)
                        } else {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Schema initialization completed with warnings - fields will become queryable on first real use", source: self.logSource)
                            completion(false)
                        }
                    }
                } else {
                    if querySuccess && !hasErrors {
                        UserDefaults.standard.set(true, forKey: self.schemaInitializedKey)
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Schema initialized successfully - all fields are now queryable", source: self.logSource)
                        completion(true)
                    } else {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Schema initialization completed with warnings - fields will become queryable on first real use", source: self.logSource)
                        completion(false)
                    }
                }
                }
            }
        }
    }
    #endif
    
    // MARK: - Account Status
    
    /**
     * Checks iCloud account status
     */
    public func checkAccountStatus(completion: @escaping (CKAccountStatus, Error?) -> Void) {
        container.accountStatus { status, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error checking account status", metadata: ["error": error.localizedDescription], source: self.logSource)
            }
            completion(status, error)
        }
    }
    
    // MARK: - Database Access
    
    /**
     * Returns the private CloudKit database
     */
    public func getPrivateDatabase() -> CKDatabase {
        return privateDatabase
    }
    
    /**
     * Returns the CloudKit container
     */
    public func getContainer() -> CKContainer {
        return container
    }
    
    // MARK: - Sync Operations
    
    /**
     * Triggers sync to CloudKit immediately (debounce removed for faster sync)
     * Multiple calls will trigger multiple syncs, but CloudKit handles rate limiting
     */
    public func triggerSyncToCloudWithDebounce() {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Triggering immediate sync to CloudKit", source: self.logSource)
        
        // Cancel any pending debounced sync
        syncDebounceTimer?.invalidate()
        syncDebounceTimer = nil
        
        // Trigger sync immediately
        triggerSyncToCloud { _, _, _ in }
    }
    
    /**
     * Triggers sync to CloudKit by fetching modified records from SQLite
     * Only syncs records modified after lastSyncTimestamp (incremental sync)
     * 
     * Flow:
     * 1. Get lastSyncTimestamp from UserDefaults
     * 2. Query SQLite for notifications/buckets modified after timestamp
     * 3. Create/update CloudKit records for modified items
     * 4. Update lastSyncTimestamp
     */
    public func triggerSyncToCloud(completion: @escaping (Bool, Error?, SyncStats?) -> Void) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Starting sync to CloudKit", source: self.logSource)
        
        // Check account status first
        checkAccountStatus { status, error in
            guard status == .available else {
                let errorMsg = "iCloud account not available (status: \(status.rawValue))"
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: errorMsg, source: self.logSource)
                completion(false, NSError(domain: "CloudKitManager", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMsg]), nil)
                return
            }
            
            // Get last sync timestamp (default to epoch if never synced)
            let lastSyncTimestamp = UserDefaults.standard.object(forKey: self.lastSyncTimestampKey) as? Date ?? Date(timeIntervalSince1970: 0)
            
            // Fetch modified records from SQLite and sync to CloudKit
            self.syncModifiedRecordsToCloudKit(since: lastSyncTimestamp) { success, error, stats in
                if success {
                    // Update last sync timestamp
                    UserDefaults.standard.set(Date(), forKey: self.lastSyncTimestampKey)
                }
                completion(success, error, stats)
            }
        }
    }
    
    /**
     * Syncs modified records from SQLite to CloudKit
     * Only processes records modified after the given timestamp
     */
    private func syncModifiedRecordsToCloudKit(since timestamp: Date, completion: @escaping (Bool, Error?, SyncStats?) -> Void) {
        var notificationsSynced = 0
        var bucketsSynced = 0
        var notificationsUpdated = 0
        var bucketsUpdated = 0
        var syncErrors: [Error] = []
        
        let group = DispatchGroup()
        
        // Sync notifications
        group.enter()
        syncNotificationsToCloudKit(since: timestamp) { success, synced, updated, error in
            if success {
                notificationsSynced = synced
                notificationsUpdated = updated
            } else if let error = error {
                syncErrors.append(error)
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error syncing notifications", metadata: ["error": error.localizedDescription], source: self.logSource)
            }
            group.leave()
        }
        
        // Sync buckets
        group.enter()
        syncBucketsToCloudKit(since: timestamp) { success, synced, updated, error in
            if success {
                bucketsSynced = synced
                bucketsUpdated = updated
                
                // After syncing buckets, remove buckets from CloudKit that are no longer in SQLite
                self.removeOrphanedBucketsFromCloudKit { removedCount, removeError in
                    if let removeError = removeError {
                        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Error removing orphaned buckets", metadata: ["error": removeError.localizedDescription], source: self.logSource)
                    } else if removedCount > 0 {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Removed orphaned buckets from CloudKit", metadata: ["removedCount": "\(removedCount)"], source: self.logSource)
                    }
                }
            } else if let error = error {
                syncErrors.append(error)
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error syncing buckets", metadata: ["error": error.localizedDescription], source: self.logSource)
            }
            group.leave()
        }
        
        group.notify(queue: .main) {
            let stats = SyncStats(
                notificationsSynced: notificationsSynced,
                bucketsSynced: bucketsSynced,
                notificationsUpdated: notificationsUpdated,
                bucketsUpdated: bucketsUpdated
            )
            
            if syncErrors.isEmpty {
                completion(true, nil, stats)
            } else {
                completion(false, syncErrors.first, stats)
            }
        }
    }
    
    /**
     * Syncs notifications from SQLite to CloudKit
     * Fetches notifications modified after the given timestamp and creates/updates CloudKit records
     */
    private func syncNotificationsToCloudKit(since timestamp: Date, completion: @escaping (Bool, Int, Int, Error?) -> Void) {
        var syncedCount = 0
        var updatedCount = 0
        var errors: [Error] = []
        
        // Wrapper to update inout parameters after closure execution
        class InoutWrapper {
            var syncedCount: Int
            var updatedCount: Int
            var errors: [Error]
            
            init(syncedCount: Int, updatedCount: Int, errors: [Error]) {
                self.syncedCount = syncedCount
                self.updatedCount = updatedCount
                self.errors = errors
            }
        }
        let wrapper = InoutWrapper(syncedCount: syncedCount, updatedCount: updatedCount, errors: errors)
        
        // Perform sync on background queue to avoid blocking UI
        syncQueue.async {
            // Fetch notifications from SQLite
            DatabaseAccess.getRecentNotifications(limit: 10000, unreadOnly: false, source: self.databaseSource) { notifications in
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched notifications from SQLite for sync", metadata: ["count": "\(notifications.count)", "since": ISO8601DateFormatter().string(from: timestamp)], source: self.logSource)
                
                guard !notifications.isEmpty else {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "No notifications to sync", source: self.logSource)
                    DispatchQueue.main.async {
                        completion(true, 0, 0, nil)
                    }
                    return
                }
                
                // Filter notifications modified after timestamp
                let filteredNotifications = notifications.filter { notification in
                    guard let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) else {
                        return true // Include if we can't parse date
                    }
                    return createdAt >= timestamp
                }
                
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Filtered notifications for sync", metadata: ["total": "\(notifications.count)", "filtered": "\(filteredNotifications.count)", "since": ISO8601DateFormatter().string(from: timestamp)], source: self.logSource)
                
                guard !filteredNotifications.isEmpty else {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "No notifications to sync after filtering", source: self.logSource)
                    DispatchQueue.main.async {
                        completion(true, 0, 0, nil)
                    }
                    return
                }
                
                // Fetch read_at timestamps for ALL notifications in a single batch query
                // This ensures we get readAt for all notifications that have it set in SQLite
                let allNotificationIds = filteredNotifications.map { $0.id }
                var readAtMap: [String: String] = [:]
                
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Preparing to fetch read_at timestamps", metadata: ["totalNotifications": "\(allNotificationIds.count)"], source: self.logSource)
                
                if !allNotificationIds.isEmpty {
                    // Single batch query to get all read_at timestamps (only returns timestamps for read notifications)
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetching read_at timestamps in batch", metadata: ["count": "\(allNotificationIds.count)"], source: self.logSource)
                    DatabaseAccess.fetchReadAtTimestamps(notificationIds: allNotificationIds, source: self.databaseSource) { timestamps in
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched read_at timestamps in batch", metadata: ["count": "\(timestamps.count)", "totalNotifications": "\(allNotificationIds.count)"], source: self.logSource)
                        readAtMap = timestamps
                        
                        // Use wrapper instead of inout parameters to avoid capture issues
                        var localSyncedCount = wrapper.syncedCount
                        var localUpdatedCount = wrapper.updatedCount
                        var localErrors = wrapper.errors
                        
                        // Create dateFormatter for processNotificationsForCloudKit (for readAt parsing)
                        let dateFormatter = ISO8601DateFormatter()
                        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        
                        self.processNotificationsForCloudKit(
                            notifications: filteredNotifications,
                            readAtMap: readAtMap,
                            dateFormatter: dateFormatter,
                            syncedCount: &localSyncedCount,
                            updatedCount: &localUpdatedCount,
                            errors: &localErrors,
                            completion: { [wrapper] success, synced, updated, error in
                                // Store values in wrapper to update inout parameters later
                                // We can't update inout parameters in escaping closures
                                wrapper.syncedCount = synced
                                wrapper.updatedCount = updated
                                if let error = error {
                                    wrapper.errors.append(error)
                                }
                                completion(success, synced, updated, error)
                            }
                        )
                    }
                } else {
                    // No notifications, proceed directly
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "No notifications to sync", source: self.logSource)
                    // Use wrapper instead of inout parameters to avoid capture issues
                    var localSyncedCount = wrapper.syncedCount
                    var localUpdatedCount = wrapper.updatedCount
                    var localErrors = wrapper.errors
                    
                    // Create dateFormatter for processNotificationsForCloudKit (for readAt parsing)
                    let dateFormatter = ISO8601DateFormatter()
                    dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    
                    self.processNotificationsForCloudKit(
                        notifications: filteredNotifications,
                        readAtMap: readAtMap,
                        dateFormatter: dateFormatter,
                        syncedCount: &localSyncedCount,
                        updatedCount: &localUpdatedCount,
                        errors: &localErrors,
                        completion: { [wrapper] success, synced, updated, error in
                            // Store values in wrapper to update inout parameters later
                            // We can't update inout parameters in escaping closures
                            wrapper.syncedCount = synced
                            wrapper.updatedCount = updated
                            if let error = error {
                                wrapper.errors.append(error)
                            }
                            completion(success, synced, updated, error)
                        }
                    )
                }
            }
            
            // Update inout parameters from wrapper after all closures complete
            // Read wrapper values before closure to avoid capturing inout parameters
            let wrapperSynced = wrapper.syncedCount
            let wrapperUpdated = wrapper.updatedCount
            let wrapperErrors = wrapper.errors
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                syncedCount = wrapperSynced
                updatedCount = wrapperUpdated
                errors = wrapperErrors
            }
        }
    }
    
    /**
     * Process notifications and save them to CloudKit
     */
    private func processNotificationsForCloudKit(
        notifications: [WidgetNotification],
        readAtMap: [String: String],
        dateFormatter: ISO8601DateFormatter,
        syncedCount: inout Int,
        updatedCount: inout Int,
        errors: inout [Error],
        completion: @escaping (Bool, Int, Int, Error?) -> Void
    ) {
        let group = DispatchGroup()
        
        // Use local variables wrapped in a class to allow mutation in escaping closures
        class Counter {
            var syncedCount: Int = 0
            var updatedCount: Int = 0
            var errors: [Error] = []
        }
        let counter = Counter()
        
        // Wrapper to update inout parameters after closure execution
        class InoutWrapper {
            var syncedCount: Int
            var updatedCount: Int
            var errors: [Error]
            
            init(syncedCount: Int, updatedCount: Int, errors: [Error]) {
                self.syncedCount = syncedCount
                self.updatedCount = updatedCount
                self.errors = errors
            }
        }
        let wrapper = InoutWrapper(syncedCount: syncedCount, updatedCount: updatedCount, errors: errors)
        
        // Create all CloudKit records in memory for batch operation
        var recordsToSave: [CKRecord] = []
        var notificationIdToRecord: [String: CKRecord] = [:]
        
        for notification in notifications {
            let recordID = self.notificationRecordID(notification.id)
            let record = CKRecord(recordType: RecordType.notification.rawValue, recordID: recordID)
            
            // Set fields from notification data
            record["id"] = notification.id
            record["bucketId"] = notification.bucketId
            record["title"] = notification.title
            record["subtitle"] = notification.subtitle
            record["body"] = notification.body
            
            // Convert attachments to JSON string
            let attachmentsDict: [[String: Any]] = notification.attachments.map { attachment in
                var dict: [String: Any] = ["mediaType": attachment.mediaType]
                if let url = attachment.url {
                    dict["url"] = url
                }
                if let name = attachment.name {
                    dict["name"] = name
                }
                return dict
            }
            if let attachmentsData = try? JSONSerialization.data(withJSONObject: attachmentsDict),
               let attachmentsString = String(data: attachmentsData, encoding: .utf8) {
                record["attachments"] = attachmentsString
            } else {
                record["attachments"] = "[]"
            }
            
            // Convert actions to JSON string
            let actionsDict: [[String: Any]] = notification.actions.map { action in
                var dict: [String: Any] = [
                    "type": action.type,
                    "label": action.label
                ]
                if let value = action.value {
                    dict["value"] = value
                }
                if let id = action.id {
                    dict["id"] = id
                }
                if let url = action.url {
                    dict["url"] = url
                }
                if let bucketId = action.bucketId {
                    dict["bucketId"] = bucketId
                }
                if let minutes = action.minutes {
                    dict["minutes"] = minutes
                }
                return dict
            }
            if let actionsData = try? JSONSerialization.data(withJSONObject: actionsDict),
               let actionsString = String(data: actionsData, encoding: .utf8) {
                record["actions"] = actionsString
            } else {
                record["actions"] = "[]"
            }
            
            // Parse dates
            if let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) {
                record["createdAt"] = createdAt
            }
            
            // Don't set readAt here - we'll set it only for new records after determining which are new vs existing
            // This prevents iOS from overwriting readAt for existing notifications during initialization
            
            recordsToSave.append(record)
            notificationIdToRecord[notification.id] = record
        }
        
        // Fetch existing records to determine which are updates vs new
        let recordIDs = recordsToSave.map { $0.recordID }
        let fetchOperation = CKFetchRecordsOperation(recordIDs: recordIDs)
        fetchOperation.database = self.privateDatabase
        
        // Check if we're on watchOS or in an iOS extension (both have different fetchRecordsResultBlock signature)
        let isExtension = Bundle.main.bundlePath.contains(".appex")
        
        #if os(watchOS)
        // On watchOS, fetchRecordsResultBlock returns Result<Void, Error> not Result<[CKRecord.ID: CKRecord], Error>
        // Therefore we MUST use perRecordCompletionBlock to collect records
        // Note: On watchOS, perRecordCompletionBlock signature is (CKRecord?, CKRecord.ID?, Error?) -> Void
        var existingRecordIDs: Set<CKRecord.ID> = []
        
        group.enter()
        var existingRecords: [CKRecord.ID: CKRecord] = [:]
        
        fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
            if let recordID = recordID, let record = record {
                existingRecordIDs.insert(recordID)
                existingRecords[recordID] = record
            }
            // Ignore individual record failures
        }
        
        fetchOperation.fetchRecordsResultBlock = { [weak self] result in
            guard let self = self else {
                group.leave()
                return
            }
            
            if case .failure(let error) = result {
                // If fetch fails, we'll treat all as new records
                LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to fetch existing records, treating all as new", metadata: ["error": error.localizedDescription], source: self.logSource)
            }
            
            // Determine which records are updates vs new
            var newRecordIDs: Set<CKRecord.ID> = []
            var updateRecordIDs: Set<CKRecord.ID> = []
            
            for record in recordsToSave {
                if existingRecordIDs.contains(record.recordID) {
                    updateRecordIDs.insert(record.recordID)
                    // For existing records, preserve the readAt value from CloudKit
                    // iOS should not modify readAt for existing notifications during initialization
                    if let existingRecord = existingRecords[record.recordID],
                       let cloudKitReadAt = existingRecord["readAt"] as? Date {
                        // Preserve CloudKit's readAt value
                        record["readAt"] = cloudKitReadAt
                    } else {
                        // If CloudKit doesn't have readAt, remove it from our record to avoid overwriting
                        record.setValue(nil, forKey: "readAt")
                    }
                } else {
                    newRecordIDs.insert(record.recordID)
                    // For new records, set readAt from SQLite
                    if let notificationId = record["id"] as? String,
                       let readAtString = readAtMap[notificationId],
                       let readAt = dateFormatter.date(from: readAtString) {
                        record["readAt"] = readAt
                    } else {
                        record["readAt"] = nil
                    }
                }
            }
            
            // Save all records in batch
            let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
            modifyOperation.database = self.privateDatabase
            modifyOperation.savePolicy = .changedKeys
            
            modifyOperation.modifyRecordsResultBlock = { modifyResult in
                switch modifyResult {
                case .success:
                    counter.syncedCount = newRecordIDs.count
                    counter.updatedCount = updateRecordIDs.count
                    group.leave()
                    
                case .failure(let error):
                    // Handle partial success
                    if let ckError = error as? CKError,
                       let partialErrors = ckError.partialErrorsByItemID {
                        // Count successful saves
                        let errorRecordIDs = Set(partialErrors.keys.compactMap { $0 as? CKRecord.ID })
                        let successfulRecordIDs = Set(recordsToSave.map { $0.recordID }).subtracting(errorRecordIDs)
                        counter.syncedCount = newRecordIDs.intersection(successfulRecordIDs).count
                        counter.updatedCount = updateRecordIDs.intersection(successfulRecordIDs).count
                        
                        // Handle serverRecordChanged errors by fetching and re-saving in batch
                        var recordsToRetry: [CKRecord] = []
                        var retryRecordIDs: [CKRecord.ID] = []
                        
                        for (recordIDKey, partialError) in partialErrors {
                            guard let recordID = recordIDKey as? CKRecord.ID else { continue }
                            if let ckPartialError = partialError as? CKError,
                               ckPartialError.code == .serverRecordChanged {
                                retryRecordIDs.append(recordID)
                            } else {
                                counter.errors.append(partialError)
                            }
                        }
                        
                        // Fetch records that had serverRecordChanged errors
                        if !retryRecordIDs.isEmpty {
                            let retryFetchOperation = CKFetchRecordsOperation(recordIDs: retryRecordIDs)
                            retryFetchOperation.database = self.privateDatabase
                            
                            #if os(watchOS)
                            // On watchOS, use perRecordCompletionBlock
                            retryFetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                                if let fetchedRecord = record,
                                   let notificationId = fetchedRecord["id"] as? String,
                                   let notification = notifications.first(where: { $0.id == notificationId }) {
                                    // Ensure all required fields are present
                                    fetchedRecord["id"] = notification.id
                                    fetchedRecord["bucketId"] = notification.bucketId
                                    fetchedRecord["title"] = notification.title
                                    fetchedRecord["body"] = notification.body
                                    
                                    if let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) {
                                        fetchedRecord["createdAt"] = createdAt
                                    }
                                    
                                    if let subtitle = notification.subtitle {
                                        fetchedRecord["subtitle"] = subtitle
                                    }
                                    
                                    // Don't modify readAt for retry records - preserve CloudKit's value
                                    // These are existing records that had conflicts
                                    
                                    recordsToRetry.append(fetchedRecord)
                                }
                            }
                            
                            retryFetchOperation.fetchRecordsResultBlock = { retryFetchResult in
                                if case .failure(let retryFetchError) = retryFetchResult {
                                    counter.errors.append(retryFetchError)
                                    group.leave()
                                    return
                                }
                                
                                // Re-save retry records in batch
                                if !recordsToRetry.isEmpty {
                                    let retryModifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToRetry, recordIDsToDelete: nil)
                                    retryModifyOperation.database = self.privateDatabase
                                    retryModifyOperation.savePolicy = .allKeys
                                    
                                    retryModifyOperation.modifyRecordsResultBlock = { retryModifyResult in
                                        switch retryModifyResult {
                                        case .success:
                                            counter.updatedCount += recordsToRetry.count
                                            group.leave()
                                        case .failure(let retryError):
                                            counter.errors.append(retryError)
                                            group.leave()
                                        }
                                    }
                                    
                                    self.privateDatabase.add(retryModifyOperation)
                                } else {
                                    group.leave()
                                }
                            }
                            #else
                            // On iOS, check if extension or main app
                            if isExtension {
                                // On iOS extensions, use perRecordCompletionBlock
                                retryFetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                                    if let fetchedRecord = record,
                                       let notificationId = fetchedRecord["id"] as? String,
                                       let notification = notifications.first(where: { $0.id == notificationId }) {
                                        // Ensure all required fields are present
                                        fetchedRecord["id"] = notification.id
                                        fetchedRecord["bucketId"] = notification.bucketId
                                        fetchedRecord["title"] = notification.title
                                        fetchedRecord["body"] = notification.body
                                        
                                        if let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) {
                                            fetchedRecord["createdAt"] = createdAt
                                        }
                                        
                                        if let subtitle = notification.subtitle {
                                            fetchedRecord["subtitle"] = subtitle
                                        }
                                        
                                        // Don't modify readAt for retry records - preserve CloudKit's value
                                        // These are existing records that had conflicts
                                        
                                        recordsToRetry.append(fetchedRecord)
                                    }
                                }
                                
                                retryFetchOperation.fetchRecordsResultBlock = { retryFetchResult in
                                    if case .failure(let retryFetchError) = retryFetchResult {
                                        counter.errors.append(retryFetchError)
                                        group.leave()
                                        return
                                    }
                                    
                                    // Re-save retry records in batch
                                    if !recordsToRetry.isEmpty {
                                        let retryModifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToRetry, recordIDsToDelete: nil)
                                        retryModifyOperation.database = self.privateDatabase
                                        retryModifyOperation.savePolicy = .allKeys
                                        
                                        retryModifyOperation.modifyRecordsResultBlock = { retryModifyResult in
                                            switch retryModifyResult {
                                            case .success:
                                                counter.updatedCount += recordsToRetry.count
                                                group.leave()
                                            case .failure(let retryError):
                                                counter.errors.append(retryError)
                                                group.leave()
                                            }
                                        }
                                        
                                        self.privateDatabase.add(retryModifyOperation)
                                    } else {
                                        group.leave()
                                    }
                                }
                            } else {
                                // On iOS main app, fetchRecordsResultBlock returns Result<[CKRecord.ID: CKRecord], Error>
                                retryFetchOperation.fetchRecordsResultBlock = { retryFetchResult in
                                    switch retryFetchResult {
                                    case .success(let fetchedRecordsByID):
                                        // Update fetched records with our data
                                        for (recordID, fetchedRecord) in fetchedRecordsByID {
                                            if let notificationId = fetchedRecord["id"] as? String,
                                           let notification = notifications.first(where: { $0.id == notificationId }) {
                                            // Ensure all required fields are present
                                            fetchedRecord["id"] = notification.id
                                            fetchedRecord["bucketId"] = notification.bucketId
                                            fetchedRecord["title"] = notification.title
                                            fetchedRecord["body"] = notification.body
                                            
                                            if let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) {
                                                fetchedRecord["createdAt"] = createdAt
                                            }
                                            
                                            if let subtitle = notification.subtitle {
                                                fetchedRecord["subtitle"] = subtitle
                                            }
                                            
                                            // Don't modify readAt for retry records - preserve CloudKit's value
                                            // These are existing records that had conflicts
                                            
                                            recordsToRetry.append(fetchedRecord)
                                        }
                                    }
                                    
                                    // Re-save retry records in batch
                                    if !recordsToRetry.isEmpty {
                                        let retryModifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToRetry, recordIDsToDelete: nil)
                                        retryModifyOperation.database = self.privateDatabase
                                        retryModifyOperation.savePolicy = .allKeys
                                        
                                        retryModifyOperation.modifyRecordsResultBlock = { retryModifyResult in
                                            switch retryModifyResult {
                                            case .success:
                                                counter.updatedCount += recordsToRetry.count
                                                group.leave()
                                            case .failure(let retryError):
                                                counter.errors.append(retryError)
                                                group.leave()
                                            }
                                        }
                                        
                                        self.privateDatabase.add(retryModifyOperation)
                                    } else {
                                        group.leave()
                                    }
                                    
                                case .failure(let retryFetchError):
                                    counter.errors.append(retryFetchError)
                                    group.leave()
                                }
                            }
                            }
                            #endif
                            
                            self.privateDatabase.add(retryFetchOperation)
                        } else {
                            group.leave()
                        }
                    } else {
                        counter.errors.append(error)
                        group.leave()
                    }
                }
            }
            
            self.privateDatabase.add(modifyOperation)
        }
        #else
        // On iOS extensions, fetchRecordsResultBlock also returns Result<Void, Error>
        // So we use perRecordCompletionBlock for extensions too
        if isExtension {
            var existingRecordIDs: Set<CKRecord.ID> = []
            var existingRecords: [CKRecord.ID: CKRecord] = [:]
            
            group.enter()
            fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                if let recordID = recordID, let record = record {
                    existingRecordIDs.insert(recordID)
                    existingRecords[recordID] = record
                }
                // Ignore individual record failures
            }
            
            fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                guard let self = self else {
                    group.leave()
                    return
                }
                
                if case .failure(let error) = result {
                    // If fetch fails, we'll treat all as new records
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to fetch existing records, treating all as new", metadata: ["error": error.localizedDescription], source: self.logSource)
                }
                
                // Determine which records are updates vs new
                var newRecordIDs: Set<CKRecord.ID> = []
                var updateRecordIDs: Set<CKRecord.ID> = []
                
                for record in recordsToSave {
                    if existingRecordIDs.contains(record.recordID) {
                        updateRecordIDs.insert(record.recordID)
                        // For existing records, preserve the readAt value from CloudKit
                        // iOS should not modify readAt for existing notifications during initialization
                        if let existingRecord = existingRecords[record.recordID],
                           let cloudKitReadAt = existingRecord["readAt"] as? Date {
                            // Preserve CloudKit's readAt value
                            record["readAt"] = cloudKitReadAt
                        } else {
                            // If CloudKit doesn't have readAt, remove it from our record to avoid overwriting
                            record.setValue(nil, forKey: "readAt")
                        }
                    } else {
                        newRecordIDs.insert(record.recordID)
                        // For new records, set readAt from SQLite
                        if let notificationId = record["id"] as? String,
                           let readAtString = readAtMap[notificationId],
                           let readAt = dateFormatter.date(from: readAtString) {
                            record["readAt"] = readAt
                        } else {
                            record["readAt"] = nil
                        }
                    }
                }
                
                // Save all records in batch
                let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                modifyOperation.database = self.privateDatabase
                modifyOperation.savePolicy = .changedKeys
                
                modifyOperation.modifyRecordsResultBlock = { modifyResult in
                    switch modifyResult {
                    case .success:
                        counter.syncedCount = newRecordIDs.count
                        counter.updatedCount = updateRecordIDs.count
                        group.leave()
                        
                    case .failure(let error):
                        // Handle partial success
                        if let ckError = error as? CKError,
                           let partialErrors = ckError.partialErrorsByItemID {
                            // Count successful saves
                            let errorRecordIDs = Set(partialErrors.keys.compactMap { $0 as? CKRecord.ID })
                            let successfulRecordIDs = Set(recordsToSave.map { $0.recordID }).subtracting(errorRecordIDs)
                            counter.syncedCount = newRecordIDs.intersection(successfulRecordIDs).count
                            counter.updatedCount = updateRecordIDs.intersection(successfulRecordIDs).count
                            
                            // Handle serverRecordChanged errors by fetching and re-saving in batch
                            var recordsToRetry: [CKRecord] = []
                            var retryRecordIDs: [CKRecord.ID] = []
                            
                            for (recordIDKey, partialError) in partialErrors {
                                guard let recordID = recordIDKey as? CKRecord.ID else { continue }
                                if let ckPartialError = partialError as? CKError,
                                   ckPartialError.code == .serverRecordChanged {
                                    retryRecordIDs.append(recordID)
                                } else {
                                    counter.errors.append(partialError)
                                }
                            }
                            
                            // Fetch records that had serverRecordChanged errors
                            if !retryRecordIDs.isEmpty {
                                let retryFetchOperation = CKFetchRecordsOperation(recordIDs: retryRecordIDs)
                                retryFetchOperation.database = self.privateDatabase
                                
                                // On iOS extensions, use perRecordCompletionBlock
                                retryFetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                                    if let fetchedRecord = record,
                                       let notificationId = fetchedRecord["id"] as? String,
                                       let notification = notifications.first(where: { $0.id == notificationId }) {
                                        // Ensure all required fields are present
                                        fetchedRecord["id"] = notification.id
                                        fetchedRecord["bucketId"] = notification.bucketId
                                        fetchedRecord["title"] = notification.title
                                        fetchedRecord["body"] = notification.body
                                        
                                        if let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) {
                                            fetchedRecord["createdAt"] = createdAt
                                        }
                                        
                                        if let subtitle = notification.subtitle {
                                            fetchedRecord["subtitle"] = subtitle
                                        }
                                        
                                        // Don't modify readAt for retry records - preserve CloudKit's value
                                        // These are existing records that had conflicts
                                        
                                        recordsToRetry.append(fetchedRecord)
                                    }
                                }
                                
                                retryFetchOperation.fetchRecordsResultBlock = { retryFetchResult in
                                    if case .failure(let retryFetchError) = retryFetchResult {
                                        counter.errors.append(retryFetchError)
                                        group.leave()
                                        return
                                    }
                                    
                                    // Retry saving with updated records
                                    if !recordsToRetry.isEmpty {
                                        let retryModifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToRetry, recordIDsToDelete: nil)
                                        retryModifyOperation.database = self.privateDatabase
                                        retryModifyOperation.savePolicy = .allKeys
                                        
                                        retryModifyOperation.modifyRecordsResultBlock = { retryModifyResult in
                                            switch retryModifyResult {
                                            case .success:
                                                counter.syncedCount = newRecordIDs.count
                                                counter.updatedCount = updateRecordIDs.count
                                                group.leave()
                                            case .failure(let retryError):
                                                counter.errors.append(retryError)
                                                group.leave()
                                            }
                                        }
                                        
                                        self.privateDatabase.add(retryModifyOperation)
                                    } else {
                                        group.leave()
                                    }
                                }
                                
                                self.privateDatabase.add(retryFetchOperation)
                        } else {
                            group.leave()
                        }
                    } else {
                        counter.errors.append(error)
                        group.leave()
                    }
                }
            }
            
            self.privateDatabase.add(modifyOperation)
        }
        } else {
            // On iOS main app, use perRecordCompletionBlock to avoid cast issues
            var existingRecordIDs: Set<CKRecord.ID> = []
            var existingRecords: [CKRecord.ID: CKRecord] = [:]
            
            group.enter()
            fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                if let recordID = recordID, let record = record {
                    existingRecordIDs.insert(recordID)
                    existingRecords[recordID] = record
                }
                // Ignore individual record failures
            }
            
            fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                guard let self = self else {
                    group.leave()
                    return
                }
                
                if case .failure(let error) = result {
                    // If fetch fails, we'll treat all as new records
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to fetch existing records, treating all as new", metadata: ["error": error.localizedDescription], source: self.logSource)
                }
                
                // Determine which records are updates vs new
                var newRecordIDs: Set<CKRecord.ID> = []
                var updateRecordIDs: Set<CKRecord.ID> = []
                
                for record in recordsToSave {
                    if existingRecordIDs.contains(record.recordID) {
                        updateRecordIDs.insert(record.recordID)
                        // For existing records, preserve the readAt value from CloudKit
                        // iOS should not modify readAt for existing notifications during initialization
                        if let existingRecord = existingRecords[record.recordID],
                           let cloudKitReadAt = existingRecord["readAt"] as? Date {
                            // Preserve CloudKit's readAt value
                            record["readAt"] = cloudKitReadAt
                        } else {
                            // If CloudKit doesn't have readAt, remove it from our record to avoid overwriting
                            record.setValue(nil, forKey: "readAt")
                        }
                    } else {
                        newRecordIDs.insert(record.recordID)
                        // For new records, set readAt from SQLite
                        if let notificationId = record["id"] as? String,
                           let readAtString = readAtMap[notificationId],
                           let readAt = dateFormatter.date(from: readAtString) {
                            record["readAt"] = readAt
                        } else {
                            record["readAt"] = nil
                        }
                    }
                }
                
                // Save all records in batch
                let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                modifyOperation.database = self.privateDatabase
                modifyOperation.savePolicy = .changedKeys
                
                modifyOperation.modifyRecordsResultBlock = { modifyResult in
                    switch modifyResult {
                    case .success:
                        counter.syncedCount = newRecordIDs.count
                        counter.updatedCount = updateRecordIDs.count
                        group.leave()
                        
                    case .failure(let error):
                        // Handle partial success
                        if let ckError = error as? CKError,
                           let partialErrors = ckError.partialErrorsByItemID {
                            // Count successful saves
                            let errorRecordIDs = Set(partialErrors.keys.compactMap { $0 as? CKRecord.ID })
                            let successfulRecordIDs = Set(recordsToSave.map { $0.recordID }).subtracting(errorRecordIDs)
                            counter.syncedCount = newRecordIDs.intersection(successfulRecordIDs).count
                            counter.updatedCount = updateRecordIDs.intersection(successfulRecordIDs).count
                            
                            // Handle serverRecordChanged errors by fetching and re-saving in batch
                            var recordsToRetry: [CKRecord] = []
                            var retryRecordIDs: [CKRecord.ID] = []
                            
                            for (recordIDKey, partialError) in partialErrors {
                                guard let recordID = recordIDKey as? CKRecord.ID else { continue }
                                if let ckPartialError = partialError as? CKError,
                                   ckPartialError.code == .serverRecordChanged {
                                    retryRecordIDs.append(recordID)
                                } else {
                                    counter.errors.append(partialError)
                                }
                            }
                            
                            // Fetch records that had serverRecordChanged errors
                            if !retryRecordIDs.isEmpty {
                                let retryFetchOperation = CKFetchRecordsOperation(recordIDs: retryRecordIDs)
                                retryFetchOperation.database = self.privateDatabase
                                
                                // On iOS extensions, use perRecordCompletionBlock
                                retryFetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                                    if let fetchedRecord = record,
                                       let notificationId = fetchedRecord["id"] as? String,
                                       let notification = notifications.first(where: { $0.id == notificationId }) {
                                        // Ensure all required fields are present
                                        fetchedRecord["id"] = notification.id
                                        fetchedRecord["bucketId"] = notification.bucketId
                                        fetchedRecord["title"] = notification.title
                                        fetchedRecord["body"] = notification.body
                                        
                                        if let createdAt = CloudKitManager.parseISO8601Date(notification.createdAt) {
                                            fetchedRecord["createdAt"] = createdAt
                                        }
                                        
                                        if let subtitle = notification.subtitle {
                                            fetchedRecord["subtitle"] = subtitle
                                        }
                                        
                                        if let readAtString = readAtMap[notification.id],
                                           let readAt = dateFormatter.date(from: readAtString) {
                                            fetchedRecord["readAt"] = readAt
                                        } else {
                                            fetchedRecord["readAt"] = nil
                                        }
                                        
                                        recordsToRetry.append(fetchedRecord)
                                    }
                                }
                                
                                retryFetchOperation.fetchRecordsResultBlock = { retryFetchResult in
                                    if case .failure(let retryFetchError) = retryFetchResult {
                                        counter.errors.append(retryFetchError)
                                        group.leave()
                                        return
                                    }
                                    
                                    // Retry saving with updated records
                                    if !recordsToRetry.isEmpty {
                                        let retryModifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToRetry, recordIDsToDelete: nil)
                                        retryModifyOperation.database = self.privateDatabase
                                        retryModifyOperation.savePolicy = .allKeys
                                        
                                        retryModifyOperation.modifyRecordsResultBlock = { retryModifyResult in
                                            switch retryModifyResult {
                                            case .success:
                                                counter.syncedCount = newRecordIDs.count
                                                counter.updatedCount = updateRecordIDs.count
                                                group.leave()
                                            case .failure(let retryError):
                                                counter.errors.append(retryError)
                                                group.leave()
                                            }
                                        }
                                        
                                        self.privateDatabase.add(retryModifyOperation)
                                    } else {
                                        group.leave()
                                    }
                                }
                                
                                self.privateDatabase.add(retryFetchOperation)
                            } else {
                                group.leave()
                            }
                        } else {
                            counter.errors.append(error)
                            group.leave()
                        }
                    }
                }
                
                self.privateDatabase.add(modifyOperation)
            }
        }
        #endif
        
        self.privateDatabase.add(fetchOperation)
        
        group.notify(queue: .main) {
            // Use counter values to avoid capturing inout parameters
            let finalSyncedCount = counter.syncedCount
            let finalUpdatedCount = counter.updatedCount
            let finalErrors = counter.errors
            
            // Post completion notification for notifications
            let progress = SyncProgress(
                currentItem: finalSyncedCount + finalUpdatedCount,
                totalItems: notifications.count,
                itemType: "notification",
                phase: "completed"
            )
            NotificationCenter.default.post(
                name: CloudKitManager.syncProgressNotification,
                object: nil,
                userInfo: ["progress": progress]
            )
            
            let hasErrors = !finalErrors.isEmpty
            if hasErrors {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Notification sync completed with errors", metadata: ["synced": "\(finalSyncedCount)", "updated": "\(finalUpdatedCount)", "errors": "\(finalErrors.count)"], source: self.logSource)
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification sync completed successfully", metadata: ["synced": "\(finalSyncedCount)", "updated": "\(finalUpdatedCount)", "total": "\(notifications.count)"], source: self.logSource)
            }
            
            // Update wrapper (will be used to update inout parameters after closure)
            wrapper.syncedCount = finalSyncedCount
            wrapper.updatedCount = finalUpdatedCount
            wrapper.errors = finalErrors
            
            // Call completion - wrapper will be updated by completion callbacks
            completion(!hasErrors, finalSyncedCount, finalUpdatedCount, finalErrors.first)
        }
        
        // Note: We cannot update inout parameters inside escaping closures in Swift
        // The wrapper contains the final values and will be read by the caller
        // The inout parameters are updated synchronously below, but they will only contain
        // initial values. The caller should read the final values from the completion callback
        // or from the wrapper if needed.
        // For now, we update them with initial wrapper values (will be updated when group.notify executes)
        syncedCount = wrapper.syncedCount
        updatedCount = wrapper.updatedCount
        errors = wrapper.errors
    }
    
    /**
     * Syncs buckets from SQLite to CloudKit
     * Fetches buckets modified after the given timestamp and creates/updates CloudKit records
     */
    private func syncBucketsToCloudKit(since timestamp: Date, completion: @escaping (Bool, Int, Int, Error?) -> Void) {
        var syncedCount = 0
        var updatedCount = 0
        var errors: [Error] = []
        
        // Fetch buckets from SQLite
        DatabaseAccess.getAllBuckets(source: self.databaseSource) { buckets in
            guard !buckets.isEmpty else {
                completion(true, 0, 0, nil)
                return
            }
            
            let totalBuckets = buckets.count
            
            // Post progress notification for start
            DispatchQueue.main.async {
                let progress = SyncProgress(
                    currentItem: 0,
                    totalItems: totalBuckets,
                    itemType: "bucket",
                    phase: "syncing"
                )
                NotificationCenter.default.post(
                    name: CloudKitManager.syncProgressNotification,
                    object: nil,
                    userInfo: ["progress": progress]
                )
            }
            
            // Create all CloudKit records in memory for batch operation
            var recordsToSave: [CKRecord] = []
            
            for bucket in buckets {
                let recordID = self.bucketRecordID(bucket.id)
                let record = CKRecord(recordType: RecordType.bucket.rawValue, recordID: recordID)
                
                // Set fields from bucket data
                record["id"] = bucket.id
                record["name"] = bucket.name
                record["iconUrl"] = bucket.iconUrl
                record["color"] = bucket.color
                
                recordsToSave.append(record)
            }
            
            // Fetch existing records to determine which are updates vs new
            let recordIDs = recordsToSave.map { $0.recordID }
            let fetchOperation = CKFetchRecordsOperation(recordIDs: recordIDs)
            fetchOperation.database = self.privateDatabase
            
            // Check if we're on watchOS or in an iOS extension (both have different fetchRecordsResultBlock signature)
            let isExtension = Bundle.main.bundlePath.contains(".appex")
            
            #if os(watchOS)
            // On watchOS, fetchRecordsResultBlock returns Result<Void, Error> not Result<[CKRecord.ID: CKRecord], Error>
            // Therefore we MUST use perRecordCompletionBlock to collect records
            // Note: On watchOS, perRecordCompletionBlock signature is (CKRecord?, CKRecord.ID?, Error?) -> Void
            var existingRecordIDs: Set<CKRecord.ID> = []
            
            fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                if let recordID = recordID, record != nil {
                    existingRecordIDs.insert(recordID)
                }
                // Ignore individual record failures
            }
            
            fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                guard let self = self else { return }
                
                if case .failure(let error) = result {
                    // If fetch fails, we'll treat all as new records
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to fetch existing bucket records, treating all as new", metadata: ["error": error.localizedDescription], source: self.logSource)
                }
                
                // Determine which records are updates vs new
                var newRecordIDs: Set<CKRecord.ID> = []
                var updateRecordIDs: Set<CKRecord.ID> = []
                
                for record in recordsToSave {
                    if existingRecordIDs.contains(record.recordID) {
                        updateRecordIDs.insert(record.recordID)
                    } else {
                        newRecordIDs.insert(record.recordID)
                    }
                }
                
                // Save all records in batch
                let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                modifyOperation.database = self.privateDatabase
                modifyOperation.savePolicy = .changedKeys
                
                modifyOperation.modifyRecordsResultBlock = { modifyResult in
                    switch modifyResult {
                    case .success:
                        syncedCount = newRecordIDs.count
                        updatedCount = updateRecordIDs.count
                        
                        // Post completion notification for buckets
                        DispatchQueue.main.async {
                            let progress = SyncProgress(
                                currentItem: syncedCount + updatedCount,
                                totalItems: totalBuckets,
                                itemType: "bucket",
                                phase: "completed"
                            )
                            NotificationCenter.default.post(
                                name: CloudKitManager.syncProgressNotification,
                                object: nil,
                                userInfo: ["progress": progress]
                            )
                        }
                        
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket batch sync completed successfully", metadata: ["synced": "\(syncedCount)", "updated": "\(updatedCount)", "total": "\(totalBuckets)"], source: self.logSource)
                        completion(true, syncedCount, updatedCount, nil)
                        
                    case .failure(let error):
                        // Handle partial success
                        if let ckError = error as? CKError,
                           let partialErrors = ckError.partialErrorsByItemID {
                            // Count successful saves
                            let errorRecordIDs = Set(partialErrors.keys.compactMap { $0 as? CKRecord.ID })
                            let successfulRecordIDs = Set(recordsToSave.map { $0.recordID }).subtracting(errorRecordIDs)
                            syncedCount = newRecordIDs.intersection(successfulRecordIDs).count
                            updatedCount = updateRecordIDs.intersection(successfulRecordIDs).count
                            
                            // Add partial errors to errors array
                            for (_, partialError) in partialErrors {
                                errors.append(partialError)
                            }
                            
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Bucket batch sync completed with partial errors", metadata: ["synced": "\(syncedCount)", "updated": "\(updatedCount)", "errors": "\(errors.count)"], source: self.logSource)
                        } else {
                            errors.append(error)
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Bucket batch sync failed", metadata: ["error": error.localizedDescription], source: self.logSource)
                        }
                        
                        // Post completion notification even with errors
                        DispatchQueue.main.async {
                            let progress = SyncProgress(
                                currentItem: syncedCount + updatedCount,
                                totalItems: totalBuckets,
                                itemType: "bucket",
                                phase: "completed"
                            )
                            NotificationCenter.default.post(
                                name: CloudKitManager.syncProgressNotification,
                                object: nil,
                                userInfo: ["progress": progress]
                            )
                        }
                        
                        completion(false, syncedCount, updatedCount, errors.first)
                    }
                }
                
                self.privateDatabase.add(modifyOperation)
            }
            #else
            // On iOS extensions, fetchRecordsResultBlock also returns Result<Void, Error>
            // So we use perRecordCompletionBlock for extensions too
            if isExtension {
                var existingRecordIDs: Set<CKRecord.ID> = []
                
                fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                    if let recordID = recordID, record != nil {
                        existingRecordIDs.insert(recordID)
                    }
                    // Ignore individual record failures
                }
                
                fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                    guard let self = self else { return }
                    
                    if case .failure(let error) = result {
                        // If fetch fails, we'll treat all as new records
                        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to fetch existing bucket records, treating all as new", metadata: ["error": error.localizedDescription], source: self.logSource)
                    }
                    
                    // Determine which records are updates vs new
                    var newRecordIDs: Set<CKRecord.ID> = []
                    var updateRecordIDs: Set<CKRecord.ID> = []
                    
                    for record in recordsToSave {
                        if existingRecordIDs.contains(record.recordID) {
                            updateRecordIDs.insert(record.recordID)
                        } else {
                            newRecordIDs.insert(record.recordID)
                        }
                    }
                    
                    // Save all records in batch
                    let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                    modifyOperation.database = self.privateDatabase
                    modifyOperation.savePolicy = .changedKeys
                    
                    modifyOperation.modifyRecordsResultBlock = { modifyResult in
                        switch modifyResult {
                        case .success:
                            syncedCount = newRecordIDs.count
                            updatedCount = updateRecordIDs.count
                            
                            // Post completion notification for buckets
                            DispatchQueue.main.async {
                                let progress = SyncProgress(
                                    currentItem: syncedCount + updatedCount,
                                    totalItems: totalBuckets,
                                    itemType: "bucket",
                                    phase: "completed"
                                )
                                NotificationCenter.default.post(
                                    name: CloudKitManager.syncProgressNotification,
                                    object: nil,
                                    userInfo: ["progress": progress]
                                )
                            }
                            
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket batch sync completed successfully", metadata: ["synced": "\(syncedCount)", "updated": "\(updatedCount)", "total": "\(totalBuckets)"], source: self.logSource)
                            completion(true, syncedCount, updatedCount, nil)
                            
                        case .failure(let error):
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in bucket batch sync", metadata: ["error": error.localizedDescription], source: self.logSource)
                            completion(false, syncedCount, updatedCount, error)
                        }
                    }
                    
                    self.privateDatabase.add(modifyOperation)
                }
            } else {
                // On iOS main app, use perRecordCompletionBlock to avoid cast issues
                var existingRecordIDs: Set<CKRecord.ID> = []
                
                fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                    if let recordID = recordID, record != nil {
                        existingRecordIDs.insert(recordID)
                    }
                    // Ignore individual record failures
                }
                
                fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                    guard let self = self else { return }
                    
                    if case .failure(let error) = result {
                        // If fetch fails, we'll treat all as new records
                        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Failed to fetch existing bucket records, treating all as new", metadata: ["error": error.localizedDescription], source: self.logSource)
                    }
                    
                    // Determine which records are updates vs new
                    var newRecordIDs: Set<CKRecord.ID> = []
                    var updateRecordIDs: Set<CKRecord.ID> = []
                    
                    for record in recordsToSave {
                        if existingRecordIDs.contains(record.recordID) {
                            updateRecordIDs.insert(record.recordID)
                        } else {
                            newRecordIDs.insert(record.recordID)
                        }
                    }
                    
                    // Save all records in batch
                    let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                    modifyOperation.database = self.privateDatabase
                    modifyOperation.savePolicy = .changedKeys
                    
                    modifyOperation.modifyRecordsResultBlock = { modifyResult in
                        switch modifyResult {
                        case .success:
                            syncedCount = newRecordIDs.count
                            updatedCount = updateRecordIDs.count
                            
                            // Post completion notification for buckets
                            DispatchQueue.main.async {
                                let progress = SyncProgress(
                                    currentItem: syncedCount + updatedCount,
                                    totalItems: totalBuckets,
                                    itemType: "bucket",
                                    phase: "completed"
                                )
                                NotificationCenter.default.post(
                                    name: CloudKitManager.syncProgressNotification,
                                    object: nil,
                                    userInfo: ["progress": progress]
                                )
                            }
                            
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket batch sync completed successfully", metadata: ["synced": "\(syncedCount)", "updated": "\(updatedCount)", "total": "\(totalBuckets)"], source: self.logSource)
                            completion(true, syncedCount, updatedCount, nil)
                            
                        case .failure(let error):
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in bucket batch sync", metadata: ["error": error.localizedDescription], source: self.logSource)
                            completion(false, syncedCount, updatedCount, error)
                        }
                    }
                    
                    self.privateDatabase.add(modifyOperation)
                }
            }
            #endif
            
            self.privateDatabase.add(fetchOperation)
        }
    }
    
    /**
     * Removes buckets from CloudKit that are no longer present in SQLite
     * This ensures CloudKit only contains buckets that exist locally
     */
    private func removeOrphanedBucketsFromCloudKit(completion: @escaping (Int, Error?) -> Void) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Checking for orphaned buckets in CloudKit", source: self.logSource)
        
        // Get buckets from SQLite
        DatabaseAccess.getAllBuckets(source: self.databaseSource) { sqliteBuckets in
            let sqliteBucketIds = Set(sqliteBuckets.map { $0.id })
            
            // Fetch all buckets from CloudKit using CKQueryOperation (supports pagination and sortDescriptors)
            let predicate = NSPredicate(value: true)
            let query = CKQuery(recordType: RecordType.bucket.rawValue, predicate: predicate)
            // Add sortDescriptor on 'name' field to make it queryable (required for CloudKit queries)
            query.sortDescriptors = [NSSortDescriptor(key: "name", ascending: true)]
            
            var allRecords: [CKRecord] = []
            var fetchError: Error?
            
            func fetchPage(cursor: CKQueryOperation.Cursor?) {
                let operation: CKQueryOperation
                
                if let cursor = cursor {
                    operation = CKQueryOperation(cursor: cursor)
                } else {
                    operation = CKQueryOperation(query: query)
                }
                
                // Set zone for the operation
                operation.zoneID = self.customZoneID
                operation.resultsLimit = 500
                operation.qualityOfService = .utility
                
                operation.recordMatchedBlock = { recordID, result in
                    switch result {
                    case .success(let record):
                        allRecords.append(record)
                    case .failure(let error):
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error processing bucket record during cleanup", metadata: ["error": error.localizedDescription], source: self.logSource)
                        fetchError = error
                    }
                }
                
                operation.queryResultBlock = { result in
                    switch result {
                    case .success(let cursor):
                        // If there's a cursor, fetch next page
                        if let nextCursor = cursor {
                            fetchPage(cursor: nextCursor)
                        } else {
                            // All pages fetched, process records
                            self.processOrphanedBuckets(allRecords: allRecords, sqliteBucketIds: sqliteBucketIds, completion: completion)
                        }
                    case .failure(let error):
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching buckets from CloudKit for cleanup", metadata: ["error": error.localizedDescription], source: self.logSource)
                        completion(0, error)
                    }
                }
                
                self.privateDatabase.add(operation)
            }
            
            // Start fetching
            fetchPage(cursor: nil)
        }
    }
    
    private func processOrphanedBuckets(allRecords: [CKRecord], sqliteBucketIds: Set<String>, completion: @escaping (Int, Error?) -> Void) {
        // Find buckets in CloudKit that are not in SQLite
        var bucketsToDelete: [CKRecord.ID] = []
        for record in allRecords {
            guard let bucketId = record["id"] as? String else {
                continue
            }
            
            // If bucket is not in SQLite, mark for deletion
            if !sqliteBucketIds.contains(bucketId) {
                bucketsToDelete.append(record.recordID)
            }
        }
        
        guard !bucketsToDelete.isEmpty else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "No orphaned buckets to remove", source: self.logSource)
            completion(0, nil)
            return
        }
        
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Found orphaned buckets to remove (batch)", metadata: ["count": "\(bucketsToDelete.count)", "sqliteCount": "\(sqliteBucketIds.count)", "cloudKitCount": "\(allRecords.count)"], source: self.logSource)
        
        // Delete orphaned buckets in batch
        let deleteOperation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: bucketsToDelete)
        deleteOperation.database = self.privateDatabase
        
        deleteOperation.modifyRecordsResultBlock = { result in
            switch result {
            case .success:
                let deletedCount = bucketsToDelete.count
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Successfully removed orphaned buckets (batch)", metadata: ["deletedCount": "\(deletedCount)"], source: self.logSource)
                completion(deletedCount, nil)
                
            case .failure(let error):
                // Handle partial success
                var deletedCount = bucketsToDelete.count
                var deleteErrors: [Error] = []
                
                if let ckError = error as? CKError,
                   let partialErrors = ckError.partialErrorsByItemID {
                    // Count successful deletions (records not in partialErrors)
                    deletedCount = bucketsToDelete.count - partialErrors.count
                    
                    // Filter out "unknownItem" errors (already deleted) and count them as success
                    for (_, partialError) in partialErrors {
                        if let ckPartialError = partialError as? CKError,
                           ckPartialError.code == .unknownItem {
                            // Already deleted, count as success
                            deletedCount += 1
                        } else {
                            deleteErrors.append(partialError)
                        }
                    }
                    
                    if deleteErrors.isEmpty {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Successfully removed orphaned buckets (batch with some already deleted)", metadata: ["deletedCount": "\(deletedCount)"], source: self.logSource)
                        completion(deletedCount, nil)
                    } else {
                        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Removed orphaned buckets with some errors (batch)", metadata: ["deletedCount": "\(deletedCount)", "errorCount": "\(deleteErrors.count)"], source: self.logSource)
                        completion(deletedCount, deleteErrors.first)
                    }
                } else {
                    deleteErrors.append(error)
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error removing orphaned buckets (batch)", metadata: ["error": error.localizedDescription], source: self.logSource)
                    completion(0, error)
                }
            }
        }
        
        self.privateDatabase.add(deleteOperation)
    }
    
    // MARK: - CloudKit Subscriptions
    
    /**
     * Sets up CloudKit database subscriptions to receive notifications when records change
     * This enables real-time sync between iPhone and Watch
     */
    public func setupSubscriptions(completion: @escaping (Bool, Error?) -> Void) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Setting up CloudKit subscriptions", source: self.logSource)
        
        // First, verify that the zone exists (with retry logic - more retries and longer delay for zone propagation)
        verifyZoneExists(maxRetries: 10, retryDelay: 2.0) { zoneExists in
            guard zoneExists else {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Zone does not exist, cannot create subscriptions", source: self.logSource)
                completion(false, NSError(domain: "CloudKitManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Zone does not exist"]))
                return
            }
            
            let group = DispatchGroup()
            var errors: [Error] = []
            
            // Create subscription for Notification changes
            group.enter()
            self.createNotificationSubscription { success, error in
                if let error = error {
                    errors.append(error)
                }
                group.leave()
            }
            
            // Create subscription for Bucket changes
            group.enter()
            self.createBucketSubscription { success, error in
                if let error = error {
                    errors.append(error)
                }
                group.leave()
            }
            
            #if os(iOS)
            // Create subscription for WatchLog changes (iOS only - Watch writes logs, iOS reads them)
            group.enter()
            self.createWatchLogSubscription { success, error in
                if let error = error {
                    errors.append(error)
                }
                group.leave()
            }
            #endif
            
            group.notify(queue: .main) {
                if errors.isEmpty {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Subscriptions setup successfully", source: self.logSource)
                    completion(true, nil)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Subscriptions setup with errors", metadata: ["errorCount": "\(errors.count)"], source: self.logSource)
                    completion(false, errors.first)
                }
            }
        }
    }
    
    /**
     * Verifies that the custom zone exists in CloudKit with retry logic
     * Retries up to maxRetries times with delay between retries
     */
    private func verifyZoneExistsWithRetry(maxRetries: Int, retryDelay: TimeInterval, completion: @escaping (Bool) -> Void) {
        privateDatabase.fetch(withRecordZoneID: customZoneID) { zone, error in
            if zone != nil {
                completion(true)
            } else if let error = error, maxRetries > 0 {
                if let ckError = error as? CKError, ckError.code == .zoneNotFound {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone not found, retrying...", metadata: ["retriesLeft": "\(maxRetries - 1)"], source: self.logSource)
                    DispatchQueue.main.asyncAfter(deadline: .now() + retryDelay) {
                        self.verifyZoneExistsWithRetry(maxRetries: maxRetries - 1, retryDelay: retryDelay, completion: completion)
                    }
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error verifying zone", metadata: ["error": error.localizedDescription], source: self.logSource)
                    completion(false)
                }
            } else {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Zone does not exist after retries", source: self.logSource)
                completion(false)
            }
        }
    }
    
    /**
     * Verifies that the custom zone exists in CloudKit
     * Retries up to maxRetries times with delay between retries
     */
    private func verifyZoneExists(maxRetries: Int, retryDelay: TimeInterval, completion: @escaping (Bool) -> Void) {
        verifyZoneExistsWithRetry(maxRetries: maxRetries, retryDelay: retryDelay, completion: completion)
    }
    
    /**
     * Creates subscription for Notification record changes
     */
    private func createNotificationSubscription(completion: @escaping (Bool, Error?) -> Void) {
        // Check if subscription already exists
        privateDatabase.fetch(withSubscriptionID: notificationSubscriptionID) { subscription, error in
            if subscription != nil {
                completion(true, nil)
                return
            }
            
            // Create new subscription
            let predicate = NSPredicate(value: true) // Subscribe to all Notification records
            let subscription = CKQuerySubscription(
                recordType: RecordType.notification.rawValue,
                predicate: predicate,
                subscriptionID: self.notificationSubscriptionID,
                options: [.firesOnRecordCreation, .firesOnRecordUpdate, .firesOnRecordDeletion]
            )
            
            // Set zone for the subscription
            subscription.zoneID = self.customZoneID
            
            let notificationInfo = CKSubscription.NotificationInfo()
            notificationInfo.shouldSendContentAvailable = true
            notificationInfo.shouldBadge = false
            subscription.notificationInfo = notificationInfo
            
            self.privateDatabase.save(subscription) { savedSubscription, error in
                if let error = error {
                    // Check for duplicate subscription error (code 15)
                    if let ckError = error as? CKError, ckError.code.rawValue == 15 {
                        completion(true, nil)
                    } else {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error creating Notification subscription", metadata: ["error": error.localizedDescription], source: self.logSource)
                        completion(false, error)
                    }
                } else {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification subscription created", source: self.logSource)
                    completion(true, nil)
                }
            }
        }
    }
    
    /**
     * Creates subscription for Bucket record changes
     */
    private func createBucketSubscription(completion: @escaping (Bool, Error?) -> Void) {
        // Check if subscription already exists
        privateDatabase.fetch(withSubscriptionID: bucketSubscriptionID) { subscription, error in
            if subscription != nil {
                completion(true, nil)
                return
            }
            
            // Create new subscription
            let predicate = NSPredicate(value: true) // Subscribe to all Bucket records
            let subscription = CKQuerySubscription(
                recordType: RecordType.bucket.rawValue,
                predicate: predicate,
                subscriptionID: self.bucketSubscriptionID,
                options: [.firesOnRecordCreation, .firesOnRecordUpdate, .firesOnRecordDeletion]
            )
            
            // Set zone for the subscription
            subscription.zoneID = self.customZoneID
            
            let notificationInfo = CKSubscription.NotificationInfo()
            notificationInfo.shouldSendContentAvailable = true
            notificationInfo.shouldBadge = false
            subscription.notificationInfo = notificationInfo
            
            self.privateDatabase.save(subscription) { savedSubscription, error in
                if let error = error {
                    // Check for duplicate subscription error (code 15)
                    if let ckError = error as? CKError, ckError.code.rawValue == 15 {
                        completion(true, nil)
                    } else {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error creating Bucket subscription", metadata: ["error": error.localizedDescription], source: self.logSource)
                        completion(false, error)
                    }
                } else {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket subscription created", source: self.logSource)
                    completion(true, nil)
                }
            }
        }
    }
    
    #if os(iOS)
    /**
     * Creates subscription for WatchLog record changes (iOS only)
     * When Watch writes logs to CloudKit, iOS receives a notification and fetches them
     */
    private func createWatchLogSubscription(completion: @escaping (Bool, Error?) -> Void) {
        // Check if subscription already exists
        privateDatabase.fetch(withSubscriptionID: watchLogSubscriptionID) { subscription, error in
            if subscription != nil {
                completion(true, nil)
                return
            }
            
            // Create new subscription
            let predicate = NSPredicate(value: true) // Subscribe to all WatchLog records
            let subscription = CKQuerySubscription(
                recordType: RecordType.watchLog.rawValue,
                predicate: predicate,
                subscriptionID: self.watchLogSubscriptionID,
                options: [.firesOnRecordCreation] // Only fire on creation (we fetch and delete immediately)
            )
            
            // Set zone for the subscription
            subscription.zoneID = self.customZoneID
            
            let notificationInfo = CKSubscription.NotificationInfo()
            notificationInfo.shouldSendContentAvailable = true
            notificationInfo.shouldBadge = false
            subscription.notificationInfo = notificationInfo
            
            self.privateDatabase.save(subscription) { savedSubscription, error in
                if let error = error {
                    // Check for duplicate subscription error (code 15)
                    if let ckError = error as? CKError, ckError.code.rawValue == 15 {
                        completion(true, nil)
                    } else {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error creating WatchLog subscription", metadata: ["error": error.localizedDescription], source: self.logSource)
                        completion(false, error)
                    }
                } else {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "WatchLog subscription created", source: self.logSource)
                    completion(true, nil)
                }
            }
        }
    }
    #endif
    
    // MARK: - Remote Notification Handlers (Platform-specific wrappers)
    
    #if os(iOS)
    public func handleRemoteNotification(userInfo: [AnyHashable: Any], completion: @escaping (UIBackgroundFetchResult) -> Void) {
        handleRemoteNotificationInternal(userInfo: userInfo) { result in
            completion(result)
        }
    }
    #endif
    
    #if os(watchOS)
    public func handleRemoteNotification(userInfo: [AnyHashable: Any], completion: @escaping (WKBackgroundFetchResult) -> Void) {
        handleRemoteNotificationInternal(userInfo: userInfo) { result in
            completion(result)
        }
    }
    #endif
    
    // MARK: - Internal Notification Handling (Platform-agnostic)
    
    #if os(iOS)
    private func handleRemoteNotificationInternal(userInfo: [AnyHashable: Any], completion: @escaping (UIBackgroundFetchResult) -> Void) {
        processNotification(userInfo: userInfo) { result in
            let fetchResult: UIBackgroundFetchResult = result ? .newData : .failed
            completion(fetchResult)
        }
    }
    #endif
    
    #if os(watchOS)
    private func handleRemoteNotificationInternal(userInfo: [AnyHashable: Any], completion: @escaping (WKBackgroundFetchResult) -> Void) {
        processNotification(userInfo: userInfo) { result in
            let fetchResult: WKBackgroundFetchResult = result ? .newData : .failed
            completion(fetchResult)
        }
    }
    #endif
    
    private func processNotification(userInfo: [AnyHashable: Any], completion: @escaping (Bool) -> Void) {
        // Reduced verbosity - only log errors
        
        let notification = CKNotification(fromRemoteNotificationDictionary: userInfo as! [String: NSObject])
        
        guard let notification = notification else {
            LoggingSystem.shared.log(
                level: "ERROR",
                tag: "CloudKit",
                message: "Invalid CloudKit notification - cannot parse",
                source: self.logSource
            )
            completion(false)
            return
        }
        
        let subscriptionID = notification.subscriptionID ?? "unknown"
        let notificationType = notification.notificationType
        
        // Reduced verbosity - only log errors
        
        // Determine which subscription triggered this
        var subscriptionName = "unknown"
        if subscriptionID == self.notificationSubscriptionID {
            subscriptionName = "Notification"
        } else if subscriptionID == self.bucketSubscriptionID {
            subscriptionName = "Bucket"
        }
        #if os(iOS)
        if subscriptionID == self.watchLogSubscriptionID {
            subscriptionName = "WatchLog"
        }
        #endif
        
        // Reduced verbosity - only log errors
        
        switch notificationType {
        case .query:
            if let queryNotification = notification as? CKQueryNotification {
                processQueryNotification(queryNotification, subscriptionName: subscriptionName)
                completion(true)
            } else {
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "CloudKit",
                    message: "Invalid query notification - type mismatch",
                    source: self.logSource
                )
                completion(false)
            }
        case .database:
            if let databaseNotification = notification as? CKDatabaseNotification {
                processDatabaseNotification(databaseNotification)
                completion(true)
            } else {
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "CloudKit",
                    message: "Invalid database notification - type mismatch",
                    source: self.logSource
                )
                completion(false)
            }
        default:
            LoggingSystem.shared.log(
                level: "WARN",
                tag: "CloudKit",
                message: "Unhandled CloudKit notification type",
                metadata: ["notificationType": "\(notificationType.rawValue)"],
                source: self.logSource
            )
            completion(false)
        }
    }
    
    private func processQueryNotification(_ notification: CKQueryNotification, subscriptionName: String) {
        guard let recordID = notification.recordID else {
            LoggingSystem.shared.log(
                level: "ERROR",
                tag: "CloudKit",
                message: "Query notification missing recordID",
                metadata: ["subscriptionName": subscriptionName],
                source: self.logSource
            )
            return
        }
        
        // Extract record type from subscription ID or record name
        // Record name format: "Notification-{id}", "Bucket-{id}", or "WatchLog-{id}"
        let recordName = recordID.recordName
        let recordType: String
        
        if recordName.hasPrefix("Notification-") {
            recordType = RecordType.notification.rawValue
        } else if recordName.hasPrefix("Bucket-") {
            recordType = RecordType.bucket.rawValue
        } else if recordName.hasPrefix("WatchLog-") {
            recordType = RecordType.watchLog.rawValue
        } else {
            // Fallback: try to get from subscription ID
            var foundRecordType: String? = nil
            
            if let subscriptionID = notification.subscriptionID {
                if subscriptionID == self.notificationSubscriptionID {
                    foundRecordType = RecordType.notification.rawValue
                } else if subscriptionID == self.bucketSubscriptionID {
                    foundRecordType = RecordType.bucket.rawValue
                }
                #if os(iOS)
                if subscriptionID == self.watchLogSubscriptionID {
                    foundRecordType = RecordType.watchLog.rawValue
                }
                #endif
            }
            
            guard let type = foundRecordType else {
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "CloudKit",
                    message: "Cannot determine record type from notification",
                    metadata: [
                        "recordName": recordName,
                        "subscriptionName": subscriptionName,
                        "subscriptionID": notification.subscriptionID ?? "nil"
                    ],
                    source: self.logSource
                )
                return
            }
            
            recordType = type
        }
        
        // Handle WatchLog notifications specially (iOS only)
        // Watch log fetching disabled - logs are saved locally on watchOS
        #if os(iOS)
        if recordType == RecordType.watchLog.rawValue {
            // Watch log fetching disabled - logs are saved locally on watchOS
            // fetchAndDeleteWatchLogs { logs, error in
            //     ...
            // }
            return
        }
        #endif
        
        let reason = notification.queryNotificationReason
        let reasonString: String
        switch reason {
        case .recordCreated:
            reasonString = "recordCreated"
        case .recordUpdated:
            reasonString = "recordUpdated"
        case .recordDeleted:
            reasonString = "recordDeleted"
        @unknown default:
            reasonString = "unknown(\(reason.rawValue))"
        }
        
        // Extract notification ID or bucket ID from record name
        var entityId: String?
        if recordName.hasPrefix("Notification-") {
            entityId = String(recordName.dropFirst("Notification-".count))
        } else if recordName.hasPrefix("Bucket-") {
            entityId = String(recordName.dropFirst("Bucket-".count))
        }
        
        // Reduced verbosity - only log errors
        
        // Handle differently based on platform:
        // - Main iOS app: emit event to React Native
        // - iOS extensions and Watch: update SQLite directly
        #if os(iOS)
        // Always fetch and update record, regardless of whether CloudKitSyncBridge exists
        // Main app will emit React Native events after SQLite update
        switch reason {
        case .recordCreated, .recordUpdated:
            fetchAndUpdateRecord(recordID: recordID, recordType: recordType, reason: reason)
        case .recordDeleted:
            handleRecordDeleted(recordID: recordID, recordType: recordType)
        @unknown default:
            LoggingSystem.shared.log(
                level: "WARN",
                tag: "CloudKit",
                message: "Unknown query notification reason",
                metadata: ["reason": "\(reason.rawValue)"],
                source: self.logSource
            )
        }
        #else
        // On Watch, update directly (no React Native)
        switch reason {
        case .recordCreated, .recordUpdated:
            fetchAndUpdateRecord(recordID: recordID, recordType: recordType, reason: reason)
        case .recordDeleted:
            handleRecordDeleted(recordID: recordID, recordType: recordType)
        @unknown default:
            LoggingSystem.shared.log(
                level: "WARN",
                tag: "CloudKit",
                message: "Unknown query notification reason",
                metadata: ["reason": "\(reason.rawValue)"],
                source: self.logSource
            )
        }
        #endif
    }
    
    private func processDatabaseNotification(_ notification: CKDatabaseNotification) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Database notification received", source: self.logSource)
    }
    
    private func fetchAndUpdateRecord(recordID: CKRecord.ID, recordType: String, reason: CKQueryNotification.Reason = .recordUpdated, retryCount: Int = 0) {
        // Always add a delay to allow CloudKit to propagate changes
        // CloudKit notifications can arrive before the record is fully updated
        // Delay increases with retry count: 0.5s, 1.0s, 2.0s
        let delay: TimeInterval
        switch retryCount {
        case 0:
            delay = 0.5  // Initial delay to allow CloudKit propagation
        case 1:
            delay = 1.0  // First retry delay
        case 2:
            delay = 2.0  // Second retry delay
        default:
            delay = 0.0  // No more retries
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
            self.privateDatabase.fetch(withRecordID: recordID) { record, error in
                if let error = error {
                    if let ckError = error as? CKError, ckError.code == .unknownItem {
                        self.handleRecordDeleted(recordID: recordID, recordType: recordType)
                    }
                    return
                }
                
                guard let record = record else {
                    return
                }
                
                // For notifications, always proceed with update
                // CloudKit may not include nil fields in allKeys(), so we check the value directly
                if recordType == RecordType.notification.rawValue {
                    // Check readAt value directly (it might be nil but still present in the record)
                    let readAtValue = record["readAt"] as? Date
                    let hasReadAtInKeys = record.allKeys().contains("readAt")
                    
                    // If readAt is not in keys AND this is a recordUpdated notification,
                    // it might be a propagation issue - retry once more with longer delay
                    if !hasReadAtInKeys && reason == .recordUpdated && retryCount < 1 {
                        self.fetchAndUpdateRecord(recordID: recordID, recordType: recordType, reason: reason, retryCount: retryCount + 1)
                        return
                    }
                    
                    // Proceed with update - CloudKit might not include nil fields in allKeys()
                    // but we trust the value we get from record["readAt"]
                    // Pass reason to help determine if readAt was set to nil
                    self.updateLocalNotificationFromCloudKit(record: record, isRecordUpdated: reason == .recordUpdated)
                } else if recordType == RecordType.bucket.rawValue {
                    self.updateLocalBucketFromCloudKit(record: record)
                }
            }
        }
    }
    
    /**
     * Perform incremental sync from CloudKit using change tokens
     * Fetches only records that have changed since the last sync
     * 
     * @param fullSync If true, performs full sync ignoring change token
     * @param completion Callback with count of updated records
     */
    public func syncFromCloudKitIncremental(fullSync: Bool = false, completion: @escaping (Int, Error?) -> Void) {
        // Prevent concurrent syncs
        syncLock.lock()
        guard !isIncrementalSyncInProgress else {
            syncLock.unlock()
            LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Sync already in progress, skipping", source: self.logSource)
            completion(0, nil)
            return
        }
        isIncrementalSyncInProgress = true
        syncLock.unlock()
        
        if fullSync {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Starting full sync from CloudKit", source: self.logSource)
        }
        
        // Use custom zone that supports incremental sync
        let zoneID = customZoneID
        
        var changeToken: CKServerChangeToken?
        
        if !fullSync {
            // Load last change token from UserDefaults
            if let tokenData = UserDefaults.standard.data(forKey: lastChangeTokenKey),
               let token = try? NSKeyedUnarchiver.unarchivedObject(ofClass: CKServerChangeToken.self, from: tokenData) {
                changeToken = token
            }
        }
        
        let operation = CKFetchRecordZoneChangesOperation()
        operation.recordZoneIDs = [zoneID]
        
        var configurations: [CKRecordZone.ID: CKFetchRecordZoneChangesOperation.ZoneConfiguration] = [:]
        if let token = changeToken {
            configurations[zoneID] = CKFetchRecordZoneChangesOperation.ZoneConfiguration(
                previousServerChangeToken: token,
                resultsLimit: nil,
                desiredKeys: nil
            )
        } else {
            // No token - fetch all records
            configurations[zoneID] = CKFetchRecordZoneChangesOperation.ZoneConfiguration(
                previousServerChangeToken: nil,
                resultsLimit: nil,
                desiredKeys: nil
            )
        }
        operation.configurationsByRecordZoneID = configurations
        
        var updatedCount = 0
        var deletedCount = 0
        var newChangeToken: CKServerChangeToken?
        
        operation.recordChangedBlock = { record in
            updatedCount += 1
            // Update local database based on record type (without posting notifications during sync)
            if record.recordType == RecordType.notification.rawValue {
                self.updateLocalNotificationFromCloudKit(record: record, isRecordUpdated: true, suppressNotification: true)
            } else if record.recordType == RecordType.bucket.rawValue {
                self.updateLocalBucketFromCloudKit(record: record, suppressNotification: true)
            }
        }
        
        operation.recordWithIDWasDeletedBlock = { recordID, recordType in
            deletedCount += 1
            self.handleRecordDeleted(recordID: recordID, recordType: recordType, suppressNotification: true)
        }
        
        operation.recordZoneFetchCompletionBlock = { zoneID, changeToken, data, moreComing, error in
            if let error = error {
                let errorDescription = error.localizedDescription
                
                // Check if zone was purged
                if let ckError = error as? CKError,
                   (ckError.localizedDescription.contains("Zone was purged") ||
                    ckError.errorUserInfo["ServerErrorDescription"] as? String == "Zone was purged by user") {
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Zone was purged, resetting flags and re-initializing", source: self.logSource)
                    
                    // Reset all flags
                    UserDefaults.standard.removeObject(forKey: self.zoneInitializedKey)
                    UserDefaults.standard.removeObject(forKey: self.schemaInitializedKey)
                    UserDefaults.standard.removeObject(forKey: self.lastSyncTimestampKey)
                    UserDefaults.standard.removeObject(forKey: self.lastChangeTokenKey)
                    
                    // Re-initialize zone and schema
                    self.initializeSchemaIfNeeded { success, initError in
                        self.syncLock.lock()
                        self.isIncrementalSyncInProgress = false
                        self.syncLock.unlock()
                        if success {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone re-initialized after purge", source: self.logSource)
                            completion(0, nil) // Return success with 0 updates since zone was just recreated
                        } else {
                            completion(0, initError)
                        }
                    }
                    return
                }
                
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching zone changes", metadata: ["error": errorDescription], source: self.logSource)
                self.syncLock.lock()
                self.isIncrementalSyncInProgress = false
                self.syncLock.unlock()
                completion(0, error)
                return
            }
            
            // Save change token for next sync
            if let token = changeToken {
                newChangeToken = token
            }
        }
        
        operation.fetchRecordZoneChangesCompletionBlock = { error in
            defer {
                // Always reset sync flag
                self.syncLock.lock()
                self.isIncrementalSyncInProgress = false
                self.syncLock.unlock()
            }
            
            if let error = error {
                let errorDescription = error.localizedDescription
                
                // Check if zone was purged
                if let ckError = error as? CKError,
                   (ckError.localizedDescription.contains("Zone was purged") ||
                    ckError.errorUserInfo["ServerErrorDescription"] as? String == "Zone was purged by user") {
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Zone was purged during sync, resetting flags and re-initializing", source: self.logSource)
                    
                    // Reset all flags
                    UserDefaults.standard.removeObject(forKey: self.zoneInitializedKey)
                    UserDefaults.standard.removeObject(forKey: self.schemaInitializedKey)
                    UserDefaults.standard.removeObject(forKey: self.lastSyncTimestampKey)
                    UserDefaults.standard.removeObject(forKey: self.lastChangeTokenKey)
                    
                    // Re-initialize zone and schema
                    self.initializeSchemaIfNeeded { success, initError in
                        if success {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Zone re-initialized after purge", source: self.logSource)
                            completion(0, nil) // Return success with 0 updates since zone was just recreated
                        } else {
                            completion(0, initError)
                        }
                    }
                    return
                }
                
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error completing incremental sync", metadata: ["error": errorDescription], source: self.logSource)
                completion(0, error)
                return
            }
            
            // Save new change token
            if let token = newChangeToken {
                if let tokenData = try? NSKeyedArchiver.archivedData(withRootObject: token, requiringSecureCoding: true) {
                    UserDefaults.standard.set(tokenData, forKey: self.lastChangeTokenKey)
                }
            }
            
            if updatedCount > 0 || deletedCount > 0 {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Incremental sync completed", metadata: ["updated": "\(updatedCount)", "deleted": "\(deletedCount)", "fullSync": "\(fullSync)"], source: self.logSource)
                
                // Post single notification at the end of sync (only on Watch)
                #if os(watchOS)
                DispatchQueue.main.async {
                    NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil)
                }
                #endif
            }
            completion(updatedCount, nil)
        }
        
        privateDatabase.add(operation)
    }
    /**
     * Check CloudKit for updates and sync to SQLite
     * Called periodically when app is in foreground (CloudKit doesn't send remote notifications when app is active)
     * @deprecated Use syncFromCloudKitIncremental instead
     */
    public func checkCloudKitForUpdates(completion: ((Int) -> Void)? = nil) {
        Swift.print("☁️ [CloudKitManager] 🔍 Checking CloudKit for updates...")
        
        fetchAllNotificationsFromCloudKit { notifications, error in
            if let error = error {
                Swift.print("☁️ [CloudKitManager] ❌ Error checking CloudKit: \(error.localizedDescription)")
                completion?(0)
                return
            }
            
            Swift.print("☁️ [CloudKitManager] ✅ Found \(notifications.count) notifications in CloudKit")
            
            var updateCount = 0
            let group = DispatchGroup()
            
            // For each notification, fetch the full record and update SQLite if needed
            for notificationDict in notifications {
                guard let notificationId = notificationDict["id"] as? String else {
                    continue
                }
                
                group.enter()
                
                let recordID = self.notificationRecordID(notificationId)
                self.privateDatabase.fetch(withRecordID: recordID) { record, fetchError in
                    defer { group.leave() }
                    
                    if let fetchError = fetchError {
                        if let ckError = fetchError as? CKError, ckError.code == .unknownItem {
                            // Record was deleted, handle deletion
                            self.handleRecordDeleted(recordID: recordID, recordType: RecordType.notification.rawValue)
                        }
                        return
                    }
                    
                    guard let record = record else {
                        return
                    }
                    
                    // Update SQLite if needed (this method already checks if update is necessary)
                    self.updateLocalNotificationFromCloudKit(record: record, isRecordUpdated: true)
                    updateCount += 1
                }
            }
            
            group.notify(queue: .main) {
                Swift.print("☁️ [CloudKitManager] ✅ Update check completed - processed \(updateCount) notifications")
                completion?(updateCount)
            }
        }
    }
    
    private func updateLocalNotificationFromCloudKit(record: CKRecord, isRecordUpdated: Bool = true, suppressNotification: Bool = false) {
        guard let notificationId = record["id"] as? String else {
            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Missing notification ID in CloudKit record", source: self.logSource)
            return
        }
        
        #if os(watchOS)
        updateWatchDataStoreFromCloudKitRecord(record: record, recordType: RecordType.notification.rawValue, suppressNotification: suppressNotification)
        #else
        // Update SQLite database based on CloudKit record
        // Note: CloudKit may not include nil fields in allKeys(), but we can still access them
        let cloudKitReadAt = record["readAt"] as? Date
        let isReadInCloudKit = cloudKitReadAt != nil
        let hasReadAtInKeys = record.allKeys().contains("readAt")
        
        // Check current state in SQLite
        if let existingNotification = DatabaseAccess.fetchNotification(byId: notificationId, source: self.logSource) {
            let existingReadAt = existingNotification["read_at"] as? Int64
            let isReadInSQLite = existingReadAt != nil
            
            // Special handling for recordUpdated notifications:
            // If readAt is not in keys but we received a recordUpdated notification,
            // CloudKit might have set it to nil (unread). Since CloudKit doesn't always
            // include nil fields in allKeys(), we need to be more aggressive:
            // - If readAt IS in keys, trust CloudKit's value
            // - If readAt is NOT in keys and this is recordUpdated, assume CloudKit set it to nil (unread)
            //   and always update SQLite to unread (even if it's already unread, to handle timing issues)
            var needsUpdate = false
            
            if hasReadAtInKeys {
                // readAt is explicitly present in CloudKit - trust its value
                needsUpdate = isReadInCloudKit != isReadInSQLite
                if needsUpdate {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "readAt mismatch detected (hasReadAtInKeys=true)", metadata: ["notificationId": notificationId, "cloudKitReadAt": cloudKitReadAt != nil ? "set" : "nil", "sqliteReadAt": isReadInSQLite ? "set" : "nil"], source: self.logSource)
                }
            } else if isRecordUpdated {
                // readAt is NOT in keys but this is a recordUpdated notification
                // This means CloudKit set readAt to nil (unread)
                // Only update if SQLite is not already in the correct state (unread)
                // This prevents unnecessary updates when SQLite is already unread
                needsUpdate = isReadInSQLite  // Only update if SQLite thinks it's read but CloudKit says unread
                if needsUpdate {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "readAt mismatch detected (hasReadAtInKeys=false, recordUpdated)", metadata: ["notificationId": notificationId, "cloudKitReadAt": "nil (not in keys)", "sqliteReadAt": isReadInSQLite ? "set" : "nil"], source: self.logSource)
                }
            } else {
                // readAt is NOT in keys and this is a recordCreated notification
                // Trust CloudKit's value (nil = unread)
                needsUpdate = isReadInCloudKit != isReadInSQLite
                if needsUpdate {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "readAt mismatch detected (hasReadAtInKeys=false, recordCreated)", metadata: ["notificationId": notificationId, "cloudKitReadAt": "nil (not in keys)", "sqliteReadAt": isReadInSQLite ? "set" : "nil"], source: self.logSource)
                }
            }
            
            if needsUpdate {
                if isReadInCloudKit {
                    DatabaseAccess.markNotificationAsRead(notificationId: notificationId, source: self.logSource) { success in
                        if success {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification marked as read in SQLite from CloudKit", metadata: ["notificationId": notificationId, "wasReadInSQLite": "\(isReadInSQLite)", "hasReadAtInKeys": "\(hasReadAtInKeys)", "isRecordUpdated": "\(isRecordUpdated)"], source: self.logSource)
                            // Emit React Native event if CloudKitSyncBridge is available (main app only)
                            if !suppressNotification, let bridgeClass = NSClassFromString("CloudKitSyncBridge") as? NSObject.Type {
                                let selector = NSSelectorFromString("notifyNotificationUpdated:")
                                if bridgeClass.responds(to: selector) {
                                    _ = bridgeClass.perform(selector, with: notificationId)
                                }
                            }
                        } else {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to mark notification as read in SQLite", metadata: ["notificationId": notificationId], source: self.logSource)
                        }
                    }
                } else {
                    DatabaseAccess.markNotificationAsUnread(notificationId: notificationId, source: self.logSource) { success in
                        if success {
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification marked as unread in SQLite from CloudKit", metadata: ["notificationId": notificationId, "wasReadInSQLite": "\(isReadInSQLite)", "hasReadAtInKeys": "\(hasReadAtInKeys)", "isRecordUpdated": "\(isRecordUpdated)"], source: self.logSource)
                            // Emit React Native event if CloudKitSyncBridge is available (main app only)
                            if !suppressNotification, let bridgeClass = NSClassFromString("CloudKitSyncBridge") as? NSObject.Type {
                                let selector = NSSelectorFromString("notifyNotificationUpdated:")
                                if bridgeClass.responds(to: selector) {
                                    _ = bridgeClass.perform(selector, with: notificationId)
                                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification updated in SQLite and React Native event emitted", metadata: ["notificationId": notificationId], source: self.logSource)
                                } else {
                                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "CloudKitSyncBridge found but notifyNotificationUpdated: not available", metadata: ["notificationId": notificationId], source: self.logSource)
                                }
                            } else if !suppressNotification {
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification updated in SQLite (extension - no React Native)", metadata: ["notificationId": notificationId], source: self.logSource)
                            }
                        } else {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to mark notification as unread in SQLite", metadata: ["notificationId": notificationId], source: self.logSource)
                        }
                    }
                }
            }
        } else {
            LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Notification not found in SQLite when updating from CloudKit", metadata: ["notificationId": notificationId], source: self.logSource)
        }
        #endif
    }
    
    private func updateLocalBucketFromCloudKit(record: CKRecord, suppressNotification: Bool = false) {
        guard let bucketId = record["id"] as? String else {
            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Missing bucket ID in CloudKit record", source: self.logSource)
            return
        }
        
        #if os(watchOS)
        updateWatchDataStoreFromCloudKitRecord(record: record, recordType: RecordType.bucket.rawValue, suppressNotification: suppressNotification)
        #else
        // TODO: Update SQLite bucket when needed
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket updated from CloudKit", metadata: ["bucketId": bucketId], source: self.logSource)
        #endif
    }
    
    #if os(watchOS)
    private func updateWatchDataStoreFromCloudKitRecord(record: CKRecord, recordType: String, suppressNotification: Bool = false) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Updating WatchDataStore from CloudKit record", metadata: ["recordType": recordType], source: self.logSource)
        
        // Extract data from record on background thread (safe)
        if recordType == RecordType.notification.rawValue {
            guard let notificationId = record["id"] as? String,
                  let bucketId = record["bucketId"] as? String,
                  let title = record["title"] as? String,
                  let body = record["body"] as? String,
                  let createdAt = record["createdAt"] as? Date else {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Missing required notification fields", source: self.logSource)
                return
            }
            
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let createdAtString = dateFormatter.string(from: createdAt)
            
            let subtitle = record["subtitle"] as? String
            let readAt = record["readAt"] as? Date
            let isRead = readAt != nil
            
            // Parse attachments
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
            
            // Parse actions
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
            
            // Update WatchDataStore on main thread (required for @ObservedObject)
            DispatchQueue.main.async {
                let dataStore = WatchDataStore.shared
                var cache = dataStore.loadCache()
                
                // Find existing notification or create new
                if let index = cache.notifications.firstIndex(where: { $0.id == notificationId }) {
                    // Update existing
                    let wasUnread = !cache.notifications[index].isRead
                    cache.notifications[index] = WatchDataStore.CachedNotification(
                        id: notificationId,
                        title: title,
                        body: body,
                        subtitle: subtitle,
                        createdAt: createdAtString,
                        isRead: isRead,
                        bucketId: bucketId,
                        bucketName: nil,
                        bucketColor: nil,
                        bucketIconUrl: nil,
                        attachments: attachments,
                        actions: actions
                    )
                    
                    // Update unread count
                    if wasUnread && isRead {
                        cache.unreadCount = max(0, cache.unreadCount - 1)
                    } else if !wasUnread && !isRead {
                        cache.unreadCount += 1
                    }
                } else {
                    // Add new notification
                    cache.notifications.append(WatchDataStore.CachedNotification(
                        id: notificationId,
                        title: title,
                        body: body,
                        subtitle: subtitle,
                        createdAt: createdAtString,
                        isRead: isRead,
                        bucketId: bucketId,
                        bucketName: nil,
                        bucketColor: nil,
                        bucketIconUrl: nil,
                        attachments: attachments,
                        actions: actions
                    ))
                    
                    if !isRead {
                        cache.unreadCount += 1
                    }
                }
                
                cache.lastUpdate = Date()
                dataStore.saveCache(cache)
                
                // Notify WatchConnectivityManager to reload (unless suppressed during batch sync)
                if !suppressNotification {
                    NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil)
                }
            }
            
        } else if recordType == RecordType.bucket.rawValue {
            guard let bucketId = record["id"] as? String,
                  let name = record["name"] as? String else {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Missing required bucket fields", source: self.logSource)
                return
            }
            
            let iconUrl = record["iconUrl"] as? String
            let color = record["color"] as? String
            
            // Update WatchDataStore on main thread (required for @ObservedObject)
            DispatchQueue.main.async {
                let dataStore = WatchDataStore.shared
                var cache = dataStore.loadCache()
                
                // Find existing bucket or create new
                if let index = cache.buckets.firstIndex(where: { $0.id == bucketId }) {
                    // Update existing (preserve unreadCount)
                    cache.buckets[index] = WatchDataStore.CachedBucket(
                        id: bucketId,
                        name: name,
                        unreadCount: cache.buckets[index].unreadCount,
                        color: color,
                        iconUrl: iconUrl
                    )
                } else {
                    // Add new bucket
                    cache.buckets.append(WatchDataStore.CachedBucket(
                        id: bucketId,
                        name: name,
                        unreadCount: 0,
                        color: color,
                        iconUrl: iconUrl
                    ))
                }
                
                cache.lastUpdate = Date()
                dataStore.saveCache(cache)
                
                // Notify WatchConnectivityManager to reload (unless suppressed during batch sync)
                if !suppressNotification {
                    NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil)
                }
            }
        }
    }
    #endif
    
    private func handleRecordDeleted(recordID: CKRecord.ID, recordType: String, suppressNotification: Bool = false) {
        // Ignore WatchLog deletions - these are managed by iOS and don't need to be logged
        // WatchLog deletions are handled automatically when iOS fetches and deletes logs from CloudKit
        if recordType == RecordType.watchLog.rawValue {
            return
        }
        
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Handling record deletion", metadata: ["recordID": recordID.recordName, "recordType": recordType], source: self.logSource)
        
        let recordName = recordID.recordName
        let idComponents = recordName.components(separatedBy: "-")
        guard idComponents.count >= 2 else {
            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Invalid record name format", metadata: ["recordName": recordName], source: self.logSource)
            return
        }
        
        let recordId = idComponents.dropFirst().joined(separator: "-")
        
        #if os(watchOS)
        // Update WatchDataStore
        let dataStore = WatchDataStore.shared
        var cache = dataStore.loadCache()
        
        if recordType == RecordType.notification.rawValue {
            if let index = cache.notifications.firstIndex(where: { $0.id == recordId }) {
                let wasUnread = !cache.notifications[index].isRead
                cache.notifications.remove(at: index)
                if wasUnread {
                    cache.unreadCount = max(0, cache.unreadCount - 1)
                }
                cache.lastUpdate = Date()
                dataStore.saveCache(cache)
                
                // Notify WatchConnectivityManager to reload (unless suppressed during batch sync)
                if !suppressNotification {
                    DispatchQueue.main.async {
                        NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil)
                    }
                }
                
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification deleted from WatchDataStore", metadata: ["notificationId": recordId], source: self.logSource)
            }
        } else if recordType == RecordType.bucket.rawValue {
            if let index = cache.buckets.firstIndex(where: { $0.id == recordId }) {
                cache.buckets.remove(at: index)
                cache.lastUpdate = Date()
                dataStore.saveCache(cache)
                
                // Notify WatchConnectivityManager to reload (unless suppressed during batch sync)
                if !suppressNotification {
                    DispatchQueue.main.async {
                        NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil)
                    }
                }
                
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket deleted from WatchDataStore", metadata: ["bucketId": recordId], source: self.logSource)
            }
        }
        #else
        // Delete from SQLite database
        if recordType == RecordType.notification.rawValue {
            DatabaseAccess.deleteNotification(notificationId: recordId, source: self.logSource) { success in
                if success {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification deleted from SQLite from CloudKit", metadata: ["notificationId": recordId], source: self.logSource)
                    // Emit React Native event if CloudKitSyncBridge is available (main app only)
                    if !suppressNotification, let bridgeClass = NSClassFromString("CloudKitSyncBridge") as? NSObject.Type {
                        let selector = NSSelectorFromString("notifyNotificationDeleted:")
                        if bridgeClass.responds(to: selector) {
                            _ = bridgeClass.perform(selector, with: recordId)
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification deleted from SQLite and React Native event emitted", metadata: ["notificationId": recordId], source: self.logSource)
                        }
                    }
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to delete notification from SQLite", metadata: ["notificationId": recordId], source: self.logSource)
                }
            }
        } else if recordType == RecordType.bucket.rawValue {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket deletion logged (bucket updates not yet implemented)", metadata: ["bucketId": recordId], source: self.logSource)
        }
        #endif
    }
    
    // MARK: - Point Operations (Shared iOS & Watch)
    
    /**
     * Save a single notification to CloudKit (create or update)
     * Can be called from iOS or Watch
     */
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
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Saving notification to CloudKit", metadata: ["notificationId": notificationId], source: self.logSource)
        
        let recordID = notificationRecordID(notificationId)
        let record = CKRecord(recordType: RecordType.notification.rawValue, recordID: recordID)
        
        // Set required fields
        record["id"] = notificationId
        record["bucketId"] = bucketId
        record["title"] = title
        record["body"] = body
        record["subtitle"] = subtitle
        record["createdAt"] = createdAt
        record["readAt"] = readAt
        
        // Convert attachments to JSON string
        if let attachmentsData = try? JSONSerialization.data(withJSONObject: attachments),
           let attachmentsString = String(data: attachmentsData, encoding: .utf8) {
            record["attachments"] = attachmentsString
        } else {
            record["attachments"] = "[]"
        }
        
        // Convert actions to JSON string
        if let actionsData = try? JSONSerialization.data(withJSONObject: actions),
           let actionsString = String(data: actionsData, encoding: .utf8) {
            record["actions"] = actionsString
        } else {
            record["actions"] = "[]"
        }
        
        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error saving notification to CloudKit", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, error)
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification saved to CloudKit successfully", source: self.logSource)
                completion(true, nil)
            }
        }
    }
    
    /**
     * Save a single bucket to CloudKit (create or update)
     * Can be called from iOS or Watch
     */
    public func saveBucketToCloudKit(
        bucketId: String,
        name: String,
        iconUrl: String?,
        color: String?,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Saving bucket to CloudKit", metadata: ["bucketId": bucketId], source: self.logSource)
        
        let recordID = bucketRecordID(bucketId)
        let record = CKRecord(recordType: RecordType.bucket.rawValue, recordID: recordID)
        
        record["id"] = bucketId
        record["name"] = name
        record["iconUrl"] = iconUrl
        record["color"] = color
        
        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error saving bucket to CloudKit", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, error)
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket saved to CloudKit successfully", source: self.logSource)
                completion(true, nil)
            }
        }
    }
    
    /**
     * Update notification read status in CloudKit
     * Can be called from iOS or Watch
     * readAt: nil means unread, non-nil means read
     */
    public func updateNotificationReadStatusInCloudKit(
        notificationId: String,
        readAt: Date?,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Updating notification read status", metadata: ["notificationId": notificationId, "readAt": readAt != nil ? "set" : "nil"], source: self.logSource)
        
        let recordID = notificationRecordID(notificationId)
        
        privateDatabase.fetch(withRecordID: recordID) { record, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching notification for update", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, error)
                return
            }
            
            guard let record = record else {
                let notFoundError = NSError(domain: "CloudKitManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "Notification not found"])
                completion(false, notFoundError)
                return
            }
            
            // Set readAt: nil means unread, non-nil means read
            record["readAt"] = readAt
            
            self.privateDatabase.save(record) { savedRecord, error in
                if let error = error {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error updating notification read status", metadata: ["notificationId": notificationId, "error": error.localizedDescription], source: self.logSource)
                    completion(false, error)
                } else {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification read status updated successfully", metadata: ["notificationId": notificationId], source: self.logSource)
                    completion(true, nil)
                }
            }
        }
    }
    
    /**
     * Update multiple notifications read status in CloudKit (batch)
     * Can be called from iOS or Watch
     * Uses batch operations for efficiency
     * readAt: nil means unread, non-nil means read
     */
    public func updateNotificationsReadStatusInCloudKit(
        notificationIds: [String],
        readAt: Date?,
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        guard !notificationIds.isEmpty else {
            completion(true, 0, nil)
            return
        }
        
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Updating multiple notifications read status (batch)", metadata: ["count": "\(notificationIds.count)", "readAt": readAt != nil ? "set" : "nil"], source: self.logSource)
        
        // Convert notification IDs to record IDs
        let recordIDs = notificationIds.map { notificationRecordID($0) }
        
        // Fetch all records in batch
        let fetchOperation = CKFetchRecordsOperation(recordIDs: recordIDs)
        fetchOperation.database = self.privateDatabase
        
        #if os(watchOS)
        // On watchOS, fetchRecordsResultBlock returns Result<Void, Error> not Result<[CKRecord.ID: CKRecord], Error>
        // Therefore we MUST use perRecordCompletionBlock to collect records
        // Note: On watchOS, perRecordCompletionBlock signature is (CKRecord?, CKRecord.ID?, Error?) -> Void
        var recordsToSave: [CKRecord] = []
        var successCount = 0
        
        fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
            if let record = record {
                record["readAt"] = readAt
                recordsToSave.append(record)
                successCount += 1
            }
            // Ignore individual record failures
        }
        
        fetchOperation.fetchRecordsResultBlock = { [weak self] result in
            guard let self = self else { return }
            
            if case .failure(let error) = result {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to fetch notifications for read status update", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, 0, error)
                return
            }
            
            // Save all records in batch
            if !recordsToSave.isEmpty {
                let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                modifyOperation.database = self.privateDatabase
                modifyOperation.savePolicy = .changedKeys
                
                modifyOperation.modifyRecordsResultBlock = { modifyResult in
                    switch modifyResult {
                    case .success:
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Batch update completed successfully", metadata: ["count": "\(successCount)"], source: self.logSource)
                        completion(true, successCount, nil)
                    case .failure(let error):
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in batch update", metadata: ["error": error.localizedDescription, "count": "\(successCount)"], source: self.logSource)
                        completion(false, successCount, error)
                    }
                }
                
                self.privateDatabase.add(modifyOperation)
            } else {
                completion(true, 0, nil)
            }
        }
        #else
        // On iOS extensions, fetchRecordsResultBlock also returns Result<Void, Error>
        // So we use perRecordCompletionBlock for extensions too
        let isExtension = Bundle.main.bundlePath.contains(".appex")
        
        if isExtension {
            var recordsToSave: [CKRecord] = []
            var successCount = 0
            
            fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                if let record = record {
                    record["readAt"] = readAt
                    recordsToSave.append(record)
                    successCount += 1
                }
                // Ignore individual record failures
            }
            
            fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                guard let self = self else { return }
                
                if case .failure(let error) = result {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to fetch notifications for read status update", metadata: ["error": error.localizedDescription], source: self.logSource)
                    completion(false, 0, error)
                    return
                }
                
                // Save all records in batch
                if !recordsToSave.isEmpty {
                    let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                    modifyOperation.database = self.privateDatabase
                    modifyOperation.savePolicy = .changedKeys
                    
                    modifyOperation.modifyRecordsResultBlock = { modifyResult in
                        switch modifyResult {
                        case .success:
                            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Batch update completed successfully", metadata: ["count": "\(successCount)"], source: self.logSource)
                            completion(true, successCount, nil)
                        case .failure(let error):
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in batch update", metadata: ["error": error.localizedDescription, "count": "\(successCount)"], source: self.logSource)
                            completion(false, successCount, error)
                        }
                    }
                    
                    self.privateDatabase.add(modifyOperation)
                } else {
                    completion(true, 0, nil)
                }
            }
        } else {
            // On iOS main app, check if extension or main app
            if isExtension {
                // On iOS extensions, use perRecordCompletionBlock (same as watchOS)
                var recordsToSave: [CKRecord] = []
                var successCount = 0
                
                fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                    if let record = record {
                        record["readAt"] = readAt
                        recordsToSave.append(record)
                        successCount += 1
                    }
                    // Ignore individual record failures
                }
                
                fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                    guard let self = self else { return }
                    
                    if case .failure(let error) = result {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to fetch notifications for read status update", metadata: ["error": error.localizedDescription], source: self.logSource)
                        completion(false, 0, error)
                        return
                    }
                    
                    // Save all records in batch
                    if !recordsToSave.isEmpty {
                        let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                        modifyOperation.database = self.privateDatabase
                        modifyOperation.savePolicy = .changedKeys
                        
                        modifyOperation.modifyRecordsResultBlock = { modifyResult in
                            switch modifyResult {
                            case .success:
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Batch update completed successfully", metadata: ["count": "\(successCount)"], source: self.logSource)
                                completion(true, successCount, nil)
                            case .failure(let error):
                                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in batch update", metadata: ["error": error.localizedDescription, "count": "\(successCount)"], source: self.logSource)
                                completion(false, successCount, error)
                            }
                        }
                        
                        self.privateDatabase.add(modifyOperation)
                    } else {
                        completion(true, 0, nil)
                    }
                }
            } else {
                // On iOS main app, fetchRecordsResultBlock returns Result<[CKRecord.ID: CKRecord], Error>
                // Use perRecordCompletionBlock to collect records, then handle result
                var recordsToSave: [CKRecord] = []
                var successCount = 0
                
                fetchOperation.perRecordCompletionBlock = { (record: CKRecord?, recordID: CKRecord.ID?, error: Error?) in
                    if let record = record {
                        record["readAt"] = readAt
                        recordsToSave.append(record)
                        successCount += 1
                    }
                    // Ignore individual record failures
                }
                
                fetchOperation.fetchRecordsResultBlock = { [weak self] result in
                    guard let self = self else { return }
                    
                    // Check if result is success or failure
                    if case .failure(let error) = result {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to fetch notifications for read status update", metadata: ["error": error.localizedDescription], source: self.logSource)
                        completion(false, 0, error)
                        return
                    }
                    
                    // On success, save all records in batch
                    if !recordsToSave.isEmpty {
                        let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
                        modifyOperation.database = self.privateDatabase
                        modifyOperation.savePolicy = .changedKeys
                        
                        modifyOperation.modifyRecordsResultBlock = { modifyResult in
                            switch modifyResult {
                            case .success:
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Batch update completed successfully", metadata: ["count": "\(successCount)"], source: self.logSource)
                                completion(true, successCount, nil)
                            case .failure(let error):
                                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in batch update", metadata: ["error": error.localizedDescription, "count": "\(successCount)"], source: self.logSource)
                                completion(false, successCount, error)
                            }
                        }
                        
                        self.privateDatabase.add(modifyOperation)
                    } else {
                        completion(true, 0, nil)
                    }
                }
            }
        }
        #endif
        
        self.privateDatabase.add(fetchOperation)
    }
    
    /**
     * Delete notification from CloudKit
     * Can be called from iOS or Watch
     */
    public func deleteNotificationFromCloudKit(
        notificationId: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Deleting notification from CloudKit", metadata: ["notificationId": notificationId], source: self.logSource)
        
        let recordID = notificationRecordID(notificationId)
        
        privateDatabase.delete(withRecordID: recordID) { recordID, error in
            if let error = error {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Already deleted, consider success
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification already deleted", source: self.logSource)
                    completion(true, nil)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting notification", metadata: ["error": error.localizedDescription], source: self.logSource)
                    completion(false, error)
                }
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification deleted successfully from CloudKit", metadata: ["notificationId": notificationId], source: self.logSource)
                
                // Update SQLite immediately (don't wait for CloudKit notification)
                #if os(iOS)
                DatabaseAccess.deleteNotification(notificationId: notificationId, source: self.logSource) { success in
                    if success {
                        // Emit React Native event if CloudKitSyncBridge is available (main app only)
                        if let bridgeClass = NSClassFromString("CloudKitSyncBridge") as? NSObject.Type {
                            let selector = NSSelectorFromString("notifyNotificationDeleted:")
                            if bridgeClass.responds(to: selector) {
                                _ = bridgeClass.perform(selector, with: notificationId)
                                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Notification deleted from CloudKit, SQLite, and React Native event emitted", metadata: ["notificationId": notificationId], source: self.logSource)
                            }
                        }
                    }
                }
                #endif
                
                completion(true, nil)
            }
        }
    }
    
    /**
     * Delete multiple notifications from CloudKit (batch)
     * Can be called from iOS or Watch
     * Uses batch operations for efficiency
     */
    public func deleteNotificationsFromCloudKit(
        notificationIds: [String],
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        guard !notificationIds.isEmpty else {
            completion(true, 0, nil)
            return
        }
        
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Deleting multiple notifications from CloudKit (batch)", metadata: ["count": "\(notificationIds.count)"], source: self.logSource)
        
        // Convert notification IDs to record IDs
        let recordIDsToDelete = notificationIds.map { notificationRecordID($0) }
        
        // Delete all records in batch
        let deleteOperation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: recordIDsToDelete)
        deleteOperation.database = self.privateDatabase
        
        deleteOperation.modifyRecordsResultBlock = { [weak self] result in
            guard let self = self else { return }
            
            switch result {
            case .success:
                let successCount = notificationIds.count
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Batch delete completed successfully", metadata: ["count": "\(successCount)"], source: self.logSource)
                
                // Update SQLite immediately for all deleted notifications (don't wait for CloudKit notification)
                #if os(iOS)
                let group = DispatchGroup()
                var sqliteSuccessCount = 0
                
                for notificationId in notificationIds {
                    group.enter()
                    DatabaseAccess.deleteNotification(notificationId: notificationId, source: self.logSource) { success in
                        if success {
                            sqliteSuccessCount += 1
                            // Emit React Native event if CloudKitSyncBridge is available (main app only)
                            if let bridgeClass = NSClassFromString("CloudKitSyncBridge") as? NSObject.Type {
                                let selector = NSSelectorFromString("notifyNotificationDeleted:")
                                if bridgeClass.responds(to: selector) {
                                    _ = bridgeClass.perform(selector, with: notificationId)
                                }
                            }
                        }
                        group.leave()
                    }
                }
                
                group.notify(queue: .main) {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Batch delete completed - CloudKit and SQLite updated", metadata: ["cloudKitCount": "\(successCount)", "sqliteCount": "\(sqliteSuccessCount)"], source: self.logSource)
                    completion(true, successCount, nil)
                }
                #else
                completion(true, successCount, nil)
                #endif
                
            case .failure(let error):
                // Handle partial success - check which records were actually deleted
                var successCount = 0
                if let ckError = error as? CKError,
                   let partialErrors = ckError.partialErrorsByItemID {
                    // Count successful deletions (records not in partialErrors)
                    successCount = recordIDsToDelete.count - partialErrors.count
                    
                    // Log partial success
                    LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: "Batch delete completed with partial success", metadata: ["successCount": "\(successCount)", "errorCount": "\(partialErrors.count)", "error": error.localizedDescription], source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error in batch delete", metadata: ["error": error.localizedDescription], source: self.logSource)
                }
                
                completion(false, successCount, error)
            }
        }
        
        self.privateDatabase.add(deleteOperation)
    }
    
    /**
     * Delete bucket from CloudKit
     * Can be called from iOS or Watch
     */
    public func deleteBucketFromCloudKit(
        bucketId: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Deleting bucket from CloudKit", metadata: ["bucketId": bucketId], source: self.logSource)
        
        let recordID = bucketRecordID(bucketId)
        
        privateDatabase.delete(withRecordID: recordID) { recordID, error in
            if let error = error {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    // Already deleted, consider success
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket already deleted", source: self.logSource)
                    completion(true, nil)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting bucket", metadata: ["error": error.localizedDescription], source: self.logSource)
                    completion(false, error)
                }
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Bucket deleted successfully", source: self.logSource)
                completion(true, nil)
            }
        }
    }
    
    // MARK: - Fetch Methods (iOS & Watch)
    
    /**
     * Fetch all notifications from CloudKit
     * Returns array of notification dictionaries
     * Available on both iOS (for verification) and Watch
     */
    public func fetchAllNotificationsFromCloudKit(completion: @escaping ([[String: Any]], Error?) -> Void) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetching all notifications from CloudKit", source: self.logSource)
        
        let predicate = NSPredicate(value: true) // Fetch all notifications
        let query = CKQuery(recordType: RecordType.notification.rawValue, predicate: predicate)
        query.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]
        
        privateDatabase.perform(query, inZoneWith: customZoneID) { records, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching notifications", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion([], error)
                return
            }
            
            guard let records = records else {
                completion([], nil)
                return
            }
            
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            
            var notifications: [[String: Any]] = []
            var skippedCount = 0
            var skippedReasons: [String: Int] = [:]
            Swift.print("☁️ [CloudKitManager] 📊 Processing \(records.count) records from CloudKit")
            
            for (index, record) in records.enumerated() {
                let recordID = record.recordID.recordName
                Swift.print("☁️ [CloudKitManager] 📝 Processing record \(index + 1)/\(records.count) - recordID: \(recordID)")
                Swift.print("☁️ [CloudKitManager] 📝 Record keys: \(record.allKeys())")
                
                guard let id = record["id"] as? String else {
                    skippedCount += 1
                    skippedReasons["missingId"] = (skippedReasons["missingId"] ?? 0) + 1
                    Swift.print("☁️ [CloudKitManager] ⚠️ SKIPPING - missing id field, recordID: \(recordID)")
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Skipping record - missing id", metadata: ["recordID": recordID], source: self.logSource)
                    continue
                }
                guard let bucketId = record["bucketId"] as? String else {
                    skippedCount += 1
                    skippedReasons["missingBucketId"] = (skippedReasons["missingBucketId"] ?? 0) + 1
                    Swift.print("☁️ [CloudKitManager] ⚠️ SKIPPING - missing bucketId, id: \(id)")
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Skipping record - missing bucketId", metadata: ["recordID": recordID, "id": id], source: self.logSource)
                    continue
                }
                guard let title = record["title"] as? String else {
                    skippedCount += 1
                    skippedReasons["missingTitle"] = (skippedReasons["missingTitle"] ?? 0) + 1
                    Swift.print("☁️ [CloudKitManager] ⚠️ SKIPPING - missing title, id: \(id)")
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Skipping record - missing title", metadata: ["recordID": recordID, "id": id], source: self.logSource)
                    continue
                }
                guard let body = record["body"] as? String else {
                    skippedCount += 1
                    skippedReasons["missingBody"] = (skippedReasons["missingBody"] ?? 0) + 1
                    Swift.print("☁️ [CloudKitManager] ⚠️ SKIPPING - missing body, id: \(id)")
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Skipping record - missing body", metadata: ["recordID": recordID, "id": id], source: self.logSource)
                    continue
                }
                guard let createdAt = record["createdAt"] as? Date else {
                    skippedCount += 1
                    skippedReasons["missingCreatedAt"] = (skippedReasons["missingCreatedAt"] ?? 0) + 1
                    Swift.print("☁️ [CloudKitManager] ⚠️ SKIPPING - missing createdAt, id: \(id)")
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Skipping record - missing createdAt", metadata: ["recordID": recordID, "id": id], source: self.logSource)
                    continue
                }
                
                Swift.print("☁️ [CloudKitManager] ✅ Record passed guard checks - id: \(id), bucketId: \(bucketId), title: \(title.prefix(20))...")
                
                let subtitle = record["subtitle"] as? String
                let readAt = record["readAt"] as? Date
                let isRead = readAt != nil
                
                // Parse attachments
                var attachments: [[String: Any]] = []
                if let attachmentsString = record["attachments"] as? String,
                   let attachmentsData = attachmentsString.data(using: .utf8),
                   let attachmentsArray = try? JSONSerialization.jsonObject(with: attachmentsData) as? [[String: Any]] {
                    attachments = attachmentsArray
                }
                
                // Parse actions
                var actions: [[String: Any]] = []
                if let actionsString = record["actions"] as? String,
                   let actionsData = actionsString.data(using: .utf8),
                   let actionsArray = try? JSONSerialization.jsonObject(with: actionsData) as? [[String: Any]] {
                    actions = actionsArray
                }
                
                var notificationDict: [String: Any] = [
                    "id": id,
                    "bucketId": bucketId,
                    "title": title,
                    "body": body,
                    "createdAt": dateFormatter.string(from: createdAt),
                    "isRead": isRead,
                    "attachments": attachments,
                    "actions": actions
                ]
                
                if let subtitle = subtitle {
                    notificationDict["subtitle"] = subtitle
                }
                
                
                notifications.append(notificationDict)
            }
            
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched notifications from CloudKit", metadata: ["count": "\(notifications.count)", "totalRecords": "\(records.count)", "skippedCount": "\(skippedCount)", "skippedReasons": "\(skippedReasons)"], source: self.logSource)
            completion(notifications, nil)
        }
    }
    
    /**
     * Fetch all buckets from CloudKit
     * Returns array of bucket dictionaries
     * Uses CKQueryOperation with pagination to handle more than 100 buckets
     * Available on both iOS (for verification) and Watch
     */
    public func fetchAllBucketsFromCloudKit(completion: @escaping ([[String: Any]], Error?) -> Void) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetching all buckets from CloudKit", source: self.logSource)
        
        let predicate = NSPredicate(value: true) // Fetch all buckets
        let query = CKQuery(recordType: RecordType.bucket.rawValue, predicate: predicate)
        
        var allBuckets: [[String: Any]] = []
        var fetchError: Error?
        
        func fetchPage(cursor: CKQueryOperation.Cursor?) {
            let operation: CKQueryOperation
            
            if let cursor = cursor {
                operation = CKQueryOperation(cursor: cursor)
            } else {
                operation = CKQueryOperation(query: query)
            }
            
            // Set zone for the operation
            operation.zoneID = self.customZoneID
            
            // Set results limit (CloudKit default is 100, but we can request more)
            operation.resultsLimit = 500
            operation.qualityOfService = .utility
            
            // Collect records from this page
            var pageBuckets: [[String: Any]] = []
            
            operation.recordMatchedBlock = { recordID, result in
                switch result {
                case .success(let record):
                    guard let id = record["id"] as? String,
                          let name = record["name"] as? String else {
                        Swift.print("☁️ [CloudKitManager] ⚠️ Skipping bucket - missing id or name")
                        return
                    }
                    
                    var bucketDict: [String: Any] = [
                        "id": id,
                        "name": name,
                        "unreadCount": 0 // Will be calculated from notifications
                    ]
                    
                    if let iconUrl = record["iconUrl"] as? String {
                        bucketDict["iconUrl"] = iconUrl
                    }
                    
                    if let color = record["color"] as? String {
                        bucketDict["color"] = color
                    }
                    
                    pageBuckets.append(bucketDict)
                    Swift.print("☁️ [CloudKitManager] ✅ Processed bucket - id: \(id), name: \(name)")
                    
                case .failure(let error):
                    Swift.print("☁️ [CloudKitManager] ❌ Error processing bucket record: \(error.localizedDescription)")
                    fetchError = error
                }
            }
            
            operation.queryResultBlock = { result in
                switch result {
                case .success(let cursor):
                    // Add buckets from this page
                    allBuckets.append(contentsOf: pageBuckets)
                    Swift.print("☁️ [CloudKitManager] 📄 Fetched page - buckets in page: \(pageBuckets.count), total so far: \(allBuckets.count)")
                    
                    // If there's a cursor, fetch next page
                    if let nextCursor = cursor {
                        Swift.print("☁️ [CloudKitManager] 📄 More buckets available, fetching next page...")
                        fetchPage(cursor: nextCursor)
                    } else {
                        // All pages fetched
                        Swift.print("☁️ [CloudKitManager] ✅ All buckets fetched - total: \(allBuckets.count)")
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched buckets from CloudKit", metadata: ["count": "\(allBuckets.count)"], source: self.logSource)
                        completion(allBuckets, fetchError)
                    }
                    
                case .failure(let error):
                    Swift.print("☁️ [CloudKitManager] ❌ Error fetching buckets page: \(error.localizedDescription)")
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching buckets", metadata: ["error": error.localizedDescription], source: self.logSource)
                    completion(allBuckets.isEmpty ? [] : allBuckets, error)
                }
            }
            
            privateDatabase.add(operation)
        }
        
        // Start fetching from first page
        fetchPage(cursor: nil)
    }
    
    // MARK: - Watch Logging via CloudKit
    
    /**
     * Write a log entry from Watch to CloudKit
     * iOS will periodically read and delete these logs
     */
    #if os(watchOS)
    public func writeWatchLog(
        level: String,
        tag: String?,
        message: String,
        metadata: [String: String]?,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        let logId = UUID().uuidString
        let recordID = CKRecord.ID(recordName: "WatchLog-\(logId)", zoneID: customZoneID)
        let record = CKRecord(recordType: RecordType.watchLog.rawValue, recordID: recordID)
        
        record["id"] = logId
        record["level"] = level
        record["tag"] = tag ?? ""
        record["message"] = message
        record["timestamp"] = Date()
        record["source"] = "Watch"
        
        // Convert metadata to JSON string
        if let metadata = metadata,
           let metadataData = try? JSONSerialization.data(withJSONObject: metadata),
           let metadataString = String(data: metadataData, encoding: .utf8) {
            record["metadata"] = metadataString
        } else {
            record["metadata"] = "{}"
        }
        
        privateDatabase.save(record) { savedRecord, error in
            if let error = error {
                // Only log errors, not every successful write to avoid log spam
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to write Watch log to CloudKit", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion(false, error)
            } else {
                // Don't log successful writes to avoid infinite log loop
                completion(true, nil)
            }
        }
    }
    
    /**
     * Write multiple Watch logs to CloudKit in batch
     * Uses batch operations for efficiency
     */
    public func writeWatchLogs(
        logs: [(level: String, tag: String?, message: String, metadata: [String: String]?, source: String)],
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        guard !logs.isEmpty else {
            completion(true, 0, nil)
            return
        }
        
        // Create records for all logs
        var recordsToSave: [CKRecord] = []
        
        for log in logs {
            let logId = UUID().uuidString
            let recordID = CKRecord.ID(recordName: "WatchLog-\(logId)", zoneID: customZoneID)
            let record = CKRecord(recordType: RecordType.watchLog.rawValue, recordID: recordID)
            
            record["id"] = logId
            record["level"] = log.level
            record["tag"] = log.tag ?? ""
            record["message"] = log.message
            record["timestamp"] = Date()
            record["source"] = log.source
            
            // Convert metadata to JSON string
            if let metadata = log.metadata,
               let metadataData = try? JSONSerialization.data(withJSONObject: metadata),
               let metadataString = String(data: metadataData, encoding: .utf8) {
                record["metadata"] = metadataString
            } else {
                record["metadata"] = "{}"
            }
            
            recordsToSave.append(record)
        }
        
        // Save all records in batch
        let modifyOperation = CKModifyRecordsOperation(recordsToSave: recordsToSave, recordIDsToDelete: nil)
        modifyOperation.database = self.privateDatabase
        modifyOperation.savePolicy = .allKeys
        
        modifyOperation.modifyRecordsResultBlock = { result in
            switch result {
            case .success:
                // Don't log successful batch writes to avoid infinite log loop
                completion(true, recordsToSave.count, nil)
            case .failure(let error):
                // Only log errors
                var successCount = recordsToSave.count
                if let ckError = error as? CKError,
                   let partialErrors = ckError.partialErrorsByItemID {
                    successCount = recordsToSave.count - partialErrors.count
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to write Watch logs to CloudKit (partial)", metadata: ["successCount": "\(successCount)", "errorCount": "\(partialErrors.count)", "error": error.localizedDescription], source: self.logSource)
                } else {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to write Watch logs to CloudKit", metadata: ["error": error.localizedDescription], source: self.logSource)
                }
                completion(false, successCount, error)
            }
        }
        
        self.privateDatabase.add(modifyOperation)
    }
    #endif
    
    /**
     * Fetch and delete Watch logs from CloudKit (iOS only)
     * Reads all WatchLog records, processes them, and deletes them
     */
    #if os(iOS)
    public func fetchAndDeleteWatchLogs(completion: @escaping ([[String: Any]], Error?) -> Void) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetching Watch logs from CloudKit", source: self.logSource)
        
        let predicate = NSPredicate(value: true) // Fetch all WatchLog records
        let query = CKQuery(recordType: RecordType.watchLog.rawValue, predicate: predicate)
        // Use sortDescriptors to make timestamp queryable (CloudKit will mark it as queryable when used)
        // If timestamp is not yet queryable, CloudKit will return an error and we'll fall back to manual sorting
        query.sortDescriptors = [NSSortDescriptor(key: "timestamp", ascending: true)]
        
        privateDatabase.perform(query, inZoneWith: customZoneID) { records, error in
            if let error = error {
                // Check if error is due to timestamp not being queryable yet
                if let ckError = error as? CKError,
                   ckError.code == .invalidArguments,
                   ckError.localizedDescription.contains("queryable") {
                    // Retry without sortDescriptors - timestamp will become queryable after first use
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "timestamp not yet queryable, retrying without sortDescriptors", source: self.logSource)
                    let fallbackQuery = CKQuery(recordType: RecordType.watchLog.rawValue, predicate: predicate)
                    self.privateDatabase.perform(fallbackQuery, inZoneWith: self.customZoneID) { fallbackRecords, fallbackError in
                        if let fallbackError = fallbackError {
                            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching Watch logs (fallback)", metadata: ["error": fallbackError.localizedDescription], source: self.logSource)
                            completion([], fallbackError)
                            return
                        }
                        self.processWatchLogs(records: fallbackRecords ?? [], completion: completion)
                    }
                    return
                }
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching Watch logs", metadata: ["error": error.localizedDescription], source: self.logSource)
                completion([], error)
                return
            }
            
            self.processWatchLogs(records: records ?? [], completion: completion)
        }
    }
    
    private func processWatchLogs(records: [CKRecord], completion: @escaping ([[String: Any]], Error?) -> Void) {
        guard !records.isEmpty else {
            completion([], nil)
            return
        }
        
        var logs: [[String: Any]] = []
        var recordIDsToDelete: [CKRecord.ID] = []
        
        for record in records {
            var logDict: [String: Any] = [:]
            
            if let id = record["id"] as? String {
                logDict["id"] = id
            }
            if let level = record["level"] as? String {
                logDict["level"] = level
            }
            if let tag = record["tag"] as? String {
                logDict["tag"] = tag
            }
            if let message = record["message"] as? String {
                logDict["message"] = message
            }
            if let timestamp = record["timestamp"] as? Date {
                logDict["timestamp"] = Int64(timestamp.timeIntervalSince1970 * 1000)
            }
            if let source = record["source"] as? String {
                logDict["source"] = source
            }
            if let metadataString = record["metadata"] as? String,
               let metadataData = metadataString.data(using: .utf8),
               let metadata = try? JSONSerialization.jsonObject(with: metadataData) as? [String: Any] {
                logDict["metadata"] = metadata
            }
            
            logs.append(logDict)
            recordIDsToDelete.append(record.recordID)
        }
        
        // Sort logs by timestamp ascending (manually, in case timestamp is not yet queryable)
        logs.sort { (log1, log2) -> Bool in
            let ts1 = log1["timestamp"] as? Int64 ?? 0
            let ts2 = log2["timestamp"] as? Int64 ?? 0
            return ts1 < ts2
        }
        
        // Write logs to files first
        var watchLogsCount = 0
        var cloudKitWatchLogsCount = 0
        if !logs.isEmpty {
            let (watchCount, cloudKitWatchCount) = writeWatchLogsToFile(logs: logs)
            watchLogsCount = watchCount
            cloudKitWatchLogsCount = cloudKitWatchCount
        }
        
        // Delete all fetched logs
        if !recordIDsToDelete.isEmpty {
            let deleteOperation = CKModifyRecordsOperation(recordsToSave: nil, recordIDsToDelete: recordIDsToDelete)
            deleteOperation.database = self.privateDatabase
            deleteOperation.modifyRecordsResultBlock = { [weak self] result in
                guard let self = self else { return }
                switch result {
                case .success:
                    // Single summary log for all operations
                    var metadata: [String: String] = [
                        "fetched": "\(logs.count)",
                        "deleted": "\(recordIDsToDelete.count)"
                    ]
                    if watchLogsCount > 0 {
                        metadata["writtenToWatch"] = "\(watchLogsCount)"
                    }
                    if cloudKitWatchLogsCount > 0 {
                        metadata["writtenToCloudKitWatch"] = "\(cloudKitWatchLogsCount)"
                    }
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Watch logs processed", metadata: metadata, source: self.logSource)
                case .failure(let error):
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error deleting Watch logs", metadata: ["error": error.localizedDescription], source: self.logSource)
                }
            }
            self.privateDatabase.add(deleteOperation)
        } else {
            // Even if no deletion, log the fetch and write summary
            var metadata: [String: String] = ["fetched": "\(logs.count)"]
            if watchLogsCount > 0 {
                metadata["writtenToWatch"] = "\(watchLogsCount)"
            }
            if cloudKitWatchLogsCount > 0 {
                metadata["writtenToCloudKitWatch"] = "\(cloudKitWatchLogsCount)"
            }
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Watch logs processed", metadata: metadata, source: self.logSource)
        }
        
        completion(logs, nil)
    }
    
    /**
     * Write Watch logs to separate files based on source
     * - Watch.json: logs with source "Watch" or any other source except "CloudKitWatch"
     * - CloudKitWatch.json: logs with source "CloudKitWatch"
     * Uses the same format as LoggingSystem for consistency
     * Returns: (watchLogsCount, cloudKitWatchLogsCount)
     */
    private func writeWatchLogsToFile(logs: [[String: Any]]) -> (Int, Int) {
        // Get logs directory (same as LoggingSystem)
        let fileManager = FileManager.default
        let cacheDirectory = fileManager.urls(for: .cachesDirectory, in: .userDomainMask).first!
        let logsDirectory = cacheDirectory.appendingPathComponent("logs").path
        
        // Ensure logs directory exists
        if !fileManager.fileExists(atPath: logsDirectory) {
            try? fileManager.createDirectory(atPath: logsDirectory, withIntermediateDirectories: true, attributes: nil)
        }
        
        // Separate logs by source: CloudKitWatch logs go to CloudKitWatch.json, Watch logs go to Watch.json
        var watchLogs: [LoggingSystem.LogEntry] = []
        var cloudKitWatchLogs: [LoggingSystem.LogEntry] = []
        
        // Convert CloudKit logs to LogEntry format and separate by source
        for logDict in logs {
            guard let id = logDict["id"] as? String,
                  let level = logDict["level"] as? String,
                  let message = logDict["message"] as? String,
                  let timestamp = logDict["timestamp"] as? Int64,
                  let source = logDict["source"] as? String else {
                continue
            }
            
            let tag = logDict["tag"] as? String
            var metadata: [String: String]? = nil
            if let metadataDict = logDict["metadata"] as? [String: Any] {
                metadata = metadataDict.compactMapValues { value in
                    if let str = value as? String {
                        return str
                    } else {
                        return String(describing: value)
                    }
                }
            }
            
            let logEntry = LoggingSystem.LogEntry(
                id: id,
                level: level,
                tag: tag,
                message: message,
                metadata: metadata,
                timestamp: timestamp,
                source: source
            )
            
            // Separate by source: CloudKitWatch source goes to CloudKitWatch.json, Watch source goes to Watch.json
            if source == "CloudKitWatch" {
                cloudKitWatchLogs.append(logEntry)
            } else {
                // All other sources (including "Watch") go to Watch.json
                watchLogs.append(logEntry)
            }
        }
        
        // Write Watch logs to Watch.json
        if !watchLogs.isEmpty {
            writeLogsToFile(logs: watchLogs, filePath: "\(logsDirectory)/Watch.json")
        }
        
        // Write CloudKitWatch logs to CloudKitWatch.json
        if !cloudKitWatchLogs.isEmpty {
            writeLogsToFile(logs: cloudKitWatchLogs, filePath: "\(logsDirectory)/CloudKitWatch.json")
        }
        
        return (watchLogs.count, cloudKitWatchLogs.count)
    }
    
    /**
     * Helper method to write logs to a specific file
     */
    private func writeLogsToFile(logs: [LoggingSystem.LogEntry], filePath: String) {
        let fileManager = FileManager.default
        
        do {
            // Read existing logs
            var existingLogs: [LoggingSystem.LogEntry] = []
            if fileManager.fileExists(atPath: filePath) {
                let data = try Data(contentsOf: URL(fileURLWithPath: filePath))
                existingLogs = try JSONDecoder().decode([LoggingSystem.LogEntry].self, from: data)
            }
            
            // Append new logs
            existingLogs.append(contentsOf: logs)
            
            // Auto-cleanup: Keep only the most recent 1000 entries (same as LoggingSystem maxLogsPerFile)
            let maxLogsPerFile = 1000
            if existingLogs.count > maxLogsPerFile {
                existingLogs = Array(existingLogs.sorted { $0.timestamp > $1.timestamp }.prefix(maxLogsPerFile))
            }
            
            // Write back to file atomically
            let data = try JSONEncoder().encode(existingLogs)
            try data.write(to: URL(fileURLWithPath: filePath), options: [.atomic])
        } catch {
            let fileName = (filePath as NSString).lastPathComponent
            LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to write Watch logs to file", metadata: ["error": error.localizedDescription, "file": fileName], source: self.logSource)
        }
    }
    #endif
}

// MARK: - Note on CloudKit Remote Notifications
// CloudKit remote notifications are handled via AppDelegate's 
// application(_:didReceiveRemoteNotification:fetchCompletionHandler:) method,
// which calls CloudKitManager.handleRemoteNotification().
// There is no CKDatabaseDelegate protocol in CloudKit API.