import Foundation

#if os(watchOS)
import CloudKit

/// watchOS-side CloudKit orchestrator.
///
/// Responsibilities (high level):
/// - Ensure zone/subscriptions
/// - Incremental sync from CK → Watch local store (callers apply returned changes)
/// - Realtime per-record fetch helpers
public final class WatchCloudKit {

    public static let shared = WatchCloudKit()

    public struct Defaults {
        public static let notificationSubscriptionID = "NotificationChanges"
        public static let bucketSubscriptionID = "BucketChanges"
        public static let notificationRecordType = "Notifications"
        public static let bucketRecordType = "Buckets"
    }

    private let core: CloudKitManagerBase
    
    // MARK: - Remote Notification Coalescing (Battery Optimization)
    // Instead of processing each push individually, we coalesce multiple
    // notifications into a single incremental sync to reduce battery drain.
    private let coalescingQueue = DispatchQueue(label: "com.zentik.watchcloudkit.coalescing")
    private var pendingRecordIDs: Set<CKRecord.ID> = []
    private var pendingDeletions: Set<CKRecord.ID> = []
    private var coalescingWorkItem: DispatchWorkItem?
    private let coalescingDelay: TimeInterval = 0.5 // Wait 500ms to collect more notifications

    public init(core: CloudKitManagerBase = CloudKitManagerBase()) {
        self.core = core
    }

    // MARK: - Logging helpers
    
