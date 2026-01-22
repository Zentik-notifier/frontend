import Foundation

/**
 * WatchDataStore - Local JSON cache for Watch data
 * 
 * Stores all notifications, buckets, and stats in a simple JSON file
 * in the shared App Group container. Watch can function completely offline.
 */
class WatchDataStore {
    static let shared = WatchDataStore()
    
    private let fileName = "watch_cache.json"

    // In-memory cache (single source of truth) + debounced persistence.
    private let cacheQueue = DispatchQueue(label: "com.zentik.watchdatastore.cache", qos: .userInitiated)
    private let persistQueue = DispatchQueue(label: "com.zentik.watchdatastore.persist", qos: .utility)
    private var inMemoryCache: WatchCache
    private var persistWorkItem: DispatchWorkItem?
    // Keep filesystem writes sparse to reduce wear.
    private let persistDebounceInterval: TimeInterval = 5.0
    private let minPersistInterval: TimeInterval = 30.0
    private var lastPersistTimestamp: TimeInterval = 0

    private init() {
        self.inMemoryCache = WatchCache()
        self.inMemoryCache = self.loadCacheFromDisk()
    }
    
    // MARK: - Data Models (Public for WatchConnectivityManager)
    
    struct WatchCache: Codable {
        var notifications: [CachedNotification]
        var buckets: [CachedBucket]
        var unreadCount: Int
        var lastUpdate: Date
        
        init() {
            self.notifications = []
            self.buckets = []
            self.unreadCount = 0
            self.lastUpdate = Date()
        }
        
        init(notifications: [CachedNotification], buckets: [CachedBucket], unreadCount: Int, lastUpdate: Date) {
            self.notifications = notifications
            self.buckets = buckets
            self.unreadCount = unreadCount
            self.lastUpdate = lastUpdate
        }
    }
    
    public struct CachedAttachment: Codable, Equatable {
        let mediaType: String
        let url: String?
        let name: String?
        
        public init(mediaType: String, url: String?, name: String?) {
            self.mediaType = mediaType
            self.url = url
            self.name = name
        }
    }
    
    public struct CachedAction: Codable, Equatable {
        let type: String
        let label: String
        let value: String?
        let id: String?
        let url: String?
        let bucketId: String?
        let minutes: Int?
        
        public init(type: String, label: String, value: String?, id: String?, url: String?, bucketId: String?, minutes: Int?) {
            self.type = type
            self.label = label
            self.value = value
            self.id = id
            self.url = url
            self.bucketId = bucketId
            self.minutes = minutes
        }
    }
    
    public struct CachedNotification: Codable, Identifiable {
        public let id: String
        let title: String
        let body: String
        let subtitle: String?
        let createdAt: String
        var isRead: Bool
        let bucketId: String
        let bucketName: String?
        let bucketColor: String?
        let bucketIconUrl: String?
        let attachments: [CachedAttachment]
        let actions: [CachedAction]
        
        public init(id: String, title: String, body: String, subtitle: String?, createdAt: String, isRead: Bool, bucketId: String, bucketName: String?, bucketColor: String?, bucketIconUrl: String?, attachments: [CachedAttachment], actions: [CachedAction]) {
            self.id = id
            self.title = title
            self.body = body
            self.subtitle = subtitle
            self.createdAt = createdAt
            self.isRead = isRead
            self.bucketId = bucketId
            self.bucketName = bucketName
            self.bucketColor = bucketColor
            self.bucketIconUrl = bucketIconUrl
            self.attachments = attachments
            self.actions = actions
        }
    }
    
    struct CachedBucket: Codable, Identifiable {
        let id: String
        let name: String
        var unreadCount: Int
        let color: String?
        let iconUrl: String?
    }
    
    // MARK: - File Path
    
