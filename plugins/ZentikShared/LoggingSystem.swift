import Foundation

/**
 * LoggingSystem - Shared structured logging utilities
 *
 * Provides JSON-based logging with buffering and batch persistence
 * to JSON file shared across app and extensions.
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
    private var logFilePath: String?

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
    
    /// Get log file path
    private func getLogFilePath() -> String {
        if let path = logFilePath {
            return path
        }

        let cacheDirectory = MediaAccess.getSharedMediaCacheDirectory()
        let filePath = cacheDirectory.appendingPathComponent("logs.json").path
        logFilePath = filePath
        return filePath
    }

    /// Read existing logs from JSON file
    private func readExistingLogs() -> [LogEntry] {
        let filePath = getLogFilePath()
        let fileManager = FileManager.default

        guard fileManager.fileExists(atPath: filePath) else {
            return []
        }

        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: filePath))
            let logs = try JSONDecoder().decode([LogEntry].self, from: data)
            return logs
        } catch {
            print("[LoggingSystem] ⚠️ Failed to read existing logs: \(error)")
            
            // If JSON is corrupted, backup the corrupted file and start fresh
            if let decodingError = error as? DecodingError {
                print("[LoggingSystem] 🔧 Detected corrupted log file, creating backup and starting fresh")
                
                let backupPath = filePath.replacingOccurrences(of: ".json", with: "_corrupted_\(Int(Date().timeIntervalSince1970)).json")
                
                do {
                    // Try to backup the corrupted file
                    if fileManager.fileExists(atPath: filePath) {
                        try fileManager.moveItem(atPath: filePath, toPath: backupPath)
                        print("[LoggingSystem] 📦 Backed up corrupted logs to: \(backupPath)")
                    }
                } catch {
                    print("[LoggingSystem] ⚠️ Failed to backup corrupted file, deleting: \(error)")
                    try? fileManager.removeItem(atPath: filePath)
                }
            }
            
            return []
        }
    }

    /// Write logs to JSON file
    private func writeLogsToFile(logs: [LogEntry]) {
        let filePath = getLogFilePath()

        do {
            // Read existing logs
            var existingLogs = readExistingLogs()

            // Append new logs
            existingLogs.append(contentsOf: logs)

            // Write back to file (no cleanup)
            let data = try JSONEncoder().encode(existingLogs)
            try data.write(to: URL(fileURLWithPath: filePath), options: [.atomic])

            print("[LoggingSystem] ✅ Wrote \(logs.count) logs to JSON file")
        } catch {
            print("[LoggingSystem] ⚠️ Failed to write logs to file: \(error)")
        }
    }

    /// Flush logs to JSON file
    public func flushLogs() {
        guard !logBuffer.isEmpty else { return }

        let logsToWrite = logBuffer
        logBuffer.removeAll()

        writeLogsToFile(logs: logsToWrite)
    }

    /// Read logs from file, optionally filtered by timestamp
    public func readLogs(fromTimestamp: Int64 = 0) -> [LogEntry] {
        let existingLogs = readExistingLogs()

        // Filter by timestamp and sort by timestamp DESC
        return existingLogs
            .filter { $0.timestamp >= fromTimestamp }
            .sorted { $0.timestamp > $1.timestamp }
    }

    /// Clear all logs from file
    public func clearAllLogs() {
        let filePath = getLogFilePath()
        let fileManager = FileManager.default

        do {
            if fileManager.fileExists(atPath: filePath) {
                try fileManager.removeItem(atPath: filePath)
            }
        } catch {
            print("[LoggingSystem] ⚠️ Failed to clear logs: \(error)")
        }
    }

    /// Force flush on deinit
    deinit {
        flushTimer?.invalidate()
        flushLogs()
    }
}
