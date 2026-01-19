import Foundation
import CloudKit

/**
 * WatchConnectivityManager - Placeholder replaced by CloudKitManager
 * 
 * This is a minimal stub that maintains the interface used by content.swift
 * but uses CloudKitManager internally for data synchronization.
 * 
 * TODO: Implement CloudKit fetch methods to replace WatchConnectivity
 */
class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    @Published var lastUpdate: Date?
    @Published var isWaitingForResponse: Bool = false
    @Published var isSyncing: Bool = false
    
    private let dataStore = WatchDataStore.shared
    
    private override init() {
        super.init()
        loadCachedData()
        
        // Initialize CloudKit schema and subscriptions
        CloudKitManager.shared.initializeSchemaIfNeeded { success, error in
            if success {
                CloudKitManager.shared.setupSubscriptions { success, error in
                    if let error = error {
                        LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to setup subscriptions", metadata: ["error": error.localizedDescription], source: "Watch")
                    }
                }
            }
        }
        
        // Listen for CloudKit data updates (from remote notifications)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCloudKitDataUpdate),
            name: NSNotification.Name("CloudKitDataUpdated"),
            object: nil
        )
        
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
        
        // Initial incremental sync on app open (to catch up on any missed updates)
        // After this, we rely on CloudKit remote notifications via subscriptions
        syncFromCloudKitIncremental()
    }
    
    @objc private func appDidBecomeActive() {
        // Perform incremental sync when app becomes active (to catch up on missed updates)
        // CloudKit subscriptions with shouldSendContentAvailable should work in foreground,
        // but we do a one-time sync to ensure we're up to date
        syncFromCloudKitIncremental()
    }
    
    @objc private func appWillResignActive() {
        // No polling to stop - we rely on CloudKit subscriptions
    }
    
    private func syncFromCloudKitIncremental() {
        DispatchQueue.main.async { [weak self] in
            self?.isSyncing = true
        }
        
        CloudKitManager.shared.syncFromCloudKitIncremental(fullSync: false) { count, error in
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.isSyncing = false
                
                if let error = error {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Incremental sync failed", metadata: ["error": error.localizedDescription], source: "Watch")
                } else {
                    if count > 0 {
                        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Incremental sync completed", metadata: ["updatedCount": "\(count)"], source: "Watch")
                        // Reload cache and update UI
                        self.loadCachedData()
                        self.updateBucketCounts()
                    }
                }
            }
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func handleCloudKitDataUpdate() {
        // Ensure UI updates happen on main thread
        DispatchQueue.main.async { [weak self] in
            self?.loadCachedData()
            self?.updateBucketCounts()
        }
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
        
        // Sort notifications: unread first, then by createdAt descending (newest first)
        notifications = mappedNotifications.sorted { notif1, notif2 in
            // Unread notifications come first
            if notif1.notification.isRead != notif2.notification.isRead {
                return !notif1.notification.isRead && notif2.notification.isRead
            }
            // Then sort by createdAt descending (newest first)
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date1 = dateFormatter.date(from: notif1.notification.createdAt),
               let date2 = dateFormatter.date(from: notif2.notification.createdAt) {
                return date1 > date2
            }
            return false
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
    
    func fetchDataFromCloudKit() {
        DispatchQueue.main.async {
            self.isWaitingForResponse = true
            self.isConnected = true
        }
        
        let group = DispatchGroup()
        var fetchedNotifications: [[String: Any]] = []
        var fetchedBuckets: [[String: Any]] = []
        var fetchError: Error?
        
        // Fetch notifications
        group.enter()
        CloudKitManager.shared.fetchAllNotificationsFromCloudKit { notifications, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching notifications from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
                fetchError = error
                    } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched notifications from CloudKit", metadata: ["count": "\(notifications.count)"], source: "Watch")
                fetchedNotifications = notifications
            }
            group.leave()
        }
        
        // Fetch buckets
        group.enter()
        CloudKitManager.shared.fetchAllBucketsFromCloudKit { buckets, error in
        if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching buckets from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
                fetchError = error
        } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched buckets from CloudKit", metadata: ["count": "\(buckets.count)"], source: "Watch")
                fetchedBuckets = buckets
            }
            group.leave()
        }
        
        group.notify(queue: .main) {
            if let error = fetchError {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching data from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
                self.isWaitingForResponse = false
            return
        }
        
            // Create a lookup map for buckets by ID
            var bucketMap: [String: [String: Any]] = [:]
            for bucket in fetchedBuckets {
                if let bucketId = bucket["id"] as? String {
                    bucketMap[bucketId] = bucket
                }
            }
            
            // Enrich notifications with bucket information
            let enrichedNotifications = fetchedNotifications.map { notification -> [String: Any] in
                var enriched = notification
                if let bucketId = notification["bucketId"] as? String,
                   let bucket = bucketMap[bucketId] {
                    // Add bucket information to notification
                    enriched["bucketName"] = bucket["name"] as? String
                    enriched["bucketColor"] = bucket["color"] as? String
                    enriched["bucketIconUrl"] = bucket["iconUrl"] as? String
                }
                return enriched
            }
            
            // Calculate unread count
            let unreadCount = enrichedNotifications.filter { ($0["isRead"] as? Bool) == false }.count
            
            // Update WatchDataStore
            self.dataStore.updateFromiPhone(
                notifications: enrichedNotifications,
                buckets: fetchedBuckets,
                        unreadCount: unreadCount
                    )
            
            // Reload from cache and update UI (already on main thread from group.notify)
            self.loadCachedData()
            self.updateBucketCounts()
            self.lastUpdate = Date()
            self.isWaitingForResponse = false
                            
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Data fetched and cached successfully", metadata: ["notifications": "\(enrichedNotifications.count)", "buckets": "\(fetchedBuckets.count)", "unread": "\(unreadCount)"], source: "Watch")
        }
    }
    
    private func updateBucketCounts() {
        // Calculate notification counts per bucket
        var bucketCounts: [String: (total: Int, unread: Int)] = [:]
        var bucketLastDates: [String: Date] = [:]
        
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
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
    
    func requestFullRefresh() {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Full refresh requested", source: "Watch")
        // Perform full sync (ignoring change token)
        CloudKitManager.shared.syncFromCloudKitIncremental(fullSync: true) { count, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Full sync failed", metadata: ["error": error.localizedDescription], source: "Watch")
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Full sync completed", metadata: ["updatedCount": "\(count)"], source: "Watch")
                // Reload cache and update UI on main thread
                DispatchQueue.main.async { [weak self] in
                    self?.loadCachedData()
                    self?.updateBucketCounts()
                }
            }
        }
    }
    
    func markNotificationAsReadFromWatch(id: String) {
        // Update local cache immediately for instant UI feedback
        if let index = notifications.firstIndex(where: { $0.notification.id == id }) {
            let cached = dataStore.loadCache()
            if let cacheIndex = cached.notifications.firstIndex(where: { $0.id == id }) {
                var updatedCache = cached
                updatedCache.notifications[cacheIndex].isRead = true
                if updatedCache.notifications[cacheIndex].isRead && !notifications[index].notification.isRead {
                    updatedCache.unreadCount = max(0, updatedCache.unreadCount - 1)
                }
                dataStore.saveCache(updatedCache)
                DispatchQueue.main.async { [weak self] in
                    self?.loadCachedData()
                    self?.updateBucketCounts()
                }
            }
        }
        
        // Update CloudKit using shared method
        CloudKitManager.shared.updateNotificationReadStatusInCloudKit(notificationId: id, readAt: Date()) { success, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to update notification read status in CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
            }
        }
    }
    
    func markMultipleNotificationsAsReadFromWatch(ids: [String]) {
        guard !ids.isEmpty else { return }
        
        // Update local cache immediately
        let cached = dataStore.loadCache()
        var updatedCache = cached
        var unreadReduction = 0
        
        for id in ids {
            if let cacheIndex = updatedCache.notifications.firstIndex(where: { $0.id == id }),
               !updatedCache.notifications[cacheIndex].isRead {
                updatedCache.notifications[cacheIndex].isRead = true
                unreadReduction += 1
            }
        }
        
        updatedCache.unreadCount = max(0, updatedCache.unreadCount - unreadReduction)
        dataStore.saveCache(updatedCache)
        DispatchQueue.main.async { [weak self] in
            self?.loadCachedData()
            self?.updateBucketCounts()
        }
        
        // Update CloudKit using shared batch method
        CloudKitManager.shared.updateNotificationsReadStatusInCloudKit(notificationIds: ids, readAt: Date()) { success, count, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to update notifications read status", metadata: ["count": "\(count)", "error": error.localizedDescription], source: "Watch")
            }
        }
    }
    
    func markNotificationAsUnreadFromWatch(id: String) {
        // Update local cache immediately
        if let index = notifications.firstIndex(where: { $0.notification.id == id }) {
            let cached = dataStore.loadCache()
            if let cacheIndex = cached.notifications.firstIndex(where: { $0.id == id }) {
                var updatedCache = cached
                updatedCache.notifications[cacheIndex].isRead = false
                if !updatedCache.notifications[cacheIndex].isRead && notifications[index].notification.isRead {
                    updatedCache.unreadCount += 1
                }
                dataStore.saveCache(updatedCache)
                DispatchQueue.main.async { [weak self] in
                    self?.loadCachedData()
                    self?.updateBucketCounts()
                }
            }
        }
        
        // Update CloudKit using shared method
        CloudKitManager.shared.updateNotificationReadStatusInCloudKit(notificationId: id, readAt: nil) { success, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to update notification unread status in CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
            }
        }
    }
    
    func deleteNotificationFromWatch(id: String) {
        // Update local cache immediately
        let cached = dataStore.loadCache()
        var updatedCache = cached
        
        if let cacheIndex = updatedCache.notifications.firstIndex(where: { $0.id == id }) {
            let wasUnread = !updatedCache.notifications[cacheIndex].isRead
            updatedCache.notifications.remove(at: cacheIndex)
            if wasUnread {
                updatedCache.unreadCount = max(0, updatedCache.unreadCount - 1)
            }
            dataStore.saveCache(updatedCache)
            DispatchQueue.main.async { [weak self] in
                self?.loadCachedData()
                self?.updateBucketCounts()
            }
        }
        
        // Delete from CloudKit using shared method
        CloudKitManager.shared.deleteNotificationFromCloudKit(notificationId: id) { success, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Failed to delete notification from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
            }
        }
    }
    
    func executeNotificationAction(notificationId: String, action: NotificationAction) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Execute notification action", metadata: ["notificationId": notificationId, "action": action.type], source: "Watch")
        
        // For actions that modify notification state, handle locally
        if action.type == NotificationActionType.markAsRead.rawValue {
            markNotificationAsReadFromWatch(id: notificationId)
        } else if action.type == NotificationActionType.delete.rawValue {
            deleteNotificationFromWatch(id: notificationId)
                        } else {
            // Other actions (webhook, snooze, etc.) need to be executed via backend
            // For now, just log - backend execution will be handled by iPhone sync
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Action requires backend execution", metadata: ["action": action.type], source: "Watch")
        }
    }
    
    func sendLogsToiPhone() {
        // Logs will be handled via CloudKit in the future
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Logs sync requested", source: "Watch")
    }
}
