import Foundation
import SQLite3
import UIKit

// SQLite helper for Swift bindings
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

/**
 * MediaAccess - Shared media utilities
 * 
 * Provides media caching operations for notifications
 * shared between app and extensions via App Group container.
 */
public class MediaAccess {
    
    // MARK: - Shared Media Cache Directory
    
    /// Get shared media cache directory in App Group container
    public static func getSharedMediaCacheDirectory() -> URL {
        let bundleIdentifier = KeychainAccess.getMainBundleIdentifier()
        let appGroupIdentifier = "group.\(bundleIdentifier)"
        
        if let sharedContainerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupIdentifier
        ) {
            let cacheDirectory = sharedContainerURL.appendingPathComponent("shared_media_cache")
            
            // Ensure the cache directory exists
            if !FileManager.default.fileExists(atPath: cacheDirectory.path) {
                do {
                    try FileManager.default.createDirectory(
                        at: cacheDirectory,
                        withIntermediateDirectories: true,
                        attributes: nil
                    )
                    print("📱 [MediaAccess] ✅ Created shared media cache directory: \(cacheDirectory.path)")
                } catch {
                    print("📱 [MediaAccess] ❌ Failed to create shared cache directory: \(error)")
                }
            }
            
            return cacheDirectory
        } else {
            // Fallback to Documents directory if App Groups not available
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            let cacheDirectory = documentsPath.appendingPathComponent("shared_media_cache")
            
            // Ensure the fallback cache directory exists
            if !FileManager.default.fileExists(atPath: cacheDirectory.path) {
                do {
                    try FileManager.default.createDirectory(
                        at: cacheDirectory,
                        withIntermediateDirectories: true,
                        attributes: nil
                    )
                } catch {
                    print("📱 [MediaAccess] ❌ Failed to create fallback cache directory: \(error)")
                }
            }
            
            return cacheDirectory
        }
    }
    
    // MARK: - Cache Item Operations
    
    /// Insert or update cache item in database
    public static func upsertCacheItem(url: String, mediaType: String, fields: [String: Any]) {
        guard let dbPath = DatabaseAccess.getDbPath() else {
            print("📱 [MediaAccess] ⚠️ DB path not available")
            return
        }
        
        guard FileManager.default.fileExists(atPath: dbPath) else {
            print("📱 [MediaAccess] ⚠️ DB not found, skipping upsert")
            return
        }
        
        var db: OpaquePointer?
        if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) != SQLITE_OK {
            print("📱 [MediaAccess] ❌ Failed to open DB at \(dbPath)")
            return
        }
        defer { sqlite3_close(db) }
        
        let key = "\(mediaType.uppercased())_\(url)"
        
        // Build fields with defaults
        var allFields = fields
        allFields["key"] = key
        allFields["url"] = url
        allFields["media_type"] = mediaType.uppercased()
        
        // Apply defaults for NOT NULL columns
        let nowMs = Int(Date().timeIntervalSince1970 * 1000)
        if allFields["generating_thumbnail"] == nil { allFields["generating_thumbnail"] = 0 }
        if allFields["timestamp"] == nil { allFields["timestamp"] = nowMs }
        if allFields["size"] == nil { allFields["size"] = 0 }
        if allFields["downloaded_at"] == nil { allFields["downloaded_at"] = nowMs }
        if allFields["is_downloading"] == nil { allFields["is_downloading"] = 0 }
        if allFields["is_permanent_failure"] == nil { allFields["is_permanent_failure"] = 0 }
        if allFields["is_user_deleted"] == nil { allFields["is_user_deleted"] = 0 }
        
        let columns = [
            "key", "url", "local_path", "local_thumb_path", "generating_thumbnail", "timestamp", "size",
            "media_type", "original_file_name", "downloaded_at", "notification_date", "notification_id",
            "is_downloading", "is_permanent_failure", "is_user_deleted", "error_code"
        ]
        
        let placeholders = Array(repeating: "?", count: columns.count).joined(separator: ",")
        let sql = """
        INSERT INTO cache_item (\(columns.joined(separator: ","))) VALUES (\(placeholders))
        ON CONFLICT(key) DO UPDATE SET
        url=excluded.url,
        local_path=excluded.local_path,
        local_thumb_path=excluded.local_thumb_path,
        generating_thumbnail=excluded.generating_thumbnail,
        timestamp=excluded.timestamp,
        size=excluded.size,
        media_type=excluded.media_type,
        original_file_name=excluded.original_file_name,
        downloaded_at=excluded.downloaded_at,
        notification_date=excluded.notification_date,
        notification_id=excluded.notification_id,
        is_downloading=excluded.is_downloading,
        is_permanent_failure=excluded.is_permanent_failure,
        is_user_deleted=excluded.is_user_deleted,
        error_code=excluded.error_code;
        """
        
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK {
            print("📱 [MediaAccess] ❌ Failed to prepare UPSERT: \(String(cString: sqlite3_errmsg(db)))")
            return
        }
        defer { sqlite3_finalize(stmt) }
        
        func bind(_ idx: Int32, _ value: Any?) {
            if value == nil {
                sqlite3_bind_null(stmt, idx)
                return
            }
            switch value {
            case let v as String:
                sqlite3_bind_text(stmt, idx, (v as NSString).utf8String, -1, SQLITE_TRANSIENT)
            case let v as Int:
                sqlite3_bind_int64(stmt, idx, Int64(v))
            case let v as Int64:
                sqlite3_bind_int64(stmt, idx, v)
            case let v as Bool:
                sqlite3_bind_int(stmt, idx, v ? 1 : 0)
            default:
                sqlite3_bind_null(stmt, idx)
            }
        }
        
        let values: [Any?] = [
            allFields["key"],
            allFields["url"],
            allFields["local_path"],
            allFields["local_thumb_path"],
            allFields["generating_thumbnail"],
            allFields["timestamp"],
            allFields["size"],
            allFields["media_type"],
            allFields["original_file_name"],
            allFields["downloaded_at"],
            allFields["notification_date"],
            allFields["notification_id"],
            allFields["is_downloading"],
            allFields["is_permanent_failure"],
            allFields["is_user_deleted"],
            allFields["error_code"]
        ]
        
        for (i, v) in values.enumerated() {
            bind(Int32(i + 1), v)
        }
        
        if sqlite3_step(stmt) != SQLITE_DONE {
            print("📱 [MediaAccess] ❌ UPSERT failed: \(String(cString: sqlite3_errmsg(db)))")
        } else {
            print("📱 [MediaAccess] ✅ UPSERT successful for key: \(key)")
        }
    }
    
    /// Check if media exists in cache
    public static func mediaExistsInCache(url: String, mediaType: String) -> Bool {
        guard let dbPath = DatabaseAccess.getDbPath() else { return false }
        guard FileManager.default.fileExists(atPath: dbPath) else { return false }
        
        var db: OpaquePointer?
        if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) != SQLITE_OK { return false }
        defer { sqlite3_close(db) }
        
        let key = "\(mediaType.uppercased())_\(url)"
        let sql = "SELECT 1 FROM cache_item WHERE key = ? LIMIT 1"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK { return false }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
        return sqlite3_step(stmt) == SQLITE_ROW
    }
    
    /// Check if media is currently downloading
    public static func isMediaDownloading(url: String, mediaType: String) -> Bool {
        guard let dbPath = DatabaseAccess.getDbPath() else { return false }
        guard FileManager.default.fileExists(atPath: dbPath) else { return false }
        
        var db: OpaquePointer?
        if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) != SQLITE_OK { return false }
        defer { sqlite3_close(db) }
        
        let key = "\(mediaType.uppercased())_\(url)"
        let sql = "SELECT is_downloading, is_permanent_failure, timestamp FROM cache_item WHERE key = ? LIMIT 1"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK { return false }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
        
        if sqlite3_step(stmt) == SQLITE_ROW {
            let isDownloading = sqlite3_column_int(stmt, 0)
            let isPermanentFailure = sqlite3_column_int(stmt, 1)
            let timestamp = sqlite3_column_int64(stmt, 2)
            
            // Check if download is stuck (older than 60 seconds)
            if isDownloading == 1 {
                let currentTimestamp = Int64(Date().timeIntervalSince1970 * 1000)
                let downloadAge = currentTimestamp - timestamp
                let maxDownloadTime: Int64 = 60 * 1000 // 60 seconds in milliseconds
                
                if downloadAge > maxDownloadTime {
                    print("📱 [MediaAccess] ⚠️ Download stuck for \(downloadAge/1000)s, clearing...")
                    clearStuckDownload(key: key, url: url, mediaType: mediaType)
                    return false
                }
                return true
            }
            
            return false
        }
        
        return false
    }
    
    /// Check if media has download error
    public static func hasMediaDownloadError(url: String, mediaType: String) -> (hasError: Bool, errorMessage: String?) {
        guard let dbPath = DatabaseAccess.getDbPath() else { return (false, nil) }
        guard FileManager.default.fileExists(atPath: dbPath) else { return (false, nil) }
        
        var db: OpaquePointer?
        if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) != SQLITE_OK { return (false, nil) }
        defer { sqlite3_close(db) }
        
        let key = "\(mediaType.uppercased())_\(url)"
        let sql = "SELECT is_permanent_failure, error_code FROM cache_item WHERE key = ? LIMIT 1"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK { return (false, nil) }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
        
        if sqlite3_step(stmt) == SQLITE_ROW {
            let val = sqlite3_column_int(stmt, 0)
            var code: String? = nil
            if let cStr = sqlite3_column_text(stmt, 1) {
                code = String(cString: cStr)
            }
            return (val == 1, code)
        }
        
        return (false, nil)
    }
    
    /// Clear stuck download from cache
    public static func clearStuckDownload(key: String, url: String, mediaType: String) {
        guard let dbPath = DatabaseAccess.getDbPath() else { return }
        guard FileManager.default.fileExists(atPath: dbPath) else { return }
        
        var db: OpaquePointer?
        if sqlite3_open(dbPath, &db) != SQLITE_OK { return }
        defer { sqlite3_close(db) }
        
        let sql = "UPDATE cache_item SET is_downloading = 0, is_permanent_failure = 1, error_code = 'Download timeout (stuck)' WHERE key = ?"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK { return }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
        
        if sqlite3_step(stmt) == SQLITE_DONE {
            print("📱 [MediaAccess] ✅ Cleared stuck download for: \(key)")
        } else {
            print("📱 [MediaAccess] ❌ Failed to clear stuck download for: \(key)")
        }
    }
    
    /// Get local path from database
    public static func getLocalPathFromDb(url: String, mediaType: String) -> String? {
        guard let dbPath = DatabaseAccess.getDbPath() else { return nil }
        guard FileManager.default.fileExists(atPath: dbPath) else { return nil }
        
        var db: OpaquePointer?
        if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) != SQLITE_OK { return nil }
        defer { sqlite3_close(db) }
        
        let key = "\(mediaType.uppercased())_\(url)"
        let sql = "SELECT local_path FROM cache_item WHERE key = ? LIMIT 1"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK { return nil }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
        
        if sqlite3_step(stmt) == SQLITE_ROW {
            if let cString = sqlite3_column_text(stmt, 0) {
                return String(cString: cString)
            }
        }
        
        return nil
    }
    
    /// Clear media error flag
    public static func clearMediaErrorFlag(url: String, mediaType: String) {
        guard let dbPath = DatabaseAccess.getDbPath() else { return }
        guard FileManager.default.fileExists(atPath: dbPath) else { return }
        
        var db: OpaquePointer?
        if sqlite3_open(dbPath, &db) != SQLITE_OK { return }
        defer { sqlite3_close(db) }
        
        let key = "\(mediaType.uppercased())_\(url)"
        let sql = "UPDATE cache_item SET is_permanent_failure = 0, error_code = NULL WHERE key = ?"
        var stmt: OpaquePointer?
        if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK { return }
        defer { sqlite3_finalize(stmt) }
        
        sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
        sqlite3_step(stmt)
    }
    
    // MARK: - Filename Generation Utilities
    
    /**
     * Generates a safe filename based on URL and media type
     * Uses the same logic as the app's media-cache
     */
    public static func generateSafeFileName(url: String, mediaType: String, originalFileName: String?) -> String {
        // Extract the extension from the original filename or URL
        let fileExtension = getFileExtension(url: url, mediaType: mediaType, originalFileName: originalFileName)
        
        // Generate a robust hash for the filename
        let longHash = generateLongHash(url: url)
        
        let safeFileName = "\(mediaType.lowercased())_\(longHash)"
        
        return "\(safeFileName)\(fileExtension)"
    }
    
    /**
     * Generate a robust hash for URL-based filename generation
     * Uses the same algorithm as the mobile app (React Native media-cache)
     */
    public static func generateLongHash(url: String) -> String {
        // Replicate exact React Native algorithm: hash = (hash * 31 + char) >>> 0
        var hash: UInt32 = 0
        for char in url.utf8 {
            // Use safe arithmetic operations to avoid overflow (matching JS >>> 0)
            hash = (hash &* 31 &+ UInt32(char)) // Swift &* and &+ provide overflow protection
        }
        // Convert to hex string and pad to 8 characters (matching JS toString(16).padStart(8, '0'))
        return String(format: "%08x", hash)
    }
    
    /**
     * Gets the file extension based on media type or URL
     * Uses the same logic as the app's media-cache
     */
    public static func getFileExtension(url: String, mediaType: String, originalFileName: String?) -> String {
        // Try first from the original filename
        if let originalFileName = originalFileName {
            let parts = originalFileName.components(separatedBy: ".")
            if parts.count > 1 {
                let ext = parts.last!
                if ext.count <= 5 && ext.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil {
                    return ".\(ext.lowercased())"
                }
            }
        }
        
        // Try from the URL
        let urlParts = url.components(separatedBy: "?")[0].components(separatedBy: ".")
        if urlParts.count > 1 {
            let ext = urlParts.last!
            if ext.count <= 5 && ext.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil {
                return ".\(ext.lowercased())"
            }
        }
        
        // Default based on media type
        switch mediaType.uppercased() {
        case "IMAGE":
            return ".jpg"
        case "GIF":
            return ".gif"
        case "VIDEO":
            return ".mp4"
        case "AUDIO":
            return ".mp3"
        default:
            return ".dat"
        }
    }
    
    // MARK: - Bucket Icon Cache Operations
    
    /// Get bucket icon from shared cache, download from URL if not cached, or generate placeholder
    /// Priority: 1) Cached icon 2) Download from iconUrl 3) Generate temporary placeholder
    /// - Parameters:
    ///   - bucketId: Bucket ID for cache lookup
    ///   - bucketName: Bucket name for generating placeholder (optional, required for placeholder)
    ///   - bucketColor: Bucket color for placeholder background (optional)
    ///   - iconUrl: URL to download icon from if not in cache (optional)
    /// - Returns: Icon data if found/downloaded/generated, or nil
    public static func getBucketIconFromSharedCache(bucketId: String, bucketName: String? = nil, bucketColor: String? = nil, iconUrl: String? = nil) -> Data? {
        let cacheDirectory = getSharedMediaCacheDirectory()
        let bucketIconDirectory = cacheDirectory.appendingPathComponent("BUCKET_ICON")
        
        // Simple filename: just bucketId.png
        let fileName = "\(bucketId).png"
        let fileURL = bucketIconDirectory.appendingPathComponent(fileName)
        
        // Check if icon exists in cache
        if FileManager.default.fileExists(atPath: fileURL.path) {
            do {
                let data = try Data(contentsOf: fileURL)
                return data
            } catch {
                print("📱 [MediaAccess] ❌ Failed to load cached bucket icon: \(error)")
            }
        }
        
        // Icon not in cache, try to download from iconUrl if provided
        if let iconUrlString = iconUrl, let url = URL(string: iconUrlString) {
            print("📱 [MediaAccess] 🌐 Downloading bucket icon from: \(iconUrlString)")
            
            // Create semaphore for synchronous download (required in NSE/NCE context)
            let semaphore = DispatchSemaphore(value: 0)
            var downloadedData: Data?
            
            let task = URLSession.shared.dataTask(with: url) { data, response, error in
                defer { semaphore.signal() }
                
                if let error = error {
                    print("📱 [MediaAccess] ❌ Failed to download bucket icon: \(error.localizedDescription)")
                    return
                }
                
                guard let data = data, !data.isEmpty else {
                    print("📱 [MediaAccess] ❌ Downloaded data is empty")
                    return
                }
                
                // Save to cache
                do {
                    try FileManager.default.createDirectory(at: bucketIconDirectory, withIntermediateDirectories: true, attributes: nil)
                    try data.write(to: fileURL)
                    print("📱 [MediaAccess] ✅ Saved bucket icon to cache: \(fileName)")
                    downloadedData = data
                } catch {
                    print("📱 [MediaAccess] ❌ Failed to save bucket icon to cache: \(error)")
                }
            }
            
            task.resume()
            
            // Wait for download to complete (max 2 seconds for widgets to avoid timeout)
            _ = semaphore.wait(timeout: .now() + 2.0)
            
            if let data = downloadedData {
                return data
            }
        }
        
        // Icon not in cache and download failed/unavailable, generate temporary placeholder if bucketName provided
        guard let bucketName = bucketName else {
            print("📱 [MediaAccess] ⚠️ No bucket icon in cache, download failed, and no bucketName for placeholder")
            return nil
        }
        
        print("📱 [MediaAccess] 🎭 Generating temporary placeholder for \(bucketName)")
        return generateColorOnlyPlaceholder(hexColor: bucketColor)
    }
    
    // MARK: - Placeholder Generation
    
    /// Generate temporary placeholder with bucket color only (no initials)
    /// This is NOT cached, just generated on-the-fly for NSE/NCE
    private static func generateColorOnlyPlaceholder(hexColor: String?) -> Data? {
        let size = CGSize(width: 200, height: 200)
        UIGraphicsBeginImageContextWithOptions(size, false, 0)
        defer { UIGraphicsEndImageContext() }
        
        let context = UIGraphicsGetCurrentContext()
        #if os(watchOS)
        let color = parseHexColor(hexColor) ?? UIColor(red: 0.0, green: 0.478, blue: 1.0, alpha: 1.0)
        #else
        let color = parseHexColor(hexColor) ?? UIColor.systemBlue
        #endif
        
        // Draw circular background with bucket color (no initials)
        context?.setFillColor(color.cgColor)
        context?.fillEllipse(in: CGRect(origin: .zero, size: size))
        
        guard let imageData = UIGraphicsGetImageFromCurrentImageContext()?.pngData() else {
            print("📱 [MediaAccess] ❌ Failed to generate placeholder image data")
            return nil
        }
        
        print("📱 [MediaAccess] ✅ Generated temporary placeholder with bucket color")
        return imageData
    }
    
    /// Parse hex color string to UIColor
    private static func parseHexColor(_ hex: String?) -> UIColor? {
        guard var hex = hex else { return nil }
        hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        guard hex.count == 6 else { return nil }
        
        let rStr = String(hex.prefix(2))
        let gStr = String(hex.dropFirst(2).prefix(2))
        let bStr = String(hex.dropFirst(4).prefix(2))
        
        guard let r = UInt8(rStr, radix: 16),
              let g = UInt8(gStr, radix: 16),
              let b = UInt8(bStr, radix: 16) else {
            return nil
        }
        
        return UIColor(
            red: CGFloat(r) / 255.0,
            green: CGFloat(g) / 255.0,
            blue: CGFloat(b) / 255.0,
            alpha: 1.0
        )
    }
}
