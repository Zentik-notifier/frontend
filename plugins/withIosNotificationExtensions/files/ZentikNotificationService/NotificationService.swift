import CryptoKit
import Intents
import SQLite3
import Security
import UIKit
import UniformTypeIdentifiers
import UserNotifications
import WatchConnectivity

// SQLite helper for Swift bindings
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

class NotificationService: UNNotificationServiceExtension {

  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?
  var currentNotificationId: String?
  
  // Database queue for thread-safe operations
  private static let dbQueue = DispatchQueue(label: "com.zentik.nse.database", qos: .userInitiated)
  
  // Database operation configuration
  private static let DB_OPERATION_TIMEOUT: TimeInterval = 5.0  // Max 5 seconds per operation
  private static let DB_BUSY_TIMEOUT: Int32 = 3000  // 3 seconds busy timeout
  private static let DB_MAX_RETRIES: Int = 3  // Max 3 retry attempts

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    print("📱 [NotificationService] ========== NOTIFICATION RECEIVED ==========")
    print("📱 [NotificationService] Request identifier: \(request.identifier)")
    print("📱 [NotificationService] Title: \(request.content.title)")
    print("📱 [NotificationService] Body: \(request.content.body)")
    print("📱 [NotificationService] UserInfo: \(request.content.userInfo)")
    
    // Log encrypted notification payload
    let notificationId = request.content.userInfo["notificationId"] as? String ?? request.identifier
    var encryptedPayloadMeta: [String: Any] = [
      "notificationId": notificationId,
      "title": request.content.title,
      "body": request.content.body,
      "categoryIdentifier": request.content.categoryIdentifier,
      "badge": request.content.badge ?? 0,
    ]
    
    // Add all userInfo fields (including encrypted payload)
    if let userInfo = request.content.userInfo as? [String: Any] {
      for (key, value) in userInfo {
        if key != "notificationId" { // Already added
          encryptedPayloadMeta[key] = value
        }
      }
    }
    
