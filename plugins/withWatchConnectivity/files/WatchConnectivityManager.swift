import Foundation
import WatchConnectivity

class iPhoneWatchConnectivityManager: NSObject, ObservableObject {
    static let shared = iPhoneWatchConnectivityManager()
    
    private override init() {
        super.init()
        
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
            print("📱 WatchConnectivity initialized")
        }
    }
    
    // MARK: - Notification Updates
    
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
     * Notify Watch that multiple notifications were marked as read
     */
    func notifyWatchNotificationsRead(notificationIds: [String], readAt: String) {
        let message: [String: Any] = [
            "action": "notificationsRead",
            "notificationIds": notificationIds,
            "readAt": readAt
        ]
        
        sendMessageToWatch(message, description: "\(notificationIds.count) notifications marked as read")
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
     * Notify Watch that a new notification was added
     */
    func notifyWatchNotificationAdded(notificationId: String) {
        let message: [String: Any] = [
            "action": "notificationAdded",
            "notificationId": notificationId
        ]
        
        sendMessageToWatch(message, description: "notification \(notificationId) added")
    }
    
    /**
     * Generic method to send reload trigger (used for new notifications or full sync)
     */
    func notifyWatchOfUpdate() {
        let message: [String: Any] = ["action": "reload"]
        sendMessageToWatch(message, description: "reload trigger")
    }
    
    /**
     * Notify Watch to perform incremental sync using change token
     * Watch will call fetchIncrementalChanges() with its saved token
     */
    func notifyWatchToSyncIncremental() {
        let message: [String: Any] = ["action": "syncIncremental"]
        sendMessageToWatch(message, description: "incremental sync trigger")
    }
    
    // MARK: - Private Helpers
    
    /**
     * Send message to Watch with fallback to background transfer
     */
    private func sendMessageToWatch(_ message: [String: Any], description: String) {
        guard WCSession.default.isReachable else {
            print("📱 Watch is not reachable, using background transfer for \(description)")
            WCSession.default.transferUserInfo(message)
            return
        }
        
        print("📱 Sending \(description) to Watch...")
        
        WCSession.default.sendMessage(message, replyHandler: { _ in
            print("📱 ✅ Sent \(description) to Watch successfully")
        }) { error in
            print("📱 ⚠️ Failed to send \(description), using background transfer: \(error.localizedDescription)")
            // Fallback: try background transfer
            WCSession.default.transferUserInfo(message)
        }
    }
    
    /// Trigger a reload on Watch when a new notification arrives
    /// Watch will fetch fresh data from CloudKit
    func transferNotification(_ notification: DatabaseAccess.WidgetNotification) {
        // Only send reload trigger - Watch will fetch from CloudKit
        let message: [String: Any] = ["action": "reload"]
        
        // Try immediate message first
        if WCSession.default.isReachable {
            WCSession.default.sendMessage(message, replyHandler: { _ in
                print("📱 ✅ Reload trigger sent to Watch for notification: \(notification.title)")
            }) { error in
                print("📱 ⚠️ Failed to send reload trigger, using background transfer: \(error.localizedDescription)")
                // Fallback: use background transfer
                WCSession.default.transferUserInfo(message)
            }
        } else {
            // Use transferUserInfo for guaranteed delivery (even when Watch is asleep)
            WCSession.default.transferUserInfo(message)
            print("📱 ✅ Queued reload trigger to Watch for notification: \(notification.title)")
        }
    }
}

