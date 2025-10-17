import Foundation
import SQLite3

/**
 * LoggingSystem - Shared structured logging utilities
 * 
 * Provides JSON-based logging with buffering and batch persistence
 * to SQLite database shared across app and extensions.
 */
public class LoggingSystem {
    
    // MARK: - Log Entry Structure
    
    public struct LogEntry: Codable {
        let id: String
        let level: String
        let tag: String?
        let message: String
        let metadata: [String: String]?
        let timestamp: Int64
        let source: String
        
        public init(level: String, tag: String?, message: String, metadata: [String: String]?, source: String) {
            self.id = UUID().uuidString
            self.level = level
            self.tag = tag
            self.message = message
            self.metadata = metadata
            self.timestamp = Int64(Date().timeIntervalSince1970 * 1000)
            self.source = source
        }
    }
    
    // MARK: - Shared Logger Instance
    
    public static let shared = LoggingSystem()
    
    private var logBuffer: [LogEntry] = []
    private let bufferLimit = 20
    private var flushTimer: Timer?
    private let flushInterval: TimeInterval = 5.0
    
    private init() {}
    
    // MARK: - Logging Methods
    
    /// Log a message with JSON structure
    public func log(
        level: String,
        tag: String? = nil,
        message: String,
        metadata: [String: Any]? = nil,
        source: String
    ) {
        // Convert metadata to [String: String]
        var stringMetadata: [String: String]?
        if let meta = metadata {
            stringMetadata = meta.mapValues { String(describing: $0) }
        }
        
        let entry = LogEntry(
            level: level,
            tag: tag,
            message: message,
            metadata: stringMetadata,
            source: source
        )
        
        logBuffer.append(entry)
        
        // Print to console
        if let jsonData = try? JSONEncoder().encode(entry),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            print("[\(source)] \(jsonString)")
        }
        
        // Flush if buffer is full
        if logBuffer.count >= bufferLimit {
            flushLogs()
        } else {
            scheduleFlush()
        }
    }
    
    /// Convenience method: log info
    public func info(tag: String? = nil, message: String, metadata: [String: Any]? = nil, source: String) {
        log(level: "INFO", tag: tag, message: message, metadata: metadata, source: source)
    }
    
    /// Convenience method: log warning
    public func warn(tag: String? = nil, message: String, metadata: [String: Any]? = nil, source: String) {
        log(level: "WARN", tag: tag, message: message, metadata: metadata, source: source)
    }
    
    /// Convenience method: log error
    public func error(tag: String? = nil, message: String, metadata: [String: Any]? = nil, source: String) {
        log(level: "ERROR", tag: tag, message: message, metadata: metadata, source: source)
    }
    
    /// Convenience method: log debug
    public func debug(tag: String? = nil, message: String, metadata: [String: Any]? = nil, source: String) {
        log(level: "DEBUG", tag: tag, message: message, metadata: metadata, source: source)
    }
    
    // MARK: - Buffer Management
    
    /// Schedule flush timer
    private func scheduleFlush() {
        flushTimer?.invalidate()
        flushTimer = Timer.scheduledTimer(withTimeInterval: flushInterval, repeats: false) { [weak self] _ in
            self?.flushLogs()
        }
    }
    
    /// Flush logs to database
    public func flushLogs() {
        guard !logBuffer.isEmpty else { return }
        
        let logsToWrite = logBuffer
        logBuffer.removeAll()
        
        writeLogsToDatabase(logs: logsToWrite)
    }
    
    /// Write logs to SQLite database
    private func writeLogsToDatabase(logs: [LogEntry]) {
        guard let dbPath = DatabaseAccess.getDbPath() else {
            print("[LoggingSystem] ⚠️ Failed to get database path")
            return
        }
        
        var db: OpaquePointer?
        
        guard sqlite3_open(dbPath, &db) == SQLITE_OK else {
            print("[LoggingSystem] ⚠️ Failed to open database")
            sqlite3_close(db)
            return
        }
        
        // Create logs table if not exists
        let createTableSQL = """
        CREATE TABLE IF NOT EXISTS logs (
            id TEXT PRIMARY KEY,
            level TEXT NOT NULL,
            tag TEXT,
            message TEXT NOT NULL,
            metadata TEXT,
            timestamp INTEGER NOT NULL,
            source TEXT NOT NULL
        )
        """
        
        if sqlite3_exec(db, createTableSQL, nil, nil, nil) != SQLITE_OK {
            print("[LoggingSystem] ⚠️ Failed to create logs table")
            sqlite3_close(db)
            return
        }
        
        // Insert logs
        let insertSQL = """
        INSERT OR REPLACE INTO logs (id, level, tag, message, metadata, timestamp, source)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """
        
        var stmt: OpaquePointer?
        
        guard sqlite3_prepare_v2(db, insertSQL, -1, &stmt, nil) == SQLITE_OK else {
            print("[LoggingSystem] ⚠️ Failed to prepare insert statement")
            sqlite3_close(db)
            return
        }
        
        var successCount = 0
        
        for log in logs {
            sqlite3_bind_text(stmt, 1, log.id, -1, nil)
            sqlite3_bind_text(stmt, 2, log.level, -1, nil)
            if let tag = log.tag {
                sqlite3_bind_text(stmt, 3, tag, -1, nil)
            } else {
                sqlite3_bind_null(stmt, 3)
            }
            sqlite3_bind_text(stmt, 4, log.message, -1, nil)
            
            if let metadata = log.metadata,
               let jsonData = try? JSONEncoder().encode(metadata),
               let jsonString = String(data: jsonData, encoding: .utf8) {
                sqlite3_bind_text(stmt, 5, jsonString, -1, nil)
            } else {
                sqlite3_bind_null(stmt, 5)
            }
            
            sqlite3_bind_int64(stmt, 6, log.timestamp)
            sqlite3_bind_text(stmt, 7, log.source, -1, nil)
            
            if sqlite3_step(stmt) == SQLITE_DONE {
                successCount += 1
            }
            
            sqlite3_reset(stmt)
        }
        
        sqlite3_finalize(stmt)
        sqlite3_close(db)
        
        print("[LoggingSystem] ✅ Wrote \(successCount)/\(logs.count) logs to database")
    }
    
    /// Force flush on deinit
    deinit {
        flushTimer?.invalidate()
        flushLogs()
    }
}
