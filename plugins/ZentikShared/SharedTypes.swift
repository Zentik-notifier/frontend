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
    
    public static func stringFrom(int: Int) -> String? {
        // IMPORTANT: this mapping MUST stay in sync with
        // backend/src/notifications/ios-push.service.ts ActionTypeMap
        // to ensure NSE/NCE interpret compact "t" codes correctly.
        //
        // ActionTypeMap backend:
        //   DELETE           -> 1
        //   MARK_AS_READ     -> 2
        //   OPEN_NOTIFICATION-> 3
        //   NAVIGATE         -> 4
        //   BACKGROUND_CALL  -> 5
        //   SNOOZE           -> 6
        //   POSTPONE         -> 7
        //   WEBHOOK          -> 8
        switch int {
        case 1: return "DELETE"
        case 2: return "MARK_AS_READ"
        case 3: return "OPEN_NOTIFICATION"
        case 4: return "NAVIGATE"
        case 5: return "BACKGROUND_CALL"
        case 6: return "SNOOZE"
        case 7: return "POSTPONE"
        case 8: return "WEBHOOK"
        default: return nil
        }
    }
    
    /// Check if action type is allowed (watchOS compatibility)
    public static var allowedTypes: [String] {
        return NotificationActionType.allCases.map { $0.rawValue }
    }
}

// MARK: - Notification Action Structure

public struct NotificationAction: Codable {
    public let type: String
    public let label: String
    public let value: String?
    public let id: String?
    public let url: String?
    public let bucketId: String?
    public let minutes: Int?
    
    public init(type: String, label: String, value: String? = nil, id: String? = nil, url: String? = nil, bucketId: String? = nil, minutes: Int? = nil) {
        self.type = type
        self.label = label
        self.value = value
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
    
    /// Filter actions for Watch display (excludes DELETE and MARK_AS_READ since Watch has dedicated buttons)
    public var watchDisplayActions: [NotificationAction] {
        return allowedActions.filter { action in
            action.type != NotificationActionType.delete.rawValue && 
            action.type != NotificationActionType.markAsRead.rawValue
        }
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
    
    /// Darwin notification name for new notifications (NSE -> Main App)
    public static let darwinNotificationName = KeychainAccess.getDarwinNotificationName()
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

// MARK: - Parsing Utilities

public struct NotificationParser {
    
    /// Parse attachments from dictionary array
    public static func parseAttachments(from dictArray: [[String: Any]]?) -> [WidgetAttachment] {
        guard let dictArray = dictArray else { return [] }
        
        var attachments: [WidgetAttachment] = []
        for attachmentDict in dictArray {
            if let mediaType = attachmentDict.getString("mediaType") {
                let attachment = WidgetAttachment(
                    mediaType: mediaType,
                    url: attachmentDict.getString("url"),
                    name: attachmentDict.getString("name")
                )
                attachments.append(attachment)
            }
        }
        return attachments
    }
    
    /// Parse actions from dictionary array
    public static func parseActions(from dictArray: [[String: Any]]?) -> [NotificationAction] {
        guard let dictArray = dictArray else { return [] }
        
        var actions: [NotificationAction] = []
        for actionDict in dictArray {
            var type = actionDict.getString("type")
            if type == nil, let t = actionDict.getInt("t") {
                type = NotificationActionType.stringFrom(int: t)
            }
            
            if let type = type {
                let action = NotificationAction(
                    type: type,
                    label: actionDict.getString("label") ?? actionDict.getString("title") ?? "",
                    value: actionDict.getString("value") ?? actionDict.getString("v"),
                    id: actionDict.getString("id"),
                    url: actionDict.getString("url"),
                    bucketId: actionDict.getString("bucketId"),
                    minutes: actionDict.getInt("minutes")
                )
                actions.append(action)
            }
        }
        return actions
    }
    
    /// Serialize attachments to dictionary array
    public static func serializeAttachments(_ attachments: [WidgetAttachment]) -> [[String: Any]] {
        var result: [[String: Any]] = []
        for attachment in attachments {
            var dict: [String: Any] = ["mediaType": attachment.mediaType]
            if let url = attachment.url {
                dict["url"] = url
            }
            if let name = attachment.name {
                dict["name"] = name
            }
            result.append(dict)
        }
        return result
    }
    
    /// Serialize actions to dictionary array
    public static func serializeActions(_ actions: [NotificationAction]) -> [[String: Any]] {
        var result: [[String: Any]] = []
        for action in actions {
            var dict: [String: Any] = [
                "type": action.type,
                "label": action.label
            ]
            if let value = action.value {
                dict["value"] = value
            }
            if let id = action.id {
                dict["id"] = id
            }
            if let url = action.url {
                dict["url"] = url
            }
            if let bucketId = action.bucketId {
                dict["bucketId"] = bucketId
            }
            if let minutes = action.minutes {
                dict["minutes"] = minutes
            }
            result.append(dict)
        }
        return result
    }
}

// MARK: - Shared Utils

public struct SharedUtils {
    /// Normalize UUID string (add hyphens if missing)
    public static func normalizeUUID(_ uuid: String?) -> String? {
        guard let uuid = uuid else { return nil }
        
        // If already has hyphens (36 chars), return as is
        if uuid.count == 36 && uuid.contains("-") { return uuid }
        
        // If stripped (32 chars), add hyphens: 8-4-4-4-12
        if uuid.count == 32 {
            let p1 = uuid.prefix(8)
            let p2 = uuid.dropFirst(8).prefix(4)
            let p3 = uuid.dropFirst(12).prefix(4)
            let p4 = uuid.dropFirst(16).prefix(4)
            let p5 = uuid.dropFirst(20)
            return "\(p1)-\(p2)-\(p3)-\(p4)-\(p5)"
        }
        
        return uuid
    }
}
