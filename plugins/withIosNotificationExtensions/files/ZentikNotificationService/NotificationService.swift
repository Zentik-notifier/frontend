import CryptoKit
import Intents
import SQLite3
import Security
import UIKit
import UniformTypeIdentifiers
import UserNotifications

// SQLite helper for Swift bindings
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

class NotificationService: UNNotificationServiceExtension {

  var contentHandler: ((UNNotificationContent) -> Void)?
  var bestAttemptContent: UNMutableNotificationContent?

  // Cache for already registered categories to avoid duplicates
  private static var registeredCategories: Set<String> = []
  private static let categoryLock = NSLock()

  override func didReceive(
    _ request: UNNotificationRequest,
    withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void
  ) {
    print("📱 [NotificationService] ========== NOTIFICATION RECEIVED ==========")
    print("📱 [NotificationService] Request identifier: \(request.identifier)")
    print("📱 [NotificationService] Title: \(request.content.title)")
    print("📱 [NotificationService] Body: \(request.content.body)")
    print("📱 [NotificationService] UserInfo: \(request.content.userInfo)")

    self.contentHandler = contentHandler
    bestAttemptContent = (request.content.mutableCopy() as? UNMutableNotificationContent)

    if let bestAttemptContent = bestAttemptContent {
      // Decrypt encrypted values first
      decryptNotificationContent(content: bestAttemptContent)

      // Update badge count before setting up actions
      updateBadgeCount(content: bestAttemptContent)

      // Save the notification content
      self.savePendingNotification(content: bestAttemptContent)

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
            // self.applyCommunicationStyleIfPossible(content: bestAttemptContent) {
            //   print(
            //     "📱 [NotificationService] 🚀 Delivering notification with category: \(bestAttemptContent.categoryIdentifier ?? "nil")"
            //   )

            //   contentHandler(bestAttemptContent)
            // }
          }
        } else {
          print("📱 [NotificationService] No media attachments, applying Communication Style...")

          self._handleChatMessage()
          return
          // self.applyCommunicationStyleIfPossible(content: bestAttemptContent) {
          //   print(
          //     "📱 [NotificationService] 🚀 Delivering notification with category: \(bestAttemptContent.categoryIdentifier ?? "nil")"
          //   )

          //   contentHandler(bestAttemptContent)
          // }
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
    let senderId = (userInfo["bucketId"] as? String)
    let chatRoomName = (userInfo["bucketName"] as? String)
    let senderDisplayName = (content.title as? String)
    let senderThumbnail = (userInfo["bucketIconUrl"] as? String)
    let bucketColor = (userInfo["bucketColor"] as? String)

    var senderAvatarImageData: Data?
    
    if let senderThumbnailUrl = URL(string: senderThumbnail ?? ""),
       let senderThumbnailImageData = try? Data(contentsOf: senderThumbnailUrl) {
      // Successfully downloaded the image - use it directly
      senderAvatarImageData = senderThumbnailImageData
      print("📱 [NotificationService] 🎭 ✅ Successfully loaded sender image from URL")
    }
    
    // If no image data available, check shared cache first, then possibly generate placeholder
    if senderAvatarImageData == nil {
      print("📱 [NotificationService] 🎭 ⚠️ Sender image not available, checking shared cache...")

      // Try to get placeholder from shared cache first
      if let bucketId = senderId, let bucketName = chatRoomName ?? senderDisplayName {
        senderAvatarImageData = getPlaceholderFromSharedCache(bucketId: bucketId, bucketName: bucketName)
      }

      // Read UI preference: show app icon when bucket icon missing (skip custom avatar)
      let showAppIcon = readBoolFromKeychain(service: "zentik-setting-show-app-icon-missing") ?? true

      // If still no image data, generate new placeholder ONLY if preference is disabled
      if senderAvatarImageData == nil && showAppIcon == false {
        print("📱 [NotificationService] 🎭 No cached placeholder found, generating new one")
        senderAvatarImageData = generateAvatarPlaceholder(
          name: chatRoomName ?? senderDisplayName ?? "Zentik",
          hexColor: bucketColor,
          bucketId: senderId
        )
      }
    }
    
    guard let finalImageData = senderAvatarImageData else {
      print("📱 [NotificationService] 🎭 ❌ Failed to generate sender image")
      return
    }

    // profile picture that will be displayed in the notification (left side)
    let senderAvatar: INImage = INImage(imageData: finalImageData)

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

    // the actual message. We use the OS to send us ourselves a message.
    let incomingMessagingIntent = INSendMessageIntent(
      recipients: [selfPerson],
      outgoingMessageType: .outgoingMessageText,  // This marks the message as outgoing
      content: content.body,  // this will replace the content.body
      speakableGroupName: nil,
      conversationIdentifier: chatRoomName,  // this will be used as the conversation title
      serviceName: nil,
      sender: senderPerson,  // this marks the message sender as the person we defined above
      attachments: []
    )

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

      // everything went alright, we are ready to display our notification.
      contentHandler(bestAttemptContent!)
    } catch let error {
      print("error \(error)")
    }
  }

  private func generateAvatarPlaceholder(name: String, hexColor: String?, bucketId: String? = nil) -> Data? {
    let initials: String = {
      let cleanName = name.trimmingCharacters(in: .whitespacesAndNewlines)
      if cleanName.count >= 2 {
        return String(cleanName.prefix(2)).uppercased()
      } else if cleanName.count == 1 {
        return cleanName.uppercased()
      } else {
        return "Z" // Fallback for empty name
      }
    }()

    let size = CGSize(width: 128, height: 128)
    UIGraphicsBeginImageContextWithOptions(size, false, 0)
    defer { UIGraphicsEndImageContext() }

    let context = UIGraphicsGetCurrentContext()
    let color = colorFromHex(hexColor) ?? UIColor.systemGray

    // Circle background
    context?.setFillColor(color.cgColor)
    context?.fillEllipse(in: CGRect(origin: .zero, size: size))

    // Initial letter
    let attributes: [NSAttributedString.Key: Any] = [
      .font: UIFont.systemFont(ofSize: 60, weight: .semibold),
      .foregroundColor: UIColor.white,
    ]
    let text = initials as NSString
    let textSize = text.size(withAttributes: attributes)
    let textRect = CGRect(
      x: (size.width - textSize.width) / 2,
      y: (size.height - textSize.height) / 2,
      width: textSize.width,
      height: textSize.height
    )
    text.draw(in: textRect, withAttributes: attributes)

    guard let imageData = UIGraphicsGetImageFromCurrentImageContext()?.pngData() else {
      print("📱 [NotificationService] ❌ Failed to generate placeholder image data")
      return nil
    }

    // Save placeholder to shared cache for NCE to access
    if let bucketId = bucketId {
      let _ = savePlaceholderToSharedCache(imageData, bucketId: bucketId, bucketName: name)
      print("📱 [NotificationService] 🎭 Generated placeholder with initials: \(initials)")
    }

    return imageData
  }

  private func colorFromHex(_ hex: String?) -> UIColor? {
    guard var hex = hex else { return nil }
    hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
    hex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
    guard hex.count == 6 else { return nil }
    let rStr = String(hex.prefix(2))
    let gStr = String(hex.dropFirst(2).prefix(2))
    let bStr = String(hex.dropFirst(4).prefix(2))
    let r = UInt8(rStr, radix: 16) ?? 120
    let g = UInt8(gStr, radix: 16) ?? 120
    let b = UInt8(bStr, radix: 16) ?? 120
    return UIColor(
      red: CGFloat(r) / 255.0, green: CGFloat(g) / 255.0, blue: CGFloat(b) / 255.0, alpha: 1.0)
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
        return
      }
    }
  }

  private func decryptValue(_ encryptedValue: String) -> String? {
    guard let privateKey = getPrivateKey() else {
      print("📱 [NotificationService] ❌ Private key not found")
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
    let bundleIdentifier =
      Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "")
      ?? "{{MAIN_BUNDLE_ID}}"
    let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"

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
      let categoryId = "myNotificationCategory"

      print("📱 [NotificationService] 🆕 Creating category with actions: \(categoryId)")
      print(
        "📱 [NotificationService] 📊 Current registered categories count: \(Self.getRegisteredCategoriesCount())"
      )

      let notificationActions = actions.compactMap { actionData -> UNNotificationAction? in
        guard let type = actionData["type"] as? String,
          let value = actionData["value"] as? String
        else {
          print("📱 [NotificationService] ⚠️ Invalid action data: \(actionData)")
          return nil
        }

        let title = actionData["title"] as? String ?? value

        let destructive = actionData["destructive"] as? Bool ?? false
        let authRequired = actionData["authRequired"] as? Bool ?? true
        let actionId = "action_\(type)_\(value)"

        var options: UNNotificationActionOptions = []
        if destructive { options.insert(.destructive) }
        if authRequired { options.insert(.authenticationRequired) }

        var actionIcon: UNNotificationActionIcon?
        if let iconName = actionData["icon"] as? String, !iconName.isEmpty {
          let actualIconName =
            iconName.hasPrefix("sfsymbols:")
            ? String(iconName.dropFirst("sfsymbols:".count))
            : iconName
          actionIcon = UNNotificationActionIcon(systemImageName: actualIconName)
        }

        print("📱 [NotificationService] Created action: \(actionId) - \(title)")

        return UNNotificationAction(
          identifier: actionId,
          title: title,
          options: options,
          icon: actionIcon
        )
      }

      if !notificationActions.isEmpty {
        // Use standard options for the main category
        let options: UNNotificationCategoryOptions = [.customDismissAction]

        let category = UNNotificationCategory(
          identifier: categoryId,
          actions: notificationActions,
          intentIdentifiers: [],
          options: options
        )

        // Register the category in a synchronized manner
        registerCategorySynchronously(category) { [weak self] success in
          if success {
            print("📱 [NotificationService] ✅ Successfully registered category: \(categoryId)")
            content.categoryIdentifier = categoryId
          } else {
            print("📱 [NotificationService] ❌ Failed to register category: \(categoryId)")
            content.categoryIdentifier = "ZENTIK_FALLBACK_CATEGORY"
            print(
              "📱 [NotificationService] 🎯 Fallback category identifier set to: \(content.categoryIdentifier ?? "nil")"
            )
          }
          completion()
        }
      } else {
        print("📱 [NotificationService] ⚠️ No valid actions created")
        print("📱 [NotificationService] 🎯 No category set (no valid actions)")
        completion()
      }
    } else {
      // No actions: always use NCE category
      let categoryId = "myNotificationCategory"
      print("📱 [NotificationService] 🎯 No actions, using category: \(categoryId)")
      content.categoryIdentifier = categoryId
      completion()
    }
  }

  // MARK: - Category Management

  private static func isCategoryRegistered(_ categoryId: String) -> Bool {
    categoryLock.lock()
    defer { categoryLock.unlock() }
    let isRegistered = registeredCategories.contains(categoryId)
    print(
      "📱 [NotificationService] Checking if category is registered: \(categoryId) - Result: \(isRegistered)"
    )
    print("📱 [NotificationService] Currently registered categories: \(registeredCategories)")
    return isRegistered
  }

  private static func markCategoryAsRegistered(_ categoryId: String) {
    categoryLock.lock()
    defer { categoryLock.unlock() }

    // Keep only the last 5 categories to avoid exceeding iOS limits
    if registeredCategories.count >= 5 {
      let oldestCategory = registeredCategories.removeFirst()
      print("📱 [NotificationService] 🗑️ Removed oldest category to make space: \(oldestCategory)")
    }

    registeredCategories.insert(categoryId)
    print("📱 [NotificationService] Marked category as registered: \(categoryId)")
    print("📱 [NotificationService] Total registered categories: \(registeredCategories.count)")
  }

  private static func getRegisteredCategoriesCount() -> Int {
    categoryLock.lock()
    defer { categoryLock.unlock() }
    return registeredCategories.count
  }

  private func registerCategorySynchronously(
    _ category: UNNotificationCategory, completion: @escaping (Bool) -> Void
  ) {
    print("📱 [NotificationService] 🔧 Starting category registration for: \(category.identifier)")
    print("📱 [NotificationService] 🔧 Category actions count: \(category.actions.count)")

    // Register the category directly
    UNUserNotificationCenter.current().getNotificationCategories { existingCategories in
      print("📱 [NotificationService] 🔧 Found \(existingCategories.count) existing categories")

      var updatedCategories = existingCategories

      // Remove duplicate categories if they exist
      let removedCount = updatedCategories.filter { $0.identifier == category.identifier }.count
      updatedCategories = updatedCategories.filter { $0.identifier != category.identifier }
      if removedCount > 0 {
        print("📱 [NotificationService] 🔧 Removed \(removedCount) duplicate categories")
      }

      // Clean up obsolete categories (keep only the last 10)
      if updatedCategories.count > 10 {
        let categoriesToRemove = updatedCategories.count - 10
        let sortedCategories = updatedCategories.sorted { $0.identifier < $1.identifier }
        let obsoleteCategories = Array(sortedCategories.prefix(categoriesToRemove))

        for obsoleteCategory in obsoleteCategories {
          updatedCategories.remove(obsoleteCategory)
          print(
            "📱 [NotificationService] 🗑️ Removed obsolete category: \(obsoleteCategory.identifier)")
        }
      }

      // Add the new category
      updatedCategories.insert(category)
      print(
        "📱 [NotificationService] 🔧 Added new category, total categories: \(updatedCategories.count)"
      )

      UNUserNotificationCenter.current().setNotificationCategories(updatedCategories)
      completion(true)
    }
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

        // self.downloadIconsToSharedCache(from: userInfo)
      } else {
        print("📱 [NotificationService] ❌ Failed to download selected media, will show error")
        // Set error flag in shared metadata for Content Extension to handle
        self.setDownloadErrorFlag(for: selectedItem)
      }
      completion()
    }
  }

  // MARK: - Media Processing Helpers
  
  // private func downloadIconsToSharedCache(from userInfo: [String: Any]) {
  //   guard let attachmentData = userInfo["attachmentData"] as? [[String: Any]] else {
  //     return
  //   }
    
  //   // Find all ICON attachments and download them to shared cache
  //   for attachment in attachmentData {
  //     if let mediaType = attachment["mediaType"] as? String,
  //        mediaType.uppercased() == "ICON",
  //        let url = attachment["url"] as? String,
  //        let name = attachment["name"] as? String {
        
  //       let iconItem = MediaAttachment(mediaType: mediaType, url: url, name: name)
  //       let cacheDir = self.getSharedMediaCacheDirectory()
        
  //       self.downloadMediaToSharedCache(iconItem, in: cacheDir) {
  //         print("📱 [NotificationService] 💾 ICON cached for Content Extension: \(name)")
  //       }
  //     }
  //   }
  // }

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
      let cacheDirectory = self.getAppCacheDirectory()
      let filename = self.generateSafeFileName(
        url: mediaItem.url,
        mediaType: mediaItem.mediaType,
        originalFileName: mediaItem.name
      )
      let rootCandidate = cacheDirectory.appendingPathComponent(filename)
      let typeDirectory = cacheDirectory.appendingPathComponent(mediaItem.mediaType.uppercased())
      let typeCandidate = typeDirectory.appendingPathComponent(filename)

      if let localPath = self.getLocalPathFromDb(url: mediaItem.url, mediaType: mediaItem.mediaType)
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
        let cacheDirectory = self.getAppCacheDirectory()

        // Generate a safe filename using the same logic as the app's media-cache
        let filename = self.generateSafeFileName(
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

  private func getAppCacheDirectory() -> URL {
    return getSharedMediaCacheDirectory()
  }

  /**
   * Generates a safe filename based on URL and media type
   * Uses the same logic as the app's media-cache
   */
  private func generateSafeFileName(url: String, mediaType: String, originalFileName: String?)
    -> String
  {
    // Extract the extension from the original filename or URL
    let fileExtension = getFileExtension(
      url: url, mediaType: mediaType, originalFileName: originalFileName)

    // Generate a robust hash for the filename
    let longHash = generateLongHash(url: url)

    let safeFileName = "\(mediaType.lowercased())_\(longHash)"

    return "\(safeFileName)\(fileExtension)"
  }

  /**
   * Generate a robust hash for URL-based filename generation
   * Uses the same algorithm as the mobile app (React Native media-cache)
   */
  private func generateLongHash(url: String) -> String {
    // Replicate exact React Native algorithm: hash = (hash * 31 + char) >>> 0
    var hash: UInt32 = 0
    for char in url.utf8 {
      // Use safe arithmetic operations to avoid overflow (matching JS >>> 0)
      hash = (hash &* 31 &+ UInt32(char))  // Swift &* and &+ provide overflow protection
    }
    // Convert to hex string and pad to 8 characters (matching JS toString(16).padStart(8, '0'))
    return String(format: "%08x", hash)
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

  /**
   * Gets the file extension based on media type or URL
   * Uses the same logic as the app's media-cache
   */
  private func getFileExtension(url: String, mediaType: String, originalFileName: String?) -> String
  {
    // Try first from the original filename
    if let originalFileName = originalFileName {
      let parts = originalFileName.components(separatedBy: ".")
      if parts.count > 1 {
        let ext = parts.last!
        if ext.count <= 5 && ext.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil {
          return ".\(ext.lowercased())"
        }
      }
    }

    // Try from the URL
    let urlParts = url.components(separatedBy: "?")[0].components(separatedBy: ".")
    if urlParts.count > 1 {
      let ext = urlParts.last!
      if ext.count <= 5 && ext.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil {
        return ".\(ext.lowercased())"
      }
    }

    // Default based on media type
    switch mediaType.uppercased() {
    case "IMAGE":
      return ".jpg"
    case "GIF":
      return ".gif"
    case "VIDEO":
      return ".mp4"
    case "AUDIO":
      return ".mp3"
    default:
      return ".dat"
    }
  }

  // MARK: - Badge Count Management

  private func updateBadgeCount(content: UNMutableNotificationContent) {
    print("📱 [NotificationService] 🔢 Updating badge count...")

    // Get current badge count from keychain
    let currentCount = getBadgeCountFromKeychain()
    let newCount = currentCount + 1

    print("📱 [NotificationService] 🔢 Current badge count: \(currentCount), new count: \(newCount)")

    // Update the notification badge
    content.badge = NSNumber(value: newCount)

    // Save new count to keychain for app synchronization
    saveBadgeCountToKeychain(count: newCount)

    print("📱 [NotificationService] ✅ Badge count updated to \(newCount)")
  }

  private func getBadgeCountFromKeychain() -> Int {
    let bundleIdentifier =
      Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "")
      ?? "com.apocaliss92.zentik"
    let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"

    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-badge-count",
      kSecAttrAccount as String: "badge",
      kSecAttrAccessGroup as String: accessGroup,
      kSecReturnData as String: true,
      kSecMatchLimit as String: kSecMatchLimitOne,
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(query as CFDictionary, &result)

    if status == errSecSuccess,
      let data = result as? Data,
      let countString = String(data: data, encoding: .utf8),
      let count = Int(countString)
    {
      print("📱 [NotificationService] 🔢 Retrieved badge count from keychain: \(count)")
      return count
    }

    print("📱 [NotificationService] 🔢 No badge count found in keychain, defaulting to 0")
    return 0
  }

  private func saveBadgeCountToKeychain(count: Int) {
    let bundleIdentifier =
      Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "")
      ?? "com.apocaliss92.zentik"
    let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"

    let countData = String(count).data(using: .utf8)!

    let query: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-badge-count",
      kSecAttrAccount as String: "badge",
      kSecAttrAccessGroup as String: accessGroup,
      kSecValueData as String: countData,
      kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock,
    ]

    // Delete any existing item first
    let deleteQuery: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-badge-count",
      kSecAttrAccount as String: "badge",
      kSecAttrAccessGroup as String: accessGroup,
    ]
    SecItemDelete(deleteQuery as CFDictionary)

    // Add the new item
    let status = SecItemAdd(query as CFDictionary, nil)
    if status == errSecSuccess {
      print("📱 [NotificationService] ✅ Successfully saved badge count \(count) to keychain")
    } else {
      print("📱 [NotificationService] ❌ Failed to save badge count to keychain (status: \(status))")
    }
  }

  private func setDownloadErrorFlag(for mediaAttachment: MediaAttachment) {
    upsertCacheItem(
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

  private func downloadMediaToSharedCache(
    _ mediaAttachment: MediaAttachment, in cacheDirectory: URL, completion: @escaping () -> Void
  ) {
    guard let url = URL(string: mediaAttachment.url) else {
      print("📱 [NotificationService] ❌ Invalid URL for pre-cache: \(mediaAttachment.url)")
      markMediaAsCompleted(mediaAttachment, success: false, isNewDownload: true)
      completion()
      return
    }

    // Generate filename using the same logic as media-cache
    let filename = generateSafeFileName(
      url: mediaAttachment.url,
      mediaType: mediaAttachment.mediaType,
      originalFileName: mediaAttachment.name
    )

    // Save to media type subdirectory
    let typeDirectory = cacheDirectory.appendingPathComponent(
      mediaAttachment.mediaType.uppercased())
    let cacheFile = typeDirectory.appendingPathComponent(filename)

    // Check if already cached
    if FileManager.default.fileExists(atPath: cacheFile.path) {
      // For icons, also check if they have the correct resized dimensions
      if mediaAttachment.mediaType.uppercased() == "ICON" {
        print("📱 [NotificationService] ✅ Icon already cached with correct size: \(filename)")
        markMediaAsCompleted(mediaAttachment, success: true, isNewDownload: false)
        completion()
        return
      } else {
        print(
          "📱 [NotificationService] ✅ Media already cached: \(mediaAttachment.mediaType) - \(filename)"
        )
        markMediaAsCompleted(mediaAttachment, success: true, isNewDownload: false)
        completion()
        return
      }
    }

    print(
      "📱 [NotificationService] ⬇️ Downloading to shared cache: \(mediaAttachment.mediaType) - \(filename)"
    )

    // Download and cache with completion callback
    URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
      defer { completion() }

      if let error = error {
        print("📱 [NotificationService] ❌ Failed to download media to shared cache: \(error)")
        self?.markMediaAsCompleted(mediaAttachment, success: false, isNewDownload: true)
        return
      }

      guard let data = data else {
        print("📱 [NotificationService] ❌ No data received for shared cache")
        self?.markMediaAsCompleted(mediaAttachment, success: false, isNewDownload: true)
        return
      }

      // Process data based on media type before saving
      var dataToSave = data
      var finalCacheFile = cacheFile

      if mediaAttachment.mediaType.uppercased() == "ICON" {
        print("📱 [NotificationService] 🔧 ICON detected, starting resize process...")
        print("📱 [NotificationService] 🔍 Original icon data size: \(data.count) bytes")

        // Check data format before resize
        if data.count >= 4 {
          let header = data.prefix(4)
          let headerBytes = header.map { $0 }
          print(
            "📱 [NotificationService] 🔍 Icon data header: \(headerBytes.map { String(format: "%02X", $0) }.joined(separator: " "))"
          )

          if headerBytes[0] == 0xFF && headerBytes[1] == 0xD8 {
            print("📱 [NotificationService] 🔍 Icon appears to be JPEG format")
          } else if headerBytes[0] == 0x89 && headerBytes[1] == 0x50 && headerBytes[2] == 0x4E
            && headerBytes[3] == 0x47
          {
            print("📱 [NotificationService] 🔍 Icon appears to be PNG format")
          } else {
            print("📱 [NotificationService] ⚠️ Icon format not recognized")
          }
        }

        // Try to create UIImage first to verify the data
        if let testImage = UIImage(data: data) {
          let size = testImage.size
          print(
            "📱 [NotificationService] ✅ Original icon successfully decoded: \(size.width)x\(size.height)"
          )

          // DISABLED: Icon resize logic - NSE no longer resizes icons, NCE handles them
          print("📱 [NotificationService] 🚫 Icon resize disabled - using original data")
          dataToSave = data  // Use original data without resizing
        } else {
          print("📱 [NotificationService] ❌ Failed to decode original icon data, using as-is")
          // Let's also check what the original image looks like
          if let originalImage = UIImage(data: data) {
            let size = originalImage.size
            print(
              "📱 [NotificationService] 📊 Original icon dimensions: \(size.width)x\(size.height)")
          } else {
            print("📱 [NotificationService] ❌ Cannot create UIImage from original data")
          }
        }
      }

      // Save to shared cache
      do {
        try dataToSave.write(to: finalCacheFile)
        // Ensure the file is readable by the main app (adjust protection and backup flags)
        do {
          try FileManager.default.setAttributes(
            [.protectionKey: FileProtectionType.none], ofItemAtPath: finalCacheFile.path)
        } catch {
          print("📱 [NotificationService] ⚠️ Failed to set file protection to none: \(error)")
        }
        do {
          var rv = URLResourceValues()
          rv.isExcludedFromBackup = true
          var mutableUrl = finalCacheFile
          try mutableUrl.setResourceValues(rv)
        } catch {
          print("📱 [NotificationService] ⚠️ Failed to set isExcludedFromBackup: \(error)")
        }
        // Verify the file was saved in the shared container
        let savedExists = FileManager.default.fileExists(atPath: finalCacheFile.path)
        var savedSize: Int64 = -1
        if savedExists {
          do {
            let attrs = try FileManager.default.attributesOfItem(atPath: finalCacheFile.path)
            if let size = attrs[.size] as? NSNumber {
              savedSize = size.int64Value
            }
          } catch {
            print("📱 [NotificationService] ⚠️ Failed to read saved file attributes: \(error)")
          }
        }
        print(
          "📱 [NotificationService] 🔎 Saved file verification: exists=\(savedExists) path=\(finalCacheFile.path) size=\(savedSize)"
        )
        print(
          "📱 [NotificationService] ✅ Downloaded to shared cache: \(mediaAttachment.mediaType) (\(dataToSave.count) bytes) - \(finalCacheFile.lastPathComponent)"
        )
        self?.markMediaAsCompleted(mediaAttachment, success: true, isNewDownload: true)
      } catch {
        print("📱 [NotificationService] ❌ Failed to save to shared cache: \(error)")
        self?.markMediaAsCompleted(mediaAttachment, success: false, isNewDownload: true)
      }
    }.resume()
  }

  private func markMediaAsCompleted(
    _ mediaAttachment: MediaAttachment, success: Bool, isNewDownload: Bool = true,
    errorCode: String? = nil
  ) {
    let sharedCacheDirectory = getSharedMediaCacheDirectory()
    let filename = generateSafeFileName(
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

    print(
      "📱 [NotificationService] 📊 Marking media as completed: success=\(success), errorCode=\(errorCode ?? "nil")"
    )
    upsertCacheItem(url: mediaAttachment.url, mediaType: mediaAttachment.mediaType, fields: fields)
  }

  // MARK: - SQLite helpers
  private func getDbPath() -> String {
    let dir = getSharedMediaCacheDirectory()
    return dir.appendingPathComponent("cache.db").path
  }

  private func upsertCacheItem(url: String, mediaType: String, fields: [String: Any]) {
    let dbPath = getDbPath()
    guard FileManager.default.fileExists(atPath: dbPath) else {
      print("📱 [NotificationService] ⚠️ DB not found, skipping upsert")
      return
    }
    var db: OpaquePointer?
    if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READWRITE, nil) != SQLITE_OK {
      print("📱 [NotificationService] ❌ Failed to open existing DB (rw) at \(dbPath)")
      return
    }
    defer { sqlite3_close(db) }
    let key = "\(mediaType.uppercased())_\(url)"
    // Build UPSERT using named columns
    var allFields = fields
    allFields["key"] = key
    allFields["url"] = url
    allFields["media_type"] = mediaType.uppercased()
    // Apply defaults for NOT NULL columns to satisfy RN schema
    let nowMs = Int(Date().timeIntervalSince1970 * 1000)
    if allFields["generating_thumbnail"] == nil { allFields["generating_thumbnail"] = 0 }
    if allFields["timestamp"] == nil { allFields["timestamp"] = nowMs }
    if allFields["size"] == nil { allFields["size"] = 0 }
    if allFields["downloaded_at"] == nil { allFields["downloaded_at"] = nowMs }
    if allFields["is_downloading"] == nil { allFields["is_downloading"] = 0 }
    if allFields["is_permanent_failure"] == nil { allFields["is_permanent_failure"] = 0 }
    if allFields["is_user_deleted"] == nil { allFields["is_user_deleted"] = 0 }

    // Log detailed attributes for debugging
    print("📱 [NotificationService] 📊 UPSERT attributes for \(mediaType.uppercased()) - \(url):")
    print("📱 [NotificationService] 📊   key: \(key)")
    if let localPath = allFields["local_path"] {
      print("📱 [NotificationService] 📊   local_path: \(localPath)")
    }
    if let size = allFields["size"] { print("📱 [NotificationService] 📊   size: \(size) bytes") }
    if let timestamp = allFields["timestamp"] {
      print("📱 [NotificationService] 📊   timestamp: \(timestamp)")
    }
    if let downloadedAt = allFields["downloaded_at"] {
      print("📱 [NotificationService] 📊   downloaded_at: \(downloadedAt)")
    }
    if let isDownloading = allFields["is_downloading"] {
      print("📱 [NotificationService] 📊   is_downloading: \(isDownloading)")
    }
    if let isPermanentFailure = allFields["is_permanent_failure"] {
      print("📱 [NotificationService] 📊   is_permanent_failure: \(isPermanentFailure)")
    }
    if let hasError = allFields["has_error"] {
      print("📱 [NotificationService] 📊   has_error: \(hasError)")
    }
    if let errorCode = allFields["error_code"] {
      print("📱 [NotificationService] 📊   error_code: \(errorCode)")
    }
    if let isUserDeleted = allFields["is_user_deleted"] {
      print("📱 [NotificationService] 📊   is_user_deleted: \(isUserDeleted)")
    }
    if let generatingThumbnail = allFields["generating_thumbnail"] {
      print("📱 [NotificationService] 📊   generating_thumbnail: \(generatingThumbnail)")
    }

    let columns = [
      "key", "url", "local_path", "local_thumb_path", "generating_thumbnail", "timestamp", "size",
      "media_type", "original_file_name", "downloaded_at", "notification_date", "is_downloading",
      "is_permanent_failure", "is_user_deleted", "error_code",
    ]
    let placeholders = Array(repeating: "?", count: columns.count).joined(separator: ",")
    let sql =
      "INSERT INTO cache_item (\(columns.joined(separator: ","))) VALUES (\(placeholders)) ON CONFLICT(key) DO UPDATE SET url=excluded.url, local_path=excluded.local_path, local_thumb_path=excluded.local_thumb_path, generating_thumbnail=excluded.generating_thumbnail, timestamp=excluded.timestamp, size=excluded.size, media_type=excluded.media_type, original_file_name=excluded.original_file_name, downloaded_at=excluded.downloaded_at, notification_date=excluded.notification_date, is_downloading=excluded.is_downloading, is_permanent_failure=excluded.is_permanent_failure, is_user_deleted=excluded.is_user_deleted, error_code=excluded.error_code;"
    var stmt: OpaquePointer?
    if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK {
      print(
        "📱 [NotificationService] ❌ Failed to prepare UPSERT: \(String(cString: sqlite3_errmsg(db)))"
      )
      return
    }
    defer { sqlite3_finalize(stmt) }
    func bind(_ idx: Int32, _ value: Any?) {
      if value == nil {
        sqlite3_bind_null(stmt, idx)
        return
      }
      switch value {
      case let v as String:
        sqlite3_bind_text(stmt, idx, (v as NSString).utf8String, -1, SQLITE_TRANSIENT)
      case let v as Int: sqlite3_bind_int64(stmt, idx, Int64(v))
      case let v as Int64: sqlite3_bind_int64(stmt, idx, v)
      case let v as Bool: sqlite3_bind_int(stmt, idx, v ? 1 : 0)
      default: sqlite3_bind_null(stmt, idx)
      }
    }
    let values: [Any?] = [
      allFields["key"],
      allFields["url"],
      allFields["local_path"],
      allFields["local_thumb_path"],
      allFields["generating_thumbnail"],
      allFields["timestamp"],
      allFields["size"],
      allFields["media_type"],
      allFields["original_file_name"],
      allFields["downloaded_at"],
      allFields["notification_date"],
      allFields["is_downloading"],
      allFields["is_permanent_failure"],
      allFields["is_user_deleted"],
      allFields["error_code"],
    ]
    for (i, v) in values.enumerated() { bind(Int32(i + 1), v) }
    if sqlite3_step(stmt) != SQLITE_DONE {
      print("📱 [NotificationService] ❌ UPSERT failed: \(String(cString: sqlite3_errmsg(db)))")
    } else {
      print("📱 [NotificationService] ✅ UPSERT successful for key: \(key)")
    }
  }

  private func getLocalPathFromDb(url: String, mediaType: String) -> String? {
    let dbPath = getDbPath()
    guard FileManager.default.fileExists(atPath: dbPath) else { return nil }
    var db: OpaquePointer?
    if sqlite3_open_v2(dbPath, &db, SQLITE_OPEN_READONLY, nil) != SQLITE_OK { return nil }
    defer { sqlite3_close(db) }
    let key = "\(mediaType.uppercased())_\(url)"
    let sql = "SELECT local_path FROM cache_item WHERE key = ? LIMIT 1"
    var stmt: OpaquePointer?
    if sqlite3_prepare_v2(db, sql, -1, &stmt, nil) != SQLITE_OK {
      return nil
    }
    defer { sqlite3_finalize(stmt) }
    sqlite3_bind_text(stmt, 1, (key as NSString).utf8String, -1, SQLITE_TRANSIENT)
    if sqlite3_step(stmt) == SQLITE_ROW {
      if let cString = sqlite3_column_text(stmt, 0) {
        return String(cString: cString)
      }
    }
    return nil
  }

  private func getSharedMediaCacheDirectory() -> URL {
    // Use App Groups shared container for cross-process access
    let bundleIdentifier =
      Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "")
      ?? "{{MAIN_BUNDLE_ID}}"
    let appGroupIdentifier = "group.\(bundleIdentifier)"

    if let sharedContainerURL = FileManager.default.containerURL(
      forSecurityApplicationGroupIdentifier: appGroupIdentifier)
    {
      return sharedContainerURL.appendingPathComponent("shared_media_cache")
    } else {
      // Fallback to Documents directory if App Groups not available
      let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask)
        .first!
      return documentsPath.appendingPathComponent("shared_media_cache")
    }
  }

  // MARK: - Pending Notifications Storage

  private func savePendingNotification(content: UNMutableNotificationContent) {
    print("📱 [NotificationService] 💾 Saving pending notification for cache update")

    guard let userInfo = content.userInfo as? [String: Any] else {
      print("📱 [NotificationService] ❌ No userInfo available")
      return
    }

    // Extract essential notification data
    var notificationData: [String: Any] = [
      "title": content.title,
      "body": content.body,
      "timestamp": ISO8601DateFormatter().string(from: Date()),
    ]

    if !content.subtitle.isEmpty {
      notificationData["subtitle"] = content.subtitle
    }

    // Extract notification ID
    if let notificationId = userInfo["notificationId"] as? String {
      notificationData["notificationId"] = notificationId
    }

    // Extract bucket ID
    if let bucketId = userInfo["bucketId"] as? String {
      notificationData["bucketId"] = bucketId
    }

    // Extract bucket display info
    if let bucketName = userInfo["bucketName"] as? String, !bucketName.isEmpty {
      notificationData["bucketName"] = bucketName
    }
    if let bucketIconUrl = userInfo["bucketIconUrl"] as? String, !bucketIconUrl.isEmpty {
      notificationData["bucketIconUrl"] = bucketIconUrl
    }

    // Extract actions
    if let actions = userInfo["actions"] as? [[String: Any]] {
      notificationData["actions"] = actions
    }

    // Extract attachment data
    if let attachmentData = userInfo["attachmentData"] as? [[String: Any]] {
      notificationData["attachmentData"] = attachmentData
    }

    // Extract tap action
    if let tapAction = userInfo["tapAction"] as? [String: Any] {
      notificationData["tapAction"] = tapAction
    }

    // Save to shared storage
    do {
      try storePendingNotification(data: notificationData)
      print("📱 [NotificationService] ✅ Pending notification saved successfully")
    } catch {
      print("📱 [NotificationService] ❌ Failed to save pending notification: \(error)")
    }
  }

  private func storePendingNotification(data: [String: Any]) throws {
    // Get existing pending notifications
    var pendingNotifications: [[String: Any]] = []

    let options: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-pending-notifications",
      kSecAttrAccessGroup as String: "C3F24V5NS5.com.apocaliss92.zentik.dev.keychain",
      kSecReturnData as String: true,
    ]

    var result: AnyObject?
    let status = SecItemCopyMatching(options as CFDictionary, &result)

    if status == errSecSuccess, let data = result as? Data {
      if let existing = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]] {
        pendingNotifications = existing
      }
    }

    // Add new notification
    pendingNotifications.append(data)

    // Limit to last 50 notifications to avoid excessive storage
    if pendingNotifications.count > 50 {
      pendingNotifications = Array(pendingNotifications.suffix(50))
    }

    // Save back to keychain
    let jsonData = try JSONSerialization.data(withJSONObject: pendingNotifications)

    let saveOptions: [String: Any] = [
      kSecClass as String: kSecClassGenericPassword,
      kSecAttrService as String: "zentik-pending-notifications",
      kSecAttrAccessGroup as String: "C3F24V5NS5.com.apocaliss92.zentik.dev.keychain",
      kSecValueData as String: jsonData,
    ]

    // Delete existing entry first
    let deleteStatus = SecItemDelete(saveOptions as CFDictionary)

    // Add new entry
    let addStatus = SecItemAdd(saveOptions as CFDictionary, nil)

    if addStatus != errSecSuccess {
      throw NSError(
        domain: "PendingNotificationStorage", code: Int(addStatus),
        userInfo: [NSLocalizedDescriptionKey: "Failed to save pending notification"])
    }

    print("📱 [NotificationService] 📊 Total pending notifications: \(pendingNotifications.count)")
  }

  private func resizeImageForCommunication(imageData: Data) -> Data {
    guard let image = UIImage(data: imageData) else {
      print("📱 [NotificationService] 🎭 ❌ Failed to create UIImage from data")
      return imageData
    }

    // Communication Notifications work best with 256x256 or smaller images
    let maxSize: CGFloat = 256
    let size = image.size

    // If image is already small enough, return original
    if size.width <= maxSize && size.height <= maxSize {
      print("📱 [NotificationService] 🎭 Image already small enough: \(size)")
      return imageData
    }

    // Calculate new size maintaining aspect ratio
    let aspectRatio = size.width / size.height
    let newSize: CGSize
    if size.width > size.height {
      newSize = CGSize(width: maxSize, height: maxSize / aspectRatio)
    } else {
      newSize = CGSize(width: maxSize * aspectRatio, height: maxSize)
    }

    print("📱 [NotificationService] 🎭 Resizing image from \(size) to \(newSize)")

    // Resize image
    UIGraphicsBeginImageContextWithOptions(newSize, false, 1.0)
    image.draw(in: CGRect(origin: .zero, size: newSize))
    let resizedImage = UIGraphicsGetImageFromCurrentImageContext()
    UIGraphicsEndImageContext()

    guard let resized = resizedImage,
      let resizedData = resized.jpegData(compressionQuality: 0.8)
    else {
      print("📱 [NotificationService] 🎭 ❌ Failed to resize image, using original")
      return imageData
    }

    print(
      "📱 [NotificationService] 🎭 ✅ Image resized successfully: \(imageData.count) -> \(resizedData.count) bytes"
    )
    return resizedData
  }

  // MARK: - Shared Storage Methods

  private func getPlaceholderFromSharedCache(bucketId: String, bucketName: String) -> Data? {
    let cacheDirectory = getSharedMediaCacheDirectory()
    let placeholderDirectory = cacheDirectory.appendingPathComponent("PLACEHOLDER")
    
    // Generate filename based on bucket info
    let safeBucketName = bucketName.replacingOccurrences(of: " ", with: "_").replacingOccurrences(of: "/", with: "_")
    let fileName = "placeholder_\(bucketId)_\(safeBucketName).png"
    let fileURL = placeholderDirectory.appendingPathComponent(fileName)
    
    // Check if placeholder exists
    guard FileManager.default.fileExists(atPath: fileURL.path) else {
      print("📱 [NotificationService] 🎭 No cached placeholder found for \(bucketName)")
      return nil
    }
    
    // Load placeholder data
    do {
      let data = try Data(contentsOf: fileURL)
      print("📱 [NotificationService] 🎭 ✅ Found cached placeholder for \(bucketName)")
      return data
    } catch {
      print("📱 [NotificationService] 🎭 ❌ Failed to load cached placeholder: \(error)")
      return nil
    }
  }

  private func savePlaceholderToSharedCache(_ imageData: Data, bucketId: String, bucketName: String) -> URL? {
    let cacheDirectory = getSharedMediaCacheDirectory()
    let placeholderDirectory = cacheDirectory.appendingPathComponent("PLACEHOLDER")
    
    // Create placeholder directory if it doesn't exist
    do {
      try FileManager.default.createDirectory(at: placeholderDirectory, withIntermediateDirectories: true, attributes: nil)
    } catch {
      print("📱 [NotificationService] ❌ Failed to create placeholder directory: \(error)")
      return nil
    }
    
    // Generate filename based on bucket info
    let safeBucketName = bucketName.replacingOccurrences(of: " ", with: "_").replacingOccurrences(of: "/", with: "_")
    let fileName = "placeholder_\(bucketId)_\(safeBucketName).png"
    let fileURL = placeholderDirectory.appendingPathComponent(fileName)
    
    do {
      try imageData.write(to: fileURL)
      print("📱 [NotificationService] ✅ Saved placeholder to shared cache: \(fileURL.lastPathComponent)")
      return fileURL
    } catch {
      print("📱 [NotificationService] ❌ Failed to save placeholder to shared cache: \(error)")
      return nil
    }
  }
}
