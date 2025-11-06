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
        
        print("⌚ [WatchConnectivity] 📦 Loading \(cache.notifications.count) notifications from cache")
        
        self.notifications = cache.notifications.map { cachedNotif in
            // Convert CachedAttachment to WidgetAttachment
            let attachments = cachedNotif.attachments.map { cachedAttachment in
                DatabaseAccess.WidgetAttachment(
                    mediaType: cachedAttachment.mediaType,
                    url: cachedAttachment.url,
                    name: cachedAttachment.name
                )
            }
            
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
                bucketIconUrl: cachedNotif.bucketIconUrl,
                attachments: attachments
            )
            return NotificationData(notification: notification)
        }
        
        // Calculate last notification date for each bucket and sort by it
        var bucketsWithDates: [(bucket: BucketItem, lastNotificationDate: Date)] = []
        
        for cachedBucket in cache.buckets {
            // Find the most recent notification for this bucket
            let bucketNotifications = self.notifications.filter { $0.notification.bucketId == cachedBucket.id }
            let lastNotificationDate = bucketNotifications
                .compactMap { notification -> Date? in
                    let formatter = ISO8601DateFormatter()
                    return formatter.date(from: notification.notification.createdAt)
                }
                .max() ?? Date.distantPast
            
            let bucket = BucketItem(
                id: cachedBucket.id,
                name: cachedBucket.name,
                unreadCount: cachedBucket.unreadCount,
                color: cachedBucket.color,
                iconUrl: cachedBucket.iconUrl
            )
            
            bucketsWithDates.append((bucket: bucket, lastNotificationDate: lastNotificationDate))
        }
        
        // Sort buckets by last notification date (most recent first)
        self.buckets = bucketsWithDates
            .sorted { $0.lastNotificationDate > $1.lastNotificationDate }
            .map { $0.bucket }
        
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
                bucketIconUrl: updatedNotif.bucketIconUrl,
                attachments: updatedNotif.attachments
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
    
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        print("⌚ [WatchConnectivity] 📦 Received background transfer")
        
        guard let action = userInfo["action"] as? String else {
            print("⌚ [WatchConnectivity] ⚠️ No action in userInfo")
            return
        }
        
        DispatchQueue.main.async {
            switch action {
            case "newNotification":
                self.handleNewNotification(userInfo)
            default:
                print("⌚ [WatchConnectivity] ⚠️ Unknown action: \(action)")
            }
        }
    }
    
    private func handleNewNotification(_ notifDict: [String: Any]) {
        guard let id = notifDict["id"] as? String,
              let title = notifDict["title"] as? String,
              let body = notifDict["body"] as? String,
              let bucketId = notifDict["bucketId"] as? String,
              let isRead = notifDict["isRead"] as? Bool,
              let createdAt = notifDict["createdAt"] as? String else {
            print("⌚ [WatchConnectivity] ❌ Invalid notification data")
            return
        }
        
        // Extract attachments
        var attachments: [DatabaseAccess.WidgetAttachment] = []
        if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
            attachments = attachmentsArray.compactMap { attachmentDict in
                guard let mediaType = attachmentDict["mediaType"] as? String else {
                    return nil
                }
                let url = attachmentDict["url"] as? String
                let name = attachmentDict["name"] as? String
                return DatabaseAccess.WidgetAttachment(
                    mediaType: mediaType,
                    url: url,
                    name: name
                )
            }
            print("⌚ [WatchConnectivity] ✅ Successfully parsed \(attachments.count) attachments")
        } else {
            print("⌚ [WatchConnectivity] ⚠️ attachments key not found or not an array")
        }
        
        let notification = DatabaseAccess.WidgetNotification(
            id: id,
            title: title,
            body: body,
            subtitle: notifDict["subtitle"] as? String,
            createdAt: createdAt,
            isRead: isRead,
            bucketId: bucketId,
            bucketName: notifDict["bucketName"] as? String,
            bucketColor: notifDict["bucketColor"] as? String,
            bucketIconUrl: notifDict["bucketIconUrl"] as? String,
            attachments: attachments
        )
        
        // Add to local cache
        var cache = dataStore.loadCache()
        
        // Check if notification already exists
        if let existingIndex = cache.notifications.firstIndex(where: { $0.id == id }) {
            print("⌚ [WatchConnectivity] ℹ️ Notification already exists, skipping: \(title)")
            return
        }
        
        // Convert to CachedNotification
        let cachedAttachments = attachments.map { attachment in
            WatchDataStore.CachedAttachment(
                mediaType: attachment.mediaType,
                url: attachment.url,
                name: attachment.name
            )
        }
        
        let cachedNotif = WatchDataStore.CachedNotification(
            id: id,
            title: title,
            body: body,
            subtitle: notifDict["subtitle"] as? String,
            createdAt: createdAt,
            isRead: isRead,
            bucketId: bucketId,
            bucketName: notifDict["bucketName"] as? String,
            bucketColor: notifDict["bucketColor"] as? String,
            bucketIconUrl: notifDict["bucketIconUrl"] as? String,
            attachments: cachedAttachments
        )
        
        // Add to beginning of array (most recent first)
        cache.notifications.insert(cachedNotif, at: 0)
        
        // Limit to 100 notifications
        if cache.notifications.count > 100 {
            cache.notifications = Array(cache.notifications.prefix(100))
        }
        
        // Update unread count
        if !isRead {
            cache.unreadCount += 1
        }
        
        cache.lastUpdate = Date()
        dataStore.saveCache(cache)
        
        // Update published properties
        loadCachedData()
        
        print("⌚ [WatchConnectivity] ✅ Added new notification to cache: \(title)")
    }
}

