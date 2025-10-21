import Foundation
import Security

/**
 * KeychainAccess - Shared keychain utilities
 * 
 * Provides secure storage and retrieval of sensitive data (API tokens, endpoints)
 * using iOS Keychain with App Group sharing.
 */
public class KeychainAccess {
    
    // MARK: - Bundle & Keychain Access Group
    
    /// Get main app bundle identifier
    public static func getMainBundleIdentifier() -> String {
        if let bundleId = Bundle.main.bundleIdentifier {
            // Remove extension suffixes (e.g., ".ZentikNotificationService", ".ZentikNotificationContentExtension")
            let extensionSuffixes = [
                "NotificationServiceExtension",
                "NotificationContentExtension",
                "ZentikNotificationService",
                "ZentikNotificationContentExtension"
            ]
            
            let components = bundleId.components(separatedBy: ".")
            if components.count > 2, let last = components.last, extensionSuffixes.contains(last) {
                return components.dropLast().joined(separator: ".")
            }
            return bundleId
        }
        return "com.apocaliss92.zentik.dev"
    }
    
    /// Get keychain access group for sharing data between app and extensions
    public static func getKeychainAccessGroup() -> String {
        let mainBundleId = getMainBundleIdentifier()
        let teamId = "C3F24V5NS5"
        return "\(teamId).\(mainBundleId).keychain"
    }
    
    // MARK: - Keychain Operations
    
    /// Get API endpoint from SQLite database (replaces keychain storage)
    public static func getApiEndpoint() -> String? {
        print("🔑 [KeychainAccess] 📍 Getting API endpoint from database...")
        let value = DatabaseAccess.getSettingValue(key: "auth_apiEndpoint")
        if let endpoint = value {
            print("🔑 [KeychainAccess] ✅ API endpoint found: \(endpoint)")
        } else {
            print("🔑 [KeychainAccess] ❌ API endpoint not found in database")
        }
        return value
    }
    
    /// Get stored auth token from keychain (reads accessToken from zentik-auth service)
    public static func getStoredAuthToken() -> String? {
        print("🔑 [KeychainAccess] 🎫 Getting auth token from Keychain...")
        let keychainAccessGroup = getKeychainAccessGroup()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-auth",
            kSecAttrAccessGroup as String: keychainAccessGroup,
            kSecReturnAttributes as String: true,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, let item = result as? [String: Any] {
            // The accessToken is stored as kSecAttrAccount (username)
            if let accountData = item[kSecAttrAccount as String] as? String {
                print("🔑 [KeychainAccess] ✅ Auth token found (length: \(accountData.count))")
                return accountData
            }
        }
        
        print("🔑 [KeychainAccess] ❌ Auth token not found (status: \(status))")
        return nil
    }
    
    /// Save value to keychain
    public static func saveToKeychain(key: String, value: String) -> Bool {
        let keychainAccessGroup = getKeychainAccessGroup()
        
        print("🔑 [KeychainAccess] 💾 Saving value for key: \(key)")
        print("🔑 [KeychainAccess] Keychain Access Group: \(keychainAccessGroup)")
        
        // Delete existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: keychainAccessGroup
        ]
        let deleteStatus = SecItemDelete(deleteQuery as CFDictionary)
        print("🔑 [KeychainAccess] Delete existing item status: \(deleteStatus)")
        
        // Add new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: value.data(using: .utf8)!,
            kSecAttrAccessGroup as String: keychainAccessGroup,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        let success = status == errSecSuccess
        
        if success {
            print("🔑 [KeychainAccess] ✅ Successfully saved to keychain")
        } else {
            print("🔑 [KeychainAccess] ❌ Failed to save to keychain (status: \(status))")
        }
        
