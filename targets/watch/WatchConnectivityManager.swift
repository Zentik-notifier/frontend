import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    @Published var lastUpdate: Date?
    
    private let dataStore = WatchDataStore.shared
    
    private override init() {
        super.init()
        
        // Load cached data immediately on init
        loadCachedData()
        
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }
    
    // MARK: - Load Cached Data
    
    private func loadCachedData() {
        let cache = dataStore.loadCache()
        
        self.notifications = cache.notifications.map { cachedNotif in
            let notification = DatabaseAccess.WidgetNotification(
                id: cachedNotif.id,
                title: cachedNotif.title,
                body: cachedNotif.body,
                subtitle: cachedNotif.subtitle,
                createdAt: cachedNotif.createdAt,
                isRead: cachedNotif.isRead,
                bucketId: cachedNotif.bucketId,
                bucketName: cachedNotif.bucketName,
                bucketColor: cachedNotif.bucketColor,
                bucketIconUrl: cachedNotif.bucketIconUrl
            )
            return NotificationData(notification: notification)
        }
        
        self.buckets = cache.buckets.map { cachedBucket in
            BucketItem(
                id: cachedBucket.id,
                name: cachedBucket.name,
                unreadCount: cachedBucket.unreadCount,
                color: cachedBucket.color,
                iconUrl: cachedBucket.iconUrl
            )
        }
        
        self.unreadCount = cache.unreadCount
        self.lastUpdate = cache.lastUpdate
        
        print("⌚ [WatchConnectivity] ✅ Loaded \(notifications.count) notifications from cache")
    }
    
    func requestData() {
        guard WCSession.default.isReachable else {
            print("⌚ [WatchConnectivity] iPhone is not reachable, using cached data")
            // Reload from cache in case it was updated by another process
            loadCachedData()
            return
        }
        
        print("⌚ [WatchConnectivity] 🔄 Requesting fresh data from iPhone...")
        let message = ["action": "requestData"]
        WCSession.default.sendMessage(message, replyHandler: { reply in
            DispatchQueue.main.async {
                self.processReceivedData(reply)
            }
        }) { error in
            print("⌚ [WatchConnectivity] ❌ Error requesting data: \(error.localizedDescription)")
            // Fallback to cached data
            self.loadCachedData()
        }
    }
    
    func deleteNotification(id: String, completion: @escaping (Bool) -> Void) {
        // Always update local cache first for instant feedback
        dataStore.deleteNotification(id: id)
        notifications.removeAll { $0.notification.id == id }
        
        // Recalculate unread count
        unreadCount = notifications.filter { !$0.notification.isRead }.count
        
        print("⌚ [WatchConnectivity] ✅ Deleted notification locally: \(id)")
        
        // Try to sync with iPhone if available
        guard WCSession.default.isReachable else {
            print("⌚ [WatchConnectivity] iPhone not reachable, deletion saved locally only")
            completion(true) // Return success since local operation succeeded
            return
        }
        
        let message = ["action": "deleteNotification", "notificationId": id]
        WCSession.default.sendMessage(message, replyHandler: { reply in
            let success = reply["success"] as? Bool ?? false
            DispatchQueue.main.async {
                if success {
                    print("⌚ [WatchConnectivity] ✅ Deletion synced with iPhone")
                } else {
                    print("⌚ [WatchConnectivity] ⚠️ iPhone deletion failed, but local deletion succeeded")
                }
                completion(true) // Always return success since local operation succeeded
            }
        }) { error in
            print("⌚ [WatchConnectivity] ⚠️ Error syncing deletion with iPhone: \(error.localizedDescription)")
            completion(true) // Still return success since local operation succeeded
        }
    }
    
    func markAsRead(id: String, completion: @escaping (Bool) -> Void) {
        // Always update local cache first for instant feedback
        dataStore.markNotificationAsRead(id: id)
        
        if let index = notifications.firstIndex(where: { $0.notification.id == id }) {
            var updatedNotif = notifications[index].notification
            updatedNotif = DatabaseAccess.WidgetNotification(
                id: updatedNotif.id,
                title: updatedNotif.title,
                body: updatedNotif.body,
                subtitle: updatedNotif.subtitle,
                createdAt: updatedNotif.createdAt,
                isRead: true, // Mark as read
                bucketId: updatedNotif.bucketId,
                bucketName: updatedNotif.bucketName,
                bucketColor: updatedNotif.bucketColor,
                bucketIconUrl: updatedNotif.bucketIconUrl
            )
            notifications[index] = NotificationData(notification: updatedNotif)
            
            // Update unread count
            unreadCount = max(0, unreadCount - 1)
        }
        
        print("⌚ [WatchConnectivity] ✅ Marked as read locally: \(id)")
        
        // Try to sync with iPhone if available
        guard WCSession.default.isReachable else {
            print("⌚ [WatchConnectivity] iPhone not reachable, mark as read saved locally only")
            completion(true) // Return success since local operation succeeded
            return
        }
        
        let message = ["action": "markAsRead", "notificationId": id]
        WCSession.default.sendMessage(message, replyHandler: { reply in
            let success = reply["success"] as? Bool ?? false
            DispatchQueue.main.async {
                if success {
                    print("⌚ [WatchConnectivity] ✅ Mark as read synced with iPhone")
                } else {
                    print("⌚ [WatchConnectivity] ⚠️ iPhone mark as read failed, but local update succeeded")
                }
                completion(true) // Always return success since local operation succeeded
            }
        }) { error in
            print("⌚ [WatchConnectivity] ⚠️ Error syncing mark as read with iPhone: \(error.localizedDescription)")
            completion(true) // Still return success since local operation succeeded
        }
    }
    
    private func processReceivedData(_ data: [String: Any]) {
        let notificationsData = data["notifications"] as? [[String: Any]] ?? []
        let bucketsData = data["buckets"] as? [[String: Any]] ?? []
        let unreadCount = data["unreadCount"] as? Int ?? 0
        
        // Save to JSON cache first
        dataStore.updateFromiPhone(
            notifications: notificationsData,
            buckets: bucketsData,
            unreadCount: unreadCount
        )
        
        // Then update published properties from cache
        loadCachedData()
        
        print("⌚ [WatchConnectivity] ✅ Received and saved fresh data from iPhone")
    }
    
}

extension WatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("⌚ WCSession activation failed: \(error.localizedDescription)")
        } else {
            print("⌚ WCSession activated: \(activationState.rawValue)")
            DispatchQueue.main.async {
                self.isConnected = session.isReachable
            }
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        // Handle messages from iPhone
        if let action = message["action"] as? String {
            switch action {
            case "updateData":
                DispatchQueue.main.async {
                    self.processReceivedData(message)
                }
                replyHandler(["success": true])
            default:
                replyHandler(["error": "Unknown action"])
            }
        }
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        DispatchQueue.main.async {
            self.isConnected = session.isReachable
        }
    }
}

