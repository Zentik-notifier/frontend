import Foundation

// MARK: - Subscription Sync Mode

/// Controls how CloudKit subscriptions behave relative to app lifecycle.
///
/// - `foregroundOnly`: Subscriptions are active only while the app is in the foreground.
///   When the app moves to background, subscriptions are disabled after a grace period (5 min).
///   Most battery-friendly option.
///
/// - `alwaysActive`: Subscriptions remain active at all times, including in the background.
///   Push notifications are processed even when the app is not in the foreground.
///   Higher battery usage but ensures real-time updates.
///
/// - `backgroundInterval`: Subscriptions are disabled in background, but a periodic
///   background refresh is scheduled to perform incremental syncs at regular intervals (30 min).
///   This is the default — balanced approach between battery life and data freshness.
@objc public enum SubscriptionSyncMode: Int, CaseIterable {
    case foregroundOnly = 0
    case alwaysActive = 1
    case backgroundInterval = 2
    
    public var stringValue: String {
        switch self {
        case .foregroundOnly: return "foregroundOnly"
        case .alwaysActive: return "alwaysActive"
        case .backgroundInterval: return "backgroundInterval"
        }
    }
    
    public static func from(string: String) -> SubscriptionSyncMode {
        switch string {
        case "alwaysActive": return .alwaysActive
        case "backgroundInterval": return .backgroundInterval
        default: return .backgroundInterval
        }
    }
}

// MARK: - Watch Settings Manager

/// Manages Watch-specific settings stored in UserDefaults
/// On iOS, this returns default values since settings are managed on the Watch
class WatchSettingsManager {
    static let shared = WatchSettingsManager()
    
    private let maxNotificationsLimitKey = "watch_max_notifications_limit"
    private let subscriptionSyncModeKey = "watch_subscription_sync_mode"
    
    /// Posted when subscriptionSyncMode changes (userInfo: ["mode": SubscriptionSyncMode])
    static let syncModeChangedNotification = NSNotification.Name("WatchSubscriptionSyncModeChanged")
    
    private init() {}
    
    /// Get maximum number of notifications to display (default: 100)
    var maxNotificationsLimit: Int {
        #if os(watchOS)
        let value = UserDefaults.standard.integer(forKey: maxNotificationsLimitKey)
        return value > 0 ? value : 100 // Default to 100 if not set
        #else
        // On iOS, always return default value
        // The actual limit is managed on the Watch
        return 100
        #endif
    }
    
    /// Set maximum number of notifications to display
    /// Only functional on watchOS
    func setMaxNotificationsLimit(_ limit: Int) {
        #if os(watchOS)
        UserDefaults.standard.set(limit, forKey: maxNotificationsLimitKey)
        UserDefaults.standard.synchronize()
        #endif
    }
    
    // MARK: - Subscription Sync Mode
    
    /// Current subscription sync mode (default: .backgroundInterval)
    var subscriptionSyncMode: SubscriptionSyncMode {
        get {
            #if os(watchOS)
            // UserDefaults returns 0 for unset keys, which maps to .foregroundOnly (rawValue 0).
            // To default to .backgroundInterval we check if the key has been explicitly set.
            if UserDefaults.standard.object(forKey: subscriptionSyncModeKey) == nil {
                return .backgroundInterval
            }
            let raw = UserDefaults.standard.integer(forKey: subscriptionSyncModeKey)
            return SubscriptionSyncMode(rawValue: raw) ?? .backgroundInterval
            #else
            return .backgroundInterval
            #endif
        }
        set {
            #if os(watchOS)
            let oldValue = subscriptionSyncMode
            UserDefaults.standard.set(newValue.rawValue, forKey: subscriptionSyncModeKey)
            UserDefaults.standard.synchronize()
            if oldValue != newValue {
                NotificationCenter.default.post(
                    name: WatchSettingsManager.syncModeChangedNotification,
                    object: nil,
                    userInfo: ["mode": newValue]
                )
            }
            #endif
        }
    }
}
