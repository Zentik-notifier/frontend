import Foundation
#if os(iOS)
import WatchConnectivity

/// WatchSyncManager - Manages Watch sync via WatchConnectivity (WC-only mode)
///
/// This is an alternative to CloudKit sync that uses WatchConnectivity's
/// `transferUserInfo` for reliable FIFO message delivery and `updateApplicationContext`
/// for current state.
///
/// Key characteristics:
/// - `transferUserInfo`: FIFO queue, persisted until delivered, works in background
/// - `updateApplicationContext`: Only latest state kept, always available when Watch wakes
/// - `sendMessage`: Real-time but only when Watch is reachable
///
/// Source of truth: iPhone SQLite database
/// Watch maintains: Local JSON cache (WatchDataStore)
public final class WatchSyncManager: NSObject {
    
    public static let shared = WatchSyncManager()
    
    // MARK: - Configuration
    
    private static let wcSyncEnabledKey = "wc_sync_enabled"
    private static let wcSyncLastTimestampKey = "wc_sync_last_timestamp"
    
    /// WC Sync is disabled by default (CloudKit is default)
    public var isWCSyncEnabled: Bool {
        get {
            let appGroupId = resolveDefaultAppGroupIdentifier()
            if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
                return sharedDefaults.bool(forKey: WatchSyncManager.wcSyncEnabledKey)
            }
            return UserDefaults.standard.bool(forKey: WatchSyncManager.wcSyncEnabledKey)
        }
        set {
            let appGroupId = resolveDefaultAppGroupIdentifier()
            if let sharedDefaults = UserDefaults(suiteName: appGroupId) {
                sharedDefaults.set(newValue, forKey: WatchSyncManager.wcSyncEnabledKey)
                sharedDefaults.synchronize()
            } else {
                UserDefaults.standard.set(newValue, forKey: WatchSyncManager.wcSyncEnabledKey)
                UserDefaults.standard.synchronize()
            }
        }
    }
    
    private var session: WCSession? {
        guard WCSession.isSupported() else { return nil }
        return WCSession.default
    }
    
    private var isSessionReady: Bool {
        guard let session = session else { return false }
        return session.activationState == .activated && session.isPaired
    }
    
    // MARK: - Logging
    
    private func infoLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "INFO", tag: "WCSync", message: message, metadata: metadata, source: "WatchSyncManager")
    }
    
    private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "WARN", tag: "WCSync", message: message, metadata: metadata, source: "WatchSyncManager")
    }
    
    private func errorLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "ERROR", tag: "WCSync", message: message, metadata: metadata, source: "WatchSyncManager")
    }
    
    private func debugLog(_ message: String, metadata: [String: Any]? = nil) {
        // Only log if debug is enabled (reuse CloudKit debug flag)
        guard CloudKitManagerBase.isCloudKitDebugEnabled() else { return }
        LoggingSystem.shared.log(level: "DEBUG", tag: "WCSync", message: message, metadata: metadata, source: "WatchSyncManager")
    }
    
    // MARK: - Initialization
    
    private override init() {
        super.init()
    }
    
    // MARK: - Real-time vs Queued Delivery
    
    /// Send message with real-time priority if Watch is reachable,
    /// otherwise use transferUserInfo for reliable queued delivery
    private func sendToWatch(_ message: [String: Any], realTimePreferred: Bool = true) {
        guard let session = session else { return }
        
        if realTimePreferred && session.isReachable {
            // Real-time: sendMessage is instant when Watch is active
            session.sendMessage(message, replyHandler: nil) { [weak self] error in
                self?.warnLog("sendMessage failed, falling back to transferUserInfo", metadata: ["error": error.localizedDescription])
                // Fallback to transferUserInfo on failure
                session.transferUserInfo(message)
            }
            debugLog("Sent via sendMessage (real-time)", metadata: ["type": message["type"] as? String ?? "?"])
        } else {
            // Queued: transferUserInfo is reliable FIFO queue
            session.transferUserInfo(message)
            debugLog("Sent via transferUserInfo (queued)", metadata: ["type": message["type"] as? String ?? "?"])
        }
    }
    
    // MARK: - Public API: Send Updates to Watch
    
    /// Send a new notification to Watch
    /// Uses real-time sendMessage if reachable, otherwise transferUserInfo
    public func sendNotificationCreated(_ notification: [String: Any]) {
        guard isWCSyncEnabled, isSessionReady else { return }
        
        let message: [String: Any] = [
            "type": "wc_notification_created",
            "notification": notification,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent notification_created", metadata: ["id": notification["id"] as? String ?? "?"])
    }
    
    /// Send notification read status update to Watch
    public func sendNotificationReadStatusUpdated(notificationId: String, readAt: Date?) {
        guard isWCSyncEnabled, isSessionReady else { return }
        
        var message: [String: Any] = [
            "type": "wc_notification_read_updated",
            "notificationId": notificationId,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let readAt = readAt {
            message["readAt"] = readAt.timeIntervalSince1970 * 1000 // milliseconds
        } else {
            message["readAt"] = NSNull()
        }
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent notification_read_updated", metadata: ["id": notificationId, "isRead": readAt != nil])
    }
    
    /// Send batch read status update to Watch
    public func sendNotificationsReadStatusUpdated(notificationIds: [String], readAt: Date?) {
        guard isWCSyncEnabled, isSessionReady else { return }
        guard !notificationIds.isEmpty else { return }
        
        var message: [String: Any] = [
            "type": "wc_notifications_batch_read_updated",
            "notificationIds": notificationIds,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        if let readAt = readAt {
            message["readAt"] = readAt.timeIntervalSince1970 * 1000
        } else {
            message["readAt"] = NSNull()
        }
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent batch_read_updated", metadata: ["count": notificationIds.count, "isRead": readAt != nil])
    }
    
    /// Send notification deleted to Watch
    public func sendNotificationDeleted(notificationId: String) {
        guard isWCSyncEnabled, isSessionReady else { return }
        
        let message: [String: Any] = [
            "type": "wc_notification_deleted",
            "notificationId": notificationId,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent notification_deleted", metadata: ["id": notificationId])
    }
    
    /// Send batch notifications deleted to Watch
    public func sendNotificationsDeleted(notificationIds: [String]) {
        guard isWCSyncEnabled, isSessionReady else { return }
        guard !notificationIds.isEmpty else { return }
        
        let message: [String: Any] = [
            "type": "wc_notifications_batch_deleted",
            "notificationIds": notificationIds,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent batch_deleted", metadata: ["count": notificationIds.count])
    }
    
    /// Send bucket created/updated to Watch
    public func sendBucketUpdated(_ bucket: [String: Any]) {
        guard isWCSyncEnabled, isSessionReady else { return }
        
        let message: [String: Any] = [
            "type": "wc_bucket_updated",
            "bucket": bucket,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent bucket_updated", metadata: ["id": bucket["id"] as? String ?? "?"])
    }
    
    /// Send bucket deleted to Watch
    public func sendBucketDeleted(bucketId: String) {
        guard isWCSyncEnabled, isSessionReady else { return }
        
        let message: [String: Any] = [
            "type": "wc_bucket_deleted",
            "bucketId": bucketId,
            "timestamp": Date().timeIntervalSince1970
        ]
        
        sendToWatch(message, realTimePreferred: true)
        debugLog("Sent bucket_deleted", metadata: ["id": bucketId])
    }
    
    // MARK: - Application Context (Current State)
    
    /// Update the application context with current stats
    /// This is always available when Watch wakes up
    public func updateWatchContext(unreadCount: Int, notificationCount: Int, bucketCount: Int) {
        guard isWCSyncEnabled, isSessionReady else { return }
        
        let context: [String: Any] = [
            "type": "wc_sync_state",
            "unreadCount": unreadCount,
            "notificationCount": notificationCount,
            "bucketCount": bucketCount,
            "lastSyncTimestamp": Date().timeIntervalSince1970
        ]
        
        do {
            try session?.updateApplicationContext(context)
            debugLog("Updated application context", metadata: ["unread": unreadCount, "total": notificationCount])
        } catch {
            warnLog("Failed to update application context", metadata: ["error": error.localizedDescription])
        }
    }
    
    // MARK: - Full Sync
    
    /// Trigger full sync: sends all notifications and buckets to Watch
    /// Use sparingly - for initial sync or recovery
    public func triggerFullSync(completion: @escaping (Bool, Error?) -> Void) {
        guard isWCSyncEnabled else {
            completion(false, NSError(domain: "WatchSyncManager", code: -1, userInfo: [NSLocalizedDescriptionKey: "WC Sync is disabled"]))
            return
        }
        
        guard isSessionReady else {
            completion(false, NSError(domain: "WatchSyncManager", code: -2, userInfo: [NSLocalizedDescriptionKey: "Watch session not ready"]))
            return
        }
        
        infoLog("Starting WC full sync")
        
        let group = DispatchGroup()
        var syncError: Error?
        var notificationCount = 0
        var bucketCount = 0
        
        // First, send a "clear cache" message
        let clearMessage: [String: Any] = [
            "type": "wc_full_sync_start",
            "timestamp": Date().timeIntervalSince1970
        ]
        session?.transferUserInfo(clearMessage)
        
        // Fetch buckets from database
        group.enter()
        DatabaseAccess.getAllBuckets(source: "WatchSyncManager") { buckets in
            bucketCount = buckets.count
            
            // Send buckets in a single batch
            if !buckets.isEmpty {
                let bucketsData: [[String: Any]] = buckets.map { bucket in
                    [
                        "id": bucket.id,
                        "name": bucket.name,
                        "iconUrl": bucket.iconUrl as Any,
                        "color": bucket.color as Any
                    ]
                }
                
                let message: [String: Any] = [
                    "type": "wc_full_sync_buckets",
                    "buckets": bucketsData,
                    "timestamp": Date().timeIntervalSince1970
                ]
                self.session?.transferUserInfo(message)
            }
            group.leave()
        }
        
        // Fetch notifications from database
        group.enter()
        let maxLimit = CloudKitManagerBase.cloudKitNotificationLimit ?? 100
        DatabaseAccess.getRecentNotifications(limit: maxLimit, unreadOnly: false, source: "WatchSyncManager") { notifications in
            notificationCount = notifications.count
            
            // Send notifications in batches of 50 to avoid message size limits
            let batchSize = 50
            let chunks = stride(from: 0, to: notifications.count, by: batchSize).map {
                Array(notifications[$0..<min($0 + batchSize, notifications.count)])
            }
            
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            
            // Fetch readAt timestamps
            let ids = notifications.map { $0.id }
            DatabaseAccess.fetchReadAtTimestamps(notificationIds: ids, source: "WatchSyncManager") { readAtMap in
                for (index, chunk) in chunks.enumerated() {
                    let notificationsData: [[String: Any]] = chunk.map { notif in
                        var dict: [String: Any] = [
                            "id": notif.id,
                            "bucketId": notif.bucketId,
                            "title": notif.title,
                            "body": notif.body,
                            "createdAt": dateFormatter.string(from: notif.createdAtDate)
                        ]
                        
                        if let subtitle = notif.subtitle {
                            dict["subtitle"] = subtitle
                        }
                        
                        // Handle readAt
                        if let readAtStr = readAtMap[notif.id] {
                            if let ms = Double(readAtStr) {
                                dict["readAt"] = ms
                                dict["isRead"] = true
                            } else if let parsed = dateFormatter.date(from: readAtStr) {
                                dict["readAt"] = parsed.timeIntervalSince1970 * 1000
                                dict["isRead"] = true
                            }
                        } else {
                            dict["isRead"] = false
                        }
                        
                        // Serialize attachments
                        let attachmentsDict = NotificationParser.serializeAttachments(notif.attachments)
                        dict["attachments"] = attachmentsDict
                        
                        // Serialize actions
                        let actionsDict = NotificationParser.serializeActions(notif.actions)
                        dict["actions"] = actionsDict
                        
                        return dict
                    }
                    
                    let message: [String: Any] = [
                        "type": "wc_full_sync_notifications",
                        "notifications": notificationsData,
                        "batchIndex": index,
                        "totalBatches": chunks.count,
                        "timestamp": Date().timeIntervalSince1970
                    ]
                    self.session?.transferUserInfo(message)
                }
                group.leave()
            }
        }
        
        group.notify(queue: .main) {
            // Send completion message
            let completeMessage: [String: Any] = [
                "type": "wc_full_sync_complete",
                "notificationCount": notificationCount,
                "bucketCount": bucketCount,
                "timestamp": Date().timeIntervalSince1970
            ]
            self.session?.transferUserInfo(completeMessage)
            
            // Update application context with current stats
            DatabaseAccess.getNotificationStats(source: "WatchSyncManager") { stats in
                self.updateWatchContext(
                    unreadCount: stats.unreadCount,
                    notificationCount: stats.totalCount,
                    bucketCount: bucketCount
                )
            }
            
            self.infoLog("WC full sync completed", metadata: [
                "notifications": notificationCount,
                "buckets": bucketCount
            ])
            
            completion(syncError == nil, syncError)
        }
    }
    
    // MARK: - Retry NSE Notifications
    
    /// Retry sending notifications to Watch that were saved by NSE but not yet confirmed delivered
    /// Uses cursor to track last successfully queued notification
    /// This is analogous to retryNSENotificationsToCloudKit but for WC sync
    public func retryNSENotificationsToWatch(completion: @escaping (Int, Error?) -> Void) {
        guard isWCSyncEnabled else {
            completion(0, nil)
            return
        }
        
        guard isSessionReady else {
            warnLog("Watch session not ready for NSE retry")
            completion(0, nil)
            return
        }
        
        let appGroupId = resolveDefaultAppGroupIdentifier()
        let sharedDefaults = UserDefaults(suiteName: appGroupId)
        let lastSentNotificationId = sharedDefaults?.string(forKey: "lastNSENotificationSentToWC")
        let lastSentTimestamp = sharedDefaults?.double(forKey: "lastNSENotificationSentToWCTimestamp")
        
        let lastSentDate: Date
        if let ts = lastSentTimestamp, ts > 0 {
            lastSentDate = Date(timeIntervalSince1970: ts)
            infoLog("Retrying NSE notifications to Watch (cursor found)", metadata: [
                "lastSentNotificationId": lastSentNotificationId ?? "",
                "lastSentTimestamp": "\(ts)"
            ])
        } else {
            // No cursor - only retry notifications from last 24h
            lastSentDate = Date().addingTimeInterval(-24 * 3600)
            infoLog("No NSE→WC cursor found, checking recent notifications (last 24h)")
        }
        
        // Fetch notifications from database
        DatabaseAccess.getRecentNotifications(limit: 10000, unreadOnly: false, source: "WatchSyncManager") { notifications in
            // Filter to notifications after the cursor
            let notificationsToRetry: [WidgetNotification]
            if let lastId = lastSentNotificationId, lastSentTimestamp ?? 0 > 0 {
                notificationsToRetry = notifications.filter { notif in
                    notif.createdAtDate > lastSentDate || (notif.createdAtDate == lastSentDate && notif.id != lastId)
                }
            } else {
                notificationsToRetry = notifications.filter { notif in notif.createdAtDate > lastSentDate }
            }
            
            guard !notificationsToRetry.isEmpty else {
                self.infoLog("No notifications to retry from NSE→Watch")
                completion(0, nil)
                return
            }
            
            self.infoLog("Found notifications to retry from NSE→Watch", metadata: ["count": "\(notificationsToRetry.count)"])
            
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            
            // Fetch readAt timestamps
            let ids = notificationsToRetry.map { $0.id }
            DatabaseAccess.fetchReadAtTimestamps(notificationIds: ids, source: "WatchSyncManager") { readAtMap in
                // Send notifications in batches of 50
                let batchSize = 50
                let chunks = stride(from: 0, to: notificationsToRetry.count, by: batchSize).map {
                    Array(notificationsToRetry[$0..<min($0 + batchSize, notificationsToRetry.count)])
                }
                
                for (index, chunk) in chunks.enumerated() {
                    let notificationsData: [[String: Any]] = chunk.map { notif in
                        var dict: [String: Any] = [
                            "id": notif.id,
                            "bucketId": notif.bucketId,
                            "title": notif.title,
                            "body": notif.body,
                            "createdAt": dateFormatter.string(from: notif.createdAtDate)
                        ]
                        
                        if let subtitle = notif.subtitle {
                            dict["subtitle"] = subtitle
                        }
                        
                        // Handle readAt
                        if let readAtStr = readAtMap[notif.id] {
                            if let ms = Double(readAtStr) {
                                dict["readAt"] = ms
                                dict["isRead"] = true
                            } else if let parsed = dateFormatter.date(from: readAtStr) {
                                dict["readAt"] = parsed.timeIntervalSince1970 * 1000
                                dict["isRead"] = true
                            }
                        } else {
                            dict["isRead"] = false
                        }
                        
                        // Serialize attachments and actions
                        let attachmentsDict = NotificationParser.serializeAttachments(notif.attachments)
                        dict["attachments"] = attachmentsDict
                        
                        let actionsDict = NotificationParser.serializeActions(notif.actions)
                        dict["actions"] = actionsDict
                        
                        return dict
                    }
                    
                    let message: [String: Any] = [
                        "type": "wc_batch_notifications",
                        "notifications": notificationsData,
                        "batchIndex": index,
                        "totalBatches": chunks.count,
                        "timestamp": Date().timeIntervalSince1970,
                        "source": "NSE_retry"
                    ]
                    self.session?.transferUserInfo(message)
                }
                
                // Update cursor to most recent notification
                if let mostRecent = notificationsToRetry.sorted(by: { $0.createdAtDate > $1.createdAtDate }).first {
                    sharedDefaults?.set(mostRecent.id, forKey: "lastNSENotificationSentToWC")
                    sharedDefaults?.set(mostRecent.createdAtDate.timeIntervalSince1970, forKey: "lastNSENotificationSentToWCTimestamp")
                }
                
                self.infoLog("NSE→Watch retry completed", metadata: ["count": "\(notificationsToRetry.count)"])
                completion(notificationsToRetry.count, nil)
            }
        }
    }
    
    // MARK: - Handle Watch Requests
    
    /// Handle incoming message from Watch (when Watch requests data or sends updates)
    public func handleWatchMessage(_ message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let type = message["type"] as? String else {
            replyHandler(["success": false, "error": "Missing type"])
            return
        }
        
        switch type {
        case "wc_request_full_sync":
            triggerFullSync { success, error in
                replyHandler([
                    "success": success,
                    "error": error?.localizedDescription ?? NSNull()
                ])
            }
            
        case "wc_request_notification":
            // Watch requests a specific notification
            guard let notificationId = message["notificationId"] as? String else {
                replyHandler(["success": false, "error": "Missing notificationId"])
                return
            }
            
            DatabaseAccess.getNotification(id: notificationId, source: "WatchSyncManager") { notification in
                if let notification = notification {
                    var dict: [String: Any] = [
                        "id": notification.id,
                        "bucketId": notification.bucketId,
                        "title": notification.title,
                        "body": notification.body,
                        "createdAt": notification.createdAt,
                        "isRead": notification.isRead
                    ]
                    
                    if let subtitle = notification.subtitle {
                        dict["subtitle"] = subtitle
                    }
                    
                    replyHandler(["success": true, "notification": dict])
                } else {
                    replyHandler(["success": false, "error": "Notification not found"])
                }
            }
            
        // MARK: Watch → iPhone: Notification Updates
            
        case "wc_watch_mark_read":
            // Watch marked notification as read
            guard let notificationId = message["notificationId"] as? String else {
                replyHandler(["success": false, "error": "Missing notificationId"])
                return
            }
            
            let readAtMs = message["readAt"] as? Double
            let readAt: Date? = readAtMs != nil ? Date(timeIntervalSince1970: readAtMs! / 1000) : Date()
            
            infoLog("Watch marked notification as read", metadata: ["id": notificationId])
            
            // Update local SQLite database
            DatabaseAccess.setNotificationReadAt(
                notificationId: notificationId,
                readAtMs: Int64(readAt!.timeIntervalSince1970 * 1000),
                source: "WatchSyncManager"
            ) { success in
                if success {
                    // Also sync to CloudKit (if enabled)
                    PhoneCloudKit.shared.updateNotificationReadStatusInCloudKit(
                        notificationId: notificationId,
                        readAt: readAt
                    ) { _, _ in }
                    
                    // Notify React Native
                    CloudKitSyncBridge.notifyNotificationUpdated(notificationId)
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["success": false, "error": "Failed to update database"])
                }
            }
            
        case "wc_watch_mark_unread":
            // Watch marked notification as unread
            guard let notificationId = message["notificationId"] as? String else {
                replyHandler(["success": false, "error": "Missing notificationId"])
                return
            }
            
            infoLog("Watch marked notification as unread", metadata: ["id": notificationId])
            
            // Update local SQLite database
            DatabaseAccess.setNotificationReadAt(
                notificationId: notificationId,
                readAtMs: nil,
                source: "WatchSyncManager"
            ) { success in
                if success {
                    // Also sync to CloudKit (if enabled)
                    PhoneCloudKit.shared.updateNotificationReadStatusInCloudKit(
                        notificationId: notificationId,
                        readAt: nil
                    ) { _, _ in }
                    
                    // Notify React Native
                    CloudKitSyncBridge.notifyNotificationUpdated(notificationId)
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["success": false, "error": "Failed to update database"])
                }
            }
            
        case "wc_watch_delete_notification":
            // Watch deleted notification
            guard let notificationId = message["notificationId"] as? String else {
                replyHandler(["success": false, "error": "Missing notificationId"])
                return
            }
            
            infoLog("Watch deleted notification", metadata: ["id": notificationId])
            
            // Delete from local SQLite database
            DatabaseAccess.deleteNotifications(notificationIds: [notificationId], source: "WatchSyncManager") { success, _ in
                if success {
                    // Also delete from CloudKit (if enabled)
                    PhoneCloudKit.shared.deleteNotificationFromCloudKit(notificationId: notificationId) { _, _ in }
                    
                    // Notify React Native
                    CloudKitSyncBridge.notifyNotificationDeleted(notificationId)
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["success": false, "error": "Failed to delete from database"])
                }
            }
            
        case "wc_watch_batch_mark_read":
            // Watch marked multiple notifications as read
            guard let notificationIds = message["notificationIds"] as? [String], !notificationIds.isEmpty else {
                replyHandler(["success": false, "error": "Missing or empty notificationIds"])
                return
            }
            
            let readAt = Date()
            let readAtMs = Int64(readAt.timeIntervalSince1970 * 1000)
            
            infoLog("Watch batch marked as read", metadata: ["count": notificationIds.count])
            
            // Build readAtMap for batch update
            var readAtMap: [String: Int64?] = [:]
            for id in notificationIds {
                readAtMap[id] = readAtMs
            }
            
            DatabaseAccess.setNotificationsReadAt(readAtMap: readAtMap, source: "WatchSyncManager") { success, _ in
                if success {
                    // Also sync to CloudKit
                    PhoneCloudKit.shared.updateNotificationsReadStatusInCloudKit(
                        notificationIds: notificationIds,
                        readAt: readAt
                    ) { _, _, _ in }
                    
                    // Notify React Native (single batch event)
                    CloudKitSyncBridge.notifyNotificationsUpdatedBatch(notificationIds)
                    
                    replyHandler(["success": true, "count": notificationIds.count])
                } else {
                    replyHandler(["success": false, "error": "Failed to update database"])
                }
            }
            
        default:
            replyHandler(["success": false, "error": "Unknown type: \(type)"])
        }
    }
}

// MARK: - Helper to resolve app group identifier
private func resolveDefaultAppGroupIdentifier() -> String {
    var bundleId = Bundle.main.bundleIdentifier ?? "com.unknown"
    
    // Strip common suffixes
    let suffixes = [".dev", ".watchkitapp", ".watchkitapp.watchkitextension", ".ShareExtension", ".ZentikNotificationService", ".ZentikNotificationContent"]
    for suffix in suffixes {
        if bundleId.hasSuffix(suffix) {
            bundleId = String(bundleId.dropLast(suffix.count))
        }
    }
    
    return "group.\(bundleId)"
}

#endif
