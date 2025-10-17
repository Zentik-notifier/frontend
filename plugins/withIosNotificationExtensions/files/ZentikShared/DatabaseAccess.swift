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
                var db: OpaquePointer?
                
                // Open database with appropriate flags
                let openFlags = operationType == .read ? 
                    SQLITE_OPEN_READONLY | SQLITE_OPEN_FULLMUTEX :
                    SQLITE_OPEN_READWRITE | SQLITE_OPEN_FULLMUTEX
                
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
                
                // Set journal mode to WAL for concurrent access
                var pragmaStmt: OpaquePointer?
                if sqlite3_prepare_v2(database, "PRAGMA journal_mode=WAL", -1, &pragmaStmt, nil) == SQLITE_OK {
                    sqlite3_step(pragmaStmt)
                    sqlite3_finalize(pragmaStmt)
                }
                
                // Optimize WAL checkpoint
                if sqlite3_prepare_v2(database, "PRAGMA wal_autocheckpoint=1000", -1, &pragmaStmt, nil) == SQLITE_OK {
                    sqlite3_step(pragmaStmt)
                    sqlite3_finalize(pragmaStmt)
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
}