    logToDatabase(
      level: "info",
      tag: "Payload",
      message: "Encrypted notification received",
      metadata: encryptedPayloadMeta
    )

    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    if let bestAttemptContent = bestAttemptContent {
      // Decrypt encrypted values first
      decryptNotificationContent(content: bestAttemptContent)

      // Store notificationId for media tracking
      if let notificationId = bestAttemptContent.userInfo["notificationId"] as? String {
        self.currentNotificationId = notificationId
      }
      
      // Update badge count before setting up actions
      updateBadgeCount(content: bestAttemptContent)
      
      // Save notification to SQLite database (replaces savePendingNotification)
      self.saveNotificationToDatabase(content: bestAttemptContent)
      
      // Setup custom actions in a synchronized manner
      setupNotificationActions(content: bestAttemptContent) { [weak self] in
        guard let self = self else { return }

        // Check if this notification has media attachments first
        if self.hasMediaAttachments(content: bestAttemptContent) {
          print("📱 [NotificationService] Media attachments detected, starting download...")
          self.downloadMediaAttachments(content: bestAttemptContent) {
            print(
              "📱 [NotificationService] Media processing completed, applying Communication Style...")

            self._handleChatMessage()
            return
          }
        } else {
          print("📱 [NotificationService] No media attachments, applying Communication Style...")

          self._handleChatMessage()
          return
        }
      }
    } else {
      print("📱 [NotificationService] ❌ Failed to create mutable content")
      contentHandler(request.content)
    }
  }

  // MARK: - Communication Notifications (INSendMessageIntent)
  
  func _handleChatMessage() {
    print("📱 [NotificationService] 🎭 Starting Communication Style processing...")
    guard let content = bestAttemptContent else {
      return
    }

    guard let contentHandler = contentHandler else {
      return
    }

    guard let userInfo = content.userInfo as? [String: Any] else {
      print("📱 [NotificationService] 🎭 No userInfo found, skipping Communication Style")
      return
    }

    print("📱 [NotificationService] 🎭 UserInfo keys: \(userInfo.keys.sorted())")

    // Extract bucket/sender fields
    let senderId = userInfo["bucketId"] as? String
    let chatRoomName = userInfo["bucketName"] as? String
    let senderDisplayName = content.title
    let senderThumbnail = userInfo["bucketIconUrl"] as? String
    let bucketColor = userInfo["bucketColor"] as? String

    var senderAvatarImageData: Data?
    
    // Get bucket icon from cache or download from iconUrl or generate temporary placeholder
    if let bucketId = senderId, let bucketName = chatRoomName {
      senderAvatarImageData = MediaAccess.getBucketIconFromSharedCache(
        bucketId: bucketId,
        bucketName: bucketName,
        bucketColor: bucketColor,
        iconUrl: senderThumbnail
      )
        
      if senderAvatarImageData != nil {
        print("📱 [NotificationService] 🎭 ✅ Using bucket icon (cached or generated placeholder)")
      }
      
      // Log avatar configuration
      if let notificationId = content.userInfo["notificationId"] as? String {
        logToDatabase(
          level: "info",
          tag: "Avatar",
          message: "Avatar configuration for communication style",
          metadata: [
            "notificationId": notificationId,
            "bucketId": bucketId,
            "bucketName": bucketName,
            "bucketColor": bucketColor ?? "nil",
            "hasAvatarData": senderAvatarImageData != nil,
            "senderDisplayName": senderDisplayName ?? "nil"
          ]
        )
      }
    }
    
    // profile picture that will be displayed in the notification (left side)
    let senderAvatar: INImage? = senderAvatarImageData.map { INImage(imageData: $0) }

    var personNameComponents = PersonNameComponents()
    personNameComponents.nickname = senderDisplayName

    // the person that sent the message
    // we need that as it is used by the OS trying to identify/match the sender with a contact
    // Setting ".unknown" as type will prevent the OS from trying to match the sender with a contact
    // as here this is an internal identifier and not a phone number or email
    let senderPerson = INPerson(
      personHandle: INPersonHandle(
        value: senderId,
        type: .unknown
      ),
      nameComponents: personNameComponents,
      displayName: senderDisplayName,
      image: senderAvatar,
      contactIdentifier: nil,
      customIdentifier: nil,
      isMe: false,  // this makes the OS recognize this as a sender
      suggestionType: .none
    )

    // this is just a dummy person that will be used as the recipient
    let selfPerson = INPerson(
      personHandle: INPersonHandle(
        value: "00000000-0000-0000-0000-000000000000",  // no need to set a real value here
        type: .unknown
      ),
      nameComponents: nil,
      displayName: nil,
      image: nil,
      contactIdentifier: nil,
      customIdentifier: nil,
      isMe: true,  // this makes the OS recognize this as "US"
      suggestionType: .none
    )

    // Prepare message content: if subtitle exists, prepend it to the body
    print("📱 [NotificationService] 🎭 📝 Original content.subtitle: '\(content.subtitle)'")
    print("📱 [NotificationService] 🎭 📝 Original content.body: '\(content.body)'")
    print("📱 [NotificationService] 🎭 📝 Subtitle isEmpty: \(content.subtitle.isEmpty)")
    
    // IMPORTANT: Modify content.body directly BEFORE creating the intent
    // because content.updating(from:) will use the content's body, not the intent's content
    if !content.subtitle.isEmpty {
      content.body = "\(content.subtitle)\n\(content.body)"
      print("📱 [NotificationService] 🎭 ✅ Modified content.body to include subtitle with newline")
      print("📱 [NotificationService] 🎭 📝 New content.body: '\(content.body)'")
    } else {
      print("📱 [NotificationService] 🎭 ⚠️ Subtitle is empty, using body only")
    }

    // the actual message. We use the OS to send us ourselves a message.
    let incomingMessagingIntent = INSendMessageIntent(
      recipients: [selfPerson],
      outgoingMessageType: .outgoingMessageText,  // This marks the message as outgoing
      content: content.body,  // use the modified body from content
      speakableGroupName: nil,
      conversationIdentifier: chatRoomName,  // this will be used as the conversation title
      serviceName: nil,
      sender: senderPerson,  // this marks the message sender as the person we defined above
      attachments: []
    )
    
    print("📱 [NotificationService] 🎭 📝 Final intent content: '\(incomingMessagingIntent.content ?? "nil")')")

    // Apply image only if we have one (if preference forces app icon, we leave it nil)
    if let senderAvatar = senderAvatar {
      incomingMessagingIntent.setImage(senderAvatar, forParameterNamed: \.sender)
    }

    let interaction = INInteraction(intent: incomingMessagingIntent, response: nil)

    interaction.direction = .incoming

    do {
      // we now update / patch / convert our attempt to a communication notification.
      bestAttemptContent =
        try content.updating(from: incomingMessagingIntent) as? UNMutableNotificationContent

      // IMPORTANT: Ensure notification is delivered to paired Apple Watch
      // By default, iOS notifications with communication style are shown on watch
      // We just need to make sure the payload is preserved
      if let bestContent = bestAttemptContent {
        print("📱 [NotificationService] ⌚️ Notification ready for delivery to iOS and watchOS")
        print("📱 [NotificationService] ⌚️ Category: \(bestContent.categoryIdentifier)")
        print("📱 [NotificationService] ⌚️ UserInfo keys: \(bestContent.userInfo.keys.map { String(describing: $0) }.joined(separator: ", "))")
      }

      // everything went alright, we are ready to display our notification.
      contentHandler(bestAttemptContent!)
      
      // Log successful communication style application
      if let notificationId = content.userInfo["notificationId"] as? String {
        let hasActions = (content.userInfo["actions"] as? [[String: Any]])?.isEmpty == false
        logToDatabase(
          level: "info",
          tag: "Communication",
          message: "Communication style applied successfully - Ready for iOS and watchOS",
          metadata: [
            "notificationId": notificationId,
            "sender": senderDisplayName ?? "unknown",
            "hasSubtitle": !content.subtitle.isEmpty,
            "hasAvatar": senderAvatar != nil,
            "hasActions": hasActions,
            "category": content.categoryIdentifier,
            "watchOSReady": true
          ]
        )
      }
      
      // Flush logs immediately before extension terminates
      print("📱 [NotificationService] 🎯 Processing complete, flushing logs before exit")
      LoggingSystem.shared.flushLogs()
      
    } catch let error {
      print("error \(error)")
      
      // Log communication style error
      if let notificationId = content.userInfo["notificationId"] as? String {
        logToDatabase(
          level: "error",
          tag: "Communication",
          message: "Failed to apply communication style",
          metadata: [
            "notificationId": notificationId,
            "error": error.localizedDescription
          ]
        )
      }
      
      // Flush logs immediately before extension terminates (error case)
      print("📱 [NotificationService] 🎯 Error occurred, flushing logs before exit")
      LoggingSystem.shared.flushLogs()
    }
  }

  // MARK: - Decryption

  private func decryptNotificationContent(content: UNMutableNotificationContent) {
    guard let userInfo = content.userInfo as? [String: Any] else { return }

    print("📱 [NotificationService] 🔍 Raw userInfo before decryption: \(userInfo)")

    // Fast path: single encrypted blob to minimize overhead
    if let enc = userInfo["enc"] as? String, let jsonString = decryptValue(enc) {
      print("📱 [NotificationService] 🔓 Decrypted blob content: \(jsonString)")
      
      if let data = jsonString.data(using: .utf8),
        let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any]
      {
        print("📱 [NotificationService] 🔍 Parsed decrypted object keys: \(obj.keys.sorted())")
        
        if let title = obj["title"] as? String { content.title = title }
        if let body = obj["body"] as? String { content.body = body }
        if let subtitle = obj["subtitle"] as? String { content.subtitle = subtitle }

        var updated = content.userInfo as? [String: Any] ?? [:]
        if let notificationId = obj["notificationId"] { updated["notificationId"] = notificationId }
        if let bucketId = obj["bucketId"] { updated["bucketId"] = bucketId }
        if let bucketName = obj["bucketName"] { updated["bucketName"] = bucketName }
        if let bucketIconUrl = obj["bucketIconUrl"] { updated["bucketIconUrl"] = bucketIconUrl }
        if let bucketColor = obj["bucketColor"] { updated["bucketColor"] = bucketColor }
        if let actions = obj["actions"] as? [[String: Any]] { updated["actions"] = actions }
        if let attachmentData = obj["attachmentData"] as? [[String: Any]] {
          updated["attachmentData"] = attachmentData
        }
        if let tapAction = obj["tapAction"] as? [String: Any] {
          updated["tapAction"] = tapAction
        }
        content.userInfo = updated
        
        // Log complete decrypted payload with all fields
        let notificationId = obj["notificationId"] as? String ?? "unknown"
        var decryptedMeta: [String: Any] = [
          "notificationId": notificationId,
          "title": content.title,
          "body": content.body,
          "subtitle": content.subtitle
        ]
        
        // Add bucket info
        if let bucketId = obj["bucketId"] {
          decryptedMeta["bucketId"] = bucketId
        }
        if let bucketName = obj["bucketName"] {
          decryptedMeta["bucketName"] = bucketName
        }
        if let bucketIconUrl = obj["bucketIconUrl"] {
          decryptedMeta["bucketIconUrl"] = bucketIconUrl
        }
        if let bucketColor = obj["bucketColor"] {
          decryptedMeta["bucketColor"] = bucketColor
        }
        
        // Add actions (as structured array, not stringified)
        if let actions = obj["actions"] as? [[String: Any]] {
          decryptedMeta["actions"] = actions
          decryptedMeta["actionsCount"] = actions.count
        }
        
        // Add attachments (as structured array, not stringified)
        if let attachmentData = obj["attachmentData"] as? [[String: Any]] {
          decryptedMeta["attachmentData"] = attachmentData
          decryptedMeta["attachmentsCount"] = attachmentData.count
        }
        
        // Add tapAction (as structured object, not stringified)
        if let tapAction = obj["tapAction"] as? [String: Any] {
          decryptedMeta["tapAction"] = tapAction
        }
        
        // Add APN fields
        decryptedMeta["badge"] = content.badge ?? 0
        decryptedMeta["categoryIdentifier"] = content.categoryIdentifier
        
        logToDatabase(
          level: "info",
          tag: "Decryption",
          message: "Payload decrypted successfully",
          metadata: decryptedMeta
        )
        
        return
      }
    }
  }

  private func decryptValue(_ encryptedValue: String) -> String? {
    guard let privateKey = getPrivateKey() else {
      print("📱 [NotificationService] ❌ Private key not found")
      logToDatabase(
        level: "error",
        tag: "Decryption",
        message: "Private key not found in keychain",
        metadata: nil
      )
      return nil
    }
    do {
      // Decode base64url to base64
      let base64Value =
        encryptedValue
        .replacingOccurrences(of: "-", with: "+")
        .replacingOccurrences(of: "_", with: "/")
        .padding(toLength: ((encryptedValue.count + 3) / 4) * 4, withPad: "=", startingAt: 0)

      guard let data = Data(base64Encoded: base64Value) else {
        print("📱 [NotificationService] ❌ Invalid base64 payload")
        logToDatabase(
          level: "error",
          tag: "Decryption",
          message: "Invalid base64 payload",
          metadata: nil
        )
        return nil
      }

      if let json = try JSONSerialization.jsonObject(with: data) as? [String: String] {
        guard let encryptedKeyB64 = json["k"],
          let ivB64 = json["i"],
          let encryptedPayloadB64 = json["p"],
          let tagB64 = json["t"]
        else {
          print("📱 [NotificationService] ❌ Missing encryption envelope fields")
          return nil
        }
        guard let encryptedKey = Data(base64Encoded: encryptedKeyB64),
          let iv = Data(base64Encoded: ivB64),
          let encryptedPayload = Data(base64Encoded: encryptedPayloadB64),
          let tag = Data(base64Encoded: tagB64)
        else {
          print("📱 [NotificationService] ❌ Invalid base64 encoding")
          return nil
        }
        let decryptedKey = try decryptAESKey(encryptedKey: encryptedKey, privateKey: privateKey)
        let decryptedPayload = try decryptAESPayload(
          encryptedPayload: encryptedPayload,
          key: decryptedKey,
          iv: iv,
          tag: tag
        )
        return String(data: decryptedPayload, encoding: .utf8)
      } else {
        // Legacy RSA direct payload
        if let plaintext = try? decryptRSAPayload(encryptedPayload: data, privateKey: privateKey) {
          return String(data: plaintext, encoding: .utf8)
        }
        print("📱 [NotificationService] ❌ Unsupported encrypted payload format")
        return nil
      }
    } catch {
      print("📱 [NotificationService] ❌ Decryption failed: \(error)")
      logToDatabase(
        level: "error",
        tag: "Decryption",
        message: "Decryption failed",
        metadata: ["error": error.localizedDescription]
      )
      return nil
    }
  }

  private func decryptAESKey(encryptedKey: Data, privateKey: SecKey) throws -> Data {
    var error: Unmanaged<CFError>?
    guard
      let decryptedKey = SecKeyCreateDecryptedData(
        privateKey,
        .rsaEncryptionOAEPSHA256,
        encryptedKey as CFData,
        &error
      )
    else {
      throw error?.takeRetainedValue()
        ?? NSError(domain: "DecryptionError", code: -1, userInfo: nil)
    }
    return decryptedKey as Data
  }

  private func decryptAESPayload(encryptedPayload: Data, key: Data, iv: Data, tag: Data) throws
    -> Data
  {
    let sealedBox = try AES.GCM.SealedBox(
      nonce: AES.GCM.Nonce(data: iv),
      ciphertext: encryptedPayload,
      tag: tag
    )
    let decryptedData = try AES.GCM.open(sealedBox, using: SymmetricKey(data: key))
    return decryptedData
  }

  private func getPrivateKey() -> SecKey? {
    let accessGroup = KeychainAccess.getKeychainAccessGroup()
    let bundleIdentifier = KeychainAccess.getMainBundleIdentifier()

    print("📱 [NotificationService] 🔍 Looking for private key with bundle: \(bundleIdentifier)")
    print("📱 [NotificationService] 🔍 Access group: \(accessGroup)")
    print("📱 [NotificationService] 🔍 Current bundle ID: \(Bundle.main.bundleIdentifier ?? "nil")")

    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-private-key",
      kSecAttrAccount as String: "private",
      kSecAttrAccessGroup as String: accessGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]
    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)
    guard status == errSecSuccess, let keyData = result as? Data else {
      print("📱 [NotificationService] ❌ Failed to retrieve private key: \(status)")
      return nil
    }
    // Convert stored value to PEM string (handle JSON-wrapped string and \n escapes)
    var pemString: String
    if let jsonString = try? JSONSerialization.jsonObject(
      with: keyData, options: [.fragmentsAllowed]) as? String
    {
      pemString = jsonString
    } else {
      pemString = String(data: keyData, encoding: .utf8) ?? ""
    }
    // Trim accidental surrounding quotes
    if pemString.hasPrefix("\"") && pemString.hasSuffix("\"") {
      pemString = String(pemString.dropFirst().dropLast())
    }
    // Unescape newlines if stored as JSON-escaped
    if pemString.contains("\\n") {
      pemString = pemString.replacingOccurrences(of: "\\n", with: "\n")
    }
    return pemToSecKey(pemString)
  }

  private func pemToSecKey(_ pemString: String) -> SecKey? {
    let pkcs8 =
      pemString
      .replacingOccurrences(of: "-----BEGIN PRIVATE KEY-----", with: "")
      .replacingOccurrences(of: "-----END PRIVATE KEY-----", with: "")
      .replacingOccurrences(of: "\\s", with: "", options: .regularExpression)
    guard let keyData = Data(base64Encoded: pkcs8) else {
      print("📱 [NotificationService] ❌ Invalid PEM format")
      return nil
    }
    // Try to extract RSAPrivateKey DER from PKCS#8 PrivateKeyInfo
    let rsaDer = extractRSAPrivateKeyFromPKCS8(keyData) ?? keyData
    let attributes: [String: Any] = [
      kSecAttrKeyType as String: kSecAttrKeyTypeRSA,
      kSecAttrKeySizeInBits as String: 2048,
      kSecAttrIsPermanent as String: false,
      kSecAttrKeyClass as String: kSecAttrKeyClassPrivate,
    ]
    var error: Unmanaged<CFError>?
    guard
      let privateKey = SecKeyCreateWithData(
        rsaDer as CFData,
        attributes as CFDictionary,
        &error
      )
    else {
      if let error = error?.takeRetainedValue() {
        print("📱 [NotificationService] ❌ Failed to create SecKey: \(error)")
      } else {
        print("📱 [NotificationService] ❌ Failed to create SecKey: unknown error")
      }
      return nil
    }
    return privateKey
  }

  private func extractRSAPrivateKeyFromPKCS8(_ pkcs8: Data) -> Data? {
    let oid: [UInt8] = [0x06, 0x09, 0x2A, 0x86, 0x48, 0x86, 0xF7, 0x0D, 0x01, 0x01, 0x01]
    let nullBytes: [UInt8] = [0x05, 0x00]
    let bytes = [UInt8](pkcs8)

    func indexOf(sequence: [UInt8], start: Int) -> Int? {
      if sequence.isEmpty { return nil }
      let limit = bytes.count - sequence.count
      if limit < 0 { return nil }
      var i = start
      while i <= limit {
        var match = true
        for j in 0..<sequence.count {
          if bytes[i + j] != sequence[j] {
            match = false
            break
          }
        }
        if match { return i }
        i += 1
      }
      return nil
    }

    func readLength(at idx: Int) -> (Int, Int)? {
      if idx >= bytes.count { return nil }
      let first = bytes[idx]
      if first & 0x80 == 0 { return (Int(first), 1) }
      let numBytes = Int(first & 0x7F)
      if numBytes == 0 || idx + 1 + numBytes > bytes.count { return nil }
      var value = 0
      for k in 0..<numBytes { value = (value << 8) | Int(bytes[idx + 1 + k]) }
      return (value, 1 + numBytes)
    }

    // Locate algorithm OID rsaEncryption and following NULL
    guard let oidIndex = indexOf(sequence: oid, start: 0) else { return nil }
    guard let nullIndex = indexOf(sequence: nullBytes, start: oidIndex + oid.count) else {
      return nil
    }
    // Next should be OCTET STRING (0x04) holding RSAPrivateKey
    var i = nullIndex + nullBytes.count
    while i < bytes.count && bytes[i] != 0x04 { i += 1 }
    if i >= bytes.count { return nil }
    let lenPos = i + 1
    guard let (len, lenBytes) = readLength(at: lenPos) else { return nil }
    let start = lenPos + lenBytes
    let end = start + len
    if end > bytes.count { return nil }
    return Data(bytes[start..<end])
  }

  private func decryptRSAPayload(encryptedPayload: Data, privateKey: SecKey) throws -> Data {
    var error: Unmanaged<CFError>?
    guard
      let decrypted = SecKeyCreateDecryptedData(
        privateKey,
        .rsaEncryptionOAEPSHA256,
        encryptedPayload as CFData,
        &error
      )
    else {
      throw error?.takeRetainedValue()
        ?? NSError(domain: "DecryptionError", code: -2, userInfo: nil)
    }
    return decrypted as Data
  }

  override func serviceExtensionTimeWillExpire() {
    print("📱 [NotificationService] Service extension time will expire")
    
    // Flush any pending logs before extension terminates
    LoggingSystem.shared.flushLogs()
    
    if let contentHandler = contentHandler, let bestAttemptContent = bestAttemptContent {
      contentHandler(bestAttemptContent)
    }
  }

  // MARK: - Notification Actions

  private func setupNotificationActions(
    content: UNMutableNotificationContent, completion: @escaping () -> Void
  ) {
    guard let userInfo = content.userInfo as? [String: Any] else {
      print("📱 [NotificationService] No userInfo found for actions")
      completion()
      return
    }

    var actions: [[String: Any]] = []

    if let actionsArray = userInfo["actions"] as? [[String: Any]] {
      actions = actionsArray
      print("📱 [NotificationService] Actions data: \(actions)")
    }

    if !actions.isEmpty {
      let notificationId = userInfo["notificationId"] as? String ?? UUID().uuidString
      
      // Filter actions to only include allowed types for notification buttons
      // NAVIGATE is excluded from buttons but kept in userInfo for NCE custom UI
      let filteredActions = actions.filter { action in
        guard let type = action["type"] as? String else { return false }
        return NotificationActionType.allowedTypes.contains(type)
      }
      
      print("📱 [NotificationService] 🔍 Original actions: \(actions.count), filtered for buttons: \(filteredActions.count)")
      
      // Register notification category with filtered actions for watchOS compatibility
      // This excludes NAVIGATE from appearing as notification buttons
      registerDynamicCategory(with: filteredActions)
      
      // Use DYNAMIC category
      content.categoryIdentifier = "DYNAMIC"
      
      print("📱 [NotificationService] 🎭 Registered DYNAMIC category with \(filteredActions.count) actions")
      print("📱 [NotificationService] 🎭 Category identifier: DYNAMIC")
      
      // Add ALL actions (including NAVIGATE) to userInfo for NCE
      // NCE can display NAVIGATE actions in its custom UI
      var mutableUserInfo = content.userInfo as? [String: Any] ?? [:]
      mutableUserInfo["actions"] = actions  // Keep all actions including NAVIGATE
      mutableUserInfo["hasActions"] = !actions.isEmpty
      
      content.userInfo = mutableUserInfo
      print("📱 [NotificationService] ⌚️ All actions (including NAVIGATE) added to userInfo for NCE custom UI")
      
    } else {
      // Use DYNAMIC category even without actions for NCE custom content
      content.categoryIdentifier = "DYNAMIC"
      print("📱 [NotificationService] 🎭 Using DYNAMIC category (no actions)")
    }
    
    completion()
  }

  // MARK: - Media Attachments

  private func hasMediaAttachments(content: UNMutableNotificationContent) -> Bool {
    guard let userInfo = content.userInfo as? [String: Any] else {
      return false
    }

    if let attachmentData = userInfo["attachmentData"] as? [[String: Any]], !attachmentData.isEmpty
    {
      print("📱 [NotificationService] Found attachments as direct array")
      return true
    }
    // Fallback: retry path without encryption may carry attachments under alternative keys
    if let attachments = userInfo["attachments"] as? [[String: Any]], !attachments.isEmpty {
      print("📱 [NotificationService] Found attachments under 'attachments' key (fallback)")
      return true
    }
    // Single attachment fallback removed: 'attachments' is always an array

    return false
  }

  private func downloadMediaAttachments(
    content: UNMutableNotificationContent, completion: @escaping () -> Void
  ) {
    guard let userInfo = content.userInfo as? [String: Any] else {
      completion()
      return
    }

    var mediaAttachments = extractMediaAttachments(from: userInfo)
    guard !mediaAttachments.isEmpty else {
      print("📱 [NotificationService] No media attachments found")
      completion()
      return
    }

    print("📱 [NotificationService] Found \(mediaAttachments.count) media attachments")

    // Allow ICONs to be attached for normal notification display
    // The expansion will be controlled by the category (myNotificationCategoryIconOnly)
    print("📱 [NotificationService] Proceeding with media download and attachment")

    // The NotificationService ALWAYS downloads only the first media by priority
    // The Content Extension will handle expanded mode if active

    // Sort media by priority: IMAGE -> GIF -> VIDEO -> AUDIO -> ICON (ICONs last to avoid expansion)
    mediaAttachments.sort { a, b in
      let p1 = getCompactPriority(a.mediaType)
      let p2 = getCompactPriority(b.mediaType)
      return p1 < p2
    }

    print("📱 [NotificationService] NSE mode: downloading first media by priority")
    print(
      "📱 [NotificationService] Priority order: IMAGE(1) -> GIF(2) -> VIDEO(3) -> AUDIO(4) -> ICON(5)"
    )
    print("📱 [NotificationService] After sorting:")
    for (index, item) in mediaAttachments.enumerated() {
      let priority = getCompactPriority(item.mediaType)
      print("📱 [NotificationService]   [\(index)] \(item.mediaType) (priority: \(priority))")
    }
    print(
      "📱 [NotificationService] Selected media: \(mediaAttachments[0].mediaType) with priority \(getCompactPriority(mediaAttachments[0].mediaType))"
    )

    // Select only ONE media by priority for attachment (ICONs already filtered out)
    let selectedItem: MediaAttachment = mediaAttachments.first!
    print("📱 [NotificationService] 🎯 Selected for NSE attachment: \(selectedItem.mediaType)")

    // Download only the selected media
    downloadMediaAttachment(mediaItem: selectedItem) { attachment in
      if let attachment = attachment {
        content.attachments = [attachment]
        print(
          "📱 [NotificationService] ✅ Media downloaded for compact view: \(selectedItem.mediaType)")

        // Log successful media download
        if let notificationId = userInfo["notificationId"] as? String {
          self.logToDatabase(
            level: "info",
            tag: "Media",
            message: "Media downloaded successfully",
            metadata: [
              "notificationId": notificationId,
              "mediaType": selectedItem.mediaType,
              "url": selectedItem.url
            ]
          )
        }
        
        // self.downloadIconsToSharedCache(from: userInfo)
      } else {
        print("📱 [NotificationService] ❌ Failed to download selected media, will show error")
        
        // Log media download failure
        if let notificationId = userInfo["notificationId"] as? String {
          self.logToDatabase(
            level: "error",
            tag: "Media",
            message: "Failed to download media",
            metadata: [
              "notificationId": notificationId,
              "mediaType": selectedItem.mediaType,
              "url": selectedItem.url
            ]
          )
        }
        
        // Set error flag in shared metadata for Content Extension to handle
        self.setDownloadErrorFlag(for: selectedItem)
      }
      completion()
    }
  }

  // MARK: - Media Processing Helpers
  private struct MediaAttachment {
    let mediaType: String
    let url: String
    let name: String?
  }

  private func extractMediaAttachments(from userInfo: [String: Any]) -> [MediaAttachment] {
    var mediaAttachments: [MediaAttachment] = []

    if let attachmentData = userInfo["attachmentData"] as? [[String: Any]] {
      print("📱 [NotificationService] Extracting attachments from direct array")
      for (index, attachment) in attachmentData.enumerated() {
        if let mediaType = attachment["mediaType"] as? String,
          let url = attachment["url"] as? String
        {
          // Filtra le icone: non devono mai essere usate come attachment nella NSE
          if mediaType.uppercased() == "ICON" {
            print("📱 [NotificationService] 🚫 Filtered out ICON attachment [\(index)]: \(url)")
            continue
          }
          
          let name = attachment["name"] as? String
          let originalFileName = attachment["originalFileName"] as? String

          // Use originalFileName if available, otherwise name
          let fileName = originalFileName ?? name
          let priority = getCompactPriority(mediaType)
          mediaAttachments.append(MediaAttachment(mediaType: mediaType, url: url, name: fileName))

          print(
            "📱 [NotificationService] 📎 Found attachment [\(index)]: \(mediaType) (priority: \(priority)) - \(fileName ?? "no name")"
          )
        }
      }
    }

    return mediaAttachments
  }

  private func getCompactPriority(_ mediaType: String) -> Int {
    // Priority for compact mode: IMAGE > GIF > ICON > VIDEO > AUDIO
    // GIF should have higher priority than ICON to show animations
    switch mediaType.uppercased() {
    case "IMAGE": return 1
    case "GIF": return 2
    case "VIDEO": return 3
    case "AUDIO": return 4
    case "ICON": return 5
    default: return 6
    }
  }

  private func getMaxAttachmentSize(for mediaType: String) -> Double {
    // iOS notification attachment size limits (in MB)
    switch mediaType.uppercased() {
    case "VIDEO": return 50.0  // 50 MB for videos
    case "IMAGE": return 10.0  // 10 MB for images
    case "GIF": return 10.0  // 10 MB for GIFs (treated as images)
    case "ICON": return 10.0  // 10 MB for icons (treated as images)
    case "AUDIO": return 5.0  // 5 MB for audio
    default: return 10.0  // Default 10 MB
    }
  }

  private func downloadMediaAttachment(
    mediaItem: MediaAttachment, completion: @escaping (UNNotificationAttachment?) -> Void
  ) {
    guard let url = URL(string: mediaItem.url) else {
      print("📱 [NotificationService] Invalid URL: \(mediaItem.url)")

      // Generate error image for invalid URL
      let errorMessage = "Invalid URL: \(mediaItem.url)"
      if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
        completion(errorAttachment)
      } else {
        completion(nil)
      }
      return
    }

    let fileExtension: String
    let identifier: String
    var attachmentOptions: [NSObject: AnyObject]? = nil

    switch mediaItem.mediaType.uppercased() {
    case "VIDEO":
      fileExtension = "mp4"
      identifier = "zentik-video"
      if #available(iOS 14.0, *) {
        attachmentOptions = [
          UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.mpeg4Movie.identifier
            as AnyObject
        ]
      }
    case "AUDIO":
      fileExtension = "m4a"
      identifier = "zentik-audio"
      if #available(iOS 14.0, *) {
        attachmentOptions = [
          UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.mpeg4Audio.identifier
            as AnyObject
        ]
      }
    case "GIF":
      fileExtension = "gif"
      identifier = "zentik-gif"
      if #available(iOS 14.0, *) {
        attachmentOptions = [
          UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.gif.identifier as AnyObject
        ]
      }
    case "IMAGE":
      fileExtension = "jpg"
      identifier = "zentik-image"
      if #available(iOS 14.0, *) {
        attachmentOptions = [
          UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.jpeg.identifier
            as AnyObject
        ]
      }
    case "ICON":
      fileExtension = "jpg"
      identifier = "zentik-icon"
      if #available(iOS 14.0, *) {
        attachmentOptions = [
          UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.jpeg.identifier
            as AnyObject
        ]
      }
    default:
      print("📱 [NotificationService] Unsupported media type: \(mediaItem.mediaType)")

      // Generate error image for unsupported media type
      let errorMessage = "Unsupported media type: \(mediaItem.mediaType)"
      if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
        completion(errorAttachment)
      } else {
        completion(nil)
      }
      return
    }

    // Check shared metadata and existing cached file before downloading
    do {
      let cacheDirectory = MediaAccess.getSharedMediaCacheDirectory()
      let filename = MediaAccess.generateSafeFileName(
        url: mediaItem.url,
        mediaType: mediaItem.mediaType,
        originalFileName: mediaItem.name
      )
      let rootCandidate = cacheDirectory.appendingPathComponent(filename)
      let typeDirectory = cacheDirectory.appendingPathComponent(mediaItem.mediaType.uppercased())
      let typeCandidate = typeDirectory.appendingPathComponent(filename)

      if let localPath = MediaAccess.getLocalPathFromDb(url: mediaItem.url, mediaType: mediaItem.mediaType)
      {
        // localPath may already include file://, so normalize
        let dbUrl: URL
        if localPath.hasPrefix("file://") {
          dbUrl =
            URL(string: localPath)
            ?? URL(fileURLWithPath: (localPath as NSString).expandingTildeInPath)
        } else {
          dbUrl = URL(fileURLWithPath: localPath)
        }
        let candidateUrl =
          FileManager.default.fileExists(atPath: dbUrl.path)
          ? dbUrl
          : (FileManager.default.fileExists(atPath: typeCandidate.path)
            ? typeCandidate
            : (FileManager.default.fileExists(atPath: rootCandidate.path) ? rootCandidate : nil))
        if let candidateUrl {
          print("📱 [NotificationService] ⚡️ Found cached media from SQLite: \(candidateUrl.path)")

          do {
            // Create attachment from a temp copy to avoid any system move/lock on the shared file
            let tmpAttachmentUrl = FileManager.default.temporaryDirectory.appendingPathComponent(
              filename)
            if FileManager.default.fileExists(atPath: tmpAttachmentUrl.path) {
              try? FileManager.default.removeItem(at: tmpAttachmentUrl)
            }
            let sharedData = try Data(contentsOf: candidateUrl, options: [.mappedIfSafe])
            try sharedData.write(to: tmpAttachmentUrl, options: [.atomic])
            let attachment = try UNNotificationAttachment(
              identifier: identifier,
              url: tmpAttachmentUrl,
              options: attachmentOptions as? [String: Any]
            )
            // Mark as completed in DB since we're using cached file
            self.markMediaAsCompleted(mediaItem, success: true, isNewDownload: false)
            completion(attachment)
            return
          } catch {
            print(
              "📱 [NotificationService] ⚠️ Failed to create attachment from cached file, will redownload: \(error)"
            )
          }
        }
      }
    }

    let session = URLSession(configuration: .default)
    session.configuration.timeoutIntervalForRequest = 15.0

    let task = session.downloadTask(with: url) { downloadedUrl, response, error in
      // Check for network errors first
      if let error = error {
        let errorDescription = error.localizedDescription
        print("📱 [NotificationService] Download network error: \(errorDescription)")

        // Mark media as failed in database so NCE can detect the error
        self.markMediaAsCompleted(
          mediaItem, success: false, isNewDownload: true,
          errorCode: "Network Error: \(errorDescription)")

        // Generate error image for download failure
        if let errorAttachment = self.createErrorAttachment(message: errorDescription) {
          completion(errorAttachment)
        } else {
          completion(nil)
        }
        return
      }

      // Check HTTP status codes
      if let httpResponse = response as? HTTPURLResponse {
        let statusCode = httpResponse.statusCode
        print("📱 [NotificationService] HTTP Status Code: \(statusCode)")

        if statusCode < 200 || statusCode >= 300 {
          let errorMessage: String
          switch statusCode {
          case 400:
            errorMessage = "Bad Request (400)"
          case 401:
            errorMessage = "Unauthorized (401)"
          case 403:
            errorMessage = "Forbidden (403)"
          case 404:
            errorMessage = "Not Found (404)"
          case 500:
            errorMessage = "Internal Server Error (500)"
          case 503:
            errorMessage = "Service Unavailable (503)"
          default:
            errorMessage = "HTTP Error (\(statusCode))"
          }

          print("📱 [NotificationService] HTTP error: \(errorMessage)")

          // Mark media as failed in database so NCE can detect the error
          self.markMediaAsCompleted(
            mediaItem, success: false, isNewDownload: true, errorCode: errorMessage)

          // Generate error image for HTTP error
          if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
            completion(errorAttachment)
          } else {
            completion(nil)
          }
          return
        }
      }

      // Check if we have a valid downloaded file
      guard let downloadedUrl = downloadedUrl else {
        let errorMessage = "No file downloaded"
        print("📱 [NotificationService] Download error: \(errorMessage)")

        // Mark media as failed in database so NCE can detect the error
        self.markMediaAsCompleted(
          mediaItem, success: false, isNewDownload: true, errorCode: errorMessage)

        // Generate error image for missing file
        if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
          completion(errorAttachment)
        } else {
          completion(nil)
        }
        return
      }

      do {
        // Validate downloaded file size and content
        let downloadedFileAttributes = try FileManager.default.attributesOfItem(
          atPath: downloadedUrl.path)
        let downloadedFileSize = downloadedFileAttributes[FileAttributeKey.size] as? Int64 ?? 0

        if downloadedFileSize == 0 {
          let errorMessage = "Downloaded file is empty (0 bytes)"
          print("📱 [NotificationService] Download error: \(errorMessage)")

          // Generate error image for empty file
          if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
            completion(errorAttachment)
          } else {
            completion(nil)
          }
          return
        }

        // Check if the file is suspiciously small (might be an error page)
        if downloadedFileSize < 100 {
          // Read first few bytes to check if it's HTML/text (error page)
          if let data = try? Data(contentsOf: downloadedUrl, options: [.mappedIfSafe]),
            let content = String(data: data.prefix(50), encoding: .utf8),
            content.lowercased().contains("<html") || content.lowercased().contains("error")
          {

            let errorMessage = "Server returned error page instead of media"
            print("📱 [NotificationService] Download error: \(errorMessage) - Content: \(content)")

            // Generate error image for error page
            if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
              completion(errorAttachment)
            } else {
              completion(nil)
            }
            return
          }
        }

        print("📱 [NotificationService] Downloaded file size: \(downloadedFileSize) bytes")

        // Save the media in the app's cache folder to make it accessible
        let cacheDirectory = MediaAccess.getSharedMediaCacheDirectory()

        // Generate a safe filename using the same logic as the app's media-cache
        let filename = MediaAccess.generateSafeFileName(
          url: mediaItem.url,
          mediaType: mediaItem.mediaType,
          originalFileName: mediaItem.name
        )

        // Use per-type subdirectory to align with app structure
        let typeDirectory = cacheDirectory.appendingPathComponent(mediaItem.mediaType.uppercased())
        try FileManager.default.createDirectory(
          at: typeDirectory, withIntermediateDirectories: true, attributes: nil)
        let cacheFileUrl = typeDirectory.appendingPathComponent(filename)

        // Create the directory if it doesn't exist
        try FileManager.default.createDirectory(
          at: typeDirectory, withIntermediateDirectories: true, attributes: nil)

        // Remove existing file if it exists to avoid copy conflicts
        if FileManager.default.fileExists(atPath: cacheFileUrl.path) {
          do {
            let attrs = try FileManager.default.attributesOfItem(atPath: cacheFileUrl.path)
            let oldSize = (attrs[.size] as? NSNumber)?.int64Value ?? -1
            print(
              "📱 [NotificationService] 🔎 Pre-existing file before overwrite: path=\(cacheFileUrl.path) size=\(oldSize)"
            )
          } catch {
            print("📱 [NotificationService] ⚠️ Failed to read pre-existing file attributes: \(error)")
          }
          try FileManager.default.removeItem(at: cacheFileUrl)
          print("📱 [NotificationService] 🗑️ Removed existing file: \(filename)")
        }

        // Copy the file from the temporary directory to the cache (byte-for-byte via Data)
        let tmpData = try Data(contentsOf: downloadedUrl, options: [.mappedIfSafe])
        try tmpData.write(to: cacheFileUrl, options: [.atomic])
        // Ensure the file is readable by the main app (adjust protection and backup flags)
        do {
          try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.none], ofItemAtPath: cacheFileUrl.path)
        } catch {
          print("📱 [NotificationService] ⚠️ Failed to set file protection to none: \(error)")
        }
        do {
          var rv = URLResourceValues()
          rv.isExcludedFromBackup = true
          var mutableUrl = cacheFileUrl
          try mutableUrl.setResourceValues(rv)
        } catch {
          print("📱 [NotificationService] ⚠️ Failed to set isExcludedFromBackup: \(error)")
        }
        // Verify saved file for compact view path
        let compactExists = FileManager.default.fileExists(atPath: cacheFileUrl.path)
        var compactSize: Int64 = -1
        if compactExists {
          do {
            let attrs = try FileManager.default.attributesOfItem(atPath: cacheFileUrl.path)
            if let size = attrs[.size] as? NSNumber {
              compactSize = size.int64Value
            }
          } catch {
            print("📱 [NotificationService] ⚠️ Failed to read compact file attributes: \(error)")
          }
        }
        print(
          "📱 [NotificationService] 🔎 Compact file verification: exists=\(compactExists) path=\(cacheFileUrl.path) size=\(compactSize)"
        )

        // Validate file size before creating attachment
        let fileAttributes = try FileManager.default.attributesOfItem(atPath: cacheFileUrl.path)
        let fileSize = fileAttributes[FileAttributeKey.size] as? Int64 ?? 0
        let fileSizeMB = Double(fileSize) / (1024.0 * 1024.0)

        // Check iOS attachment size limits
        let maxSizeMB = self.getMaxAttachmentSize(for: mediaItem.mediaType)
        if fileSizeMB > maxSizeMB {
          print(
            "📱 [NotificationService] ❌ File too large: \(String(format: "%.2f", fileSizeMB))MB > \(maxSizeMB)MB limit for \(mediaItem.mediaType)"
          )
          // Remove the file since it's too large
          try? FileManager.default.removeItem(at: cacheFileUrl)

          // Try to create attachment to get the actual iOS error message
          do {
            let _ = try UNNotificationAttachment(
              identifier: identifier,
              url: cacheFileUrl,
              options: attachmentOptions as? [String: Any]
            )
          } catch {
            // Use the actual iOS error message with size info
            let errorMessage =
              "\(error.localizedDescription)\n\(String(format: "%.1f", fileSizeMB))MB > \(Int(maxSizeMB))MB"
            if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
              completion(errorAttachment)
            } else {
              completion(nil)
            }
            return
          }

          // Fallback if no error was thrown (shouldn't happen)
          let errorMessage =
            "Invalid attachment file size\n\(String(format: "%.1f", fileSizeMB))MB > \(Int(maxSizeMB))MB"
          if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
            completion(errorAttachment)
          } else {
            completion(nil)
          }
          return
        }

        print(
          "📱 [NotificationService] ✅ File size valid: \(String(format: "%.2f", fileSizeMB))MB (limit: \(maxSizeMB)MB)"
        )

        // Create attachment from a temp copy to avoid any system move/lock on the shared file
        let tmpAttachmentUrl = FileManager.default.temporaryDirectory.appendingPathComponent(
          filename)
        // Ensure no leftovers
        if FileManager.default.fileExists(atPath: tmpAttachmentUrl.path) {
          try? FileManager.default.removeItem(at: tmpAttachmentUrl)
        }
        // Byte-for-byte copy into a new temp file for attachment
        let sharedData = try Data(contentsOf: cacheFileUrl, options: [.mappedIfSafe])
        try sharedData.write(to: tmpAttachmentUrl, options: [.atomic])
        // Ensure accessibility for the temp copy (not strictly necessary but consistent)
        do {
          try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.none], ofItemAtPath: tmpAttachmentUrl.path)
        } catch {}
        let attachment = try UNNotificationAttachment(
          identifier: identifier,
          url: tmpAttachmentUrl,
          options: attachmentOptions as? [String: Any]
        )

        print(
          "📱 [NotificationService] ✅ Created \(identifier) attachment and saved to cache: \(cacheFileUrl.path)"
        )
        print("📱 [NotificationService] 📁 File saved with name: \(filename)")
        // Mark as completed in shared metadata (set isDownloading=false and update size)
        self.markMediaAsCompleted(mediaItem, success: true, isNewDownload: true)
        completion(attachment)

      } catch {
        let errorDescription = error.localizedDescription
        print("📱 [NotificationService] Attachment creation error: \(errorDescription)")

        // Generate error image for attachment creation failure
        let errorMessage = errorDescription
        if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
          completion(errorAttachment)
        } else {
          completion(nil)
        }
      }
    }

    task.resume()
  }

  // MARK: - Error Image Generation

  /**
   * Generates an error image with the specified message
   */
  private func generateErrorImage(message: String, width: CGFloat = 400, height: CGFloat = 200)
    -> URL?
  {
    let size = CGSize(width: width, height: height)

    UIGraphicsBeginImageContextWithOptions(size, false, 0.0)
    defer { UIGraphicsEndImageContext() }

    guard let context = UIGraphicsGetCurrentContext() else {
      print("📱 [NotificationService] ❌ Failed to create graphics context for error image")
      return nil
    }

    // Background
    context.setFillColor(UIColor.systemRed.withAlphaComponent(0.1).cgColor)
    context.fill(CGRect(origin: .zero, size: size))

    // Border
    context.setStrokeColor(UIColor.systemRed.cgColor)
    context.setLineWidth(2.0)
    context.stroke(CGRect(origin: .zero, size: size))

    // Error icon (⚠️ symbol)
    let iconSize: CGFloat = 40
    let iconRect = CGRect(
      x: (size.width - iconSize) / 2,
      y: 20,
      width: iconSize,
      height: iconSize
    )

    let iconText = "⚠️" as NSString
    let iconFont = UIFont.systemFont(ofSize: 32)
    let iconAttributes: [NSAttributedString.Key: Any] = [
      .font: iconFont,
      .foregroundColor: UIColor.systemRed,
    ]

    let iconTextSize = iconText.size(withAttributes: iconAttributes)
    let iconTextRect = CGRect(
      x: iconRect.midX - iconTextSize.width / 2,
      y: iconRect.midY - iconTextSize.height / 2,
      width: iconTextSize.width,
      height: iconTextSize.height
    )
    iconText.draw(in: iconTextRect, withAttributes: iconAttributes)

    // Error message
    let messageText = message as NSString
    let messageFont = UIFont.systemFont(ofSize: 16, weight: .medium)
    let messageAttributes: [NSAttributedString.Key: Any] = [
      .font: messageFont,
      .foregroundColor: UIColor.label,
      .paragraphStyle: {
        let style = NSMutableParagraphStyle()
        style.alignment = .center
        style.lineBreakMode = .byWordWrapping
        return style
      }(),
    ]

    let messageRect = CGRect(
      x: 10,
      y: iconRect.maxY + 10,
      width: size.width - 20,
      height: size.height - iconRect.maxY - 30
    )
    messageText.draw(in: messageRect, withAttributes: messageAttributes)

    // Get the image
    guard let image = UIGraphicsGetImageFromCurrentImageContext(),
      let imageData = image.pngData()
    else {
      print("📱 [NotificationService] ❌ Failed to generate error image data")
      return nil
    }

    // Save to temporary file
    let tempDir = FileManager.default.temporaryDirectory
    let errorImageURL = tempDir.appendingPathComponent(
      "notification_error_\(Int(Date().timeIntervalSince1970 * 1000)).png")

    do {
      try imageData.write(to: errorImageURL)
      print("📱 [NotificationService] ✅ Generated error image: \(errorImageURL.path)")
      return errorImageURL
    } catch {
      print("📱 [NotificationService] ❌ Failed to save error image: \(error)")
      return nil
    }
  }

  /**
   * Creates a notification attachment from an error image
   */
  private func createErrorAttachment(message: String) -> UNNotificationAttachment? {
    guard let imageURL = generateErrorImage(message: message) else {
      return nil
    }

    do {
      let attachment = try UNNotificationAttachment(
        identifier: "zentik-error",
        url: imageURL,
        options: [UNNotificationAttachmentOptionsTypeHintKey: "public.png"]
      )
      print("📱 [NotificationService] ✅ Created error attachment")
      return attachment
    } catch {
      print("📱 [NotificationService] ❌ Failed to create error attachment: \(error)")
      return nil
    }
  }



  // MARK: - Badge Count Management

  private func updateBadgeCount(content: UNMutableNotificationContent) {
    print("📱 [NotificationService] 🔢 Updating badge count...")

    // Get current badge count from keychain
    let currentCount = KeychainAccess.getBadgeCountFromKeychain()
    let newCount = currentCount + 1

    print("📱 [NotificationService] 🔢 Current badge count: \(currentCount), new count: \(newCount)")

    // Update the notification badge
    content.badge = NSNumber(value: newCount)

    // Save new count to keychain for app synchronization
    KeychainAccess.saveBadgeCountToKeychain(count: newCount)

    print("📱 [NotificationService] ✅ Badge count updated to \(newCount)")
  }



  private func setDownloadErrorFlag(for mediaAttachment: MediaAttachment) {
    MediaAccess.upsertCacheItem(
      url: mediaAttachment.url,
      mediaType: mediaAttachment.mediaType,
      fields: [
        "is_downloading": 0,
        "is_permanent_failure": 1,
        "timestamp": Int(Date().timeIntervalSince1970 * 1000),
      ]
    )
  }

  // MARK: - Media Pre-Caching (Legacy - kept for compatibility)
  private func markMediaAsCompleted(
    _ mediaAttachment: MediaAttachment, success: Bool, isNewDownload: Bool = true,
    errorCode: String? = nil, notificationId: String? = nil
  ) {
    let sharedCacheDirectory = MediaAccess.getSharedMediaCacheDirectory()
    let filename = MediaAccess.generateSafeFileName(
      url: mediaAttachment.url, mediaType: mediaAttachment.mediaType,
      originalFileName: mediaAttachment.name)
    let typeDirectory = sharedCacheDirectory.appendingPathComponent(
      mediaAttachment.mediaType.uppercased())
    let typeCandidate = typeDirectory.appendingPathComponent(filename)
    let rootCandidate = sharedCacheDirectory.appendingPathComponent(filename)
    let fileUrl: URL? =
      FileManager.default.fileExists(atPath: typeCandidate.path)
      ? typeCandidate
      : (FileManager.default.fileExists(atPath: rootCandidate.path) ? rootCandidate : nil)
    var fileSize: Int64 = 0
    var localPath: String? = nil
    if let fileUrl {
      if let attrs = try? FileManager.default.attributesOfItem(atPath: fileUrl.path),
        let sizeNum = attrs[.size] as? NSNumber
      {
        fileSize = sizeNum.int64Value
      }
      localPath = fileUrl.path
    }
    var fields: [String: Any] = [
      "is_downloading": 0,
      "timestamp": Int(Date().timeIntervalSince1970 * 1000),
      "has_error": success ? 0 : 1,
      "is_permanent_failure": success ? 0 : 1,  // Mark as permanent failure when unsuccessful
    ]
    if let localPath { fields["local_path"] = localPath }
    if fileSize > 0 { fields["size"] = Int(fileSize) }
    if success && isNewDownload {
      fields["downloaded_at"] = Int(Date().timeIntervalSince1970 * 1000)
    }
    if let errorCode { fields["error_code"] = errorCode }
    if let notificationId { fields["notification_id"] = notificationId }

    print(
      "📱 [NotificationService] 📊 Marking media as completed: success=\(success), errorCode=\(errorCode ?? "nil")"
    )
    MediaAccess.upsertCacheItem(url: mediaAttachment.url, mediaType: mediaAttachment.mediaType, fields: fields)
  }

  // MARK: - SQLite helpers
  private func getDbPath() -> String {
    return DatabaseAccess.getDbPath() ?? MediaAccess.getSharedMediaCacheDirectory().appendingPathComponent("cache.db").path
  }
  
  // MARK: - Logging (delegated to shared LoggingSystem)
  
  private func logToJSON(
      level: String,
      tag: String? = nil,
      message: String,
      metadata: [String: Any]? = nil
  ) {
      LoggingSystem.shared.log(
          level: level,
          tag: tag ?? "NSE",
          message: message,
          metadata: metadata,
          source: "NSE"
      )
  }
  
  // Legacy function that redirects to LoggingSystem
  private func logToDatabase(
    level: String,
    tag: String? = nil,
    message: String,
    metadata: [String: Any]? = nil
  ) {
    LoggingSystem.shared.log(
        level: level,
        tag: tag ?? "NSE",
        message: message,
        metadata: metadata,
        source: "NSE"
    )
  }
  
  // MARK: - Save Notification to SQLite
  
  private func saveNotificationToDatabase(content: UNMutableNotificationContent) {
    guard let userInfo = content.userInfo as? [String: Any] else {
      print("📱 [NotificationService] ⚠️ No userInfo available for saving notification")
      return
    }
    
    // Extract required fields
    guard let notificationId = userInfo["notificationId"] as? String,
          let bucketId = userInfo["bucketId"] as? String else {
      print("📱 [NotificationService] ⚠️ Missing notificationId or bucketId")
      return
    }
    
    let dbPath = getDbPath()
    var db: OpaquePointer?
    
    if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) != SQLITE_OK {
      print("📱 [NotificationService] ❌ Failed to open DB for saving notification")
      return
    }
    defer { sqlite3_close(db) }
    
    // Build NotificationFragment JSON
    let now = ISO8601DateFormatter().string(from: Date())
    
    // Build message object
    var messageObj: [String: Any] = [
      "__typename": "Message",
      "id": UUID().uuidString, // Generate a message ID
      "title": content.title,
      "body": content.body,
      "subtitle": content.subtitle.isEmpty ? NSNull() : content.subtitle,
      "sound": "default",
      "deliveryType": "PUSH",
      "locale": NSNull(),
      "snoozes": NSNull(),
      "createdAt": now,
      "updatedAt": now
    ]
    
    // Add attachments
    if let attachmentData = userInfo["attachmentData"] as? [[String: Any]], !attachmentData.isEmpty {
      let attachments = attachmentData.map { item -> [String: Any] in
        return [
          "__typename": "MessageAttachment",
          "mediaType": (item["mediaType"] as? String)?.uppercased() ?? "IMAGE",
          "url": (item["url"] as? String) ?? NSNull() as Any,
          "name": (item["name"] as? String) ?? NSNull() as Any,
          "attachmentUuid": (item["attachmentUuid"] as? String) ?? NSNull() as Any,
          "saveOnServer": (item["saveOnServer"] as? Bool) ?? NSNull() as Any
        ]
      }
      messageObj["attachments"] = attachments
    } else {
      messageObj["attachments"] = []
    }
    
    // Add tapAction
    if let tapAction = userInfo["tapAction"] as? [String: Any] {
      messageObj["tapAction"] = [
        "__typename": "NotificationAction",
        "type": (tapAction["type"] as? String)?.uppercased() ?? "OPEN_NOTIFICATION",
        "value": (tapAction["value"] as? String) ?? NSNull() as Any,
        "title": (tapAction["title"] as? String) ?? NSNull() as Any,
        "icon": (tapAction["icon"] as? String) ?? NSNull() as Any,
        "destructive": tapAction["destructive"] as? Bool ?? false
      ]
    }
    
    // Add actions
    if let actions = userInfo["actions"] as? [[String: Any]], !actions.isEmpty {
      let actionsArray = actions.map { action -> [String: Any] in
        return [
          "__typename": "NotificationAction",
          "type": (action["type"] as? String)?.uppercased() ?? "CUSTOM",
          "value": (action["value"] as? String) ?? NSNull() as Any,
          "title": (action["title"] as? String) ?? NSNull() as Any,
          "icon": (action["icon"] as? String) ?? NSNull() as Any,
          "destructive": action["destructive"] as? Bool ?? false
        ]
      }
      messageObj["actions"] = actionsArray
    } else {
      messageObj["actions"] = []
    }
    
    // Add bucket
    messageObj["bucket"] = [
      "__typename": "Bucket",
      "id": bucketId,
      "name": userInfo["bucketName"] as? String ?? "Unknown",
      "description": NSNull(),
      "color": (userInfo["bucketColor"] as? String) ?? NSNull() as Any,
      "iconUrl": (userInfo["bucketIconUrl"] as? String) ?? NSNull() as Any,
      "createdAt": now,
      "updatedAt": now,
      "isProtected": NSNull(),
      "isPublic": NSNull()
    ]
    
    // Build notification fragment
    let notificationFragment: [String: Any] = [
      "__typename": "Notification",
      "id": notificationId,
      "receivedAt": now,
      "readAt": NSNull(),
      "sentAt": now,
      "createdAt": now,
      "updatedAt": now,
      "message": messageObj
    ]
    
    // Convert to JSON string
    guard let jsonData = try? JSONSerialization.data(withJSONObject: notificationFragment),
          let jsonString = String(data: jsonData, encoding: .utf8) else {
      print("📱 [NotificationService] ❌ Failed to serialize notification fragment")
      return
    }
    
    // Determine has_attachments
    let hasAttachments = (userInfo["attachmentData"] as? [[String: Any]])?.isEmpty == false ? 1 : 0
    
    // Insert into database
    let sql = """
      INSERT OR REPLACE INTO notifications (id, created_at, read_at, bucket_id, has_attachments, fragment)
      VALUES (?, ?, ?, ?, ?, ?)
    """
    
    var stmt: OpaquePointer?
    if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK {
      print("📱 [NotificationService] ❌ Failed to prepare statement for notification insert")
      return
    }
    defer { sqlite3_finalize(stmt) }
    
    sqlite3_bind_text(stmt, 1, (notificationId as NSString).utf8String, -1, SQLITE_TRANSIENT)
    sqlite3_bind_text(stmt, 2, (now as NSString).utf8String, -1, SQLITE_TRANSIENT)
    sqlite3_bind_null(stmt, 3) // read_at is null for new notifications
    sqlite3_bind_text(stmt, 4, (bucketId as NSString).utf8String, -1, SQLITE_TRANSIENT)
    sqlite3_bind_int(stmt, 5, Int32(hasAttachments))
    sqlite3_bind_text(stmt, 6, (jsonString as NSString).utf8String, -1, SQLITE_TRANSIENT)
    
    if sqlite3_step(stmt) == SQLITE_DONE {
      print("📱 [NotificationService] ✅ Notification saved to database: \(notificationId)")
      
      // Notify Watch via WatchConnectivity (async, non-blocking)
      self.notifyWatchOfNewNotification(
        notificationId: notificationId,
        userInfo: userInfo
      )
    } else {
      print("📱 [NotificationService] ❌ Failed to save notification to database")
    }
  }

  
  private func writeTempFile(data: Data, filename: String) -> URL? {
    let tempDir = FileManager.default.temporaryDirectory
    let fileURL = tempDir.appendingPathComponent(filename)
    
    do {
      try data.write(to: fileURL)
      return fileURL
    } catch {
      print("📱 [NotificationService] ❌ Failed to write temp file: \(error)")
      return nil
    }
  }

  // MARK: - WatchConnectivity Notification
  
  /**
   * Notify Watch of new notification via WatchConnectivity
   * This method runs in background and does NOT block notification delivery
   * Sends the complete notification fragment to Watch so it can save it locally
   */
  private func notifyWatchOfNewNotification(
    notificationId: String,
    userInfo: [String: Any]
  ) {
    guard WCSession.isSupported() else {
      print("📱 [NotificationService] ⚠️ WatchConnectivity not supported")
      return
    }
    
    let session = WCSession.default
    
    // Extract bucket info
    guard let bucketId = userInfo["bucketId"] as? String else {
      print("📱 [NotificationService] ⚠️ No bucketId for Watch notification")
      return
    }
    
    let now = ISO8601DateFormatter().string(from: Date())
    
    // Build notification fragment (same structure as stored in SQLite)
    var notificationFragment: [String: Any] = [
      "__typename": "Notification",
      "id": notificationId,
      "receivedAt": now,
      "readAt": NSNull(),
      "sentAt": now,
      "createdAt": now,
      "updatedAt": now
    ]
    
    // Build message object
    var messageObj: [String: Any] = [
      "__typename": "Message",
      "id": UUID().uuidString,
      "title": userInfo["title"] as? String ?? "",
      "body": userInfo["body"] as? String ?? "",
      "subtitle": (userInfo["subtitle"] as? String)?.isEmpty == false ? (userInfo["subtitle"] as! String) : NSNull(),
      "sound": "default",
      "deliveryType": "PUSH",
      "locale": NSNull(),
      "snoozes": NSNull(),
      "createdAt": now,
      "updatedAt": now
    ]
    
    // Add attachments if present
    if let attachmentData = userInfo["attachmentData"] as? [[String: Any]], !attachmentData.isEmpty {
      let attachments = attachmentData.map { item -> [String: Any] in
        return [
          "__typename": "MessageAttachment",
          "mediaType": (item["mediaType"] as? String)?.uppercased() ?? "IMAGE",
          "url": (item["url"] as? String) ?? NSNull() as Any,
          "name": (item["name"] as? String) ?? NSNull() as Any,
          "attachmentUuid": (item["attachmentUuid"] as? String) ?? NSNull() as Any,
          "saveOnServer": (item["saveOnServer"] as? Bool) ?? NSNull() as Any
        ]
      }
      messageObj["attachments"] = attachments
    } else {
      messageObj["attachments"] = []
    }
    
    // Add tapAction if present
    if let tapAction = userInfo["tapAction"] as? [String: Any] {
      messageObj["tapAction"] = [
        "__typename": "NotificationAction",
        "type": (tapAction["type"] as? String)?.uppercased() ?? "OPEN_NOTIFICATION",
        "value": (tapAction["value"] as? String) ?? NSNull() as Any,
        "title": (tapAction["title"] as? String) ?? NSNull() as Any,
        "icon": (tapAction["icon"] as? String) ?? NSNull() as Any,
        "destructive": tapAction["destructive"] as? Bool ?? false
      ]
    }
    
    // Add actions if present
    if let actions = userInfo["actions"] as? [[String: Any]], !actions.isEmpty {
      let actionsArray = actions.map { action -> [String: Any] in
        return [
          "__typename": "NotificationAction",
          "type": (action["type"] as? String)?.uppercased() ?? "CUSTOM",
          "value": (action["value"] as? String) ?? NSNull() as Any,
          "title": (action["title"] as? String) ?? NSNull() as Any,
          "icon": (action["icon"] as? String) ?? NSNull() as Any,
          "destructive": action["destructive"] as? Bool ?? false
        ]
      }
      messageObj["actions"] = actionsArray
    } else {
      messageObj["actions"] = []
    }
    
    // Add bucket info
    messageObj["bucket"] = [
      "__typename": "Bucket",
      "id": bucketId,
      "name": userInfo["bucketName"] as? String ?? "Unknown",
      "description": NSNull(),
      "color": (userInfo["bucketColor"] as? String) ?? NSNull() as Any,
      "iconUrl": (userInfo["bucketIconUrl"] as? String) ?? NSNull() as Any,
      "createdAt": now,
      "updatedAt": now,
      "isProtected": NSNull(),
      "isPublic": NSNull()
    ]
    
    notificationFragment["message"] = messageObj
    
    // Send complete notification fragment to Watch
    let message: [String: Any] = [
      "action": "notificationAdded",
      "notificationId": notificationId,
      "fragment": notificationFragment
    ]
    
    // Use transferUserInfo for guaranteed delivery (even when Watch is asleep)
    session.transferUserInfo(message)
    print("📱 [NotificationService] ✅ Queued complete notification fragment to Watch: \(notificationId)")
  }

  
  // MARK: - Pending Notifications Storage
  // NOTE: Removed savePendingNotification and storePendingNotification methods.
  // Notifications are now saved directly to SQLite via saveNotificationToDatabase().

  // MARK: - Navigation Intent Storage
  
  // Store tap action with unique key per notification
  private func storeTapActionForNotification(content: UNMutableNotificationContent) {
    let userInfo = content.userInfo
    
    guard let notificationId = userInfo["notificationId"] as? String else {
      print("📱 [NotificationService] ⚠️ No notificationId for tap action storage")
      return
    }
    
    // Determine tap action
    var tapAction: [String: Any]
    if let existingTapAction = userInfo["tapAction"] as? [String: Any] {
      tapAction = existingTapAction
    } else {
      // Default to OPEN_NOTIFICATION
      tapAction = [
        "type": "OPEN_NOTIFICATION",
        "value": notificationId
      ]
    }
    
    // Create navigation data
    let navigationData = [
      "type": tapAction["type"] as? String ?? "OPEN_NOTIFICATION",
      "value": tapAction["value"] as? String ?? notificationId,
      "timestamp": ISO8601DateFormatter().string(from: Date())
    ]
    
    // Store with unique key for this notification
    let service = "zentik-tap-\(notificationId)"
    do {
      try KeychainAccess.storeIntentInKeychain(data: navigationData, service: service)
      print("📱 [NotificationService] 💾 Stored tap action for notification: \(notificationId)")
    } catch {
      print("📱 [NotificationService] ❌ Failed to store tap action: \(error)")
    }
  }
  
  // MARK: - Dynamic Category Registration
  
  /// Registers a UNNotificationCategory with actions for both iOS and watchOS
  private func registerDynamicCategory(with actions: [[String: Any]]) {
    let notificationActions = actions.compactMap { actionData -> UNNotificationAction? in
      guard let type = actionData["type"] as? String,
            let value = actionData["value"] as? String,
            let title = actionData["title"] as? String else {
        return nil
      }
      
      let actionId = "action_\(type)_\(value)"
      var options: UNNotificationActionOptions = []
      
      if let destructive = actionData["destructive"] as? Bool, destructive {
        options.insert(.destructive)
      }
      
      // Always foreground for actions that need app interaction
      if type == "NAVIGATE" {
        options.insert(.foreground)
      }
      
      // Add icon support (same as NCE)
      var icon: UNNotificationActionIcon?
      if let iconName = actionData["icon"] as? String, !iconName.isEmpty {
        let actualIconName = iconName.hasPrefix("sfsymbols:")
          ? String(iconName.dropFirst("sfsymbols:".count))
          : iconName
        icon = UNNotificationActionIcon(systemImageName: actualIconName)
      }
      
      print("📱 [NotificationService] 🔧 Creating action: \(actionId) - \(title)\(icon != nil ? " [icon]" : "")")
      return UNNotificationAction(identifier: actionId, title: title, options: options, icon: icon)
    }
    
    let category = UNNotificationCategory(
      identifier: "DYNAMIC",
      actions: notificationActions,
      intentIdentifiers: [],
      options: []
    )
    
    UNUserNotificationCenter.current().setNotificationCategories([category])
    print("📱 [NotificationService] ✅ Registered category 'DYNAMIC' with \(notificationActions.count) actions")
  }
}
