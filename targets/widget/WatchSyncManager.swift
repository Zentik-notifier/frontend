import Foundation

/// Stub for WatchSyncManager in Widget - the real implementation is not available in extensions
/// This provides compile-time compatibility while isAppExtension check prevents actual calls
public final class WatchSyncManager: NSObject {
    public static let shared = WatchSyncManager()
    
    /// Always returns false in Widget - WC sync is handled by main app
    public var isWCSyncEnabled: Bool {
        return false
    }
    
    private override init() {
        super.init()
    }
    
    // MARK: - Stub methods (no-op in Widget)
    // Signatures must match the real WatchSyncManager
    
    public func sendNotificationCreated(_ notification: [String: Any]) {
        // No-op in Widget
    }
    
    public func sendNotificationReadStatusUpdated(notificationId: String, readAt: Date?) {
        // No-op in Widget
    }
    
    public func sendNotificationsReadStatusUpdated(notificationIds: [String], readAt: Date?) {
        // No-op in Widget
    }
    
    public func sendNotificationDeleted(notificationId: String) {
        // No-op in Widget
    }
    
    public func sendNotificationsDeleted(notificationIds: [String]) {
        // No-op in Widget
    }
    
    public func sendBucketUpdated(_ bucket: [String: Any]) {
        // No-op in Widget
    }
    
    public func sendBucketDeleted(bucketId: String) {
        // No-op in Widget
    }
    
    public func updateWatchContext(unreadCount: Int, notificationCount: Int, bucketCount: Int) {
        // No-op in Widget
    }
    
    public func triggerFullSync(completion: @escaping (Bool, Error?) -> Void) {
        // No-op in Widget
        completion(false, nil)
    }
}