        return success
    }
    
    /// Get value from keychain
    private static func getKeychainValue(key: String) -> String? {
        let keychainAccessGroup = getKeychainAccessGroup()
        let bundleId = getMainBundleIdentifier()
        
        print("🔑 [KeychainAccess] Getting keychain value for key: \(key)")
        print("🔑 [KeychainAccess] Bundle ID: \(bundleId)")
        print("🔑 [KeychainAccess] Keychain Access Group: \(keychainAccessGroup)")
        
        // Determine service and account based on key (matching NCE format)
        let service: String
        let account: String?
        
        if key == "authToken" {
            service = "zentik-auth"
            account = nil  // Token is in kSecAttrAccount, not specified in query
        } else if key == "apiEndpoint" {
            service = "zentik-api-endpoint"
            account = "endpoint"
        } else {
            service = "zentik-\(key)"
            account = key
        }
        
        var query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccessGroup as String: keychainAccessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        // Add account for non-auth queries
        if let acc = account {
            query[kSecAttrAccount as String] = acc
        }
        
        // For auth token, also return attributes to get kSecAttrAccount
        if key == "authToken" {
            query[kSecReturnAttributes as String] = true
        }
        
        print("🔑 [KeychainAccess] Query: \(query)")
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        print("🔑 [KeychainAccess] SecItemCopyMatching status: \(status)")
        
        if status == errSecSuccess {
            print("🔑 [KeychainAccess] ✅ Successfully retrieved keychain item")
            
            // For auth token, extract from kSecAttrAccount (react-native-keychain format)
            if key == "authToken", let item = result as? [String: Any] {
                print("🔑 [KeychainAccess] 🔍 Extracting token from item attributes...")
                
                // Try to get account as String directly first
                if let accessToken = item[kSecAttrAccount as String] as? String {
                    print("🔑 [KeychainAccess] ✅ Token found in kSecAttrAccount (as String, length: \(accessToken.count))")
                    return accessToken
                }
                // Try to get account as Data and convert to String
                else if let accountData = item[kSecAttrAccount as String] as? Data,
                        let accessToken = String(data: accountData, encoding: .utf8) {
                    print("🔑 [KeychainAccess] ✅ Token found in kSecAttrAccount (as Data, length: \(accessToken.count))")
                    return accessToken
                } else {
                    print("🔑 [KeychainAccess] ❌ Found item but failed to extract token from kSecAttrAccount")
                    print("🔑 [KeychainAccess] 🔍 Item keys: \(item.keys)")
                    return nil
                }
            }
            // For other keys, extract from data
            else if let data = result as? Data, let value = String(data: data, encoding: .utf8) {
                print("🔑 [KeychainAccess] ✅ Value decoded successfully (length: \(value.count))")
                return value
            } else {
                print("🔑 [KeychainAccess] ❌ Failed to decode data to string")
                return nil
            }
        } else {
            let errorMessage: String
            switch status {
            case errSecItemNotFound:
                errorMessage = "Item not found in keychain (errSecItemNotFound: -25300)"
            case errSecInvalidKeychain:
                errorMessage = "Invalid keychain (errSecInvalidKeychain)"
            case errSecAuthFailed:
                errorMessage = "Authentication failed (errSecAuthFailed)"
            case errSecInteractionNotAllowed:
                errorMessage = "Interaction not allowed (errSecInteractionNotAllowed: -25308)"
            case errSecMissingEntitlement:
                errorMessage = "Missing entitlement (errSecMissingEntitlement: -34018)"
            default:
                errorMessage = "Unknown error (status: \(status))"
            }
            print("🔑 [KeychainAccess] ❌ Error: \(errorMessage)")
            return nil
        }
    }
    
    /// Delete value from keychain
    public static func deleteFromKeychain(key: String) -> Bool {
        let keychainAccessGroup = getKeychainAccessGroup()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: keychainAccessGroup
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        return status == errSecSuccess || status == errSecItemNotFound
    }
    
    // MARK: - Badge Count Operations
    
    /// Get badge count from SQLite database (replaces keychain storage)
    public static func getBadgeCountFromKeychain() -> Int {
        guard let countString = DatabaseAccess.getSettingValue(key: "auth_badgeCount"),
              let count = Int(countString) else {
            print("🔑 [KeychainAccess] ℹ️ No badge count found in database, returning 0")
            return 0
        }
        
        print("🔑 [KeychainAccess] ✅ Retrieved badge count from database: \(count)")
        return count
    }
    
    /// Save badge count to SQLite database (replaces keychain storage)
    public static func saveBadgeCountToKeychain(count: Int) {
        let success = DatabaseAccess.setSettingValue(key: "auth_badgeCount", value: String(count))
        
        if success {
            print("🔑 [KeychainAccess] ✅ Saved badge count to database: \(count)")
        } else {
            print("🔑 [KeychainAccess] ❌ Failed to save badge count to database")
        }
    }
    
    /// Decrement badge count in SQLite database
    public static func decrementBadgeCount(source: String) {
        let currentCount = getBadgeCountFromKeychain()
        let newCount = max(0, currentCount - 1)
        saveBadgeCountToKeychain(count: newCount)
        
        print("🔑 [KeychainAccess] 🔢 Badge count decremented from \(currentCount) to \(newCount) (source: \(source))")
    }
    
    // MARK: - Intent Storage Operations
    
    /// Store intent data in SQLite database (replaces keychain storage)
    /// - Parameters:
    ///   - data: Intent data dictionary
    ///   - service: Service identifier (ignored, kept for compatibility)
    public static func storeIntentInKeychain(data: [String: Any], service: String) throws {
        do {
            let jsonData = try JSONSerialization.data(withJSONObject: data)
            guard let jsonString = String(data: jsonData, encoding: .utf8) else {
                throw NSError(domain: "KeychainError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to convert intent to JSON string"])
            }
            
            let success = DatabaseAccess.setSettingValue(key: "auth_pendingNavigationIntent", value: jsonString)
            
            if success {
                print("🔑 [KeychainAccess] ✅ Stored pending navigation intent in database (service: \(service))")
            } else {
                throw NSError(domain: "KeychainError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to store intent in database"])
            }
        } catch {
            print("🔑 [KeychainAccess] ❌ Failed to store intent: \(error.localizedDescription)")
            throw error
        }
    }
    
    /// Get intent data from SQLite database (replaces keychain storage)
    /// - Parameter service: Service identifier (ignored, kept for compatibility)
    /// - Returns: Intent data dictionary or nil if not found
    public static func getIntentFromKeychain(service: String) -> [String: Any]? {
        guard let jsonString = DatabaseAccess.getSettingValue(key: "auth_pendingNavigationIntent"),
              let jsonData = jsonString.data(using: .utf8) else {
            print("🔑 [KeychainAccess] ℹ️ No pending navigation intent found in database (service: \(service))")
            return nil
        }
        
        do {
            let json = try JSONSerialization.jsonObject(with: jsonData) as? [String: Any]
            print("🔑 [KeychainAccess] ✅ Retrieved pending navigation intent from database (service: \(service))")
            return json
        } catch {
            print("🔑 [KeychainAccess] ❌ Failed to parse intent JSON: \(error.localizedDescription)")
            return nil
        }
    }
    
    /// Clear intent data from SQLite database (replaces keychain storage)
    /// - Parameter service: Service identifier (ignored, kept for compatibility)
    public static func clearIntentFromKeychain(service: String) {
        let success = DatabaseAccess.removeSettingValue(key: "auth_pendingNavigationIntent")
        
        if success {
            print("🔑 [KeychainAccess] ✅ Cleared pending navigation intent from database (service: \(service))")
        } else {
            print("🔑 [KeychainAccess] ⚠️ Failed to clear intent from database (service: \(service))")
        }
    }
    
    // MARK: - Generic Keychain Operations
    
    /// Read boolean value from keychain
    public static func readBoolFromKeychain(service: String) -> Bool? {
        let accessGroup = getKeychainAccessGroup()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, let data = result as? Data, let value = String(data: data, encoding: .utf8) {
            return value == "true"
        }
        
        return nil
    }
}
