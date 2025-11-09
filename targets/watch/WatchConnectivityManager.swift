import Foundation
import WatchConnectivity
import CloudKit

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    @Published var lastUpdate: Date?
    
    private let dataStore = WatchDataStore.shared
    private let cloudKitManager = CloudKitSyncManager.shared
    
    // Timer per invio automatico log
    private var logSyncTimer: Timer?
    private let logSyncInterval: TimeInterval = 10.0 // Ogni 10 secondi
    
    private override init() {
        super.init()
        
        // Load cached data immediately on init (fast startup)
        loadCachedData()
        
        // Then fetch from CloudKit to update data
        fetchFromCloudKit()
        
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
        
        // Setup automatic log sync
        setupAutomaticLogSync()
    }
    
    // MARK: - Automatic Log Sync
    
    /**
     * Setup timer to automatically send logs to iPhone periodically
     */
    private func setupAutomaticLogSync() {
        // Send logs every minute if there are any
        logSyncTimer = Timer.scheduledTimer(withTimeInterval: logSyncInterval, repeats: true) { [weak self] _ in
            self?.sendLogsToiPhoneIfNeeded()
        }
        
        print("⌚ [WatchConnectivity] 🔄 Automatic log sync enabled (every \(Int(logSyncInterval))s)")
    }
    
    /**
     * Send logs to iPhone only if there are logs to send
     */
    private func sendLogsToiPhoneIfNeeded() {
        let logs = LoggingSystem.shared.readLogs()
        
        // Only send if there are logs
        guard logs.count > 0 else {
            return
        }
        
        print("⌚ [WatchConnectivity] 📊 Auto-sync: Found \(logs.count) logs to send")
        sendLogsToiPhone()
    }
    
    // MARK: - Load Cached Data
    
    /**
     * Load data from cache and completely overwrite in-memory state
     */
    private func loadCachedData() {
        let cache = dataStore.loadCache()
        
        // COMPLETE OVERWRITE of notifications array
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
            
            // Parse dates and find the most recent
            let formatter = ISO8601DateFormatter()
            formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            
            let notificationDates = bucketNotifications.compactMap { notification -> (id: String, date: Date)? in
                if let date = formatter.date(from: notification.notification.createdAt) {
                    return (id: notification.notification.id, date: date)
                } else {
                    // Try without fractional seconds
                    formatter.formatOptions = [.withInternetDateTime]
                    if let date = formatter.date(from: notification.notification.createdAt) {
                        return (id: notification.notification.id, date: date)
                    } else {
                        print("⌚ [WatchConnectivity] ⚠️ Failed to parse date for notification \(notification.notification.id): \(notification.notification.createdAt)")
                        return nil
                    }
                }
            }
            
            let lastNotificationDate = notificationDates.max(by: { $0.date < $1.date })?.date ?? Date.distantPast
            
            if !notificationDates.isEmpty {
                let mostRecent = notificationDates.max(by: { $0.date < $1.date })!
                print("⌚ [WatchConnectivity] 📅 Bucket '\(cachedBucket.name)' - Most recent: \(mostRecent.id) at \(mostRecent.date)")
            }
            
            // Calculate total count for this bucket
            let totalCount = bucketNotifications.count
            
            let bucket = BucketItem(
                id: cachedBucket.id,
                name: cachedBucket.name,
                unreadCount: cachedBucket.unreadCount,
                totalCount: totalCount,
                color: cachedBucket.color,
                iconUrl: cachedBucket.iconUrl
            )
            
            bucketsWithDates.append((bucket: bucket, lastNotificationDate: lastNotificationDate))
        }
        
        // Sort buckets by last notification date (most recent first)
        self.buckets = bucketsWithDates
            .sorted { $0.lastNotificationDate > $1.lastNotificationDate }
            .map { $0.bucket }
        
        // Log bucket order for debugging
        print("⌚ [WatchConnectivity] 📊 Bucket order:")
        for (index, item) in self.buckets.enumerated() {
            let lastNotifDate = bucketsWithDates.first(where: { $0.bucket.id == item.id })?.lastNotificationDate ?? Date.distantPast
            print("  \(index + 1). \(item.name) - \(item.totalCount) notifications - Last: \(lastNotifDate)")
        }
        
        // COMPLETE OVERWRITE of unread count and lastUpdate
        self.unreadCount = cache.unreadCount
        self.lastUpdate = cache.lastUpdate
        
        print("⌚ [WatchConnectivity] ✅ Loaded \(notifications.count) notifications from cache")
    }
    
    /**
     * Fetch data from CloudKit (primary source)
     * This method completely overwrites local cache and in-memory data
     */
    func fetchFromCloudKit() {
        cloudKitManager.fetchAll { [weak self] (ckBuckets: [CloudKitBucket], ckNotifications: [CloudKitNotification]) in
            guard let self = self else { return }
            
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                
                // Convert CloudKit data to cache format
                var bucketsData = ckBuckets.map { bucket -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": bucket.id,
                        "name": bucket.name,
                        "unreadCount": 0 // Will be calculated from notifications
                    ]
                    
                    if let color = bucket.color, !color.isEmpty {
                        dict["color"] = color
                    }
                    
                    if let iconUrl = bucket.iconUrl, !iconUrl.isEmpty {
                        dict["iconUrl"] = iconUrl
                    }
                    
                    return dict
                }
                
                // Calculate unread count per bucket
                var bucketUnreadCounts: [String: Int] = [:]
                for notification in ckNotifications {
                    if notification.readAt == nil {
                        bucketUnreadCounts[notification.bucketId, default: 0] += 1
                    }
                }
                
                // Update bucket unread counts
                for i in 0..<bucketsData.count {
                    if let bucketId = bucketsData[i]["id"] as? String {
                        bucketsData[i]["unreadCount"] = bucketUnreadCounts[bucketId] ?? 0
                    }
                }
                
                // Create a lookup map for buckets by ID (handle duplicates by keeping first occurrence)
                var bucketMap: [String: CloudKitBucket] = [:]
                for bucket in ckBuckets {
                    if bucketMap[bucket.id] == nil {
                        bucketMap[bucket.id] = bucket
                    }
                }
                
                let notificationsData = ckNotifications.map { notif -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": notif.id,
                        "title": notif.title,
                        "body": notif.body ?? "",
                        "bucketId": notif.bucketId,
                        "isRead": notif.readAt != nil,
                        "createdAt": DateConverter.dateToString(notif.createdAt)
                    ]
                    
                    if let subtitle = notif.subtitle, !subtitle.isEmpty {
                        dict["subtitle"] = subtitle
                    }
                    
                    // Add bucket info from bucket lookup
                    if let bucket = bucketMap[notif.bucketId] {
                        dict["bucketName"] = bucket.name
                        if let color = bucket.color, !color.isEmpty {
                            dict["bucketColor"] = color
                        }
                        if let iconUrl = bucket.iconUrl, !iconUrl.isEmpty {
                            dict["bucketIconUrl"] = iconUrl
                        }
                    }
                    
                    // Attachments
                    if !notif.attachments.isEmpty {
                        let attachmentsData = notif.attachments.map { attachment -> [String: Any] in
                            var attachmentDict: [String: Any] = [
                                "mediaType": attachment.mediaType
                            ]
                            
                            if let url = attachment.url {
                                attachmentDict["url"] = url
                            }
                            
                            if let name = attachment.name {
                                attachmentDict["name"] = name
                            }
                            
                            return attachmentDict
                        }
                        dict["attachments"] = attachmentsData
                    }
                    
                    return dict
                }
                
                let totalUnreadCount = ckNotifications.filter { $0.readAt == nil }.count
                
                // Update cache with CloudKit data (COMPLETE OVERWRITE)
                self.dataStore.updateFromiPhone(
                    notifications: notificationsData,
                    buckets: bucketsData,
                    unreadCount: totalUnreadCount
                )
                
                // Reload from cache (this resets all in-memory data)
                self.loadCachedData()
                
                print("⌚ [WatchConnectivity] ✅ Synced from CloudKit: \(ckNotifications.count) notifications")
            }
        }
    }
    
    /**
     * Request data refresh from CloudKit
     * Used by manual refresh button in Watch UI
     * Forces full fetch from CloudKit
     */
    func requestData() {
        // Fetch directly from CloudKit (no WatchConnectivity involved)
        fetchFromCloudKit()
    }
    
    /**
     * Update data from iPhone via WatchConnectivity
     * Completely overwrites local cache and in-memory data
     */
    private func updateFromiPhoneMessage(notifications: [[String: Any]], buckets: [[String: Any]], unreadCount: Int) {
        // Update cache (COMPLETE OVERWRITE)
        dataStore.updateFromiPhone(
            notifications: notifications,
            buckets: buckets,
            unreadCount: unreadCount
        )
        
        // Reload from cache (this resets all in-memory data)
        loadCachedData()
        
        print("⌚ [WatchConnectivity] ✅ Updated from iPhone: \(notifications.count) notifications")
    }
    
    // MARK: - Public Actions (Called from SwiftUI)
    
    /**
     * Mark notification as read from Watch UI
     * Updates local cache and notifies iPhone (iPhone will sync to CloudKit)
     */
    func markNotificationAsReadFromWatch(id: String) {
        let now = ISO8601DateFormatter().string(from: Date())
        
        // 1. Update local cache immediately
        markNotificationAsRead(id: id, readAt: now)
        
        // 2. Notify iPhone to sync to backend and CloudKit
        // (Will be buffered automatically if iPhone not reachable)
        sendMessageToiPhone([
            "action": "notificationRead",
            "notificationId": id,
            "readAt": now
        ])
        
        print("⌚ [Watch] ✅ Marked as read locally, notified iPhone")
    }
    
    /**
     * Mark notification as unread from Watch UI
     * Updates local cache and notifies iPhone (iPhone will sync to CloudKit)
     */
    func markNotificationAsUnreadFromWatch(id: String) {
        // 1. Update local cache immediately
        markNotificationAsUnread(id: id)
        
        // 2. Notify iPhone to sync to backend and CloudKit
        // (Will be buffered automatically if iPhone not reachable)
        sendMessageToiPhone([
            "action": "notificationUnread",
            "notificationId": id
        ])
        
        print("⌚ [Watch] ✅ Marked as unread locally, notified iPhone")
    }
    
    /**
     * Delete notification from Watch UI
     * Updates local cache and notifies iPhone (iPhone will handle backend/CloudKit)
     */
    func deleteNotificationFromWatch(id: String) {
        // 1. Delete from local cache immediately
        deleteNotificationLocally(id: id)
        
        // 2. Notify iPhone to delete from backend and CloudKit
        // (Will be buffered automatically if iPhone not reachable)
        sendMessageToiPhone([
            "action": "notificationDeleted",
            "notificationId": id
        ])
        
        print("⌚ [Watch] ✅ Deleted locally, notified iPhone")
    }
    
    /**
     * Send message to iPhone (with fallback to background transfer)
     */
    private func sendMessageToiPhone(_ message: [String: Any]) {
        guard WCSession.default.activationState == .activated else {
            print("⌚ [Watch] ⚠️ WCSession not activated, cannot send message")
            return
        }
        
        if WCSession.default.isReachable {
            // iPhone is reachable, send immediately
            WCSession.default.sendMessage(message, replyHandler: { reply in
                print("⌚ [Watch] ✅ Message sent to iPhone: \(message["action"] ?? "")")
            }) { error in
                print("⌚ [Watch] ⚠️ Failed to send message, using background transfer: \(error.localizedDescription)")
                // Fallback to background transfer
                WCSession.default.transferUserInfo(message)
            }
        } else {
            // iPhone not reachable, use background transfer (guaranteed delivery)
            WCSession.default.transferUserInfo(message)
            print("⌚ [Watch] 📦 Queued message to iPhone (background): \(message["action"] ?? "")")
        }
    }
    
    /**
     * Send logs from Watch to iPhone for debugging
     * Uses background transfer to guarantee delivery even if iPhone is not reachable
     */
    public func sendLogsToiPhone() {
        // Get recent logs from LoggingSystem
        let logs = LoggingSystem.shared.readLogs()
        
        guard logs.count > 0 else {
            print("⌚ [Watch] ℹ️ No logs to send")
            return
        }
        
        // Convert to JSON array
        do {
            let jsonData = try JSONEncoder().encode(logs)
            if let jsonString = String(data: jsonData, encoding: .utf8) {
                let message: [String: Any] = [
                    "action": "watchLogs",
                    "logs": jsonString,
                    "count": logs.count,
                    "timestamp": Int64(Date().timeIntervalSince1970 * 1000),
                ]
                
                guard WCSession.default.activationState == .activated else {
                    print("⌚ [Watch] ⚠️ WCSession not activated, cannot send logs")
                    return
                }
                
                // Usa sempre transferUserInfo per garantire la consegna
                // anche quando l'iPhone non è raggiungibile
                WCSession.default.transferUserInfo(message)
                
                print("⌚ [Watch] 📤 Queued \(logs.count) logs for background transfer to iPhone")
                
                // Cancella i log dopo averli accodati per l'invio
                // (verranno consegnati in modo affidabile dal sistema)
                LoggingSystem.shared.clearAllLogs()
                print("⌚ [Watch] 🧹 Cleared \(logs.count) logs after queueing for transfer")
            }
        } catch {
            print("⌚ [Watch] ❌ Failed to encode logs: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Local Update Methods
    
    /**
     * Mark a notification as read locally (update cache immediately)
     */
    private func markNotificationAsRead(id: String, readAt: String) {
        // Update in-memory notifications by creating new instances
        if let index = notifications.firstIndex(where: { $0.id == id }) {
            let oldNotification = notifications[index].notification
            
            // Check if it was unread before
            let wasUnread = !oldNotification.isRead
            
            // Create new notification with updated isRead flag
            let updatedNotification = DatabaseAccess.WidgetNotification(
                id: oldNotification.id,
                title: oldNotification.title,
                body: oldNotification.body,
                subtitle: oldNotification.subtitle,
                createdAt: oldNotification.createdAt,
                isRead: true,  // Mark as read
                bucketId: oldNotification.bucketId,
                bucketName: oldNotification.bucketName,
                bucketColor: oldNotification.bucketColor,
                bucketIconUrl: oldNotification.bucketIconUrl,
                attachments: oldNotification.attachments
            )
            
            notifications[index] = NotificationData(notification: updatedNotification)
            
            // Update unread count if it was unread
            if wasUnread {
                unreadCount = max(0, unreadCount - 1)
                
                // Update bucket unread count by creating new bucket
                if let bucketIndex = buckets.firstIndex(where: { $0.id == oldNotification.bucketId }) {
                    let oldBucket = buckets[bucketIndex]
                    let newBucket = BucketItem(
                        id: oldBucket.id,
                        name: oldBucket.name,
                        unreadCount: max(0, oldBucket.unreadCount - 1),
                        totalCount: oldBucket.totalCount,
                        color: oldBucket.color,
                        iconUrl: oldBucket.iconUrl
                    )
                    buckets[bucketIndex] = newBucket
                }
            }
            
            // Save to cache
            saveToCache()
            
            print("⌚ [WatchConnectivity] ✅ Marked notification \(id) as read locally")
        }
    }
    
    /**
     * Mark a notification as unread locally (update cache immediately)
     */
    private func markNotificationAsUnread(id: String) {
        // Update in-memory notifications by creating new instances
        if let index = notifications.firstIndex(where: { $0.id == id }) {
            let oldNotification = notifications[index].notification
            
            // Check if it was read before
            let wasRead = oldNotification.isRead
            
            // Create new notification with updated isRead flag
            let updatedNotification = DatabaseAccess.WidgetNotification(
                id: oldNotification.id,
                title: oldNotification.title,
                body: oldNotification.body,
                subtitle: oldNotification.subtitle,
                createdAt: oldNotification.createdAt,
                isRead: false,  // Mark as unread
                bucketId: oldNotification.bucketId,
                bucketName: oldNotification.bucketName,
                bucketColor: oldNotification.bucketColor,
                bucketIconUrl: oldNotification.bucketIconUrl,
                attachments: oldNotification.attachments
            )
            
            notifications[index] = NotificationData(notification: updatedNotification)
            
            // Update unread count if it was read
            if wasRead {
                unreadCount += 1
                
                // Update bucket unread count by creating new bucket
                if let bucketIndex = buckets.firstIndex(where: { $0.id == oldNotification.bucketId }) {
                    let oldBucket = buckets[bucketIndex]
                    let newBucket = BucketItem(
                        id: oldBucket.id,
                        name: oldBucket.name,
                        unreadCount: oldBucket.unreadCount + 1,
                        totalCount: oldBucket.totalCount,
                        color: oldBucket.color,
                        iconUrl: oldBucket.iconUrl
                    )
                    buckets[bucketIndex] = newBucket
                }
            }
            
            // Save to cache
            saveToCache()
            
            print("⌚ [WatchConnectivity] ✅ Marked notification \(id) as unread locally")
        }
    }
    
    /**
     * Delete a notification locally (remove from cache immediately)
     */
    private func deleteNotificationLocally(id: String) {
        // Find and remove notification from in-memory array
        if let index = notifications.firstIndex(where: { $0.id == id }) {
            let deletedNotification = notifications[index].notification
            let wasUnread = !deletedNotification.isRead
            
            notifications.remove(at: index)
            
            // Update unread count if it was unread
            if wasUnread {
                unreadCount = max(0, unreadCount - 1)
                
                // Update bucket unread count and total count
                if let bucketIndex = buckets.firstIndex(where: { $0.id == deletedNotification.bucketId }) {
                    let oldBucket = buckets[bucketIndex]
                    let newBucket = BucketItem(
                        id: oldBucket.id,
                        name: oldBucket.name,
                        unreadCount: max(0, oldBucket.unreadCount - 1),
                        totalCount: max(0, oldBucket.totalCount - 1),
                        color: oldBucket.color,
                        iconUrl: oldBucket.iconUrl
                    )
                    buckets[bucketIndex] = newBucket
                }
            }
            
            // Save to cache
            saveToCache()
            
            print("⌚ [WatchConnectivity] ✅ Deleted notification \(id) locally")
        }
    }
    
    /**
     * Save current state to cache
     */
    private func saveToCache() {
        // Convert to cache format
        let cachedNotifications = notifications.map { notifData -> WatchDataStore.CachedNotification in
            let cachedAttachments = notifData.notification.attachments.map { attachment in
                WatchDataStore.CachedAttachment(
                    mediaType: attachment.mediaType,
                    url: attachment.url,
                    name: attachment.name
                )
            }
            
            return WatchDataStore.CachedNotification(
                id: notifData.notification.id,
                title: notifData.notification.title,
                body: notifData.notification.body,
                subtitle: notifData.notification.subtitle,
                createdAt: notifData.notification.createdAt,
                isRead: notifData.notification.isRead,
                bucketId: notifData.notification.bucketId,
                bucketName: notifData.notification.bucketName,
                bucketColor: notifData.notification.bucketColor,
                bucketIconUrl: notifData.notification.bucketIconUrl,
                attachments: cachedAttachments
            )
        }
        
        let cachedBuckets = buckets.map { bucket in
            WatchDataStore.CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: bucket.unreadCount,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }
        
        let cache = WatchDataStore.WatchCache(
            notifications: cachedNotifications,
            buckets: cachedBuckets,
            unreadCount: unreadCount,
            lastUpdate: Date()
        )
        
        dataStore.saveCache(cache)
    }
    
    // MARK: - Read-only mode (operations removed)
    // Watch is now readonly - no delete or mark as read operations
    // All operations must be done from iPhone app
    // Watch only receives specific update messages from iPhone
    
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
        // Handle messages from iPhone - specific update messages
        guard let action = message["action"] as? String else {
            replyHandler(["error": "Missing action"])
            return
        }
        
        DispatchQueue.main.async {
            switch action {
            case "notificationRead":
                // Mark specific notification as read
                if let notificationId = message["notificationId"] as? String,
                   let readAt = message["readAt"] as? String {
                    print("⌚ [WatchConnectivity] 📖 Marking notification \(notificationId) as read")
                    self.markNotificationAsRead(id: notificationId, readAt: readAt)
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId or readAt"])
                }
                
            case "notificationUnread":
                // Mark specific notification as unread
                if let notificationId = message["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] � Marking notification \(notificationId) as unread")
                    self.markNotificationAsUnread(id: notificationId)
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId"])
                }
                
            case "notificationsRead":
                // Mark multiple notifications as read
                if let notificationIds = message["notificationIds"] as? [String],
                   let readAt = message["readAt"] as? String {
                    print("⌚ [WatchConnectivity] 📖 Marking \(notificationIds.count) notifications as read")
                    for id in notificationIds {
                        self.markNotificationAsRead(id: id, readAt: readAt)
                    }
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationIds or readAt"])
                }
                
            case "notificationDeleted":
                // Delete specific notification from local cache
                if let notificationId = message["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] 🗑️ Deleting notification \(notificationId)")
                    self.deleteNotificationLocally(id: notificationId)
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId"])
                }
                
            case "notificationAdded":
                // New notification added - trigger reload from CloudKit
                if let notificationId = message["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] ➕ New notification \(notificationId) - fetching from CloudKit")
                    self.fetchFromCloudKit()
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId"])
                }
                
            case "reload":
                // Full reload - fetch fresh data from CloudKit
                print("⌚ [WatchConnectivity] 🔄 Received reload trigger from iPhone")
                self.fetchFromCloudKit()
                replyHandler(["success": true])
                
            case "fullUpdate":
                // Full data update from iPhone - completely overwrite cache
                if let notificationsData = message["notifications"] as? [[String: Any]],
                   let bucketsData = message["buckets"] as? [[String: Any]],
                   let unreadCount = message["unreadCount"] as? Int {
                    print("⌚ [WatchConnectivity] 📲 Received full data update from iPhone")
                    self.updateFromiPhoneMessage(
                        notifications: notificationsData,
                        buckets: bucketsData,
                        unreadCount: unreadCount
                    )
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing data in fullUpdate"])
                }
                
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
            case "notificationRead":
                if let notificationId = userInfo["notificationId"] as? String,
                   let readAt = userInfo["readAt"] as? String {
                    print("⌚ [WatchConnectivity] 📖 Marking notification \(notificationId) as read (background)")
                    self.markNotificationAsRead(id: notificationId, readAt: readAt)
                }
                
            case "notificationUnread":
                if let notificationId = userInfo["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] 📭 Marking notification \(notificationId) as unread (background)")
                    self.markNotificationAsUnread(id: notificationId)
                }
                
            case "notificationsRead":
                if let notificationIds = userInfo["notificationIds"] as? [String],
                   let readAt = userInfo["readAt"] as? String {
                    print("⌚ [WatchConnectivity] 📖 Marking \(notificationIds.count) notifications as read (background)")
                    for id in notificationIds {
                        self.markNotificationAsRead(id: id, readAt: readAt)
                    }
                }
                
            case "notificationDeleted":
                if let notificationId = userInfo["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] 🗑️ Deleting notification \(notificationId) (background)")
                    self.deleteNotificationLocally(id: notificationId)
                }
                
            case "notificationAdded":
                if let notificationId = userInfo["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] ➕ New notification \(notificationId) - fetching from CloudKit (background)")
                    self.fetchFromCloudKit()
                }
                
            case "reload":
                print("⌚ [WatchConnectivity] 🔄 Received reload trigger from iPhone (background)")
                self.fetchFromCloudKit()
            
            case "fullUpdate":
                // Full data update from iPhone - completely overwrite cache
                if let notificationsData = userInfo["notifications"] as? [[String: Any]],
                   let bucketsData = userInfo["buckets"] as? [[String: Any]],
                   let unreadCount = userInfo["unreadCount"] as? Int {
                    print("⌚ [WatchConnectivity] 📲 Received full data update from iPhone (background)")
                    self.updateFromiPhoneMessage(
                        notifications: notificationsData,
                        buckets: bucketsData,
                        unreadCount: unreadCount
                    )
                }
                
            default:
                print("⌚ [WatchConnectivity] ⚠️ Unknown action: \(action)")
            }
        }
    }
}

