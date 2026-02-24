import Foundation

// MARK: - Watch Sync Mode

enum WatchSyncMode: String, CaseIterable, Identifiable {
    case foregroundOnly = "foreground_only"
    case alwaysActive = "always_active"
    case backgroundInterval = "background_interval"

    var id: String { rawValue }
}

// MARK: - Background Sync Interval

enum WatchBackgroundInterval: Int, CaseIterable, Identifiable {
    case minutes15 = 15
    case minutes30 = 30
    case hours1 = 60
    case hours2 = 120
    case hours4 = 240

    var id: Int { rawValue }

    var label: String {
        switch self {
        case .minutes15: return "15 min"
        case .minutes30: return "30 min"
        case .hours1:    return "1 hour"
        case .hours2:    return "2 hours"
        case .hours4:    return "4 hours"
        }
    }

    var timeInterval: TimeInterval {
        TimeInterval(rawValue * 60)
    }
}

// MARK: - Watch Settings Manager

/// Manages Watch-specific settings stored in UserDefaults.
/// On iOS, returns default values since settings are managed on the Watch.
class WatchSettingsManager {
    static let shared = WatchSettingsManager()

    private let maxNotificationsLimitKey = "watch_max_notifications_limit"
    private let syncModeKey = "watch_sync_mode"
    private let backgroundIntervalKey = "watch_background_interval"

    private init() {}

    /// Maximum number of notifications to display (default: 100)
    var maxNotificationsLimit: Int {
        #if os(watchOS)
        let value = UserDefaults.standard.integer(forKey: maxNotificationsLimitKey)
        return value > 0 ? value : 100
        #else
        return 100
        #endif
    }

    /// Set maximum number of notifications to display (watchOS only)
    func setMaxNotificationsLimit(_ limit: Int) {
        #if os(watchOS)
        UserDefaults.standard.set(limit, forKey: maxNotificationsLimitKey)
        UserDefaults.standard.synchronize()
        #endif
    }

    /// CloudKit sync mode (default: foregroundOnly for best battery life)
    var syncMode: WatchSyncMode {
        #if os(watchOS)
        if let raw = UserDefaults.standard.string(forKey: syncModeKey),
           let mode = WatchSyncMode(rawValue: raw) {
            return mode
        }
        return .foregroundOnly
        #else
        return .foregroundOnly
        #endif
    }

    func setSyncMode(_ mode: WatchSyncMode) {
        #if os(watchOS)
        UserDefaults.standard.set(mode.rawValue, forKey: syncModeKey)
        UserDefaults.standard.synchronize()
        #endif
    }

    /// Background sync interval (default: 15 min)
    var backgroundInterval: WatchBackgroundInterval {
        #if os(watchOS)
        let raw = UserDefaults.standard.integer(forKey: backgroundIntervalKey)
        if raw > 0, let interval = WatchBackgroundInterval(rawValue: raw) {
            return interval
        }
        return .minutes15
        #else
        return .minutes15
        #endif
    }

    func setBackgroundInterval(_ interval: WatchBackgroundInterval) {
        #if os(watchOS)
        UserDefaults.standard.set(interval.rawValue, forKey: backgroundIntervalKey)
        UserDefaults.standard.synchronize()
        #endif
    }
}
