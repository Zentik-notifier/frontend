import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider
import UserNotifications

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
    print("📱 [AppDelegate] Notification delegate set (with Expo delegate saved)")
    
    // Initialize WatchConnectivity early to handle background transfers from Watch
    // This ensures WCSession is activated even if React Native hasn't started yet
    _ = iPhoneWatchConnectivityManager.shared
    print("📱 [AppDelegate] WatchConnectivity initialized early")
    
    // Listen for Darwin notifications from NSE about new notifications
    setupDarwinNotificationListener()

    return result
  }
  
  public override func application(
    _ application: UIApplication,
    didReceiveRemoteNotification userInfo: [AnyHashable: Any],
    fetchCompletionHandler completionHandler: @escaping (UIBackgroundFetchResult) -> Void
  ) {
    super.application(application, didReceiveRemoteNotification: userInfo, fetchCompletionHandler: completionHandler)
  }
  
  // MARK: - UNUserNotificationCenterDelegate
  
  /// Called when user taps a notification action
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    didReceive response: UNNotificationResponse,
    withCompletionHandler completionHandler: @escaping () -> Void
  ) {
    print("📱 [AppDelegate] ========== ACTION RESPONSE RECEIVED ==========")
    print("📱 [AppDelegate] Action identifier: \(response.actionIdentifier)")
    print("📱 [AppDelegate] Notification ID: \(response.notification.request.identifier)")
    
    let userInfo = response.notification.request.content.userInfo
    print("📱 [AppDelegate] UserInfo: \(userInfo)")
    
    // Log action to database
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "[UserAction] Notification action triggered",
      metadata: [
        "actionIdentifier": response.actionIdentifier,
        "notificationId": response.notification.request.identifier,
        "appState": UIApplication.shared.applicationState == .active ? "foreground" : "background"
      ],
      source: "AppDelegate"
    )
    
    // Handle the action in Swift (for background operations)
    handleNotificationAction(response: response)
    
    // CRITICAL: Propagate event to Expo delegate for React Native listeners
    if let expoDelegate = expoNotificationDelegate {
      expoDelegate.userNotificationCenter?(
        center,
        didReceive: response,
        withCompletionHandler: completionHandler
      )
    } else {
      completionHandler()
    }
  }
  
  /// Called when a notification arrives while app is in foreground
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    print("📱 [AppDelegate] Notification will present in foreground")
    
    let userInfo = notification.request.content.userInfo
    print("📱 [AppDelegate] UserInfo: \(userInfo)")
    
    // Log to database
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "Notification received in foreground",
      metadata: ["notificationId": notification.request.identifier],
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
  
  private func handleNotificationAction(response: UNNotificationResponse) {
    let actionIdentifier = response.actionIdentifier
    let userInfo = response.notification.request.content.userInfo
    let notificationId = userInfo["notificationId"] as? String ?? ""
    
    print("📱 [AppDelegate] 🎯 Processing action: \(actionIdentifier)")
    
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "[Action] Notification action received",
      metadata: [
        "actionIdentifier": actionIdentifier,
        "notificationId": notificationId
      ],
      source: "AppDelegate"
    )
    
    // Log keychain data availability
    if let endpoint = KeychainAccess.getApiEndpoint() {
      print("📱 [AppDelegate] 🔑 API Endpoint from keychain: \(endpoint)")
    } else {
      print("📱 [AppDelegate] ⚠️ API Endpoint NOT found in keychain")
    }
    
    if let token = KeychainAccess.getStoredAuthToken() {
      print("📱 [AppDelegate] 🔑 Auth Token from keychain: \(String(token.prefix(10)))...")
    } else {
      print("📱 [AppDelegate] ⚠️ Auth Token NOT found in keychain")
    }
    
    // Parse action using shared handler
    guard let action = NotificationActionHandler.parseActionIdentifier(actionIdentifier, from: userInfo) else {
      print("📱 [AppDelegate] ⚠️ Could not parse action identifier")
      return
    }
    
    print("📱 [AppDelegate] 📋 Action type: \(action["type"] ?? "unknown")")
    print("📱 [AppDelegate] 📋 Action value: \(action["value"] ?? "unknown")")
    
    // Execute action using shared handler
    guard let type = action["type"], let value = action["value"] else {
      print("📱 [AppDelegate] ❌ Invalid action format")
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
        print("📱 [AppDelegate] ✅ Action completed successfully")
        
        // Notify Watch via WatchConnectivity after successful action
        if type.uppercased() == "MARK_AS_READ" {
          let readAt = ISO8601DateFormatter().string(from: Date())
          iPhoneWatchConnectivityManager.shared.notifyWatchNotificationRead(
            notificationId: notificationId,
            readAt: readAt
          )
        } else if type.uppercased() == "DELETE" {
          iPhoneWatchConnectivityManager.shared.notifyWatchNotificationDeleted(
            notificationId: notificationId
          )
        }
        
      case .failure(let error):
        print("📱 [AppDelegate] ❌ Action failed: \(error.localizedDescription)")
      }
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
  
  // MARK: - Darwin Notifications
  
  /// Setup listener for Darwin notifications from NSE
  private func setupDarwinNotificationListener() {
    let notificationName = "com.zentik.notification.new" as CFString
    
    // Use Darwin notification center (works across processes)
    let observer = Unmanaged.passUnretained(self).toOpaque()
    CFNotificationCenterAddObserver(
      CFNotificationCenterGetDarwinNotifyCenter(),
      observer,
      { (center, observer, name, object, userInfo) in
        // This callback is called when NSE posts a Darwin notification
        guard let observer = observer else { return }
        let appDelegate = Unmanaged<AppDelegate>.fromOpaque(observer).takeUnretainedValue()
        appDelegate.handleNewNotificationFromNSE()
      },
      notificationName,
      nil,
      .deliverImmediately
    )
    
    print("📱 [AppDelegate] ✅ Listening for Darwin notifications from NSE")
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "Darwin notification listener setup complete",
      source: "AppDelegate"
    )
  }
  
  /// Handle notification from NSE via Darwin notification
  private func handleNewNotificationFromNSE() {
    print("📱 [AppDelegate] 📬 Received Darwin notification from NSE - new notification available")
    
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "Received Darwin notification from NSE",
      source: "AppDelegate"
    )
    
    // Read latest notification from SQLite and notify Watch
    // This runs in the main app process which has WatchConnectivity access
    iPhoneWatchConnectivityManager.shared.syncLatestNotificationToWatch()
  }
}
