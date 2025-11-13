import Foundation
import WatchConnectivity
import WidgetKit

/**
 * iPhone-side WatchConnectivity Manager
 * Handles bidirectional communication with Apple Watch
 * 
 * Responsibilities:
 * 1. Receive messages from Watch (mark as read/unread, delete, full sync requests)
 * 2. Send updates to Watch (notification changes, full data sync)
 * 3. Emit events to React Native bridge for UI updates
 */
class iPhoneWatchConnectivityManager: NSObject, ObservableObject {
    static let shared = iPhoneWatchConnectivityManager()
    
    private let logger = LoggingSystem.shared
    
    private override init() {
        super.init()
        
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
            logger.info(tag: "Init", message: "iPhone WatchConnectivity initialized", source: "iPhoneWatchManager")
        }
    }
    
    // MARK: - Send Messages to Watch
    
    /**
     * Notify Watch that a notification was marked as read
     */
    func notifyWatchNotificationRead(notificationId: String, readAt: String) {
        let message: [String: Any] = [
            "action": "notificationRead",
            "notificationId": notificationId,
            "readAt": readAt
        ]
        
        sendMessageToWatch(message, description: "notification \(notificationId) marked as read")
    }
    
    /**
     * Notify Watch that a notification was marked as unread
     */
    func notifyWatchNotificationUnread(notificationId: String) {
        let message: [String: Any] = [
            "action": "notificationUnread",
            "notificationId": notificationId
        ]
        
        sendMessageToWatch(message, description: "notification \(notificationId) marked as unread")
    }
    
    /**
     * Notify Watch that multiple notifications were marked as read or unread
     * @param notificationIds - IDs of the notifications
     * @param readAt - Timestamp if marking as read, nil if marking as unread
     */
    func notifyWatchNotificationsRead(notificationIds: [String], readAt: String?) {
        let action = readAt != nil ? "notificationsRead" : "notificationsUnread"
        var message: [String: Any] = [
            "action": action,
            "notificationIds": notificationIds
        ]
        
        // Add readAt only if not nil (marking as read)
        if let readAt = readAt {
            message["readAt"] = readAt
        }
        
        let description = readAt != nil 
            ? "\(notificationIds.count) notifications marked as read"
            : "\(notificationIds.count) notifications marked as unread"
        
        sendMessageToWatch(message, description: description)
    }
    
    /**
     * Notify Watch that a notification was deleted
     */
    func notifyWatchNotificationDeleted(notificationId: String) {
        let message: [String: Any] = [
            "action": "notificationDeleted",
            "notificationId": notificationId
        ]
        
        sendMessageToWatch(message, description: "notification \(notificationId) deleted")
    }
    
    /**
     * Notify Watch that a new notification was added (without fragment)
     * Watch will need to fetch the full data via sync
     */
    func notifyWatchNotificationAdded(notificationId: String) {
        let message: [String: Any] = [
            "action": "notificationAdded",
            "notificationId": notificationId
        ]
        
        sendMessageToWatch(message, description: "notification \(notificationId) added (trigger sync)")
    }
    
    /**
     * Notify Watch that a new notification was added with complete fragment
     */
    func notifyWatchNotificationAdded(notificationId: String, fragment: [String: Any]) {
        let message: [String: Any] = [
            "action": "notificationAdded",
            "notificationId": notificationId,
            "fragment": fragment
        ]
        
        sendMessageToWatch(message, description: "notification \(notificationId) added with fragment")
    }
    
    /**
     * DEPRECATED: Generic reload trigger (not used anymore)
     */
    func notifyWatchOfUpdate() {
        let message: [String: Any] = ["action": "reload"]
        sendMessageToWatch(message, description: "reload trigger (deprecated)")
    }
    
    /**
     * DEPRECATED: Incremental sync trigger (not used anymore)
     */
    func notifyWatchToSyncIncremental() {
        let message: [String: Any] = ["action": "syncIncremental"]
        sendMessageToWatch(message, description: "incremental sync trigger (deprecated)")
    }
    
    // MARK: - Full Sync via transferFile
    
    /**
     * Send full sync data directly in message reply (faster than transferFile)
     * Used when Watch is reachable and requests immediate sync
     */
    private func sendFullSyncDataInReply(replyHandler: @escaping ([String: Any]) -> Void) {
        logger.info(tag: "FullSync", message: "Starting full sync in reply", source: "iPhoneWatchManager")
        
        let dispatchGroup = DispatchGroup()
        var allBuckets: [[String: Any]] = []
        var allNotifications: [[String: Any]] = []
        
        // 1. Fetch all buckets from SQLite
        dispatchGroup.enter()
        DatabaseAccess.getAllBuckets(source: "WatchFullSync") { buckets in
            for bucket in buckets {
                allBuckets.append([
                    "id": bucket.id,
                    "name": bucket.name,
                    "color": bucket.color ?? "",
                    "iconUrl": bucket.iconUrl ?? "",
                    "unreadCount": bucket.unreadCount
                ])
            }
            dispatchGroup.leave()
        }
        
        // 2. Fetch all notifications from SQLite (limit to 1000 to avoid message size limit)
        dispatchGroup.enter()
        DatabaseAccess.getRecentNotifications(limit: 1000, unreadOnly: false, source: "WatchFullSync") { notifications in
            for notif in notifications {
                var notifDict: [String: Any] = [
                    "id": notif.id,
                    "title": notif.title,
                    "body": notif.body,
                    "createdAt": notif.createdAt,
                    "isRead": notif.isRead,
                    "bucketId": notif.bucketId
                ]
                
                if let subtitle = notif.subtitle {
                    notifDict["subtitle"] = subtitle
                }
                if let bucketName = notif.bucketName {
                    notifDict["bucketName"] = bucketName
                }
                if let bucketColor = notif.bucketColor {
                    notifDict["bucketColor"] = bucketColor
                }
                if let bucketIconUrl = notif.bucketIconUrl {
                    notifDict["bucketIconUrl"] = bucketIconUrl
                }
                
                // Add attachments (without data to reduce size)
                var attachmentsArray: [[String: Any]] = []
                for attachment in notif.attachments {
                    var attachmentDict: [String: Any] = [
                        "mediaType": attachment.mediaType,
                        "url": attachment.url
                    ]
                    if let name = attachment.name {
                        attachmentDict["name"] = name
                    }
                    attachmentsArray.append(attachmentDict)
                }
                if !attachmentsArray.isEmpty {
                    notifDict["attachments"] = attachmentsArray
                }
                
                allNotifications.append(notifDict)
            }
            dispatchGroup.leave()
        }
        
        // 3. Wait for both fetches to complete
        dispatchGroup.notify(queue: DispatchQueue.global(qos: .userInitiated)) {
            // Calculate unread count
            let unreadCount = allNotifications.filter { ($0["isRead"] as? Bool) == false }.count
            
            self.logger.info(
                tag: "FullSync",
                message: "Sending data in reply",
                metadata: [
                    "buckets": String(allBuckets.count),
                    "notifications": String(allNotifications.count),
                    "unread": String(unreadCount)
                ],
                source: "iPhoneWatchManager"
            )
            
            // Send data directly in reply
            let reply: [String: Any] = [
                "success": true,
                "buckets": allBuckets,
                "notifications": allNotifications,
                "unreadCount": unreadCount
            ]
            
            replyHandler(reply)
            
            self.logger.info(
                tag: "FullSync",
                message: "Reply sent to Watch",
                source: "iPhoneWatchManager"
            )
        }
    }
    
    /**
     * Send full sync data to Watch via updateApplicationContext
     * Exports all notifications and buckets from SQLite and updates application context
     * This method provides immediate delivery and overwrites previous state
     */
    func sendFullSyncToWatch(completion: @escaping (Bool, Int, Int) -> Void) {
        logger.info(tag: "FullSync", message: "Starting full sync to Watch via updateApplicationContext", source: "iPhoneWatchManager")
        
        let dispatchGroup = DispatchGroup()
        var allBuckets: [[String: Any]] = []
        var allNotifications: [[String: Any]] = []
        
        // 1. Fetch all buckets from SQLite
        dispatchGroup.enter()
        DatabaseAccess.getAllBuckets(source: "WatchFullSync") { buckets in
            for bucket in buckets {
                allBuckets.append([
                    "id": bucket.id,
                    "name": bucket.name,
                    "color": bucket.color ?? "",
                    "iconUrl": bucket.iconUrl ?? "",
                    "unreadCount": bucket.unreadCount
                ])
            }
            dispatchGroup.leave()
        }
        
        // 2. Fetch all notifications from SQLite (using high limit to get all)
        dispatchGroup.enter()
        DatabaseAccess.getRecentNotifications(limit: 10000, unreadOnly: false, source: "WatchFullSync") { notifications in
            for notif in notifications {
                var notifDict: [String: Any] = [
                    "id": notif.id,
                    "title": notif.title,
                    "body": notif.body,
                    "createdAt": notif.createdAt,
                    "isRead": notif.isRead,
                    "bucketId": notif.bucketId
                ]
                
                if let subtitle = notif.subtitle {
                    notifDict["subtitle"] = subtitle
                }
                if let bucketName = notif.bucketName {
                    notifDict["bucketName"] = bucketName
                }
                if let bucketColor = notif.bucketColor {
                    notifDict["bucketColor"] = bucketColor
                }
                if let bucketIconUrl = notif.bucketIconUrl {
                    notifDict["bucketIconUrl"] = bucketIconUrl
                }
                
                // Add attachments
                let attachmentsArray = NotificationParser.serializeAttachments(notif.attachments)
                if !attachmentsArray.isEmpty {
                    notifDict["attachments"] = attachmentsArray
                }
                
                // Add actions
                let actionsArray = NotificationParser.serializeActions(notif.actions)
                if !actionsArray.isEmpty {
                    notifDict["actions"] = actionsArray
                }
                
                allNotifications.append(notifDict)
            }
            dispatchGroup.leave()
        }
        
        // 3. Wait for both fetches to complete, then proceed
        dispatchGroup.notify(queue: DispatchQueue.global(qos: .userInitiated)) {
            // Calculate unread count
            let unreadCount = allNotifications.filter { ($0["isRead"] as? Bool) == false }.count
            
            self.logger.info(
                tag: "FullSync",
                message: "Fetched data from SQLite",
                metadata: [
                    "buckets": String(allBuckets.count),
                    "notifications": String(allNotifications.count),
                    "unread": String(unreadCount)
                ],
                source: "iPhoneWatchManager"
            )
            
            // 4. Create JSON payload
            let payload: [String: Any] = [
                "buckets": allBuckets,
                "notifications": allNotifications,
                "unreadCount": unreadCount
            ]
            
            self.logger.info(
                tag: "FullSync",
                message: "Created payload",
                metadata: [
                    "buckets": String(allBuckets.count),
                    "notifications": String(allNotifications.count)
                ],
                source: "iPhoneWatchManager"
            )
            
            // 5. Send via updateApplicationContext (replaces previous state, faster delivery)
            let appContext: [String: Any] = [
                "action": "fullSyncData",
                "buckets": allBuckets,
                "notifications": allNotifications,
                "unreadCount": unreadCount,
                "timestamp": Date().timeIntervalSince1970
            ]
            
            // Print sample of notifications being sent
            print("\n📤 iPhone sending notifications (first 5):")
            for (index, notif) in allNotifications.prefix(5).enumerated() {
                if let notifDict = notif as? [String: Any] {
                    print("  [\(index + 1)] ID: \(notifDict["id"] ?? "unknown")")
                    print("      Title: \(notifDict["title"] ?? "unknown")")
                    print("      ReadAt: \(notifDict["readAt"] ?? "nil")")
                    print("      BucketId: \(notifDict["bucketId"] ?? "nil")")
                }
            }
            let readNotifications = allNotifications.filter { notif in
                if let notifDict = notif as? [String: Any] {
                    return notifDict["readAt"] != nil
                }
                return false
            }
            print("📊 Total notifications being sent: \(allNotifications.count)")
            print("📊 Read notifications: \(readNotifications.count)")
            print("📊 Unread notifications: \(allNotifications.count - readNotifications.count)")
            print("📊 Unread count value: \(unreadCount)\n")
            
            self.logger.info(
                tag: "FullSync",
                message: "Sending data to Watch via updateApplicationContext",
                metadata: [
                    "buckets": String(allBuckets.count),
                    "notifications": String(allNotifications.count)
                ],
                source: "iPhoneWatchManager"
            )
            
            do {
                try WCSession.default.updateApplicationContext(appContext)
                
                self.logger.info(
                    tag: "FullSync",
                    message: "Application context updated successfully",
                    source: "iPhoneWatchManager"
                )
                
                completion(true, allNotifications.count, allBuckets.count)
            } catch {
                self.logger.error(
                    tag: "FullSync",
                    message: "Failed to update application context: \(error.localizedDescription)",
                    source: "iPhoneWatchManager"
                )
                completion(false, 0, 0)
            }
        }
    }
    
    // MARK: - Helper Methods
    
    /**
     * Send message to Watch (with fallback to background transfer)
     */
    private func sendMessageToWatch(_ message: [String: Any], description: String) {
        logger.debug(
            tag: "iPhone→Watch",
            message: "Sending: \(description)",
            metadata: ["action": message["action"] as? String ?? "unknown"],
            source: "iPhoneWatchManager"
        )
        
        guard WCSession.default.activationState == .activated else {
            logger.error(tag: "iPhone→Watch", message: "WCSession not activated", source: "iPhoneWatchManager")
            return
        }
        
        if WCSession.default.isReachable {
            // Watch is reachable, send immediately
            WCSession.default.sendMessage(message, replyHandler: { reply in
                self.logger.debug(
                    tag: "iPhone→Watch",
                    message: "Message sent successfully: \(description)",
                    source: "iPhoneWatchManager"
                )
            }) { error in
                self.logger.error(
                    tag: "iPhone→Watch",
                    message: "Failed to send message, using background transfer: \(error.localizedDescription)",
                    source: "iPhoneWatchManager"
                )
                // Fallback to background transfer
                WCSession.default.transferUserInfo(message)
            }
        } else {
            // Watch not reachable, use background transfer (guaranteed delivery)
            WCSession.default.transferUserInfo(message)
            logger.debug(
                tag: "iPhone→Watch",
                message: "Queued for background transfer: \(description)",
                source: "iPhoneWatchManager"
            )
        }
    }
}

