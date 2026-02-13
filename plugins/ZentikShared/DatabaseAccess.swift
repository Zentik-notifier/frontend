import Foundation
import SQLite3

// MARK: - Database Operation Types

/// Database operation result types
public enum DatabaseOperationResult {
    case success
    case failure(String)
    case timeout
    case locked
}

/// Database operation types (read/write)
public enum DatabaseOperationType {
    case read
    case write
}

/**
 * DatabaseAccess - Shared database utilities
 * 
 * Provides SQLite database operations for notification caching
 * shared between app and extensions via App Group container.
 */
public class DatabaseAccess {
    
    // MARK: - Configuration
    
    /// Database queue for thread-safe operations
    private static let dbQueue = DispatchQueue(label: "com.zentik.shared.database", qos: .userInitiated)
    
    /// File lock for cross-process synchronization
    private static var lockFileDescriptor: Int32 = -1
    private static let lockQueue = DispatchQueue(label: "com.zentik.shared.database.lock")
    
    /// Database operation configuration
    public static let DB_OPERATION_TIMEOUT: TimeInterval = 10.0  // Max 10 seconds per operation
    private static let DB_BUSY_TIMEOUT: Int32 = 5000  // 5 seconds busy timeout
    private static let DB_MAX_RETRIES: Int = 5  // Max 5 retry attempts
    
    // MARK: - Background suspension protection (0xdead10cc prevention)
    
    /// Set to true when the app is about to be suspended.
    /// Database operations check this flag and abort early to avoid holding
    /// file locks while the process is suspended, which causes the system to
    /// kill the app with termination reason 0xdead10cc.
    private static var isSuspending = false
    private static let suspendLock = NSLock()
    
    private static var backgroundObserver: NSObjectProtocol?
    private static var foregroundObserver: NSObjectProtocol?
    
    /// Call once at app startup to register for lifecycle notifications.
    /// This ensures the file lock is released before the app is suspended.
    /// NOTE: Only effective in the main app process. In extensions (e.g. NSE)
    /// these notifications are not delivered, so this is a no-op.
    public static func registerLifecycleObservers() {
        #if os(iOS)
        // Use raw notification names to avoid referencing UIApplication,
        // which is unavailable in app extensions (APPLICATION_EXTENSION_API_ONLY).
        backgroundObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("UIApplicationDidEnterBackgroundNotification"),
            object: nil,
            queue: .main
        ) { _ in
            suspendLock.lock()
            isSuspending = true
            suspendLock.unlock()
            
            // Force-release any held file lock immediately.
            // The operation that was using it will see the closed descriptor
            // and the DB will return SQLITE_BUSY on subsequent calls, but
            // that is far better than the system killing the process.
            forceReleaseLockForSuspension()
        }
        
        foregroundObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("UIApplicationWillEnterForegroundNotification"),
            object: nil,
            queue: .main
        ) { _ in
            suspendLock.lock()
            isSuspending = false
            suspendLock.unlock()
        }
        #endif
    }
    
    /// Force-release the file lock regardless of current state.
    /// Called when the app is about to be suspended to prevent 0xdead10cc.
    private static func forceReleaseLockForSuspension() {
        lockQueue.sync {
            if lockFileDescriptor != -1 {
                flock(lockFileDescriptor, LOCK_UN)
                close(lockFileDescriptor)
                lockFileDescriptor = -1
            }
        }
    }

    /// Drain pending database operations and checkpoint WAL to release all internal SQLite locks.
    /// Call from AppDelegate.applicationDidEnterBackground inside a beginBackgroundTask.
    /// The completion is called on an arbitrary queue once it's safe for iOS to suspend.
    public static func drainAndCheckpoint(completion: @escaping () -> Void) {
        suspendLock.lock()
        isSuspending = true
        suspendLock.unlock()
        forceReleaseLockForSuspension()

        dbQueue.async {
            guard let dbPath = getDbPath() else {
                completion()
                return
            }
            var db: OpaquePointer?
            if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX, nil) == SQLITE_OK, let database = db {
                sqlite3_wal_checkpoint_v2(database, nil, SQLITE_CHECKPOINT_TRUNCATE, nil, nil)
                sqlite3_close(database)
            }
            completion()
        }
    }
    
    // MARK: - Database Path & Lock (App Group / userGroup)
    
    /// Paths for shared cache and lock inside the App Group container.
    /// Logs are not in cache.db: LoggingSystem writes to JSON files under `logsDirectoryPath()`.
    public enum SharedCachePaths {
        /// App Group identifier (e.g. group.com.apocaliss92.zentik)
        public static func appGroupId() -> String? {
            let id = KeychainAccess.getMainBundleIdentifier()
            return id.isEmpty ? nil : "group.\(id)"
        }
        
        /// App Group container base URL
        public static func containerURL() -> URL? {
            guard let id = appGroupId() else { return nil }
            return FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: id)
        }
        
        /// cache.db path inside container: shared_media_cache/cache.db
        public static func dbPath() -> String? {
            containerURL()?.appendingPathComponent("shared_media_cache/cache.db").path
        }
        
        /// Lock file path in App Group, same directory as cache.db. All DB access must use this lock.
        public static func lockPath() -> String? {
            dbPath().map { $0 + ".lock" }
        }
        
        /// Logs directory in App Group (JSON files only). Logs are not stored in cache.db.
        public static func logsDirectoryPath() -> String? {
            containerURL()?.appendingPathComponent("shared_media_cache/logs").path
        }
    }
    
    /// Get database path in App Group shared container
    public static func getDbPath() -> String? {
        SharedCachePaths.dbPath()
    }
    
    /// Get lock file path in App Group (for debugging / consistency). All access uses this lock.
    public static func getSharedCacheLockPath() -> String? {
        SharedCachePaths.lockPath()
    }
    
    // MARK: - Initialization (schema aligned with db-setup.ts)
    
    private static let SCHEMA_INIT_MAX_RETRIES = 3
    private static let SCHEMA_INIT_RETRY_DELAY: TimeInterval = 0.15

    /// Ensures shared cache.db exists with full schema (tables, indexes, migrations).
    /// Idempotent: safe to call at app startup; matches React openSharedCacheDb logic.
    /// Retries on "table is locked" / SQLITE_BUSY up to SCHEMA_INIT_MAX_RETRIES.
    /// Logs are not in cache.db: LoggingSystem writes to JSON files in shared_media_cache/logs.
    /// - Parameters:
    ///   - source: Caller identifier for logging (e.g. "RNBridge")
    ///   - completion: Called with true on success, false on failure
    public static func ensureSharedCacheDbInitialized(
        source: String = "Unknown",
        completion: @escaping (Bool) -> Void
    ) {
        var attempt = 0
        func trySchemaInit() {
            performDatabaseOperation(
                type: .write,
                name: "EnsureInitialized",
                source: source,
                verboseLogging: false,
                operation: { db, _ in
                runExec(db, "PRAGMA journal_mode=WAL") &&
                runExec(db, "PRAGMA foreign_keys=ON") &&
                runExec(db, "PRAGMA busy_timeout=5000") &&
                runExec(db, "PRAGMA wal_autocheckpoint=1000") &&
                runExec(db, """
                    CREATE TABLE IF NOT EXISTS cache_item (
                        key TEXT PRIMARY KEY,
                        url TEXT NOT NULL,
                        media_type TEXT NOT NULL,
                        local_path TEXT,
                        local_thumb_path TEXT,
                        generating_thumbnail INTEGER NOT NULL DEFAULT 0 CHECK (generating_thumbnail IN (0,1)),
                        timestamp INTEGER NOT NULL,
                        size INTEGER NOT NULL,
                        original_file_name TEXT,
                        downloaded_at INTEGER NOT NULL,
                        notification_date INTEGER,
                        notification_id TEXT,
                        is_downloading INTEGER NOT NULL DEFAULT 0 CHECK (is_downloading IN (0,1)),
                        is_permanent_failure INTEGER NOT NULL DEFAULT 0 CHECK (is_permanent_failure IN (0,1)),
                        is_user_deleted INTEGER NOT NULL DEFAULT 0 CHECK (is_user_deleted IN (0,1)),
                        error_code TEXT
                    );
                    """) &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_cache_item_downloaded_at ON cache_item(downloaded_at)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_cache_item_notification_date ON cache_item(notification_date)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_cache_item_media_type ON cache_item(media_type)") &&
                runExec(db, "CREATE UNIQUE INDEX IF NOT EXISTS idx_cache_item_key ON cache_item(key)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_cache_item_timestamp ON cache_item(timestamp)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_cache_item_is_downloading ON cache_item(is_downloading)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_cache_item_generating_thumbnail ON cache_item(generating_thumbnail)") &&
                runExec(db, """
                    CREATE TABLE IF NOT EXISTS notifications (
                        id TEXT PRIMARY KEY,
                        created_at TEXT NOT NULL,
                        read_at TEXT,
                        bucket_id TEXT NOT NULL,
                        bucket_icon_url TEXT,
                        has_attachments INTEGER NOT NULL DEFAULT 0 CHECK (has_attachments IN (0,1)),
                        fragment TEXT NOT NULL
                    );
                    """) &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_notifications_bucket_id ON notifications(bucket_id)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_notifications_has_attachments ON notifications(has_attachments)") &&
                runExec(db, """
                    CREATE TABLE IF NOT EXISTS buckets (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        icon TEXT,
                        description TEXT,
                        fragment TEXT NOT NULL,
                        updated_at TEXT NOT NULL,
                        synced_at INTEGER NOT NULL
                    );
                    """) &&
                runExecOptional(db, "ALTER TABLE buckets ADD COLUMN icon TEXT") &&
                runExecOptional(db, "ALTER TABLE buckets ADD COLUMN description TEXT") &&
                runExecOptional(db, "ALTER TABLE buckets ADD COLUMN synced_at INTEGER NOT NULL DEFAULT 0") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_buckets_updated_at ON buckets(updated_at)") &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_buckets_synced_at ON buckets(synced_at)") &&
                runExec(db, """
                    CREATE TABLE IF NOT EXISTS deleted_notifications (
                        id TEXT PRIMARY KEY,
                        deleted_at INTEGER NOT NULL,
                        retry_count INTEGER NOT NULL DEFAULT 0,
                        last_retry_at INTEGER
                    );
                    """) &&
                runExec(db, "CREATE INDEX IF NOT EXISTS idx_deleted_notifications_deleted_at ON deleted_notifications(deleted_at)") &&
                runExec(db, """
                    CREATE TABLE IF NOT EXISTS app_settings (
                        key TEXT PRIMARY KEY NOT NULL,
                        value TEXT NOT NULL,
                        updated_at INTEGER NOT NULL
                    );
                    """) &&
                runExecOptional(db, "ALTER TABLE cache_item ADD COLUMN notification_id TEXT") &&
                runExecOptional(db, "ALTER TABLE notifications ADD COLUMN bucket_icon_url TEXT")
                    ? .success : .failure("Schema initialization failed")
            },
            completion: { (result: DatabaseOperationResult) in
                switch result {
                case .success:
                    completion(true)
                default:
                    attempt += 1
                    if attempt < SCHEMA_INIT_MAX_RETRIES {
                        dbQueue.asyncAfter(deadline: .now() + SCHEMA_INIT_RETRY_DELAY) { trySchemaInit() }
                    } else {
                        completion(false)
                    }
                }
            }
        )
        }
        trySchemaInit()
    }
    
    /// Runs PRAGMA quick_check under lock. Call from bridge for integrity check on iOS.
    public static func runIntegrityCheck(source: String = "Unknown", completion: @escaping (Bool) -> Void) {
        performDatabaseOperation(
            type: .read,
            name: "IntegrityCheck",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                runExec(db, "PRAGMA quick_check") ? .success : .failure("PRAGMA quick_check failed")
            },
            completion: { (result: DatabaseOperationResult) in
                let successBool: Bool
                switch result {
                case .success: successBool = true
                default: successBool = false
                }
                completion(successBool)
            }
        )
    }
    
    private static func runExec(_ db: OpaquePointer?, _ sql: String) -> Bool {
        guard let db = db else { return false }
        var errMsg: UnsafeMutablePointer<CChar>?
        let result = sql.withCString { cSql in
            sqlite3_exec(db, cSql, nil, nil, &errMsg)
        }
        if result != SQLITE_OK, let msg = errMsg {
            let s = String(cString: msg)
            sqlite3_free(errMsg)
            if !s.contains("duplicate column name") {
                print("📱 [DatabaseAccess] exec failed: \(s)")
                let sqlPreview = String(sql.prefix(80)).replacingOccurrences(of: "\n", with: " ")
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "RNBridge-DB",
                    message: "[EnsureInitialized] Schema statement failed: \(s)",
                    metadata: ["sqliteCode": String(result), "sqlPreview": sqlPreview],
                    source: "DatabaseAccess"
                )
            }
        }
        return result == SQLITE_OK
    }
    
    private static func runExecOptional(_ db: OpaquePointer?, _ sql: String) -> Bool {
        guard let db = db else { return false }
        var errMsg: UnsafeMutablePointer<CChar>?
        let result = sql.withCString { cSql in
            sqlite3_exec(db, cSql, nil, nil, &errMsg)
        }
        if result == SQLITE_OK { return true }
        if let msg = errMsg {
            let s = String(cString: msg)
            sqlite3_free(errMsg)
            if s.contains("duplicate column name") { return true }
        }
        return result == SQLITE_OK
    }
    
    // MARK: - File Locking for Cross-Process Synchronization (App Group)
    
    /// Acquire file lock in App Group. path must be SharedCachePaths.dbPath() so lock is at SharedCachePaths.lockPath().
    private static func acquireLock(for path: String, type: DatabaseOperationType, verbose: Bool = false) -> Bool {
        return lockQueue.sync {
            let lockPath = SharedCachePaths.lockPath() ?? (path + ".lock")
            
            // Create lock file if it doesn't exist
            if !FileManager.default.fileExists(atPath: lockPath) {
                FileManager.default.createFile(atPath: lockPath, contents: nil)
            }
            
            // Open lock file
            let fd = open(lockPath, O_RDWR | O_CREAT, 0o666)
            guard fd != -1 else {
                print("📱 [Lock] ❌ Failed to open lock file")
                return false
            }
            
            // Try to acquire lock (shared for reads, exclusive for writes)
            let lockType = type == .write ? LOCK_EX : LOCK_SH
            let lockResult = flock(fd, lockType | LOCK_NB) // Non-blocking
            
            if lockResult == 0 {
                lockFileDescriptor = fd
                if verbose {
                    print("📱 [Lock] ✅ Acquired \(type == .write ? "exclusive" : "shared") lock")
                }
                return true
            } else {
                // Lock failed, try blocking mode with timeout
                if verbose {
                    print("📱 [Lock] ⏳ Lock busy, waiting...")
                }
                close(fd)
                return false
            }
        }
    }
    
    /// Release file lock
    private static func releaseLock(verbose: Bool = false) {
        lockQueue.sync {
            if lockFileDescriptor != -1 {
                flock(lockFileDescriptor, LOCK_UN)
                close(lockFileDescriptor)
                lockFileDescriptor = -1
                if verbose {
                    print("📱 [Lock] 🔓 Released lock")
                }
            }
        }
    }
    
    // MARK: - Database Operations
    
    /// Mark notification as read in local database
    /// - Parameters:
    ///   - notificationId: The notification ID to mark as read
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status
    public static func markNotificationAsRead(
        notificationId: String,
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void = { _ in }
    ) {
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        
        performDatabaseOperation(
            type: .write,
            name: "MarkAsRead",
            source: source,
            operation: { db, isVerbose in
                let sql = "UPDATE notifications SET read_at = ? WHERE id = ?"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                sqlite3_bind_int64(stmt, 1, timestamp)
                sqlite3_bind_text(stmt, 2, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                
                let result = sqlite3_step(stmt)
                let changes = sqlite3_changes(db)
                if isVerbose {
                    print("📱 [DatabaseAccess] 🔍 [MarkAsRead] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                }
                
                if result == SQLITE_DONE {
                    return .success
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Step failed: \(result) - \(errorMsg)")
                }
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(true)
            default:
                completion(false)
            }
        }
    }
    
    /// Mark multiple notifications as read in local database (bulk operation)
    /// Uses a single SQL query with IN clause for optimal performance
    /// - Parameters:
    ///   - notificationIds: Array of notification IDs to mark as read
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status
    public static func markMultipleNotificationsAsRead(
        notificationIds: [String],
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void = { _ in }
    ) {
        guard !notificationIds.isEmpty else {
            print("📱 [DatabaseAccess] ⚠️ [BulkMarkAsRead] Empty ID list - skipping")
            completion(true)
            return
        }
        
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        
        performDatabaseOperation(
            type: .write,
            name: "BulkMarkAsRead",
            source: source,
            operation: { db, _ in
                // Build SQL with IN clause: UPDATE notifications SET read_at = ? WHERE id IN (?, ?, ...)
                let placeholders = Array(repeating: "?", count: notificationIds.count).joined(separator: ", ")
                let sql = "UPDATE notifications SET read_at = ? WHERE id IN (\(placeholders))"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                // Bind timestamp as first parameter
                sqlite3_bind_int64(stmt, 1, timestamp)
                
                // Bind all notification IDs (starting from index 2)
                for (index, notificationId) in notificationIds.enumerated() {
                    sqlite3_bind_text(stmt, Int32(index + 2), (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                }
                
                let result = sqlite3_step(stmt)
                let changes = sqlite3_changes(db)
                print("📱 [DatabaseAccess] 🔍 [BulkMarkAsRead] Updated \(changes) notifications out of \(notificationIds.count) requested")
                
                if result == SQLITE_DONE {
                    return .success
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Step failed: \(result) - \(errorMsg)")
                }
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(true)
            default:
                completion(false)
            }
        }
    }
    
    /// Mark notification as unread in local database
    /// - Parameters:
    ///   - notificationId: The notification ID to mark as unread
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status
    public static func markNotificationAsUnread(
        notificationId: String,
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void = { _ in }
    ) {
        performDatabaseOperation(
            type: .write,
            name: "MarkAsUnread",
            source: source,
            operation: { db, isVerbose in
                let sql = "UPDATE notifications SET read_at = NULL WHERE id = ?"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                
                let result = sqlite3_step(stmt)
                let changes = sqlite3_changes(db)
                if isVerbose {
                    print("📱 [DatabaseAccess] 🔍 [MarkAsUnread] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                }
                
                if result == SQLITE_DONE {
                    return .success
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Step failed: \(result) - \(errorMsg)")
                }
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(true)
            default:
                completion(false)
            }
        }
    }

    /// Set notification read_at explicitly (used by CloudKit incremental sync)
    /// - Parameters:
    ///   - notificationId: The notification ID to update
    ///   - readAtMs: Timestamp in milliseconds since epoch, or nil to mark unread
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status
    public static func setNotificationReadAt(
        notificationId: String,
        readAtMs: Int64?,
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void = { _ in }
    ) {
        performDatabaseOperation(
            type: .write,
            name: "SetReadAt",
            source: source,
            operation: { db, isVerbose in
                let sql: String
                if readAtMs == nil {
                    sql = "UPDATE notifications SET read_at = NULL WHERE id = ?"
                } else {
                    sql = "UPDATE notifications SET read_at = ? WHERE id = ?"
                }

                var stmt: OpaquePointer?
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                defer { sqlite3_finalize(stmt) }

                if let readAtMs {
                    sqlite3_bind_int64(stmt, 1, readAtMs)
                    sqlite3_bind_text(stmt, 2, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                } else {
                    sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                }

                let result = sqlite3_step(stmt)
                let changes = sqlite3_changes(db)
                if isVerbose {
                    print("📱 [DatabaseAccess] 🔍 [SetReadAt] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                }

                if result == SQLITE_DONE {
                    return .success
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Step failed: \(result) - \(errorMsg)")
                }
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(true)
            default:
                completion(false)
            }
        }
    }
    
    /// Fetch a single notification by ID from database
    /// Returns notification data as dictionary with all fields parsed
    /// - Parameters:
    ///   - notificationId: Notification ID to fetch
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    /// - Returns: Dictionary with notification data or nil if not found
    public static func fetchNotification(
        byId notificationId: String,
        source: String = "DatabaseAccess"
    ) -> [String: Any]? {
        var notificationData: [String: Any]? = nil
        let semaphore = DispatchSemaphore(value: 0)
        
        performDatabaseOperation(
            type: .read,
            name: "FetchNotification",
            source: source,
            verboseLogging: false,
            operation: { db, isVerbose in
                let sql = "SELECT id, created_at, read_at, bucket_id, has_attachments, fragment FROM notifications WHERE id = ? LIMIT 1"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                
                if sqlite3_step(stmt) == SQLITE_ROW {
                    // Parse fragment JSON column
                    if let jsonText = sqlite3_column_text(stmt, 5) {
                        let jsonString = String(cString: jsonText)
                        if let jsonData = jsonString.data(using: .utf8),
                           let parsedData = try? JSONSerialization.jsonObject(with: jsonData) as? [String: Any] {
                            notificationData = parsedData
                            
                            // Include read_at from column (index 2) if present
                            // This is critical for CloudKit sync to detect if notification is already read
                            let readAtColumnType = sqlite3_column_type(stmt, 2)
                            if readAtColumnType == SQLITE_INTEGER {
                                let readAtValue = sqlite3_column_int64(stmt, 2)
                                notificationData?["read_at"] = readAtValue
                            } else if readAtColumnType == SQLITE_TEXT {
                                // Handle TEXT format if used
                                if let readAtText = sqlite3_column_text(stmt, 2) {
                                    let readAtString = String(cString: readAtText)
                                    if let readAtInt64 = Int64(readAtString) {
                                        notificationData?["read_at"] = readAtInt64
                                    }
                                }
                            }
                            
                            if isVerbose {
                                print("📱 [DatabaseAccess] ✅ [FetchNotification] Found notification: \(notificationId)")
                            }
                        }
                    }
                    return .success
                } else {
                    if isVerbose {
                        print("📱 [DatabaseAccess] ⚠️ [FetchNotification] Notification not found: \(notificationId)")
                    }
                    return .success // Not an error, just not found
                }
            }
        ) { _ in
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + DB_OPERATION_TIMEOUT)
        return notificationData
    }
    
    /// Delete notification from local database
    /// - Parameters:
    ///   - notificationId: The notification ID to delete
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status
    public static func deleteNotification(
        notificationId: String,
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void = { _ in }
    ) {
        performDatabaseOperation(
            type: .write,
            name: "DeleteNotification",
            source: source,
            operation: { db, isVerbose in
                let sql = "DELETE FROM notifications WHERE id = ?"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                
                let result = sqlite3_step(stmt)
                let changes = sqlite3_changes(db)
                if isVerbose {
                    print("📱 [DatabaseAccess] 🔍 [DeleteNotification] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                }
                
                if result == SQLITE_DONE {
                    return .success
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Step failed: \(result) - \(errorMsg)")
                }
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(true)
            default:
                completion(false)
            }
        }
    }
    
    /// Delete multiple notifications from database in a single batch operation
    /// - Parameters:
    ///   - notificationIds: Array of notification IDs to delete
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status and count of deleted records
    public static func deleteNotifications(
        notificationIds: [String],
        source: String = "DatabaseAccess",
        completion: @escaping (Bool, Int) -> Void = { _, _ in }
    ) {
        guard !notificationIds.isEmpty else {
            completion(true, 0)
            return
        }
        
        performDatabaseOperation(
            type: .write,
            name: "DeleteNotificationsBatch",
            source: source,
            operation: { db, isVerbose in
                let placeholders = Array(repeating: "?", count: notificationIds.count).joined(separator: ",")
                let sql = "DELETE FROM notifications WHERE id IN (\(placeholders))"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                for (index, notificationId) in notificationIds.enumerated() {
                    let bindResult = sqlite3_bind_text(
                        stmt,
                        Int32(index + 1),
                        (notificationId as NSString).utf8String,
                        -1,
                        unsafeBitCast(-1, to: sqlite3_destructor_type.self)
                    )
                    guard bindResult == SQLITE_OK else {
                        let errorMsg = String(cString: sqlite3_errmsg(db))
                        return .failure("Failed to bind parameter \(index + 1): \(errorMsg)")
                    }
                }
                
                let result = sqlite3_step(stmt)
                if result == SQLITE_DONE {
                    let changes = sqlite3_changes(db)
                    if isVerbose {
                        print("📱 [DatabaseAccess] 🔍 [DeleteNotificationsBatch] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                    }
                    // Store changes count - we'll use it in completion
                    // Note: sqlite3_changes() returns the number of rows affected by the last statement
                    return .success
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Step failed: \(result) - \(errorMsg)")
                }
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                // For batch delete, we expect all IDs to be deleted
                // sqlite3_changes() would give exact count but is only valid immediately after the operation
                // Using notificationIds.count is reasonable since we're deleting by ID (should match exactly)
                completion(true, notificationIds.count)
            default:
                completion(false, 0)
            }
        }
    }
    
    /// Set readAt timestamp for multiple notifications in a single batch operation
    /// - Parameters:
    ///   - readAtMap: Dictionary mapping notification IDs to their readAt timestamps (nil to clear)
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with success status and count of updated records
    public static func setNotificationsReadAt(
        readAtMap: [String: Int64?],
        source: String = "DatabaseAccess",
        completion: @escaping (Bool, Int) -> Void = { _, _ in }
    ) {
        guard !readAtMap.isEmpty else {
            completion(true, 0)
            return
        }
        
        performDatabaseOperation(
            type: .write,
            name: "SetNotificationsReadAtBatch",
            source: source,
            operation: { db, isVerbose in
                var totalChanges = 0
                
                for (notificationId, readAtMs) in readAtMap {
                    let sql: String
                    if readAtMs == nil {
                        sql = "UPDATE notifications SET read_at = NULL WHERE id = ?"
                    } else {
                        sql = "UPDATE notifications SET read_at = ? WHERE id = ?"
                    }
                    
                    var stmt: OpaquePointer?
                    let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                    guard prepareResult == SQLITE_OK else {
                        let errorMsg = String(cString: sqlite3_errmsg(db))
                        return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                    }
                    defer { sqlite3_finalize(stmt) }
                    
                    if let readAtMs {
                        sqlite3_bind_int64(stmt, 1, readAtMs)
                        sqlite3_bind_text(stmt, 2, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                    } else {
                        sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                    }
                    
                    let result = sqlite3_step(stmt)
                    if result == SQLITE_DONE {
                        totalChanges += Int(sqlite3_changes(db))
                    } else {
                        let errorMsg = String(cString: sqlite3_errmsg(db))
                        return .failure("Step failed: \(result) - \(errorMsg)")
                    }
                }
                
                if isVerbose {
                    print("📱 [DatabaseAccess] 🔍 [SetNotificationsReadAtBatch] Updated \(totalChanges) notifications")
                }
                
                return .success
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                // totalChanges was accumulated during the operation
                // We'll use readAtMap.count as the count since we updated each one
                completion(true, readAtMap.count)
            default:
                completion(false, 0)
            }
        }
    }
    
    /// Get notification count from database (unread only)
    /// - Parameters:
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with count (0 if error)
    public static func getNotificationCount(
        source: String = "DatabaseAccess",
        completion: @escaping (Int) -> Void
    ) {
        var resultCount = 0
        
        performDatabaseOperation(
            type: .read,
            name: "GetNotificationCount",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT COUNT(*) FROM notifications WHERE read_at IS NULL"
                var stmt: OpaquePointer?
                
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare statement")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                guard sqlite3_step(stmt) == SQLITE_ROW else {
                    return .failure("No row returned")
                }
                
                resultCount = Int(sqlite3_column_int(stmt, 0))
                return .success
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(resultCount)
            default:
                completion(0)
            }
        }
    }
    
    /// Get total notification count from database (all notifications, read and unread)
    /// - Parameters:
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with count (0 if error)
    public static func getTotalNotificationCount(
        source: String = "DatabaseAccess",
        completion: @escaping (Int) -> Void
    ) {
        var resultCount = 0
        
        performDatabaseOperation(
            type: .read,
            name: "GetTotalNotificationCount",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT COUNT(*) FROM notifications"
                var stmt: OpaquePointer?
                
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare statement")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                guard sqlite3_step(stmt) == SQLITE_ROW else {
                    return .failure("No row returned")
                }
                
                resultCount = Int(sqlite3_column_int(stmt, 0))
                return .success
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(resultCount)
            default:
                completion(0)
            }
        }
    }
    
    /// Check if notification exists in database
    /// - Parameters:
    ///   - notificationId: The notification ID to check
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with existence status
    public static func notificationExists(
        notificationId: String,
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void
    ) {
        performDatabaseOperation(
            type: .read,
            name: "NotificationExists",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT id FROM notifications WHERE id = ? LIMIT 1"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                
                let result = sqlite3_step(stmt)
                // Return success if row found, failure if not found
                return result == SQLITE_ROW ? .success : .failure("Not found")
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(true)
            default:
                completion(false)
            }
        }
    }

    /// Upsert notification from CloudKit record. Builds fragment matching NotificationFragment structure.
    public static func upsertNotificationFromCloudKit(
        id: String,
        bucketId: String,
        title: String,
        body: String,
        subtitle: String?,
        createdAt: String,
        readAt: Date?,
        attachments: [[String: Any]],
        actions: [[String: Any]],
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void
    ) {
        let readAtStr = readAt.map { String(Int64($0.timeIntervalSince1970 * 1000)) }
        let fragment: [String: Any] = [
            "id": id,
            "createdAt": createdAt,
            "readAt": readAtStr as Any,
            "message": [
                "title": title,
                "body": body,
                "subtitle": subtitle as Any,
                "bucket": ["id": bucketId, "name": "", "color": NSNull(), "iconUrl": NSNull()],
                "attachments": attachments,
                "actions": actions
            ]
        ]
        guard let fragmentData = try? JSONSerialization.data(withJSONObject: fragment),
              let fragmentString = String(data: fragmentData, encoding: .utf8) else {
            completion(false)
            return
        }
        let hasAttachments = attachments.isEmpty ? 0 : 1
        performDatabaseOperation(
            type: .write,
            name: "UpsertNotificationFromCloudKit",
            source: source,
            operation: { db, _ in
                let sql = """
                    INSERT INTO notifications (id, created_at, read_at, bucket_id, bucket_icon_url, has_attachments, fragment)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        created_at = excluded.created_at,
                        read_at = excluded.read_at,
                        bucket_id = excluded.bucket_id,
                        fragment = excluded.fragment,
                        has_attachments = excluded.has_attachments
                """
                var stmt: OpaquePointer?
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare upsert statement")
                }
                defer { sqlite3_finalize(stmt) }
                sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_text(stmt, 2, (createdAt as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                if let readAtStr, let cstr = (readAtStr as NSString).utf8String {
                    sqlite3_bind_text(stmt, 3, cstr, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                } else {
                    sqlite3_bind_null(stmt, 3)
                }
                sqlite3_bind_text(stmt, 4, (bucketId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_null(stmt, 5)
                sqlite3_bind_int(stmt, 6, Int32(hasAttachments))
                sqlite3_bind_text(stmt, 7, (fragmentString as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                return sqlite3_step(stmt) == SQLITE_DONE ? .success : .failure("Upsert failed")
            }
        ) { result in
            switch result {
            case .success: completion(true)
            default: completion(false)
            }
        }
    }

    /// Upsert bucket from CloudKit record.
    public static func upsertBucketFromCloudKit(
        id: String,
        name: String,
        color: String?,
        iconUrl: String?,
        source: String = "DatabaseAccess",
        completion: @escaping (Bool) -> Void
    ) {
        let now = ISO8601DateFormatter().string(from: Date())
        let fragment: [String: Any] = [
            "id": id,
            "name": name,
            "color": color as Any,
            "iconUrl": iconUrl as Any
        ]
        guard let fragmentData = try? JSONSerialization.data(withJSONObject: fragment),
              let fragmentString = String(data: fragmentData, encoding: .utf8) else {
            completion(false)
            return
        }
        performDatabaseOperation(
            type: .write,
            name: "UpsertBucketFromCloudKit",
            source: source,
            operation: { db, _ in
                let sql = """
                    INSERT INTO buckets (id, name, icon, description, fragment, updated_at, synced_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                    ON CONFLICT(id) DO UPDATE SET
                        name = excluded.name,
                        fragment = excluded.fragment,
                        updated_at = excluded.updated_at
                """
                var stmt: OpaquePointer?
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare upsert statement")
                }
                defer { sqlite3_finalize(stmt) }
                sqlite3_bind_text(stmt, 1, (id as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_text(stmt, 2, (name as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_null(stmt, 3)
                sqlite3_bind_null(stmt, 4)
                sqlite3_bind_text(stmt, 5, (fragmentString as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_text(stmt, 6, (now as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_int64(stmt, 7, Int64(Date().timeIntervalSince1970 * 1000))
                return sqlite3_step(stmt) == SQLITE_DONE ? .success : .failure("Upsert failed")
            }
        ) { result in
            switch result {
            case .success: completion(true)
            default: completion(false)
            }
        }
    }
    
    // MARK: - Generic Database Operation Handler
    
    /// Generic database operation executor with timeout protection, retry logic and error handling
    /// - Parameters:
    ///   - operationType: Type of operation (read/write)
    ///   - operationName: Name for logging purposes
    ///   - timeout: Maximum time allowed for operation (default: 10 seconds)
    ///   - source: Source identifier for logging (NSE/NCE/AppDelegate)
    ///   - operation: The actual database operation to perform
    ///   - verboseLogging: Whether to log detailed operation steps (default: true for write operations, false for read)
    ///   - completion: Completion handler with result
    public static func performDatabaseOperation(
        type operationType: DatabaseOperationType,
        name operationName: String,
        timeout: TimeInterval = DB_OPERATION_TIMEOUT,
        source: String = "Unknown",
        verboseLogging: Bool? = nil,
        operation: @escaping (OpaquePointer, Bool) -> DatabaseOperationResult,
        completion: @escaping (DatabaseOperationResult) -> Void
    ) {
        // Execute on dedicated serial queue
        dbQueue.async {
            // Reject new operations while the app is being suspended (prevents 0xdead10cc)
            suspendLock.lock()
            let suspending = isSuspending
            suspendLock.unlock()
            if suspending {
                completion(.failure("App is suspending"))
                return
            }

            let startTime = Date()
            var operationCompleted = false
            var finalResult: DatabaseOperationResult = .timeout
            
            // Determine if verbose logging should be enabled (default: false to reduce log noise)
            let isVerbose = verboseLogging ?? false
            
            // Timeout protection: dispatch operation with timeout
            let timeoutWorkItem = DispatchWorkItem {
                if isVerbose {
                print("📱 [\(source)] 🔓 [\(operationName)] Starting database operation...")
                }
                
                guard let dbPath = getDbPath() else {
                    print("📱 [\(source)] ❌ [\(operationName)] Failed to get DB path")
                    finalResult = .failure("DB path not available")
                    operationCompleted = true
                    return
                }
                
                if isVerbose {
                print("📱 [\(source)] 📂 [\(operationName)] DB path: \(dbPath)")
                }
                
                // Acquire file lock to prevent conflicts with expo-sqlite
                guard acquireLock(for: dbPath, type: operationType, verbose: isVerbose) else {
                    print("📱 [\(source)] ⏸️ [\(operationName)] Could not acquire lock, database busy")
                    finalResult = .locked
                    operationCompleted = true
                    return
                }
                
                defer {
                    releaseLock(verbose: isVerbose)
                }
                
                // Check if database file exists
                let fileManager = FileManager.default
                let dbExists = fileManager.fileExists(atPath: dbPath)
                
                // For read operations, if database doesn't exist, return empty result
                if operationType == .read && !dbExists {
                    if isVerbose {
                    print("📱 [\(source)] ℹ️ [\(operationName)] Database does not exist yet, returning empty result")
                    }
                    finalResult = .success
                    operationCompleted = true
                    return
                }
                
                var db: OpaquePointer?
                
                // Open database with appropriate flags
                // Important: For WAL mode, even read operations need READWRITE access to WAL/SHM files
                // Only use READONLY if database doesn't exist yet (which we handle above)
                let openFlags = operationType == .read ? 
                    SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX :
                    SQLITE_OPEN_READWRITE | SQLITE_OPEN_CREATE | SQLITE_OPEN_FULLMUTEX
                
                if isVerbose {
                print("📱 [\(source)] 🔐 [\(operationName)] Attempting to open database with flags: \(openFlags)...")
                }
                let openStartTime = Date()
                var result = sqlite3_open_v2(dbPath, &db, openFlags, nil)
                let openElapsed = Date().timeIntervalSince(openStartTime)
                if isVerbose {
                print("📱 [\(source)] 🔓 [\(operationName)] Database open attempt completed in \(String(format: "%.3f", openElapsed))s with result: \(result)")
                }
                
                if result != SQLITE_OK {
                    let errorMsg = "Failed to open database: \(result)"
                    print("📱 [\(source)] ❌ [\(operationName)] \(errorMsg)")
                    LoggingSystem.shared.log(
                        level: "ERROR",
                        tag: "\(source)-DB",
                        message: "[\(operationName)] \(errorMsg)",
                        metadata: ["sqliteError": String(result)],
                        source: source
                    )
                    finalResult = .failure(errorMsg)
                    operationCompleted = true
                    return
                }
                
                guard let database = db else {
                    finalResult = .failure("Database pointer is nil")
                    operationCompleted = true
                    return
                }
                
                defer {
                    sqlite3_close(database)
                }
                
                // Configure SQLite for concurrent access with WAL mode
                // WAL allows multiple concurrent readers (critical when app is foreground)
                sqlite3_busy_timeout(database, DB_BUSY_TIMEOUT)
                
                // Check current journal mode and set WAL if needed
                var pragmaStmt: OpaquePointer?
                if sqlite3_prepare_v2(database, "PRAGMA journal_mode", -1, &pragmaStmt, nil) == SQLITE_OK {
                    let stepResult = sqlite3_step(pragmaStmt)
                    if stepResult == SQLITE_ROW {
                        if let modeCString = sqlite3_column_text(pragmaStmt, 0) {
                            let mode = String(cString: modeCString)
                            if isVerbose {
                            print("📱 [\(source)] ℹ️ [\(operationName)] Current journal mode: \(mode)")
                            }
                            
                            // Only set WAL mode for write operations or if not already in WAL mode
                            if operationType == .write && mode.uppercased() != "WAL" {
                                sqlite3_finalize(pragmaStmt)
                                if sqlite3_prepare_v2(database, "PRAGMA journal_mode=WAL", -1, &pragmaStmt, nil) == SQLITE_OK {
                                    let walStepResult = sqlite3_step(pragmaStmt)
                                    if walStepResult == SQLITE_ROW {
                                        if let walModeCString = sqlite3_column_text(pragmaStmt, 0) {
                                            let walMode = String(cString: walModeCString)
                                            print("📱 [\(source)] ✅ [\(operationName)] Set journal mode to: \(walMode)")
                                        }
                                    }
                                    sqlite3_finalize(pragmaStmt)
                                    
                                    // Optimize WAL checkpoint
                                    if sqlite3_prepare_v2(database, "PRAGMA wal_autocheckpoint=1000", -1, &pragmaStmt, nil) == SQLITE_OK {
                                        sqlite3_step(pragmaStmt)
                                        sqlite3_finalize(pragmaStmt)
                                    }
                                }
                            } else {
                                sqlite3_finalize(pragmaStmt)
                            }
                        } else {
                            sqlite3_finalize(pragmaStmt)
                        }
                    } else {
                        sqlite3_finalize(pragmaStmt)
                    }
                }
                
                // Ensure notifications table exists (create if missing)
                // This is critical for extensions that may run before main app
                let createNotificationsTableSQL = """
                    CREATE TABLE IF NOT EXISTS notifications (
                        id TEXT PRIMARY KEY,
                        created_at TEXT NOT NULL,
                        read_at TEXT,
                        bucket_id TEXT NOT NULL,
                        has_attachments INTEGER NOT NULL DEFAULT 0 CHECK (has_attachments IN (0,1)),
                        fragment TEXT NOT NULL
                    );
                    """
                var createStmt: OpaquePointer?
                if sqlite3_prepare_v2(database, createNotificationsTableSQL, -1, &createStmt, nil) == SQLITE_OK {
                    sqlite3_step(createStmt)
                    sqlite3_finalize(createStmt)
                    if isVerbose {
                    print("📱 [\(source)] ✅ [\(operationName)] Notifications table schema verified")
                    }
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(database))
                    print("📱 [\(source)] ⚠️ [\(operationName)] Failed to create notifications table: \(errorMsg)")
                }
                
                // Ensure buckets table exists (create if missing)
                let createBucketsTableSQL = """
                    CREATE TABLE IF NOT EXISTS buckets (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL,
                        fragment TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    );
                    """
                if sqlite3_prepare_v2(database, createBucketsTableSQL, -1, &createStmt, nil) == SQLITE_OK {
                    sqlite3_step(createStmt)
                    sqlite3_finalize(createStmt)
                    if isVerbose {
                    print("📱 [\(source)] ✅ [\(operationName)] Buckets table schema verified")
                    }
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(database))
                    print("📱 [\(source)] ⚠️ [\(operationName)] Failed to create buckets table: \(errorMsg)")
                }
                
                // For write operations, use immediate transaction
                if operationType == .write {
                    var beginStmt: OpaquePointer?
                    result = sqlite3_prepare_v2(database, "BEGIN IMMEDIATE TRANSACTION", -1, &beginStmt, nil)
                    if result == SQLITE_OK {
                        result = sqlite3_step(beginStmt)
                        sqlite3_finalize(beginStmt)
                        
                        if result != SQLITE_DONE {
                            print("📱 [\(source)] ⚠️ [\(operationName)] Failed to begin transaction: \(result)")
                        }
                    }
                }
                
                // Execute the actual operation with retry logic
                var retries = DB_MAX_RETRIES
                var operationResult: DatabaseOperationResult = .failure("Max retries exceeded")
                
                while retries >= 0 && !operationCompleted {
                    // Check if we're approaching timeout
                    let elapsed = Date().timeIntervalSince(startTime)
                    if elapsed >= timeout * 0.9 {  // 90% of timeout
                        print("📱 [\(source)] ⚠️ [\(operationName)] Approaching timeout (\(elapsed)s), aborting")
                        operationResult = .timeout
                        break
                    }
                    
                    operationResult = operation(database, isVerbose)
                    
                    switch operationResult {
                    case .success:
                        // Success, exit retry loop
                        retries = -1
                        
                    case .locked:
                        if retries > 0 {
                            let attempt = DB_MAX_RETRIES - retries
                            let delayMs = 200000 * (1 << attempt)  // Exponential backoff: 200ms, 400ms, 800ms, 1.6s, 3.2s
                            print("📱 [\(source)] 🔄 [\(operationName)] Database locked, retrying in \(delayMs/1000)ms... (\(retries) left)")
                            retries -= 1
                            usleep(UInt32(delayMs))
                        } else {
                            print("📱 [\(source)] ❌ [\(operationName)] Max retries exceeded")
                            retries = -1
                        }
                        
                    case .failure(let msg) where msg.contains("BUSY") || msg.contains("LOCKED"):
                        if retries > 0 {
                            let attempt = DB_MAX_RETRIES - retries
                            let delayMs = 200000 * (1 << attempt)  // Exponential backoff
                            print("📱 [\(source)] 🔄 [\(operationName)] Database busy (\(msg)), retrying in \(delayMs/1000)ms... (\(retries) left)")
                            retries -= 1
                            usleep(UInt32(delayMs))
                        } else {
                            print("📱 [\(source)] ❌ [\(operationName)] Max retries exceeded")
                            retries = -1
                        }
                        
                    case .timeout:
                        print("📱 [\(source)] ⏱️ [\(operationName)] Operation timeout")
                        retries = -1
                        
                    case .failure(let error):
                        print("📱 [\(source)] ❌ [\(operationName)] Operation failed: \(error)")
                        retries = -1
                    }
                }
                
                // Commit or rollback transaction for write operations
                if operationType == .write {
                    var endStmt: OpaquePointer?
                    let endSQL: String
                    if case .success = operationResult {
                        endSQL = "COMMIT"
                    } else {
                        endSQL = "ROLLBACK"
                    }
                    if sqlite3_prepare_v2(database, endSQL, -1, &endStmt, nil) == SQLITE_OK {
                        sqlite3_step(endStmt)
                        sqlite3_finalize(endStmt)
                    }
                }
                
                finalResult = operationResult
                operationCompleted = true
            }
            
            // Execute the operation directly (we're already on dbQueue)
            // DO NOT dispatch async again on the same serial queue - that causes deadlock!
            timeoutWorkItem.perform()
            
            // Check if operation completed or timed out (operationCompleted is set by the operation)
            if !operationCompleted {
                timeoutWorkItem.cancel()
                print("📱 [\(source)] ⏱️ [\(operationName)] Operation timed out after \(timeout)s")
                LoggingSystem.shared.log(
                    level: "WARNING",
                    tag: "\(source)-DB",
                    message: "[\(operationName)] Operation timed out",
                    metadata: ["timeout": String(timeout)],
                    source: source
                )
                finalResult = .timeout
            }
            
            // Log final result (always log errors, conditionally log success)
            let elapsed = Date().timeIntervalSince(startTime)
            switch finalResult {
            case .success:
                if isVerbose {
                print("📱 [\(source)] ✅ [\(operationName)] Completed in \(String(format: "%.3f", elapsed))s")
                }
            case .failure(let error):
                print("📱 [\(source)] ❌ [\(operationName)] Failed: \(error)")
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "\(source)-DB",
                    message: "[\(operationName)] Failed: \(error)",
                    metadata: ["elapsed": String(format: "%.3f", elapsed)],
                    source: source
                )
            case .timeout:
                print("📱 [\(source)] ⏱️ [\(operationName)] Timeout after \(String(format: "%.3f", elapsed))s")
            case .locked:
                print("📱 [\(source)] 🔒 [\(operationName)] Database locked after \(String(format: "%.3f", elapsed))s")
            }
            
            // Call completion on a global queue to avoid deadlocks.
            // Previously this dispatched to main thread, which caused deadlocks
            // when synchronous wrappers (e.g. setSettingValueSync) blocked the
            // main thread with a semaphore while waiting for this completion.
            DispatchQueue.global(qos: .userInitiated).async {
                completion(finalResult)
            }
        }
    }
    
    // MARK: - Settings / KV Repository Operations (use shared lock via performDatabaseOperation)
    
    /// Get a value from app_settings table (key-value store). Uses shared DB lock.
    public static func getSettingValue(key: String, completion: @escaping (String?) -> Void) {
        var captured: String?
        performDatabaseOperation(
            type: .read,
            name: "KVGet",
            source: "RNBridge",
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT value FROM app_settings WHERE key = ? LIMIT 1"
                var stmt: OpaquePointer?
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure(String(cString: sqlite3_errmsg(db)))
                }
                defer { sqlite3_finalize(stmt) }
                sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                if sqlite3_step(stmt) == SQLITE_ROW, let cString = sqlite3_column_text(stmt, 0) {
                    captured = String(cString: cString)
                }
                return .success
            },
            completion: { (dbResult: DatabaseOperationResult) in
                switch dbResult {
                case .success: completion(captured)
                default: completion(nil)
                }
            }
        )
    }
    
    /// Set a value in app_settings table (key-value store). Uses shared DB lock.
    public static func setSettingValue(key: String, value: String, completion: @escaping (Bool) -> Void) {
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        performDatabaseOperation(
            type: .write,
            name: "KVSet",
            source: "RNBridge",
            verboseLogging: false,
            operation: { db, _ in
                let sql = """
                    INSERT INTO app_settings (key, value, updated_at)
                    VALUES (?, ?, ?)
                    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
                    """
                var stmt: OpaquePointer?
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure(String(cString: sqlite3_errmsg(db)))
                }
                defer { sqlite3_finalize(stmt) }
                sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_text(stmt, 2, (value as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                sqlite3_bind_int64(stmt, 3, timestamp)
                return sqlite3_step(stmt) == SQLITE_DONE ? .success : .failure(String(cString: sqlite3_errmsg(db)))
            },
            completion: { (dbResult: DatabaseOperationResult) in
                switch dbResult {
                case .success: completion(true)
                default: completion(false)
                }
            }
        )
    }
    
    /// Remove a value from app_settings table. Uses shared DB lock.
    public static func removeSettingValue(key: String, completion: @escaping (Bool) -> Void) {
        performDatabaseOperation(
            type: .write,
            name: "KVRemove",
            source: "RNBridge",
            verboseLogging: false,
            operation: { db, _ in
                let sql = "DELETE FROM app_settings WHERE key = ?"
                var stmt: OpaquePointer?
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure(String(cString: sqlite3_errmsg(db)))
                }
                defer { sqlite3_finalize(stmt) }
                sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                return sqlite3_step(stmt) == SQLITE_DONE ? .success : .failure(String(cString: sqlite3_errmsg(db)))
            },
            completion: { (dbResult: DatabaseOperationResult) in
                switch dbResult {
                case .success: completion(true)
                default: completion(false)
                }
            }
        )
    }
    
    /// Get all keys from app_settings table. Uses shared DB lock.
    public static func getAllSettingKeys(completion: @escaping ([String]) -> Void) {
        var keys: [String] = []
        performDatabaseOperation(
            type: .read,
            name: "KVGetAllKeys",
            source: "RNBridge",
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT key FROM app_settings ORDER BY key"
                var stmt: OpaquePointer?
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure(String(cString: sqlite3_errmsg(db)))
                }
                defer { sqlite3_finalize(stmt) }
                while sqlite3_step(stmt) == SQLITE_ROW {
                    if let cString = sqlite3_column_text(stmt, 0) {
                        keys.append(String(cString: cString))
                    }
                }
                return .success
            },
            completion: { (dbResult: DatabaseOperationResult) in
                switch dbResult {
                case .success: completion(keys)
                default: completion([])
                }
            }
        )
    }
    
    /// Synchronous wrappers for callers that cannot use completion (e.g. KeychainAccess, NotificationActionHandler).
    /// Prefer the completion-based API from React Native to avoid blocking.
    public static func getSettingValueSync(key: String) -> String? {
        var result: String?
        let sem = DispatchSemaphore(value: 0)
        getSettingValue(key: key) { value in
            result = value
            sem.signal()
        }
        sem.wait()
        return result
    }
    
    public static func setSettingValueSync(key: String, value: String) -> Bool {
        var success = false
        let sem = DispatchSemaphore(value: 0)
        setSettingValue(key: key, value: value) { ok in
            success = ok
            sem.signal()
        }
        sem.wait()
        return success
    }
    
    public static func removeSettingValueSync(key: String) -> Bool {
        var success = false
        let sem = DispatchSemaphore(value: 0)
        removeSettingValue(key: key) { ok in
            success = ok
            sem.signal()
        }
        sem.wait()
        return success
    }
    
    // MARK: - Widget Bucket Operations
    
    // Note: WidgetBucket, WidgetAttachment, and WidgetNotification are now defined in SharedTypes.swift
    // They are available globally without any prefix
    
    /// Get all buckets from database
    /// - Parameters:
    ///   - source: Source identifier for logging (default: "Widget")
    ///   - completion: Completion handler with array of buckets
    public static func getAllBuckets(
        source: String = "Widget",
        completion: @escaping ([WidgetBucket]) -> Void
    ) {
        var buckets: [WidgetBucket] = []
        
        performDatabaseOperation(
            type: .read,
            name: "GetAllBuckets",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT id, name, fragment, updated_at FROM buckets ORDER BY name ASC"
                var stmt: OpaquePointer?
                
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare statement")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                while sqlite3_step(stmt) == SQLITE_ROW {
                    guard let idCString = sqlite3_column_text(stmt, 0),
                          let nameCString = sqlite3_column_text(stmt, 1),
                          let fragmentCString = sqlite3_column_text(stmt, 2) else {
                        continue
                    }
                    
                    let id = String(cString: idCString)
                    let name = String(cString: nameCString)
                    let fragment = String(cString: fragmentCString)
                    
                    // Parse fragment JSON
                    guard let fragmentData = fragment.data(using: .utf8),
                          let fragmentJson = try? JSONSerialization.jsonObject(with: fragmentData) as? [String: Any] else {
                        continue
                    }
                    
                    // Extract color and iconUrl from fragment
                    let color = fragmentJson["color"] as? String
                    let iconUrl = fragmentJson["iconUrl"] as? String
                    
                    // Calculate unread count for this bucket
                    // Query notifications table for unread notifications in this bucket
                    var unreadCount = 0
                    let unreadSql = "SELECT COUNT(*) FROM notifications WHERE bucket_id = ? AND read_at IS NULL"
                    var unreadStmt: OpaquePointer?
                    if sqlite3_prepare_v2(db, unreadSql, -1, &unreadStmt, nil) == SQLITE_OK {
                        sqlite3_bind_text(unreadStmt, 1, (id as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                        if sqlite3_step(unreadStmt) == SQLITE_ROW {
                            unreadCount = Int(sqlite3_column_int(unreadStmt, 0))
                        }
                        sqlite3_finalize(unreadStmt)
                    }
                    
                    let bucket = WidgetBucket(
                        id: id,
                        name: name,
                        unreadCount: unreadCount,
                        color: color,
                        iconUrl: iconUrl
                    )
                    
                    buckets.append(bucket)
                }
                
                return .success
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(buckets)
            default:
                completion([])
            }
        }
    }
    
    /// Get a single bucket by ID from database
    /// Returns bucket data as WidgetBucket
    /// - Parameters:
    ///   - bucketId: Bucket ID to fetch
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    /// - Returns: WidgetBucket with bucket data or nil if not found
    public static func getBucketById(
        bucketId: String,
        source: String = "DatabaseAccess"
    ) -> WidgetBucket? {
        var bucket: WidgetBucket? = nil
        let semaphore = DispatchSemaphore(value: 0)
        
        performDatabaseOperation(
            type: .read,
            name: "GetBucketById",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                let sql = "SELECT name, fragment, updated_at FROM buckets WHERE id = ? LIMIT 1"
                var stmt: OpaquePointer?
                
                let prepareResult = sqlite3_prepare_v2(db, sql, -1, &stmt, nil)
                guard prepareResult == SQLITE_OK else {
                    let errorMsg = String(cString: sqlite3_errmsg(db))
                    return .failure("Failed to prepare statement: \(errorMsg) (code: \(prepareResult))")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                sqlite3_bind_text(stmt, 1, (bucketId as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
                
                if sqlite3_step(stmt) == SQLITE_ROW {
                    guard let nameCString = sqlite3_column_text(stmt, 0),
                          let fragmentCString = sqlite3_column_text(stmt, 1) else {
                        return .success // Not found
                    }
                    
                    let name = String(cString: nameCString)
                    let fragment = String(cString: fragmentCString)
                    
                    // Parse fragment JSON
                    guard let fragmentData = fragment.data(using: .utf8),
                          let fragmentJson = try? JSONSerialization.jsonObject(with: fragmentData) as? [String: Any] else {
                        return .success // Invalid fragment
                    }
                    
                    // Extract fields from fragment
                    let color = fragmentJson["color"] as? String
                    let iconUrl = fragmentJson["iconUrl"] as? String
                    
                    bucket = WidgetBucket(
                        id: bucketId,
                        name: name,
                        unreadCount: 0, // Not needed for bucket data only
                        color: color,
                        iconUrl: iconUrl
                    )
                    
                    return .success
                } else {
                    return .success // Not found
                }
            }
        ) { _ in
            semaphore.signal()
        }
        
        _ = semaphore.wait(timeout: .now() + DB_OPERATION_TIMEOUT)
        return bucket
    }
    
    // MARK: - Widget Notification Operations

    /// Apply the same title/body fallback used in NSE:
    /// If only one of title/body is provided, show the message in the body and
    /// (when available) use the bucket name (from payload or SQLite) as title.
    ///
    /// This is intentionally a pure helper (no side effects) except for the optional
    /// SQLite bucket lookup via `getBucketById`.
    public static func applySingleTextFieldTitleBodyBucketFallback(
        title: String,
        body: String,
        bucketIdForLookup: String?,
        bucketNameFromPayload: String? = nil,
        source: String
    ) -> (title: String, body: String, bucketName: String?, applied: Bool) {
        let trimmedTitle = title.trimmingCharacters(in: .whitespacesAndNewlines)
        let trimmedBody = body.trimmingCharacters(in: .whitespacesAndNewlines)
        let hasOnlyOneTextField = (trimmedTitle.isEmpty != trimmedBody.isEmpty)

        guard hasOnlyOneTextField else {
            let bn = bucketNameFromPayload?.trimmingCharacters(in: .whitespacesAndNewlines)
            return (title: title, body: body, bucketName: (bn?.isEmpty == false ? bn : nil), applied: false)
        }

        var resolvedBucketName: String? = bucketNameFromPayload?.trimmingCharacters(in: .whitespacesAndNewlines)
        if resolvedBucketName?.isEmpty != false, let bucketIdForLookup = bucketIdForLookup {
            if let bucket = getBucketById(bucketId: bucketIdForLookup, source: source) {
                let name = bucket.name.trimmingCharacters(in: .whitespacesAndNewlines)
                if !name.isEmpty { resolvedBucketName = name }
            }
        }

        var newTitle = title
        var newBody = body

        // If only title exists, move it to body.
        if trimmedBody.isEmpty && !trimmedTitle.isEmpty {
            newBody = title
        }

        // If bucket name is available, use it as title.
        if let resolvedBucketName = resolvedBucketName, !resolvedBucketName.isEmpty {
            newTitle = resolvedBucketName
        }

        return (title: newTitle, body: newBody, bucketName: resolvedBucketName, applied: true)
    }
    
    /// Get recent notifications for widget display
    /// - Parameters:
    ///   - limit: Maximum number of notifications to return (default: 5)
    ///   - unreadOnly: Whether to return only unread notifications (default: false)
    ///   - source: Source identifier for logging (default: "Widget")
    ///   - completion: Completion handler with array of notifications
    public static func getRecentNotifications(
        limit: Int = 5,
        unreadOnly: Bool = false,
        source: String = "Widget",
        completion: @escaping ([WidgetNotification]) -> Void
    ) {
        var notifications: [WidgetNotification] = []
        
        performDatabaseOperation(
            type: .read,
            name: "GetRecentNotifications",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                var sql: String
                var stmt: OpaquePointer?
                
                if unreadOnly {
                    sql = "SELECT id, fragment, created_at, read_at, bucket_id FROM notifications WHERE read_at IS NULL ORDER BY created_at DESC LIMIT ?"
                } else {
                    sql = "SELECT id, fragment, created_at, read_at, bucket_id FROM notifications ORDER BY created_at DESC LIMIT ?"
                }
                
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare statement")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                // Ensure limit fits in Int32, use Int32.max as upper bound
                let safeLimit = min(limit, Int(Int32.max))
                guard sqlite3_bind_int64(stmt, 1, Int64(safeLimit)) == SQLITE_OK else {
                    return .failure("Failed to bind limit parameter")
                }
                
                while sqlite3_step(stmt) == SQLITE_ROW {
                    guard let idCString = sqlite3_column_text(stmt, 0),
                          let fragmentCString = sqlite3_column_text(stmt, 1),
                          let createdAtCString = sqlite3_column_text(stmt, 2),
                          let bucketIdCString = sqlite3_column_text(stmt, 4) else {
                        continue
                    }
                    
                    let id = String(cString: idCString)
                    let fragment = String(cString: fragmentCString)
                    let createdAt = String(cString: createdAtCString)
                    let bucketId = String(cString: bucketIdCString)
                    let isRead = sqlite3_column_text(stmt, 3) != nil
                    
                    guard let fragmentData = fragment.data(using: .utf8),
                          let fragmentJson = try? JSONSerialization.jsonObject(with: fragmentData) as? [String: Any],
                          let message = fragmentJson["message"] as? [String: Any] else {
                        continue
                    }
                    
                    let title = message["title"] as? String ?? ""
                    let body = message["body"] as? String ?? ""
                    let subtitle = message["subtitle"] as? String
                    
                    // Extract bucket name, color and icon URL from fragment
                    var bucketName: String? = nil
                    var bucketColor: String? = nil
                    var bucketIconUrl: String? = nil
                    if let bucket = message["bucket"] as? [String: Any] {
                        bucketName = bucket["name"] as? String
                        bucketColor = bucket["color"] as? String
                        bucketIconUrl = bucket["iconUrl"] as? String
                    }
                    
                    // Extract attachments from fragment
                    let attachments = NotificationParser.parseAttachments(from: message["attachments"] as? [[String: Any]])
                    
                    // Extract actions from fragment
                    let actions = NotificationParser.parseActions(from: message["actions"] as? [[String: Any]])
                    
                    let notification = WidgetNotification(
                        id: id,
                        title: title,
                        body: body,
                        subtitle: subtitle,
                        createdAt: createdAt,
                        isRead: isRead,
                        bucketId: bucketId,
                        bucketName: bucketName,
                        bucketColor: bucketColor,
                        bucketIconUrl: bucketIconUrl,
                        attachments: attachments,
                        actions: actions
                    )
                    
                    notifications.append(notification)
                }
                
                return .success
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                completion(notifications)
            default:
                completion([])
            }
        }
    }
    
    /// Fetch read_at timestamps for multiple notifications in a single query
    /// - Parameters:
    ///   - notificationIds: Array of notification IDs to fetch read_at for
    ///   - source: Source identifier for logging (default: "DatabaseAccess")
    ///   - completion: Completion handler with dictionary mapping notification ID to read_at timestamp string
    public static func fetchReadAtTimestamps(
        notificationIds: [String],
        source: String = "DatabaseAccess",
        completion: @escaping ([String: String]) -> Void
    ) {
        guard !notificationIds.isEmpty else {
            completion([:])
            return
        }
        
        var readAtMap: [String: String] = [:]
        
        LoggingSystem.shared.log(level: "INFO", tag: "DatabaseAccess", message: "Fetching read_at timestamps in batch", metadata: ["count": "\(notificationIds.count)"], source: source)
        
        performDatabaseOperation(
            type: .read,
            name: "FetchReadAtTimestamps",
            source: source,
            verboseLogging: false,
            operation: { db, _ in
                // Create placeholders for IN clause: ?, ?, ?, ...
                let placeholders = Array(repeating: "?", count: notificationIds.count).joined(separator: ", ")
                let sql = "SELECT id, read_at FROM notifications WHERE id IN (\(placeholders)) AND read_at IS NOT NULL"
                
                var stmt: OpaquePointer?
                
                guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
                    return .failure("Failed to prepare statement")
                }
                
                defer { sqlite3_finalize(stmt) }
                
                // Bind notification IDs
                for (index, notificationId) in notificationIds.enumerated() {
                    let cString = (notificationId as NSString).utf8String
                    guard sqlite3_bind_text(stmt, Int32(index + 1), cString, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self)) == SQLITE_OK else {
                        return .failure("Failed to bind notification ID at index \(index)")
                    }
                }
                
                // Fetch results
                while sqlite3_step(stmt) == SQLITE_ROW {
                    guard let idCString = sqlite3_column_text(stmt, 0),
                          let readAtCString = sqlite3_column_text(stmt, 1) else {
                        continue
                    }
                    
                    let id = String(cString: idCString)
                    let readAt = String(cString: readAtCString)
                    readAtMap[id] = readAt
                }
                
                return .success
            }
        ) { (dbResult: DatabaseOperationResult) in
            switch dbResult {
            case .success:
                LoggingSystem.shared.log(level: "INFO", tag: "DatabaseAccess", message: "Fetched read_at timestamps in batch", metadata: ["count": "\(readAtMap.count)", "requested": "\(notificationIds.count)"], source: source)
                completion(readAtMap)
            default:
                LoggingSystem.shared.log(level: "ERROR", tag: "DatabaseAccess", message: "Failed to fetch read_at timestamps in batch", source: source)
                completion([:])
            }
        }
    }
}