    private func getCacheFilePath() -> URL? {
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        let appGroupId = "group.\(mainBundleId)"
        
        guard let sharedContainerURL = FileManager.default.containerURL(
            forSecurityApplicationGroupIdentifier: appGroupId
        ) else {
            print("⌚ [WatchDataStore] Failed to get shared container URL")
            return nil
        }
        
        return sharedContainerURL.appendingPathComponent(fileName)
    }
    
    // MARK: - Load Cache
    
    func loadCache() -> WatchCache {
        cacheQueue.sync { inMemoryCache }
    }

    private func loadCacheFromDisk() -> WatchCache {
        guard let filePath = getCacheFilePath() else {
            print("⌚ [WatchDataStore] No file path, returning empty cache")
            return WatchCache()
        }

        guard FileManager.default.fileExists(atPath: filePath.path) else {
            print("⌚ [WatchDataStore] Cache file doesn't exist yet")
            return WatchCache()
        }

        do {
            let data = try Data(contentsOf: filePath)
            let decoder = JSONDecoder()
            decoder.dateDecodingStrategy = .iso8601
            return try decoder.decode(WatchCache.self, from: data)
        } catch {
            print("⌚ [WatchDataStore] ❌ Error loading cache: \(error.localizedDescription)")
            try? FileManager.default.removeItem(at: filePath)
            print("⌚ [WatchDataStore] 🗑️ Removed corrupted cache file")
            return WatchCache()
        }
    }
    
    // MARK: - Save Cache
    
    /**
     * Save cache to disk
     * Completely overwrites the existing cache file
     */
    func saveCache(_ cache: WatchCache) {
        // Update in-memory immediately so callers can see it right away.
        let snapshot: WatchCache = cacheQueue.sync {
            self.inMemoryCache = cache
            return self.inMemoryCache
        }

        schedulePersist(cacheSnapshot: snapshot)
    }

    private func schedulePersist(cacheSnapshot: WatchCache) {
        let (scheduleAfter, itemToSchedule): (TimeInterval, DispatchWorkItem) = cacheQueue.sync {
            self.persistWorkItem?.cancel()

            let now = Date().timeIntervalSince1970
            let earliestByDebounce = now + self.persistDebounceInterval
            let earliestByRateLimit = self.lastPersistTimestamp + self.minPersistInterval
            let scheduledAt = max(earliestByDebounce, earliestByRateLimit)

            let delay = max(0, scheduledAt - now)
            let item = DispatchWorkItem { [weak self] in
                guard let self = self else { return }
                self.writeCacheToDisk(cacheSnapshot)
                self.cacheQueue.sync {
                    self.lastPersistTimestamp = Date().timeIntervalSince1970
                }
            }
            self.persistWorkItem = item
            return (delay, item)
        }

        persistQueue.asyncAfter(deadline: .now() + scheduleAfter, execute: itemToSchedule)
    }

