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
    
    /// Database operation configuration
    public static let DB_OPERATION_TIMEOUT: TimeInterval = 10.0  // Max 10 seconds per operation
    private static let DB_BUSY_TIMEOUT: Int32 = 5000  // 5 seconds busy timeout
    private static let DB_MAX_RETRIES: Int = 5  // Max 5 retry attempts
    
    // MARK: - Database Path
    
    /// Get database path in App Group shared container
    public static func getDbPath() -> String? {
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        let appGroupId = "group.\(mainBundleId)"
        
        guard let sharedContainerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else {
            return nil
        }
        
        // Database is in shared_media_cache subdirectory (matches TypeScript db-setup.ts)
        let dbPath = sharedContainerURL.appendingPathComponent("shared_media_cache/cache.db").path
        return dbPath
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
            operation: { db in
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
                print("📱 [DatabaseAccess] 🔍 [MarkAsRead] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                
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
            operation: { db in
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
                print("📱 [DatabaseAccess] 🔍 [DeleteNotification] sqlite3_step result: \(result) (SQLITE_DONE=\(SQLITE_DONE)), changes: \(changes)")
                
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
    
    /// Get notification count from database
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
            operation: { db in
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
            operation: { db in
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
    
    // MARK: - Generic Database Operation Handler
    
    /// Generic database operation executor with timeout protection, retry logic and error handling
    /// - Parameters:
    ///   - operationType: Type of operation (read/write)
    ///   - operationName: Name for logging purposes
    ///   - timeout: Maximum time allowed for operation (default: 10 seconds)
    ///   - source: Source identifier for logging (NSE/NCE/AppDelegate)
    ///   - operation: The actual database operation to perform
    ///   - completion: Completion handler with result
    public static func performDatabaseOperation(
        type operationType: DatabaseOperationType,
        name operationName: String,
        timeout: TimeInterval = DB_OPERATION_TIMEOUT,
        source: String = "Unknown",
        operation: @escaping (OpaquePointer) -> DatabaseOperationResult,
        completion: @escaping (DatabaseOperationResult) -> Void
    ) {
        // Execute on dedicated serial queue
        dbQueue.async {
            let startTime = Date()
            var operationCompleted = false
            var finalResult: DatabaseOperationResult = .timeout
            
            // Timeout protection: dispatch operation with timeout
            let timeoutWorkItem = DispatchWorkItem {
                print("📱 [\(source)] 🔓 [\(operationName)] Starting database operation...")
                
                guard let dbPath = getDbPath() else {
                    print("📱 [\(source)] ❌ [\(operationName)] Failed to get DB path")
                    finalResult = .failure("DB path not available")
                    operationCompleted = true
                    return
                }
                
                print("📱 [\(source)] 📂 [\(operationName)] DB path: \(dbPath)")
                
                // Check if database file exists
                let fileManager = FileManager.default
                let dbExists = fileManager.fileExists(atPath: dbPath)
                
                // For read operations, if database doesn't exist, return empty result
                if operationType == .read && !dbExists {
                    print("📱 [\(source)] ℹ️ [\(operationName)] Database does not exist yet, returning empty result")
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
                
                print("📱 [\(source)] 🔐 [\(operationName)] Attempting to open database with flags: \(openFlags)...")
                let openStartTime = Date()
                var result = sqlite3_open_v2(dbPath, &db, openFlags, nil)
                let openElapsed = Date().timeIntervalSince(openStartTime)
                print("📱 [\(source)] 🔓 [\(operationName)] Database open attempt completed in \(String(format: "%.3f", openElapsed))s with result: \(result)")
                
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
                            print("📱 [\(source)] ℹ️ [\(operationName)] Current journal mode: \(mode)")
                            
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
                let createTableSQL = """
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
                if sqlite3_prepare_v2(database, createTableSQL, -1, &createStmt, nil) == SQLITE_OK {
                    sqlite3_step(createStmt)
                    sqlite3_finalize(createStmt)
                    print("📱 [\(source)] ✅ [\(operationName)] Notifications table schema verified")
                } else {
                    let errorMsg = String(cString: sqlite3_errmsg(database))
                    print("📱 [\(source)] ⚠️ [\(operationName)] Failed to create table: \(errorMsg)")
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
                    
                    operationResult = operation(database)
                    
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
            
            // Log final result
            let elapsed = Date().timeIntervalSince(startTime)
            switch finalResult {
            case .success:
                print("📱 [\(source)] ✅ [\(operationName)] Completed in \(String(format: "%.3f", elapsed))s")
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
            
            // Call completion handler on main thread if needed for UI updates
            DispatchQueue.main.async {
                completion(finalResult)
            }
        }
    }
    
    // MARK: - Settings Repository Operations
    
    /// Get a setting value from app_settings table
    /// - Parameter key: The setting key to retrieve
    /// - Returns: The setting value as a string, or nil if not found
    public static func getSettingValue(key: String) -> String? {
        guard let dbPath = getDbPath() else {
            print("📱 [DatabaseAccess] ❌ Failed to get database path")
            return nil
        }
        
        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            print("📱 [DatabaseAccess] ❌ Failed to open database for reading setting: \(key)")
            return nil
        }
        defer { sqlite3_close(db) }
        
        let sql = "SELECT value FROM app_settings WHERE key = ? LIMIT 1"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            print("📱 [DatabaseAccess] ❌ Failed to prepare SELECT statement for key: \(key)")
            return nil
        }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
        
        if sqlite3_step(stmt) == SQLITE_ROW {
            if let cString = sqlite3_column_text(stmt, 0) {
                let value = String(cString: cString)
                print("📱 [DatabaseAccess] ✅ Retrieved setting '\(key)': \(value)")
                return value
            }
        }
        
        print("📱 [DatabaseAccess] ℹ️ Setting '\(key)' not found")
        return nil
    }
    
    /// Set a setting value in app_settings table
    /// - Parameters:
    ///   - key: The setting key
    ///   - value: The setting value
    /// - Returns: True if successful, false otherwise
    @discardableResult
    public static func setSettingValue(key: String, value: String) -> Bool {
        guard let dbPath = getDbPath() else {
            print("📱 [DatabaseAccess] ❌ Failed to get database path")
            return false
        }
        
        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            print("📱 [DatabaseAccess] ❌ Failed to open database for writing setting: \(key)")
            return false
        }
        defer { sqlite3_close(db) }
        
        let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
        let sql = """
            INSERT INTO app_settings (key, value, updated_at)
            VALUES (?, ?, ?)
            ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
            """
        
        var stmt: OpaquePointer?
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            print("📱 [DatabaseAccess] ❌ Failed to prepare INSERT statement for key: \(key)")
            return false
        }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
        sqlite3_bind_text(stmt, 2, (value as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
        sqlite3_bind_int64(stmt, 3, timestamp)
        
        if sqlite3_step(stmt) == SQLITE_DONE {
            print("📱 [DatabaseAccess] ✅ Saved setting '\(key)': \(value)")
            return true
        } else {
            let errorMsg = String(cString: sqlite3_errmsg(db))
            print("📱 [DatabaseAccess] ❌ Failed to save setting '\(key)': \(errorMsg)")
            return false
        }
    }
    
    /// Remove a setting value from app_settings table
    /// - Parameter key: The setting key to remove
    /// - Returns: True if successful, false otherwise
    @discardableResult
    public static func removeSettingValue(key: String) -> Bool {
        guard let dbPath = getDbPath() else {
            print("📱 [DatabaseAccess] ❌ Failed to get database path")
            return false
        }
        
        var db: OpaquePointer?
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            print("📱 [DatabaseAccess] ❌ Failed to open database for removing setting: \(key)")
            return false
        }
        defer { sqlite3_close(db) }
        
        let sql = "DELETE FROM app_settings WHERE key = ?"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            print("📱 [DatabaseAccess] ❌ Failed to prepare DELETE statement for key: \(key)")
            return false
        }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, unsafeBitCast(-1, to: sqlite3_destructor_type.self))
        
        if sqlite3_step(stmt) == SQLITE_DONE {
            print("📱 [DatabaseAccess] ✅ Removed setting '\(key)'")
            return true
        } else {
            let errorMsg = String(cString: sqlite3_errmsg(db))
            print("📱 [DatabaseAccess] ❌ Failed to remove setting '\(key)': \(errorMsg)")
            return false
        }
    }
    
    // MARK: - Widget Notification Operations
    
    /// Notification entry for widget display
    public struct WidgetNotification {
        public let id: String
        public let title: String
        public let body: String
        public let subtitle: String?
        public let createdAt: String
        public let isRead: Bool
        public let bucketId: String
        
        public init(id: String, title: String, body: String, subtitle: String?, createdAt: String, isRead: Bool, bucketId: String) {
            self.id = id
            self.title = title
            self.body = body
            self.subtitle = subtitle
            self.createdAt = createdAt
            self.isRead = isRead
            self.bucketId = bucketId
        }
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
            operation: { db in
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
                
                sqlite3_bind_int(stmt, 1, Int32(limit))
                
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
                    
                    let notification = WidgetNotification(
                        id: id,
                        title: title,
                        body: body,
                        subtitle: subtitle,
                        createdAt: createdAt,
                        isRead: isRead,
                        bucketId: bucketId
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
}
