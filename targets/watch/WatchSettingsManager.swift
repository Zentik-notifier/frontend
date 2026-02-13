import Foundation

// MARK: - Watch Settings Manager

/// Manages Watch-specific settings stored in UserDefaults.
/// On iOS, returns default values since settings are managed on the Watch.
class WatchSettingsManager {
    static let shared = WatchSettingsManager()

    private let maxNotificationsLimitKey = "watch_max_notifications_limit"

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
}
