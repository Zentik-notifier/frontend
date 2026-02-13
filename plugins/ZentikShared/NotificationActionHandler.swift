import Foundation
import UserNotifications
import CloudKit

/**
 * NotificationActionHandler - Shared notification action handling
 * 
 * Provides centralized logic for parsing and executing notification actions
 * used across app and extensions.
 */
public class NotificationActionHandler {

    public struct StepResult {
        public let name: String
        public let success: Bool
        public let errorDescription: String?

        public init(name: String, success: Bool, errorDescription: String? = nil) {
            self.name = name
            self.success = success
            self.errorDescription = errorDescription
        }
    }

    private static func summarize(_ results: [StepResult]) -> [String: String] {
        var meta: [String: String] = [:]
        for r in results {
            meta["step_\(r.name)"] = r.success ? "ok" : "fail"
            if let err = r.errorDescription {
                meta["step_\(r.name)_error"] = err
            }
        }
        return meta
    }

    private static func anySuccess(_ results: [StepResult]) -> Bool {
        results.contains { $0.success }
    }

    private static func asyncResult(_ name: String, _ op: @escaping () async throws -> Void) async -> StepResult {
        do {
            try await op()
            return StepResult(name: name, success: true)
        } catch {
            return StepResult(name: name, success: false, errorDescription: error.localizedDescription)
        }
    }

