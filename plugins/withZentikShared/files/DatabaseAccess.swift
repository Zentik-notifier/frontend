import Foundation
import SQLite3

/**
 * DatabaseAccess - Shared database utilities
 * 
 * Provides SQLite database operations for notification caching
 * shared between app and extensions via App Group container.
 */
public class DatabaseAccess {
    
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
        
        let dbPath = sharedContainerURL.appendingPathComponent("cache.db").path
        return dbPath
    }
    
    // MARK: - Database Operations
    
    /// Mark notification as read in local database
    public static func markNotificationAsRead(notificationId: String) -> Bool {
        guard let dbPath = getDbPath() else {
            return false
        }
        
        var db: OpaquePointer?
        
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            sqlite3_close(db)
            return false
        }
        
        let now = Int64(Date().timeIntervalSince1970 * 1000)
        let sql = "UPDATE notifications SET read_at = ? WHERE id = ?"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            sqlite3_close(db)
            return false
        }
        
        sqlite3_bind_int64(stmt, 1, now)
        sqlite3_bind_text(stmt, 2, notificationId, -1, nil)
        
        let success = sqlite3_step(stmt) == SQLITE_DONE
        
        sqlite3_finalize(stmt)
        sqlite3_close(db)
        
        return success
    }
    
    /// Delete notification from local database
    public static func deleteNotification(notificationId: String) -> Bool {
        guard let dbPath = getDbPath() else {
            return false
        }
        
        var db: OpaquePointer?
        
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            sqlite3_close(db)
            return false
        }
        
        let sql = "DELETE FROM notifications WHERE id = ?"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            sqlite3_close(db)
            return false
        }
        
        sqlite3_bind_text(stmt, 1, notificationId, -1, nil)
        
        let success = sqlite3_step(stmt) == SQLITE_DONE
        
        sqlite3_finalize(stmt)
        sqlite3_close(db)
        
        return success
    }
    
    /// Get notification count from database
    public static func getNotificationCount() -> Int {
        guard let dbPath = getDbPath() else {
            return 0
        }
        
        var db: OpaquePointer?
        
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            sqlite3_close(db)
            return 0
        }
        
        let sql = "SELECT COUNT(*) FROM notifications WHERE read_at IS NULL"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            sqlite3_close(db)
            return 0
        }
        
        var count = 0
        if sqlite3_step(stmt) == SQLITE_ROW {
            count = Int(sqlite3_column_int(stmt, 0))
        }
        
        sqlite3_finalize(stmt)
        sqlite3_close(db)
        
        return count
    }
    
    /// Check if notification exists in database
    public static func notificationExists(notificationId: String) -> Bool {
        guard let dbPath = getDbPath() else {
            return false
        }
        
        var db: OpaquePointer?
        
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            sqlite3_close(db)
            return false
        }
        
        let sql = "SELECT id FROM notifications WHERE id = ? LIMIT 1"
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
            sqlite3_close(db)
            return false
        }
        
        sqlite3_bind_text(stmt, 1, notificationId, -1, nil)
        
        let exists = sqlite3_step(stmt) == SQLITE_ROW
        
        sqlite3_finalize(stmt)
        sqlite3_close(db)
        
        return exists
    }
}
