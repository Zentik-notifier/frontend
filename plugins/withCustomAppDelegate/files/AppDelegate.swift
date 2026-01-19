import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider
import UserNotifications
import CloudKit

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
public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?
  
  // Keep reference to Expo's original notification delegate
  private var expoNotificationDelegate: UNUserNotificationCenterDelegate?

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
    
    // Initialize CloudKit schema if needed (creates record types automatically)
    CloudKitManager.shared.initializeSchemaIfNeeded { success, error in
      if success {
        print("☁️ [AppDelegate] CloudKit schema initialized successfully")
        
        // Setup CloudKit subscriptions after schema is initialized
        CloudKitManager.shared.setupSubscriptions { success, error in
          if success {
            print("☁️ [AppDelegate] CloudKit subscriptions setup successfully")
            
            // Fetch and delete Watch logs from CloudKit (if enabled)
            // WatchLog functionality is currently disabled via CloudKitManager.watchLogEnabled flag
            // if CloudKitManager.watchLogEnabled {
            //   CloudKitManager.shared.fetchAndDeleteWatchLogs { logs, fetchError in
            //     if let fetchError = fetchError {
            //       print("☁️ [AppDelegate] Failed to fetch Watch logs: \(fetchError.localizedDescription)")
            //     } else if logs.count > 0 {
            //       print("☁️ [AppDelegate] Fetched \(logs.count) Watch logs from CloudKit")
            //     }
            //   }
            // }
          } else if let error = error {
            print("☁️ [AppDelegate] CloudKit subscriptions setup failed: \(error.localizedDescription)")
          }
        }
      } else if let error = error {
        print("☁️ [AppDelegate] CloudKit schema initialization failed: \(error.localizedDescription)")
      }
    }
    
    // Subscribe to sync progress notifications
    NotificationCenter.default.addObserver(
      forName: CloudKitManager.syncProgressNotification,
      object: nil,
      queue: .main
    ) { notification in
      if let progress = notification.userInfo?["progress"] as? CloudKitManager.SyncProgress {
        // Forward to React Native bridge
        CloudKitSyncBridge.notifySyncProgress(
          currentItem: progress.currentItem,
          totalItems: progress.totalItems,
          itemType: progress.itemType,
          phase: progress.phase
        )
      }
    }
    
    // Register for remote notifications (required for CloudKit subscriptions)
    application.registerForRemoteNotifications()

    return result
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
    if let notification = CKNotification(fromRemoteNotificationDictionary: userInfo as! [String: NSObject]) {
      let subscriptionID = notification.subscriptionID ?? "unknown"
      // Reduced verbosity - only log errors
      CloudKitManager.shared.handleRemoteNotification(userInfo: userInfo, completion: completionHandler)
    } else {
      LoggingSystem.shared.log(
        level: "INFO",
        tag: "CloudKit",
        message: "Non-CloudKit notification - forwarding to super",
        source: "AppDelegate"
      )
      super.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
    }
  }
  
}
