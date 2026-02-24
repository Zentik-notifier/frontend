import Foundation
import WatchKit
import CloudKit
import UserNotifications

/**
 * WatchExtensionDelegate - Handles CloudKit remote notifications for Watch
 *
 * Receives CloudKit change notifications and updates local cache.
 * Implements UNUserNotificationCenterDelegate to handle notifications in foreground.
 *
 * Sync behaviour depends on WatchSyncMode (managed by WatchSettingsManager):
 * - foregroundOnly:      sync only when the app is in the foreground
 * - alwaysActive:        CKSyncEngine automaticallySync=true, process every push
 * - backgroundInterval:  periodic background refresh (~15 min), pushes deferred
 */
class WatchExtensionDelegate: NSObject, WKExtensionDelegate, UNUserNotificationCenterDelegate {

    private var backgroundRefreshInterval: TimeInterval {
        WatchSettingsManager.shared.backgroundInterval.timeInterval
    }

    private static let backgroundLock = NSLock()
    private static var _isInBackground = false
    static var isInBackground: Bool {
        get { backgroundLock.lock(); defer { backgroundLock.unlock() }; return _isInBackground }
        set { backgroundLock.lock(); defer { backgroundLock.unlock() }; _isInBackground = newValue }
    }

    private var hasPendingPushChanges = false

    func applicationDidFinishLaunching() {
        UNUserNotificationCenter.current().delegate = self

        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            if granted {
                LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Notification permissions granted", source: "WatchExtensionDelegate")
            } else if let error {
                LoggingSystem.shared.log(level: "ERROR", tag: "Watch", message: "Notification permissions denied", metadata: ["error": error.localizedDescription], source: "WatchExtensionDelegate")
            } else {
                LoggingSystem.shared.log(level: "WARN", tag: "Watch", message: "Notification permissions denied by user", source: "WatchExtensionDelegate")
            }
        }

        WKExtension.shared().registerForRemoteNotifications()

        let mode = WatchSettingsManager.shared.syncMode
        LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Application launched", metadata: ["syncMode": mode.rawValue], source: "WatchExtensionDelegate")

