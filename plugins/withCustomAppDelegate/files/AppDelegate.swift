import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider
import UserNotifications
import ZentikShared

@UIApplicationMain
public class AppDelegate: ExpoAppDelegate, UNUserNotificationCenterDelegate {
  var window: UIWindow?

  var reactNativeDelegate: ExpoReactNativeFactoryDelegate?
  var reactNativeFactory: RCTReactNativeFactory?

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

    // Set notification delegate to handle action responses
    UNUserNotificationCenter.current().delegate = self
    print("📱 [AppDelegate] Notification delegate set")

    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
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
    
    // Handle the action
    handleNotificationAction(response: response)
    
    completionHandler()
  }
  
  /// Called when a notification arrives while app is in foreground
  public func userNotificationCenter(
    _ center: UNUserNotificationCenter,
    willPresent notification: UNNotification,
    withCompletionHandler completionHandler: @escaping (UNNotificationPresentationOptions) -> Void
  ) {
    print("📱 [AppDelegate] Notification will present in foreground")
    
    // Show notification even when app is in foreground
    if #available(iOS 14.0, *) {
      completionHandler([.banner, .sound, .badge])
    } else {
      completionHandler([.alert, .sound, .badge])
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
}

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
