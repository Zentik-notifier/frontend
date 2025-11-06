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
        // Limit to 30 most recent notifications to reduce payload size
        DatabaseAccess.getRecentNotifications(limit: 30, unreadOnly: false, source: "iPhone") { notifications in
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
            
            // Build buckets info
            var bucketsDict: [String: [String: Any]] = [:]
            var totalUnreadCount = 0
            
            for notif in notifications {
                if !notif.isRead {
                    totalUnreadCount += 1
                }
                
                if bucketsDict[notif.bucketId] == nil {
                    var bucketData: [String: Any] = [
                        "id": notif.bucketId,
                        "name": notif.bucketName ?? notif.bucketId,
                        "unreadCount": notif.isRead ? 0 : 1
                    ]
                    
                    if let color = notif.bucketColor, !color.isEmpty {
                        bucketData["color"] = color
                    }
                    
                    if let iconUrl = notif.bucketIconUrl, !iconUrl.isEmpty {
                        bucketData["iconUrl"] = iconUrl
                    }
                    
                    bucketsDict[notif.bucketId] = bucketData
                } else if !notif.isRead {
                    if var bucket = bucketsDict[notif.bucketId] {
                        bucket["unreadCount"] = (bucket["unreadCount"] as? Int ?? 0) + 1
                        bucketsDict[notif.bucketId] = bucket
                    }
                }
            }
            
            let buckets = Array(bucketsDict.values)
            
            print("📱 Sending \(notificationsData.count) notifications, \(buckets.count) buckets, \(totalUnreadCount) unread")
            
            let message: [String: Any] = [
                "action": "updateData",
                "notifications": notificationsData,
                "buckets": buckets,
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
            // Limit to 30 most recent notifications to reduce payload size
            DatabaseAccess.getRecentNotifications(limit: 30, unreadOnly: false, source: "iPhone") { notifications in
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
                
                // Build buckets info
                var bucketsDict: [String: [String: Any]] = [:]
                var totalUnreadCount = 0
                
                for notif in notifications {
                    if !notif.isRead {
                        totalUnreadCount += 1
                    }
                    
                    if bucketsDict[notif.bucketId] == nil {
                        var bucketData: [String: Any] = [
                            "id": notif.bucketId,
                            "name": notif.bucketName ?? notif.bucketId,
                            "unreadCount": notif.isRead ? 0 : 1
                        ]
                        
                        if let color = notif.bucketColor, !color.isEmpty {
                            bucketData["color"] = color
                        }
                        
                        if let iconUrl = notif.bucketIconUrl, !iconUrl.isEmpty {
                            bucketData["iconUrl"] = iconUrl
                        }
                        
                        bucketsDict[notif.bucketId] = bucketData
                    } else if !notif.isRead {
                        if var bucket = bucketsDict[notif.bucketId] {
                            bucket["unreadCount"] = (bucket["unreadCount"] as? Int ?? 0) + 1
                            bucketsDict[notif.bucketId] = bucket
                        }
                    }
                }
                
                let buckets = Array(bucketsDict.values)
                
                print("📱 Sending \(notificationsData.count) notifications, \(buckets.count) buckets, \(totalUnreadCount) unread")
                replyHandler([
                    "notifications": notificationsData,
                    "buckets": buckets,
                    "unreadCount": totalUnreadCount
                ])
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

