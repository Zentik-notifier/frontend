import Foundation

/**
 * LoggingSystem - Shared structured logging utilities
 *
 * Provides JSON-based logging with buffering and batch persistence
 * to separate JSON files per source to avoid concurrent write conflicts.
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
        
        /// Init with custom timestamp (for logs received from Watch)
        public init(id: String, level: String, tag: String?, message: String, metadata: [String: String]?, timestamp: Int64, source: String) {
            self.id = id
            self.level = level
            self.tag = tag
            self.message = message
            self.metadata = metadata
            self.timestamp = timestamp
            self.source = source
        }
    }

    // MARK: - Shared Logger Instance

    public static let shared = LoggingSystem()

    // Separate buffer per source to enable parallel logging without conflicts
    private var logBuffers: [String: [LogEntry]] = [:]
    private let bufferLimit = 20
    private let maxLogsPerFile = 2000 // Auto-cleanup threshold
    private var flushTimers: [String: Timer] = [:]
    private let flushInterval: TimeInterval = 5.0
    private let queue = DispatchQueue(label: "com.zentik.loggingsystem", attributes: .concurrent)
    private let logsDirectory: String

    private init() {
        let cacheDirectory = MediaAccess.getSharedMediaCacheDirectory()
        logsDirectory = cacheDirectory.appendingPathComponent("logs").path
        
        // Create logs directory if it doesn't exist
        let fileManager = FileManager.default
        if !fileManager.fileExists(atPath: logsDirectory) {
            try? fileManager.createDirectory(atPath: logsDirectory, withIntermediateDirectories: true, attributes: nil)
        }
    }
    
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
        
        // Print to console
        if let jsonData = try? JSONEncoder().encode(entry),
           let jsonString = String(data: jsonData, encoding: .utf8) {
            print("[\(source)] \(jsonString)")
        }
        
        // Add to source-specific buffer (thread-safe)
        queue.async(flags: .barrier) {
            if self.logBuffers[source] == nil {
                self.logBuffers[source] = []
            }
            self.logBuffers[source]?.append(entry)
            
            // Flush if buffer is full for this source
            if let count = self.logBuffers[source]?.count, count >= self.bufferLimit {
                self.flushLogs(forSource: source)
            } else {
                self.scheduleFlush(forSource: source)
            }
        }
    }
    
    /// Log a message with custom timestamp (for logs received from Watch)
    public func logWithTimestamp(
        id: String,
        level: String,
        tag: String? = nil,
        message: String,
        metadata: [String: String]? = nil,
        timestamp: Int64,
        source: String
    ) {
        let entry = LogEntry(
            id: id,
            level: level,
            tag: tag,
            message: message,
            metadata: metadata,
            timestamp: timestamp,
            source: source
        )
        
        // Add to source-specific buffer (thread-safe)
        queue.async(flags: .barrier) {
            if self.logBuffers[source] == nil {
                self.logBuffers[source] = []
            }
            self.logBuffers[source]?.append(entry)
            
            // Flush if buffer is full for this source
            if let count = self.logBuffers[source]?.count, count >= self.bufferLimit {
                self.flushLogs(forSource: source)
            } else {
                self.scheduleFlush(forSource: source)
            }
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
    
    /// Schedule flush timer for a specific source
    private func scheduleFlush(forSource source: String) {
        DispatchQueue.main.async {
            // Cancel existing timer for this source
            self.flushTimers[source]?.invalidate()
            
            // Schedule new timer
            self.flushTimers[source] = Timer.scheduledTimer(withTimeInterval: self.flushInterval, repeats: false) { [weak self] _ in
                self?.flushLogs(forSource: source)
            }
        }
    }
    
    /// Get log file path for a specific source
    private func getLogFilePath(forSource source: String) -> String {
        // Sanitize source name for filename (remove special characters)
        let sanitizedSource = source.replacingOccurrences(of: "[^a-zA-Z0-9_-]", with: "_", options: .regularExpression)
        return "\(logsDirectory)/\(sanitizedSource).json"
    }

    /// Read existing logs from JSON file for a specific source
    private func readExistingLogs(forSource source: String) -> [LogEntry] {
        let filePath = getLogFilePath(forSource: source)
        let fileManager = FileManager.default

        guard fileManager.fileExists(atPath: filePath) else {
            return []
        }

        do {
            let data = try Data(contentsOf: URL(fileURLWithPath: filePath))
            let logs = try JSONDecoder().decode([LogEntry].self, from: data)
            return logs
        } catch {
            print("[LoggingSystem] ⚠️ Failed to read existing logs for \(source): \(error)")
            
            // If JSON is corrupted, backup the corrupted file and start fresh
            if error is DecodingError {
                print("[LoggingSystem] 🔧 Detected corrupted log file for \(source), creating backup and starting fresh")
                
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

    /// Write logs to JSON file for a specific source
    private func writeLogsToFile(logs: [LogEntry], forSource source: String) {
        let filePath = getLogFilePath(forSource: source)

        do {
            // Read existing logs
            var existingLogs = readExistingLogs(forSource: source)

            // Append new logs
            existingLogs.append(contentsOf: logs)

            // Auto-cleanup: Keep only the most recent maxLogsPerFile entries
            if existingLogs.count > maxLogsPerFile {
                // Keep the newest entries (sorted by timestamp DESC, so take first maxLogsPerFile)
                existingLogs = Array(existingLogs.sorted { $0.timestamp > $1.timestamp }.prefix(maxLogsPerFile))
                print("[LoggingSystem] 🧹 Auto-cleanup: Trimmed \(source).json to \(maxLogsPerFile) most recent entries")
            }

            // Write back to file atomically
            let data = try JSONEncoder().encode(existingLogs)
            try data.write(to: URL(fileURLWithPath: filePath), options: [.atomic])

            print("[LoggingSystem] ✅ Wrote \(logs.count) logs to \(source).json")
        } catch {
            print("[LoggingSystem] ⚠️ Failed to write logs to file for \(source): \(error)")
        }
    }

    /// Flush logs to JSON file for a specific source
    private func flushLogs(forSource source: String) {
        queue.async(flags: .barrier) {
            guard let logs = self.logBuffers[source], !logs.isEmpty else { return }
            
            // Get logs and clear buffer
            let logsToWrite = logs
            self.logBuffers[source] = []
            
            // Cancel timer
            DispatchQueue.main.async {
                self.flushTimers[source]?.invalidate()
                self.flushTimers[source] = nil
            }
            
            // Write to file
            self.writeLogsToFile(logs: logsToWrite, forSource: source)
        }
    }

    /// Flush all buffered logs
    public func flushLogs() {
        queue.sync {
            let sources = Array(logBuffers.keys)
            for source in sources {
                flushLogs(forSource: source)
            }
        }
    }

    /// Read logs from file, optionally filtered by timestamp and source
    public func readLogs(fromTimestamp: Int64 = 0, fromSource: String? = nil) -> [LogEntry] {
        var allLogs: [LogEntry] = []
        
        queue.sync {
            let fileManager = FileManager.default
            
            if let source = fromSource {
                // Read from specific source file
                allLogs = readExistingLogs(forSource: source)
            } else {
                // Read from all source files
                if let files = try? fileManager.contentsOfDirectory(atPath: logsDirectory) {
                    for file in files where file.hasSuffix(".json") && !file.contains("_corrupted_") {
                        let source = file.replacingOccurrences(of: ".json", with: "")
                        let logs = readExistingLogs(forSource: source)
                        allLogs.append(contentsOf: logs)
                    }
                }
            }
        }
        
        // Filter by timestamp and sort by timestamp DESC
        return allLogs
            .filter { $0.timestamp >= fromTimestamp }
            .sorted { $0.timestamp > $1.timestamp }
    }

    /// Clear all logs from files
    public func clearAllLogs() {
        queue.async(flags: .barrier) {
            let fileManager = FileManager.default
            
            // Clear all source-specific log files
            if let files = try? fileManager.contentsOfDirectory(atPath: self.logsDirectory) {
                for file in files where file.hasSuffix(".json") {
                    let filePath = "\(self.logsDirectory)/\(file)"
                    try? fileManager.removeItem(atPath: filePath)
                }
            }
            
            // Clear all buffers
            self.logBuffers.removeAll()
            
            // Cancel all timers
            DispatchQueue.main.async {
                for timer in self.flushTimers.values {
                    timer.invalidate()
                }
                self.flushTimers.removeAll()
            }
        }
    }

    /// Force flush on deinit
    deinit {
        DispatchQueue.main.async {
            for timer in self.flushTimers.values {
                timer.invalidate()
            }
        }
        flushLogs()
    }
}