    private func infoLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: message, metadata: metadata, source: "WatchCloudKit")
    }

    private func warnLog(_ message: String, metadata: [String: Any]? = nil) {
        LoggingSystem.shared.log(level: "WARN", tag: "CloudKit", message: message, metadata: metadata, source: "WatchCloudKit")
    }

    private func debugLog(_ message: String, metadata: [String: Any]? = nil) {
        guard CloudKitManagerBase.isCloudKitDebugEnabled(appGroupIdentifier: core.config.appGroupIdentifier) else {
            return
        }
        LoggingSystem.shared.log(level: "DEBUG", tag: "CloudKit", message: message, metadata: metadata, source: "WatchCloudKit")
    }

    public var isCloudKitEnabled: Bool {
        core.isCloudKitEnabled
    }

    public func ensureReady(completion: @escaping (Result<Void, Error>) -> Void) {
        core.ensureZone { result in
            switch result {
            case .failure(let error):
                completion(.failure(error))
            case .success:
                self.core.ensureSubscriptions(self.defaultSubscriptions(), completion: completion)
            }
        }
    }

    public func defaultSubscriptions() -> [CloudKitManagerBase.SubscriptionSpec] {
        [
            .init(id: Defaults.notificationSubscriptionID, recordType: Defaults.notificationRecordType),
            .init(id: Defaults.bucketSubscriptionID, recordType: Defaults.bucketRecordType)
        ]
    }
    
    /// Disable CloudKit subscriptions to prevent receiving individual events
    /// Used before full sync to avoid processing hundreds of individual events
    public func disableSubscriptions(completion: @escaping (Result<Void, Error>) -> Void) {
        let subscriptionIDs = [Defaults.notificationSubscriptionID, Defaults.bucketSubscriptionID]
        core.deleteSubscriptions(subscriptionIDs, completion: completion)
    }

    // MARK: - Incremental

    public func fetchIncrementalChanges(completion: @escaping (Result<[CloudKitManagerBase.ZoneChange], Error>) -> Void) {
        core.fetchZoneChanges(completion: completion)
    }

    public func resetIncrementalToken() {
        core.resetServerChangeToken()
    }

    // MARK: - Realtime (per-record)

    public func parseCloudKitNotification(from userInfo: [AnyHashable: Any]) -> CKNotification? {
        CKNotification(fromRemoteNotificationDictionary: userInfo)
    }

    public func fetchRecord(recordID: CKRecord.ID, completion: @escaping (Result<CKRecord?, Error>) -> Void) {
        core.fetchRecord(recordID: recordID, completion: completion)
    }

    // MARK: - Full fetch (used by WatchConnectivityManager refresh)

    /// Fetches the latest `limit` notifications from CloudKit.
    ///
    /// This is intentionally bounded for watch performance and is used by the
    /// "top-up" behavior when the local list drops below the max limit.
    public func fetchLatestNotificationsFromCloudKit(limit: Int, completion: @escaping ([[String: Any]], Error?) -> Void) {
        guard limit > 0 else {
            completion([], nil)
            return
        }

        let predicate = NSPredicate(value: true)
        let query = CKQuery(recordType: Defaults.notificationRecordType, predicate: predicate)
        query.sortDescriptors = [NSSortDescriptor(key: "createdAt", ascending: false)]

        let op = CKQueryOperation(query: query)
        op.zoneID = core.zoneID
        // Use .background QoS to minimize battery impact on Watch
        op.qualityOfService = .background
        op.resultsLimit = limit

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var notifications: [[String: Any]] = []
        var fetchError: Error?

        op.recordMatchedBlock = { _, result in
            switch result {
            case .success(let record):
                guard let id = record["id"] as? String,
                      let bucketId = record["bucketId"] as? String,
                      let title = record["title"] as? String,
                      let body = record["body"] as? String,
                      let createdAt = record["createdAt"] as? Date else {
                    return
                }

                let subtitle = record["subtitle"] as? String
                let readAt = record["readAt"] as? Date
                let isRead = readAt != nil

                var attachments: [[String: Any]] = []
                if let attachmentsString = record["attachments"] as? String,
                   let attachmentsData = attachmentsString.data(using: .utf8),
                   let attachmentsArray = try? JSONSerialization.jsonObject(with: attachmentsData) as? [[String: Any]] {
                    attachments = attachmentsArray
                }

                var actions: [[String: Any]] = []
                if let actionsString = record["actions"] as? String,
                   let actionsData = actionsString.data(using: .utf8),
                   let actionsArray = try? JSONSerialization.jsonObject(with: actionsData) as? [[String: Any]] {
                    actions = actionsArray
                }

                var dict: [String: Any] = [
                    "id": id,
                    "bucketId": bucketId,
                    "title": title,
                    "body": body,
                    "createdAt": dateFormatter.string(from: createdAt),
                    "isRead": isRead,
                    "attachments": attachments,
                    "actions": actions
                ]

                if let subtitle { dict["subtitle"] = subtitle }
                if let readAt { dict["readAt"] = dateFormatter.string(from: readAt) }

                notifications.append(dict)

            case .failure(let error):
                fetchError = error
            }
        }

        op.queryResultBlock = { result in
            switch result {
            case .success:
                // Sort unread first, then createdAt desc (matches existing UI expectations)
                notifications.sort { n1, n2 in
                    let r1 = (n1["isRead"] as? Bool) ?? false
                    let r2 = (n2["isRead"] as? Bool) ?? false
                    if r1 != r2 { return !r1 && r2 }
                    return (n1["createdAt"] as? String ?? "") > (n2["createdAt"] as? String ?? "")
                }
                if notifications.count > limit {
                    notifications = Array(notifications.prefix(limit))
                }
                completion(notifications, fetchError)
            case .failure(let error):
                completion([], error)
            }
        }

        core.privateDatabase.add(op)
    }

    public func fetchAllNotificationsFromCloudKit(limit: Int? = nil, completion: @escaping ([[String: Any]], Error?) -> Void) {
        core.queryRecords(
            recordType: Defaults.notificationRecordType,
            predicate: NSPredicate(value: true),
            sortDescriptors: [NSSortDescriptor(key: "createdAt", ascending: false)],
            resultsLimit: limit
        ) { result in
            switch result {
            case .failure(let error):
                completion([], error)
            case .success(let records):
                let dateFormatter = ISO8601DateFormatter()
                dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

                var notifications: [[String: Any]] = []
                notifications.reserveCapacity(records.count)

                for record in records {
                    guard let id = record["id"] as? String,
                          let bucketId = record["bucketId"] as? String,
                          let title = record["title"] as? String,
                          let body = record["body"] as? String,
                          let createdAt = record["createdAt"] as? Date else {
                        continue
                    }

                    let subtitle = record["subtitle"] as? String
                    let readAt = record["readAt"] as? Date
                    let isRead = readAt != nil

                    var attachments: [[String: Any]] = []
                    if let attachmentsString = record["attachments"] as? String,
                       let attachmentsData = attachmentsString.data(using: .utf8),
                       let attachmentsArray = try? JSONSerialization.jsonObject(with: attachmentsData) as? [[String: Any]] {
                        attachments = attachmentsArray
                    }

                    var actions: [[String: Any]] = []
                    if let actionsString = record["actions"] as? String,
                       let actionsData = actionsString.data(using: .utf8),
                       let actionsArray = try? JSONSerialization.jsonObject(with: actionsData) as? [[String: Any]] {
                        actions = actionsArray
                    }

                    var dict: [String: Any] = [
                        "id": id,
                        "bucketId": bucketId,
                        "title": title,
                        "body": body,
                        "createdAt": dateFormatter.string(from: createdAt),
                        "isRead": isRead,
                        "attachments": attachments,
                        "actions": actions
                    ]

                    if let subtitle { dict["subtitle"] = subtitle }
                    if let readAt { dict["readAt"] = dateFormatter.string(from: readAt) }

                    notifications.append(dict)
                }

                // Sort unread first, then createdAt desc
                notifications.sort { n1, n2 in
                    let r1 = (n1["isRead"] as? Bool) ?? false
                    let r2 = (n2["isRead"] as? Bool) ?? false
                    if r1 != r2 { return !r1 && r2 }
                    return (n1["createdAt"] as? String ?? "") > (n2["createdAt"] as? String ?? "")
                }

                completion(notifications, nil)
            }
        }
    }

    public func fetchAllBucketsFromCloudKit(completion: @escaping ([[String: Any]], Error?) -> Void) {
        let predicate = NSPredicate(value: true)
        let query = CKQuery(recordType: Defaults.bucketRecordType, predicate: predicate)
        query.sortDescriptors = [NSSortDescriptor(key: "name", ascending: true)]

        var allBuckets: [[String: Any]] = []
        var fetchError: Error?

        func fetchPage(cursor: CKQueryOperation.Cursor?) {
            let op: CKQueryOperation
            if let cursor {
                op = CKQueryOperation(cursor: cursor)
            } else {
                op = CKQueryOperation(query: query)
                op.zoneID = core.zoneID
            }

            // Use .background QoS to minimize battery impact on Watch
            op.qualityOfService = .background

            var pageBuckets: [[String: Any]] = []
            op.recordMatchedBlock = { _, result in
                switch result {
                case .success(let record):
                    guard let id = record["id"] as? String,
                          let name = record["name"] as? String else {
                        return
                    }

                    var dict: [String: Any] = [
                        "id": id,
                        "name": name,
                        "unreadCount": 0
                    ]
                    if let iconUrl = record["iconUrl"] as? String { dict["iconUrl"] = iconUrl }
                    if let color = record["color"] as? String { dict["color"] = color }
                    pageBuckets.append(dict)

                case .failure(let error):
                    fetchError = error
                }
            }

            op.queryResultBlock = { result in
                switch result {
                case .success(let nextCursor):
                    allBuckets.append(contentsOf: pageBuckets)
                    if let nextCursor {
                        fetchPage(cursor: nextCursor)
                    } else {
                        completion(allBuckets, fetchError)
                    }
                case .failure(let error):
                    completion([], error)
                }
            }

            core.privateDatabase.add(op)
        }

        fetchPage(cursor: nil)
    }

    // MARK: - Incremental sync (applies directly to WatchDataStore)

    public func syncFromCloudKitIncremental(fullSync: Bool = false, completion: @escaping (Int, Error?) -> Void) {
        if fullSync {
            // Full sync: clear local data, disable subscriptions, reset token, fetch all from CloudKit, resubscribe
            performFullSyncFromCloudKit(completion: completion)
        } else {
            // Incremental sync: use zone changes with token
            core.fetchZoneChanges { result in
                switch result {
                case .failure(let error):
                    completion(0, error)

                case .success(let changes):
                    let applied = self.applyZoneChangesToWatchCache(changes)
                    UserDefaults.standard.set(true, forKey: CloudKitManagerBase.cloudKitInitialSyncCompletedKey)
                    completion(applied, nil)
                }
            }
        }
    }
    
    private func notifySyncProgress(currentItem: Int, totalItems: Int, itemType: String, phase: String, step: String = "") {
        let dict: [String: Any] = [
            "currentItem": currentItem,
            "totalItems": totalItems,
            "itemType": itemType,
            "phase": phase,
            "step": step
        ]
        
        // Post to NotificationCenter for watch UI to observe
        NotificationCenter.default.post(
            name: NSNotification.Name("CloudKitSyncProgress"),
            object: nil,
            userInfo: dict
        )
    }
    
    private func performFullSyncFromCloudKit(completion: @escaping (Int, Error?) -> Void) {
        // EVENT 1: FullSync started
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "",
            phase: "starting",
            step: "full_sync"
        )
        
        // Step 1: Clear local data
        WatchDataStore.shared.clearCache()
        
        // EVENT 2: Reset started
        self.notifySyncProgress(
            currentItem: 0,
            totalItems: 0,
            itemType: "",
            phase: "starting",
            step: "reset_cloudkit"
        )
        
        // Step 2: Delete subscriptions
        let subscriptionIDs = [Defaults.notificationSubscriptionID, Defaults.bucketSubscriptionID]
        core.deleteSubscriptions(subscriptionIDs) { deleteResult in
            switch deleteResult {
            case .failure(let error):
                // Log but continue (non-fatal)
                print("⌚ [WatchCloudKit] Failed to delete subscriptions (non-fatal): \(error.localizedDescription)")
            case .success:
                print("⌚ [WatchCloudKit] Subscriptions deleted")
            }
            
            // Step 3: Reset token
            self.core.resetServerChangeToken()
            
            // EVENT 3: Reset completed
            self.notifySyncProgress(
                currentItem: 0,
                totalItems: 0,
                itemType: "",
                phase: "completed",
                step: "reset_cloudkit"
            )
            
            // EVENT 4: Buckets preparing
            self.notifySyncProgress(
                currentItem: 0,
                totalItems: 0,
                itemType: "bucket",
                phase: "preparing",
                step: "sync_buckets"
            )
            
            // Step 4: Fetch all data from CloudKit
            let group = DispatchGroup()
            var allNotifications: [[String: Any]] = []
            var allBuckets: [[String: Any]] = []
            var fetchError: Error?
            
            group.enter()
            self.fetchAllBucketsFromCloudKit { buckets, error in
                if let error = error {
                    fetchError = error
                } else {
                    allBuckets = buckets
                    
                    // EVENT 5: Buckets found
                    self.notifySyncProgress(
                        currentItem: buckets.count,
                        totalItems: buckets.count,
                        itemType: "bucket",
                        phase: "found",
                        step: "sync_buckets"
                    )
                }
                group.leave()
            }
            
            group.enter()
            // Fetch only the N most recent notifications (based on maxNotificationsLimit)
            // Use same key as WatchSettingsManager for consistency
            let maxLimit = UserDefaults.standard.integer(forKey: "watch_max_notifications_limit")
            let limit = maxLimit > 0 ? maxLimit : 100 // Default to 100 if not set
            
            self.fetchLatestNotificationsFromCloudKit(limit: limit) { notifications, error in
                if let error = error {
                    fetchError = error
                } else {
                    allNotifications = notifications
                    
                    // EVENT 6: Notifications found
                    self.notifySyncProgress(
                        currentItem: notifications.count,
                        totalItems: notifications.count,
                        itemType: "notification",
                        phase: "found",
                        step: "sync_notifications"
                    )
                }
                group.leave()
            }
            
            group.notify(queue: .main) {
                if let error = fetchError {
                    // EVENT: FullSync failed
                    self.notifySyncProgress(
                        currentItem: 0,
                        totalItems: 0,
                        itemType: "",
                        phase: "failed",
                        step: "full_sync"
                    )
                    completion(0, error)
                    return
                }
                
                // Step 5: Apply all data to cache
                // EVENT 7: Applying data
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: allBuckets.count + allNotifications.count,
                    itemType: "",
                    phase: "starting",
                    step: "apply_data"
                )
                
                let applied = self.applyFullDataToWatchCache(notifications: allNotifications, buckets: allBuckets)
                
                // EVENT 8: Data applied
                self.notifySyncProgress(
                    currentItem: applied,
                    totalItems: allBuckets.count + allNotifications.count,
                    itemType: "",
                    phase: "completed",
                    step: "apply_data"
                )
                
                // EVENT 9: Resubscribe started
                self.notifySyncProgress(
                    currentItem: 0,
                    totalItems: 0,
                    itemType: "",
                    phase: "starting",
                    step: "restart_subscriptions"
                )
                
                // Step 6: Resubscribe
                self.core.ensureSubscriptions(self.defaultSubscriptions()) { subResult in
                    switch subResult {
                    case .failure(let error):
                        print("⌚ [WatchCloudKit] Failed to resubscribe: \(error.localizedDescription)")
                        // Continue anyway (non-fatal)
                    case .success:
                        print("⌚ [WatchCloudKit] Subscriptions recreated")
                    }
                    
                    // EVENT 10: Resubscribe completed
                    self.notifySyncProgress(
                        currentItem: 0,
                        totalItems: 0,
                        itemType: "",
                        phase: "completed",
                        step: "restart_subscriptions"
                    )
                    
                    // EVENT 11: Token update started
                    self.notifySyncProgress(
                        currentItem: 0,
                        totalItems: 0,
                        itemType: "",
                        phase: "starting",
                        step: "update_server_token"
                    )
                    
                    // Step 7: Fetch zone changes to get new token
                    self.core.fetchZoneChanges { tokenResult in
                        switch tokenResult {
                        case .failure(let error):
                            print("⌚ [WatchCloudKit] Failed to fetch zone changes for new token: \(error.localizedDescription)")
                            // Continue anyway (non-fatal)
                            // EVENT 12: Token update failed (non-fatal)
                            self.notifySyncProgress(
                                currentItem: 0,
                                totalItems: 0,
                                itemType: "",
                                phase: "failed",
                                step: "update_server_token"
                            )
                        case .success(let changes):
                            print("⌚ [WatchCloudKit] New token obtained")
                            // EVENT 12: Token update completed
                            self.notifySyncProgress(
                                currentItem: changes.count,
                                totalItems: changes.count,
                                itemType: "",
                                phase: "completed",
                                step: "update_server_token"
                            )
                        }
                        
                        UserDefaults.standard.set(true, forKey: CloudKitManagerBase.cloudKitInitialSyncCompletedKey)
                        
                        // Save timestamp of watch full sync completion in shared UserDefaults
                        // This allows watch to compare with iPhone's last full sync timestamp
                        let sharedDefaults = UserDefaults(suiteName: "group.com.apocaliss92.zentik")
                        sharedDefaults?.set(Date().timeIntervalSince1970, forKey: "watch_last_fullsync_timestamp")
                        sharedDefaults?.synchronize()
                        
                        // EVENT 13: FullSync completed
                        self.notifySyncProgress(
                            currentItem: applied,
                            totalItems: applied,
                            itemType: "",
                            phase: "completed",
                            step: "full_sync"
                        )
                        
                        completion(applied, nil)
                    }
                }
            }
        }
    }
    
    private func applyFullDataToWatchCache(notifications: [[String: Any]], buckets: [[String: Any]]) -> Int {
        let dataStore = WatchDataStore.shared
        var cache = WatchDataStore.WatchCache()
        
        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        
        // Parse buckets
        for bucketDict in buckets {
            guard let id = bucketDict["id"] as? String,
                  let name = bucketDict["name"] as? String else {
                continue
            }
            
            let bucket = WatchDataStore.CachedBucket(
                id: id,
                name: name,
                unreadCount: 0,
                color: bucketDict["color"] as? String,
                iconUrl: bucketDict["iconUrl"] as? String
            )
            cache.buckets.append(bucket)
        }
        
        // Parse notifications
        for notifDict in notifications {
            guard let id = notifDict["id"] as? String,
                  let bucketId = notifDict["bucketId"] as? String,
                  let title = notifDict["title"] as? String,
                  let body = notifDict["body"] as? String,
                  let createdAtStr = notifDict["createdAt"] as? String,
                  let createdAt = dateFormatter.date(from: createdAtStr) else {
                continue
            }
            
            let isRead = (notifDict["isRead"] as? Bool) ?? false
            let subtitle = notifDict["subtitle"] as? String
            
            var attachments: [WatchDataStore.CachedAttachment] = []
            if let attachmentsArray = notifDict["attachments"] as? [[String: Any]] {
                attachments = attachmentsArray.compactMap { dict in
                    guard let mediaType = dict["mediaType"] as? String else { return nil }
                    return WatchDataStore.CachedAttachment(
                        mediaType: mediaType,
                        url: dict["url"] as? String,
                        name: dict["name"] as? String
                    )
                }
            }
            
            var actions: [WatchDataStore.CachedAction] = []
            if let actionsArray = notifDict["actions"] as? [[String: Any]] {
                actions = actionsArray.compactMap { dict in
                    guard let type = dict["type"] as? String else { return nil }
                    return WatchDataStore.CachedAction(
                        type: type,
                        label: dict["label"] as? String ?? "",
                        value: dict["value"] as? String,
                        id: dict["id"] as? String,
                        url: dict["url"] as? String,
                        bucketId: dict["bucketId"] as? String,
                        minutes: dict["minutes"] as? Int
                    )
                }
            }
            
            let bucket = cache.buckets.first(where: { $0.id == bucketId })
            let notification = WatchDataStore.CachedNotification(
                id: id,
                title: title,
                body: body,
                subtitle: subtitle,
                createdAt: createdAtStr,
                isRead: isRead,
                bucketId: bucketId,
                bucketName: bucket?.name,
                bucketColor: bucket?.color,
                bucketIconUrl: bucket?.iconUrl,
                attachments: attachments,
                actions: actions
            )
            cache.notifications.append(notification)
        }
        
        // Recompute unread counts
        cache.unreadCount = cache.notifications.filter { !$0.isRead }.count
        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            WatchDataStore.CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }
        
        cache.lastUpdate = Date()
        dataStore.saveCache(cache)
        
        // Post notification
        let userInfo: [AnyHashable: Any] = [
            "changedNotificationIds": cache.notifications.map { $0.id },
            "deletedNotificationIds": [],
            "changedBucketIds": cache.buckets.map { $0.id },
            "deletedBucketIds": [],
            "appliedCount": cache.notifications.count + cache.buckets.count,
            "cacheNotificationCount": cache.notifications.count,
            "cacheBucketCount": cache.buckets.count,
            "lastUpdateTimestamp": cache.lastUpdate.timeIntervalSince1970
        ]
        NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil, userInfo: userInfo)
        
        return cache.notifications.count + cache.buckets.count
    }

    /// Handles CloudKit push notifications.
    /// Uses coalescing to batch multiple notifications together for better battery efficiency.
    /// Instead of fetching each record individually, we collect record IDs and do a single
    /// incremental sync after a short delay.
    public func handleRemoteNotification(
        userInfo: [AnyHashable: Any],
        completion: @escaping (Result<Int, Error>) -> Void
    ) {
        guard isCloudKitEnabled else {
            completion(.success(0))
            return
        }

        guard let dict = userInfo as? [String: NSObject],
              let notification = CKNotification(fromRemoteNotificationDictionary: dict) else {
            // Not a CloudKit notification; treat as no-op
            completion(.success(0))
            return
        }

        // For query notifications with recordID, use coalescing
        if let queryNotification = notification as? CKQueryNotification,
           let recordID = queryNotification.recordID {
            
            coalescingQueue.async { [weak self] in
                guard let self = self else {
                    completion(.success(0))
                    return
                }
                
                // Track the record based on operation type
                switch queryNotification.queryNotificationReason {
                case .recordDeleted:
                    self.pendingDeletions.insert(recordID)
                    self.pendingRecordIDs.remove(recordID)
                case .recordCreated, .recordUpdated:
                    self.pendingRecordIDs.insert(recordID)
                    self.pendingDeletions.remove(recordID)
                @unknown default:
                    break
                }
                
                // Cancel any existing coalescing work item
                self.coalescingWorkItem?.cancel()
                
                // Schedule a new coalesced sync after delay
                let workItem = DispatchWorkItem { [weak self] in
                    guard let self = self else { return }
                    self.executeCoalescedSync(completion: completion)
                }
                self.coalescingWorkItem = workItem
                
                // Use global queue for the actual work to not block coalescingQueue
                DispatchQueue.global(qos: .utility).asyncAfter(
                    deadline: .now() + self.coalescingDelay,
                    execute: workItem
                )
            }
            return
        }

        // For zone notifications or fallback, use incremental sync directly
        if notification is CKRecordZoneNotification {
            syncFromCloudKitIncremental(fullSync: false) { applied, error in
                if let error {
                    completion(.failure(error))
                } else {
                    completion(.success(applied))
                }
            }
            return
        }

        // Fallback: incremental zone changes
        syncFromCloudKitIncremental(fullSync: false) { applied, error in
            if let error {
                completion(.failure(error))
            } else {
                completion(.success(applied))
            }
        }
    }
    
    /// Executes the coalesced sync by fetching all pending records at once
    private func executeCoalescedSync(completion: @escaping (Result<Int, Error>) -> Void) {
        // Grab and clear pending items
        let (recordsToFetch, recordsToDelete) = coalescingQueue.sync { () -> (Set<CKRecord.ID>, Set<CKRecord.ID>) in
            let toFetch = self.pendingRecordIDs
            let toDelete = self.pendingDeletions
            self.pendingRecordIDs.removeAll()
            self.pendingDeletions.removeAll()
            self.coalescingWorkItem = nil
            return (toFetch, toDelete)
        }
        
        // If we have many changes, just do incremental sync (more efficient)
        let totalPending = recordsToFetch.count + recordsToDelete.count
        if totalPending > 10 {
            infoLog("Coalesced sync: too many changes (\(totalPending)), using incremental sync")
            syncFromCloudKitIncremental(fullSync: false) { applied, error in
                if let error {
                    completion(.failure(error))
                } else {
                    completion(.success(applied))
                }
            }
            return
        }
        
        // Apply deletions immediately
        var changes: [CloudKitManagerBase.ZoneChange] = recordsToDelete.map {
            .deleted(recordID: $0, recordType: nil)
        }
        
        // If no records to fetch, just apply deletions
        guard !recordsToFetch.isEmpty else {
            let applied = applyZoneChangesToWatchCache(changes)
            UserDefaults.standard.set(true, forKey: CloudKitManagerBase.cloudKitInitialSyncCompletedKey)
            infoLog("Coalesced sync: applied \(applied) deletions")
            completion(.success(applied))
            return
        }
        
        // Batch fetch all pending records
        core.fetchRecords(recordIDs: Array(recordsToFetch)) { [weak self] result in
            guard let self = self else {
                completion(.success(0))
                return
            }
            
            switch result {
            case .failure(let error):
                // Fallback to incremental sync
                self.warnLog("Coalesced fetch failed, falling back to incremental sync", metadata: ["error": error.localizedDescription])
                self.syncFromCloudKitIncremental(fullSync: false) { applied, syncError in
                    if let syncError {
                        completion(.failure(syncError))
                    } else {
                        completion(.success(applied))
                    }
                }
                
            case .success(let recordsByID):
                // Add fetched records to changes
                for (recordID, record) in recordsByID {
                    changes.append(.changed(record))
                }
                
                // Records not found are treated as deletions
                for recordID in recordsToFetch where recordsByID[recordID] == nil {
                    changes.append(.deleted(recordID: recordID, recordType: nil))
                }
                
                let applied = self.applyZoneChangesToWatchCache(changes)
                UserDefaults.standard.set(true, forKey: CloudKitManagerBase.cloudKitInitialSyncCompletedKey)
                self.infoLog("Coalesced sync: applied \(applied) changes", metadata: [
                    "fetched": recordsByID.count,
                    "deleted": recordsToDelete.count
                ])
                completion(.success(applied))
            }
        }
    }

    // MARK: - Modify (batch-only)

    /// Batch-only read/unread update (chunked by CloudKitManagerBase). Pass a single ID as a 1-element array.
    /// Uses fetch-then-update pattern to ensure proper record versioning with CloudKit.
    public func updateNotificationsReadStatusInCloudKit(
        notificationIds: [String],
        readAt: Date?,
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        guard !notificationIds.isEmpty else {
            completion(true, 0, nil)
            return
        }

        // Fetch existing records first to get proper recordChangeTag
        let recordIDs = notificationIds.map { self.notificationRecordID($0) }
        
        self.core.fetchRecords(recordIDs: recordIDs, desiredKeys: ["readAt"]) { fetchResult in
            switch fetchResult {
            case .failure(let error):
                self.warnLog("updateNotificationsReadStatusInCloudKit fetch failed", metadata: ["error": String(describing: error), "notificationIds": "\(notificationIds.count)"])
                completion(false, 0, error)
                
            case .success(let fetchedRecords):
                // Update only fetched records (those that exist in CloudKit)
                var recordsToSave: [CKRecord] = []
                var notFoundCount = 0
                
                for notificationId in notificationIds {
                    let recordID = self.notificationRecordID(notificationId)
                    if let record = fetchedRecords[recordID] {
                        // Record exists - update readAt
                        record["readAt"] = readAt
                        recordsToSave.append(record)
                    } else {
                        notFoundCount += 1
                    }
                }
                
                if notFoundCount > 0 {
                    self.debugLog("updateNotificationsReadStatusInCloudKit: \(notFoundCount) records not found in CloudKit (skipped)")
                }
                
                guard !recordsToSave.isEmpty else {
                    self.infoLog("updateNotificationsReadStatusInCloudKit: no records to update (all not found)")
                    completion(true, 0, nil)
                    return
                }
                
                // Save with .changedKeys - now safe because records have proper recordChangeTag
                self.core.save(records: recordsToSave, savePolicy: .changedKeys) { saveResult in
                    switch saveResult {
                    case .failure(let error):
                        self.warnLog("updateNotificationsReadStatusInCloudKit save failed", metadata: ["error": String(describing: error), "recordsToSave": recordsToSave.count])
                        completion(false, 0, error)
                    case .success:
                        self.infoLog("updateNotificationsReadStatusInCloudKit completed", metadata: ["updated": recordsToSave.count, "notFound": notFoundCount, "readAt": readAt != nil ? "set" : "nil"])
                        completion(true, recordsToSave.count, nil)
                    }
                }
            }
        }
    }

    public func deleteNotificationFromCloudKit(
        notificationId: String,
        completion: @escaping (Bool, Error?) -> Void
    ) {
        debugLog("deleteNotificationFromCloudKit starting", metadata: ["notificationId": notificationId])
        let recordID = notificationRecordID(notificationId)
        core.delete(recordIDs: [recordID]) { result in
            switch result {
            case .failure(let error):
                self.warnLog("deleteNotificationFromCloudKit failed", metadata: ["notificationId": notificationId, "error": String(describing: error)])
                completion(false, error)
            case .success:
                self.infoLog("deleteNotificationFromCloudKit succeeded", metadata: ["notificationId": notificationId])
                // Apply change to cache (batch operation even for single item)
                _ = self.applyZoneChangesToWatchCache([.deleted(recordID: recordID, recordType: Defaults.notificationRecordType)])
                completion(true, nil)
            }
        }
    }
    
    /// Delete multiple notifications from CloudKit in a single batch operation
    /// - Parameters:
    ///   - notificationIds: Array of notification IDs to delete
    ///   - completion: Completion handler with success status and count of deleted records
    public func deleteNotificationsFromCloudKit(
        notificationIds: [String],
        completion: @escaping (Bool, Int, Error?) -> Void
    ) {
        guard !notificationIds.isEmpty else {
            completion(true, 0, nil)
            return
        }
        
        debugLog("deleteNotificationsFromCloudKit starting", metadata: ["count": notificationIds.count, "ids": notificationIds.joined(separator: ",")])
        let recordIDs = notificationIds.map { notificationRecordID($0) }
        core.delete(recordIDs: recordIDs) { result in
            switch result {
            case .failure(let error):
                self.warnLog("deleteNotificationsFromCloudKit failed", metadata: ["count": notificationIds.count, "error": String(describing: error)])
                completion(false, 0, error)
            case .success:
                self.infoLog("deleteNotificationsFromCloudKit succeeded", metadata: ["count": notificationIds.count])
                // Apply all changes to cache in a single batch operation
                let changes = recordIDs.map { recordID in
                    CloudKitManagerBase.ZoneChange.deleted(recordID: recordID, recordType: Defaults.notificationRecordType)
                }
                let applied = self.applyZoneChangesToWatchCache(changes)
                completion(true, applied, nil)
            }
        }
    }

    // MARK: - Modify (batch-only)

    public func save(records: [CKRecord], completion: @escaping (Result<Void, Error>) -> Void) {
        core.save(records: records, progressCallback: nil, completion: completion)
    }

    public func delete(recordIDs: [CKRecord.ID], completion: @escaping (Result<Void, Error>) -> Void) {
        core.delete(recordIDs: recordIDs, completion: completion)
    }

    public func modify(
        recordsToSave: [CKRecord],
        recordIDsToDelete: [CKRecord.ID],
        completion: @escaping (Result<Void, Error>) -> Void
    ) {
        core.modify(recordsToSave: recordsToSave, recordIDsToDelete: recordIDsToDelete, completion: completion)
    }

    // MARK: - Internal helpers

    private func notificationRecordID(_ notificationId: String) -> CKRecord.ID {
        CKRecord.ID(recordName: "Notification-\(notificationId)", zoneID: core.zoneID)
    }

    private func bucketRecordID(_ bucketId: String) -> CKRecord.ID {
        CKRecord.ID(recordName: "Bucket-\(bucketId)", zoneID: core.zoneID)
    }

    @discardableResult
    private func applyZoneChangesToWatchCache(_ changes: [CloudKitManagerBase.ZoneChange]) -> Int {
        let dataStore = WatchDataStore.shared
        var cache = dataStore.loadCache()

        let dateFormatter = ISO8601DateFormatter()
        dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]

        var appliedCount = 0

        var changedNotificationIds: [String] = []
        var deletedNotificationIds: [String] = []
        var changedBucketIds: [String] = []
        var deletedBucketIds: [String] = []

        for change in changes {
            switch change {
            case .changed(let record):
                if record.recordType == Defaults.notificationRecordType {
                    guard let id = record["id"] as? String,
                          let title = record["title"] as? String,
                          let body = record["body"] as? String,
                          let bucketId = record["bucketId"] as? String,
                          let createdAt = record["createdAt"] as? Date else {
                        continue
                    }

                    changedNotificationIds.append(id)

                    let subtitle = record["subtitle"] as? String
                    let readAt = record["readAt"] as? Date
                    let isRead = readAt != nil

                    var attachments: [WatchDataStore.CachedAttachment] = []
                    if let attachmentsString = record["attachments"] as? String,
                       let attachmentsData = attachmentsString.data(using: .utf8),
                       let attachmentsArray = try? JSONSerialization.jsonObject(with: attachmentsData) as? [[String: Any]] {
                        attachments = attachmentsArray.compactMap { dict in
                            guard let mediaType = dict["mediaType"] as? String else { return nil }
                            return WatchDataStore.CachedAttachment(mediaType: mediaType, url: dict["url"] as? String, name: dict["name"] as? String)
                        }
                    }

                    var actions: [WatchDataStore.CachedAction] = []
                    if let actionsString = record["actions"] as? String,
                       let actionsData = actionsString.data(using: .utf8),
                       let actionsArray = try? JSONSerialization.jsonObject(with: actionsData) as? [[String: Any]] {
                        actions = actionsArray.compactMap { dict in
                            guard let type = dict["type"] as? String else { return nil }
                            return WatchDataStore.CachedAction(
                                type: type,
                                label: dict["label"] as? String ?? "",
                                value: dict["value"] as? String,
                                id: dict["id"] as? String,
                                url: dict["url"] as? String,
                                bucketId: dict["bucketId"] as? String,
                                minutes: dict["minutes"] as? Int
                            )
                        }
                    }

                    let bucket = cache.buckets.first(where: { $0.id == bucketId })
                    let updated = WatchDataStore.CachedNotification(
                        id: id,
                        title: title,
                        body: body,
                        subtitle: subtitle,
                        createdAt: dateFormatter.string(from: createdAt),
                        isRead: isRead,
                        bucketId: bucketId,
                        bucketName: bucket?.name,
                        bucketColor: bucket?.color,
                        bucketIconUrl: bucket?.iconUrl,
                        attachments: attachments,
                        actions: actions
                    )

                    if let idx = cache.notifications.firstIndex(where: { $0.id == id }) {
                        cache.notifications[idx] = updated
                    } else {
                        cache.notifications.append(updated)
                    }
                    appliedCount += 1

                } else if record.recordType == Defaults.bucketRecordType {
                    guard let id = record["id"] as? String,
                          let name = record["name"] as? String else {
                        continue
                    }

                    changedBucketIds.append(id)

                    let updated = WatchDataStore.CachedBucket(
                        id: id,
                        name: name,
                        unreadCount: 0,
                        color: record["color"] as? String,
                        iconUrl: record["iconUrl"] as? String
                    )

                    if let idx = cache.buckets.firstIndex(where: { $0.id == id }) {
                        cache.buckets[idx] = updated
                    } else {
                        cache.buckets.append(updated)
                    }
                    appliedCount += 1
                }

            case .deleted(let recordID, let recordType):
                let type = recordType
                if type == Defaults.notificationRecordType || recordID.recordName.hasPrefix("Notification-") {
                    let id = recordID.recordName.replacingOccurrences(of: "Notification-", with: "")
                    deletedNotificationIds.append(id)
                    appliedCount += 1
                } else if type == Defaults.bucketRecordType || recordID.recordName.hasPrefix("Bucket-") {
                    let id = recordID.recordName.replacingOccurrences(of: "Bucket-", with: "")
                    deletedBucketIds.append(id)
                    appliedCount += 1
                }
            }
        }
        
        // Apply batch deletions (more efficient than removeAll in loop)
        if !deletedNotificationIds.isEmpty {
            let deletedSet = Set(deletedNotificationIds)
            cache.notifications.removeAll(where: { deletedSet.contains($0.id) })
        }
        if !deletedBucketIds.isEmpty {
            let deletedSet = Set(deletedBucketIds)
            cache.buckets.removeAll(where: { deletedSet.contains($0.id) })
        }

        // Keep cache bounded to avoid expensive JSON writes and UI freezes on Watch.
        // We keep the N most recent notifications by createdAt (consistent with display).
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        if cache.notifications.count > maxLimit {
            let iso8601Fractional = ISO8601DateFormatter()
            iso8601Fractional.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            let iso8601NoFractional = ISO8601DateFormatter()
            iso8601NoFractional.formatOptions = [.withInternetDateTime]

            func parseCreatedAt(_ value: String) -> Date {
                if let d = iso8601Fractional.date(from: value) { return d }
                if let d = iso8601NoFractional.date(from: value) { return d }
                return .distantPast
            }

            cache.notifications.sort { a, b in
                parseCreatedAt(a.createdAt) > parseCreatedAt(b.createdAt)
            }
            cache.notifications = Array(cache.notifications.prefix(maxLimit))
        }

        // Recompute unread counts
        cache.unreadCount = cache.notifications.filter { !$0.isRead }.count
        var unreadByBucket: [String: Int] = [:]
        for n in cache.notifications where !n.isRead {
            unreadByBucket[n.bucketId, default: 0] += 1
        }
        cache.buckets = cache.buckets.map { bucket in
            WatchDataStore.CachedBucket(
                id: bucket.id,
                name: bucket.name,
                unreadCount: unreadByBucket[bucket.id] ?? 0,
                color: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }

        cache.lastUpdate = Date()
        dataStore.saveCache(cache)

        let userInfo: [AnyHashable: Any] = [
            "changedNotificationIds": Array(Set(changedNotificationIds)),
            "deletedNotificationIds": Array(Set(deletedNotificationIds)),
            "changedBucketIds": Array(Set(changedBucketIds)),
            "deletedBucketIds": Array(Set(deletedBucketIds)),
            "appliedCount": appliedCount,
            "cacheNotificationCount": cache.notifications.count,
            "cacheBucketCount": cache.buckets.count,
            "lastUpdateTimestamp": cache.lastUpdate.timeIntervalSince1970
        ]
        NotificationCenter.default.post(name: NSNotification.Name("CloudKitDataUpdated"), object: nil, userInfo: userInfo)

        return appliedCount
    }
}

#endif
