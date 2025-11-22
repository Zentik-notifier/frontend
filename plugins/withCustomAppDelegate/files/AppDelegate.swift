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
    
    // Initialize WatchConnectivity early to handle background transfers from Watch
    // This ensures WCSession is activated even if React Native hasn't started yet
    _ = iPhoneWatchConnectivityManager.shared
    
    // Listen for Darwin notifications from NSE about new notifications
    setupDarwinNotificationListener()

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
    let userInfo = notification.request.content.userInfo
    let notificationId = userInfo["notificationId"] as? String ?? notification.request.identifier
    
    // Single log for foreground notification
    LoggingSystem.shared.info(
      tag: "AppDelegate",
      message: "Notification received in foreground",
      metadata: ["notificationId": notificationId],
      source: "AppDelegate"
    )
    
    // NOTE: No need to notify Watch here - NSE already sent Darwin notification
    // Darwin system handles all cases: foreground, background, app closed
    
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
    let notificationName = KeychainAccess.getDarwinNotificationName() as CFString
    
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
    
    LoggingSystem.shared.info(
      tag: "Darwin",
      message: "Listener setup complete",
      metadata: ["darwinName": notificationName as String],
      source: "AppDelegate"
    )
  }
  
  /// Handle notification from NSE via Darwin notification
  /// Reads notification ID from UserDefaults and forwards it to Watch
  private func handleNewNotificationFromNSE() {
    // Read notification ID from UserDefaults
    let mainBundleId = KeychainAccess.getMainBundleIdentifier()
    let suiteName = "group.\(mainBundleId)"
    
    if let sharedDefaults = UserDefaults(suiteName: suiteName),
       let notificationId = sharedDefaults.string(forKey: "pending_watch_notification_id") {
      
      LoggingSystem.shared.info(
        tag: "Darwin",
        message: "Forwarding notification ID to Watch",
        metadata: ["notificationId": notificationId],
        source: "AppDelegate"
      )
      
      // Send only notification ID to Watch - Watch will fetch full data when needed
      iPhoneWatchConnectivityManager.shared.sendNewNotificationToWatch(notificationId: notificationId)
      
      // Clear the pending ID
      sharedDefaults.removeObject(forKey: "pending_watch_notification_id")
      sharedDefaults.synchronize()
    } else {
      LoggingSystem.shared.warn(
        tag: "Darwin",
        message: "No notification ID found in UserDefaults",
        metadata: ["suiteName": suiteName],
        source: "AppDelegate"
      )
    }
  }
}
