import Expo
import FirebaseCore
import React
import ReactAppDependencyProvider
import UserNotifications
import SQLite3

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
    
    print("📱 [AppDelegate] 🎯 Processing action: \(actionIdentifier)")
    
    logToJSON(
      level: "info",
      tag: "AppDelegate",
      message: "[Action] Notification action received",
      metadata: [
        "actionIdentifier": actionIdentifier,
        "notificationId": userInfo["notificationId"] as? String ?? "unknown"
      ]
    )
    
    // Log keychain data availability
    if let apiEndpoint = getApiEndpoint() {
      print("📱 [AppDelegate] 🔑 API Endpoint from keychain: \(apiEndpoint)")
    } else {
      print("📱 [AppDelegate] ⚠️ API Endpoint NOT found in keychain")
    }
    
    if let authToken = getStoredAuthToken() {
      print("📱 [AppDelegate] 🔑 Auth Token from keychain: \(String(authToken.prefix(10)))...")
    } else {
      print("📱 [AppDelegate] ⚠️ Auth Token NOT found in keychain")
    }
    
    // Parse action from identifier (format: action_TYPE_VALUE)
    guard let action = parseActionIdentifier(actionIdentifier, from: userInfo) else {
      print("📱 [AppDelegate] ⚠️ Could not parse action identifier")
      return
    }
    
    print("📱 [AppDelegate] 📋 Action type: \(action["type"] ?? "unknown")")
    print("📱 [AppDelegate] 📋 Action value: \(action["value"] ?? "unknown")")
    
    // Execute action based on type, passing userInfo for bucketId extraction
    executeAction(action, userInfo: userInfo)
  }
  
  private func parseActionIdentifier(_ identifier: String, from userInfo: [AnyHashable: Any]) -> [String: String]? {
    // Handle default tap (open app)
    if identifier == UNNotificationDefaultActionIdentifier {
      print("📱 [AppDelegate] Default tap action")
      if let tapAction = userInfo["tapAction"] as? [String: Any],
         let type = tapAction["type"] as? String,
         let value = tapAction["value"] as? String {
        return ["type": type, "value": value]
      }
      return ["type": "OPEN_APP", "value": "default"]
    }
    
    // Parse custom action (format: action_TYPE_VALUE)
    // Known action types (in order of specificity to match longest first)
    let knownTypes = [
      "MARK_AS_READ",
      "BACKGROUND_CALL",
      "POSTPONE",
      "WEBHOOK",
      "SNOOZE",
      "DELETE"
    ]
    
    // Try to match known action types
    for actionType in knownTypes {
      let prefix = "action_\(actionType)_"
      if identifier.hasPrefix(prefix) {
        let value = String(identifier.dropFirst(prefix.count))
        print("📱 [AppDelegate] ✅ Matched action type: \(actionType), value: \(value)")
        return ["type": actionType, "value": value]
      }
    }
    
    // Fallback: generic parsing
    let components = identifier.split(separator: "_")
    guard components.count >= 3 else { return nil }
    
    let type = String(components[1])
    let value = components.dropFirst(2).joined(separator: "_")
    
    print("📱 [AppDelegate] ⚠️ Fallback parsing - type: \(type), value: \(value)")
    return ["type": type, "value": value]
  }
  
  private func executeAction(_ action: [String: String], userInfo: [AnyHashable: Any]) {
    guard let type = action["type"], let value = action["value"] else {
      print("📱 [AppDelegate] ❌ Invalid action format")
      return
    }
    
    print("📱 [AppDelegate] ⚡️ Executing action: \(type) - \(value)")
    
    // Extract notificationId from userInfo (needed for most actions)
    let notificationId = userInfo["notificationId"] as? String ?? ""
    
    switch type {
    case "MARK_AS_READ":
      handleMarkAsRead(notificationId: notificationId, userInfo: userInfo)
      
    case "DELETE":
      handleDelete(notificationId: notificationId, userInfo: userInfo)
      
    case "SNOOZE":
      handleSnooze(minutes: value, userInfo: userInfo)
      
    case "POSTPONE":
      handlePostpone(notificationId: notificationId, minutes: value, userInfo: userInfo)
      
    case "BACKGROUND_CALL":
      handleAPICall(urlString: value, userInfo: userInfo)
      
    case "WEBHOOK":
      handleWebhook(webhookId: value, userInfo: userInfo)
      
    default:
      print("📱 [AppDelegate] ⚠️ Unknown action type: \(type)")
    }
  }
  
  // MARK: - Action Handlers
  
  private func handleMarkAsRead(notificationId: String, userInfo: [AnyHashable: Any]) {
    print("📱 [AppDelegate] ✅ Mark as read: \(notificationId)")
    
    logToJSON(
      level: "info",
      tag: "AppDelegate",
      message: "[Action] Mark as read started",
      metadata: ["notificationId": notificationId]
    )
    
    Task {
      do {
        try await markNotificationAsRead(notificationId: notificationId, userInfo: userInfo)
        print("📱 [AppDelegate] ✅ Notification marked as read on server")
        
        logToJSON(
          level: "info",
          tag: "AppDelegate",
          message: "[Action] Mark as read - Server updated successfully",
          metadata: ["notificationId": notificationId]
        )
        
        // Update local database
        markNotificationAsReadInDatabase(notificationId: notificationId)
      } catch {
        print("📱 [AppDelegate] ❌ Failed to mark as read: \(error)")
        
        logToJSON(
          level: "error",
          tag: "AppDelegate",
          message: "[Action] Mark as read failed",
          metadata: [
            "notificationId": notificationId,
            "error": error.localizedDescription
          ]
        )
      }
    }
  }
  
  private func handleDelete(notificationId: String, userInfo: [AnyHashable: Any]) {
    print("📱 [AppDelegate] 🗑️ Delete: \(notificationId)")
    
    logToJSON(
      level: "info",
      tag: "AppDelegate",
      message: "[Action] Delete notification started",
      metadata: ["notificationId": notificationId]
    )
    
    Task {
      do {
        try await deleteNotificationFromServer(notificationId: notificationId, userInfo: userInfo)
        print("📱 [AppDelegate] ✅ Notification deleted from server")
        
        logToJSON(
          level: "info",
          tag: "AppDelegate",
          message: "[Action] Delete - Server updated successfully",
          metadata: ["notificationId": notificationId]
        )
        
        // Update local database and badge
        deleteNotificationFromDatabase(notificationId: notificationId)
        decrementBadgeCount()
      } catch {
        print("📱 [AppDelegate] ❌ Failed to delete: \(error)")
        
        logToJSON(
          level: "error",
          tag: "AppDelegate",
          message: "[Action] Delete failed",
          metadata: [
            "notificationId": notificationId,
            "error": error.localizedDescription
          ]
        )
      }
    }
  }
  
  private func handleSnooze(minutes: String, userInfo: [AnyHashable: Any]) {
    print("📱 [AppDelegate] ⏰ Snooze \(minutes) min")
    
    guard let mins = Int(minutes) else {
      print("📱 [AppDelegate] ❌ Invalid snooze minutes: \(minutes)")
      return
    }
    
    Task {
      do {
        try await snoozeViaBucketsEndpoint(minutes: mins, userInfo: userInfo)
        print("📱 [AppDelegate] ✅ Bucket snoozed for \(mins) minutes")
      } catch {
        print("📱 [AppDelegate] ❌ Failed to snooze: \(error)")
      }
    }
  }
  
  private func handlePostpone(notificationId: String, minutes: String, userInfo: [AnyHashable: Any]) {
    print("📱 [AppDelegate] ⏱️ Postpone \(minutes) min: \(notificationId)")
    
    guard let mins = Int(minutes) else {
      print("📱 [AppDelegate] ❌ Invalid postpone minutes: \(minutes)")
      return
    }
    
    Task {
      do {
        try await postponeViaNotificationsEndpoint(notificationId: notificationId, minutes: mins, userInfo: userInfo)
        print("📱 [AppDelegate] ✅ Notification postponed for \(mins) minutes")
      } catch {
        print("📱 [AppDelegate] ❌ Failed to postpone: \(error)")
      }
    }
  }
  
  private func handleAPICall(urlString: String, userInfo: [AnyHashable: Any]) {
    print("📱 [AppDelegate] 🔌 API Call: \(urlString)")
    
    // Parse method and URL (format: METHOD::URL)
    let parts = urlString.split(separator: ":", maxSplits: 2).map(String.init)
    guard parts.count >= 2 else {
      print("📱 [AppDelegate] ❌ Invalid API call format")
      return
    }
    
    let method = parts[0]
    let url = parts.dropFirst().joined(separator: ":")
    
    Task {
      do {
        try await executeBackgroundCall(method: method, url: url, userInfo: userInfo)
        print("📱 [AppDelegate] ✅ API call successful")
      } catch {
        print("📱 [AppDelegate] ❌ API call failed: \(error)")
      }
    }
  }
  
  private func handleWebhook(webhookId: String, userInfo: [AnyHashable: Any]) {
    print("📱 [AppDelegate] 🪝 Webhook: \(webhookId)")
    
    logToJSON(
      level: "info",
      tag: "AppDelegate",
      message: "[Action] Webhook execution started",
      metadata: ["webhookId": webhookId]
    )
    
    Task {
      do {
        try await executeWebhook(webhookId: webhookId, userInfo: userInfo)
        print("📱 [AppDelegate] ✅ Webhook executed")
        
        logToJSON(
          level: "info",
          tag: "AppDelegate",
          message: "[Action] Webhook executed successfully",
          metadata: ["webhookId": webhookId]
        )
      } catch {
        print("📱 [AppDelegate] ❌ Failed to execute webhook: \(error)")
        
        logToJSON(
          level: "error",
          tag: "AppDelegate",
          message: "[Action] Webhook execution failed",
          metadata: [
            "webhookId": webhookId,
            "error": error.localizedDescription
          ]
        )
      }
    }
  }
  
  // MARK: - Network Operations
  
  private func markNotificationAsRead(notificationId: String, userInfo: [AnyHashable: Any]) async throws {
    print("📱 [AppDelegate] 📡 Marking notification as read: \(notificationId)")
    
    guard let apiEndpoint = getApiEndpoint() else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found in keychain"])
    }
    
    let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)/read"
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "PATCH"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    if let authToken = getStoredAuthToken() {
      request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    }
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse {
      print("📱 [AppDelegate] 📥 Mark as read response: \(httpResponse.statusCode)")
      if httpResponse.statusCode >= 400 {
        let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
      }
    }
  }
  
  private func deleteNotificationFromServer(notificationId: String, userInfo: [AnyHashable: Any]) async throws {
    print("📱 [AppDelegate] 📡 Deleting notification: \(notificationId)")
    
    guard let apiEndpoint = getApiEndpoint() else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found in keychain"])
    }
    
    let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)"
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "DELETE"
    
    if let authToken = getStoredAuthToken() {
      request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    }
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse {
      print("📱 [AppDelegate] 📥 Delete response: \(httpResponse.statusCode)")
      if httpResponse.statusCode >= 400 {
        let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
      }
    }
  }
  
  private func postponeViaNotificationsEndpoint(notificationId: String, minutes: Int, userInfo: [AnyHashable: Any]) async throws {
    print("📱 [AppDelegate] ⏳ Postponing notification \(notificationId) for \(minutes) minutes")
    
    guard let apiEndpoint = getApiEndpoint() else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found in keychain"])
    }
    
    let urlString = "\(apiEndpoint)/api/v1/notifications/postpone"
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    if let authToken = getStoredAuthToken() {
      request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    }
    
    let body: [String: Any] = [
      "notificationId": notificationId,
      "minutes": minutes
    ]
    request.httpBody = try JSONSerialization.data(withJSONObject: body)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse {
      print("📱 [AppDelegate] 📥 Postpone response: \(httpResponse.statusCode)")
      if httpResponse.statusCode >= 400 {
        let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
      }
    }
  }
  
  private func snoozeViaBucketsEndpoint(minutes: Int, userInfo: [AnyHashable: Any]) async throws {
    print("📱 [AppDelegate] ⏰ Snoozing bucket for \(minutes) minutes")
    
    guard let bucketId = userInfo["bucketId"] as? String else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Bucket ID not found"])
    }
    
    guard let apiEndpoint = getApiEndpoint() else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found in keychain"])
    }
    
    let urlString = "\(apiEndpoint)/api/v1/buckets/\(bucketId)/snooze-minutes"
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    if let authToken = getStoredAuthToken() {
      request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    }
    
    let requestBody = ["minutes": minutes]
    request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse {
      print("📱 [AppDelegate] 📥 Snooze response: \(httpResponse.statusCode)")
      if httpResponse.statusCode >= 400 {
        let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
      }
    }
  }
  
  private func executeBackgroundCall(method: String, url: String, userInfo: [AnyHashable: Any]) async throws {
    print("📱 [AppDelegate] 📞 Executing background call: \(method) \(url)")
    
    guard let apiURL = URL(string: url) else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
    }
    
    var request = URLRequest(url: apiURL)
    request.httpMethod = method
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse {
      print("📱 [AppDelegate] 📥 Background call response: \(httpResponse.statusCode)")
      if httpResponse.statusCode >= 400 {
        let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
      }
    }
  }
  
  private func executeWebhook(webhookId: String, userInfo: [AnyHashable: Any]) async throws {
    print("📱 [AppDelegate] 📡 Executing webhook: \(webhookId)")
    
    guard let apiEndpoint = getApiEndpoint() else {
      throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found in keychain"])
    }
    
    let urlString = "\(apiEndpoint)/api/v1/webhooks/\(webhookId)/execute"
    guard let url = URL(string: urlString) else {
      throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
    }
    
    var request = URLRequest(url: url)
    request.httpMethod = "POST"
    request.setValue("application/json", forHTTPHeaderField: "Content-Type")
    
    if let authToken = getStoredAuthToken() {
      request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
    }
    
    let (data, response) = try await URLSession.shared.data(for: request)
    
    if let httpResponse = response as? HTTPURLResponse {
      print("📱 [AppDelegate] 📥 Webhook response: \(httpResponse.statusCode)")
      if httpResponse.statusCode >= 400 {
        let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
        throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
      }
    }
  }
  
  // MARK: - Keychain Access (copied from NCE)
  
  private func getMainBundleIdentifier() -> String {
    return Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik.dev"
  }
  
  private func getKeychainAccessGroup() -> String {
    let bundleIdentifier = getMainBundleIdentifier()
    return "C3F24V5NS5.\(bundleIdentifier).keychain"
  }
  
  private func getApiEndpoint() -> String? {
    let accessGroup = getKeychainAccessGroup()
    
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-api-endpoint",
      kSecAttrAccount as String: "endpoint",
      kSecAttrAccessGroup as String: accessGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    if status == errSecSuccess, let data = result as? Data, let endpoint = String(data: data, encoding: .utf8) {
      print("📱 [AppDelegate] ✅ API endpoint from keychain: \(endpoint)")
      return endpoint
    }
    
    print("📱 [AppDelegate] ⚠️ Using fallback API endpoint")
    return "https://notifier-api.zentik.app"
  }
  
  private func getStoredAuthToken() -> String? {
    let bundleIdentifier = getMainBundleIdentifier()
    let accessGroup = getKeychainAccessGroup()
    
    print("📱 [AppDelegate] 🔍 Trying to get auth token from keychain")
    print("📱 [AppDelegate] 📦 Bundle ID: \(bundleIdentifier)")
    print("📱 [AppDelegate] 🔐 Access Group: \(accessGroup)")
    
    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-auth",
      kSecAttrAccessGroup as String: accessGroup,
      kSecReturnAttributes as String: true,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne
    ]
    
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    
    print("📱 [AppDelegate] 🔍 Keychain query status: \(status)")
    
    if status == errSecSuccess {
      if let item = result as? [String: Any] {
        print("📱 [AppDelegate] ✅ Found keychain item")
        
        // Try to get token from kSecAttrAccount (react-native-keychain format)
        if let account = item[kSecAttrAccount as String] as? String {
          print("📱 [AppDelegate] ✅ Auth token from kSecAttrAccount: \(account.prefix(20))...")
          return account
        }
        
        // Fallback: try to get from data
        if let data = item[kSecValueData as String] as? Data {
          if let token = String(data: data, encoding: .utf8) {
            print("📱 [AppDelegate] ✅ Auth token from data: \(token.prefix(20))...")
            return token
          }
        }
        
        print("📱 [AppDelegate] ❌ Could not extract token from keychain item")
      }
    } else {
      print("📱 [AppDelegate] ❌ Keychain error: \(status)")
    }
    
    return nil
  }
  
  // MARK: - Shared Directory Access (copied from NCE)
  
  private func getSharedMediaCacheDirectory() -> URL {
    let bundleIdentifier = getMainBundleIdentifier()
    let appGroupIdentifier = "group.\(bundleIdentifier)"
    
    print("📱 [AppDelegate] 🔍 App Group identifier: \(appGroupIdentifier)")
    
    if let sharedContainerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
      let cacheDirectory = sharedContainerURL.appendingPathComponent("shared_media_cache")
      
      // Ensure the cache directory exists
      if !FileManager.default.fileExists(atPath: cacheDirectory.path) {
        do {
          try FileManager.default.createDirectory(at: cacheDirectory, withIntermediateDirectories: true, attributes: nil)
          print("📱 [AppDelegate] ✅ Created shared media cache directory: \(cacheDirectory.path)")
        } catch {
          print("📱 [AppDelegate] ❌ Failed to create shared cache directory: \(error)")
        }
      }
      
      return cacheDirectory
    }
    
    // Fallback to temporary directory
    print("📱 [AppDelegate] ⚠️ App Group not available, using temporary directory")
    return FileManager.default.temporaryDirectory
  }
  
  // MARK: - Local Database Operations
  
  private func getDbPath() -> String {
    let dir = getSharedMediaCacheDirectory()
    let dbPath = dir.appendingPathComponent("cache.db").path
    print("📱 [AppDelegate] 📊 Database path: \(dbPath)")
    return dbPath
  }
  
  private func markNotificationAsReadInDatabase(notificationId: String) {
    let dbPath = getDbPath()
    guard FileManager.default.fileExists(atPath: dbPath) else {
      print("📱 [AppDelegate] ⚠️ Database not found at: \(dbPath)")
      return
    }
    
    var db: OpaquePointer?
    guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
      print("📱 [AppDelegate] ❌ Failed to open database")
      return
    }
    
    defer { sqlite3_close(db) }
    
    let sql = "UPDATE notifications SET read_at = ? WHERE id = ?"
    var stmt: OpaquePointer?
    
    guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
      print("📱 [AppDelegate] ❌ Failed to prepare UPDATE statement")
      return
    }
    
    defer { sqlite3_finalize(stmt) }
    
    let readAtTimestamp = Int64(Date().timeIntervalSince1970 * 1000)
    sqlite3_bind_int64(stmt, 1, readAtTimestamp)
    sqlite3_bind_text(stmt, 2, (notificationId as NSString).utf8String, -1, nil)
    
    if sqlite3_step(stmt) == SQLITE_DONE {
      print("📱 [AppDelegate] ✅ Notification marked as read in local DB")
      
      logToJSON(
        level: "info",
        tag: "AppDelegate-DB",
        message: "[Database] Notification marked as read in local cache",
        metadata: ["notificationId": notificationId]
      )
    } else {
      print("📱 [AppDelegate] ❌ Failed to mark as read in local DB")
      
      logToJSON(
        level: "error",
        tag: "AppDelegate-DB",
        message: "[Database] Failed to mark notification as read",
        metadata: ["notificationId": notificationId]
      )
    }
  }
  
  private func deleteNotificationFromDatabase(notificationId: String) {
    let dbPath = getDbPath()
    guard FileManager.default.fileExists(atPath: dbPath) else {
      print("📱 [AppDelegate] ⚠️ Database not found at: \(dbPath)")
      return
    }
    
    var db: OpaquePointer?
    guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
      print("📱 [AppDelegate] ❌ Failed to open database")
      return
    }
    
    defer { sqlite3_close(db) }
    
    let sql = "DELETE FROM notifications WHERE id = ?"
    var stmt: OpaquePointer?
    
    guard sqlite3_prepare_v2(db, sql, -1, &stmt, nil) == SQLITE_OK else {
      print("📱 [AppDelegate] ❌ Failed to prepare DELETE statement")
      return
    }
    
    defer { sqlite3_finalize(stmt) }
    
    sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, nil)
    
    if sqlite3_step(stmt) == SQLITE_DONE {
      print("📱 [AppDelegate] ✅ Notification deleted from local DB")
    } else {
      print("📱 [AppDelegate] ❌ Failed to delete from local DB")
    }
  }
  
  private func decrementBadgeCount() {
    print("📱 [AppDelegate] 🔢 Decrementing badge count...")
    
    DispatchQueue.main.async {
      let currentCount = UIApplication.shared.applicationIconBadgeNumber
      let newCount = max(0, currentCount - 1)
      UIApplication.shared.applicationIconBadgeNumber = newCount
      print("📱 [AppDelegate] ✅ Badge count updated from \(currentCount) to \(newCount)")
    }
  }
  
  // MARK: - Structured Logging
  
  private struct LogEntry: Codable {
    let id: String
    let level: String
    let tag: String?
    let message: String
    let metadata: [String: String]?
    let timestamp: Int64
    let source: String
  }
  
  private static var logBuffer: [LogEntry] = []
  private static var logBufferLock = NSLock()
  private static let BATCH_SIZE = 20
  private static var flushTimer: Timer?
  
  private func logToJSON(
    level: String,
    tag: String? = nil,
    message: String,
    metadata: [String: Any]? = nil
  ) {
    let timestamp = Int64(Date().timeIntervalSince1970 * 1000)
    
    // Convert metadata to string dictionary for JSON encoding
    var metadataStrings: [String: String]?
    if let metadata = metadata {
      metadataStrings = metadata.reduce(into: [String: String]()) { result, item in
        if let stringValue = item.value as? String {
          result[item.key] = stringValue
        } else if let numberValue = item.value as? NSNumber {
          result[item.key] = numberValue.stringValue
        } else if let boolValue = item.value as? Bool {
          result[item.key] = boolValue ? "true" : "false"
        } else {
          // Convert complex objects to JSON string
          if let jsonData = try? JSONSerialization.data(withJSONObject: item.value),
             let jsonString = String(data: jsonData, encoding: .utf8) {
            result[item.key] = jsonString
          }
        }
      }
    }
    
    let entry = LogEntry(
      id: UUID().uuidString,
      level: level,
      tag: tag,
      message: message,
      metadata: metadataStrings,
      timestamp: timestamp,
      source: "AppDelegate"
    )
    
    AppDelegate.logBufferLock.lock()
    AppDelegate.logBuffer.append(entry)
    let shouldFlush = AppDelegate.logBuffer.count >= AppDelegate.BATCH_SIZE
    AppDelegate.logBufferLock.unlock()
    
    if shouldFlush {
      flushLogs()
    } else {
      scheduleFlush()
    }
  }
  
  private func scheduleFlush() {
    AppDelegate.logBufferLock.lock()
    if AppDelegate.flushTimer == nil {
      AppDelegate.flushTimer = Timer.scheduledTimer(withTimeInterval: 5.0, repeats: false) { [weak self] _ in
        self?.flushLogs()
      }
    }
    AppDelegate.logBufferLock.unlock()
  }
  
  private func flushLogs() {
    AppDelegate.logBufferLock.lock()
    
    guard !AppDelegate.logBuffer.isEmpty else {
      AppDelegate.logBufferLock.unlock()
      return
    }
    
    let logsToFlush = AppDelegate.logBuffer
    AppDelegate.logBuffer.removeAll()
    AppDelegate.flushTimer?.invalidate()
    AppDelegate.flushTimer = nil
    
    AppDelegate.logBufferLock.unlock()
    
    // Write logs to database
    writeLogsToDatabase(logsToFlush)
  }
  
  private func writeLogsToDatabase(_ logs: [LogEntry]) {
    let dbPath = getDbPath()
    guard FileManager.default.fileExists(atPath: dbPath) else {
      print("📱 [AppDelegate] ⚠️ Database not found for logging: \(dbPath)")
      return
    }
    
    var db: OpaquePointer?
    guard sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) == SQLITE_OK else {
      print("📱 [AppDelegate] ❌ Failed to open database for logging")
      return
    }
    
    defer { sqlite3_close(db) }
    
    // Create logs table if not exists
    let createTableSQL = """
    CREATE TABLE IF NOT EXISTS logs (
      id TEXT PRIMARY KEY,
      level TEXT NOT NULL,
      tag TEXT,
      message TEXT NOT NULL,
      metadata TEXT,
      timestamp INTEGER NOT NULL,
      source TEXT NOT NULL
    )
    """
    
    if sqlite3_exec(db, createTableSQL, nil, nil, nil) != SQLITE_OK {
      print("📱 [AppDelegate] ❌ Failed to create logs table")
      return
    }
    
    // Insert logs
    let insertSQL = "INSERT OR REPLACE INTO logs (id, level, tag, message, metadata, timestamp, source) VALUES (?, ?, ?, ?, ?, ?, ?)"
    var stmt: OpaquePointer?
    
    guard sqlite3_prepare_v2(db, insertSQL, -1, &stmt, nil) == SQLITE_OK else {
      print("📱 [AppDelegate] ❌ Failed to prepare log insert statement")
      return
    }
    
    defer { sqlite3_finalize(stmt) }
    
    for log in logs {
      sqlite3_bind_text(stmt, 1, (log.id as NSString).utf8String, -1, nil)
      sqlite3_bind_text(stmt, 2, (log.level as NSString).utf8String, -1, nil)
      
      if let tag = log.tag {
        sqlite3_bind_text(stmt, 3, (tag as NSString).utf8String, -1, nil)
      } else {
        sqlite3_bind_null(stmt, 3)
      }
      
      sqlite3_bind_text(stmt, 4, (log.message as NSString).utf8String, -1, nil)
      
      if let metadata = log.metadata,
         let jsonData = try? JSONSerialization.data(withJSONObject: metadata),
         let jsonString = String(data: jsonData, encoding: .utf8) {
        sqlite3_bind_text(stmt, 5, (jsonString as NSString).utf8String, -1, nil)
      } else {
        sqlite3_bind_null(stmt, 5)
      }
      
      sqlite3_bind_int64(stmt, 6, log.timestamp)
      sqlite3_bind_text(stmt, 7, (log.source as NSString).utf8String, -1, nil)
      
      if sqlite3_step(stmt) != SQLITE_DONE {
        print("📱 [AppDelegate] ❌ Failed to insert log entry")
      }
      
      sqlite3_reset(stmt)
    }
    
    print("📱 [AppDelegate] ✅ Flushed \(logs.count) log entries to database")
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