extension iPhoneWatchConnectivityManager: WCSessionDelegate {
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            print("📱 WCSession activation failed: \(error.localizedDescription)")
        } else {
            print("📱 WCSession activated: \(activationState.rawValue)")
            print("📱 Watch paired: \(session.isPaired)")
            print("📱 Watch app installed: \(session.isWatchAppInstalled)")
            print("📱 Watch reachable: \(session.isReachable)")
        }
    }
    
    func sessionDidBecomeInactive(_ session: WCSession) {
        print("📱 WCSession became inactive")
    }
    
    func sessionDidDeactivate(_ session: WCSession) {
        print("📱 WCSession deactivated")
        WCSession.default.activate()
    }
    
    func sessionReachabilityDidChange(_ session: WCSession) {
        print("📱 Watch reachability changed: \(session.isReachable)")
        
        // Don't force updates to Watch - let Watch manage its own data fetching
        // Watch will fetch from CloudKit when app opens
        // Watch will request iOS refresh only when user explicitly taps refresh button
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("📱 ========== MESSAGE RECEIVED FROM WATCH ==========")
        print("📱 Message: \(message)")
        print("📱 Session state - isReachable: \(session.isReachable), isPaired: \(session.isPaired), isWatchAppInstalled: \(session.isWatchAppInstalled)")
        
        guard let action = message["action"] as? String else {
            print("📱 ❌ Missing action in message")
            replyHandler(["error": "Missing action"])
            return
        }
        
        print("📱 Action received: \(action)")
        
        switch action {
        case "notificationRead":
            // Watch marked notification as read
            if let notificationId = message["notificationId"] as? String,
               let readAt = message["readAt"] as? String {
                print("📱 ✅ Watch marked notification \(notificationId) as read at \(readAt)")
                
                // Notify React Native to update backend
                if WatchConnectivityBridge.shared != nil {
                    print("📱 Calling WatchConnectivityBridge.shared.emitNotificationRead...")
                    WatchConnectivityBridge.shared?.emitNotificationRead(notificationId: notificationId, readAt: readAt)
                    print("📱 ✅ Event emitted to React Native")
                } else {
                    print("📱 ❌ WatchConnectivityBridge.shared is nil!")
                }
                
                replyHandler(["success": true])
            } else {
                print("📱 ❌ Missing notificationId or readAt")
                replyHandler(["error": "Missing notificationId or readAt"])
            }
            
        case "notificationUnread":
            // Watch marked notification as unread
            if let notificationId = message["notificationId"] as? String {
                print("📱 Watch marked notification \(notificationId) as unread")
                
                // Notify React Native to update backend
                WatchConnectivityBridge.shared?.emitNotificationUnread(notificationId: notificationId)
                
                replyHandler(["success": true])
            } else {
                replyHandler(["error": "Missing notificationId"])
            }
            
        case "notificationDeleted":
            // Watch deleted notification - notify React Native to delete from backend
            if let notificationId = message["notificationId"] as? String {
                print("📱 Watch deleted notification \(notificationId)")
                
                // Notify React Native to delete from backend via GraphQL
                WatchConnectivityBridge.shared?.emitNotificationDeleted(notificationId: notificationId)
                
                replyHandler(["success": true])
            } else {
                replyHandler(["error": "Missing notificationId"])
            }
            
        case "requestData":
            // Watch is requesting data - but now it should fetch from CloudKit
            // We can still respond with a reload trigger for backward compatibility
            print("📱 Watch requested data - responding with reload trigger")
            replyHandler(["action": "reload", "message": "Please fetch from CloudKit"])
        
        case "refresh":
            // Watch is requesting a full refresh - trigger iOS to sync with backend DB
            print("📱 Watch requested full refresh - triggering iOS sync with backend")
            
            // Emit refresh event to React Native to trigger full sync
            WatchConnectivityBridge.shared?.emitRefreshRequest()
            
            replyHandler(["success": true, "message": "iOS sync triggered"])
        
        case "watchLogs":
            // Watch is sending logs for debugging
            if let logsString = message["logs"] as? String,
               let count = message["count"] as? Int {
                let autoSent = message["autoSent"] as? Bool ?? false
                let logType = autoSent ? "auto-sent" : "requested"
                
                print("📱 📥 Received \(count) \(logType) logs from Watch")
                
                // Parse and save logs to iOS LoggingSystem
                if let logsData = logsString.data(using: .utf8),
                   let watchLogs = try? JSONDecoder().decode([LoggingSystem.LogEntry].self, from: logsData) {
                    // Write each log entry to iOS logging system with "Watch-Forward" source
                    for log in watchLogs {
                        LoggingSystem.shared.log(
                            level: log.level,
                            tag: log.tag,
                            message: "[Watch] \(log.message)",
                            metadata: log.metadata,
                            source: "Watch-Forward"
                        )
                    }
                    print("📱 ✅ Forwarded \(watchLogs.count) Watch logs to iOS logging system")
                    replyHandler(["success": true, "logsReceived": watchLogs.count])
                } else {
                    print("📱 ❌ Failed to decode Watch logs")
                    replyHandler(["error": "Failed to decode logs"])
                }
            } else {
                replyHandler(["error": "Missing logs or count"])
            }
            
        default:
            print("📱 ❌ Unknown action: \(action)")
            replyHandler(["error": "Unknown action"])
        }
    }
    
    func session(_ session: WCSession, didReceiveUserInfo userInfo: [String : Any] = [:]) {
        print("📱 Received background transfer from Watch: \(userInfo)")
        
        guard let action = userInfo["action"] as? String else {
            print("📱 ⚠️ No action in userInfo")
            return
        }
        
        switch action {
        case "notificationRead":
            if let notificationId = userInfo["notificationId"] as? String,
               let readAt = userInfo["readAt"] as? String {
                print("📱 Watch marked notification \(notificationId) as read (background)")
                
                // 1. Update local SQLite immediately (works even if React Native is not active)
                DatabaseAccess.markNotificationAsRead(notificationId: notificationId, source: "WatchConnectivity") { success in
                    if success {
                        print("📱 ✅ SQLite updated for notification read (background)")
                    } else {
                        print("📱 ⚠️ SQLite update failed for notification read (background)")
                    }
                }
                
                // 2. Update CloudKit immediately (works in background)
                CloudKitAccess.markNotificationAsRead(id: notificationId) { result in
                    switch result {
                    case .success:
                        print("📱 ✅ CloudKit updated for notification read (background)")
                    case .failure(let error):
                        print("📱 ⚠️ CloudKit update failed for notification read (background): \(error)")
                    }
                }
                
                // 3. Notify React Native to update backend (only if React Native is active)
                WatchConnectivityBridge.shared?.emitNotificationRead(notificationId: notificationId, readAt: readAt)
            }
            
        case "notificationUnread":
            if let notificationId = userInfo["notificationId"] as? String {
                print("📱 Watch marked notification \(notificationId) as unread (background)")
                
                // 1. Update local SQLite immediately
                DatabaseAccess.markNotificationAsUnread(notificationId: notificationId, source: "WatchConnectivity") { success in
                    if success {
                        print("📱 ✅ SQLite updated for notification unread (background)")
                    } else {
                        print("📱 ⚠️ SQLite update failed for notification unread (background)")
                    }
                }
                
                // 2. Update CloudKit immediately
                CloudKitAccess.markNotificationAsUnread(id: notificationId) { result in
                    switch result {
                    case .success:
                        print("📱 ✅ CloudKit updated for notification unread (background)")
                    case .failure(let error):
                        print("📱 ⚠️ CloudKit update failed for notification unread (background): \(error)")
                    }
                }
                
                // 3. Notify React Native to update backend (only if React Native is active)
                WatchConnectivityBridge.shared?.emitNotificationUnread(notificationId: notificationId)
            }
            
        case "notificationDeleted":
            if let notificationId = userInfo["notificationId"] as? String {
                print("📱 Watch deleted notification \(notificationId) (background)")
                
                // 1. Delete from local SQLite immediately
                DatabaseAccess.deleteNotification(notificationId: notificationId, source: "WatchConnectivity") { success in
                    if success {
                        print("📱 ✅ SQLite updated for notification deletion (background)")
                    } else {
                        print("📱 ⚠️ SQLite update failed for notification deletion (background)")
                    }
                }
                
                // 2. Delete from CloudKit immediately
                CloudKitAccess.deleteNotification(id: notificationId) { result in
                    switch result {
                    case .success:
                        print("📱 ✅ CloudKit updated for notification deletion (background)")
                    case .failure(let error):
                        print("📱 ⚠️ CloudKit update failed for notification deletion (background): \(error)")
                    }
                }
                
                // 3. Notify React Native to delete from backend (only if React Native is active)
                WatchConnectivityBridge.shared?.emitNotificationDeleted(notificationId: notificationId)
            }
            
        case "refresh":
            // Watch is requesting a full refresh (background) - trigger iOS to sync with backend DB
            print("📱 Watch requested full refresh (background) - triggering iOS sync with backend")
            
            // Emit refresh event to React Native to trigger full sync
            WatchConnectivityBridge.shared?.emitRefreshRequest()
            
        case "watchLogs":
            // Watch is sending logs via background transfer (auto-sent)
            if let logsString = userInfo["logs"] as? String,
               let count = userInfo["count"] as? Int {
                let autoSent = userInfo["autoSent"] as? Bool ?? false
                let logType = autoSent ? "auto-sent" : "requested"
                
                print("📱 📥 Received \(count) \(logType) logs from Watch (background transfer)")
                
                // Parse and save logs to iOS LoggingSystem
                if let logsData = logsString.data(using: .utf8),
                   let watchLogs = try? JSONDecoder().decode([LoggingSystem.LogEntry].self, from: logsData) {
                    // Write each log entry to iOS logging system with "Watch-Forward" source
                    for log in watchLogs {
                        LoggingSystem.shared.log(
                            level: log.level,
                            tag: log.tag,
                            message: "[Watch] \(log.message)",
                            metadata: log.metadata,
                            source: "Watch-Forward"
                        )
                    }
                    print("📱 ✅ Forwarded \(watchLogs.count) Watch logs to iOS logging system (background)")
                } else {
                    print("📱 ❌ Failed to decode Watch logs from background transfer")
                }
            }
            
        default:
            print("📱 ⚠️ Unknown action: \(action)")
        }
    }
}

// Typealias for backwards compatibility
typealias WatchConnectivityManager = iPhoneWatchConnectivityManager