        guard WatchSyncEngineCKSync.shared.isCloudKitEnabled else {
            LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "CloudKit is disabled, skipping CKSyncEngine init", source: "WatchExtensionDelegate")
            return
        }
        WatchSyncEngineCKSync.shared.initialize()
        DispatchQueue.main.asyncAfter(deadline: .now() + 1.0) {
            WKExtension.shared().registerForRemoteNotifications()
        }

        if mode == .backgroundInterval {
            scheduleNextBackgroundRefresh()
        }
    }

    func didRegisterForRemoteNotifications(withDeviceToken deviceToken: Data) {
        let tokenString = deviceToken.map { String(format: "%02.2hhx", $0) }.joined()
        LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Registered for remote notifications", metadata: ["tokenPrefix": String(tokenString.prefix(16))], source: "WatchExtensionDelegate")
    }

    func didFailToRegisterForRemoteNotifications(withError error: Error) {
        LoggingSystem.shared.log(level: "ERROR", tag: "Watch", message: "Failed to register for remote notifications", metadata: ["error": error.localizedDescription], source: "WatchExtensionDelegate")
    }

    func applicationDidBecomeActive() {
        WatchExtensionDelegate.isInBackground = false
        if WatchSyncEngineCKSync.shared.isCloudKitEnabled {
            WatchSyncEngineCKSync.shared.fetchChangesNow()
        }
        hasPendingPushChanges = false
        NotificationCenter.default.post(name: NSNotification.Name("WatchAppDidBecomeActive"), object: nil)
    }

    func applicationWillResignActive() {
        WatchExtensionDelegate.isInBackground = true
        NotificationCenter.default.post(name: NSNotification.Name("WatchAppWillResignActive"), object: nil)
    }

    // MARK: - Background Refresh Scheduling

    func scheduleNextBackgroundRefresh() {
        let preferredDate = Date(timeIntervalSinceNow: backgroundRefreshInterval)
        WKExtension.shared().scheduleBackgroundRefresh(
            withPreferredDate: preferredDate,
            userInfo: nil
        ) { error in
            if let error {
                LoggingSystem.shared.log(level: "WARN", tag: "Watch", message: "Failed to schedule background refresh", metadata: ["error": error.localizedDescription], source: "WatchExtensionDelegate")
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Background refresh scheduled", metadata: ["preferredDate": ISO8601DateFormatter().string(from: preferredDate)], source: "WatchExtensionDelegate")
            }
        }
    }

    // MARK: - Background Tasks

    func handle(_ backgroundTasks: Set<WKRefreshBackgroundTask>) {
        for task in backgroundTasks {
            if let snapshotTask = task as? WKSnapshotRefreshBackgroundTask {
                snapshotTask.setTaskCompleted(restoredDefaultState: true, estimatedSnapshotExpiration: Date.distantFuture, userInfo: nil)
            } else if let connectivityTask = task as? WKWatchConnectivityRefreshBackgroundTask {
                connectivityTask.setTaskCompletedWithSnapshot(false)
            } else if let urlSessionTask = task as? WKURLSessionRefreshBackgroundTask {
                urlSessionTask.setTaskCompletedWithSnapshot(false)
            } else if task is WKApplicationRefreshBackgroundTask {
                handleApplicationRefreshTask(task)
            } else {
                task.setTaskCompletedWithSnapshot(false)
            }
        }
    }

    private func handleApplicationRefreshTask(_ task: WKRefreshBackgroundTask) {
        let mode = WatchSettingsManager.shared.syncMode
        guard mode == .backgroundInterval, WatchSyncEngineCKSync.shared.isCloudKitEnabled else {
            task.setTaskCompletedWithSnapshot(false)
            return
        }

        LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Background refresh task started", source: "WatchExtensionDelegate")

        WatchSyncEngineCKSync.shared.fetchChangesNow { error in
            if let error {
                LoggingSystem.shared.log(level: "WARN", tag: "Watch", message: "Background refresh sync failed", metadata: ["error": error.localizedDescription], source: "WatchExtensionDelegate")
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Background refresh sync completed", source: "WatchExtensionDelegate")
            }
            task.setTaskCompletedWithSnapshot(false)
        }
        hasPendingPushChanges = false

        scheduleNextBackgroundRefresh()
    }

    // MARK: - Remote Notifications

    func didReceiveRemoteNotification(_ userInfo: [AnyHashable: Any], fetchCompletionHandler completionHandler: @escaping (WKBackgroundFetchResult) -> Void) {
        let mode = WatchSettingsManager.shared.syncMode

        guard let notification = CKNotification(fromRemoteNotificationDictionary: userInfo as! [String: NSObject]) else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Non-CloudKit notification on Watch", source: "WatchExtensionDelegate")
            completionHandler(.noData)
            return
        }

        LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "CloudKit notification detected", metadata: [
            "type": "\(notification.notificationType.rawValue)",
            "subscriptionID": notification.subscriptionID ?? "nil",
            "syncMode": mode.rawValue,
            "isBackground": Self.isInBackground
        ], source: "WatchExtensionDelegate")

        guard WatchSyncEngineCKSync.shared.isCloudKitEnabled else {
            completionHandler(.noData)
            return
        }

        switch mode {
        case .foregroundOnly:
            if Self.isInBackground {
                hasPendingPushChanges = true
                completionHandler(.noData)
                return
            }

        case .backgroundInterval:
            hasPendingPushChanges = true
            if Self.isInBackground {
                completionHandler(.noData)
                return
            }

        case .alwaysActive:
            break
        }

        WatchSyncEngineCKSync.shared.fetchChangesNow { error in
            if let error {
                LoggingSystem.shared.log(level: "ERROR", tag: "Watch", message: "CloudKit push processing failed", metadata: ["error": error.localizedDescription], source: "WatchExtensionDelegate")
                completionHandler(.failed)
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "CloudKit push processed", source: "WatchExtensionDelegate")
                completionHandler(.newData)
            }
        }
    }

    // MARK: - UNUserNotificationCenterDelegate

    func userNotificationCenter(_ center: UNUserNotificationCenter, willPresent notification: UNNotification, withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void) {
        let userInfo = notification.request.content.userInfo
        LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Notification willPresent (foreground)", metadata: ["identifier": notification.request.identifier], source: "WatchExtensionDelegate")

        if let _ = CKNotification(fromRemoteNotificationDictionary: userInfo as! [String: NSObject]) {
            guard WatchSyncEngineCKSync.shared.isCloudKitEnabled else {
                completionHandler([])
                return
            }
            WatchSyncEngineCKSync.shared.fetchChangesNow { _ in
                completionHandler([])
            }
        } else {
            let notificationId = userInfo["notificationId"] as? String ?? userInfo["n"] as? String
            LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Mirrored notification (willPresent)", metadata: [
                "notificationId": notificationId ?? "",
                "title": String(notification.request.content.title.prefix(30))
            ], source: "WatchExtensionDelegate")
            completionHandler([.banner, .sound, .badge])
        }
    }

    func userNotificationCenter(_ center: UNUserNotificationCenter, didReceive response: UNNotificationResponse, withCompletionHandler completionHandler: @escaping () -> Void) {
        let userInfo = response.notification.request.content.userInfo
        let content = response.notification.request.content
        let resolvedId = (userInfo["n"] as? String) ?? (userInfo["nid"] as? String) ?? (userInfo["notificationId"] as? String)
        LoggingSystem.shared.log(level: "INFO", tag: "Watch", message: "Notification didReceive (user tap)", metadata: [
            "notificationId": resolvedId ?? "",
            "actionIdentifier": response.actionIdentifier
        ], source: "WatchExtensionDelegate")

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