    private func writeCacheToDisk(_ cache: WatchCache) {
        guard let filePath = getCacheFilePath() else {
            print("⌚ [WatchDataStore] Failed to get file path for saving")
            return
        }

        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(cache)
            try data.write(to: filePath, options: .atomic)
        } catch {
            print("⌚ [WatchDataStore] ❌ Error saving cache: \(error.localizedDescription)")
        }
    }

    /// Force any pending debounced write to be persisted immediately.
    func flushPendingWrites() {
        cacheQueue.sync {
            self.persistWorkItem?.cancel()
            self.persistWorkItem = nil
        }
        let snapshot = cacheQueue.sync { self.inMemoryCache }
        persistQueue.sync {
            self.writeCacheToDisk(snapshot)
        }

        cacheQueue.sync {
            self.lastPersistTimestamp = Date().timeIntervalSince1970
        }
    }

    // MARK: - Targeted Updates (record-level)

    func setNotificationReadStatus(id: String, isRead: Bool) {
        var cache = loadCache()

        guard let idx = cache.notifications.firstIndex(where: { $0.id == id }) else {
            return
        }

        let previous = cache.notifications[idx].isRead
        cache.notifications[idx].isRead = isRead

        if previous != isRead {
            if isRead {
                cache.unreadCount = max(0, cache.unreadCount - 1)
            } else {
                cache.unreadCount += 1
            }
        }

        // Recompute bucket unread counts from bounded cache (small N)
        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }

        cache.lastUpdate = Date()
        saveCache(cache)
    }

    func setNotificationsReadStatus(ids: [String], isRead: Bool) {
        guard !ids.isEmpty else { return }
        let idSet = Set(ids)

        var cache = loadCache()
        var delta = 0

        for i in cache.notifications.indices {
            let nId = cache.notifications[i].id
            guard idSet.contains(nId) else { continue }
            let previous = cache.notifications[i].isRead
            cache.notifications[i].isRead = isRead
            if previous != isRead {
                delta += isRead ? -1 : 1
            }
        }

        if delta != 0 {
            if delta < 0 {
                cache.unreadCount = max(0, cache.unreadCount + delta)
            } else {
                cache.unreadCount += delta
            }
        }

        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }

        cache.lastUpdate = Date()
        saveCache(cache)
    }

    func deleteNotificationFromCache(id: String) {
        var cache = loadCache()
        if let idx = cache.notifications.firstIndex(where: { $0.id == id }) {
            let wasUnread = !cache.notifications[idx].isRead
            cache.notifications.remove(at: idx)
            if wasUnread {
                cache.unreadCount = max(0, cache.unreadCount - 1)
            }
        } else {
            return
        }

        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }

        cache.lastUpdate = Date()
        saveCache(cache)
    }
    
    // MARK: - Update Cache

    /// Replace notifications in cache from CloudKit fetch (keeps existing buckets).
    /// Used for watch "top-up" when deletions reduce the list below the display limit.
    func replaceNotificationsFromCloudKit(notifications: [[String: Any]]) {
        var cache = loadCache()

        let iso8601Fractional = ISO8601DateFormatter()
        iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso8601NoFractional = ISO8601DateFormatter()
        iso8601NoFractional.formatOptions = [.withInternetDateTime]

        func parseCreatedAt(_ value: String) -> Date {
            if let d = iso8601Fractional.date(from: value) { return d }
            if let d = iso8601NoFractional.date(from: value) { return d }
            return .distantPast
        }

        cache.notifications = notifications.compactMap { notifDict -> CachedNotification? in
            guard let id = notifDict["id"] as? String,
                  let title = notifDict["title"] as? String,
                  let body = notifDict["body"] as? String,
                  let bucketId = notifDict["bucketId"] as? String,
                  let isRead = notifDict["isRead"] as? Bool else {
                return nil
            }

            var attachments: [CachedAttachment] = []
            if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                attachments = attachmentsArray.compactMap { attachmentDict in
                    guard let mediaType = attachmentDict["mediaType"] as? String else { return nil }
                    return CachedAttachment(
                        mediaType: mediaType,
                        url: attachmentDict["url"] as? String,
                        name: attachmentDict["name"] as? String
                    )
                }
            }

            var actions: [CachedAction] = []
            if let actionsArray = notifDict["actions"] as? [[String: Any]] {
                actions = actionsArray.compactMap { actionDict in
                    guard let type = actionDict["type"] as? String else { return nil }
                    return CachedAction(
                        type: type,
                        label: actionDict["label"] as? String ?? "",
                        value: actionDict["value"] as? String,
                        id: actionDict["id"] as? String,
                        url: actionDict["url"] as? String,
                        bucketId: actionDict["bucketId"] as? String,
                        minutes: actionDict["minutes"] as? Int
                    )
                }
            }

            let bucket = cache.buckets.first(where: { $0.id == bucketId })
            return CachedNotification(
                id: id,
                title: title,
                body: body,
                subtitle: notifDict["subtitle"] as? String,
                createdAt: notifDict["createdAt"] as? String ?? "",
                isRead: isRead,
                bucketId: bucketId,
                bucketName: bucket?.name,
                bucketColor: bucket?.color,
                bucketIconUrl: bucket?.iconUrl,
                attachments: attachments,
                actions: actions
            )
        }

        // Sort unread first, then createdAt desc
        cache.notifications.sort { n1, n2 in
            if n1.isRead != n2.isRead {
                return !n1.isRead && n2.isRead
            }
            return parseCreatedAt(n1.createdAt) > parseCreatedAt(n2.createdAt)
        }

        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        if cache.notifications.count > maxLimit {
            cache.notifications = Array(cache.notifications.prefix(maxLimit))
        }

        cache.unreadCount = cache.notifications.filter { !$0.isRead }.count
        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }

        cache.lastUpdate = Date()
        saveCache(cache)
    }
    
    /**
     * Update cache from iPhone data
     * Completely overwrites existing cache with new data
     */
    func updateFromiPhone(
        notifications: [[String: Any]],
        buckets: [[String: Any]],
        unreadCount: Int
    ) {
        // Create a completely new cache object (not modifying existing)
        var cache = WatchCache()
        cache.lastUpdate = Date()
        cache.unreadCount = unreadCount
        
        // Parse notifications (all notifications, no limit)
        cache.notifications = notifications.compactMap { notifDict -> CachedNotification? in
            guard let id = notifDict["id"] as? String,
                  let title = notifDict["title"] as? String,
                  let body = notifDict["body"] as? String,
                  let bucketId = notifDict["bucketId"] as? String,
                  let isRead = notifDict["isRead"] as? Bool else {
                return nil
            }
            
            // Extract attachments
            var attachments: [CachedAttachment] = []
            if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                attachments = attachmentsArray.compactMap { attachmentDict in
                    guard let mediaType = attachmentDict["mediaType"] as? String else {
                        return nil
                    }
                    let url = attachmentDict["url"] as? String
                    let name = attachmentDict["name"] as? String
                    return CachedAttachment(
                        mediaType: mediaType,
                        url: url,
                        name: name
                    )
                }
            }
            
            // Extract actions
            var actions: [CachedAction] = []
            if let actionsArray = notifDict["actions"] as? [[String: Any]] {
                actions = actionsArray.compactMap { actionDict in
                    guard let type = actionDict["type"] as? String else {
                        return nil
                    }
                    return CachedAction(
                        type: type,
                        label: actionDict["label"] as? String ?? "",
                        value: actionDict["value"] as? String,
                        id: actionDict["id"] as? String,
                        url: actionDict["url"] as? String,
                        bucketId: actionDict["bucketId"] as? String,
                        minutes: actionDict["minutes"] as? Int
                    )
                }
            }
            
            return CachedNotification(
                id: id,
                title: title,
                body: body,
                subtitle: notifDict["subtitle"] as? String,
                createdAt: notifDict["createdAt"] as? String ?? "",
                isRead: isRead,
                bucketId: bucketId,
                bucketName: notifDict["bucketName"] as? String,
                bucketColor: notifDict["bucketColor"] as? String,
                bucketIconUrl: notifDict["bucketIconUrl"] as? String,
                attachments: attachments,
                actions: actions
            )
        }
        
        // Sort notifications: unread first, then by createdAt descending (newest first)
        let iso8601Fractional = ISO8601DateFormatter()
        iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso8601NoFractional = ISO8601DateFormatter()
        iso8601NoFractional.formatOptions = [.withInternetDateTime]

        func parseCreatedAt(_ value: String) -> Date {
            if let d = iso8601Fractional.date(from: value) { return d }
            if let d = iso8601NoFractional.date(from: value) { return d }
            return .distantPast
        }

        cache.notifications.sort { notif1, notif2 in
            if notif1.isRead != notif2.isRead {
                return !notif1.isRead && notif2.isRead
            }
            return parseCreatedAt(notif1.createdAt) > parseCreatedAt(notif2.createdAt)
        }
        
        // Apply maximum notifications limit (keep only the 100 most recent by createdAt)
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        cache.notifications = Array(cache.notifications.prefix(maxLimit))
        
        // Parse buckets
        var parsedBuckets = buckets.compactMap { bucketDict -> CachedBucket? in
            guard let id = bucketDict["id"] as? String,
                  let name = bucketDict["name"] as? String,
                  let unreadCount = bucketDict["unreadCount"] as? Int else {
                return nil
            }
            
            return CachedBucket(
                id: id,
                name: name,
                unreadCount: unreadCount,
                color: bucketDict["color"] as? String,
                iconUrl: bucketDict["iconUrl"] as? String
            )
        }
        
        // Ensure all buckets referenced by notifications are present
        // This prevents buckets from being deleted when they're still in use
        let bucketIdsFromNotifications = Set(cache.notifications.map { $0.bucketId })
        let existingBucketIds = Set(parsedBuckets.map { $0.id })
        let missingBucketIds = bucketIdsFromNotifications.subtracting(existingBucketIds)
        
        // Create placeholder buckets for missing ones
        for bucketId in missingBucketIds {
            let notificationsForBucket = cache.notifications.filter { $0.bucketId == bucketId }
            let firstNotification = notificationsForBucket.first
            
            parsedBuckets.append(CachedBucket(
                id: bucketId,
                name: firstNotification?.bucketName ?? bucketId,
                unreadCount: notificationsForBucket.filter { !$0.isRead }.count,
                color: firstNotification?.bucketColor,
                iconUrl: firstNotification?.bucketIconUrl
            ))
        }
        
        cache.buckets = parsedBuckets
        
        // Save the new cache (COMPLETE OVERWRITE of file)
        saveCache(cache)
    }
    
    // MARK: - Local Operations
    
    func markNotificationAsRead(id: String) {
        var cache = loadCache()
        
        if let index = cache.notifications.firstIndex(where: { $0.id == id }) {
            cache.notifications[index].isRead = true
            
            // Update unread count
            cache.unreadCount = max(0, cache.unreadCount - 1)
            
            // Update bucket unread count
            let bucketId = cache.notifications[index].bucketId
            if let bucketIndex = cache.buckets.firstIndex(where: { $0.id == bucketId }) {
                cache.buckets[bucketIndex].unreadCount = max(0, cache.buckets[bucketIndex].unreadCount - 1)
            }
            
            saveCache(cache)
            print("⌚ [WatchDataStore] ✅ Marked notification as read locally: \(id)")
        }
    }
    
    func deleteNotification(id: String) {
        var cache = loadCache()
        
        if let index = cache.notifications.firstIndex(where: { $0.id == id }) {
            let notification = cache.notifications[index]
            
            // Update unread count if notification was unread
            if !notification.isRead {
                cache.unreadCount = max(0, cache.unreadCount - 1)
                
                // Update bucket unread count
                if let bucketIndex = cache.buckets.firstIndex(where: { $0.id == notification.bucketId }) {
                    cache.buckets[bucketIndex].unreadCount = max(0, cache.buckets[bucketIndex].unreadCount - 1)
                }
            }
            
            // Remove notification
            cache.notifications.remove(at: index)
            
            saveCache(cache)
            print("⌚ [WatchDataStore] ✅ Deleted notification locally: \(id)")
        }
    }
    
    // MARK: - Clear Cache
    
    func clearCache() {
        guard let filePath = getCacheFilePath() else { return }
        
        do {
            try FileManager.default.removeItem(at: filePath)
            print("⌚ [WatchDataStore] ✅ Cache cleared")
        } catch {
            print("⌚ [WatchDataStore] ❌ Error clearing cache: \(error.localizedDescription)")
        }
    }
}

