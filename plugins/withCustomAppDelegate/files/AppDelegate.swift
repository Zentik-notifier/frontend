import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider
import UserNotifications
import CloudKit
import WatchConnectivity

class ReactNativeDelegate: ExpoReactNativeFactoryDelegate {
  // Extension point for config-plugins

  override func sourceURL(for bridge: RCTBridge) -> URL? {
    // needed to return the correct URL for expo-dev-client.
    bridge.bundleURL ?? bundleURL()
  }

  override func bundleURL() -> URL? {
#if DEBUG
    return RCTBundleURLProvider.sharedSettings().jsBundleURL(forBundleRoot: ".expo/.virtual-metro-entry")
#else
    return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
#endif
  }
}

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate, WCSessionDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  
  // Keep reference to Expo's original notification delegate
  private var expoNotificationDelegate: UNUserNotificationCenterDelegate?
  private var wcSession: WCSession?

  // WC is intentionally restricted to:
  // - iPhone -> Watch: settings (applicationContext/sendMessage)
  // - Watch -> iPhone: logs (sendMessage)

  public override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]? = nil
  ) -> Bool {
    let delegate = ReactNativeDelegate()
    let factory = ExpoReactNativeFactory(delegate: delegate)
    delegate.dependencyProvider = RCTAppDependencyProvider()

    reactNativeDelegate = delegate
    reactNativeFactory = factory
    bindReactNativeFactory(factory)

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
// @generated begin @react-native-firebase/app-didFinishLaunchingWithOptions - expo prebuild (DO NOT MODIFY) sync-10e8520570672fd76b2403b7e1e27f5198a6349a
FirebaseApp.configure()
// @generated end @react-native-firebase/app-didFinishLaunchingWithOptions
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    
    expoNotificationDelegate = UNUserNotificationCenter.current().delegate
    
    UNUserNotificationCenter.current().delegate = self
    
    // CloudKit initialization and subscriptions are now handled by React via useCleanup
    // React will:
    // 1. Initialize schema (creates zone if needed)
    // 2. Setup subscriptions (after zone is initialized)
    // 3. Trigger sync operations
    // This ensures proper ordering and error handling from React side
    
    // Register for remote notifications (required for CloudKit subscriptions)
    application.registerForRemoteNotifications()
    
    // Setup WatchConnectivity for receiving logs from Watch
    setupWatchConnectivity()
    
    // Listen for Watch token settings requests from React Native
    NotificationCenter.default.addObserver(
      self,
      selector: #selector(handleSendWatchTokenSettings(_:)),
      name: NSNotification.Name("SendWatchTokenSettings"),
      object: nil
    )

    return result
  }
  
  @objc private func handleSendWatchTokenSettings(_ notification: Notification) {
    guard let userInfo = notification.userInfo,
          let token = userInfo["token"] as? String,
          let serverAddress = userInfo["serverAddress"] as? String else {
      DispatchQueue.main.async {
        NotificationCenter.default.post(
          name: NSNotification.Name("SendWatchTokenSettings"),
          object: nil,
          userInfo: ["success": false, "error": "Missing token or server address"]
        )
      }
      return
    }
    
    sendWatchTokenSettings(token: token, serverAddress: serverAddress) { success, error in
      var responseUserInfo: [String: Any] = ["success": success]
      if let error = error {
        responseUserInfo["error"] = error
      }
      
      DispatchQueue.main.async {
        NotificationCenter.default.post(
          name: NSNotification.Name("SendWatchTokenSettings"),
          object: nil,
          userInfo: responseUserInfo
        )
      }
    }
  }
  
  // MARK: - WatchConnectivity Setup
  
  private func setupWatchConnectivity() {
    if WCSession.isSupported() {
      wcSession = WCSession.default
      wcSession?.delegate = self
      wcSession?.activate()
    }
  }
  
  // MARK: - WCSessionDelegate
  
  public func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
    if let error = error {
      print("📱 [AppDelegate] ⚠️ WCSession activation failed: \(error.localizedDescription)")
    } else {
      print("📱 [AppDelegate] ✅ WCSession activated with state: \(activationState.rawValue)")
    }
  }
  
  public func sessionDidBecomeInactive(_ session: WCSession) {
    print("📱 [AppDelegate] WCSession became inactive")
  }
  
  public func sessionDidDeactivate(_ session: WCSession) {
    print("📱 [AppDelegate] WCSession deactivated, reactivating...")
    session.activate()
  }
  
  public func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    guard let type = message["type"] as? String else {
      replyHandler(["success": false, "error": "Missing message type"])
      return
    }

    if type == "watchLogs" {
      handleWatchLogs(message: message, replyHandler: replyHandler)
      return
    }

    replyHandler(["success": false, "error": "Unknown message type"])
  }


  
  /// Send Watch token and server address to Watch app
  func sendWatchTokenSettings(token: String, serverAddress: String, completion: @escaping (Bool, String?) -> Void) {
    guard let session = wcSession else {
      completion(false, "WCSession not available")
      return
    }
    
    guard session.activationState == .activated else {
      completion(false, "WCSession not activated")
      return
    }
    
    let context: [String: Any] = [
      "type": "watchTokenSettings",
      "token": token,
      "serverAddress": serverAddress,
      "timestamp": Date().timeIntervalSince1970
    ]
    
    // Always update application context first to ensure it's available when Watch restarts
    do {
      try session.updateApplicationContext(context)
      print("📱 [AppDelegate] ✅ Updated application context with Watch token settings")
    } catch {
      print("📱 [AppDelegate] ⚠️ Failed to update application context: \(error.localizedDescription)")
      // Continue anyway - we'll try to send message directly
    }
    
    guard session.isReachable else {
      // Watch is not reachable, but we've already updated the context
      // It will be received when Watch becomes active
      completion(true, nil)
      return
    }
    
    // Send message directly if Watch is reachable (for immediate confirmation)
    session.sendMessage(context, replyHandler: { reply in
      if let success = reply["success"] as? Bool, success {
        print("📱 [AppDelegate] ✅ Watch confirmed receipt of token settings")
        completion(true, nil)
      } else {
        let errorMsg = reply["error"] as? String ?? "Unknown error"
        print("📱 [AppDelegate] ❌ Watch failed to confirm receipt: \(errorMsg)")
        // Still consider it successful since application context was updated
        completion(true, nil)
      }
    }, errorHandler: { error in
      print("📱 [AppDelegate] ⚠️ Error sending message to Watch: \(error.localizedDescription)")
      // Still consider it successful since application context was updated
      // Watch will receive it when it becomes active
      completion(true, nil)
    })
  }
  
  private func handleWatchLogs(message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
    guard let logsData = message["logs"] as? [[String: Any]] else {
      replyHandler(["success": false, "error": "Missing logs data"])
      return
    }
    
    let batchIndex = message["batchIndex"] as? Int ?? 0
    let totalBatches = message["totalBatches"] as? Int ?? 1
    let isLastBatch = message["isLastBatch"] as? Bool ?? true
    
    // Notify React Native of batch reception progress
    CloudKitSyncBridge.notifyWatchLogsTransferProgress(
      currentBatch: batchIndex + 1,
      totalBatches: totalBatches,
      logsInBatch: logsData.count,
      phase: isLastBatch ? "receiving_last" : "receiving"
    )
    
    // Convert received logs to LogEntry format
    let receivedLogs: [LoggingSystem.LogEntry] = logsData.compactMap { dict in
      guard let id = dict["id"] as? String,
            let level = dict["level"] as? String,
            let message = dict["message"] as? String,
            let timestamp = dict["timestamp"] as? Int64,
            let source = dict["source"] as? String else {
        return nil
      }
      
      let tag = dict["tag"] as? String
      let metadata = dict["metadata"] as? [String: String]
      
      return LoggingSystem.LogEntry(
        id: id,
        level: level,
        tag: tag,
        message: message,
        metadata: metadata,
        timestamp: timestamp,
        source: source
      )
    }
    
    // Save logs to Watch.json using LoggingSystem
    // We need to write them directly since LoggingSystem buffers logs
    // and we want to save them immediately
    // Use the same directory as LoggingSystem (shared media cache directory)
    let fileManager = FileManager.default
    
    // Get shared media cache directory (same as LoggingSystem uses)
    let bundleIdentifier = KeychainAccess.getMainBundleIdentifier()
    let appGroupIdentifier = "group.\(bundleIdentifier)"
    let cacheDirectory: URL
    
    if let sharedContainerURL = fileManager.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
      cacheDirectory = sharedContainerURL.appendingPathComponent("shared_media_cache")
    } else {
      // Fallback to Documents directory if App Groups not available
      let documentsPath = fileManager.urls(for: .documentDirectory, in: .userDomainMask)[0]
      cacheDirectory = documentsPath.appendingPathComponent("shared_media_cache")
    }
    
    let logsDirectory = cacheDirectory.appendingPathComponent("logs")
    
    // Create logs directory if it doesn't exist
    try? fileManager.createDirectory(at: logsDirectory, withIntermediateDirectories: true)
    
    let watchLogFile = logsDirectory.appendingPathComponent("Watch.json")
    
    // Read existing logs
    var existingLogs: [LoggingSystem.LogEntry] = []
    if let data = try? Data(contentsOf: watchLogFile),
       let decoded = try? JSONDecoder().decode([LoggingSystem.LogEntry].self, from: data) {
      existingLogs = decoded
    }
    
    // Append new logs
    existingLogs.append(contentsOf: receivedLogs)
    
    // Keep only most recent 10000 logs
    if existingLogs.count > 10000 {
      existingLogs = Array(existingLogs.sorted { $0.timestamp > $1.timestamp }.prefix(10000))
    }
    
    // Write back to file
    do {
      let encoder = JSONEncoder()
      encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
      let data = try encoder.encode(existingLogs)
      try data.write(to: watchLogFile, options: [.atomic])
      
      if isLastBatch {
        print("📱 [AppDelegate] ✅ Saved all log batches from Watch to Watch.json (batch \(batchIndex + 1)/\(totalBatches), \(receivedLogs.count) logs in this batch)")
        
        // Also log via LoggingSystem for consistency
        LoggingSystem.shared.log(
          level: "INFO",
          tag: "WatchConnectivity",
          message: "Received and saved all log batches from Watch",
          metadata: ["totalBatches": "\(totalBatches)", "lastBatchCount": "\(receivedLogs.count)"],
          source: "AppDelegate"
        )
        
        // Notify React Native that all batches have been received
        CloudKitSyncBridge.notifyWatchLogsTransferProgress(
          currentBatch: totalBatches,
          totalBatches: totalBatches,
          logsInBatch: receivedLogs.count,
          phase: "completed"
        )
      } else {
        print("📱 [AppDelegate] ✅ Saved log batch \(batchIndex + 1)/\(totalBatches) from Watch (\(receivedLogs.count) logs)")
      }
      
      replyHandler(["success": true])
    } catch {
      print("📱 [AppDelegate] ❌ Failed to save Watch logs: \(error.localizedDescription)")
      replyHandler(["success": false, "error": error.localizedDescription])
    }
  }
  
  // MARK: - UNUserNotificationCenterDelegate
  
  /// Called when user taps a notification action
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    let userInfo = response.notification.request.content.userInfo
    
    // Single consolidated log for action received
    LoggingSystem.shared.info(
      tag: "Action",
      message: "User action triggered",
      metadata: [
        "actionIdentifier": response.actionIdentifier,
        "notificationId": response.notification.request.identifier,
        "appState": UIApplication.shared.applicationState == .active ? "foreground" : "background"
      ],
      source: "AppDelegate"
    )
    
    // Decide whether to propagate to React Native (Expo).
    // For non-navigation actions (e.g. WEBHOOK/MARK_AS_READ/DELETE), we execute in Swift
    // and avoid delegating to JS to prevent duplicate handling.
    let shouldForwardToExpo: Bool = {
      guard let parsed = NotificationActionHandler.parseActionIdentifier(response.actionIdentifier, from: userInfo),
            let parsedType = parsed["type"]?.uppercased() else {
        // Conservative: if we can't parse, keep the previous behavior.
        return true
      }

      // Only forward navigation-like events to React.
      // Everything else (including WEBHOOK) is handled purely in Swift.
      return parsedType == "NAVIGATE" || parsedType == "OPEN_NOTIFICATION" || parsedType == "OPEN_APP"
    }()

    if shouldForwardToExpo {
      // Handle the action in Swift (for background operations)
      handleNotificationAction(response: response)

      // Propagate event to Expo delegate for React Native listeners
      if let expoDelegate = expoNotificationDelegate {
        expoDelegate.userNotificationCenter?(
          center,
          didReceive: response,
          withCompletionHandler: completionHandler
        )
      } else {
        completionHandler()
      }
    } else {
      // Execute fully in Swift; call completionHandler when done.
      handleNotificationAction(response: response) {
        completionHandler()
      }
    }
  }
  
  /// Called when a notification arrives while app is in foreground
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    let userInfo = notification.request.content.userInfo
    // Use nid from userInfo (new format), fallback to notificationId (old format), then request.identifier
    let notificationId = (userInfo["nid"] as? String) ?? (userInfo["notificationId"] as? String) ?? notification.request.identifier
    
    // Single log for foreground notification
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "Notification received in foreground",
      metadata: ["notificationId": notificationId],
      source: "AppDelegate"
    )
    
    // CRITICAL: Propagate event to Expo delegate for React Native listeners
    if let expoDelegate = expoNotificationDelegate {
      expoDelegate.userNotificationCenter?(
        center,
        willPresent: notification,
        withCompletionHandler: completionHandler
      )
    } else {
      // Fallback: show notification banner
      if #available(iOS 14.0, *) {
        completionHandler([.banner, .sound, .badge])
      } else {
        completionHandler([.alert, .sound, .badge])
      }
    }
  }
  
  // MARK: - Action Handling
  
  private func handleNotificationAction(response: UNNotificationResponse, completion: (() -> Void)? = nil) {
    let actionIdentifier = response.actionIdentifier
    let userInfo = response.notification.request.content.userInfo
    
    // Use nid from userInfo (new format), fallback to notificationId (old format), then request.identifier
    let notificationId = (userInfo["nid"] as? String) ?? (userInfo["notificationId"] as? String) ?? response.notification.request.identifier
    
    // Validate notificationId is not empty
    guard !notificationId.isEmpty else {
      LoggingSystem.shared.error(
        tag: "Action",
        message: "Notification ID is empty, cannot execute action",
        metadata: [
          "actionIdentifier": actionIdentifier,
          "userInfoKeys": Array(userInfo.keys.map { String(describing: $0) }),
          "requestIdentifier": response.notification.request.identifier
        ],
        source: "AppDelegate"
      )
      return
    }
    
    // Parse action using shared handler
    guard let action = NotificationActionHandler.parseActionIdentifier(actionIdentifier, from: userInfo) else {
      LoggingSystem.shared.warn(
        tag: "Action",
        message: "Could not parse action identifier",
        metadata: ["actionIdentifier": actionIdentifier],
        source: "AppDelegate"
      )
      return
    }
    
    guard let type = action["type"], let value = action["value"] else {
      LoggingSystem.shared.error(
        tag: "Action",
        message: "Invalid action format",
        metadata: ["action": action],
        source: "AppDelegate"
      )
      return
    }
    
    NotificationActionHandler.executeAction(
      type: type,
      value: value,
      notificationId: notificationId,
      userInfo: userInfo,
      source: "AppDelegate"
    ) { result in
      switch result {
      case .success:
        // CloudKit sync will handle Watch updates automatically
        break
        
      case .failure(let error):
        LoggingSystem.shared.error(
          tag: "Action",
          message: "Action failed",
          metadata: [
            "type": type,
            "value": value,
            "notificationId": notificationId,
            "error": error.localizedDescription
          ],
          source: "AppDelegate"
        )
      }

      completion?()
    }
  }
  
  // Linking API
  public override func application(
    _ app: UIApplication,
    open url: URL,
    options: [UIApplication.OpenURLOptionsKey: Any] = [:]
  ) -> Bool {
    return super.application(app, open: url, options: options) || RCTLinkingManager.application(app, open: url, options: options)
  }

  // Universal Links
  public override func application(
    _ application: UIApplication,
    continue userActivity: NSUserActivity,
    restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void
  ) -> Bool {
    let result = RCTLinkingManager.application(application, continue: userActivity, restorationHandler: restorationHandler)
    return super.application(application, continue: userActivity, restorationHandler: restorationHandler) || result
  }
  
  // MARK: - Remote Notifications (CloudKit)
  
  /// Called when app successfully registers for remote notifications
  public override func application(
    _ application: UIApplication,
    didRegisterForRemoteNotificationsWithDeviceToken deviceToken: Data
  ) {
    print("☁️ [AppDelegate] ✅ Registered for remote notifications")
    print("☁️ [AppDelegate] Device token: \(deviceToken.map { String(format: "%02.2hhx", $0) }.joined())")
    super.application(application, didRegisterForRemoteNotificationsWithDeviceToken: deviceToken)
  }
  
  /// Called when app fails to register for remote notifications
  public override func application(
    _ application: UIApplication,
    didFailToRegisterForRemoteNotificationsWithError error: Error
  ) {
    print("☁️ [AppDelegate] ❌ Failed to register for remote notifications: \(error.localizedDescription)")
    super.application(application, didFailToRegisterForRemoteNotificationsWithError: error)
  }
  
  /// Called when app receives remote notification (CloudKit changes)
  public override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    // Check if this is a CloudKit notification
    guard let ckNotification = PhoneCloudKit.shared.parseCloudKitNotification(from: userInfo) else {
      LoggingSystem.shared.log(
        level: "INFO",
        tag: "CloudKit",
        message: "Non-CloudKit notification - forwarding to super",
        source: "AppDelegate"
      )
      super.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
      return
    }

    guard PhoneCloudKit.shared.isCloudKitEnabled else {
      print("☁️ [AppDelegate] ⚠️ CloudKit is disabled, ignoring remote notification")
      completionHandler(.noData)
      return
    }

    // Prefer per-record fetch when possible, then notify React.
    if let queryNotification = ckNotification as? CKQueryNotification,
       let recordID = queryNotification.recordID {
      PhoneCloudKit.shared.fetchRecord(recordID: recordID) { result in
        switch result {
        case .failure(let error):
          LoggingSystem.shared.log(
            level: "ERROR",
            tag: "CloudKit",
            message: "Failed to fetch record after push",
            metadata: ["error": error.localizedDescription, "recordName": recordID.recordName],
            source: "AppDelegate"
          )

          // Still notify React so it can refresh.
          let fallbackId = Self.extractZentikId(fromRecordName: recordID.recordName)
          CloudKitSyncBridge.notifyRecordChanged(
            recordType: "Unknown",
            recordId: fallbackId,
            reason: "push_fetch_failed",
            recordData: nil
          )
          completionHandler(.failed)

        case .success(let record):
          guard let record else {
            let fallbackId = Self.extractZentikId(fromRecordName: recordID.recordName)
            CloudKitSyncBridge.notifyRecordChanged(
              recordType: "Unknown",
              recordId: fallbackId,
              reason: "push_record_missing",
              recordData: nil
            )
            completionHandler(.noData)
            return
          }

          let recordType = record.recordType
          let id = (record["id"] as? String) ?? Self.extractZentikId(fromRecordName: recordID.recordName)

          CloudKitSyncBridge.notifyRecordChanged(
            recordType: recordType,
            recordId: id,
            reason: "push",
            recordData: nil
          )

          // Keep existing RN listeners working.
          if recordType == PhoneCloudKit.Defaults.notificationRecordType {
            CloudKitSyncBridge.notifyNotificationUpdated(id)
          } else if recordType == PhoneCloudKit.Defaults.bucketRecordType {
            CloudKitSyncBridge.notifyBucketUpdated(id)
          }

          completionHandler(.newData)
        }
      }
      return
    }

    // For zone-level notifications, we don't have a recordID.
    CloudKitSyncBridge.notifyRecordChanged(
      recordType: "Zone",
      recordId: ckNotification.subscriptionID ?? "unknown",
      reason: "push_zone",
      recordData: nil
    )
    completionHandler(.newData)
  }

  private static func extractZentikId(fromRecordName recordName: String) -> String {
    if recordName.hasPrefix("Notification-") {
      return recordName.replacingOccurrences(of: "Notification-", with: "")
    }
    if recordName.hasPrefix("Bucket-") {
      return recordName.replacingOccurrences(of: "Bucket-", with: "")
    }
    return recordName
  }
  
}
