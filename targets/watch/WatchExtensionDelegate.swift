import Foundation
import WatchKit
import CloudKit
import UserNotifications

/**
 * WatchExtensionDelegate - Handles CloudKit remote notifications for Watch
 *
 * Receives CloudKit change notifications and updates local cache
 * Implements UNUserNotificationCenterDelegate to handle notifications in foreground
 *
 * Subscriptions are disabled when the app goes to background to avoid battery drain;
 * they are re-created when the app becomes active again.
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
        
        // Request notification permissions (required for CloudKit subscriptions)
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
        
        // Register for remote notifications (required for CloudKit subscriptions)
        print("⌚ [WatchExtensionDelegate] 📱 Registering for remote notifications...")
        WKExtension.shared().registerForRemoteNotifications()
        
        LoggingSystem.shared.log(
            level: "INFO",
            tag: "Watch",
            message: "Application did finish launching - registering for remote notifications",
            source: "WatchExtensionDelegate"
        )
        
        // Setup CloudKit subscriptions (schema initialization and initial sync are handled by iOS App via React useCleanup)
        // Only setup subscriptions if CloudKit is enabled
        guard WatchCloudKit.shared.isCloudKitEnabled else {
            print("⌚ [WatchExtensionDelegate] ⚠️ CloudKit is disabled, skipping subscription setup")
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "Watch",
                message: "CloudKit is disabled, skipping subscription setup",
                source: "WatchExtensionDelegate"
            )
            return
        }
        
        // Ensure zone + subscriptions
        WatchCloudKit.shared.ensureReady { result in
            switch result {
            case .success:
                print("⌚ [WatchExtensionDelegate] ✅ CloudKit subscriptions setup successfully")
                
                // Re-register for remote notifications after subscriptions are setup
                // This ensures we're registered even if the first attempt failed
                DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
                    print("⌚ [WatchExtensionDelegate] 📱 Re-registering for remote notifications after subscription setup...")
                    WKExtension.shared().registerForRemoteNotifications()
                }
            case .failure(let error):
                print("⌚ [WatchExtensionDelegate] ❌ CloudKit subscriptions setup failed: \(error.localizedDescription)")
                LoggingSystem.shared.log(
                    level: "ERROR",
                    tag: "Watch",
                    message: "CloudKit subscriptions setup failed",
                    metadata: ["error": error.localizedDescription],
                    source: "WatchExtensionDelegate"
                )
            }
        }
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

        if WatchCloudKit.shared.isCloudKitEnabled {
            WatchCloudKit.shared.ensureReady { result in
                switch result {
                case .success:
                    print("⌚ [WatchExtensionDelegate] ✅ Subscriptions re-enabled (foreground)")
                    LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "CloudKit subscriptions re-enabled", source: "WatchExtensionDelegate")
                case .failure(let error):
                    print("⌚ [WatchExtensionDelegate] ⚠️ Failed to re-enable subscriptions: \(error.localizedDescription)")
                }
            }
        }

        // Only re-register if not already registered (battery optimization)
        // The system handles re-registration automatically in most cases
        NotificationCenter.default.post(name: NSNotification.Name("WatchAppDidBecomeActive"), object: nil)
    }

    func applicationWillResignActive() {
        print("⌚ [WatchExtensionDelegate] Application will resign active")
        WatchExtensionDelegate.isInBackground = true

        if WatchCloudKit.shared.isCloudKitEnabled {
            WatchCloudKit.shared.disableSubscriptions { result in
                switch result {
                case .success:
                    print("⌚ [WatchExtensionDelegate] ✅ Subscriptions disabled (background)")
                    LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "CloudKit subscriptions disabled for background", source: "WatchExtensionDelegate")
                case .failure(let error):
                    print("⌚ [WatchExtensionDelegate] ⚠️ Failed to disable subscriptions: \(error.localizedDescription)")
                }
            }
        }

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
    // Two sources: (1) CloudKit push (CKNotification) when iPhone app pushes to CK; (2) Mirrored notification from iPhone (same APNs payload, our userInfo keys "n","b", etc.) in willPresent/didReceive.

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
        
        // Check if this is a CloudKit notification
        if let notification = CKNotification(fromRemoteNotificationDictionary: userInfo as! [String: NSObject]) {
            let subId = notification.subscriptionID ?? "nil"
            let recordInfo: String
            if let q = notification as? CKQueryNotification {
                recordInfo = " record=\(q.recordID?.recordName ?? "?") reason=\(q.queryNotificationReason.rawValue)"
            } else {
                recordInfo = ""
            }
            print("⌚ [WatchExtensionDelegate] ☁️ CloudKit type=\(notification.notificationType.rawValue) subId=\(subId)\(recordInfo)")
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "Watch",
                message: "CloudKit notification detected",
                metadata: [
                    "notificationType": "\(notification.notificationType.rawValue)",
                    "subscriptionID": notification.subscriptionID ?? "nil"
                ],
                source: "WatchExtensionDelegate"
            )
            
            // Convert WKBackgroundFetchResult to UIBackgroundFetchResult for WatchCloudKit
            // Check if CloudKit is enabled before handling notification
            guard WatchCloudKit.shared.isCloudKitEnabled else {
                print("⌚ [WatchExtensionDelegate] ⚠️ CloudKit is disabled, ignoring remote notification")
                completionHandler(.noData)
                return
            }

            WatchCloudKit.shared.handleRemoteNotification(userInfo: userInfo) { result in
                switch result {
                case .failure(let error):
                    print("⌚ [WatchExtensionDelegate] ❌ CloudKit notification processing failed: \(error.localizedDescription)")
                    completionHandler(.failed)
                case .success(let appliedCount):
                    let watchResult: WKBackgroundFetchResult = appliedCount > 0 ? .newData : .noData
                    print("⌚ [WatchExtensionDelegate] ✅ CloudKit notification processed - result: \(watchResult) applied=\(appliedCount)")
                    LoggingSystem.shared.log(
                        level: "INFO",
                        tag: "Watch",
                        message: "CloudKit notification processed",
                        metadata: ["result": "\(watchResult)", "appliedCount": "\(appliedCount)"],
                        source: "WatchExtensionDelegate"
                    )
                    completionHandler(watchResult)
                }
            }
        } else {
            print("⌚ [WatchExtensionDelegate] ⚠️ Not a CloudKit notification")
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "CloudKit",
                message: "Non-CloudKit notification on Watch",
                source: "WatchExtensionDelegate"
            )
            completionHandler(.noData)
        }
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
        
        if let ckNotification = CKNotification(fromRemoteNotificationDictionary: userInfo as! [String: NSObject]) {
            print("⌚ [WatchExtensionDelegate] ☁️ CloudKit foreground - processing silently")
            
            // Process CloudKit notification silently (don't show alert)
            // The notification will be handled by didReceiveRemoteNotification or we can process it here
            // Check if CloudKit is enabled before handling notification
            guard WatchCloudKit.shared.isCloudKitEnabled else {
                print("⌚ [WatchExtensionDelegate] ⚠️ CloudKit is disabled, ignoring remote notification")
                completionHandler([])
                return
            }

            WatchCloudKit.shared.handleRemoteNotification(userInfo: userInfo) { _ in
                // Don't show notification banner - we handle it silently
                completionHandler([])
            }
        } else {
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
