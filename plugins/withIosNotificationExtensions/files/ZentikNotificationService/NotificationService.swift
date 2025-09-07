import UserNotifications
import UIKit
import Security
import CryptoKit
import UniformTypeIdentifiers

class NotificationService: UNNotificationServiceExtension {

    var contentHandler: ((UNNotificationContent) -> Void)?
    var bestAttemptContent: UNMutableNotificationContent?
    
    // Cache for already registered categories to avoid duplicates
    private static var registeredCategories: Set<String> = []
    private static let categoryLock = NSLock()

    override func didReceive(_ request: UNNotificationRequest, withContentHandler contentHandler: @escaping (UNNotificationContent) -> Void) {
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
            
            // Setup custom actions in a synchronized manner
            setupNotificationActions(content: bestAttemptContent) { [weak self] in
                guard let self = self else { return }
                
                // Final configuration log
                print("📱 [NotificationService] 🎯 Final notification configuration:")
                print("📱 [NotificationService] 🎯 Category identifier: \(bestAttemptContent.categoryIdentifier ?? "nil")")
                print("📱 [NotificationService] 🎯 User info keys: \(bestAttemptContent.userInfo.keys.map { $0 })")
                
                // Check if this notification has media attachments
                if self.hasMediaAttachments(content: bestAttemptContent) {
                    print("📱 [NotificationService] Media attachments detected, starting download...")
                    self.downloadMediaAttachments(content: bestAttemptContent) {
                        print("📱 [NotificationService] Media processing completed, delivering notification")
                        print("📱 [NotificationService] 🚀 Delivering notification with category: \(bestAttemptContent.categoryIdentifier ?? "nil")")
                        contentHandler(bestAttemptContent)
                    }
                } else {
                    print("📱 [NotificationService] No media attachments, delivering notification immediately")
                    print("📱 [NotificationService] 🚀 Delivering notification with category: \(bestAttemptContent.categoryIdentifier ?? "nil")")
                    contentHandler(bestAttemptContent)
                }
            }
        } else {
            print("📱 [NotificationService] ❌ Failed to create mutable content")
            contentHandler(request.content)
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
               let obj = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
                print("📱 [NotificationService] 🔍 Parsed decrypted object keys: \(obj.keys.sorted())")
                if let title = obj["title"] as? String { content.title = title }
                if let body = obj["body"] as? String { content.body = body }
                if let subtitle = obj["subtitle"] as? String { content.subtitle = subtitle }

                var updated = content.userInfo as? [String: Any] ?? [:]
                if let notificationId = obj["notificationId"] { updated["notificationId"] = notificationId }
                if let actions = obj["actions"] as? [[String: Any]] { updated["actions"] = actions }
                if let attachmentData = obj["attachmentData"] as? [[String: Any]] { updated["attachmentData"] = attachmentData }
                if let tapAction = obj["tapAction"] as? [String: Any] { 
                    updated["tapAction"] = tapAction
                }
                content.userInfo = updated
                return
            }
        }
        
        // Decrypt alert fields if present
        if let aps = userInfo["aps"] as? [String: Any],
           let alert = aps["alert"] as? [String: Any] {
            
            if let encryptedTitle = alert["title"] as? String {
                if let decryptedTitle = decryptValue(encryptedTitle) {
                    content.title = decryptedTitle
                    print("📱 [NotificationService] 🔓 Decrypted title: \(decryptedTitle)")
                }
            }
            
            if let encryptedBody = alert["body"] as? String {
                if let decryptedBody = decryptValue(encryptedBody) {
                    content.body = decryptedBody
                    print("📱 [NotificationService] 🔓 Decrypted body: \(decryptedBody)")
                }
            }
            
            if let encryptedSubtitle = alert["subtitle"] as? String {
                if let decryptedSubtitle = decryptValue(encryptedSubtitle) {
                    content.subtitle = decryptedSubtitle
                    print("📱 [NotificationService] 🔓 Decrypted subtitle: \(decryptedSubtitle)")
                }
            }
        }
        
        // Decrypt notificationId if present
        if let encryptedNotificationId = userInfo["notificationId"] as? String {
            if let decryptedId = decryptValue(encryptedNotificationId) {
                var updatedUserInfo = content.userInfo as? [String: Any] ?? [:]
                updatedUserInfo["notificationId"] = decryptedId
                content.userInfo = updatedUserInfo
                print("📱 [NotificationService] 🔓 Decrypted notificationId: \(decryptedId)")
            }
        }
        
        // Decrypt actions if present
        if let actions = userInfo["actions"] as? [[String: Any]] {
            let decryptedActions = actions.compactMap { action -> [String: Any]? in
                var decryptedAction = action
                if let encryptedValue = action["value"] as? String,
                   let decryptedValue = decryptValue(encryptedValue) {
                    decryptedAction["value"] = decryptedValue
                    print("📱 [NotificationService] 🔓 Decrypted action value: \(decryptedValue)")
                }
                return decryptedAction
            }
            if !decryptedActions.isEmpty {
                var updatedUserInfo = content.userInfo as? [String: Any] ?? [:]
                updatedUserInfo["actions"] = decryptedActions
                content.userInfo = updatedUserInfo
            }
        }
        
        // Decrypt attachmentData if present
        if let attachmentData = userInfo["attachmentData"] as? [[String: Any]] {
            let decryptedAttachments = attachmentData.compactMap { attachment -> [String: Any]? in
                var decryptedAttachment = attachment
                if let encryptedUrl = attachment["url"] as? String,
                   let decryptedUrl = decryptValue(encryptedUrl) {
                    decryptedAttachment["url"] = decryptedUrl
                    print("📱 [NotificationService] 🔓 Decrypted attachment URL: \(decryptedUrl)")
                }
                return decryptedAttachment
            }
            if !decryptedAttachments.isEmpty {
                var updatedUserInfo = content.userInfo as? [String: Any] ?? [:]
                updatedUserInfo["attachmentData"] = decryptedAttachments
                content.userInfo = updatedUserInfo
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
            let base64Value = encryptedValue
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
                      let tagB64 = json["t"] else {
                    print("📱 [NotificationService] ❌ Missing encryption envelope fields")
                    return nil
                }
                guard let encryptedKey = Data(base64Encoded: encryptedKeyB64),
                      let iv = Data(base64Encoded: ivB64),
                      let encryptedPayload = Data(base64Encoded: encryptedPayloadB64),
                      let tag = Data(base64Encoded: tagB64) else {
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
        guard let decryptedKey = SecKeyCreateDecryptedData(
            privateKey,
            .rsaEncryptionOAEPSHA256,
            encryptedKey as CFData,
            &error
        ) else {
            throw error?.takeRetainedValue() ?? NSError(domain: "DecryptionError", code: -1, userInfo: nil)
        }
        return decryptedKey as Data
    }
    
    private func decryptAESPayload(encryptedPayload: Data, key: Data, iv: Data, tag: Data) throws -> Data {
        let sealedBox = try AES.GCM.SealedBox(
            nonce: AES.GCM.Nonce(data: iv),
            ciphertext: encryptedPayload,
            tag: tag
        )
        let decryptedData = try AES.GCM.open(sealedBox, using: SymmetricKey(data: key))
        return decryptedData
    }
    
    private func getPrivateKey() -> SecKey? {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "") ?? "{{MAIN_BUNDLE_ID}}"
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
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let keyData = result as? Data else {
            print("📱 [NotificationService] ❌ Failed to retrieve private key: \(status)")
            return nil
        }
        // Convert stored value to PEM string (handle JSON-wrapped string and \n escapes)
        var pemString: String
        if let jsonString = try? JSONSerialization.jsonObject(with: keyData, options: [.fragmentsAllowed]) as? String {
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
        let pkcs8 = pemString
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
            kSecAttrKeyClass as String: kSecAttrKeyClassPrivate
        ]
        var error: Unmanaged<CFError>?
        guard let privateKey = SecKeyCreateWithData(
            rsaDer as CFData,
            attributes as CFDictionary,
            &error
        ) else {
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
                    if bytes[i + j] != sequence[j] { match = false; break }
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
        guard let nullIndex = indexOf(sequence: nullBytes, start: oidIndex + oid.count) else { return nil }
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
        guard let decrypted = SecKeyCreateDecryptedData(
            privateKey,
            .rsaEncryptionOAEPSHA256,
            encryptedPayload as CFData,
            &error
        ) else {
            throw error?.takeRetainedValue() ?? NSError(domain: "DecryptionError", code: -2, userInfo: nil)
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
    
    private func setupNotificationActions(content: UNMutableNotificationContent, completion: @escaping () -> Void) {
        guard let userInfo = content.userInfo as? [String: Any] else {
            print("📱 [NotificationService] No userInfo found for actions")
            completion()
            return
        }
        
        // Look for actions in different payload structures
        var actions: [[String: Any]] = []
        
        if let actionsArray = userInfo["actions"] as? [[String: Any]] {
            actions = actionsArray
            print("📱 [NotificationService] Found actions as direct array: \(actions.count)")
            print("📱 [NotificationService] Actions data: \(actions)")
        } else if let singleAction = userInfo["action"] as? [String: Any] {
            actions = [singleAction]
            print("📱 [NotificationService] Found single action as direct object")
        } else if let payload = userInfo["payload"] as? [String: Any] {
            if let payloadActions = payload["actions"] as? [[String: Any]] {
                actions = payloadActions
                print("📱 [NotificationService] Found actions in payload as direct array: \(actions.count)")
            } else if let singlePayloadAction = payload["action"] as? [String: Any] {
                actions = [singlePayloadAction]
                print("📱 [NotificationService] Found single action in payload as direct object")
            }
        }
        
        print("📱 [NotificationService] Final actions array: \(actions)")
        
        // Always use Content Extension category
        let shouldUseContentExtension = true
        print("📱 [NotificationService] 🎯 FINAL DECISION: shouldUseContentExtension = \(shouldUseContentExtension)")
        
        if !actions.isEmpty {
            // Usa sempre la Content Extension principale
            let categoryId = "myNotificationCategory"
            
            print("📱 [NotificationService] 🎯 Choosing category: \(categoryId) (ContentExtension: \(shouldUseContentExtension))")
            
            print("📱 [NotificationService] 🆕 Creating category with actions: \(categoryId)")
            print("📱 [NotificationService] 📊 Current registered categories count: \(Self.getRegisteredCategoriesCount())")
            
            let notificationActions = actions.compactMap { actionData -> UNNotificationAction? in
                guard let type = actionData["type"] as? String,
                      let value = actionData["value"] as? String else {
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
                    let actualIconName = iconName.hasPrefix("sfsymbols:") 
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
                        print("📱 [NotificationService] 🎯 Final category identifier set to: \(content.categoryIdentifier ?? "nil")")
                    } else {
                        print("📱 [NotificationService] ❌ Failed to register category: \(categoryId)")
                        content.categoryIdentifier = "ZENTIK_FALLBACK_CATEGORY"
                        print("📱 [NotificationService] 🎯 Fallback category identifier set to: \(content.categoryIdentifier ?? "nil")")
                    }
                    completion()
                }
            } else {
                print("📱 [NotificationService] ⚠️ No valid actions created")
                // Don't set any category if no valid actions, regardless of shouldUseContentExtension
                print("📱 [NotificationService] 🎯 No category set (no valid actions)")
                completion()
            }
        } else {
            // Nessuna action: usa sempre la Content Extension principale
            print("📱 [NotificationService] 🎯 No actions, using Content Extension")
            content.categoryIdentifier = "myNotificationCategory"
            completion()
        }
    }
    
    // MARK: - Category Management
    
    private static func isCategoryRegistered(_ categoryId: String) -> Bool {
        categoryLock.lock()
        defer { categoryLock.unlock() }
        let isRegistered = registeredCategories.contains(categoryId)
        print("📱 [NotificationService] Checking if category is registered: \(categoryId) - Result: \(isRegistered)")
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
    
    private func registerCategorySynchronously(_ category: UNNotificationCategory, completion: @escaping (Bool) -> Void) {
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
                    print("📱 [NotificationService] 🗑️ Removed obsolete category: \(obsoleteCategory.identifier)")
                }
            }
            
            // Add the new category
            updatedCategories.insert(category)
            print("📱 [NotificationService] 🔧 Added new category, total categories: \(updatedCategories.count)")
            
            UNUserNotificationCenter.current().setNotificationCategories(updatedCategories)
            print("📱 [NotificationService] ✅ Category registered successfully: \(category.identifier)")
            completion(true)
        }
    }
    
    // MARK: - Media Attachments
    
    private func hasMediaAttachments(content: UNMutableNotificationContent) -> Bool {
        guard let userInfo = content.userInfo as? [String: Any] else {
            return false
        }
        
        if let attachmentData = userInfo["attachmentData"] as? [[String: Any]], !attachmentData.isEmpty {
            print("📱 [NotificationService] Found attachments as direct array")
            return true
        }
        
        return false
    }
    
    private func shouldUseContentExtensionForMedia(content: UNMutableNotificationContent) -> Bool {
        guard let userInfo = content.userInfo as? [String: Any],
              let attachmentData = userInfo["attachmentData"] as? [[String: Any]] else {
            return false
        }
        
        print("📱 [NotificationService] Total media: \(attachmentData.count)")
        
        // Debug: Print all media types
        for (index, attachment) in attachmentData.enumerated() {
            if let mediaType = attachment["mediaType"] as? String {
                print("📱 [NotificationService] Media \(index): \(mediaType)")
            }
        }
        
        // Use Content Extension if there's any media beyond only ICON
        let nonIconExists = attachmentData.contains { item in
            let t = (item["mediaType"] as? String ?? "").uppercased()
            return t != "ICON"
        }
        return nonIconExists
    }
    
    

    
    
    private func saveToSharedCache(localURL: URL, mediaAttachment: MediaAttachment) {
        // Save the icon to shared cache for potential future use by the app
        let cacheDirectory = getSharedMediaCacheDirectory()
        let fileName = generateSafeFileName(
            url: mediaAttachment.url,
            mediaType: mediaAttachment.mediaType,
            originalFileName: mediaAttachment.name
        )
        let destinationURL = cacheDirectory.appendingPathComponent(fileName)
        
        do {
            // Remove existing file if it exists
            if FileManager.default.fileExists(atPath: destinationURL.path) {
                try FileManager.default.removeItem(at: destinationURL)
            }
            try FileManager.default.copyItem(at: localURL, to: destinationURL)
            print("📱 [NotificationService] ✅ ICON saved to shared cache: \(fileName)")
        } catch {
            print("📱 [NotificationService] ❌ Failed to save ICON to shared cache: \(error.localizedDescription)")
        }
    }
    
    private func downloadMediaAttachments(content: UNMutableNotificationContent, completion: @escaping () -> Void) {
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
        print("📱 [NotificationService] Priority order: IMAGE(1) -> GIF(2) -> VIDEO(3) -> AUDIO(4) -> ICON(5)")
        print("📱 [NotificationService] After sorting:")
        for (index, item) in mediaAttachments.enumerated() {
            let priority = getCompactPriority(item.mediaType)
            print("📱 [NotificationService]   [\(index)] \(item.mediaType) (priority: \(priority))")
        }
        print("📱 [NotificationService] Selected media: \(mediaAttachments[0].mediaType) with priority \(getCompactPriority(mediaAttachments[0].mediaType))")
        
        // Select only ONE media by priority for attachment (prefer non-ICON)
        let nonIconItems = mediaAttachments.filter { $0.mediaType.uppercased() != "ICON" }
        let selectedItem: MediaAttachment = nonIconItems.first ?? mediaAttachments[0]
        print("📱 [NotificationService] 🎯 Selected for NSE attachment: \(selectedItem.mediaType)")

        // Download only the selected media
        downloadMediaAttachment(mediaItem: selectedItem) { attachment in
            if let attachment = attachment {
                content.attachments = [attachment]
                print("📱 [NotificationService] ✅ Media downloaded for compact view: \(selectedItem.mediaType)")

                // Additionally, download only the ICON to shared cache (if exists and not the selected one)
                if let iconItem = mediaAttachments.first(where: { $0.mediaType.uppercased() == "ICON" }) , iconItem.url != selectedItem.url {
                    let cacheDir = self.getSharedMediaCacheDirectory()
                    self.downloadMediaToSharedCache(iconItem, in: cacheDir) {
                        print("📱 [NotificationService] 💾 ICON cached for Content Extension")
                    }
                }
            } else {
                print("📱 [NotificationService] ❌ Failed to download selected media, will show error")
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
                   let url = attachment["url"] as? String {
                    let name = attachment["name"] as? String
                    let originalFileName = attachment["originalFileName"] as? String
                    
                    // Use originalFileName if available, otherwise name
                    let fileName = originalFileName ?? name
                    let priority = getCompactPriority(mediaType)
                    mediaAttachments.append(MediaAttachment(mediaType: mediaType, url: url, name: fileName))
                    
                    print("📱 [NotificationService] 📎 Found attachment [\(index)]: \(mediaType) (priority: \(priority)) - \(fileName ?? "no name")")
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
        case "GIF": return 10.0    // 10 MB for GIFs (treated as images)
        case "ICON": return 10.0   // 10 MB for icons (treated as images)
        case "AUDIO": return 5.0   // 5 MB for audio
        default: return 10.0       // Default 10 MB
        }
    }
    
    private func downloadMediaAttachment(mediaItem: MediaAttachment, completion: @escaping (UNNotificationAttachment?) -> Void) {
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
        var attachmentOptions: [NSObject : AnyObject]? = nil
        
        switch mediaItem.mediaType.uppercased() {
        case "VIDEO":
            fileExtension = "mp4"
            identifier = "zentik-video"
            if #available(iOS 14.0, *) {
                attachmentOptions = [UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.mpeg4Movie.identifier as AnyObject]
            }
        case "AUDIO":
            fileExtension = "m4a"
            identifier = "zentik-audio"
            if #available(iOS 14.0, *) {
                attachmentOptions = [UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.mpeg4Audio.identifier as AnyObject]
            }
        case "GIF":
            fileExtension = "gif"
            identifier = "zentik-gif"
            if #available(iOS 14.0, *) {
                attachmentOptions = [UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.gif.identifier as AnyObject]
            }
        case "IMAGE":
            fileExtension = "jpg"
            identifier = "zentik-image"
            if #available(iOS 14.0, *) {
                attachmentOptions = [UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.jpeg.identifier as AnyObject]
            }
        case "ICON":
            fileExtension = "png"
            identifier = "zentik-icon"
            if #available(iOS 14.0, *) {
                attachmentOptions = [UNNotificationAttachmentOptionsTypeHintKey as NSObject: UTType.png.identifier as AnyObject]
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

            let sharedMeta = self.getSharedMetadata()
            let cacheKey = "\(mediaItem.mediaType.uppercased())_\(mediaItem.url)"
            if sharedMeta[cacheKey] != nil {
                let candidateUrl = FileManager.default.fileExists(atPath: typeCandidate.path) ? typeCandidate : (FileManager.default.fileExists(atPath: rootCandidate.path) ? rootCandidate : nil)
                if let candidateUrl {
                    print("📱 [NotificationService] ⚡️ Using cached media from shared metadata: \(cacheKey)")
                    do {
                        // Create attachment from a temp copy to avoid any system move/lock on the shared file
                        let tmpAttachmentUrl = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
                        if FileManager.default.fileExists(atPath: tmpAttachmentUrl.path) {
                            try? FileManager.default.removeItem(at: tmpAttachmentUrl)
                        }
                        let sharedData = try Data(contentsOf: candidateUrl, options: [.mappedIfSafe])
                        try sharedData.write(to: tmpAttachmentUrl, options: [.atomic])
                        let attachment = try UNNotificationAttachment(
                            identifier: identifier,
                            url: tmpAttachmentUrl,
                            options: attachmentOptions as? [String : Any]
                        )
                        // Mark as completed in shared metadata since we're using cached file
                        self.markMediaAsCompleted(mediaItem, success: true)
                        completion(attachment)
                        return
                    } catch {
                        print("📱 [NotificationService] ⚠️ Failed to create attachment from cached file, will redownload: \(error)")
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
                let downloadedFileAttributes = try FileManager.default.attributesOfItem(atPath: downloadedUrl.path)
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
                       content.lowercased().contains("<html") || content.lowercased().contains("error") {
                        
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
                try FileManager.default.createDirectory(at: typeDirectory, withIntermediateDirectories: true, attributes: nil)
                let cacheFileUrl = typeDirectory.appendingPathComponent(filename)
                
                // Create the directory if it doesn't exist
                try FileManager.default.createDirectory(at: typeDirectory, withIntermediateDirectories: true, attributes: nil)
                
                // Remove existing file if it exists to avoid copy conflicts
                if FileManager.default.fileExists(atPath: cacheFileUrl.path) {
                    do {
                        let attrs = try FileManager.default.attributesOfItem(atPath: cacheFileUrl.path)
                        let oldSize = (attrs[.size] as? NSNumber)?.int64Value ?? -1
                        print("📱 [NotificationService] 🔎 Pre-existing file before overwrite: path=\(cacheFileUrl.path) size=\(oldSize)")
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
                    try FileManager.default.setAttributes([.protectionKey: FileProtectionType.none], ofItemAtPath: cacheFileUrl.path)
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
                print("📱 [NotificationService] 🔎 Compact file verification: exists=\(compactExists) path=\(cacheFileUrl.path) size=\(compactSize)")
                
                // Validate file size before creating attachment
                let fileAttributes = try FileManager.default.attributesOfItem(atPath: cacheFileUrl.path)
                let fileSize = fileAttributes[FileAttributeKey.size] as? Int64 ?? 0
                let fileSizeMB = Double(fileSize) / (1024.0 * 1024.0)
                
                // Check iOS attachment size limits
                let maxSizeMB = self.getMaxAttachmentSize(for: mediaItem.mediaType)
                if fileSizeMB > maxSizeMB {
                    print("📱 [NotificationService] ❌ File too large: \(String(format: "%.2f", fileSizeMB))MB > \(maxSizeMB)MB limit for \(mediaItem.mediaType)")
                    // Remove the file since it's too large
                    try? FileManager.default.removeItem(at: cacheFileUrl)
                    
                    // Try to create attachment to get the actual iOS error message
                    do {
                        let _ = try UNNotificationAttachment(
                            identifier: identifier,
                            url: cacheFileUrl,
                            options: attachmentOptions as? [String : Any]
                        )
                    } catch {
                        // Use the actual iOS error message with size info
                        let errorMessage = "\(error.localizedDescription)\n\(String(format: "%.1f", fileSizeMB))MB > \(Int(maxSizeMB))MB"
                        if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
                            completion(errorAttachment)
                        } else {
                            completion(nil)
                        }
                        return
                    }
                    
                    // Fallback if no error was thrown (shouldn't happen)
                    let errorMessage = "Invalid attachment file size\n\(String(format: "%.1f", fileSizeMB))MB > \(Int(maxSizeMB))MB"
                    if let errorAttachment = self.createErrorAttachment(message: errorMessage) {
                        completion(errorAttachment)
                    } else {
                        completion(nil)
                    }
                    return
                }
                
                print("📱 [NotificationService] ✅ File size valid: \(String(format: "%.2f", fileSizeMB))MB (limit: \(maxSizeMB)MB)")
                
                // Create attachment from a temp copy to avoid any system move/lock on the shared file
                let tmpAttachmentUrl = FileManager.default.temporaryDirectory.appendingPathComponent(filename)
                // Ensure no leftovers
                if FileManager.default.fileExists(atPath: tmpAttachmentUrl.path) {
                    try? FileManager.default.removeItem(at: tmpAttachmentUrl)
                }
                // Byte-for-byte copy into a new temp file for attachment
                let sharedData = try Data(contentsOf: cacheFileUrl, options: [.mappedIfSafe])
                try sharedData.write(to: tmpAttachmentUrl, options: [.atomic])
                // Ensure accessibility for the temp copy (not strictly necessary but consistent)
                do {
                    try FileManager.default.setAttributes([.protectionKey: FileProtectionType.none], ofItemAtPath: tmpAttachmentUrl.path)
                } catch { }
                let attachment = try UNNotificationAttachment(
                    identifier: identifier,
                    url: tmpAttachmentUrl,
                    options: attachmentOptions as? [String : Any]
                )
                
                print("📱 [NotificationService] ✅ Created \(identifier) attachment and saved to cache: \(cacheFileUrl.path)")
                print("📱 [NotificationService] 📁 File saved with name: \(filename)")
                // Mark as completed in shared metadata (set isDownloading=false and update size)
                self.markMediaAsCompleted(mediaItem, success: true)
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
    private func generateSafeFileName(url: String, mediaType: String, originalFileName: String?) -> String {
        // Extract the extension from the original filename or URL
        let fileExtension = getFileExtension(url: url, mediaType: mediaType, originalFileName: originalFileName)
        
        // Generate a robust hash for the filename
        let longHash = generateLongHash(url: url)
        
        let safeFileName = "\(mediaType.lowercased())_\(longHash)"
        
        return "\(safeFileName)\(fileExtension)"
    }
    
    /**
     * Generate a robust hash for URL-based filename generation
     * Uses the same algorithm as the mobile app
     */
    private func generateLongHash(url: String) -> String {
        // Use a simple but effective hash algorithm matching React Native
        var hash: UInt32 = 0
        for char in url.utf8 {
            hash = hash &* 31 &+ UInt32(char) // Safe multiplication and addition
        }
        // Convert to hex string and pad to 8 characters
        return String(format: "%08x", hash)
    }
    
    // MARK: - Error Image Generation
    
    /**
     * Generates an error image with the specified message
     */
    private func generateErrorImage(message: String, width: CGFloat = 400, height: CGFloat = 200) -> URL? {
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
            .foregroundColor: UIColor.systemRed
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
            }()
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
              let imageData = image.pngData() else {
            print("📱 [NotificationService] ❌ Failed to generate error image data")
            return nil
        }
        
        // Save to temporary file
        let tempDir = FileManager.default.temporaryDirectory
        let errorImageURL = tempDir.appendingPathComponent("notification_error_\(Int(Date().timeIntervalSince1970 * 1000)).png")
        
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
    private func getFileExtension(url: String, mediaType: String, originalFileName: String?) -> String {
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
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-badge-count",
            kSecAttrAccount as String: "badge",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, 
           let data = result as? Data, 
           let countString = String(data: data, encoding: .utf8),
           let count = Int(countString) {
            print("📱 [NotificationService] 🔢 Retrieved badge count from keychain: \(count)")
            return count
        }
        
        print("📱 [NotificationService] 🔢 No badge count found in keychain, defaulting to 0")
        return 0
    }
    
    private func saveBadgeCountToKeychain(count: Int) {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let countData = String(count).data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-badge-count",
            kSecAttrAccount as String: "badge",
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: countData,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        // Delete any existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-badge-count",
            kSecAttrAccount as String: "badge",
            kSecAttrAccessGroup as String: accessGroup
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
    
    // MARK: - Background Download Management
    
    private func startBackgroundDownloadOfRemainingMedia(_ mediaAttachments: [MediaAttachment]) {
        print("📱 [NotificationService] 🚀 Starting background download of remaining \(mediaAttachments.count - 1) media attachments")
        
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        
        // Create cache directory structure if it doesn't exist
        do {
            try FileManager.default.createDirectory(at: sharedCacheDirectory, withIntermediateDirectories: true, attributes: nil)
            
            // Create subdirectories for each media type
            let mediaTypes = ["IMAGE", "VIDEO", "GIF", "AUDIO", "ICON"]
            for mediaType in mediaTypes {
                let typeDir = sharedCacheDirectory.appendingPathComponent(mediaType)
                try FileManager.default.createDirectory(at: typeDir, withIntermediateDirectories: true, attributes: nil)
            }
        } catch {
            print("📱 [NotificationService] ❌ Failed to create cache directory structure: \(error)")
            return
        }
        
        // Initialize shared metadata with downloading status for remaining media
        let remainingMedia = Array(mediaAttachments.dropFirst())
        updateSharedMetadata(for: remainingMedia)
        
        // Download remaining media in background (non-blocking)
        DispatchQueue.global(qos: .background).async {
            self.downloadRemainingMediaInBackground(remainingMedia, in: sharedCacheDirectory)
        }
    }
    
    private func downloadRemainingMediaInBackground(_ mediaAttachments: [MediaAttachment], in cacheDirectory: URL) {
        let downloadGroup = DispatchGroup()
        
        // Download remaining media attachments in parallel
        for mediaAttachment in mediaAttachments {
            downloadGroup.enter()
            downloadMediaToSharedCache(mediaAttachment, in: cacheDirectory) {
                downloadGroup.leave()
            }
        }
        
        // Wait for all downloads to complete (with shorter timeout for background)
        let result = downloadGroup.wait(timeout: .now() + 15) // 15 seconds timeout for background
        
        if result == .timedOut {
            print("📱 [NotificationService] ⚠️ Some background downloads timed out")
            // Mark timed out downloads as failed in shared metadata
            self.markTimedOutDownloadsAsFailed(mediaAttachments)
        } else {
            print("📱 [NotificationService] ✅ All background media downloads completed successfully")
        }
    }
    
    private func setDownloadErrorFlag(for mediaAttachment: MediaAttachment) {
        let sharedMetaPath = getSharedMetadataFilePath()
        var sharedMeta = getSharedMetadata()
        
        let cacheKey = "\(mediaAttachment.mediaType.uppercased())_\(mediaAttachment.url)"
        sharedMeta[cacheKey] = [
            "url": mediaAttachment.url,
            "mediaType": mediaAttachment.mediaType,
            "timestamp": Date().timeIntervalSince1970 * 1000,
            "downloadProgress": 0,
            "isDownloading": false,
            "hasError": true,
            "errorMessage": "Download failed in NotificationService"
        ]
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: sharedMeta, options: .prettyPrinted)
            try jsonData.write(to: sharedMetaPath)
            print("📱 [NotificationService] ✅ Set download error flag for: \(cacheKey)")
        } catch {
            print("📱 [NotificationService] ❌ Failed to set download error flag: \(error)")
        }
    }
    
    private func markTimedOutDownloadsAsFailed(_ mediaAttachments: [MediaAttachment]) {
        let sharedMetaPath = getSharedMetadataFilePath()
        var sharedMeta = getSharedMetadata()
        
        for mediaAttachment in mediaAttachments {
            let cacheKey = "\(mediaAttachment.mediaType.uppercased())_\(mediaAttachment.url)"
            if var item = sharedMeta[cacheKey] as? [String: Any] {
                item["hasError"] = true
                item["errorMessage"] = "Download timed out"
                item["isDownloading"] = false
                sharedMeta[cacheKey] = item
            }
        }
        
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: sharedMeta, options: .prettyPrinted)
            try jsonData.write(to: sharedMetaPath)
            print("📱 [NotificationService] ✅ Marked timed out downloads as failed")
        } catch {
            print("📱 [NotificationService] ❌ Failed to mark timed out downloads as failed: \(error)")
        }
    }
    
    // MARK: - Media Pre-Caching (Legacy - kept for compatibility)
    
    private func preCacheAllMediaAttachments(_ mediaAttachments: [MediaAttachment]) {
        print("📱 [NotificationService] 🚀 Starting download of ALL \(mediaAttachments.count) media attachments to shared cache")
        
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        
        // Create cache directory structure if it doesn't exist
        do {
            try FileManager.default.createDirectory(at: sharedCacheDirectory, withIntermediateDirectories: true, attributes: nil)
            
            // Create subdirectories for each media type
            let mediaTypes = ["IMAGE", "VIDEO", "GIF", "AUDIO", "ICON"]
            for mediaType in mediaTypes {
                let typeDir = sharedCacheDirectory.appendingPathComponent(mediaType)
                try FileManager.default.createDirectory(at: typeDir, withIntermediateDirectories: true, attributes: nil)
            }
        } catch {
            print("📱 [NotificationService] ❌ Failed to create cache directory structure: \(error)")
            return
        }
        
        // Initialize shared metadata with downloading status
        updateSharedMetadata(for: mediaAttachments)
        
        // Use DispatchGroup to wait for all downloads to complete
        let downloadGroup = DispatchGroup()
        
        // Download all media attachments in parallel with synchronization
        for mediaAttachment in mediaAttachments {
            downloadGroup.enter()
            downloadMediaToSharedCache(mediaAttachment, in: sharedCacheDirectory) {
                downloadGroup.leave()
            }
        }
        
        // Wait for all downloads to complete (with timeout to avoid blocking forever)
        let result = downloadGroup.wait(timeout: .now() + 25) // 25 seconds timeout
        
        if result == .timedOut {
            print("📱 [NotificationService] ⚠️ Some downloads timed out, but continuing with available media")
        } else {
            print("📱 [NotificationService] ✅ All media downloads completed successfully")
        }
    }
    
    private func downloadMediaToSharedCache(_ mediaAttachment: MediaAttachment, in cacheDirectory: URL, completion: @escaping () -> Void) {
        guard let url = URL(string: mediaAttachment.url) else {
            print("📱 [NotificationService] ❌ Invalid URL for pre-cache: \(mediaAttachment.url)")
            markMediaAsCompleted(mediaAttachment, success: false)
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
        let typeDirectory = cacheDirectory.appendingPathComponent(mediaAttachment.mediaType.uppercased())
        let cacheFile = typeDirectory.appendingPathComponent(filename)
        
        // Check if already cached
        if FileManager.default.fileExists(atPath: cacheFile.path) {
            print("📱 [NotificationService] ✅ Media already cached: \(mediaAttachment.mediaType) - \(filename)")
            markMediaAsCompleted(mediaAttachment, success: true)
            completion()
            return
        }
        
        print("📱 [NotificationService] ⬇️ Downloading to shared cache: \(mediaAttachment.mediaType) - \(filename)")
        
        // Download and cache with completion callback
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            defer { completion() }
            
            if let error = error {
                print("📱 [NotificationService] ❌ Failed to download media to shared cache: \(error)")
                self?.markMediaAsCompleted(mediaAttachment, success: false)
                return
            }
            
            guard let data = data else {
                print("📱 [NotificationService] ❌ No data received for shared cache")
                self?.markMediaAsCompleted(mediaAttachment, success: false)
                return
            }
            
            // Save to shared cache
            do {
                try data.write(to: cacheFile)
                // Ensure the file is readable by the main app (adjust protection and backup flags)
                do {
                    try FileManager.default.setAttributes([.protectionKey: FileProtectionType.none], ofItemAtPath: cacheFile.path)
                } catch {
                    print("📱 [NotificationService] ⚠️ Failed to set file protection to none: \(error)")
                }
                do {
                    var rv = URLResourceValues()
                    rv.isExcludedFromBackup = true
                    var mutableUrl = cacheFile
                    try mutableUrl.setResourceValues(rv)
                } catch {
                    print("📱 [NotificationService] ⚠️ Failed to set isExcludedFromBackup: \(error)")
                }
                // Verify the file was saved in the shared container
                let savedExists = FileManager.default.fileExists(atPath: cacheFile.path)
                var savedSize: Int64 = -1
                if savedExists {
                    do {
                        let attrs = try FileManager.default.attributesOfItem(atPath: cacheFile.path)
                        if let size = attrs[.size] as? NSNumber {
                            savedSize = size.int64Value
                        }
                    } catch {
                        print("📱 [NotificationService] ⚠️ Failed to read saved file attributes: \(error)")
                    }
                }
                print("📱 [NotificationService] 🔎 Saved file verification: exists=\(savedExists) path=\(cacheFile.path) size=\(savedSize)")
                print("📱 [NotificationService] ✅ Downloaded to shared cache: \(mediaAttachment.mediaType) (\(data.count) bytes) - \(filename)")
                self?.markMediaAsCompleted(mediaAttachment, success: true)
            } catch {
                print("📱 [NotificationService] ❌ Failed to save to shared cache: \(error)")
                self?.markMediaAsCompleted(mediaAttachment, success: false)
            }
        }.resume()
    }
    
    private func updateSharedMetadata(for mediaAttachments: [MediaAttachment]) {
        // Update shared metadata using a JSON file in the shared container
        // This will be read by the Content Extension to show loading states
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let metadataFile = sharedCacheDirectory.appendingPathComponent("metadata.json")
        
        var sharedMetadata: [String: [String: Any]] = [:]
        
        // Load existing metadata from file
        if FileManager.default.fileExists(atPath: metadataFile.path) {
            do {
                let data = try Data(contentsOf: metadataFile)
                if let existing = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] {
                    sharedMetadata = existing
                }
            } catch {
                print("📱 [NotificationService] ⚠️ Failed to load existing metadata: \(error)")
            }
        }
        
        let now = Date().timeIntervalSince1970 * 1000
        
        // Add metadata for each media attachment
        for mediaAttachment in mediaAttachments {
            let cacheKey = "\(mediaAttachment.mediaType.uppercased())_\(mediaAttachment.url)"
            let filename = generateSafeFileName(
                url: mediaAttachment.url,
                mediaType: mediaAttachment.mediaType,
                originalFileName: mediaAttachment.name
            )
            let typeDirectory = sharedCacheDirectory.appendingPathComponent(mediaAttachment.mediaType.uppercased())
            let localPath = typeDirectory.appendingPathComponent(filename).path
            
            // Ensure path starts with file:// for consistency with React Native
            var formattedPath = localPath
            if !formattedPath.hasPrefix("file://") {
                formattedPath = "file://\(formattedPath)"
            }
            
            sharedMetadata[cacheKey] = [
                "url": mediaAttachment.url,
                "localPath": formattedPath,
                "timestamp": now,
                "size": 0, // Will be updated when download completes
                "mediaType": mediaAttachment.mediaType.uppercased(),
                "originalFileName": mediaAttachment.name ?? "",
                "isDownloading": true,
                "downloadProgress": 0,
                "notificationDate": now
            ]
        }
        
        // Save updated metadata to file
        do {
            let data = try JSONSerialization.data(withJSONObject: sharedMetadata, options: .prettyPrinted)
            try data.write(to: metadataFile)
            print("📱 [NotificationService] ✅ Updated shared metadata file for \(mediaAttachments.count) media items")
            print("📱 [NotificationService] 📄 Metadata file path: \(metadataFile.path)")
            print("📱 [NotificationService] 📊 Metadata keys: \(Array(sharedMetadata.keys))")
        } catch {
            print("📱 [NotificationService] ❌ Failed to save shared metadata file: \(error)")
        }
    }
    
    private func markMediaAsCompleted(_ mediaAttachment: MediaAttachment, success: Bool) {
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let metadataFile = sharedCacheDirectory.appendingPathComponent("metadata.json")
        
        var sharedMetadata: [String: [String: Any]] = [:]
        
        // Load existing metadata
        if FileManager.default.fileExists(atPath: metadataFile.path) {
            do {
                let data = try Data(contentsOf: metadataFile)
                if let existing = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] {
                    sharedMetadata = existing
                }
            } catch {
                print("📱 [NotificationService] ⚠️ Failed to load existing metadata for completion: \(error)")
            }
        }
        
        let cacheKey = "\(mediaAttachment.mediaType.uppercased())_\(mediaAttachment.url)"
        // Resolve cached file path to update size/localPath
        let filename = generateSafeFileName(url: mediaAttachment.url, mediaType: mediaAttachment.mediaType, originalFileName: mediaAttachment.name)
        let typeDirectory = sharedCacheDirectory.appendingPathComponent(mediaAttachment.mediaType.uppercased())
        let typeCandidate = typeDirectory.appendingPathComponent(filename)
        let rootCandidate = sharedCacheDirectory.appendingPathComponent(filename)
        let fileUrl: URL? = FileManager.default.fileExists(atPath: typeCandidate.path) ? typeCandidate : (FileManager.default.fileExists(atPath: rootCandidate.path) ? rootCandidate : nil)
        var fileSize: Int64 = 0
        if let fileUrl {
            if let attrs = try? FileManager.default.attributesOfItem(atPath: fileUrl.path), let sizeNum = attrs[.size] as? NSNumber {
                fileSize = sizeNum.int64Value
            }
        }

        var mediaMetadata = sharedMetadata[cacheKey] ?? [:]
        mediaMetadata["isDownloading"] = false
        mediaMetadata["downloadProgress"] = success ? 100 : 0
        mediaMetadata["hasError"] = !success
        if success { 
            mediaMetadata["downloadedAt"] = Date().timeIntervalSince1970 * 1000
            mediaMetadata["errorMessage"] = nil
        } else {
            mediaMetadata["errorMessage"] = "Download failed"
        }
        if let fileUrl { 
            // Ensure path starts with file:// for consistency with React Native
            var pathString = fileUrl.path
            if !pathString.hasPrefix("file://") {
                pathString = "file://\(pathString)"
            }
            mediaMetadata["localPath"] = pathString
        }
        if fileSize > 0 { mediaMetadata["size"] = fileSize }
        // Ensure timestamp exists
        if mediaMetadata["timestamp"] == nil { mediaMetadata["timestamp"] = Date().timeIntervalSince1970 * 1000 }
        sharedMetadata[cacheKey] = mediaMetadata

        // Save updated metadata
        do {
            let data = try JSONSerialization.data(withJSONObject: sharedMetadata, options: .prettyPrinted)
            try data.write(to: metadataFile)
            print("📱 [NotificationService] ✅ Marked media as completed: \(cacheKey) (success: \(success)) size: \(fileSize)")
        } catch {
            print("📱 [NotificationService] ❌ Failed to update completion metadata: \(error)")
        }
    }

    // Load shared metadata from JSON file in the shared container
    private func getSharedMetadata() -> [String: [String: Any]] {
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let metadataFile = sharedCacheDirectory.appendingPathComponent("metadata.json")
        guard FileManager.default.fileExists(atPath: metadataFile.path) else {
            return [:]
        }
        do {
            let data = try Data(contentsOf: metadataFile)
            if let json = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] {
                return json
            }
        } catch {
            print("📱 [NotificationService] ⚠️ Failed to load shared metadata: \(error)")
        }
        return [:]
    }
    
    private func getSharedMetadataFilePath() -> URL {
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        return sharedCacheDirectory.appendingPathComponent("metadata.json")
    }
    
    private func getSharedMediaCacheDirectory() -> URL {
        // Use App Groups shared container for cross-process access
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationService", with: "") ?? "{{MAIN_BUNDLE_ID}}"
        let appGroupIdentifier = "group.\(bundleIdentifier)"
        
        if let sharedContainerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
            return sharedContainerURL.appendingPathComponent("shared_media_cache")
        } else {
            // Fallback to Documents directory if App Groups not available
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            return documentsPath.appendingPathComponent("shared_media_cache")
        }
    }
}