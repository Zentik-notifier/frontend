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
    
    func notifyWatchOfUpdate() {
        guard WCSession.default.isReachable else {
            print("📱 Watch is not reachable")
            return
        }
        
        print("📱 Sending data to Watch...")
        sendDataToWatch { success in
            if success {
                print("📱 ✅ Data sent to Watch successfully")
            } else {
                print("📱 ❌ Failed to send data to Watch")
            }
        }
    }
    
    private func sendDataToWatch(completion: @escaping (Bool) -> Void) {
        // Get buckets directly from database (not derived from notifications)
        DatabaseAccess.getAllBuckets(source: "iPhone") { buckets in
            // Get notifications
            DatabaseAccess.getRecentNotifications(limit: 100, unreadOnly: false, source: "iPhone") { notifications in
                let notificationsData = notifications.map { notif -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": notif.id,
                        "title": notif.title,
                        "body": notif.body,
                        "bucketId": notif.bucketId,
                        "isRead": notif.isRead,
                        "createdAt": notif.createdAt
                    ]
                    
                    if let subtitle = notif.subtitle, !subtitle.isEmpty {
                        dict["subtitle"] = subtitle
                    }
                    
                    if let bucketName = notif.bucketName, !bucketName.isEmpty {
                        dict["bucketName"] = bucketName
                    }
                    
                    if let bucketColor = notif.bucketColor, !bucketColor.isEmpty {
                        dict["bucketColor"] = bucketColor
                    }
                    
                    if let bucketIconUrl = notif.bucketIconUrl, !bucketIconUrl.isEmpty {
                        dict["bucketIconUrl"] = bucketIconUrl
                    }
                    
                    return dict
                }
                
                // Convert buckets from database to dictionary format
                let bucketsData = buckets.map { bucket -> [String: Any] in
                    var dict: [String: Any] = [
                        "id": bucket.id,
                        "name": bucket.name,
                        "unreadCount": bucket.unreadCount
                    ]
                    
                    if let color = bucket.color, !color.isEmpty {
                        dict["color"] = color
                    }
                    
                    if let iconUrl = bucket.iconUrl, !iconUrl.isEmpty {
                        dict["iconUrl"] = iconUrl
                    }
                    
                    return dict
                }
                
                // Calculate total unread count
                let totalUnreadCount = notifications.filter { !$0.isRead }.count
                
                print("📱 Sending \(notificationsData.count) notifications, \(bucketsData.count) buckets, \(totalUnreadCount) unread")
                
                let message: [String: Any] = [
                    "action": "updateData",
                    "notifications": notificationsData,
                    "buckets": bucketsData,
                    "unreadCount": totalUnreadCount
                ]
                
                WCSession.default.sendMessage(message, replyHandler: { _ in
                    completion(true)
                }, errorHandler: { error in
                    print("📱 ❌ Error sending message: \(error.localizedDescription)")
                    completion(false)
                })
            }
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
        
        if session.isReachable {
            notifyWatchOfUpdate()
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String : Any], replyHandler: @escaping ([String : Any]) -> Void) {
        print("📱 Received message from Watch: \(message)")
        
        guard let action = message["action"] as? String else {
            replyHandler(["error": "Missing action"])
            return
        }
        
        switch action {
        case "requestData":
            print("📱 Watch requested data")
            // Get buckets directly from database (not derived from notifications)
            DatabaseAccess.getAllBuckets(source: "iPhone") { buckets in
                // Get notifications
                DatabaseAccess.getRecentNotifications(limit: 100, unreadOnly: false, source: "iPhone") { notifications in
                    let notificationsData = notifications.map { notif -> [String: Any] in
                        var dict: [String: Any] = [
                            "id": notif.id,
                            "title": notif.title,
                            "body": notif.body,
                            "bucketId": notif.bucketId,
                            "isRead": notif.isRead,
                            "createdAt": notif.createdAt
                        ]
                        
                        if let subtitle = notif.subtitle, !subtitle.isEmpty {
                            dict["subtitle"] = subtitle
                        }
                        
                        if let bucketName = notif.bucketName, !bucketName.isEmpty {
                            dict["bucketName"] = bucketName
                        }
                        
                        if let bucketColor = notif.bucketColor, !bucketColor.isEmpty {
                            dict["bucketColor"] = bucketColor
                        }
                        
                        if let bucketIconUrl = notif.bucketIconUrl, !bucketIconUrl.isEmpty {
                            dict["bucketIconUrl"] = bucketIconUrl
                        }
                        
                        return dict
                    }
                    
                    // Convert buckets from database to dictionary format
                    let bucketsData = buckets.map { bucket -> [String: Any] in
                        var dict: [String: Any] = [
                            "id": bucket.id,
                            "name": bucket.name,
                            "unreadCount": bucket.unreadCount
                        ]
                        
                        if let color = bucket.color, !color.isEmpty {
                            dict["color"] = color
                        }
                        
                        if let iconUrl = bucket.iconUrl, !iconUrl.isEmpty {
                            dict["iconUrl"] = iconUrl
                        }
                        
                        return dict
                    }
                    
                    // Calculate total unread count
                    let totalUnreadCount = notifications.filter { !$0.isRead }.count
                    
                    print("📱 Sending \(notificationsData.count) notifications, \(bucketsData.count) buckets, \(totalUnreadCount) unread")
                    replyHandler([
                        "notifications": notificationsData,
                        "buckets": bucketsData,
                        "unreadCount": totalUnreadCount
                    ])
                }
            }
            
        case "deleteNotification":
            guard let notificationId = message["notificationId"] as? String else {
                replyHandler(["error": "Missing notificationId"])
                return
            }
            
            print("📱 Watch requested delete notification: \(notificationId)")
            DatabaseAccess.deleteNotification(notificationId: notificationId, source: "iPhone") { success in
                replyHandler(["success": success])
                if success {
                    print("📱 ✅ Notification deleted, notifying Watch")
                    self.notifyWatchOfUpdate()
                }
            }
            
        case "markAsRead":
            guard let notificationId = message["notificationId"] as? String else {
                replyHandler(["error": "Missing notificationId"])
                return
            }
            
            print("📱 Watch requested mark as read: \(notificationId)")
            DatabaseAccess.markNotificationAsRead(notificationId: notificationId, source: "iPhone") { success in
                replyHandler(["success": success])
                if success {
                    print("📱 ✅ Notification marked as read, notifying Watch")
                    self.notifyWatchOfUpdate()
                }
            }
            
        default:
            print("📱 ❌ Unknown action: \(action)")
            replyHandler(["error": "Unknown action"])
        }
    }
}