// MARK: - WCSessionDelegate

extension iPhoneWatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            logger.error(tag: "Session", message: "Activation failed: \(error.localizedDescription)", source: "iPhoneWatchManager")
        } else {
            logger.info(
                tag: "Session",
                message: "Session activated",
                metadata: ["state": String(activationState.rawValue)],
                source: "iPhoneWatchManager"
            )
        }
    }
    
    func sessionDidBecomeInactive(_ session: WCSession) {
        logger.info(tag: "Session", message: "Session became inactive", source: "iPhoneWatchManager")
    }
    
    func sessionDidDeactivate(_ session: WCSession) {
        logger.info(tag: "Session", message: "Session deactivated, reactivating...", source: "iPhoneWatchManager")
        session.activate()
    }
    
    // MARK: - Receive Messages from Watch
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        guard let action = message["action"] as? String else {
            logger.error(tag: "Watch→iPhone", message: "Missing action in message", source: "iPhoneWatchManager")
            replyHandler(["error": "Missing action"])
            return
        }
        
        logger.info(
            tag: "Watch→iPhone",
            message: "Received message",
            metadata: ["action": action],
            source: "iPhoneWatchManager"
        )
        
        DispatchQueue.main.async {
            switch action {
            case "requestFullSync":
                // Watch requested full data sync via updateApplicationContext
                self.logger.info(tag: "Watch→iPhone", message: "Watch requested full sync", source: "iPhoneWatchManager")
                
                // Reply immediately to confirm request received
                replyHandler(["success": true, "method": "applicationContext"])
                
                // Start data transfer in background
                self.sendFullSyncToWatch { success, notificationsCount, bucketsCount in
                    if success {
                        self.logger.info(
                            tag: "FullSync",
                            message: "Data transfer completed via messageData",
                            metadata: [
                                "notifications": String(notificationsCount),
                                "buckets": String(bucketsCount)
                            ],
                            source: "iPhoneWatchManager"
                        )
                    } else {
                        self.logger.error(tag: "FullSync", message: "Data transfer failed", source: "iPhoneWatchManager")
                    }
                }
                
                // NOTE: DO NOT emit event to React Native - this would cause concurrent DB access
                // The native sync is complete and React Query will refresh when user opens the app
                
            case "notificationRead":
                // Watch marked notification as read - update SQLite directly
                if let notificationId = message["notificationId"] as? String,
                   let readAt = message["readAt"] as? String {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Watch marked as read - updating SQLite",
                        metadata: ["id": notificationId],
                        source: "iPhoneWatchManager"
                    )
                    
                    // Update SQLite database directly (works even when app is closed)
                    DatabaseAccess.markNotificationAsRead(notificationId: notificationId, source: "WatchAction") { success in
                        if success {
                            self.logger.info(
                                tag: "Watch→iPhone",
                                message: "Successfully marked as read in SQLite",
                                metadata: ["id": notificationId],
                                source: "iPhoneWatchManager"
                            )
                            
                            // Add small delay to ensure database writes are flushed to disk
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                // Reload all widgets to reflect changes
                                WidgetCenter.shared.reloadAllTimelines()
                                self.logger.info(
                                    tag: "Watch→iPhone",
                                    message: "Widgets reloaded after marking as read (with delay for DB sync)",
                                    source: "iPhoneWatchManager"
                                )
                            }
                            
                            // Also emit event to React Native if app is open (for UI update)
                            if let bridge = WatchConnectivityBridge.shared {
                                bridge.emitNotificationRead(notificationId: notificationId, readAt: readAt)
                            }
                        } else {
                            self.logger.error(
                                tag: "Watch→iPhone",
                                message: "Failed to mark as read in SQLite",
                                metadata: ["id": notificationId],
                                source: "iPhoneWatchManager"
                            )
                        }
                    }
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId or readAt"])
                }
                
            case "notificationsRead":
                // Watch marked multiple notifications as read - update SQLite directly (bulk operation)
                if let notificationIds = message["notificationIds"] as? [String],
                   let readAt = message["readAt"] as? String {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Watch marked \(notificationIds.count) notifications as read (bulk) - updating SQLite",
                        metadata: ["count": "\(notificationIds.count)"],
                        source: "iPhoneWatchManager"
                    )
                    
                    // Update SQLite database with single optimized query
                    DatabaseAccess.markMultipleNotificationsAsRead(notificationIds: notificationIds, source: "WatchBulkAction") { success in
                        if success {
                            self.logger.info(
                                tag: "Watch→iPhone",
                                message: "Successfully marked \(notificationIds.count) notifications as read in SQLite (bulk)",
                                metadata: ["count": "\(notificationIds.count)"],
                                source: "iPhoneWatchManager"
                            )
                            
                            // Add small delay to ensure database writes are flushed to disk
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                // Reload all widgets to reflect changes
                                WidgetCenter.shared.reloadAllTimelines()
                                self.logger.info(
                                    tag: "Watch→iPhone",
                                    message: "Widgets reloaded after bulk mark as read (with delay for DB sync)",
                                    source: "iPhoneWatchManager"
                                )
                            }
                            
                            // Emit bulk event to React Native if app is open (for UI update)
                            if let bridge = WatchConnectivityBridge.shared {
                                bridge.emitNotificationsRead(notificationIds: notificationIds, readAt: readAt)
                            }
                        } else {
                            self.logger.error(
                                tag: "Watch→iPhone",
                                message: "Failed to mark notifications as read in SQLite (bulk)",
                                metadata: ["count": "\(notificationIds.count)"],
                                source: "iPhoneWatchManager"
                            )
                        }
                    }
                    
                    replyHandler(["success": true, "count": notificationIds.count])
                } else {
                    replyHandler(["error": "Missing notificationIds or readAt"])
                }
                
            case "notificationUnread":
                // Watch marked notification as unread - update SQLite directly
                if let notificationId = message["notificationId"] as? String {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Watch marked as unread - updating SQLite",
                        metadata: ["id": notificationId],
                        source: "iPhoneWatchManager"
                    )
                    
                    // Update SQLite database directly (works even when app is closed)
                    DatabaseAccess.markNotificationAsUnread(notificationId: notificationId, source: "WatchAction") { success in
                        if success {
                            self.logger.info(
                                tag: "Watch→iPhone",
                                message: "Successfully marked as unread in SQLite",
                                metadata: ["id": notificationId],
                                source: "iPhoneWatchManager"
                            )
                            
                            // Add small delay to ensure database writes are flushed to disk
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                // Reload all widgets to reflect changes
                                WidgetCenter.shared.reloadAllTimelines()
                                self.logger.info(
                                    tag: "Watch→iPhone",
                                    message: "Widgets reloaded after marking as unread (with delay for DB sync)",
                                    source: "iPhoneWatchManager"
                                )
                            }
                            
                            // Also emit event to React Native if app is open (for UI update)
                            if let bridge = WatchConnectivityBridge.shared {
                                bridge.emitNotificationUnread(notificationId: notificationId)
                            }
                        } else {
                            self.logger.error(
                                tag: "Watch→iPhone",
                                message: "Failed to mark as unread in SQLite",
                                metadata: ["id": notificationId],
                                source: "iPhoneWatchManager"
                            )
                        }
                    }
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId"])
                }
                
            case "notificationDeleted":
                // Watch deleted notification - delete from SQLite directly
                if let notificationId = message["notificationId"] as? String {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Watch deleted notification - updating SQLite",
                        metadata: ["id": notificationId],
                        source: "iPhoneWatchManager"
                    )
                    
                    // Delete from SQLite database directly (works even when app is closed)
                    DatabaseAccess.deleteNotification(notificationId: notificationId, source: "WatchAction") { success in
                        if success {
                            self.logger.info(
                                tag: "Watch→iPhone",
                                message: "Successfully deleted from SQLite",
                                metadata: ["id": notificationId],
                                source: "iPhoneWatchManager"
                            )
                            
                            // Add small delay to ensure database writes are flushed to disk
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                // Reload all widgets to reflect changes
                                WidgetCenter.shared.reloadAllTimelines()
                                self.logger.info(
                                    tag: "Watch→iPhone",
                                    message: "Widgets reloaded after deletion (with delay for DB sync)",
                                    source: "iPhoneWatchManager"
                                )
                            }
                            
                            // Also emit event to React Native if app is open (for UI update)
                            if let bridge = WatchConnectivityBridge.shared {
                                bridge.emitNotificationDeleted(notificationId: notificationId)
                            }
                        } else {
                            self.logger.error(
                                tag: "Watch→iPhone",
                                message: "Failed to delete from SQLite",
                                metadata: ["id": notificationId],
                                source: "iPhoneWatchManager"
                            )
                        }
                    }
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId"])
                }
                
            case "watchLogs":
                // Watch sent logs for debugging
                if let logsJson = message["logs"] as? String,
                   let count = message["count"] as? Int {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Received \(count) logs from Watch",
                        source: "iPhoneWatchManager"
                    )
                    // Could save to file or forward to backend
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Invalid logs format"])
                }
                
            case "executeNotificationAction":
                // Watch requested notification action execution
                if let notificationId = message["notificationId"] as? String,
                   let actionData = message["actionData"] as? [String: Any],
                   let actionType = actionData["type"] as? String {
                    
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Executing action '\(actionType)' for notification",
                        metadata: ["id": notificationId, "actionType": actionType],
                        source: "iPhoneWatchManager"
                    )
                    
                    // Reconstruct NotificationAction
                    let action = NotificationAction(
                        type: actionType,
                        label: actionData["label"] as? String ?? "",
                        value: actionData["value"] as? String,
                        id: actionData["id"] as? String,
                        url: actionData["url"] as? String,
                        bucketId: actionData["bucketId"] as? String,
                        minutes: actionData["minutes"] as? Int
                    )
                    
                    // Build userInfo for actions that need it
                    var userInfo: [AnyHashable: Any] = [:]
                    if action.type.uppercased() == "SNOOZE", let bucketId = action.bucketId {
                        userInfo["bucketId"] = bucketId
                    }
                    
                    // Execute action via NotificationActionHandler
                    NotificationActionHandler.executeAction(
                        type: action.type,
                        value: action.value ?? "",
                        notificationId: notificationId,
                        userInfo: userInfo,
                        source: "WatchAction"
                    ) { result in
                        switch result {
                        case .success:
                            self.logger.info(
                                tag: "Watch→iPhone",
                                message: "Action executed successfully",
                                metadata: ["id": notificationId, "actionType": actionType],
                                source: "iPhoneWatchManager"
                            )
                            
                            // Add small delay to ensure database writes are flushed to disk
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                // Reload all widgets after action execution
                                WidgetCenter.shared.reloadAllTimelines()
                                self.logger.info(
                                    tag: "Watch→iPhone",
                                    message: "Widgets reloaded after action execution (with delay for DB sync)",
                                    source: "iPhoneWatchManager"
                                )
                            }
                        case .failure(let error):
                            self.logger.error(
                                tag: "Watch→iPhone",
                                message: "Action execution failed: \(error.localizedDescription)",
                                metadata: ["id": notificationId, "actionType": actionType],
                                source: "iPhoneWatchManager"
                            )
                        }
                    }
                    
                    replyHandler(["success": true])
                } else {
                    replyHandler(["error": "Missing notificationId or actionData"])
                }
                
            default:
                self.logger.error(
                    tag: "Watch→iPhone",
                    message: "Unknown action: \(action)",
                    source: "iPhoneWatchManager"
                )
                replyHandler(["error": "Unknown action"])
            }
        }
    }
    
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        guard let action = userInfo["action"] as? String else {
            logger.error(tag: "Watch→iPhone", message: "Missing action in userInfo", source: "iPhoneWatchManager")
            return
        }
        
        logger.info(
            tag: "Watch→iPhone",
            message: "Received background transfer",
            metadata: ["action": action],
            source: "iPhoneWatchManager"
        )
        
        DispatchQueue.main.async {
            switch action {
            case "requestFullSync":
                // Watch requested full data sync (background)
                self.logger.info(tag: "Watch→iPhone", message: "Watch requested full sync (background)", source: "iPhoneWatchManager")
                
                // Handle sync directly in Swift - works even when app is closed/background
                self.sendFullSyncToWatch { success, notificationsCount, bucketsCount in
                    if success {
                        self.logger.info(
                            tag: "Watch→iPhone",
                            message: "Full sync completed (background)",
                            metadata: [
                                "notifications": String(notificationsCount),
                                "buckets": String(bucketsCount)
                            ],
                            source: "iPhoneWatchManager"
                        )
                    } else {
                        self.logger.error(tag: "Watch→iPhone", message: "Full sync failed (background)", source: "iPhoneWatchManager")
                    }
                }
                
                // NOTE: DO NOT emit event to React Native - this would cause concurrent DB access
                // The native sync is complete and React Query will refresh when user opens the app
                // if let bridge = WatchConnectivityBridge.shared {
                //     bridge.emitRefreshRequest()
                // }
                
            case "notificationRead":
                if let notificationId = userInfo["notificationId"] as? String,
                   let readAt = userInfo["readAt"] as? String {
                    if let bridge = WatchConnectivityBridge.shared {
                        bridge.emitNotificationRead(notificationId: notificationId, readAt: readAt)
                    }
                }
                
            case "notificationsRead":
                // Bulk mark as read (background transfer)
                if let notificationIds = userInfo["notificationIds"] as? [String],
                   let readAt = userInfo["readAt"] as? String {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Received bulk mark as read (\(notificationIds.count) notifications) (background)",
                        source: "iPhoneWatchManager"
                    )
                    
                    // Emit bulk event to React Native if app is open
                    if let bridge = WatchConnectivityBridge.shared {
                        bridge.emitNotificationsRead(notificationIds: notificationIds, readAt: readAt)
                    }
                }
                
            case "notificationUnread":
                if let notificationId = userInfo["notificationId"] as? String {
                    if let bridge = WatchConnectivityBridge.shared {
                        bridge.emitNotificationUnread(notificationId: notificationId)
                    }
                }
                
            case "notificationDeleted":
                if let notificationId = userInfo["notificationId"] as? String {
                    if let bridge = WatchConnectivityBridge.shared {
                        bridge.emitNotificationDeleted(notificationId: notificationId)
                    }
                }
                
            case "watchLogs":
                if let count = userInfo["count"] as? Int {
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Received \(count) logs from Watch (background)",
                        source: "iPhoneWatchManager"
                    )
                }
                
            case "transferMediaToWatch":
                // NSE requested media transfer to Watch (background)
                if let url = userInfo["url"] as? String,
                   let mediaType = userInfo["mediaType"] as? String,
                   let localPath = userInfo["localPath"] as? String {
                    
                    self.logger.info(
                        tag: "NSE→iPhone→Watch",
                        message: "Received media transfer request from NSE",
                        metadata: [
                            "url": url,
                            "mediaType": mediaType,
                            "localPath": localPath
                        ],
                        source: "iPhoneWatchManager"
                    )
                    
                    self.transferMediaFileToWatch(
                        url: url,
                        mediaType: mediaType,
                        localPath: localPath,
                        notificationId: userInfo["notificationId"] as? String
                    )
                }
                
            case "executeNotificationAction":
                // Watch requested notification action execution (background)
                if let notificationId = userInfo["notificationId"] as? String,
                   let actionData = userInfo["actionData"] as? [String: Any],
                   let actionType = actionData["type"] as? String {
                    
                    self.logger.info(
                        tag: "Watch→iPhone",
                        message: "Executing action '\(actionType)' for notification (background)",
                        metadata: ["id": notificationId, "actionType": actionType],
                        source: "iPhoneWatchManager"
                    )
                    
                    // Reconstruct NotificationAction
                    let action = NotificationAction(
                        type: actionType,
                        label: actionData["label"] as? String ?? "",
                        value: actionData["value"] as? String,
                        id: actionData["id"] as? String,
                        url: actionData["url"] as? String,
                        bucketId: actionData["bucketId"] as? String,
                        minutes: actionData["minutes"] as? Int
                    )
                    
                    // Build userInfo for actions that need it
                    var userInfo: [AnyHashable: Any] = [:]
                    if action.type.uppercased() == "SNOOZE", let bucketId = action.bucketId {
                        userInfo["bucketId"] = bucketId
                    }
                    
                    // Execute action via NotificationActionHandler
                    NotificationActionHandler.executeAction(
                        type: action.type,
                        value: action.value ?? "",
                        notificationId: notificationId,
                        userInfo: userInfo,
                        source: "WatchAction"
                    ) { result in
                        switch result {
                        case .success:
                            self.logger.info(
                                tag: "Watch→iPhone",
                                message: "Action executed successfully (background)",
                                metadata: ["id": notificationId, "actionType": actionType],
                                source: "iPhoneWatchManager"
                            )
                            
                            // Add small delay to ensure database writes are flushed to disk
                            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                                // Reload all widgets after action execution
                                WidgetCenter.shared.reloadAllTimelines()
                                self.logger.info(
                                    tag: "Watch→iPhone",
                                    message: "Widgets reloaded after action execution (background, with delay for DB sync)",
                                    source: "iPhoneWatchManager"
                                )
                            }
                        case .failure(let error):
                            self.logger.error(
                                tag: "Watch→iPhone",
                                message: "Action execution failed (background): \(error.localizedDescription)",
                                metadata: ["id": notificationId, "actionType": actionType],
                                source: "iPhoneWatchManager"
                            )
                        }
                    }
                }
                
            default:
                self.logger.error(
                    tag: "Watch→iPhone",
                    message: "Unknown background action: \(action)",
                    source: "iPhoneWatchManager"
                )
            }
        }
    }
    
    // MARK: - File Transfer Delegates
    
    // MARK: - Media Transfer to Watch
    
    /**
     * Transfer media file from iPhone to Watch
     * Called when NSE downloads an attachment and wants to share it with Watch
     */
    func transferMediaFileToWatch(url: String, mediaType: String, localPath: String, notificationId: String?) {
        guard WCSession.isSupported() else {
            logger.error(tag: "iPhone→Watch", message: "WatchConnectivity not supported", source: "iPhoneWatchManager")
            return
        }
        
        let session = WCSession.default
        guard session.isPaired && session.isWatchAppInstalled else {
            logger.error(tag: "iPhone→Watch", message: "Watch not paired or app not installed", source: "iPhoneWatchManager")
            return
        }
        
        let fileURL = URL(fileURLWithPath: localPath)
        guard FileManager.default.fileExists(atPath: fileURL.path) else {
            logger.error(
                tag: "iPhone→Watch",
                message: "Media file not found at path: \(localPath)",
                source: "iPhoneWatchManager"
            )
            return
        }
        
        // Get file size for logging
        var fileSize: Int64 = 0
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: fileURL.path)
            fileSize = (attributes[.size] as? NSNumber)?.int64Value ?? 0
        } catch {
            logger.error(tag: "iPhone→Watch", message: "Failed to get file size: \(error)", source: "iPhoneWatchManager")
        }
        
        // Log to centralized logging system
        logger.info(
            tag: "MEDIA_TRANSFER",
            message: "iPhone sending media to Watch",
            metadata: [
                "event": "iphone_sending_media",
                "url": url,
                "mediaType": mediaType,
                "fileSize": fileSize,
                "localPath": localPath,
                "notificationId": notificationId ?? "",
                "watchPaired": session.isPaired,
                "watchAppInstalled": session.isWatchAppInstalled,
                "sessionActivated": session.activationState == .activated
            ],
            source: "iPhoneWatchManager"
        )
        
        logger.info(
            tag: "iPhone→Watch",
            message: "Transferring media file to Watch",
            metadata: [
                "url": url,
                "mediaType": mediaType,
                "size": "\(fileSize) bytes",
                "notificationId": notificationId ?? "none"
            ],
            source: "iPhoneWatchManager"
        )
        
        // Metadata for the file transfer
        let metadata: [String: Any] = [
            "url": url,
            "mediaType": mediaType,
            "notificationId": notificationId ?? ""
        ]
        
        // Transfer file to Watch
        // WatchConnectivity will handle the transfer even when Watch is asleep
        let transfer = session.transferFile(fileURL, metadata: metadata)
        
        // Log transfer queued to centralized logging system
        logger.info(
            tag: "MEDIA_TRANSFER",
            message: "iPhone transfer queued",
            metadata: [
                "event": "iphone_transfer_queued",
                "url": url,
                "mediaType": mediaType,
                "isTransferring": transfer.isTransferring,
                "progress": transfer.progress.fractionCompleted,
                "notificationId": notificationId ?? ""
            ],
            source: "iPhoneWatchManager"
        )
        
        logger.info(
            tag: "iPhone→Watch",
            message: "Media file transfer queued",
            metadata: [
                "url": url,
                "transferring": String(transfer.isTransferring),
                "progress": String(format: "%.1f%%", transfer.progress.fractionCompleted * 100)
            ],
            source: "iPhoneWatchManager"
        )
    }
}