    #if os(iOS) && !ZENTIK_EXTENSION
    private static func updateReadStatusInCloudKit_iOS(notificationId: String, readAt: Date?) async -> StepResult {
        guard #available(iOS 17.0, *) else {
            return StepResult(name: "cloudkit", success: true)
        }
        return await withCheckedContinuation { continuation in
            PhoneSyncEngineCKSync.shared.updateNotificationsReadStatusInCloudKit(
                notificationIds: [notificationId],
                readAt: readAt
            ) { success, error in
                if success {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: true))
                } else {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: false, errorDescription: error?.localizedDescription ?? "Unknown error"))
                }
            }
        }
    }

    private static func deleteFromCloudKit_iOS(notificationId: String) async -> StepResult {
        guard #available(iOS 17.0, *) else {
            return StepResult(name: "cloudkit", success: true)
        }
        return await withCheckedContinuation { continuation in
            PhoneSyncEngineCKSync.shared.deleteNotificationFromCloudKit(notificationId: notificationId) { success, error in
                if success {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: true))
                } else {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: false, errorDescription: error?.localizedDescription ?? "Unknown error"))
                }
            }
        }
    }
    #elseif os(iOS)
    private static func updateReadStatusInCloudKit_iOS(notificationId: String, readAt: Date?) async -> StepResult {
        StepResult(name: "cloudkit", success: true)
    }

    private static func deleteFromCloudKit_iOS(notificationId: String) async -> StepResult {
        StepResult(name: "cloudkit", success: true)
    }
    #endif

    #if os(watchOS)
    private static func buildApiBaseWithPrefix(from server: String) -> String {
        let trimmed = server.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = trimmed.replacingOccurrences(of: "/$", with: "", options: .regularExpression)
        if base.hasSuffix("/api/v1") {
            return base
        }
        return base + "/api/v1"
    }

    private static func makeWatchApiRequest(path: String, method: String, jsonBody: [String: Any]? = nil) -> URLRequest? {
        guard let token = UserDefaults.standard.string(forKey: "watch_access_token"),
              let serverAddress = UserDefaults.standard.string(forKey: "watch_server_address") else {
            return nil
        }

        let tokenTrimmed = token.trimmingCharacters(in: .whitespacesAndNewlines)
        let serverTrimmed = serverAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !tokenTrimmed.isEmpty, !serverTrimmed.isEmpty else { return nil }

        let apiBase = buildApiBaseWithPrefix(from: serverTrimmed)
        let urlString = apiBase + path
        guard let url = URL(string: urlString) else { return nil }

        var request = URLRequest(url: url)
        request.httpMethod = method
        request.setValue("Bearer \(tokenTrimmed)", forHTTPHeaderField: "Authorization")

        if let jsonBody {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = try? JSONSerialization.data(withJSONObject: jsonBody)
        }

        return request
    }

    /// URLSession with short timeout for Watch REST calls (best-effort)
    private static let watchURLSession: URLSession = {
        let config = URLSessionConfiguration.default
        config.timeoutIntervalForRequest = 10  // 10 seconds max for request
        config.timeoutIntervalForResource = 15 // 15 seconds max total
        return URLSession(configuration: config)
    }()

    private static func performWatchApiRequest(path: String, method: String, jsonBody: [String: Any]? = nil) async throws {
        guard let request = makeWatchApiRequest(path: path, method: method, jsonBody: jsonBody) else {
            throw NSError(domain: "WatchREST", code: -1, userInfo: [NSLocalizedDescriptionKey: "Missing watch token/serverAddress"])
        }

        let (data, response) = try await watchURLSession.data(for: request)
        if let httpResponse = response as? HTTPURLResponse {
            let status = httpResponse.statusCode
            if status >= 200 && status < 300 {
                return
            }
            if status == 404 || status == 410 {
                // Best-effort / idempotent from watch.
                return
            }
            let responseString = String(data: data, encoding: .utf8) ?? ""
            throw NSError(domain: "WatchREST", code: status, userInfo: [NSLocalizedDescriptionKey: "HTTP \(status): \(responseString)"])
        }
    }

    private static func updateReadStatusInCloudKit_watch(notificationId: String, readAt: Date?) async -> StepResult {
        await withCheckedContinuation { continuation in
            WatchSyncEngineCKSync.shared.updateNotificationsReadStatusInCloudKit(
                notificationIds: [notificationId],
                readAt: readAt
            ) { success, _, error in
                if success {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: true))
                } else {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: false, errorDescription: error?.localizedDescription ?? "Unknown error"))
                }
            }
        }
    }

    private static func deleteFromCloudKit_watch(notificationId: String) async -> StepResult {
        await withCheckedContinuation { continuation in
            WatchSyncEngineCKSync.shared.deleteNotificationFromCloudKit(notificationId: notificationId) { success, error in
                if success {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: true))
                } else {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: false, errorDescription: error?.localizedDescription ?? "Unknown error"))
                }
            }
        }
    }

    private static func deleteFromCloudKitBatch_watch(notificationIds: [String]) async -> StepResult {
        guard !notificationIds.isEmpty else {
            return StepResult(name: "cloudkit", success: true)
        }
        return await withCheckedContinuation { continuation in
            WatchSyncEngineCKSync.shared.deleteNotificationsFromCloudKit(notificationIds: notificationIds) { success, _, error in
                if success {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: true))
                } else {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: false, errorDescription: error?.localizedDescription ?? "Unknown error"))
                }
            }
        }
    }

    private static func updateReadStatusInCloudKitBatch_watch(notificationIds: [String], readAt: Date?) async -> StepResult {
        guard !notificationIds.isEmpty else {
            return StepResult(name: "cloudkit", success: true)
        }
        return await withCheckedContinuation { continuation in
            WatchSyncEngineCKSync.shared.updateNotificationsReadStatusInCloudKit(
                notificationIds: notificationIds,
                readAt: readAt
            ) { success, _, error in
                if success {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: true))
                } else {
                    continuation.resume(returning: StepResult(name: "cloudkit", success: false, errorDescription: error?.localizedDescription ?? "Unknown error"))
                }
            }
        }
    }

    /// Watch-only: execute remote side-effects (REST + CloudKit) best-effort.
    /// This intentionally does not touch SQLite badge counts or local DB state.
    public static func executeWatchRemoteUpdates(
        actionType: String,
        notificationId: String,
        minutes: Int? = nil,
        bucketId: String? = nil
    ) async -> [StepResult] {
        let type = actionType.uppercased()

        switch type {
        case "MARK_AS_READ":
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(path: "/notifications/watch/\(notificationId)/read", method: "PATCH")
            }
            async let ck = updateReadStatusInCloudKit_watch(notificationId: notificationId, readAt: Date())
            return [await rest, await ck]

        case "MARK_AS_UNREAD":
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(path: "/notifications/watch/\(notificationId)/unread", method: "PATCH")
            }
            async let ck = updateReadStatusInCloudKit_watch(notificationId: notificationId, readAt: nil)
            return [await rest, await ck]

        case "DELETE":
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(path: "/notifications/watch/\(notificationId)", method: "DELETE")
            }
            async let ck = deleteFromCloudKit_watch(notificationId: notificationId)
            return [await rest, await ck]

        case "POSTPONE":
            let mins = minutes ?? 0
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(
                    path: "/notifications/watch/postpone",
                    method: "POST",
                    jsonBody: ["notificationId": notificationId, "minutes": mins]
                )
            }
            // IMPORTANT: postpone should NOT behave like delete.
            // CloudKit doesn't currently model postpone metadata, so we only apply REST.
            return [await rest]

        case "SNOOZE":
            guard let bucketId, let mins = minutes else {
                return [StepResult(name: "rest", success: false, errorDescription: "Missing bucketId/minutes")]
            }
            let rest = await asyncResult("rest") {
                try await performWatchApiRequest(
                    path: "/buckets/\(bucketId)/snooze-minutes",
                    method: "POST",
                    jsonBody: ["minutes": mins]
                )
            }
            return [rest]

        case "WEBHOOK":
            // webhookId passed via notificationId? caller should not use this here.
            return [StepResult(name: "rest", success: false, errorDescription: "Use executeWebhookFromWatch in WatchConnectivityManager")]

        default:
            return [StepResult(name: "noop", success: false, errorDescription: "Unsupported action type")]
        }
    }

    /// Watch-only: execute remote side-effects (REST + CloudKit) in batch for multiple notifications.
    /// This intentionally does not touch SQLite badge counts or local DB state.
    public static func executeWatchRemoteUpdatesBatch(
        actionType: String,
        notificationIds: [String]
    ) async -> [StepResult] {
        guard !notificationIds.isEmpty else {
            return []
        }

        let type = actionType.uppercased()

        switch type {
        case "MARK_AS_READ":
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(
                    path: "/notifications/watch/batch/read",
                    method: "PATCH",
                    jsonBody: ["ids": notificationIds]
                )
            }
            async let ck = updateReadStatusInCloudKitBatch_watch(notificationIds: notificationIds, readAt: Date())
            return [await rest, await ck]

        case "MARK_AS_UNREAD":
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(
                    path: "/notifications/watch/batch/unread",
                    method: "PATCH",
                    jsonBody: ["ids": notificationIds]
                )
            }
            async let ck = updateReadStatusInCloudKitBatch_watch(notificationIds: notificationIds, readAt: nil)
            return [await rest, await ck]

        case "DELETE":
            async let rest = asyncResult("rest") {
                try await performWatchApiRequest(
                    path: "/notifications/watch/batch",
                    method: "DELETE",
                    jsonBody: ["ids": notificationIds]
                )
            }
            async let ck = deleteFromCloudKitBatch_watch(notificationIds: notificationIds)
            return [await rest, await ck]

        default:
            return [StepResult(name: "noop", success: false, errorDescription: "Unsupported batch action type: \(type)")]
        }
    }
    #endif
    
    // MARK: - Action Parsing

    /// Extract tapAction from userInfo supporting both expanded and compact keys.
    /// Supported keys: "tapAction" (expanded), "tp"/"tap" (compact), plus inside "payload".
    public static func extractTapAction(from userInfo: [AnyHashable: Any]) -> [String: Any]? {
        if let tapAction = userInfo["tapAction"] as? [String: Any] {
            return tapAction
        }
        if let tapAction = userInfo["tp"] as? [String: Any] {
            return tapAction
        }
        if let tapAction = userInfo["tap"] as? [String: Any] {
            return tapAction
        }
        if let payload = userInfo["payload"] as? [String: Any] {
            if let tapAction = payload["tapAction"] as? [String: Any] {
                return tapAction
            }
            if let tapAction = payload["tp"] as? [String: Any] {
                return tapAction
            }
            if let tapAction = payload["tap"] as? [String: Any] {
                return tapAction
            }
        }
        return nil
    }

    /// Resolve action type from either expanded ("type") or compact ("t") format.
    /// - Returns: Uppercased action type string (e.g. "OPEN_NOTIFICATION") or nil.
    public static func resolveActionType(_ action: [String: Any]) -> String? {
        if let type = action["type"] as? String {
            let trimmed = type.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed.uppercased()
        }
        if let t = action["t"] as? Int {
            return NotificationActionType.stringFrom(int: t)
        }
        return nil
    }

    /// Resolve action value from either expanded ("value") or compact ("v") format.
    /// Applies known backend optimizations for omitted values.
    public static func resolveActionValue(
        _ action: [String: Any],
        type: String?,
        notificationId: String
    ) -> String? {
        if let value = action["value"] as? String {
            let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }
        if let v = action["v"] as? String {
            let trimmed = v.trimmingCharacters(in: .whitespacesAndNewlines)
            return trimmed.isEmpty ? nil : trimmed
        }

        guard let type = type else { return nil }

        // Backend optimizations for omitted values.
        // Note: for WEBHOOK the value is always required (webhookId).
        switch type {
        case "OPEN_NOTIFICATION":
            // Backend optimization: omit value when it equals notificationId.
            return notificationId
        case "DELETE":
            // Backend optimization: omit value for fixed-value actions.
            return "delete_notification"
        case "MARK_AS_READ":
            // Backend optimization: omit value for fixed-value actions.
            return "mark_as_read_notification"
        default:
            return nil
        }
    }

    /// Normalize an action dictionary so callers can rely on string keys "type" and "value".
    /// Keeps original keys intact and adds/overwrites expanded keys.
    public static func normalizeAction(
        _ action: [String: Any],
        notificationId: String
    ) -> [String: Any]? {
        let type = resolveActionType(action)
        let value = resolveActionValue(action, type: type, notificationId: notificationId)
        guard let type = type, let value = value else { return nil }

        var normalized = action
        normalized["type"] = type
        normalized["value"] = value
        return normalized
    }
    
    /// Parse action identifier into type and value
    public static func parseActionIdentifier(_ identifier: String, from userInfo: [AnyHashable: Any]) -> [String: String]? {
        // Handle default tap (open app)
        if identifier == UNNotificationDefaultActionIdentifier {
            print("🔧 [ActionHandler] Default tap action")
            if let tapAction = extractTapAction(from: userInfo) {
                let notificationIdCandidate = ((userInfo["nid"] as? String) ?? (userInfo["n"] as? String) ?? (userInfo["notificationId"] as? String))?.trimmingCharacters(in: .whitespacesAndNewlines)

                if let nid = notificationIdCandidate, !nid.isEmpty,
                   let normalized = normalizeAction(tapAction, notificationId: nid),
                   let type = normalized["type"] as? String,
                   let value = normalized["value"] as? String {
                    return ["type": type, "value": value]
                }

                // If we can't infer notificationId, only accept explicit value.
                if let type = resolveActionType(tapAction),
                   let value = (tapAction["value"] as? String) ?? (tapAction["v"] as? String) {
                    return ["type": type, "value": value]
                }
            }
            return ["type": "OPEN_APP", "value": "default"]
        }
        
        // Parse custom action (format: action_TYPE_VALUE)
        // Known action types (in order of specificity to match longest first)
        let knownTypes = [
            "MARK_AS_READ",
            "MARK_AS_UNREAD",
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
        
        if let authToken = await KeychainAccess.getValidAuthToken() {
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
    
    /// Mark notification as unread on server
    public static func markNotificationAsUnread(notificationId: String, userInfo: [AnyHashable: Any]) async throws {
        print("🔧 [ActionHandler] 📡 Marking notification as unread: \(notificationId)")
        
        guard let apiEndpoint = KeychainAccess.getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not found"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)/unread"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        if let authToken = await KeychainAccess.getValidAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("🔧 [ActionHandler] 📥 Mark as unread response: \(httpResponse.statusCode)")
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
        
        if let authToken = await KeychainAccess.getValidAuthToken() {
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
        
        if let authToken = await KeychainAccess.getValidAuthToken() {
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
        
        if let authToken = await KeychainAccess.getValidAuthToken() {
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
        
        if let authToken = await KeychainAccess.getValidAuthToken() {
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
            // Handle minified keys (t -> type, v -> value)
            var type = action["type"] as? String
            if type == nil, let t = action["t"] as? Int {
                type = NotificationActionType.stringFrom(int: t)
            }
            
            var value = (action["value"] as? String) ?? (action["v"] as? String)
            
            // Handle OPEN_NOTIFICATION/WEBHOOK optimization (value omitted if same as notificationId)
            // Note: We don't have notificationId here easily, but we can try to infer if value is missing
            // For matching purposes, if value is missing in action dict, we might need to be careful
            // But usually actionIdentifier contains the value, so we can't match if value is missing in dict
            // UNLESS the actionIdentifier was constructed using the notificationId as value
            
            guard let type = type else {
                print("🔧 [ActionHandler] ⚠️ Action \(index) missing type")
                continue
            }
            
            // If value is missing, we can't construct the expected identifier to match against
            // However, if it's OPEN_NOTIFICATION/WEBHOOK, the value might be implicit
            // But the actionIdentifier passed here comes from the system, so it MUST contain the value
            // So we only match if we have a value in the dict OR if we can infer it
            
            if value == nil && type == "OPEN_NOTIFICATION" {
                // Try to extract value from actionIdentifier if it matches the pattern
                // action_TYPE_VALUE
                let prefix = "action_\(type)_"
                if actionIdentifier.hasPrefix(prefix) {
                    value = String(actionIdentifier.dropFirst(prefix.count))
                }
            }
            
            guard let value = value else {
                print("🔧 [ActionHandler] ⚠️ Action \(index) missing value")
                continue
            }
            
            // Check exact match: action_TYPE_VALUE
            let exactMatch = "action_\(type)_\(value)"
            if actionIdentifier == exactMatch {
                print("🔧 [ActionHandler] ✅ Found exact matching action: \(type) with value: \(value)")
                // Return action with restored type/value
                var resultAction = action
                resultAction["type"] = type
                resultAction["value"] = value
                return resultAction
            }
            
            // Check prefix match for old format: action_TYPE_VALUE_NOTIFICATIONID
            let prefixMatch = "action_\(type)_\(value)_"
            if actionIdentifier.hasPrefix(prefixMatch) {
                print("🔧 [ActionHandler] ✅ Found prefix matching action: \(type) with value: \(value)")
                // Return action with restored type/value
                var resultAction = action
                resultAction["type"] = type
                resultAction["value"] = value
                return resultAction
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
                // Normalize type/value and handle legacy/delete aliases
                var normalizedType = type.uppercased()
                var normalizedValue = value

                // Safety net for legacy payloads where delete was encoded
                // as MARK_AS_READ with a special value
                if normalizedType == "MARK_AS_READ" && normalizedValue == "delete_notification" {
                    print("🔧 [ActionHandler] 🔄 Normalizing MARK_AS_READ/delete_notification -> DELETE action")
                    normalizedType = "DELETE"
                    // For DELETE we operate on notificationId; value is not used
                }

                switch normalizedType {
                case "MARK_AS_READ":
                    // Best-effort and independent steps: REST + SQLite + CloudKit.
                    async let rest = asyncResult("rest") {
                        try await markNotificationAsRead(notificationId: notificationId, userInfo: userInfo)
                    }

                    let db: StepResult = {
                        DatabaseAccess.markNotificationAsRead(notificationId: notificationId, source: source)
                        return StepResult(name: "sqlite", success: true)
                    }()

                    #if os(iOS)
                    async let ck = updateReadStatusInCloudKit_iOS(notificationId: notificationId, readAt: Date())
                    #endif
                    
                    // Decrement badge count for both NCE and AppDelegate
                    KeychainAccess.decrementBadgeCount(source: source)

                    var results: [StepResult] = [await rest, db]
                    #if os(iOS)
                    results.append(await ck)
                    #endif

                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Mark as read completed (best-effort)",
                        metadata: ["notificationId": notificationId].merging(summarize(results)) { a, _ in a },
                        source: source
                    )

                    if !anySuccess(results) {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "All steps failed"])
                    }
                    
                case "MARK_AS_UNREAD":
                    async let rest = asyncResult("rest") {
                        try await markNotificationAsUnread(notificationId: notificationId, userInfo: userInfo)
                    }

                    let db: StepResult = {
                        DatabaseAccess.markNotificationAsUnread(notificationId: notificationId, source: source)
                        return StepResult(name: "sqlite", success: true)
                    }()

                    #if os(iOS)
                    async let ck = updateReadStatusInCloudKit_iOS(notificationId: notificationId, readAt: nil)
                    #endif
                    
                    // Increment badge count for both NCE and AppDelegate
                    KeychainAccess.incrementBadgeCount(source: source)
                    
                    var results: [StepResult] = [await rest, db]
                    #if os(iOS)
                    results.append(await ck)
                    #endif

                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Mark as unread completed (best-effort)",
                        metadata: ["notificationId": notificationId].merging(summarize(results)) { a, _ in a },
                        source: source
                    )

                    if !anySuccess(results) {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "All steps failed"])
                    }
                    
                case "WEBHOOK":
                    // For WEBHOOK, the value is the webhook ID
                    let webhookId = value
                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Executing webhook",
                        metadata: ["webhookId": webhookId],
                        source: source
                    )

                    let result = await asyncResult("rest") {
                        try await executeWebhook(webhookId: webhookId)
                    }

                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Webhook completed (best-effort)",
                        metadata: ["webhookId": webhookId].merging(summarize([result])) { a, _ in a },
                        source: source
                    )

                    if !result.success {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Webhook failed"])
                    }

                case "DELETE":
                    // Best-effort and independent steps: REST + SQLite + CloudKit.
                    async let rest = asyncResult("rest") {
                        try await deleteNotificationFromServer(notificationId: notificationId, userInfo: userInfo)
                    }

                    let db: StepResult = {
                        DatabaseAccess.deleteNotification(notificationId: notificationId, source: source)
                        return StepResult(name: "sqlite", success: true)
                    }()

                    #if os(iOS)
                    async let ck = deleteFromCloudKit_iOS(notificationId: notificationId)
                    #endif

                    var results: [StepResult] = [await rest, db]
                    #if os(iOS)
                    results.append(await ck)
                    #endif

                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Delete completed (best-effort)",
                        metadata: ["notificationId": notificationId].merging(summarize(results)) { a, _ in a },
                        source: source
                    )

                    if !anySuccess(results) {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "All steps failed"])
                    }
                    
                    // Decrement badge count for both NCE and AppDelegate
                    KeychainAccess.decrementBadgeCount(source: source)
                    
                case "POSTPONE":
                    guard let minutes = Int(normalizedValue) else {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid minutes value"])
                    }

                    // Best-effort and independent steps: REST + SQLite + CloudKit.
                    async let rest = asyncResult("rest") {
                        try await postponeNotification(notificationId: notificationId, minutes: minutes, userInfo: userInfo)
                    }

                    let db: StepResult = {
                        // Postpone removes from active list; mirror as delete in local cache.
                        DatabaseAccess.deleteNotification(notificationId: notificationId, source: source)
                        return StepResult(name: "sqlite", success: true)
                    }()

                    #if os(iOS)
                    // Keep CloudKit in sync so other devices/watch converge.
                    async let ck = deleteFromCloudKit_iOS(notificationId: notificationId)
                    #endif

                    var results: [StepResult] = [await rest, db]
                    #if os(iOS)
                    results.append(await ck)
                    #endif

                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Postpone completed (best-effort)",
                        metadata: ["notificationId": notificationId, "minutes": String(minutes)].merging(summarize(results)) { a, _ in a },
                        source: source
                    )

                    if !anySuccess(results) {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "All steps failed"])
                    }
                    
                case "SNOOZE":
                    guard let minutes = Int(normalizedValue),
                          let bucketId = (userInfo["bid"] as? String) ?? (userInfo["bucketId"] as? String) else {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid snooze parameters"])
                    }

                    let result = await asyncResult("rest") {
                        try await snoozeBucket(bucketId: bucketId, minutes: minutes)
                    }

                    LoggingSystem.shared.info(
                        tag: source,
                        message: "[Action] Snooze completed (best-effort)",
                        metadata: ["bucketId": bucketId, "minutes": String(minutes)].merging(summarize([result])) { a, _ in a },
                        source: source
                    )

                    if !result.success {
                        throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Snooze failed"])
                    }
                    
                case "BACKGROUND_CALL":
                    // Parse format: METHOD::URL
                    // If value is a simple string (like "mark_as_read_notification"), it might be a fallback
                    // But BACKGROUND_CALL requires METHOD::URL
                    
                    let parts = normalizedValue.components(separatedBy: "::")
                    if parts.count >= 2 {
                        let method = parts[0]
                        let url = parts[1]
                        try await executeBackgroundCall(method: method, url: url)
                        
                        LoggingSystem.shared.info(
                            tag: source,
                            message: "[Action] Background call completed",
                            metadata: ["method": method, "url": url],
                            source: source
                        )
                    } else {
                        // Fallback: if value is not METHOD::URL, try to interpret it as a predefined action
                        // For now, we only support mark_as_read_notification as a fallback to MARK_AS_READ
                        if normalizedValue == "mark_as_read_notification" {
                            print("🔧 [ActionHandler] ⚠️ BACKGROUND_CALL fallback: treating as MARK_AS_READ")

                            async let rest = asyncResult("rest") {
                                try await markNotificationAsRead(notificationId: notificationId, userInfo: userInfo)
                            }

                            let db: StepResult = {
                                DatabaseAccess.markNotificationAsRead(notificationId: notificationId, source: source)
                                return StepResult(name: "sqlite", success: true)
                            }()

                            #if os(iOS)
                            async let ck = updateReadStatusInCloudKit_iOS(notificationId: notificationId, readAt: Date())
                            #endif

                            KeychainAccess.decrementBadgeCount(source: source)

                            var results: [StepResult] = [await rest, db]
                            #if os(iOS)
                            results.append(await ck)
                            #endif

                            LoggingSystem.shared.info(
                                tag: source,
                                message: "[Action] Background call fallback (mark_as_read) completed (best-effort)",
                                metadata: ["notificationId": notificationId].merging(summarize(results)) { a, _ in a },
                                source: source
                            )

                            if !anySuccess(results) {
                                throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "All steps failed"])
                            }
                        } else {
                            let errorMsg = "Invalid API call format. Expected METHOD::URL, got '\(normalizedValue)'"
                            
                            LoggingSystem.shared.error(
                                tag: source,
                                message: "[Action] BACKGROUND_CALL parsing failed",
                                metadata: [
                                    "value": value,
                                    "error": errorMsg
                                ],
                                source: source
                            )
                            
                            throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: errorMsg])
                        }
                    }
                case "NAVIGATE", "OPEN_NOTIFICATION":
                    // Store intent in database for app to process (matching settings-service format)
                    let navigationData: [String: Any] = [
                        "type": normalizedType,
                        "value": normalizedValue
                    ]
                    
                    do {
                        let jsonData = try JSONSerialization.data(withJSONObject: navigationData)
                        guard let jsonString = String(data: jsonData, encoding: .utf8) else {
                            throw NSError(domain: "ActionError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to encode navigation data"])
                        }
                        
                        // Write to database (settings repository)
                        let success = DatabaseAccess.setSettingValueSync(key: "auth_pendingNavigationIntent", value: jsonString)
                        
                        if success {
                            // Log to database for tracking
                            LoggingSystem.shared.info(
                                tag: source,
                                message: "[PendingIntent] Navigation intent saved to database",
                                metadata: [
                                    "type": type,
                                    "value": value,
                                    "notificationId": notificationId ?? "unknown",
                                    "intentData": jsonString
                                ],
                                source: source
                            )
                        } else {
                            throw NSError(domain: "DatabaseError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Failed to save navigation intent to database"])
                        }
                    } catch {
                        LoggingSystem.shared.error(
                            tag: source,
                            message: "[PendingIntent] Failed to store navigation intent",
                            metadata: ["type": type, "value": value, "error": error.localizedDescription],
                            source: source
                        )
                        throw error
                    }
                    
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
