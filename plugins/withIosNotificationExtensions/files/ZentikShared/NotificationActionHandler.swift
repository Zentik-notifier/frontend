import Foundation
import UserNotifications

/**
 * NotificationActionHandler - Shared notification action handling
 * 
 * Provides centralized logic for parsing and executing notification actions
 * used across app and extensions.
 */
public class NotificationActionHandler {
    
    // MARK: - Action Parsing
    
    /// Parse action identifier into type and value
    public static func parseActionIdentifier(_ identifier: String, from userInfo: [AnyHashable: Any]) -> [String: String]? {
        // Handle default tap (open app)
        if identifier == UNNotificationDefaultActionIdentifier {
            print("🔧 [ActionHandler] Default tap action")
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
            "OPEN_NOTIFICATION",
            "POSTPONE",
            "NAVIGATE",
            "WEBHOOK",
            "SNOOZE",
            "DELETE"
        ]
        
        // Try to match known action types
        for actionType in knownTypes {
            let prefix = "action_\(actionType)_"
            if identifier.hasPrefix(prefix) {
                let value = String(identifier.dropFirst(prefix.count))
                print("🔧 [ActionHandler] ✅ Matched action type: \(actionType), value: \(value)")
                return ["type": actionType, "value": value]
            }
        }
        
        // Fallback: generic parsing
        let components = identifier.split(separator: "_")
        guard components.count >= 3 else { return nil }
        
        let type = String(components[1])
        let value = components.dropFirst(2).joined(separator: "_")
        
        print("🔧 [ActionHandler] ⚠️ Fallback parsing - type: \(type), value: \(value)")
        return ["type": type, "value": value]
    }
    
    // MARK: - Network Operations
    
