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
            // Remove extension suffixes (e.g., ".NotificationServiceExtension")
            let components = bundleId.components(separatedBy: ".")
            if components.count > 2 && (components.last == "NotificationServiceExtension" || 
                                        components.last == "NotificationContentExtension") {
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
    
    /// Get API endpoint from keychain
    public static func getApiEndpoint() -> String? {
        print("🔑 [KeychainAccess] 📍 Getting API endpoint...")
        let value = getKeychainValue(key: "apiEndpoint")
        if let endpoint = value {
            print("🔑 [KeychainAccess] ✅ API endpoint found: \(endpoint)")
        } else {
            print("🔑 [KeychainAccess] ❌ API endpoint not found")
        }
        return value
    }
    
    /// Get stored auth token from keychain
    public static func getStoredAuthToken() -> String? {
        print("🔑 [KeychainAccess] 🎫 Getting auth token...")
        let value = getKeychainValue(key: "authToken")
        if let token = value {
            print("🔑 [KeychainAccess] ✅ Auth token found (length: \(token.count))")
        } else {
            print("🔑 [KeychainAccess] ❌ Auth token not found")
        }
        return value
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
}
