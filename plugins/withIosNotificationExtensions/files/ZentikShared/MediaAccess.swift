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
    
    // MARK: - Avatar Generation
    
    /// Process bucket icon to improve visibility for transparent backgrounds
    public static func processBucketIcon(_ imageData: Data, hexColor: String? = nil, size: CGSize = CGSize(width: 200, height: 200)) -> Data? {
        guard let image = UIImage(data: imageData) else {
            return nil
        }
        
        // Check if image has transparency
        let hasTransparency = image.cgImage?.alphaInfo != .none && 
                             image.cgImage?.alphaInfo != .noneSkipLast &&
                             image.cgImage?.alphaInfo != .noneSkipFirst
        
        // If no transparency, return original
        if !hasTransparency {
            return imageData
        }
        
        print("📱 [MediaAccess] 🎨 Bucket icon has transparency, adding background for better visibility")
        
        // Parse bucket color or use default
        var backgroundColor = UIColor.systemBlue
        if let hexColor = hexColor, hexColor.hasPrefix("#") {
            let hex = String(hexColor.dropFirst())
            if hex.count == 6, let rgb = Int(hex, radix: 16) {
                let r = CGFloat((rgb >> 16) & 0xFF) / 255.0
                let g = CGFloat((rgb >> 8) & 0xFF) / 255.0
                let b = CGFloat(rgb & 0xFF) / 255.0
                backgroundColor = UIColor(red: r, green: g, blue: b, alpha: 1.0)
            }
        }
        
        // Create renderer
        let renderer = UIGraphicsImageRenderer(size: size)
        let processedImage = renderer.image { context in
            // Draw circular background with bucket color
            let rect = CGRect(origin: .zero, size: size)
            let circlePath = UIBezierPath(ovalIn: rect)
            backgroundColor.setFill()
            circlePath.fill()
            
            // Add subtle shadow/border for depth
            context.cgContext.saveGState()
            context.cgContext.setShadow(
                offset: CGSize(width: 0, height: 2),
                blur: 4,
                color: UIColor.black.withAlphaComponent(0.2).cgColor
            )
            
            // Draw the icon centered with some padding
            let padding: CGFloat = size.width * 0.15
            let iconRect = rect.insetBy(dx: padding, dy: padding)
            
            // Clip to circle to ensure icon fits nicely
            circlePath.addClip()
            
            // Draw icon
            image.draw(in: iconRect)
            
            context.cgContext.restoreGState()
        }
        
        return processedImage.pngData()
    }
    
    /// Generate avatar image from initials
    public static func generateAvatarImage(initials: String, size: CGSize = CGSize(width: 200, height: 200)) -> UIImage? {
        let renderer = UIGraphicsImageRenderer(size: size)
        
        return renderer.image { context in
            // Background with gradient
            let colors = [
                UIColor.systemBlue.cgColor,
                UIColor.systemPurple.cgColor
            ]
            
            if let gradient = CGGradient(
                colorsSpace: CGColorSpaceCreateDeviceRGB(),
                colors: colors as CFArray,
                locations: [0.0, 1.0]
            ) {
                context.cgContext.drawLinearGradient(
                    gradient,
                    start: CGPoint(x: 0, y: 0),
                    end: CGPoint(x: size.width, y: size.height),
                    options: []
                )
            }
            
            // Draw initials
            let attributes: [NSAttributedString.Key: Any] = [
                .font: UIFont.systemFont(ofSize: size.width * 0.4, weight: .medium),
                .foregroundColor: UIColor.white
            ]
            
            let text = initials.uppercased()
            let textSize = text.size(withAttributes: attributes)
            let textRect = CGRect(
                x: (size.width - textSize.width) / 2,
                y: (size.height - textSize.height) / 2,
                width: textSize.width,
                height: textSize.height
            )
            
            text.draw(in: textRect, withAttributes: attributes)
        }
    }
    
    /// Generate initials from bucket name
    public static func generateInitials(from bucketName: String) -> String {
        let words = bucketName.split(separator: " ")
        if words.count >= 2 {
            let first = String(words[0].prefix(1))
            let second = String(words[1].prefix(1))
            return first + second
        } else if let first = words.first, first.count >= 2 {
            return String(first.prefix(2))
        } else if let first = words.first {
            return String(first.prefix(1))
        }
        return "?"
    }
    
    /// Get or generate placeholder image for bucket
    public static func getPlaceholderFromSharedCache(bucketId: String, bucketName: String) -> Data? {
        let cacheDirectory = getSharedMediaCacheDirectory()
        let placeholderDirectory = cacheDirectory.appendingPathComponent("PLACEHOLDER")
        
        // Generate filename based on bucket info
        let safeBucketName = bucketName
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "/", with: "_")
        let fileName = "placeholder_\(bucketId)_\(safeBucketName).png"
        let fileURL = placeholderDirectory.appendingPathComponent(fileName)
        
        // Check if placeholder exists
        if FileManager.default.fileExists(atPath: fileURL.path) {
            do {
                return try Data(contentsOf: fileURL)
            } catch {
                print("📱 [MediaAccess] ❌ Failed to load cached placeholder: \(error)")
            }
        }
        
        // Generate new placeholder
        print("📱 [MediaAccess] 🎭 Generating new placeholder for \(bucketName)")
        let initials = generateInitials(from: bucketName)
        
        guard let avatarImage = generateAvatarImage(initials: initials) else {
            print("📱 [MediaAccess] ❌ Failed to generate avatar image")
            return nil
        }
        
        guard let imageData = avatarImage.pngData() else {
            print("📱 [MediaAccess] ❌ Failed to convert avatar to PNG")
            return nil
        }
        
        // Save to cache
        do {
            if !FileManager.default.fileExists(atPath: placeholderDirectory.path) {
                try FileManager.default.createDirectory(
                    at: placeholderDirectory,
                    withIntermediateDirectories: true,
                    attributes: nil
                )
            }
            try imageData.write(to: fileURL)
            print("📱 [MediaAccess] ✅ Cached placeholder for \(bucketName)")
        } catch {
            print("📱 [MediaAccess] ⚠️ Failed to cache placeholder: \(error)")
        }
        
        return imageData
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
    
    /// Get bucket icon from shared cache
    public static func getBucketIconFromSharedCache(bucketId: String, bucketName: String, bucketColor: String?) -> Data? {
        let cacheDirectory = getSharedMediaCacheDirectory()
        let bucketIconDirectory = cacheDirectory.appendingPathComponent("BUCKET_ICON")
        
        // Generate filename based on bucket info with version identifier and color
        // Version v2: includes transparent background processing
        // Include color in filename so icons regenerate when color changes
        let safeBucketName = bucketName
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "/", with: "_")
        let safeColor = (bucketColor ?? "default")
            .replacingOccurrences(of: "#", with: "")
            .replacingOccurrences(of: " ", with: "_")
        let fileName = "bucket_icon_v2_\(bucketId)_\(safeBucketName)_\(safeColor).png"
        let fileURL = bucketIconDirectory.appendingPathComponent(fileName)
        
        // Check if icon exists
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            return nil
        }
        
        // Load icon data
        do {
            let data = try Data(contentsOf: fileURL)
            return data
        } catch {
            print("📱 [MediaAccess] ❌ Failed to load cached bucket icon: \(error)")
            return nil
        }
    }
    
    /// Download, process and cache bucket icon
    /// - Parameters:
    ///   - bucketIconUrl: URL of the bucket icon to download
    ///   - bucketId: Bucket ID for cache
    ///   - bucketName: Bucket name for cache
    ///   - bucketColor: Optional hex color for background processing
    /// - Returns: Processed image data, or nil if download/processing fails
    public static func downloadAndCacheBucketIcon(bucketIconUrl: String, bucketId: String, bucketName: String, bucketColor: String?) -> Data? {
        guard let url = URL(string: bucketIconUrl) else {
            print("📱 [MediaAccess] ❌ Invalid bucket icon URL: \(bucketIconUrl)")
            return nil
        }
        
        // Download the icon
        guard let imageData = try? Data(contentsOf: url) else {
            print("📱 [MediaAccess] ❌ Failed to download bucket icon from URL")
            return nil
        }
        
        print("📱 [MediaAccess] ✅ Successfully downloaded bucket icon from URL")
        
        // Process the icon to improve visibility for transparent backgrounds
        let processedImageData: Data
        if let processed = processBucketIcon(imageData, hexColor: bucketColor) {
            processedImageData = processed
            print("📱 [MediaAccess] ✅ Processed bucket icon for better visibility")
        } else {
            processedImageData = imageData
            print("📱 [MediaAccess] ⚠️ Failed to process icon, using original")
        }
        
        // Save to cache for future use
        let _ = saveBucketIconToSharedCache(processedImageData, bucketId: bucketId, bucketName: bucketName, bucketColor: bucketColor)
        
        return processedImageData
    }
    
    /// Save bucket icon to shared cache
    public static func saveBucketIconToSharedCache(_ imageData: Data, bucketId: String, bucketName: String, bucketColor: String?) -> URL? {
        let cacheDirectory = getSharedMediaCacheDirectory()
        let bucketIconDirectory = cacheDirectory.appendingPathComponent("BUCKET_ICON")
        
        // Create bucket icon directory if it doesn't exist
        do {
            try FileManager.default.createDirectory(
                at: bucketIconDirectory,
                withIntermediateDirectories: true,
                attributes: nil
            )
        } catch {
            print("📱 [MediaAccess] ❌ Failed to create bucket icon directory: \(error)")
            return nil
        }
        
        // Generate filename based on bucket info with version identifier and color
        // Version v2: includes transparent background processing
        // Include color in filename so icons regenerate when color changes
        let safeBucketName = bucketName
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "/", with: "_")
        let safeColor = (bucketColor ?? "default")
            .replacingOccurrences(of: "#", with: "")
            .replacingOccurrences(of: " ", with: "_")
        let fileName = "bucket_icon_v2_\(bucketId)_\(safeBucketName)_\(safeColor).png"
        let fileURL = bucketIconDirectory.appendingPathComponent(fileName)
        
        do {
            try imageData.write(to: fileURL)
            print("📱 [MediaAccess] ✅ Saved bucket icon to shared cache: \(fileURL.lastPathComponent)")
            return fileURL
        } catch {
            print("📱 [MediaAccess] ❌ Failed to save bucket icon to shared cache: \(error)")
            return nil
        }
    }
    
    /// Save placeholder to shared cache
    public static func savePlaceholderToSharedCache(_ imageData: Data, bucketId: String, bucketName: String) -> URL? {
        let cacheDirectory = getSharedMediaCacheDirectory()
        let placeholderDirectory = cacheDirectory.appendingPathComponent("PLACEHOLDER")
        
        // Create placeholder directory if it doesn't exist
        do {
            try FileManager.default.createDirectory(
                at: placeholderDirectory,
                withIntermediateDirectories: true,
                attributes: nil
            )
        } catch {
            print("📱 [MediaAccess] ❌ Failed to create placeholder directory: \(error)")
            return nil
        }
        
        // Generate filename based on bucket info
        let safeBucketName = bucketName
            .replacingOccurrences(of: " ", with: "_")
            .replacingOccurrences(of: "/", with: "_")
        let fileName = "placeholder_\(bucketId)_\(safeBucketName).png"
        let fileURL = placeholderDirectory.appendingPathComponent(fileName)
        
        do {
            try imageData.write(to: fileURL)
            print("📱 [MediaAccess] ✅ Saved placeholder to shared cache: \(fileURL.lastPathComponent)")
            return fileURL
        } catch {
            print("📱 [MediaAccess] ❌ Failed to save placeholder to shared cache: \(error)")
            return nil
        }
    }
}
