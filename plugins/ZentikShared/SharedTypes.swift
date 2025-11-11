import Foundation

/**
 * SharedTypes - Common data structures
 * 
 * Provides shared enums, structs, and constants used across
 * NSE, NCE, and main app.
 */

// MARK: - Notification Action Types

public enum NotificationActionType: String, CaseIterable {
    case markAsRead = "MARK_AS_READ"
    case backgroundCall = "BACKGROUND_CALL"
    case postpone = "POSTPONE"
    case webhook = "WEBHOOK"
    case snooze = "SNOOZE"
    case delete = "DELETE"
    
    /// Check if action type is allowed (watchOS compatibility)
    public static var allowedTypes: [String] {
        return NotificationActionType.allCases.map { $0.rawValue }
    }
}

// MARK: - Notification Action Structure

public struct NotificationAction: Codable {
    public let type: String
    public let label: String
    public let id: String?
    public let url: String?
    public let bucketId: String?
    public let minutes: Int?
    
    public init(type: String, label: String, id: String? = nil, url: String? = nil, bucketId: String? = nil, minutes: Int? = nil) {
        self.type = type
        self.label = label
        self.id = id
        self.url = url
        self.bucketId = bucketId
        self.minutes = minutes
    }
    
    /// Check if action type is allowed
    public var isAllowed: Bool {
        return NotificationActionType.allowedTypes.contains(type)
    }
}

// MARK: - Notification Data Structures

/// Attachment entry for notifications
public struct WidgetAttachment: Codable {
    public let mediaType: String
    public let url: String?
    public let name: String?
    
    public init(mediaType: String, url: String?, name: String?) {
        self.mediaType = mediaType
        self.url = url
        self.name = name
    }
}

/// Bucket entry for widget/watch display
public struct WidgetBucket: Codable {
    public let id: String
    public let name: String
    public let unreadCount: Int
    public let color: String?
    public let iconUrl: String?
    
    public init(id: String, name: String, unreadCount: Int, color: String? = nil, iconUrl: String? = nil) {
        self.id = id
        self.name = name
        self.unreadCount = unreadCount
        self.color = color
        self.iconUrl = iconUrl
    }
}

/// Notification entry for widget/watch display
public struct WidgetNotification: Codable {
    public let id: String
    public let title: String
    public let body: String
    public let subtitle: String?
    public let createdAt: String
    public let isRead: Bool
    public let bucketId: String
    public let bucketName: String?
    public let bucketColor: String?
    public let bucketIconUrl: String?
    public let attachments: [WidgetAttachment]
    public let actions: [NotificationAction]
    
    /// Parsed Date from createdAt ISO8601 string
    /// Centralized date parsing to avoid ISO8601DateFormatter state pollution
    public var createdAtDate: Date {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // Try with fractional seconds first
        if let date = formatter.date(from: createdAt) {
            return date
        }
        
        // Fallback: try without fractional seconds
        formatter.formatOptions = [.withInternetDateTime]
        if let date = formatter.date(from: createdAt) {
            return date
        }
        
        // Last resort: return current date (should never happen)
        print("⚠️ Failed to parse createdAt: \(createdAt)")
        return Date()
    }
    
    /// Filter actions to only show allowed types
    public var allowedActions: [NotificationAction] {
        return actions.filter { $0.isAllowed }
    }
    
    public init(id: String, title: String, body: String, subtitle: String?, createdAt: String, isRead: Bool, bucketId: String, bucketName: String? = nil, bucketColor: String? = nil, bucketIconUrl: String? = nil, attachments: [WidgetAttachment] = [], actions: [NotificationAction] = []) {
        self.id = id
        self.title = title
        self.body = body
        self.subtitle = subtitle
        self.createdAt = createdAt
        self.isRead = isRead
        self.bucketId = bucketId
        self.bucketName = bucketName
        self.bucketColor = bucketColor
        self.bucketIconUrl = bucketIconUrl
        self.attachments = attachments
        self.actions = actions
    }
}

// MARK: - App Configuration

public struct AppConfig {
    /// Main bundle identifier
    public static let mainBundleId = KeychainAccess.getMainBundleIdentifier()
    
    /// App Group identifier
    public static let appGroupId = "group.\(mainBundleId)"
    
    /// Keychain access group
    public static let keychainAccessGroup = KeychainAccess.getKeychainAccessGroup()
    
    /// Team ID
    public static let teamId = "C3F24V5NS5"
    
    /// NSE bundle identifier
    public static let nseBundle = "\(mainBundleId).NotificationServiceExtension"
    
    /// NCE bundle identifier
    public static let nceBundle = "\(mainBundleId).NotificationContentExtension"
}

// MARK: - Constants

public struct Constants {
    /// Maximum number of notification actions (watchOS limit)
    public static let maxActions = 6
    
    /// Default notification category
    public static let defaultCategory = "ZENTIK_NOTIFICATION"
    
    /// Log buffer size
    public static let logBufferSize = 20
    
    /// Log flush interval (seconds)
    public static let logFlushInterval: TimeInterval = 5.0
    
    /// Database name
    public static let databaseName = "cache.db"
    
    /// HTTP timeout interval (seconds)
    public static let httpTimeoutInterval: TimeInterval = 30.0
}

// MARK: - Error Types

public enum ZentikError: Error, LocalizedError {
    case keychainAccessFailed
    case databaseAccessFailed
    case networkRequestFailed
    case invalidConfiguration
    case notificationProcessingFailed
    
    public var errorDescription: String? {
        switch self {
        case .keychainAccessFailed:
            return "Failed to access keychain"
        case .databaseAccessFailed:
            return "Failed to access database"
        case .networkRequestFailed:
            return "Network request failed"
        case .invalidConfiguration:
            return "Invalid configuration"
        case .notificationProcessingFailed:
            return "Failed to process notification"
        }
    }
}

// MARK: - Helper Extensions

public extension Dictionary where Key == String, Value == Any {
    /// Safely get string value
    func getString(_ key: String) -> String? {
        return self[key] as? String
    }
    
    /// Safely get int value
    func getInt(_ key: String) -> Int? {
        return self[key] as? Int
    }
    
    /// Safely get bool value
    func getBool(_ key: String) -> Bool? {
        return self[key] as? Bool
    }
    
    /// Safely get dictionary value
    func getDict(_ key: String) -> [String: Any]? {
        return self[key] as? [String: Any]
    }
    
    /// Safely get array value
    func getArray(_ key: String) -> [[String: Any]]? {
        return self[key] as? [[String: Any]]
    }
}
