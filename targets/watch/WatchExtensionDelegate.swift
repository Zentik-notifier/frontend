import Foundation
import WatchKit
import UserNotifications

/**
 * WatchExtensionDelegate - Handles WatchConnectivity sync and mirrored notifications
 *
 * All data sync happens via WatchConnectivity from iPhone.
 * Implements UNUserNotificationCenterDelegate to handle notifications in foreground.
 */
class WatchExtensionDelegate: NSObject, WKExtensionDelegate, UNUserNotificationCenterDelegate {

    private static let backgroundLock = NSLock()
    private static var _isInBackground = false
    static var isInBackground: Bool {
        get { backgroundLock.lock(); defer { backgroundLock.unlock() }; return _isInBackground }
        set { backgroundLock.lock(); defer { backgroundLock.unlock() }; _isInBackground = newValue }
    }

    func applicationDidFinishLaunching() {
        print("⌚ [WatchExtensionDelegate] Application did finish launching")
        
        // Set up UNUserNotificationCenter delegate for foreground notifications
        UNUserNotificationCenter.current().delegate = self
        
        // Request notification permissions (for mirrored notifications)
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                print("⌚ [WatchExtensionDelegate] ✅ Notification permissions granted")
                LoggingSystem.shared.log(
                    level: "INFO",
                    tag: "Watch",
                    message: "Notification permissions granted",
                    source: "WatchExtensionDelegate"
                )
            } else if let error = error {
                print("⌚ [WatchExtensionDelegate] ❌ Notification permissions denied: \(error.localizedDescription)")
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "Watch",
                    message: "Notification permissions denied",
                    metadata: ["error": error.localizedDescription],
                    source: "WatchExtensionDelegate"
                )
            } else {
                print("⌚ [WatchExtensionDelegate] ⚠️ Notification permissions denied by user")
                LoggingSystem.shared.log(
                    level: "WARN",
                    tag: "Watch",
                    message: "Notification permissions denied by user",
                    source: "WatchExtensionDelegate"
                )
            }
        }
        
        // Register for remote notifications (for mirrored notifications from iPhone)
        print("⌚ [WatchExtensionDelegate] 📱 Registering for remote notifications...")
        WKExtension.shared().registerForRemoteNotifications()
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Application did finish launching - WatchConnectivity sync mode",
            source: "WatchExtensionDelegate"
        )
    }
    
    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        print("⌚ [WatchExtensionDelegate] ✅ Registered for remote notifications")
        print("⌚ [WatchExtensionDelegate] Device token: \(tokenString)")
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Successfully registered for remote notifications",
            metadata: ["deviceTokenLength": "\(deviceToken.count)", "deviceTokenPrefix": String(tokenString.prefix(16))],
            source: "WatchExtensionDelegate"
        )
    }
    
    func didFailToRegisterForRemoteNotifications(withError error: Error) {
        print("⌚ [WatchExtensionDelegate] ❌ Failed to register for remote notifications: \(error.localizedDescription)")
        
        LoggingSystem.shared.log(
            level: "ERROR",
            tag: "Watch",
            message: "Failed to register for remote notifications",
            metadata: ["error": error.localizedDescription],
            source: "WatchExtensionDelegate"
        )
    }
    
    func applicationDidBecomeActive() {
        print("⌚ [WatchExtensionDelegate] Application became active")
        WatchExtensionDelegate.isInBackground = false

        WKExtension.shared().registerForRemoteNotifications()
        NotificationCenter.default.post(name: NSNotification.Name("WatchAppDidBecomeActive"), object: nil)
    }

    func applicationWillResignActive() {
        print("⌚ [WatchExtensionDelegate] Application will resign active")
        WatchExtensionDelegate.isInBackground = true

        NotificationCenter.default.post(name: NSNotification.Name("WatchAppWillResignActive"), object: nil)
    }
    
    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        print("⌚ [WatchExtensionDelegate] Handling background tasks: \(backgroundTasks.count)")
        
        for task in backgroundTasks {
            print("⌚ [WatchExtensionDelegate] Background task type: \(type(of: task))")
            
            if let refreshTask = task as? WKApplicationRefreshBackgroundTask {
                print("⌚ [WatchExtensionDelegate] Application refresh background task")
                refreshTask.setTaskCompletedWithSnapshot(false)
            } else if let snapshotTask = task as? WKSnapshotRefreshBackgroundTask {
                print("⌚ [WatchExtensionDelegate] Snapshot refresh background task")
                snapshotTask.setTaskCompleted(restoredDefaultState: true, estimatedSnapshotExpiration: Date.distantFuture, userInfo: nil)
            } else if let connectivityTask = task as? WKWatchConnectivityRefreshBackgroundTask {
                print("⌚ [WatchExtensionDelegate] WatchConnectivity refresh background task")
                connectivityTask.setTaskCompletedWithSnapshot(false)
            } else if let urlSessionTask = task as? WKURLSessionRefreshBackgroundTask {
                print("⌚ [WatchExtensionDelegate] URL session refresh background task")
                urlSessionTask.setTaskCompletedWithSnapshot(false)
            } else {
                print("⌚ [WatchExtensionDelegate] Unknown background task type")
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }
    
    // MARK: - Remote Notifications
    // Mirrored notification from iPhone (same APNs payload, our userInfo keys "n","b", etc.) in willPresent/didReceive.

    func didReceiveRemoteNotification(_ userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (WKBackgroundFetchResult) -> Void) {
        if WatchExtensionDelegate.isInBackground {
            completionHandler(.noData)
            return
        }
        print("⌚ [WatchExtensionDelegate] 📬 Received remote notification (keys: \(userInfo.count))")
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Received remote notification",
            metadata: [
                "userInfoKeys": "\(Array(userInfo.keys))",
                "userInfoCount": "\(userInfo.count)"
            ],
            source: "WatchExtensionDelegate"
        )
        
        // All notifications are handled as mirrored notifications now
        completionHandler(.noData)
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    // On watchOS: willPresent is only called when the app is in foreground (arrival without tap).
    // When app is in background, the system shows the notification but does not wake the app; we only get didReceive when the user taps.

    /// Called when a notification is delivered while the app is in the foreground (arrival without tap).
    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        print("⌚ [WatchExtensionDelegate] 📬 willPresent keys=\(userInfo.count) id=\(notification.request.identifier)")
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Notification arrival (willPresent - app in foreground)",
            metadata: [
                "userInfoKeys": "\(Array(userInfo.keys))",
                "identifier": notification.request.identifier
            ],
            source: "WatchExtensionDelegate"
        )
        
        // Mirrored app notification (payload from iPhone): log keys and main fields to understand how to save it
        let keys = Array(userInfo.keys).map { "\($0)" }.sorted()
        let n = userInfo["n"] as? String
        let b = userInfo["b"] as? String
        let m = userInfo["m"] as? String
        let notificationId = userInfo["notificationId"] as? String
        let title = (notification.request.content.title as String).isEmpty ? (userInfo["title"] as? String) : notification.request.content.title
        let body = (notification.request.content.body as String).isEmpty ? (userInfo["body"] as? String) : notification.request.content.body
        let titlePreview = (title ?? "").count > 30 ? String((title ?? "").prefix(30)) + "…" : (title ?? "")
        print("⌚ [WatchExtensionDelegate] 📢 Mirrored notification id=\(notificationId ?? "?") title=\(titlePreview)")
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Mirrored app notification payload (willPresent)",
            metadata: [
                "keys": keys.joined(separator: ","),
                "n": n ?? "",
                "b": b ?? "",
                "m": m ?? "",
                "notificationId": notificationId ?? "",
                "title": title ?? "",
                "body": (body ?? "").prefix(80).description
            ],
            source: "WatchExtensionDelegate"
        )
        completionHandler([.banner, .sound, .badge])
    }
    
    /// Called when user interacts with a notification (tap, action). Same interception point for mirrored app payload.
    /// Saves the notification to WatchDataStore (local JSON cache, no SQL) including attachments and actions, then sets pending navigation intent.
    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let content = response.notification.request.content
        let resolvedId = (userInfo["n"] as? String) ?? (userInfo["nid"] as? String) ?? (userInfo["notificationId"] as? String)
        print("⌚ [WatchExtensionDelegate] 👆 User interacted with notification - n=\(resolvedId ?? "nil") actionId=\(response.actionIdentifier)")
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Mirrored app notification (didReceive)",
            metadata: [
                "n": resolvedId ?? "",
                "actionIdentifier": response.actionIdentifier
            ],
            source: "WatchExtensionDelegate"
        )
        WatchDataStore.shared.addOrUpdateNotificationFromMirroredPayload(
            userInfo: userInfo,
            title: content.title,
            body: content.body,
            subtitle: content.subtitle.isEmpty ? nil : content.subtitle
        )
        if let nid = resolvedId, !nid.isEmpty,
           let intentData = try? JSONSerialization.data(withJSONObject: ["type": "OPEN_NOTIFICATION", "value": nid]),
           let url = DatabaseAccess.SharedCachePaths.containerURL()?.appendingPathComponent("pending_navigation_intent.json") {
            try? intentData.write(to: url)
        }
        completionHandler()
    }
}
