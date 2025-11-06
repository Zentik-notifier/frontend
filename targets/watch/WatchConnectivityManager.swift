import Foundation
import WatchConnectivity

class WatchConnectivityManager: NSObject, ObservableObject {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    
    private override init() {
        super.init()
        
        if WCSession.isSupported() {
            let session = WCSession.default
            session.delegate = self
            session.activate()
        }
    }
    
    func requestData() {
        guard WCSession.default.isReachable else {
            print("⌚ iPhone is not reachable")
            return
        }
        
        let message = ["action": "requestData"]
        WCSession.default.sendMessage(message, replyHandler: { reply in
            DispatchQueue.main.async {
                self.processReceivedData(reply)
            }
        }) { error in
            print("⌚ Error requesting data: \(error.localizedDescription)")
        }
    }
    
    func deleteNotification(id: String, completion: @escaping (Bool) -> Void) {
        guard WCSession.default.isReachable else {
            completion(false)
            return
        }
        
        let message = ["action": "deleteNotification", "notificationId": id]
        WCSession.default.sendMessage(message, replyHandler: { reply in
            let success = reply["success"] as? Bool ?? false
            DispatchQueue.main.async {
                if success {
                    self.notifications.removeAll { $0.notification.id == id }
                }
                completion(success)
            }
        }) { error in
            print("⌚ Error deleting notification: \(error.localizedDescription)")
            completion(false)
        }
    }
    
    func markAsRead(id: String, completion: @escaping (Bool) -> Void) {
        guard WCSession.default.isReachable else {
            completion(false)
            return
        }
        
        let message = ["action": "markAsRead", "notificationId": id]
        WCSession.default.sendMessage(message, replyHandler: { reply in
            let success = reply["success"] as? Bool ?? false
            DispatchQueue.main.async {
                if success {
                    if let index = self.notifications.firstIndex(where: { $0.notification.id == id }) {
                        // Update local notification
                        self.requestData()
                    }
                }
                completion(success)
            }
        }) { error in
            print("⌚ Error marking as read: \(error.localizedDescription)")
            completion(false)
        }
    }
    
    private func processReceivedData(_ data: [String: Any]) {
        // Process notifications
        if let notificationsData = data["notifications"] as? [[String: Any]] {
            self.notifications = notificationsData.compactMap { notifDict -> NotificationData? in
                guard let id = notifDict["id"] as? String,
                      let title = notifDict["title"] as? String,
                      let body = notifDict["body"] as? String,
                      let bucketId = notifDict["bucketId"] as? String,
                      let isRead = notifDict["isRead"] as? Bool else {
                    return nil
                }
                
                let subtitle = notifDict["subtitle"] as? String
                let createdAt = notifDict["createdAt"] as? String ?? ""
                let bucketName = notifDict["bucketName"] as? String
                let bucketColor = notifDict["bucketColor"] as? String
                let bucketIconUrl = notifDict["bucketIconUrl"] as? String
                
                let notification = DatabaseAccess.WidgetNotification(
                    id: id,
                    title: title,
                    body: body,
                    subtitle: subtitle,
                    createdAt: createdAt,
                    isRead: isRead,
                    bucketId: bucketId,
                    bucketName: bucketName,
                    bucketColor: bucketColor,
                    bucketIconUrl: bucketIconUrl
                )
                
                return NotificationData(notification: notification)
            }
        }
        
        // Process unread count
        if let count = data["unreadCount"] as? Int {
            self.unreadCount = count
        }
        
        // Process buckets
        if let bucketsData = data["buckets"] as? [[String: Any]] {
            self.buckets = bucketsData.compactMap { bucketDict -> BucketItem? in
                guard let id = bucketDict["id"] as? String,
                      let name = bucketDict["name"] as? String,
                      let unreadCount = bucketDict["unreadCount"] as? Int else {
                    return nil
                }
                
                let color = bucketDict["color"] as? String
                
                return BucketItem(
                    id: id,
                    name: name,
                    unreadCount: unreadCount,
                    color: color
                )
            }
        }
    }
    
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
        // Handle messages from iPhone
        if let action = message["action"] as? String {
            switch action {
            case "updateData":
                DispatchQueue.main.async {
                    self.processReceivedData(message)
                }
                replyHandler(["success": true])
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
}

