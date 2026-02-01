import Foundation

/// Stub for WatchSyncManager in NSE - the real implementation is not available in extensions
/// This provides compile-time compatibility while isAppExtension check prevents actual calls
public final class WatchSyncManager: NSObject {
    public static let shared = WatchSyncManager()
    
    /// Always returns false in NSE - WC sync is handled by main app
    public var isWCSyncEnabled: Bool {
        return false
    }
    
    private override init() {
        super.init()
    }
    
    // MARK: - Stub methods (no-op in NSE)
    // Signatures must match the real WatchSyncManager
    
    public func sendNotificationCreated(_ notification: [String: Any]) {
        // No-op in NSE
    }
    
    public func sendNotificationReadStatusUpdated(notificationId: String, readAt: Date?) {
        // No-op in NSE
    }
    
    public func sendNotificationsReadStatusUpdated(notificationIds: [String], readAt: Date?) {
        // No-op in NSE
    }
    
    public func sendNotificationDeleted(notificationId: String) {
        // No-op in NSE
    }
    
    public func sendNotificationsDeleted(notificationIds: [String]) {
        // No-op in NSE
    }
    
    public func sendBucketUpdated(_ bucket: [String: Any]) {
        // No-op in NSE
    }
    
    public func sendBucketDeleted(bucketId: String) {
        // No-op in NSE
    }
    
    public func updateWatchContext(unreadCount: Int, notificationCount: Int, bucketCount: Int) {
        // No-op in NSE
    }
    
    public func triggerFullSync(completion: @escaping (Bool, Error?) -> Void) {
        // No-op in NSE
        completion(false, nil)
    }
}
