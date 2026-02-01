import Foundation
import WatchConnectivity

/**
 * WatchConnectivityManager - Manages Watch data via WatchConnectivity
 * 
 * All data sync happens via WatchConnectivity from iPhone.
 * No CloudKit is used on Watch side.
 */
class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    @Published var lastUpdate: Date?
    @Published var isWaitingForResponse: Bool = false
    @Published var isSyncing: Bool = false
    @Published var isFullSyncing: Bool = false
    
    // Sync progress tracking
    @Published var syncProgressCurrentItem: Int = 0
    @Published var syncProgressTotalItems: Int = 0
    @Published var syncProgressItemType: String = ""
    @Published var syncProgressPhase: String = ""
    @Published var syncProgressStep: String = ""
    
    private let dataStore = WatchDataStore.shared
    private var wcSession: WCSession?
    
    private let syncStateQueue = DispatchQueue(label: "WatchConnectivityManager.syncStateQueue")
    private var syncInFlight: Bool = false

    private let topUpQueue = DispatchQueue(label: "WatchConnectivityManager.topUpQueue")
    private var topUpInFlight: Bool = false

    private var uiRefreshWorkItem: DispatchWorkItem?
    private let uiRefreshDebounceInterval: TimeInterval = 0.35
    private let uiRefreshFastDebounceInterval: TimeInterval = 0.08

    // WC is intentionally restricted to:
    // - iPhone -> Watch: settings (watchTokenSettings via applicationContext/message)
    // - Watch -> iPhone: logs transfer (watchLogs via sendMessage)
    
    private override init() {
        super.init()
        loadCachedData()
        updateBucketCounts() // Update bucket counts immediately after loading cache
        
        // Listen for app lifecycle events
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: NSNotification.Name("WatchAppDidBecomeActive"),
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: NSNotification.Name("WatchAppWillResignActive"),
            object: nil
        )
        
        setupWatchConnectivity()
    }
    
    private func setupWatchConnectivity() {
        if WCSession.isSupported() {
            wcSession = WCSession.default
            wcSession?.delegate = self
            
            // Check for existing application context (token settings sent before watch was active)
            if let applicationContext = wcSession?.applicationContext, !applicationContext.isEmpty {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Found existing application context", metadata: ["keys": "\(applicationContext.keys)"], source: "Watch")
                if let type = applicationContext["type"] as? String, type == "watchTokenSettings" {
                    handleWatchTokenSettings(message: applicationContext, replyHandler: { _ in })
                }
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "No application context available yet", source: "Watch")
            }
            
            wcSession?.activate()
        }
    }
    
    // MARK: - WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "WCSession activation failed", metadata: ["error": error.localizedDescription], source: "Watch")
        } else {
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "WCSession activated", metadata: ["state": "\(activationState.rawValue)"], source: "Watch")
            DispatchQueue.main.async {
                self.isConnected = activationState == .activated
            }
            
            // After activation, check for application context again (in case it was set while activating)
            if activationState == .activated {
                let applicationContext = session.applicationContext
                if !applicationContext.isEmpty {
                    LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Application context available after activation", metadata: ["keys": "\(applicationContext.keys)"], source: "Watch")
                    if let type = applicationContext["type"] as? String, type == "watchTokenSettings" {
                        handleWatchTokenSettings(message: applicationContext, replyHandler: { _ in })
                    }
                } else {
                    LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Application context data is nil after activation", source: "Watch")
                }
            }
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let type = message["type"] as? String else {
            replyHandler(["success": false, "error": "Missing message type"])
            return
        }
        
        if type == "watchTokenSettings" {
            handleWatchTokenSettings(message: message, replyHandler: replyHandler)
        } else {
            replyHandler(["success": false, "error": "Unknown message type"])
        }
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        if let type = applicationContext["type"] as? String {
            if type == "watchTokenSettings" {
                handleWatchTokenSettings(message: applicationContext, replyHandler: { _ in })
            } else if type == "wc_sync_state" {
                // WC-only sync: application context contains current state
                handleWCSyncState(applicationContext)
            }
        }
    }
    
    // MARK: - WC-Only Sync (transferUserInfo)
    
    /// Handle transferUserInfo messages from iPhone (WC-only sync mode)
    /// These messages are queued and delivered in FIFO order, even if Watch was offline
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String: Any]) {
        guard let type = userInfo["type"] as? String else { return }
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Received transferUserInfo",
            metadata: ["type": type],
            source: "Watch"
        )
        
        switch type {
        case "wc_notification_created":
            handleWCNotificationCreated(userInfo)
            
        case "wc_notification_read_updated":
            handleWCNotificationReadUpdated(userInfo)
            
        case "wc_notifications_batch_read_updated":
            handleWCNotificationsBatchReadUpdated(userInfo)
            
        case "wc_notification_deleted":
            handleWCNotificationDeleted(userInfo)
            
        case "wc_notifications_batch_deleted":
            handleWCNotificationsBatchDeleted(userInfo)
            
        case "wc_bucket_updated":
            handleWCBucketUpdated(userInfo)
            
        case "wc_bucket_deleted":
            handleWCBucketDeleted(userInfo)
            
        case "wc_full_sync_start":
            handleWCFullSyncStart(userInfo)
            
        case "wc_full_sync_buckets":
            handleWCFullSyncBuckets(userInfo)
            
        case "wc_full_sync_notifications":
            handleWCFullSyncNotifications(userInfo)
            
        case "wc_full_sync_complete":
            handleWCFullSyncComplete(userInfo)
            
        default:
            LoggingSystem.shared.log(
                level: "WARN",
                tag: "WCSync",
                message: "Unknown WC message type",
                metadata: ["type": type],
                source: "Watch"
            )
        }
    }
    
    // MARK: - WC Sync Handlers
    
    private func handleWCSyncState(_ context: [String: Any]) {
        // Update local stats from application context
        if let unreadCount = context["unreadCount"] as? Int {
            DispatchQueue.main.async { [weak self] in
                self?.unreadCount = unreadCount
            }
        }
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Received sync state",
            metadata: [
                "unreadCount": context["unreadCount"] as? Int ?? 0,
                "notificationCount": context["notificationCount"] as? Int ?? 0
            ],
            source: "Watch"
        )
    }
    
    private func handleWCNotificationCreated(_ userInfo: [String: Any]) {
        guard let notificationDict = userInfo["notification"] as? [String: Any],
              let id = notificationDict["id"] as? String,
              let bucketId = notificationDict["bucketId"] as? String,
              let title = notificationDict["title"] as? String,
              let body = notificationDict["body"] as? String,
              let createdAt = notificationDict["createdAt"] as? String else {
            return
        }
        
        var cache = dataStore.loadCache()
        
        // Check if notification already exists
        if cache.notifications.contains(where: { $0.id == id }) {
            return
        }
        
        let isRead = (notificationDict["isRead"] as? Bool) ?? false
        let subtitle = notificationDict["subtitle"] as? String
        
        // Parse attachments
        var attachments: [WatchDataStore.CachedAttachment] = []
        if let attachmentsArray = notificationDict["attachments"] as? [[String: Any]] {
            attachments = attachmentsArray.compactMap { dict in
                guard let mediaType = dict["mediaType"] as? String else { return nil }
                return WatchDataStore.CachedAttachment(
                    mediaType: mediaType,
                    url: dict["url"] as? String,
                    name: dict["name"] as? String
                )
            }
        }
        
        // Parse actions
        var actions: [WatchDataStore.CachedAction] = []
        if let actionsArray = notificationDict["actions"] as? [[String: Any]] {
            actions = actionsArray.compactMap { dict in
                guard let type = dict["type"] as? String else { return nil }
                return WatchDataStore.CachedAction(
                    type: type,
                    label: dict["label"] as? String ?? "",
                    value: dict["value"] as? String,
                    id: dict["id"] as? String,
                    url: dict["url"] as? String,
                    bucketId: dict["bucketId"] as? String,
                    minutes: dict["minutes"] as? Int
                )
            }
        }
        
        // Find bucket info
        let bucket = cache.buckets.first(where: { $0.id == bucketId })
        
        let notification = WatchDataStore.CachedNotification(
            id: id,
            title: title,
            body: body,
            subtitle: subtitle,
            createdAt: createdAt,
            isRead: isRead,
            bucketId: bucketId,
            bucketName: bucket?.name,
            bucketColor: bucket?.color,
            bucketIconUrl: bucket?.iconUrl,
            attachments: attachments,
            actions: actions
        )
        
        cache.notifications.insert(notification, at: 0)
        if !isRead {
            cache.unreadCount += 1
        }
        cache.lastUpdate = Date()
        
        // Keep cache bounded
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        if cache.notifications.count > maxLimit {
            cache.notifications = Array(cache.notifications.prefix(maxLimit))
        }
        
        dataStore.saveCache(cache)
        scheduleUIRefresh(reason: "wc_notification_created")
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Added notification via WC",
            metadata: ["id": id],
            source: "Watch"
        )
    }
    
    private func handleWCNotificationReadUpdated(_ userInfo: [String: Any]) {
        guard let notificationId = userInfo["notificationId"] as? String else { return }
        
        let readAt = userInfo["readAt"]
        let isRead = !(readAt is NSNull) && readAt != nil
        
        dataStore.setNotificationReadStatus(id: notificationId, isRead: isRead)
        scheduleUIRefresh(reason: "wc_notification_read_updated", debounceInterval: uiRefreshFastDebounceInterval)
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Updated read status via WC",
            metadata: ["id": notificationId, "isRead": isRead],
            source: "Watch"
        )
    }
    
    private func handleWCNotificationsBatchReadUpdated(_ userInfo: [String: Any]) {
        guard let notificationIds = userInfo["notificationIds"] as? [String] else { return }
        
        let readAt = userInfo["readAt"]
        let isRead = !(readAt is NSNull) && readAt != nil
        
        dataStore.setNotificationsReadStatus(ids: notificationIds, isRead: isRead)
        scheduleUIRefresh(reason: "wc_batch_read_updated", debounceInterval: uiRefreshFastDebounceInterval)
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Updated batch read status via WC",
            metadata: ["count": notificationIds.count, "isRead": isRead],
            source: "Watch"
        )
    }
    
    private func handleWCNotificationDeleted(_ userInfo: [String: Any]) {
        guard let notificationId = userInfo["notificationId"] as? String else { return }
        
        dataStore.deleteNotification(id: notificationId)
        scheduleUIRefresh(reason: "wc_notification_deleted", debounceInterval: uiRefreshFastDebounceInterval)
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Deleted notification via WC",
            metadata: ["id": notificationId],
            source: "Watch"
        )
    }
    
    private func handleWCNotificationsBatchDeleted(_ userInfo: [String: Any]) {
        guard let notificationIds = userInfo["notificationIds"] as? [String] else { return }
        
        dataStore.deleteNotifications(ids: notificationIds)
        scheduleUIRefresh(reason: "wc_batch_deleted", debounceInterval: uiRefreshFastDebounceInterval)
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Deleted batch notifications via WC",
            metadata: ["count": notificationIds.count],
            source: "Watch"
        )
    }
    
    private func handleWCBucketUpdated(_ userInfo: [String: Any]) {
        guard let bucketDict = userInfo["bucket"] as? [String: Any],
              let id = bucketDict["id"] as? String,
              let name = bucketDict["name"] as? String else {
            return
        }
        
        var cache = dataStore.loadCache()
        
        let bucket = WatchDataStore.CachedBucket(
            id: id,
            name: name,
            unreadCount: 0,
            color: bucketDict["color"] as? String,
            iconUrl: bucketDict["iconUrl"] as? String
        )
        
        if let idx = cache.buckets.firstIndex(where: { $0.id == id }) {
            cache.buckets[idx] = bucket
        } else {
            cache.buckets.append(bucket)
        }
        
        cache.lastUpdate = Date()
        dataStore.saveCache(cache)
        scheduleUIRefresh(reason: "wc_bucket_updated")
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Updated bucket via WC",
            metadata: ["id": id],
            source: "Watch"
        )
    }
    
    private func handleWCBucketDeleted(_ userInfo: [String: Any]) {
        guard let bucketId = userInfo["bucketId"] as? String else { return }
        
        var cache = dataStore.loadCache()
        cache.buckets.removeAll(where: { $0.id == bucketId })
        cache.lastUpdate = Date()
        dataStore.saveCache(cache)
        scheduleUIRefresh(reason: "wc_bucket_deleted")
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Deleted bucket via WC",
            metadata: ["id": bucketId],
            source: "Watch"
        )
    }
    
    // MARK: - WC Full Sync Handlers
    
    private var wcFullSyncCache: WatchDataStore.WatchCache?
    
    private func handleWCFullSyncStart(_ userInfo: [String: Any]) {
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "WC full sync started - clearing local cache",
            source: "Watch"
        )
        
        // Prepare fresh cache for full sync
        wcFullSyncCache = WatchDataStore.WatchCache()
        
        DispatchQueue.main.async { [weak self] in
            self?.isFullSyncing = true
        }
    }
    
    private func handleWCFullSyncBuckets(_ userInfo: [String: Any]) {
        guard let bucketsArray = userInfo["buckets"] as? [[String: Any]] else { return }
        
        var buckets: [WatchDataStore.CachedBucket] = []
        for bucketDict in bucketsArray {
            guard let id = bucketDict["id"] as? String,
                  let name = bucketDict["name"] as? String else {
                continue
            }
            
            let bucket = WatchDataStore.CachedBucket(
                id: id,
                name: name,
                unreadCount: 0,
                color: bucketDict["color"] as? String,
                iconUrl: bucketDict["iconUrl"] as? String
            )
            buckets.append(bucket)
        }
        
        if wcFullSyncCache != nil {
            wcFullSyncCache?.buckets = buckets
        }
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Received full sync buckets",
            metadata: ["count": buckets.count],
            source: "Watch"
        )
    }
    
    private func handleWCFullSyncNotifications(_ userInfo: [String: Any]) {
        guard let notificationsArray = userInfo["notifications"] as? [[String: Any]] else { return }
        
        let batchIndex = userInfo["batchIndex"] as? Int ?? 0
        let totalBatches = userInfo["totalBatches"] as? Int ?? 1
        
        var notifications: [WatchDataStore.CachedNotification] = []
        for notifDict in notificationsArray {
            guard let id = notifDict["id"] as? String,
                  let bucketId = notifDict["bucketId"] as? String,
                  let title = notifDict["title"] as? String,
                  let body = notifDict["body"] as? String,
                  let createdAt = notifDict["createdAt"] as? String else {
                continue
            }
            
            let isRead = (notifDict["isRead"] as? Bool) ?? false
            let subtitle = notifDict["subtitle"] as? String
            
            // Parse attachments
            var attachments: [WatchDataStore.CachedAttachment] = []
            if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                attachments = attachmentsArray.compactMap { dict in
                    guard let mediaType = dict["mediaType"] as? String else { return nil }
                    return WatchDataStore.CachedAttachment(
                        mediaType: mediaType,
                        url: dict["url"] as? String,
                        name: dict["name"] as? String
                    )
                }
            }
            
            // Parse actions
            var actions: [WatchDataStore.CachedAction] = []
            if let actionsArray = notifDict["actions"] as? [[String: Any]] {
                actions = actionsArray.compactMap { dict in
                    guard let type = dict["type"] as? String else { return nil }
                    return WatchDataStore.CachedAction(
                        type: type,
                        label: dict["label"] as? String ?? "",
                        value: dict["value"] as? String,
                        id: dict["id"] as? String,
                        url: dict["url"] as? String,
                        bucketId: dict["bucketId"] as? String,
                        minutes: dict["minutes"] as? Int
                    )
                }
            }
            
            // Find bucket info from wcFullSyncCache
            let bucket = wcFullSyncCache?.buckets.first(where: { $0.id == bucketId })
            
            let notification = WatchDataStore.CachedNotification(
                id: id,
                title: title,
                body: body,
                subtitle: subtitle,
                createdAt: createdAt,
                isRead: isRead,
                bucketId: bucketId,
                bucketName: bucket?.name,
                bucketColor: bucket?.color,
                bucketIconUrl: bucket?.iconUrl,
                attachments: attachments,
                actions: actions
            )
            notifications.append(notification)
        }
        
        if wcFullSyncCache != nil {
            wcFullSyncCache?.notifications.append(contentsOf: notifications)
        }
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "Received full sync notifications batch",
            metadata: ["batch": "\(batchIndex + 1)/\(totalBatches)", "count": notifications.count],
            source: "Watch"
        )
    }
    
    private func handleWCFullSyncComplete(_ userInfo: [String: Any]) {
        guard var cache = wcFullSyncCache else {
            LoggingSystem.shared.log(
                level: "WARN",
                tag: "WCSync",
                message: "Full sync complete received but no cache prepared",
                source: "Watch"
            )
            return
        }
        
        // Recompute unread counts
        cache.unreadCount = cache.notifications.filter { !$0.isRead }.count
        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            WatchDataStore.CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }
        
        cache.lastUpdate = Date()
        dataStore.saveCache(cache)
        wcFullSyncCache = nil
        
        DispatchQueue.main.async { [weak self] in
            self?.isFullSyncing = false
            self?.loadCachedData()
            self?.updateBucketCounts()
        }
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "WCSync",
            message: "WC full sync completed",
            metadata: [
                "notifications": cache.notifications.count,
                "buckets": cache.buckets.count,
                "unread": cache.unreadCount
            ],
            source: "Watch"
        )
    }
    
    private func handleWatchTokenSettings(message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let token = message["token"] as? String,
              let serverAddress = message["serverAddress"] as? String else {
            LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Missing token or server address", source: "Watch")
            replyHandler(["success": false, "error": "Missing token or server address"])
            return
        }
        
        // Save token and server address to UserDefaults
        UserDefaults.standard.set(token, forKey: "watch_access_token")
        UserDefaults.standard.set(serverAddress, forKey: "watch_server_address")
        UserDefaults.standard.synchronize()
        
        LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Watch token settings received and saved", source: "Watch")
        
        // Post notification to show confirmation in UI
        NotificationCenter.default.post(
            name: NSNotification.Name("WatchTokenSettingsReceived"),
            object: nil,
            userInfo: ["token": token, "serverAddress": serverAddress]
        )
        
        replyHandler(["success": true])
    }
    
    @objc private func appDidBecomeActive() {
        // Reload cached data when app becomes active
        loadCachedData()
        updateBucketCounts()
    }
    
    @objc private func appWillResignActive() {
        // Best-effort: persist any pending cache writes before backgrounding.
        dataStore.flushPendingWrites()
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    private func scheduleUIRefresh(
        reason: String,
        debounceInterval: TimeInterval? = nil,
        work: (() -> Void)? = nil
    ) {
        // Coalesce bursts of updates to avoid blocking the UI when many notifications arrive
        uiRefreshWorkItem?.cancel()
        let interval = debounceInterval ?? uiRefreshDebounceInterval
        let workItem = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            if let work {
                work()
            } else {
                self.loadCachedData()
                self.updateBucketCounts()
            }
        }
        uiRefreshWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + interval, execute: workItem)
    }

    private func makeNotificationData(from cached: WatchDataStore.CachedNotification) -> NotificationData {
        let notification = WidgetNotification(
            id: cached.id,
            title: cached.title,
            body: cached.body,
            subtitle: cached.subtitle,
            createdAt: cached.createdAt,
            isRead: cached.isRead,
            bucketId: cached.bucketId,
            bucketName: cached.bucketName,
            bucketColor: cached.bucketColor,
            bucketIconUrl: cached.bucketIconUrl,
            attachments: cached.attachments.map { WidgetAttachment(mediaType: $0.mediaType, url: $0.url, name: $0.name) },
            actions: cached.actions.map { NotificationAction(type: $0.type, label: $0.label, value: $0.value, id: $0.id, url: $0.url, bucketId: $0.bucketId, minutes: $0.minutes) }
        )
        return NotificationData(notification: notification)
    }

    private func normalizeNotificationsForDisplay() {
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit

        let mostRecent = notifications
            .sorted { $0.notification.createdAtDate > $1.notification.createdAtDate }

        let limited = Array(mostRecent.prefix(maxLimit))

        notifications = limited.sorted { a, b in
            if a.notification.isRead != b.notification.isRead {
                return !a.notification.isRead && b.notification.isRead
            }
            return a.notification.createdAtDate > b.notification.createdAtDate
        }
    }
    
    /// Reload notifications and buckets from WatchDataStore (e.g. after extension wrote a new notification).
    func reloadFromLocalCache() {
        dataStore.reloadFromDisk()
        loadCachedData()
        updateBucketCounts()
    }
    
    /// Ensure a single notification (e.g. from tap) is in the list by reading from disk; list will update automatically later.
    func ensureNotificationLoadedFromDisk(id: String) {
        if notifications.contains(where: { $0.notification.id == id }) { return }
        let cache = dataStore.getCacheFromDisk()
        guard let cached = cache.notifications.first(where: { $0.id == id }) else { return }
        let notification = WidgetNotification(
            id: cached.id,
            title: cached.title,
            body: cached.body,
            subtitle: cached.subtitle,
            createdAt: cached.createdAt,
            isRead: cached.isRead,
            bucketId: cached.bucketId,
            bucketName: cached.bucketName,
            bucketColor: cached.bucketColor,
            bucketIconUrl: cached.bucketIconUrl,
            attachments: cached.attachments.map { WidgetAttachment(mediaType: $0.mediaType, url: $0.url, name: $0.name) },
            actions: cached.actions.map { NotificationAction(type: $0.type, label: $0.label, value: $0.value, id: $0.id, url: $0.url, bucketId: $0.bucketId, minutes: $0.minutes) }
        )
        var list = notifications
        list.insert(NotificationData(notification: notification), at: 0)
        list.sort { a, b in
            if a.notification.isRead != b.notification.isRead { return !a.notification.isRead && b.notification.isRead }
            return a.notification.createdAtDate > b.notification.createdAtDate
        }
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(list.prefix(maxLimit))
        unreadCount = notifications.filter { !$0.notification.isRead }.count
        updateBucketCounts()
    }
    
    private func loadCachedData() {
        let cache = dataStore.loadCache()
        
        // Convert cached notifications to NotificationData
        let mappedNotifications = cache.notifications.map { cached in
            let notification = WidgetNotification(
                id: cached.id,
                title: cached.title,
                body: cached.body,
                subtitle: cached.subtitle,
                createdAt: cached.createdAt,
                isRead: cached.isRead,
                bucketId: cached.bucketId,
                bucketName: cached.bucketName,
                bucketColor: cached.bucketColor,
                bucketIconUrl: cached.bucketIconUrl,
                attachments: cached.attachments.map { WidgetAttachment(mediaType: $0.mediaType, url: $0.url, name: $0.name) },
                actions: cached.actions.map { NotificationAction(type: $0.type, label: $0.label, value: $0.value, id: $0.id, url: $0.url, bucketId: $0.bucketId, minutes: $0.minutes) }
            )
            return NotificationData(notification: notification)
        }
        
        // Apply maximum notifications limit (keep only the N most recent by createdAt)
        // Then sort for display (unread first, then newest first).
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        let totalAvailable = mappedNotifications.count

        let mostRecent = mappedNotifications
            .sorted { $0.notification.createdAtDate > $1.notification.createdAtDate }

        let limited = Array(mostRecent.prefix(maxLimit))

        let displaySorted = limited.sorted { a, b in
            if a.notification.isRead != b.notification.isRead {
                return !a.notification.isRead && b.notification.isRead
            }
            return a.notification.createdAtDate > b.notification.createdAtDate
        }

        notifications = displaySorted
        if totalAvailable > maxLimit {
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "WatchConnectivity",
                message: "Applied notifications display limit",
                metadata: [
                    "totalAvailable": "\(totalAvailable)",
                    "displayLimit": "\(maxLimit)",
                    "displayed": "\(notifications.count)"
                ],
                source: "Watch"
            )
        }
        
        // Convert cached buckets to BucketItem
        buckets = cache.buckets.map { cached in
            BucketItem(
                id: cached.id,
                name: cached.name,
                unreadCount: cached.unreadCount,
                totalCount: 0,
                color: cached.color,
                iconUrl: cached.iconUrl,
                lastNotificationDate: nil
            )
        }
        
        unreadCount = cache.unreadCount
        lastUpdate = cache.lastUpdate
    }
    
    /// Request refresh from UI (triggers a UI reload from cache)
    func requestFullRefresh() {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Refresh requested - reloading from cache", source: "Watch")
        loadCachedData()
        updateBucketCounts()
    }
    
    /// Request full sync from iPhone via WatchConnectivity
    func requestFullSync() {
        guard WCSession.default.isReachable else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchConnectivity", message: "iPhone not reachable - cannot request full sync", source: "Watch")
            // Load from local cache instead
            loadCachedData()
            updateBucketCounts()
            return
        }
        
        LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Requesting full sync from iPhone", source: "Watch")
        
        DispatchQueue.main.async {
            self.isFullSyncing = true
        }
        
        WCSession.default.sendMessage(["type": "request_full_sync"], replyHandler: { [weak self] reply in
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Full sync request acknowledged", metadata: ["reply": "\(reply)"], source: "Watch")
            // Data will come via transferUserInfo
        }) { [weak self] error in
            LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Failed to request full sync", metadata: ["error": error.localizedDescription], source: "Watch")
            DispatchQueue.main.async {
                self?.isFullSyncing = false
            }
            // Load from local cache as fallback
            self?.loadCachedData()
            self?.updateBucketCounts()
        }
    }
    
    private func updateBucketCounts() {
        // Calculate notification counts per bucket
        var bucketCounts: [String: (total: Int, unread: Int)] = [:]
        var bucketLastDates: [String: Date] = [:]
        
        for notificationData in notifications {
            let bucketId = notificationData.notification.bucketId
            let isRead = notificationData.notification.isRead
            
            if bucketCounts[bucketId] == nil {
                bucketCounts[bucketId] = (total: 0, unread: 0)
            }
            
            bucketCounts[bucketId]?.total += 1
            if !isRead {
                bucketCounts[bucketId]?.unread += 1
            }
            
            // Track last notification date per bucket
            let createdAt = notificationData.notification.createdAtDate
            if let existingDate = bucketLastDates[bucketId] {
                if createdAt > existingDate {
                    bucketLastDates[bucketId] = createdAt
                }
                } else {
                bucketLastDates[bucketId] = createdAt
            }
        }
        
        // Update buckets with counts
        buckets = buckets.map { bucket in
            let counts = bucketCounts[bucket.id] ?? (total: 0, unread: 0)
            return BucketItem(
                id: bucket.id,
                name: bucket.name,
                unreadCount: counts.unread,
                totalCount: counts.total,
                color: bucket.color,
                iconUrl: bucket.iconUrl,
                lastNotificationDate: bucketLastDates[bucket.id]
            )
        }
    }

    // MARK: - Watch REST helpers (using watch token settings)

    private func buildApiBaseWithPrefix(from serverAddress: String) -> String {
        let trimmed = serverAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = trimmed.replacingOccurrences(of: "/$", with: "", options: .regularExpression)

        // If user already includes /api/v1, don't double-append.
        if base.hasSuffix("/api/v1") {
            return base
        }
        return base + "/api/v1"
    }

    private func makeWatchApiRequest(
        path: String,
        method: String,
        jsonBody: [String: Any]? = nil
    ) -> URLRequest? {
        guard let token = UserDefaults.standard.string(forKey: "watch_access_token"),
              let serverAddress = UserDefaults.standard.string(forKey: "watch_server_address") else {
            return nil
        }
        let tokenTrimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        let serverTrimmed = serverAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !tokenTrimmed.isEmpty, !serverTrimmed.isEmpty else { return nil }

        let apiBase = buildApiBaseWithPrefix(from: serverTrimmed)
        let urlString = apiBase + path
        guard let url = URL(string: urlString) else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(tokenTrimmed)", forHTTPHeaderField: "Authorization")

        if let jsonBody {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            if let data = try? JSONSerialization.data(withJSONObject: jsonBody) {
                request.httpBody = data
            }
        }

        return request
    }

    private func performWatchApiRequest(
        path: String,
        method: String,
        jsonBody: [String: Any]? = nil,
        completion: @escaping (Bool) -> Void
    ) {
        guard let request = makeWatchApiRequest(path: path, method: method, jsonBody: jsonBody) else {
            // Missing watch settings is not an error condition for WC sync.
            // It simply means watch-scoped REST actions are currently unavailable.
            LoggingSystem.shared.log(level: "INFO", tag: "WatchREST", message: "Missing watch token/serverAddress; skipping REST call", metadata: ["path": path, "method": method], source: "Watch")
            completion(false)
            return
        }

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error {
                LoggingSystem.shared.log(level: "ERROR", tag: "WatchREST", message: "REST call failed", metadata: ["path": path, "error": error.localizedDescription], source: "Watch")
                completion(false)
                return
            }

            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            if status >= 200 && status < 300 {
                completion(true)
            } else {
                // REST is best-effort from watch. Backend may have already cleaned up notifications.
                // Treat common idempotent statuses as success to avoid noisy logs and blocking follow-up.
                if status == 404 || status == 410 {
                    LoggingSystem.shared.log(
                        level: "INFO",
                        tag: "WatchREST",
                        message: "REST resource missing; treating as success",
                        metadata: ["path": path, "status": "\(status)", "method": method],
                        source: "Watch"
                    )
                    completion(true)
                } else {
                    LoggingSystem.shared.log(level: "WARN", tag: "WatchREST", message: "REST call returned HTTP error", metadata: ["path": path, "status": "\(status)", "method": method], source: "Watch")
                    completion(false)
                }
            }
        }.resume()
    }
    
    func markNotificationAsReadFromWatch(id: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Mark notification as read requested", metadata: ["notificationId": id], source: "Watch")

        // Update UI state immediately (avoid disk IO + heavy reload on main thread)
        let wasRead = notifications.first(where: { $0.notification.id == id })?.notification.isRead ?? true
        if !wasRead {
            unreadCount = max(0, unreadCount - 1)
        }
        notifications = notifications.map { item in
            guard item.notification.id == id else { return item }
            let n = item.notification
            let updated = WidgetNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                subtitle: n.subtitle,
                createdAt: n.createdAt,
                isRead: true,
                bucketId: n.bucketId,
                bucketName: n.bucketName,
                bucketColor: n.bucketColor,
                bucketIconUrl: n.bucketIconUrl,
                attachments: n.attachments,
                actions: n.actions
            )
            return NotificationData(notification: updated)
        }

        // Re-apply sort + limit (list is small on watch)
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(
            notifications
                .sorted { a, b in
                    if a.notification.isRead != b.notification.isRead {
                        return !a.notification.isRead && b.notification.isRead
                    }
                    return a.notification.createdAtDate > b.notification.createdAtDate
                }
                .prefix(maxLimit)
        )
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.setNotificationReadStatus(id: id, isRead: true)
        }

        // Notify iPhone via WatchConnectivity
        sendUpdateToiPhone(type: "wc_watch_mark_read", notificationId: id, readAt: Date())

        // Best-effort remote updates (REST only) via shared handler
        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "MARK_AS_READ", notificationId: id)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "MARK_AS_READ"],
                source: "Watch"
            )
            self?.loadCachedData(); self?.updateBucketCounts()
        }
    }
    
    func markMultipleNotificationsAsReadFromWatch(ids: [String]) {
        guard !ids.isEmpty else { return }

        // Update UI state immediately
        let idSet = Set(ids)
        let previouslyUnread = notifications.filter { idSet.contains($0.notification.id) && !$0.notification.isRead }.count
        if previouslyUnread > 0 {
            unreadCount = max(0, unreadCount - previouslyUnread)
        }
        notifications = notifications.map { item in
            guard idSet.contains(item.notification.id) else { return item }
            let n = item.notification
            if n.isRead { return item }
            let updated = WidgetNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                subtitle: n.subtitle,
                createdAt: n.createdAt,
                isRead: true,
                bucketId: n.bucketId,
                bucketName: n.bucketName,
                bucketColor: n.bucketColor,
                bucketIconUrl: n.bucketIconUrl,
                attachments: n.attachments,
                actions: n.actions
            )
            return NotificationData(notification: updated)
        }

        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(
            notifications
                .sorted { a, b in
                    if a.notification.isRead != b.notification.isRead {
                        return !a.notification.isRead && b.notification.isRead
                    }
                    return a.notification.createdAtDate > b.notification.createdAtDate
                }
                .prefix(maxLimit)
        )
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.setNotificationsReadStatus(ids: ids, isRead: true)
        }

        // Notify iPhone via WatchConnectivity (batch)
        sendBatchUpdateToiPhone(type: "wc_watch_batch_mark_read", notificationIds: ids, readAt: Date())

        // Best-effort remote updates (REST only) via shared handler (batch)
        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdatesBatch(actionType: "MARK_AS_READ", notificationIds: ids)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["count": "\(ids.count)", "type": "MARK_AS_READ"],
                source: "Watch"
            )
            await MainActor.run {
                self?.loadCachedData(); self?.updateBucketCounts()
            }
        }
    }

    /// Execute a notification action from the Watch UI.
    /// WC is NOT used for actions; only REST (WATCH scope) is used.
    func executeNotificationAction(notificationId: String, action: NotificationAction) {
        let actionType = action.type.uppercased()
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Execute action requested", metadata: ["notificationId": notificationId, "type": actionType], source: "Watch")

        func extractMinutes(from action: NotificationAction) -> Int? {
            if let minutes = action.minutes { return minutes }
            if let value = action.value, let minutes = Int(value.trimmingCharacters(in: .whitespacesAndNewlines)) {
                return minutes
            }
            return nil
        }

        switch actionType {
        case "MARK_AS_READ":
            markNotificationAsReadFromWatch(id: notificationId)
            return
        case "MARK_AS_UNREAD":
            markNotificationAsUnreadFromWatch(id: notificationId)
            return
        case "DELETE":
            deleteNotificationFromWatch(id: notificationId)
            return
        case "POSTPONE":
            if let minutes = extractMinutes(from: action) {
                postponeNotificationFromWatch(id: notificationId, minutes: minutes)
                return
            }
            break
        case "SNOOZE":
            if let minutes = extractMinutes(from: action) {
                let bucketId = action.bucketId ?? notifications.first(where: { $0.notification.id == notificationId })?.notification.bucketId
                if let bucketId {
                    snoozeBucketFromWatch(bucketId: bucketId, minutes: minutes)
                    return
                }
            }
            break
        case "WEBHOOK":
            if let webhookId = action.value?.trimmingCharacters(in: .whitespacesAndNewlines), !webhookId.isEmpty {
                executeWebhookFromWatch(webhookId: webhookId)
                return
            }
            break
        case "BACKGROUND_CALL":
            let raw = (action.value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

            // Supported formats:
            // 1) url is provided explicitly (action.url) and action.value is the HTTP method (or empty)
            // 2) action.value contains "METHOD::URL"
            // 3) action.value is a URL (defaults to GET)
            let explicitUrl = action.url?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let explicitUrl, !explicitUrl.isEmpty {
                let method = (raw.isEmpty ? "GET" : raw).uppercased()
                executeBackgroundCallFromWatch(method: method, url: explicitUrl)
                return
            }

            if raw.contains("::") {
                let parts = raw.components(separatedBy: "::")
                if parts.count >= 2 {
                    let method = parts[0].trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    let url = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
                    if !method.isEmpty, !url.isEmpty {
                        executeBackgroundCallFromWatch(method: method, url: url)
                        return
                    }
                }
            }

            if raw.lowercased().hasPrefix("http://") || raw.lowercased().hasPrefix("https://") {
                executeBackgroundCallFromWatch(method: "GET", url: raw)
                return
            }
            break
        default:
            break
        }

        LoggingSystem.shared.log(
            level: "WARN",
            tag: "WatchAction",
            message: "Action not supported or missing required data",
            metadata: ["notificationId": notificationId, "type": actionType],
            source: "Watch"
        )
    }

    private func snoozeBucketFromWatch(bucketId: String, minutes: Int) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Snooze bucket requested", metadata: ["bucketId": bucketId, "minutes": "\(minutes)"], source: "Watch")
        performWatchApiRequest(
            path: "/buckets/\(bucketId)/snooze-minutes",
            method: "POST",
            jsonBody: ["minutes": minutes]
        ) { success in
            LoggingSystem.shared.log(
                level: success ? "INFO" : "WARN",
                tag: "WatchREST",
                message: success ? "Snooze executed via REST" : "Snooze failed via REST",
                metadata: ["bucketId": bucketId, "minutes": "\(minutes)"],
                source: "Watch"
            )
        }
    }

    private func executeWebhookFromWatch(webhookId: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Execute webhook requested", metadata: ["webhookId": webhookId], source: "Watch")
        performWatchApiRequest(path: "/webhooks/\(webhookId)/execute", method: "POST") { success in
            LoggingSystem.shared.log(
                level: success ? "INFO" : "WARN",
                tag: "WatchREST",
                message: success ? "Webhook executed via REST" : "Webhook execution failed via REST",
                metadata: ["webhookId": webhookId],
                source: "Watch"
            )
        }
    }

    private func executeBackgroundCallFromWatch(method: String, url: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Background call requested", metadata: ["method": method, "url": url], source: "Watch")
        guard let target = URL(string: url) else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchAction", message: "Invalid background call URL", metadata: ["url": url], source: "Watch")
            return
        }

        var request = URLRequest(url: target)
        request.httpMethod = method
        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error {
                LoggingSystem.shared.log(level: "WARN", tag: "WatchREST", message: "Background call failed", metadata: ["method": method, "url": url, "error": error.localizedDescription], source: "Watch")
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            if status >= 200 && status < 300 {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchREST", message: "Background call ok", metadata: ["method": method, "url": url, "status": "\(status)"], source: "Watch")
            } else {
                LoggingSystem.shared.log(level: "WARN", tag: "WatchREST", message: "Background call HTTP error", metadata: ["method": method, "url": url, "status": "\(status)"], source: "Watch")
            }
        }.resume()
    }
    
    func markNotificationAsUnreadFromWatch(id: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Mark notification as unread requested", metadata: ["notificationId": id], source: "Watch")

        // Update UI state immediately
        let wasRead = notifications.first(where: { $0.notification.id == id })?.notification.isRead ?? false
        if wasRead {
            unreadCount += 1
        }
        notifications = notifications.map { item in
            guard item.notification.id == id else { return item }
            let n = item.notification
            let updated = WidgetNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                subtitle: n.subtitle,
                createdAt: n.createdAt,
                isRead: false,
                bucketId: n.bucketId,
                bucketName: n.bucketName,
                bucketColor: n.bucketColor,
                bucketIconUrl: n.bucketIconUrl,
                attachments: n.attachments,
                actions: n.actions
            )
            return NotificationData(notification: updated)
        }

        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(
            notifications
                .sorted { a, b in
                    if a.notification.isRead != b.notification.isRead {
                        return !a.notification.isRead && b.notification.isRead
                    }
                    return a.notification.createdAtDate > b.notification.createdAtDate
                }
                .prefix(maxLimit)
        )
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.setNotificationReadStatus(id: id, isRead: false)
        }

        // Notify iPhone via WatchConnectivity
        sendUpdateToiPhone(type: "wc_watch_mark_unread", notificationId: id, readAt: nil)

        // Best-effort remote updates (REST only) via shared handler
        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "MARK_AS_UNREAD", notificationId: id)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "MARK_AS_UNREAD"],
                source: "Watch"
            )
            self?.loadCachedData(); self?.updateBucketCounts()
        }
    }

    private func postponeNotificationFromWatch(id: String, minutes: Int) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Postpone requested", metadata: ["notificationId": id, "minutes": "\(minutes)"], source: "Watch")

        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "POSTPONE", notificationId: id, minutes: minutes)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "POSTPONE", "minutes": "\(minutes)"],
                source: "Watch"
            )
            await MainActor.run {
                self?.loadCachedData(); self?.updateBucketCounts()
            }
        }
    }
    
    func deleteNotificationFromWatch(id: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Delete notification requested", metadata: ["notificationId": id], source: "Watch")

        // Update UI state immediately
        let wasUnread = notifications.first(where: { $0.notification.id == id }).map { !$0.notification.isRead } ?? false
        notifications.removeAll { $0.notification.id == id }
        if wasUnread {
            unreadCount = max(0, unreadCount - 1)
        }
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.deleteNotificationFromCache(id: id)
        }

        // Notify iPhone via WatchConnectivity
        sendUpdateToiPhone(type: "wc_watch_delete_notification", notificationId: id, readAt: nil)

        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "DELETE", notificationId: id)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "DELETE"],
                source: "Watch"
            )
            await MainActor.run {
                self?.loadCachedData(); self?.updateBucketCounts()
                
            }
        }
    }

    /// Manually send Watch logs to iPhone (invoked by LogsView button).
    /// Uses `sendMessage` with batching, therefore requires iPhone to be reachable.
    func sendLogsToiPhone(completion: @escaping (Bool, String?) -> Void) {
        guard let session = wcSession else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchConnectivity", message: "WCSession not available, cannot send logs", source: "Watch")
            completion(false, "WCSession not available")
            return
        }

        // Ensure buffered logs are persisted before reading
        LoggingSystem.shared.flushLogs()

        guard session.isReachable else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchConnectivity", message: "iPhone not reachable, cannot send logs", source: "Watch")
            completion(false, "iPhone not reachable")
            return
        }

        let allLogs = LoggingSystem.shared.readLogs()
        guard !allLogs.isEmpty else {
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "No logs to send", source: "Watch")
            completion(true, nil)
            return
        }

        // Keep payload bounded to avoid WatchConnectivity message limits.
        let maxLogsToSend = 2000
        let logsToSend = Array(allLogs.prefix(maxLogsToSend))

        let logsData: [[String: Any]] = logsToSend.map { entry in
            var dict: [String: Any] = [
                "id": entry.id,
                "level": entry.level,
                "message": entry.message,
                "timestamp": entry.timestamp,
                "source": entry.source
            ]
            if let tag = entry.tag {
                dict["tag"] = tag
            }
            if let metadata = entry.metadata {
                dict["metadata"] = metadata
            }
            return dict
        }

        let batchSize = 50
        let totalBatches = Int(ceil(Double(logsData.count) / Double(batchSize)))
        var currentBatch = 0
        var didComplete = false

        if allLogs.count > maxLogsToSend {
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Trimming logs for transfer", metadata: ["totalLogs": "\(allLogs.count)", "sending": "\(maxLogsToSend)"], source: "Watch")
        }

        LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Sending logs to iPhone", metadata: ["logs": "\(logsData.count)", "batchSize": "\(batchSize)", "totalBatches": "\(totalBatches)"], source: "Watch")

        func finish(_ success: Bool, _ error: String?) {
            guard !didComplete else { return }
            didComplete = true
            completion(success, error)
        }

        func sendNextBatch() {
            if currentBatch >= totalBatches {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Finished sending logs to iPhone", metadata: ["totalBatches": "\(totalBatches)", "logs": "\(logsData.count)"], source: "Watch")
                finish(true, nil)
                return
            }

            let startIndex = currentBatch * batchSize
            let endIndex = min(startIndex + batchSize, logsData.count)
            let batch = Array(logsData[startIndex..<endIndex])

            let message: [String: Any] = [
                "type": "watchLogs",
                "logs": batch,
                "batchIndex": currentBatch,
                "totalBatches": totalBatches,
                "count": batch.count,
                "isLastBatch": currentBatch == totalBatches - 1
            ]

            session.sendMessage(message, replyHandler: { reply in
                if let success = reply["success"] as? Bool, success {
                    currentBatch += 1
                    // Small delay between batches to avoid overwhelming the link
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        sendNextBatch()
                    }
                } else {
                    let errorMsg = reply["error"] as? String ?? "Unknown error"
                    LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Failed to send logs batch", metadata: ["batch": "\(currentBatch + 1)/\(totalBatches)", "error": errorMsg], source: "Watch")
                    finish(false, errorMsg)
                }
            }, errorHandler: { error in
                LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Error sending logs batch", metadata: ["batch": "\(currentBatch + 1)/\(totalBatches)", "error": error.localizedDescription], source: "Watch")
                finish(false, error.localizedDescription)
            })
        }

        sendNextBatch()
    }
    
    // MARK: - WC Sync: Send Updates to iPhone
    
    /// Send notification update to iPhone via WatchConnectivity
    /// Uses sendMessage for real-time if reachable, otherwise transferUserInfo for queued delivery
    private func sendUpdateToiPhone(type: String, notificationId: String, readAt: Date?) {
        guard let session = wcSession else { return }
        
        var message: [String: Any] = [
            "type": type,
            "notificationId": notificationId,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let readAt = readAt {
            message["readAt"] = readAt.timeIntervalSince1970 * 1000 // milliseconds
        }
        
        if session.isReachable {
            // Real-time: sendMessage is instant when iPhone is active
            session.sendMessage(message, replyHandler: { reply in
                if let success = reply["success"] as? Bool, success {
                    LoggingSystem.shared.log(
                        level: "INFO",
                        tag: "WCSync",
                        message: "Update sent to iPhone (real-time)",
                        metadata: ["type": type, "notificationId": notificationId],
                        source: "Watch"
                    )
                } else {
                    let error = reply["error"] as? String ?? "Unknown"
                    LoggingSystem.shared.log(
                        level: "WARN",
                        tag: "WCSync",
                        message: "Update failed on iPhone",
                        metadata: ["type": type, "notificationId": notificationId, "error": error],
                        source: "Watch"
                    )
                }
            }, errorHandler: { [weak self] error in
                LoggingSystem.shared.log(
                    level: "WARN",
                    tag: "WCSync",
                    message: "sendMessage failed, falling back to transferUserInfo",
                    metadata: ["type": type, "error": error.localizedDescription],
                    source: "Watch"
                )
                // Fallback to transferUserInfo
                session.transferUserInfo(message)
            })
        } else {
            // Queued: transferUserInfo for offline delivery
            session.transferUserInfo(message)
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "WCSync",
                message: "Update queued for iPhone (transferUserInfo)",
                metadata: ["type": type, "notificationId": notificationId],
                source: "Watch"
            )
        }
    }
    
    /// Send batch update to iPhone via WatchConnectivity
    private func sendBatchUpdateToiPhone(type: String, notificationIds: [String], readAt: Date?) {
        guard let session = wcSession else { return }
        guard !notificationIds.isEmpty else { return }
        
        var message: [String: Any] = [
            "type": type,
            "notificationIds": notificationIds,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let readAt = readAt {
            message["readAt"] = readAt.timeIntervalSince1970 * 1000
        }
        
        if session.isReachable {
            session.sendMessage(message, replyHandler: { reply in
                LoggingSystem.shared.log(
                    level: "INFO",
                    tag: "WCSync",
                    message: "Batch update sent to iPhone",
                    metadata: ["type": type, "count": notificationIds.count],
                    source: "Watch"
                )
            }, errorHandler: { error in
                LoggingSystem.shared.log(
                    level: "WARN",
                    tag: "WCSync",
                    message: "sendMessage failed, falling back to transferUserInfo",
                    metadata: ["type": type, "error": error.localizedDescription],
                    source: "Watch"
                )
                session.transferUserInfo(message)
            })
        } else {
            session.transferUserInfo(message)
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "WCSync",
                message: "Batch update queued for iPhone",
                metadata: ["type": type, "count": notificationIds.count],
                source: "Watch"
            )
        }
    }
}
