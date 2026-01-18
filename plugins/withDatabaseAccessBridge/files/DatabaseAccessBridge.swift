import Foundation
import React
import SQLite3

/**
 * React Native bridge for DatabaseAccess shared library
 * Exposes database operations to JavaScript for iOS
 * This bridge is always available, even when Apple Watch is not paired
 */
@objc(DatabaseAccessBridge)
class DatabaseAccessBridge: NSObject {
  
  // MARK: - React Native Module Setup
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false // Database operations can run on background thread
  }
  
  // MARK: - Notification Operations
  
  /**
   * Mark a single notification as read
   */
  @objc
  func markNotificationAsRead(
    _ notificationId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let timestamp = ISO8601DateFormatter().string(from: Date())
    
    DatabaseAccess.markNotificationAsRead(
      notificationId: notificationId,
      source: "RNBridge"
    ) { success in
      if success {
        resolve([
          "success": true,
          "notificationId": notificationId,
          "readAt": timestamp
        ])
      } else {
        reject("MARK_READ_FAILED", "Failed to mark notification as read", nil)
      }
    }
  }
  
  /**
   * Mark multiple notifications as read in bulk
   */
  @objc
  func markMultipleNotificationsAsRead(
    _ notificationIds: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard !notificationIds.isEmpty else {
      resolve([
        "success": true,
        "count": 0
      ])
      return
    }
    
    let timestamp = ISO8601DateFormatter().string(from: Date())
    
    DatabaseAccess.markMultipleNotificationsAsRead(
      notificationIds: notificationIds,
      source: "RNBridge"
    ) { success in
      if success {
        resolve([
          "success": true,
          "count": notificationIds.count,
          "readAt": timestamp
        ])
      } else {
        reject("BULK_MARK_READ_FAILED", "Failed to mark notifications as read", nil)
      }
    }
  }
  
  /**
   * Mark a single notification as unread
   */
  @objc
  func markNotificationAsUnread(
    _ notificationId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.markNotificationAsUnread(
      notificationId: notificationId,
      source: "RNBridge"
    ) { success in
      if success {
        resolve([
          "success": true,
          "notificationId": notificationId
        ])
      } else {
        reject("MARK_UNREAD_FAILED", "Failed to mark notification as unread", nil)
      }
    }
  }
  
  /**
   * Delete a single notification
   */
  @objc
  func deleteNotification(
    _ notificationId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.deleteNotification(
      notificationId: notificationId,
      source: "RNBridge"
    ) { success in
      if success {
        resolve([
          "success": true,
          "notificationId": notificationId
        ])
      } else {
        reject("DELETE_FAILED", "Failed to delete notification", nil)
      }
    }
  }
  
  /**
   * Get unread notification count
   */
  @objc
  func getNotificationCount(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.getNotificationCount(source: "RNBridge") { count in
      resolve([
        "count": count
      ])
    }
  }
  
  /**
   * Check if notification exists in database
   */
  @objc
  func notificationExists(
    _ notificationId: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.notificationExists(
      notificationId: notificationId,
      source: "RNBridge"
    ) { exists in
      resolve([
        "exists": exists,
        "notificationId": notificationId
      ])
    }
  }
  
  // MARK: - Bucket Operations
  
  /**
   * Get all buckets from database
   */
  @objc
  func getAllBuckets(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.getAllBuckets(source: "RNBridge") { buckets in
      let bucketsArray = buckets.map { bucket -> [String: Any] in
        var dict: [String: Any] = [
          "id": bucket.id,
          "name": bucket.name,
          "unreadCount": bucket.unreadCount
        ]
        if let color = bucket.color {
          dict["color"] = color
        }
        if let iconUrl = bucket.iconUrl {
          dict["iconUrl"] = iconUrl
        }
        return dict
      }
      
      resolve([
        "buckets": bucketsArray,
        "count": buckets.count
      ])
    }
  }
  
  /**
   * Get recent notifications for widget/watch display
   */
  @objc
  func getRecentNotifications(
    _ limit: NSNumber,
    unreadOnly: Bool,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let limitInt = limit.intValue
    
    DatabaseAccess.getRecentNotifications(
      limit: limitInt,
      unreadOnly: unreadOnly,
      source: "RNBridge"
    ) { notifications in
      let notificationsArray = notifications.map { notification -> [String: Any] in
        var dict: [String: Any] = [
          "id": notification.id,
          "title": notification.title,
          "body": notification.body,
          "createdAt": notification.createdAt,
          "isRead": notification.isRead,
          "bucketId": notification.bucketId
        ]
        
        if let subtitle = notification.subtitle {
          dict["subtitle"] = subtitle
        }
        if let bucketName = notification.bucketName {
          dict["bucketName"] = bucketName
        }
        if let bucketColor = notification.bucketColor {
          dict["bucketColor"] = bucketColor
        }
        if let bucketIconUrl = notification.bucketIconUrl {
          dict["bucketIconUrl"] = bucketIconUrl
        }
        
        if !notification.attachments.isEmpty {
          dict["attachments"] = NotificationParser.serializeAttachments(notification.attachments)
        }
        
        if !notification.actions.isEmpty {
          dict["actions"] = NotificationParser.serializeActions(notification.actions)
        }
        
        return dict
      }
      
      resolve([
        "notifications": notificationsArray,
        "count": notifications.count
      ])
    }
  }
  
  // MARK: - Settings Operations
  
  /**
   * Get a setting value from app_settings table
   */
  @objc
  func getSettingValue(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if let value = DatabaseAccess.getSettingValue(key: key) {
      resolve([
        "key": key,
        "value": value
      ])
    } else {
      resolve([
        "key": key,
        "value": NSNull()
      ])
    }
  }
  
  /**
   * Set a setting value in app_settings table
   */
  @objc
  func setSettingValue(
    _ key: String,
    value: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let success = DatabaseAccess.setSettingValue(key: key, value: value)
    
    if success {
      resolve([
        "success": true,
        "key": key
      ])
    } else {
      reject("SET_SETTING_FAILED", "Failed to set setting value", nil)
    }
  }
  
  /**
   * Remove a setting value from app_settings table
   */
  @objc
  func removeSettingValue(
    _ key: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let success = DatabaseAccess.removeSettingValue(key: key)
    
    if success {
      resolve([
        "success": true,
        "key": key
      ])
    } else {
      reject("REMOVE_SETTING_FAILED", "Failed to remove setting value", nil)
    }
  }
  
  /**
   * Get database path (for debugging purposes)
   */
  @objc
  func getDbPath(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    if let dbPath = DatabaseAccess.getDbPath() {
      resolve([
        "path": dbPath
      ])
    } else {
      reject("DB_PATH_NOT_FOUND", "Failed to get database path", nil)
    }
  }
  
  // MARK: - Generic SQL Operations
  
  /**
   * Execute a generic SQL query (SELECT)
   * Returns an array of rows as dictionaries
   */
  @objc
  func executeQuery(
    _ sql: String,
    params: [Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.performDatabaseOperation(
      type: .read,
      name: "executeQuery",
      source: "RNBridge",
      verboseLogging: false,
      operation: { db in
        var statement: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
          let errorMessage = String(cString: sqlite3_errmsg(db))
          reject("QUERY_PREPARE_FAILED", "Failed to prepare query: \(errorMessage)", nil)
          return .failure("Failed to prepare query: \(errorMessage)")
        }
        
        defer {
          sqlite3_finalize(statement)
        }
        
        // Bind parameters
        for (index, param) in params.enumerated() {
          let bindIndex = Int32(index + 1)
          
          if let stringValue = param as? String {
            sqlite3_bind_text(statement, bindIndex, (stringValue as NSString).utf8String, -1, nil)
          } else if let intValue = param as? Int {
            sqlite3_bind_int64(statement, bindIndex, Int64(intValue))
          } else if let doubleValue = param as? Double {
            sqlite3_bind_double(statement, bindIndex, doubleValue)
          } else if param is NSNull {
            sqlite3_bind_null(statement, bindIndex)
          }
        }
        
        // Execute query and collect results
        var results: [[String: Any]] = []
        
        while sqlite3_step(statement) == SQLITE_ROW {
          var row: [String: Any] = [:]
          let columnCount = sqlite3_column_count(statement)
          
          for i in 0..<columnCount {
            let columnName = String(cString: sqlite3_column_name(statement, i))
            let columnType = sqlite3_column_type(statement, i)
            
            switch columnType {
            case SQLITE_INTEGER:
              row[columnName] = sqlite3_column_int64(statement, i)
            case SQLITE_FLOAT:
              row[columnName] = sqlite3_column_double(statement, i)
            case SQLITE_TEXT:
              if let text = sqlite3_column_text(statement, i) {
                row[columnName] = String(cString: text)
              }
            case SQLITE_NULL:
              row[columnName] = NSNull()
            default:
              break
            }
          }
          
          results.append(row)
        }
        
        resolve(results)
        return .success
      },
      completion: { result in
        if case .failure(let error) = result {
          reject("QUERY_FAILED", "Database operation failed: \(error)", nil)
        }
      }
    )
  }
  
  /**
   * Execute a generic SQL statement (INSERT, UPDATE, DELETE)
   * Returns the number of affected rows
   */
  @objc
  func executeUpdate(
    _ sql: String,
    params: [Any],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    DatabaseAccess.performDatabaseOperation(
      type: .write,
      name: "executeUpdate",
      source: "RNBridge",
      operation: { db in
        var statement: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, sql, -1, &statement, nil) == SQLITE_OK else {
          let errorMessage = String(cString: sqlite3_errmsg(db))
          reject("UPDATE_PREPARE_FAILED", "Failed to prepare statement: \(errorMessage)", nil)
          return .failure("Failed to prepare statement: \(errorMessage)")
        }
        
        defer {
          sqlite3_finalize(statement)
        }
        
        // Bind parameters
        for (index, param) in params.enumerated() {
          let bindIndex = Int32(index + 1)
          
          if let stringValue = param as? String {
            sqlite3_bind_text(statement, bindIndex, (stringValue as NSString).utf8String, -1, nil)
          } else if let intValue = param as? Int {
            sqlite3_bind_int64(statement, bindIndex, Int64(intValue))
          } else if let doubleValue = param as? Double {
            sqlite3_bind_double(statement, bindIndex, doubleValue)
          } else if param is NSNull {
            sqlite3_bind_null(statement, bindIndex)
          }
        }
        
        // Execute statement
        guard sqlite3_step(statement) == SQLITE_DONE else {
          let errorMessage = String(cString: sqlite3_errmsg(db))
          reject("UPDATE_FAILED", "Failed to execute statement: \(errorMessage)", nil)
          return .failure("Failed to execute statement: \(errorMessage)")
        }
        
        let changes = sqlite3_changes(db)
        
        resolve([
          "success": true,
          "changes": changes
        ])
        return .success
      },
      completion: { result in
        if case .failure(let error) = result {
          reject("UPDATE_FAILED", "Database operation failed: \(error)", nil)
        }
      }
    )
  }
}