    /// Mark notification as read on server
    public static func markNotificationAsRead(notificationId: String, userInfo: [AnyHashable: Any]) async throws {
        print("🔧 [ActionHandler] 📡 Marking notification as read: \(notificationId)")
        
        guard let apiEndpoint = KeychainAccess.getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)/read"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = KeychainAccess.getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Mark as read response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    /// Delete notification from server
    public static func deleteNotificationFromServer(notificationId: String, userInfo: [AnyHashable: Any]) async throws {
        print("🔧 [ActionHandler] 📡 Deleting notification: \(notificationId)")
        
        guard let apiEndpoint = KeychainAccess.getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        
        if let authToken = KeychainAccess.getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Delete response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    /// Postpone notification via notifications endpoint
    public static func postponeNotification(notificationId: String, minutes: Int, userInfo: [AnyHashable: Any]) async throws {
        print("🔧 [ActionHandler] ⏳ Postponing notification \(notificationId) for \(minutes) minutes")
        
        guard let apiEndpoint = KeychainAccess.getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/notifications/postpone"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = KeychainAccess.getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let body: [String: Any] = [
            "notificationId": notificationId,
            "minutes": minutes
        ]
        request.httpBody = try JSONSerialization.data(withJSONObject: body)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Postpone response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    /// Snooze bucket via buckets endpoint
    public static func snoozeBucket(bucketId: String, minutes: Int) async throws {
        print("🔧 [ActionHandler] ⏰ Snoozing bucket \(bucketId) for \(minutes) minutes")
        
        guard let apiEndpoint = KeychainAccess.getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/buckets/\(bucketId)/snooze-minutes"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = KeychainAccess.getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let requestBody = ["minutes": minutes]
        request.httpBody = try JSONSerialization.data(withJSONObject: requestBody)
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Snooze response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    /// Execute background API call
    public static func executeBackgroundCall(method: String, url: String) async throws {
        print("🔧 [ActionHandler] 📞 Executing background call: \(method) \(url)")
        
        guard let apiURL = URL(string: url) else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var request = URLRequest(url: apiURL)
        request.httpMethod = method
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Background call response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    /// Execute webhook
    public static func executeWebhook(webhookId: String) async throws {
        print("🔧 [ActionHandler] 📡 Executing webhook: \(webhookId)")
        
        guard let apiEndpoint = KeychainAccess.getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/webhooks/\(webhookId)/execute"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = KeychainAccess.getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Webhook response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    // MARK: - Action Execution Helpers
    
    /// Find matching action from userInfo actions array
    public static func findMatchingAction(actionIdentifier: String, userInfo: [AnyHashable: Any]) -> [String: Any]? {
        print("🔧 [ActionHandler] 🔍 Looking for action with identifier: \(actionIdentifier)")
        
        var actions: [[String: Any]] = []
        
        // Extract actions from different payload structures
        if let actionsArray = userInfo["actions"] as? [[String: Any]] {
            actions = actionsArray
            print("🔧 [ActionHandler] 📄 Found \(actions.count) actions in userInfo")
        } else if let singleAction = userInfo["action"] as? [String: Any] {
            actions = [singleAction]
            print("🔧 [ActionHandler] 📄 Found single action in userInfo")
        } else if let payload = userInfo["payload"] as? [String: Any] {
            if let payloadActions = payload["actions"] as? [[String: Any]] {
                actions = payloadActions
                print("🔧 [ActionHandler] 📄 Found \(actions.count) actions in payload")
            } else if let singlePayloadAction = payload["action"] as? [String: Any] {
                actions = [singlePayloadAction]
                print("🔧 [ActionHandler] 📄 Found single action in payload")
            }
        }
        
        // Try to match by action identifier pattern
        for (index, action) in actions.enumerated() {
            guard let type = action["type"] as? String,
                  let value = action["value"] as? String else {
                print("🔧 [ActionHandler] ⚠️ Action \(index) missing type or value")
                continue
            }
            
            // Check exact match: action_TYPE_VALUE
            let exactMatch = "action_\(type)_\(value)"
            if actionIdentifier == exactMatch {
                print("🔧 [ActionHandler] ✅ Found exact matching action: \(type) with value: \(value)")
                return action
            }
            
            // Check prefix match for old format: action_TYPE_VALUE_NOTIFICATIONID
            let prefixMatch = "action_\(type)_\(value)_"
            if actionIdentifier.hasPrefix(prefixMatch) {
                print("🔧 [ActionHandler] ✅ Found prefix matching action: \(type) with value: \(value)")
                return action
            }
        }
        
        // Fallback: parse action identifier manually
        let parts = actionIdentifier.split(separator: "_")
        if parts.count >= 3 {
            let actionType = String(parts[1]).uppercased()
            let valueParts = parts[2...]
            let actionValue = valueParts.joined(separator: "_")
            
            print("🔧 [ActionHandler] 🔄 Fallback parsing - type: \(actionType), value: \(actionValue)")
            
            return [
                "type": actionType,
                "value": actionValue,
                "destructive": false,
                "title": actionValue
            ]
        }
        
        return nil
    }
    
    /// Execute action with proper error handling and logging
    public static func executeAction(
        type: String,
        value: String,
        notificationId: String,
        userInfo: [AnyHashable: Any],
        source: String,
        onComplete: @escaping (Result<Void, Error>) -> Void
    ) {
        Task {
            do {
                switch type.uppercased() {
                case "MARK_AS_READ":
                    try await markNotificationAsRead(notificationId: notificationId, userInfo: userInfo)
                    _ = DatabaseAccess.markNotificationAsRead(notificationId: notificationId)
                    
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Mark as read completed",
                        metadata: ["notificationId": notificationId],
                        source: source
                    )
                    
                case "DELETE":
                    try await deleteNotificationFromServer(notificationId: notificationId, userInfo: userInfo)
                    _ = DatabaseAccess.deleteNotification(notificationId: notificationId)
                    
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Delete completed",
                        metadata: ["notificationId": notificationId],
                        source: source
                    )
                    
                case "POSTPONE":
                    guard let minutes = Int(value) else {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid minutes value"])
                    }
                    try await postponeNotification(notificationId: notificationId, minutes: minutes, userInfo: userInfo)
                    
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Postpone completed",
                        metadata: ["notificationId": notificationId, "minutes": String(minutes)],
                        source: source
                    )
                    
                case "SNOOZE":
                    guard let minutes = Int(value),
                          let bucketId = userInfo["bucketId"] as? String else {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid snooze parameters"])
                    }
                    try await snoozeBucket(bucketId: bucketId, minutes: minutes)
                    
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Snooze completed",
                        metadata: ["bucketId": bucketId, "minutes": String(minutes)],
                        source: source
                    )
                    
                case "BACKGROUND_CALL":
                    let parts = value.split(separator: ":", maxSplits: 1).map(String.init)
                    guard parts.count >= 2 else {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid API call format"])
                    }
                    let method = parts[0]
                    let url = parts[1]
                    try await executeBackgroundCall(method: method, url: url)
                    
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Background call completed",
                        metadata: ["method": method, "url": url],
                        source: source
                    )
                    
                case "WEBHOOK":
                    try await executeWebhook(webhookId: value)
                    
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Webhook completed",
                        metadata: ["webhookId": value],
                        source: source
                    )
                    
                case "NAVIGATE", "OPEN_NOTIFICATION":
                    // These actions are handled by the app itself, not in extensions
                    // Store intent in keychain for app to process
                    let navigationData: [String: String] = [
                        "type": type,
                        "value": value,
                        "timestamp": ISO8601DateFormatter().string(from: Date())
                    ]
                    
                    // Note: Keychain storage would need to be implemented here
                    // For now, just log the action
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Navigation action recorded",
                        metadata: ["type": type, "value": value],
                        source: source
                    )
                    
                default:
                    throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Unknown action type: \(type)"])
                }
                
                onComplete(.success(()))
                
            } catch {
                LoggingSystem.shared.error(
                    tag: source,
                    message: "[Action] Action failed: \(type)",
                    metadata: [
                        "type": type,
                        "value": value,
                        "error": error.localizedDescription
                    ],
                    source: source
                )
                
                onComplete(.failure(error))
            }
        }
    }
}
