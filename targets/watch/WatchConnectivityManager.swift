import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    @Published var lastUpdate: Date?
    @Published var isWaitingForResponse: Bool = false
    
    private let dataStore = WatchDataStore.shared
    
    // Timer per invio automatico log
    private var logSyncTimer: Timer?
    private let logSyncInterval: TimeInterval = 10.0 // Ogni 10 secondi
    
    private override init() {
        super.init()
        
        // Load cached data immediately on init (fast startup)
        loadCachedData()
        
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
                // print("⌚ [WatchConnectivity] 📅 Bucket '\(cachedBucket.name)' - Most recent: \(mostRecent.id) at \(mostRecent.date)")
            }
            
            // Calculate total count for this bucket
            let totalCount = bucketNotifications.count
            
            let bucket = BucketItem(
                id: cachedBucket.id,
                name: cachedBucket.name,
                unreadCount: cachedBucket.unreadCount,
                totalCount: totalCount,
                color: cachedBucket.color,
                iconUrl: cachedBucket.iconUrl,
                lastNotificationDate: lastNotificationDate
            )
            
            bucketsWithDates.append((bucket: bucket, lastNotificationDate: lastNotificationDate))
        }
        
        // Sort buckets by last notification date (most recent first)
        self.buckets = bucketsWithDates
            .sorted { $0.lastNotificationDate > $1.lastNotificationDate }
            .map { $0.bucket }
        
        // // Log bucket order for debugging
        // print("⌚ [WatchConnectivity] 📊 Bucket order:")
        // for (index, item) in self.buckets.enumerated() {
        //     let lastNotifDate = bucketsWithDates.first(where: { $0.bucket.id == item.id })?.lastNotificationDate ?? Date.distantPast
        //     print("  \(index + 1). \(item.name) - \(item.totalCount) notifications - Last: \(lastNotifDate)")
        // }
        
        // COMPLETE OVERWRITE of unread count and lastUpdate
        self.unreadCount = cache.unreadCount
        self.lastUpdate = cache.lastUpdate
        
        print("⌚ [WatchConnectivity] ✅ Loaded \(notifications.count) notifications from cache")
    }
    
    /**
     * Request FULL data refresh from iPhone
     * Used ONLY by manual refresh button in Watch UI
     */
    func requestFullRefresh() {
        print("⌚ [Watch] 🔄 FULL refresh requested (manual button) - using WatchConnectivity only")
        
        // Set loading state
        DispatchQueue.main.async {
            self.isWaitingForResponse = true
        }
        
        // Invia richiesta all'iPhone per full sync via WatchConnectivity
        if WCSession.default.isReachable {
            print("⌚ [Watch] 📱 iPhone reachable - requesting full data transfer")
            sendMessageToiPhone([
                "action": "requestFullSync",
                "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
            ])
        } else {
            print("⌚ [Watch] 📱 iPhone not reachable - queueing full sync request")
            WCSession.default.transferUserInfo([
                "action": "requestFullSync",
                "timestamp": Int64(Date().timeIntervalSince1970 * 1000)
            ])
        }
        
        // Safety timeout - stop loading after 30 seconds (file transfer can take time)
        DispatchQueue.main.asyncAfter(deadline: .now() + 30) {
            if self.isWaitingForResponse {
                print("⌚ [Watch] ⏱️ Full refresh timeout (30s) - stopping loader")
                self.isWaitingForResponse = false
            }
        }
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
        
        // Stop loading state
        DispatchQueue.main.async {
            self.isWaitingForResponse = false
        }
        
        print("⌚ [WatchConnectivity] ✅ Updated from iPhone: \(notifications.count) notifications")
    }
    
    // MARK: - Public Actions (Called from SwiftUI)
    
    /**
     * Mark notification as read from Watch UI
     * Updates local cache and notifies iPhone
     */
    func markNotificationAsReadFromWatch(id: String) {
        let now = ISO8601DateFormatter().string(from: Date())
        
        // 1. Update local cache immediately
        markNotificationAsRead(id: id, readAt: now)
        
        // 2. Notify iPhone to sync to backend
        sendMessageToiPhone([
            "action": "notificationRead",
            "notificationId": id,
            "readAt": now
        ])
        
        print("⌚ [Watch] ✅ Marked as read locally and notified iPhone")
    }
    
    /**
     * Mark notification as unread from Watch UI
     * Updates local cache and notifies iPhone
     */
    func markNotificationAsUnreadFromWatch(id: String) {
        // 1. Update local cache immediately
        markNotificationAsUnread(id: id)
        
        // 2. Notify iPhone to sync to backend
        sendMessageToiPhone([
            "action": "notificationUnread",
            "notificationId": id
        ])
        
        print("⌚ [Watch] ✅ Marked as unread locally and notified iPhone")
    }
    
    /**
     * Delete notification from Watch UI
     * Updates local cache and notifies iPhone
     */
    func deleteNotificationFromWatch(id: String) {
        // 1. Delete from local cache immediately
        deleteNotificationLocally(id: id)
        
        // 2. Notify iPhone to delete from backend
        sendMessageToiPhone([
            "action": "notificationDeleted",
            "notificationId": id
        ])
        
        print("⌚ [Watch] ✅ Deleted locally and notified iPhone")
    }
    
    /**
     * Send message to iPhone (with fallback to background transfer)
     */
    private func sendMessageToiPhone(_ message: [String: Any]) {
        print("⌚ ========== SENDING MESSAGE TO IPHONE ==========")
        print("⌚ Message: \(message)")
        print("⌚ Session state - activationState: \(WCSession.default.activationState.rawValue), isReachable: \(WCSession.default.isReachable)")
        
        guard WCSession.default.activationState == .activated else {
            print("⌚ ❌ WCSession not activated, cannot send message")
            return
        }
        
        // Check if this is a full sync request
        let isFullSyncRequest = message["action"] as? String == "requestFullSync"
        
        if WCSession.default.isReachable {
            print("⌚ ✅ iPhone is reachable, sending message immediately...")
            // iPhone is reachable, send immediately
            WCSession.default.sendMessage(message, replyHandler: { reply in
                print("⌚ ✅ Message sent successfully to iPhone: \(message["action"] ?? "")")
                print("⌚ 📦 Reply from iPhone: \(reply)")
                
                // For full sync, iPhone will send data via sendMessageData
                // Just confirm the request was received, don't stop loading yet
                if isFullSyncRequest {
                    if let method = reply["method"] as? String {
                        print("⌚ [WatchConnectivity] 📲 Full sync acknowledged, waiting for \(method)...")
                    } else {
                        print("⌚ [WatchConnectivity] 📲 Full sync acknowledged, waiting for messageData...")
                    }
                    // Keep loading state active - will be stopped when file arrives
                }
            }) { error in
                print("⌚ ❌ Failed to send message: \(error.localizedDescription)")
                print("⌚ Falling back to background transfer...")
                // Fallback to background transfer
                WCSession.default.transferUserInfo(message)
                
                // Stop loading for full sync on error
                if isFullSyncRequest {
                    DispatchQueue.main.async {
                        self.isWaitingForResponse = false
                    }
                }
            }
        } else {
            print("⌚ ⚠️ iPhone not reachable, using background transfer...")
            // iPhone not reachable, use background transfer (guaranteed delivery)
            WCSession.default.transferUserInfo(message)
            print("⌚ 📦 Queued message to iPhone (background): \(message["action"] ?? "")")
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
                    
                    // Recalculate last notification date
                    let bucketNotifications = notifications.filter { $0.notification.bucketId == oldBucket.id }
                    let lastNotificationDate = bucketNotifications.compactMap { notifData -> Date? in
                        let isoFormatter = ISO8601DateFormatter()
                        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        if let date = isoFormatter.date(from: notifData.notification.createdAt) {
                            return date
                        }
                        isoFormatter.formatOptions = [.withInternetDateTime]
                        return isoFormatter.date(from: notifData.notification.createdAt)
                    }.max()
                    
                    let newBucket = BucketItem(
                        id: oldBucket.id,
                        name: oldBucket.name,
                        unreadCount: max(0, oldBucket.unreadCount - 1),
                        totalCount: oldBucket.totalCount,
                        color: oldBucket.color,
                        iconUrl: oldBucket.iconUrl,
                        lastNotificationDate: lastNotificationDate
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
                    
                    // Recalculate last notification date
                    let bucketNotifications = notifications.filter { $0.notification.bucketId == oldBucket.id }
                    let lastNotificationDate = bucketNotifications.compactMap { notifData -> Date? in
                        let isoFormatter = ISO8601DateFormatter()
                        isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                        if let date = isoFormatter.date(from: notifData.notification.createdAt) {
                            return date
                        }
                        isoFormatter.formatOptions = [.withInternetDateTime]
                        return isoFormatter.date(from: notifData.notification.createdAt)
                    }.max()
                    
                    let newBucket = BucketItem(
                        id: oldBucket.id,
                        name: oldBucket.name,
                        unreadCount: oldBucket.unreadCount + 1,
                        totalCount: oldBucket.totalCount,
                        color: oldBucket.color,
                        iconUrl: oldBucket.iconUrl,
                        lastNotificationDate: lastNotificationDate
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
            
            // Update global unread count if it was unread
            if wasUnread {
                unreadCount = max(0, unreadCount - 1)
            }
            
            // ALWAYS update bucket counts (both total and unread if applicable)
            if let bucketIndex = buckets.firstIndex(where: { $0.id == deletedNotification.bucketId }) {
                let oldBucket = buckets[bucketIndex]
                
                // Recalculate last notification date after deletion
                let remainingBucketNotifications = notifications.filter { $0.notification.bucketId == oldBucket.id }
                let lastNotificationDate = remainingBucketNotifications.compactMap { notifData -> Date? in
                    let isoFormatter = ISO8601DateFormatter()
                    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                    if let date = isoFormatter.date(from: notifData.notification.createdAt) {
                        return date
                    }
                    isoFormatter.formatOptions = [.withInternetDateTime]
                    return isoFormatter.date(from: notifData.notification.createdAt)
                }.max()
                
                let newBucket = BucketItem(
                    id: oldBucket.id,
                    name: oldBucket.name,
                    unreadCount: wasUnread ? max(0, oldBucket.unreadCount - 1) : oldBucket.unreadCount,
                    totalCount: max(0, oldBucket.totalCount - 1),
                    color: oldBucket.color,
                    iconUrl: oldBucket.iconUrl,
                    lastNotificationDate: lastNotificationDate
                )
                buckets[bucketIndex] = newBucket
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
    
    /**
     * Save notification from GraphQL fragment to local database
     * Called when receiving notificationAdded event with complete fragment
     */
    private func saveNotificationFromFragment(fragment: [String: Any]) {
        guard let notificationId = fragment["id"] as? String,
              let messageObj = fragment["message"] as? [String: Any],
              let title = messageObj["title"] as? String,
              let body = messageObj["body"] as? String,
              let bucketObj = messageObj["bucket"] as? [String: Any],
              let bucketId = bucketObj["id"] as? String else {
            print("⌚ [WatchConnectivity] ❌ Invalid notification fragment structure")
            return
        }
        
        let createdAt = fragment["createdAt"] as? String ?? ISO8601DateFormatter().string(from: Date())
        let subtitle = messageObj["subtitle"] as? String
        let bucketName = bucketObj["name"] as? String
        let bucketColor = bucketObj["color"] as? String
        let bucketIconUrl = bucketObj["iconUrl"] as? String
        let readAt = fragment["readAt"] as? String
        let isRead = readAt != nil
        
        // Parse attachments
        var attachments: [DatabaseAccess.WidgetAttachment] = []
        if let attachmentsArray = messageObj["attachments"] as? [[String: Any]] {
            for attachmentDict in attachmentsArray {
                if let mediaType = attachmentDict["mediaType"] as? String,
                   let url = attachmentDict["url"] as? String {
                    let attachment = DatabaseAccess.WidgetAttachment(
                        mediaType: mediaType,
                        url: url,
                        name: attachmentDict["name"] as? String
                    )
                    attachments.append(attachment)
                }
            }
        }
        
        // Create notification object
        let notification = DatabaseAccess.WidgetNotification(
            id: notificationId,
            title: title,
            body: body,
            subtitle: subtitle,
            createdAt: createdAt,
            isRead: isRead,
            bucketId: bucketId,
            bucketName: bucketName,
            bucketColor: bucketColor,
            bucketIconUrl: bucketIconUrl,
            attachments: attachments
        )
        
        let notificationData = NotificationData(notification: notification)
        
        // Add to in-memory notifications array (at the beginning for newest first)
        notifications.insert(notificationData, at: 0)
        
        // Update or create bucket
        if let bucketIndex = buckets.firstIndex(where: { $0.id == bucketId }) {
            // Update existing bucket
            let oldBucket = buckets[bucketIndex]
            
            // Parse notification date
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            var notificationDate = isoFormatter.date(from: createdAt)
            if notificationDate == nil {
                isoFormatter.formatOptions = [.withInternetDateTime]
                notificationDate = isoFormatter.date(from: createdAt)
            }
            
            let newBucket = BucketItem(
                id: oldBucket.id,
                name: oldBucket.name,
                unreadCount: oldBucket.unreadCount + (isRead ? 0 : 1),
                totalCount: oldBucket.totalCount + 1,
                color: oldBucket.color,
                iconUrl: oldBucket.iconUrl,
                lastNotificationDate: notificationDate ?? oldBucket.lastNotificationDate
            )
            buckets[bucketIndex] = newBucket
            
            print("⌚ [WatchConnectivity] ♻️ Updated bucket: \(oldBucket.name) (total: \(newBucket.totalCount), unread: \(newBucket.unreadCount))")
        } else if let bucketName = bucketName {
            // Create new bucket
            let isoFormatter = ISO8601DateFormatter()
            isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            var notificationDate = isoFormatter.date(from: createdAt)
            if notificationDate == nil {
                isoFormatter.formatOptions = [.withInternetDateTime]
                notificationDate = isoFormatter.date(from: createdAt)
            }
            
            let newBucket = BucketItem(
                id: bucketId,
                name: bucketName,
                unreadCount: isRead ? 0 : 1,
                totalCount: 1,
                color: bucketColor ?? "",
                iconUrl: bucketIconUrl ?? "",
                lastNotificationDate: notificationDate
            )
            buckets.append(newBucket)
            
            print("⌚ [WatchConnectivity] ➕ Created new bucket: \(bucketName)")
        }
        
        // Update unread count
        if !isRead {
            unreadCount += 1
        }
        
        // Save to cache
        saveToCache()
        
        print("⌚ [WatchConnectivity] ✅ Saved notification \(notificationId) from fragment (total: \(notifications.count), unread: \(unreadCount))")
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
                
            case "notificationsRead", "notificationsUnread":
                // Mark multiple notifications as read or unread
                if let notificationIds = message["notificationIds"] as? [String] {
                    let readAt = message["readAt"] as? String // nil = unread
                    let status = readAt != nil ? "read" : "unread"
                    print("⌚ [WatchConnectivity] 📖 Marking \(notificationIds.count) notifications as \(status)")
                    for id in notificationIds {
                        if let readAt = readAt {
                            self.markNotificationAsRead(id: id, readAt: readAt)
                        } else {
                            self.markNotificationAsUnread(id: id)
                        }
                    }
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationIds"])
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
                // New notification added with complete fragment - save to local database
                if let notificationId = message["notificationId"] as? String,
                   let fragment = message["fragment"] as? [String: Any] {
                    print("⌚ [WatchConnectivity] ➕ New notification \(notificationId) with fragment - saving to local DB")
                    self.saveNotificationFromFragment(fragment: fragment)
                    replyHandler(["success": true])
                } else {
                    print("⌚ [WatchConnectivity] ⚠️ notificationAdded missing fragment - fallback to reload")
                    replyHandler(["error": "Missing fragment"])
                }
                
            case "reload":
                // Full reload - wait for iPhone data
                print("⌚ [WatchConnectivity] 🔄 Received reload trigger from iPhone - waiting for data")
                // iPhone invierà i dati via transferFile
                replyHandler(["success": true])
                
            case "syncIncremental":
                // Incremental sync - use cache
                print("⌚ [WatchConnectivity] 🔄 Received incremental sync trigger - using cache")
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
        print("⌚ ========== BACKGROUND TRANSFER RECEIVED ==========")
        print("⌚ [WatchConnectivity] 📦 UserInfo keys: \(userInfo.keys.joined(separator: ", "))")
        print("⌚ [WatchConnectivity] 📦 UserInfo count: \(userInfo.count)")
        
        guard let action = userInfo["action"] as? String else {
            print("⌚ [WatchConnectivity] ⚠️ No action in userInfo")
            return
        }
        
        print("⌚ [WatchConnectivity] 🎬 Action: \(action)")
        
        // Show loader for background processing (buffered messages)
        DispatchQueue.main.async {
            self.isWaitingForResponse = true
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
                
            case "notificationsRead", "notificationsUnread":
                // Mark multiple notifications as read or unread
                if let notificationIds = userInfo["notificationIds"] as? [String] {
                    let readAt = userInfo["readAt"] as? String // nil = unread
                    let status = readAt != nil ? "read" : "unread"
                    print("⌚ [WatchConnectivity] 📖 Marking \(notificationIds.count) notifications as \(status) (background)")
                    for id in notificationIds {
                        if let readAt = readAt {
                            self.markNotificationAsRead(id: id, readAt: readAt)
                        } else {
                            self.markNotificationAsUnread(id: id)
                        }
                    }
                }
                
            case "notificationDeleted":
                if let notificationId = userInfo["notificationId"] as? String {
                    print("⌚ [WatchConnectivity] 🗑️ Deleting notification \(notificationId) (background)")
                    self.deleteNotificationLocally(id: notificationId)
                }
                
            case "notificationAdded":
                // New notification added with complete fragment - save to local database
                if let notificationId = userInfo["notificationId"] as? String,
                   let fragment = userInfo["fragment"] as? [String: Any] {
                    print("⌚ [WatchConnectivity] ➕ New notification \(notificationId) with fragment - saving to local DB (background)")
                    self.saveNotificationFromFragment(fragment: fragment)
                } else {
                    print("⌚ [WatchConnectivity] ⚠️ notificationAdded missing fragment (background)")
                }
                
            case "reload":
                print("⌚ [WatchConnectivity] 🔄 Received reload trigger from iPhone (background) - waiting for data")
                // iPhone invierà i dati via transferFile
            
            case "syncIncremental":
                // Incremental sync - use cache
                print("⌚ [WatchConnectivity] 🔄 Received incremental sync trigger (background)")
                // Usa cache esistente
            
            case "fullSyncData":
                // Full sync data received via transferUserInfo (large payload, background-compatible)
                print("⌚ [WatchConnectivity] 📲 ========== FULL SYNC DATA RECEIVED (BACKGROUND) ==========")
                
                if let bucketsData = userInfo["buckets"] as? [[String: Any]],
                   let notificationsData = userInfo["notifications"] as? [[String: Any]],
                   let syncUnreadCount = userInfo["unreadCount"] as? Int {
                    
                    print("⌚ [WatchConnectivity] 📦 Received payload:")
                    print("  - Buckets: \(bucketsData.count)")
                    print("  - Notifications: \(notificationsData.count)")
                    print("  - Unread: \(syncUnreadCount)")
                    
                    // Process on background queue to avoid blocking main thread
                    DispatchQueue.global(qos: .userInitiated).async {
                        // Parse buckets
                        var buckets: [BucketItem] = []
                        for bucketDict in bucketsData {
                            guard let id = bucketDict["id"] as? String,
                                  let name = bucketDict["name"] as? String else {
                                continue
                            }
                            
                            let bucket = BucketItem(
                                id: id,
                                name: name,
                                unreadCount: bucketDict["unreadCount"] as? Int ?? 0,
                                totalCount: bucketDict["totalCount"] as? Int ?? 0,
                                color: bucketDict["color"] as? String,
                                iconUrl: bucketDict["iconUrl"] as? String,
                                lastNotificationDate: nil
                            )
                            buckets.append(bucket)
                        }
                        
                        // Parse notifications
                        var notifications: [NotificationData] = []
                        for notifDict in notificationsData {
                            guard let id = notifDict["id"] as? String,
                                  let title = notifDict["title"] as? String else {
                                continue
                            }
                            
                            // Parse attachments
                            var attachments: [DatabaseAccess.WidgetAttachment] = []
                            if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                                for attachmentDict in attachmentsArray {
                                    if let mediaType = attachmentDict["mediaType"] as? String,
                                       let url = attachmentDict["url"] as? String {
                                        let attachment = DatabaseAccess.WidgetAttachment(
                                            mediaType: mediaType,
                                            url: url,
                                            name: attachmentDict["name"] as? String
                                        )
                                        attachments.append(attachment)
                                    }
                                }
                            }
                            
                            let widgetNotification = DatabaseAccess.WidgetNotification(
                                id: id,
                                title: title,
                                body: notifDict["body"] as? String ?? "",
                                subtitle: notifDict["subtitle"] as? String,
                                createdAt: notifDict["createdAt"] as? String ?? "",
                                isRead: notifDict["readAt"] != nil,
                                bucketId: notifDict["bucketId"] as? String ?? "",
                                bucketName: nil,
                                bucketColor: nil,
                                bucketIconUrl: nil,
                                attachments: attachments
                            )
                            
                            let notification = NotificationData(notification: widgetNotification)
                            notifications.append(notification)
                        }
                        
                        print("⌚ [WatchConnectivity] ✅ Parsed \(buckets.count) buckets and \(notifications.count) notifications")
                        
                        // Update on main thread
                        DispatchQueue.main.async {
                            self.dataStore.updateFromiPhone(
                                notifications: notificationsData,
                                buckets: bucketsData,
                                unreadCount: syncUnreadCount
                            )
                            
                            // Update published properties
                            self.buckets = buckets
                            self.notifications = notifications
                            self.unreadCount = syncUnreadCount
                            self.lastUpdate = Date()
                            
                            // Stop loading state
                            self.isWaitingForResponse = false
                            
                            print("⌚ [WatchConnectivity] ✅ Full sync completed successfully via transferUserInfo")
                            print("  - Updated \(buckets.count) buckets")
                            print("  - Updated \(notifications.count) notifications")
                            print("  - Unread count: \(syncUnreadCount)")
                        }
                    }
                } else {
                    print("⌚ [WatchConnectivity] ❌ Invalid fullSyncData payload - missing required fields")
                    DispatchQueue.main.async {
                        self.isWaitingForResponse = false
                    }
                }
            
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
                } else {
                    // Stop loading if fullUpdate failed
                    self.isWaitingForResponse = false
                }
                
            default:
                print("⌚ [WatchConnectivity] ⚠️ Unknown action: \(action)")
                // Stop loading for unknown actions
                self.isWaitingForResponse = false
            }
            
            // Hide loader after processing (except for fullUpdate which handles it in updateFromiPhoneMessage)
            if action != "fullUpdate" {
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                    self.isWaitingForResponse = false
                }
            }
        }
    }
    
    // MARK: - Application Context Reception (for state synchronization)
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String : Any]) {
        print("⌚ ========== APPLICATION CONTEXT RECEIVED ==========")
        print("⌚ [WatchConnectivity] 📦 Context keys: \(applicationContext.keys.joined(separator: ", "))")
        print("⌚ [WatchConnectivity] 📦 Context count: \(applicationContext.count)")
        
        guard let action = applicationContext["action"] as? String else {
            print("⌚ [WatchConnectivity] ⚠️ No action in applicationContext")
            return
        }
        
        print("⌚ [WatchConnectivity] 🎬 Action: \(action)")
        
        guard action == "fullSyncData" else {
            print("⌚ [WatchConnectivity] ⚠️ Unexpected action: \(action)")
            return
        }
        
        // Start loading state
        DispatchQueue.main.async {
            self.isWaitingForResponse = true
        }
        
        print("⌚ [WatchConnectivity] 📲 ========== FULL SYNC DATA RECEIVED (APP CONTEXT) ==========")
        
        guard let bucketsData = applicationContext["buckets"] as? [[String: Any]],
              let notificationsData = applicationContext["notifications"] as? [[String: Any]],
              let syncUnreadCount = applicationContext["unreadCount"] as? Int else {
            print("⌚ [WatchConnectivity] ❌ Invalid fullSyncData payload - missing required fields")
            DispatchQueue.main.async {
                self.isWaitingForResponse = false
            }
            return
        }
        
        print("⌚ [WatchConnectivity] 📦 Received payload:")
        print("  - Buckets: \(bucketsData.count)")
        print("  - Notifications: \(notificationsData.count)")
        print("  - Unread: \(syncUnreadCount)")
        
        // Process on background queue to avoid blocking main thread
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            // Parse buckets
            var buckets: [BucketItem] = []
            print("⌚ [WatchConnectivity] 🔄 Parsing \(bucketsData.count) buckets...")
            for bucketDict in bucketsData {
                guard let id = bucketDict["id"] as? String,
                      let name = bucketDict["name"] as? String else {
                    print("⌚ [WatchConnectivity] ⚠️ Skipping bucket - missing id or name")
                    continue
                }
                
                let bucket = BucketItem(
                    id: id,
                    name: name,
                    unreadCount: bucketDict["unreadCount"] as? Int ?? 0,
                    totalCount: bucketDict["totalCount"] as? Int ?? 0,
                    color: bucketDict["color"] as? String,
                    iconUrl: bucketDict["iconUrl"] as? String,
                    lastNotificationDate: nil
                )
                buckets.append(bucket)
                print("⌚ [WatchConnectivity] ✅ Parsed bucket: \(name) (unread: \(bucket.unreadCount), total: \(bucket.totalCount))")
            }
            print("⌚ [WatchConnectivity] 📊 Total buckets parsed: \(buckets.count)")
            
            // Parse notifications
            var notifications: [NotificationData] = []
            for notifDict in notificationsData {
                guard let id = notifDict["id"] as? String,
                      let title = notifDict["title"] as? String else {
                    continue
                }
                
                // Parse attachments
                var attachments: [DatabaseAccess.WidgetAttachment] = []
                if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                    for attachmentDict in attachmentsArray {
                        if let mediaType = attachmentDict["mediaType"] as? String,
                           let url = attachmentDict["url"] as? String {
                            let attachment = DatabaseAccess.WidgetAttachment(
                                mediaType: mediaType,
                                url: url,
                                name: attachmentDict["name"] as? String
                            )
                            attachments.append(attachment)
                        }
                    }
                }
                
                // Parse isRead field - prefer 'isRead' if present, otherwise check for 'readAt'
                let isRead: Bool
                if let isReadValue = notifDict["isRead"] as? Bool {
                    isRead = isReadValue
                } else {
                    isRead = notifDict["readAt"] != nil
                }
                
                let widgetNotification = DatabaseAccess.WidgetNotification(
                    id: id,
                    title: title,
                    body: notifDict["body"] as? String ?? "",
                    subtitle: notifDict["subtitle"] as? String,
                    createdAt: notifDict["createdAt"] as? String ?? "",
                    isRead: isRead,
                    bucketId: notifDict["bucketId"] as? String ?? "",
                    bucketName: nil,
                    bucketColor: nil,
                    bucketIconUrl: nil,
                    attachments: attachments
                )
                
                let notification = NotificationData(notification: widgetNotification)
                notifications.append(notification)
            }
            
            print("⌚ [WatchConnectivity] ✅ Parsed \(buckets.count) buckets and \(notifications.count) notifications")
            
            // Sort notifications: unread first, then by createdAt (newest first)
            notifications.sort { notif1, notif2 in
                // If read status differs, unread comes first
                if notif1.notification.isRead != notif2.notification.isRead {
                    return !notif1.notification.isRead // true (unread) comes before false (read)
                }
                
                // If read status is the same, sort by createdAt (newest first)
                // Parse ISO8601 dates and compare
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                
                let date1 = formatter.date(from: notif1.notification.createdAt) ?? Date.distantPast
                let date2 = formatter.date(from: notif2.notification.createdAt) ?? Date.distantPast
                
                return date1 > date2 // Newer dates first
            }
            
            print("⌚ [WatchConnectivity] 🔄 Sorted \(notifications.count) notifications (unread first, then by date)")
            
            // Recalculate totalCount and unreadCount for each bucket based on actual notifications
            for i in 0..<buckets.count {
                let bucketId = buckets[i].id
                let notificationsInBucket = notifications.filter { $0.notification.bucketId == bucketId }
                let totalCount = notificationsInBucket.count
                let unreadCount = notificationsInBucket.filter { !$0.notification.isRead }.count
                
                // Update bucket with correct totalCount and unreadCount
                buckets[i] = BucketItem(
                    id: buckets[i].id,
                    name: buckets[i].name,
                    unreadCount: unreadCount,
                    totalCount: totalCount,
                    color: buckets[i].color,
                    iconUrl: buckets[i].iconUrl,
                    lastNotificationDate: buckets[i].lastNotificationDate
                )
                
                print("⌚ [WatchConnectivity] 🔢 Bucket '\(buckets[i].name)' - Recalculated totalCount: \(totalCount), unreadCount: \(unreadCount)")
            }
            
            // Print sample of notifications to verify read status
            print("\n📬 Sample notifications (first 5):")
            for (index, notification) in notifications.prefix(5).enumerated() {
                print("  [\(index + 1)] ID: \(notification.id)")
                print("      Title: \(notification.notification.title)")
                print("      Read: \(notification.notification.isRead ? "✅ YES" : "❌ NO")")
                print("      ReadAt: \(notification.notification.isRead ? "YES" : "NO")")
                print("      Bucket: \(notification.notification.bucketId)")
            }
            print("📊 Total notifications: \(notifications.count)")
            print("📊 Unread count from payload: \(syncUnreadCount)")
            let actualUnreadCount = notifications.filter { !$0.notification.isRead }.count
            print("📊 Actual unread count (calculated): \(actualUnreadCount)")
            print("📊 Read count (calculated): \(notifications.count - actualUnreadCount)\n")
            
            // Update on main thread
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                
                print("⌚ [WatchConnectivity] 🔄 Updating UI on main thread...")
                print("  - Current buckets count: \(self.buckets.count)")
                print("  - New buckets count: \(buckets.count)")
                
                self.dataStore.updateFromiPhone(
                    notifications: notificationsData,
                    buckets: bucketsData,
                    unreadCount: actualUnreadCount  // ← Use calculated value instead of payload
                )
                
                // Update published properties
                self.buckets = buckets
                self.notifications = notifications
                self.unreadCount = actualUnreadCount  // ← Use calculated value instead of payload
                self.lastUpdate = Date()
                
                print("⌚ [WatchConnectivity] 🎯 Published properties updated:")
                print("  - self.buckets.count = \(self.buckets.count)")
                print("  - self.notifications.count = \(self.notifications.count)")
                print("  - self.unreadCount = \(self.unreadCount)")
                
                // Stop loading state
                self.isWaitingForResponse = false
                
                print("⌚ [WatchConnectivity] ✅ Full sync completed successfully via ApplicationContext")
                print("  - Updated \(buckets.count) buckets")
                print("  - Updated \(notifications.count) notifications")
                print("  - Unread count: \(actualUnreadCount) (recalculated from notifications)")
            }
        }
    }
    
    // MARK: - Message Data Reception (for large payloads)
    
    func session(_ session: WCSession, didReceiveMessageData messageData: Data, replyHandler: @escaping (Data) -> Void) {
        print("⌚ ========== MESSAGE DATA RECEIVED FROM IPHONE ==========")
        print("⌚ Data size: \(messageData.count) bytes")
        
        // Start loading state
        DispatchQueue.main.async { [weak self] in
            self?.isWaitingForResponse = true
        }
        
        // Process on background queue
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            do {
                print("⌚ [WatchConnectivity] 🔄 Parsing JSON data...")
                guard let json = try JSONSerialization.jsonObject(with: messageData) as? [String: Any] else {
                    print("⌚ [WatchConnectivity] ❌ Failed to parse JSON - not a dictionary")
                    DispatchQueue.main.async {
                        self?.isWaitingForResponse = false
                    }
                    // Send error reply
                    let errorReply = try? JSONSerialization.data(withJSONObject: ["success": false, "error": "Invalid JSON"])
                    replyHandler(errorReply ?? Data())
                    return
                }
                
                guard let bucketsData = json["buckets"] as? [[String: Any]],
                      let notificationsData = json["notifications"] as? [[String: Any]],
                      let syncUnreadCount = json["unreadCount"] as? Int else {
                    print("⌚ [WatchConnectivity] ❌ Missing required fields in JSON")
                    print("⌚ [WatchConnectivity] 🔍 JSON keys: \(json.keys)")
                    DispatchQueue.main.async {
                        self?.isWaitingForResponse = false
                    }
                    // Send error reply
                    let errorReply = try? JSONSerialization.data(withJSONObject: ["success": false, "error": "Missing fields"])
                    replyHandler(errorReply ?? Data())
                    return
                }
                
                print("⌚ [WatchConnectivity] 📦 Parsed JSON:")
                print("  - Buckets: \(bucketsData.count)")
                print("  - Notifications: \(notificationsData.count)")
                print("  - Unread count: \(syncUnreadCount)")
                
                // Parse buckets
                var buckets: [BucketItem] = []
                for bucketDict in bucketsData {
                    guard let id = bucketDict["id"] as? String,
                          let name = bucketDict["name"] as? String else {
                        continue
                    }
                    
                    let bucket = BucketItem(
                        id: id,
                        name: name,
                        unreadCount: bucketDict["unreadCount"] as? Int ?? 0,
                        totalCount: bucketDict["totalCount"] as? Int ?? 0,
                        color: bucketDict["color"] as? String,
                        iconUrl: bucketDict["iconUrl"] as? String,
                        lastNotificationDate: nil
                    )
                    buckets.append(bucket)
                }
                
                // Parse notifications
                var notifications: [NotificationData] = []
                for notifDict in notificationsData {
                    guard let id = notifDict["id"] as? String,
                          let title = notifDict["title"] as? String else {
                        continue
                    }
                    
                    // Parse attachments
                    var attachments: [DatabaseAccess.WidgetAttachment] = []
                    if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                        for attachmentDict in attachmentsArray {
                            if let mediaType = attachmentDict["mediaType"] as? String,
                               let url = attachmentDict["url"] as? String {
                                let attachment = DatabaseAccess.WidgetAttachment(
                                    mediaType: mediaType,
                                    url: url,
                                    name: attachmentDict["name"] as? String
                                )
                                attachments.append(attachment)
                            }
                        }
                    }
                    
                    let widgetNotification = DatabaseAccess.WidgetNotification(
                        id: id,
                        title: title,
                        body: notifDict["body"] as? String ?? "",
                        subtitle: notifDict["subtitle"] as? String,
                        createdAt: notifDict["createdAt"] as? String ?? "",
                        isRead: notifDict["readAt"] != nil,
                        bucketId: notifDict["bucketId"] as? String ?? "",
                        bucketName: nil,
                        bucketColor: nil,
                        bucketIconUrl: nil,
                        attachments: attachments
                    )
                    
                    let notification = NotificationData(notification: widgetNotification)
                    notifications.append(notification)
                }
                
                print("⌚ [WatchConnectivity] ✅ Parsed \(buckets.count) buckets and \(notifications.count) notifications")
                
                // Update data store and UI
                DispatchQueue.main.async {
                    self?.dataStore.updateFromiPhone(
                        notifications: notificationsData,
                        buckets: bucketsData,
                        unreadCount: syncUnreadCount
                    )
                    
                    // Update published properties
                    self?.buckets = buckets
                    self?.notifications = notifications
                    self?.unreadCount = syncUnreadCount
                    self?.lastUpdate = Date()
                    
                    // Stop loading state
                    self?.isWaitingForResponse = false
                    
                    print("⌚ [WatchConnectivity] ✅ Full sync completed successfully via messageData")
                    print("  - Updated \(buckets.count) buckets")
                    print("  - Updated \(notifications.count) notifications")
                    print("  - Unread count: \(syncUnreadCount)")
                }
                
                // Send success reply
                let successReply = try? JSONSerialization.data(withJSONObject: ["success": true, "received": notificationsData.count])
                replyHandler(successReply ?? Data())
                
            } catch {
                print("⌚ [WatchConnectivity] ❌ Failed to process message data: \(error)")
                print("⌚ [WatchConnectivity] 🔍 Error details: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self?.isWaitingForResponse = false
                }
                // Send error reply
                let errorReply = try? JSONSerialization.data(withJSONObject: ["success": false, "error": error.localizedDescription])
                replyHandler(errorReply ?? Data())
            }
        }
    }
    
    // MARK: - File Transfer Reception (FALLBACK - kept for compatibility)
    
    func session(_ session: WCSession, didReceive file: WCSessionFile) {
        print("⌚ ========== FILE RECEIVED FROM IPHONE (FALLBACK) ==========")
        print("⌚ File URL: \(file.fileURL.absoluteString)")
        print("⌚ [WatchConnectivity] ⚠️ WARNING: Using legacy file transfer - should use messageData instead")
        
        // Start loading state
        DispatchQueue.main.async { [weak self] in
            self?.isWaitingForResponse = true
        }
        
        guard let metadata = file.metadata else {
            print("⌚ [WatchConnectivity] ❌ File transfer without metadata, ignoring")
            DispatchQueue.main.async { [weak self] in
                self?.isWaitingForResponse = false
            }
            return
        }
        
        guard let action = metadata["action"] as? String else {
            print("⌚ [WatchConnectivity] ❌ File metadata without action field, ignoring")
            DispatchQueue.main.async { [weak self] in
                self?.isWaitingForResponse = false
            }
            return
        }
        
        guard action == "fullSync" else {
            print("⌚ [WatchConnectivity] ⚠️ File transfer with action '\(action)' (expected 'fullSync'), ignoring")
            DispatchQueue.main.async { [weak self] in
                self?.isWaitingForResponse = false
            }
            return
        }
        
        let bucketsCount = metadata["bucketsCount"] as? Int ?? 0
        let notificationsCount = metadata["notificationsCount"] as? Int ?? 0
        let unreadCount = metadata["unreadCount"] as? Int ?? 0
        let timestamp = metadata["timestamp"] as? Double ?? 0
        
        print("⌚ [WatchConnectivity] 📊 Full sync file metadata:")
        print("  - Buckets: \(bucketsCount)")
        print("  - Notifications: \(notificationsCount)")
        print("  - Unread: \(unreadCount)")
        print("  - Timestamp: \(timestamp)")
        
        // IMPORTANT: Copy file to permanent location before processing
        // The file.fileURL is temporary and will be deleted by the system
        let fileName = file.fileURL.lastPathComponent
        let destinationURL = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)[0].appendingPathComponent(fileName)
        
        print("⌚ [WatchConnectivity] 📂 Copying file to permanent location:")
        print("  - From: \(file.fileURL.path)")
        print("  - To: \(destinationURL.path)")
        
        // Read and parse JSON file
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            print("⌚ [WatchConnectivity] 🔄 Starting to process file on background queue...")
            
            do {
                // VALIDATE FILE BEFORE COPYING
                print("⌚ [WatchConnectivity] 🔍 VALIDATING TEMPORARY FILE BEFORE COPY:")
                print("  - File URL: \(file.fileURL)")
                print("  - File path: \(file.fileURL.path)")
                
                let tempFileExists = FileManager.default.fileExists(atPath: file.fileURL.path)
                print("  - File exists: \(tempFileExists)")
                
                if tempFileExists {
                    do {
                        let attributes = try FileManager.default.attributesOfItem(atPath: file.fileURL.path)
                        let fileSize = attributes[.size] as? Int64 ?? 0
                        print("  - File size: \(fileSize) bytes")
                        
                        // Try to read the file content
                        print("  - Attempting to read file data...")
                        let tempData = try Data(contentsOf: file.fileURL)
                        print("  ✅ Successfully read \(tempData.count) bytes from temporary file")
                        
                        // Try to parse as JSON
                        print("  - Attempting to parse JSON...")
                        if let tempJSON = try JSONSerialization.jsonObject(with: tempData) as? [String: Any] {
                            print("  ✅ Valid JSON object with keys: \(tempJSON.keys.joined(separator: ", "))")
                            
                            if let buckets = tempJSON["buckets"] as? [[String: Any]] {
                                print("  ✅ Found \(buckets.count) buckets")
                            } else {
                                print("  ⚠️ 'buckets' field is missing or not an array")
                            }
                            
                            if let notifications = tempJSON["notifications"] as? [[String: Any]] {
                                print("  ✅ Found \(notifications.count) notifications")
                            } else {
                                print("  ⚠️ 'notifications' field is missing or not an array")
                            }
                            
                            if let unreadCount = tempJSON["unreadCount"] as? Int {
                                print("  ✅ Unread count: \(unreadCount)")
                            } else {
                                print("  ⚠️ 'unreadCount' field is missing or not an integer")
                            }
                        } else {
                            print("  ❌ JSON is not a dictionary")
                        }
                    } catch {
                        print("  ❌ Error during validation: \(error.localizedDescription)")
                    }
                } else {
                    print("  ❌ TEMPORARY FILE DOES NOT EXIST!")
                }
                
                print("⌚ [WatchConnectivity] 🔍 VALIDATION COMPLETE - Proceeding with copy...")
                
                // First, copy the file to a permanent location
                if FileManager.default.fileExists(atPath: destinationURL.path) {
                    try FileManager.default.removeItem(at: destinationURL)
                    print("⌚ [WatchConnectivity] �️ Removed existing file at destination")
                }
                
                try FileManager.default.copyItem(at: file.fileURL, to: destinationURL)
                print("⌚ [WatchConnectivity] ✅ File copied to permanent location")
                
                // Now read from the permanent location
                print("⌚ [WatchConnectivity] 📖 Reading file data from: \(destinationURL.path)")
                let data = try Data(contentsOf: destinationURL)
                print("⌚ [WatchConnectivity] ✅ Read file data: \(data.count) bytes")
                
                print("⌚ [WatchConnectivity] 🔄 Parsing JSON...")
                guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
                    print("⌚ [WatchConnectivity] ❌ Failed to parse JSON - not a dictionary")
                    DispatchQueue.main.async { [weak self] in
                        self?.isWaitingForResponse = false
                    }
                    return
                }
                
                guard let bucketsData = json["buckets"] as? [[String: Any]],
                      let notificationsData = json["notifications"] as? [[String: Any]],
                      let syncUnreadCount = json["unreadCount"] as? Int else {
                    print("⌚ [WatchConnectivity] ❌ Missing required fields in JSON")
                    print("⌚ [WatchConnectivity] 🔍 JSON keys: \(json.keys)")
                    print("⌚ [WatchConnectivity] 🔍 buckets type: \(type(of: json["buckets"]))")
                    print("⌚ [WatchConnectivity] 🔍 notifications type: \(type(of: json["notifications"]))")
                    print("⌚ [WatchConnectivity] 🔍 unreadCount type: \(type(of: json["unreadCount"]))")
                    DispatchQueue.main.async { [weak self] in
                        self?.isWaitingForResponse = false
                    }
                    return
                }
                
                print("⌚ [WatchConnectivity] 📦 Parsed JSON:")
                print("  - Buckets: \(bucketsData.count)")
                print("  - Notifications: \(notificationsData.count)")
                print("  - Unread count: \(syncUnreadCount)")
                
                // Parse buckets
                var buckets: [BucketItem] = []
                for bucketDict in bucketsData {
                    guard let id = bucketDict["id"] as? String,
                          let name = bucketDict["name"] as? String else {
                        continue
                    }
                    
                    let bucket = BucketItem(
                        id: id,
                        name: name,
                        unreadCount: bucketDict["unreadCount"] as? Int ?? 0,
                        totalCount: bucketDict["totalCount"] as? Int ?? 0,
                        color: bucketDict["color"] as? String,
                        iconUrl: bucketDict["iconUrl"] as? String,
                        lastNotificationDate: nil
                    )
                    buckets.append(bucket)
                }
                
                // Parse notifications
                var notifications: [NotificationData] = []
                for notifDict in notificationsData {
                    guard let id = notifDict["id"] as? String,
                          let title = notifDict["title"] as? String else {
                        continue
                    }
                    
                    // Parse attachments
                    var attachments: [DatabaseAccess.WidgetAttachment] = []
                    if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                        for attachmentDict in attachmentsArray {
                            if let mediaType = attachmentDict["mediaType"] as? String,
                               let url = attachmentDict["url"] as? String {
                                let attachment = DatabaseAccess.WidgetAttachment(
                                    mediaType: mediaType,
                                    url: url,
                                    name: attachmentDict["name"] as? String
                                )
                                attachments.append(attachment)
                            }
                        }
                    }
                    
                    let widgetNotification = DatabaseAccess.WidgetNotification(
                        id: id,
                        title: title,
                        body: notifDict["body"] as? String ?? "",
                        subtitle: notifDict["subtitle"] as? String,
                        createdAt: notifDict["createdAt"] as? String ?? "",
                        isRead: notifDict["readAt"] != nil,
                        bucketId: notifDict["bucketId"] as? String ?? "",
                        bucketName: nil,
                        bucketColor: nil,
                        bucketIconUrl: nil,
                        attachments: attachments
                    )
                    
                    let notification = NotificationData(notification: widgetNotification)
                    notifications.append(notification)
                }
                
                print("⌚ [WatchConnectivity] ✅ Parsed \(buckets.count) buckets and \(notifications.count) notifications")
                
                // Update data store and UI
                DispatchQueue.main.async { [weak self] in
                    self?.dataStore.updateFromiPhone(
                        notifications: notificationsData,
                        buckets: bucketsData,
                        unreadCount: syncUnreadCount
                    )
                    
                    // Update published properties
                    self?.buckets = buckets
                    self?.notifications = notifications
                    self?.unreadCount = syncUnreadCount
                    self?.lastUpdate = Date()
                    
                    // Stop loading state
                    self?.isWaitingForResponse = false
                    
                    print("⌚ [WatchConnectivity] ✅ Full sync completed successfully")
                    print("  - Updated \(buckets.count) buckets")
                    print("  - Updated \(notifications.count) notifications")
                    print("  - Unread count: \(syncUnreadCount)")
                }
                
                // Clean up the copied file after processing
                try? FileManager.default.removeItem(at: destinationURL)
                print("⌚ [WatchConnectivity] 🧹 Cleaned up temporary file")
                
            } catch {
                print("⌚ [WatchConnectivity] ❌ Failed to read/parse file: \(error)")
                print("⌚ [WatchConnectivity] 🔍 Error details: \(error.localizedDescription)")
                DispatchQueue.main.async { [weak self] in
                    self?.isWaitingForResponse = false
                }
            }
        }
    }
}
