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
        return getKeychainValue(key: "apiEndpoint")
    }
    
    /// Get stored auth token from keychain
    public static func getStoredAuthToken() -> String? {
        return getKeychainValue(key: "authToken")
    }
    
    /// Save value to keychain
    public static func saveToKeychain(key: String, value: String) -> Bool {
        let keychainAccessGroup = getKeychainAccessGroup()
        
        // Delete existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: keychainAccessGroup
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add new item
        let addQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecValueData as String: value.data(using: .utf8)!,
            kSecAttrAccessGroup as String: keychainAccessGroup,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        let status = SecItemAdd(addQuery as CFDictionary, nil)
        return status == errSecSuccess
    }
    
    /// Get value from keychain
    private static func getKeychainValue(key: String) -> String? {
        let keychainAccessGroup = getKeychainAccessGroup()
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrAccount as String: key,
            kSecAttrAccessGroup as String: keychainAccessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        guard status == errSecSuccess,
              let data = result as? Data,
              let value = String(data: data, encoding: .utf8) else {
            return nil
        }
        
        return value
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
