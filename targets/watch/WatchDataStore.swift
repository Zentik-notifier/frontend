import Foundation

/**
 * WatchDataStore - Local JSON cache for Watch data
 * 
 * Stores last 100 notifications, buckets, and stats in a simple JSON file
 * in the shared App Group container. Watch can function completely offline.
 */
class WatchDataStore {
    static let shared = WatchDataStore()
    
    private let maxNotifications = 100
    private let fileName = "watch_cache.json"
    
    // MARK: - Data Models
    
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
    }
    
    struct CachedNotification: Codable, Identifiable {
        let id: String
        let title: String
        let body: String
        let subtitle: String?
        let createdAt: String
        var isRead: Bool
        let bucketId: String
        let bucketName: String?
        let bucketColor: String?
        let bucketIconUrl: String?
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
            let cache = try decoder.decode(WatchCache.self, from: data)
            
            let formatter = DateFormatter()
            formatter.dateStyle = .short
            formatter.timeStyle = .short
            print("⌚ [WatchDataStore] ✅ Loaded cache: \(cache.notifications.count) notifications, \(cache.buckets.count) buckets, last update: \(formatter.string(from: cache.lastUpdate))")
            
            return cache
        } catch {
            print("⌚ [WatchDataStore] ❌ Error loading cache: \(error.localizedDescription)")
            // Delete corrupted cache file
            try? FileManager.default.removeItem(at: filePath)
            print("⌚ [WatchDataStore] 🗑️ Removed corrupted cache file")
            return WatchCache()
        }
    }
    
    // MARK: - Save Cache
    
    func saveCache(_ cache: WatchCache) {
        guard let filePath = getCacheFilePath() else {
            print("⌚ [WatchDataStore] Failed to get file path for saving")
            return
        }
        
        do {
            let encoder = JSONEncoder()
            encoder.dateEncodingStrategy = .iso8601
            let data = try encoder.encode(cache)
            
            try data.write(to: filePath, options: .atomic)
            print("⌚ [WatchDataStore] ✅ Saved cache: \(cache.notifications.count) notifications, \(cache.buckets.count) buckets")
        } catch {
            print("⌚ [WatchDataStore] ❌ Error saving cache: \(error.localizedDescription)")
        }
    }
    
    // MARK: - Update Cache
    
    func updateFromiPhone(
        notifications: [[String: Any]],
        buckets: [[String: Any]],
        unreadCount: Int
    ) {
        var cache = WatchCache()
        cache.lastUpdate = Date()
        cache.unreadCount = unreadCount
        
        // Parse notifications (limit to 100 most recent)
        cache.notifications = notifications.prefix(maxNotifications).compactMap { notifDict -> CachedNotification? in
            guard let id = notifDict["id"] as? String,
                  let title = notifDict["title"] as? String,
                  let body = notifDict["body"] as? String,
                  let bucketId = notifDict["bucketId"] as? String,
                  let isRead = notifDict["isRead"] as? Bool else {
                return nil
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
                bucketIconUrl: notifDict["bucketIconUrl"] as? String
            )
        }
        
        // Parse buckets
        cache.buckets = buckets.compactMap { bucketDict -> CachedBucket? in
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

