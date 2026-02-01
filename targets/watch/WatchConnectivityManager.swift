import Foundation
import CloudKit
import WatchConnectivity

/**
 * WatchConnectivityManager - Wrapper per WatchCloudKit
 * 
 * This is a minimal stub that maintains the interface used by content.swift
 * but uses WatchCloudKit internally for data synchronization.
 * 
 * TODO: Implement CloudKit fetch methods to replace WatchConnectivity
 */
class WatchConnectivityManager: NSObject, ObservableObject, WCSessionDelegate {
    static let shared = WatchConnectivityManager()
    
    @Published var notifications: [NotificationData] = []
    @Published var unreadCount: Int = 0
    @Published var buckets: [BucketItem] = []
    @Published var isConnected: Bool = false
    @Published var lastUpdate: Date?
    @Published var isWaitingForResponse: Bool = false
    @Published var isSyncing: Bool = false
    @Published var isFullSyncing: Bool = false
    
    // Sync progress tracking
    @Published var syncProgressCurrentItem: Int = 0
    @Published var syncProgressTotalItems: Int = 0
    @Published var syncProgressItemType: String = ""
    @Published var syncProgressPhase: String = ""
    @Published var syncProgressStep: String = ""
    
    private let dataStore = WatchDataStore.shared
    private var wcSession: WCSession?
    
    private let syncStateQueue = DispatchQueue(label: "WatchConnectivityManager.syncStateQueue")
    private var syncInFlight: Bool = false

    private let topUpQueue = DispatchQueue(label: "WatchConnectivityManager.topUpQueue")
    private var topUpInFlight: Bool = false

    private var uiRefreshWorkItem: DispatchWorkItem?
    private let uiRefreshDebounceInterval: TimeInterval = 0.35
    private let uiRefreshFastDebounceInterval: TimeInterval = 0.08

    // WC is intentionally restricted to:
    // - iPhone -> Watch: settings (watchTokenSettings via applicationContext/message)
    // - Watch -> iPhone: logs transfer (watchLogs via sendMessage)
    
    private override init() {
        super.init()
        loadCachedData()
        updateBucketCounts() // Update bucket counts immediately after loading cache
        
        // Note: CloudKit schema and subscriptions are initialized in WatchExtensionDelegate
        // to avoid duplicate initialization
        
        // Listen for CloudKit data updates (from remote notifications)
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCloudKitDataUpdate(_:)),
            name: NSNotification.Name("CloudKitDataUpdated"),
            object: nil
        )
        
        // Listen for CloudKit sync progress events
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleCloudKitSyncProgress(_:)),
            name: NSNotification.Name("CloudKitSyncProgress"),
            object: nil
        )
        
        // Listen for app lifecycle events
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appDidBecomeActive),
            name: NSNotification.Name("WatchAppDidBecomeActive"),
            object: nil
        )
        
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(appWillResignActive),
            name: NSNotification.Name("WatchAppWillResignActive"),
            object: nil
        )
        
        setupWatchConnectivity()
        
        // Initial incremental sync on app open (to catch up on any missed updates)
        // After this, we rely on CloudKit remote notifications via subscriptions
        // Delay initial sync slightly to allow schema initialization to complete
        DispatchQueue.main.asyncAfter(deadline: .now() + 2.0) { [weak self] in
            self?.performIncrementalSync()
        }
    }
    
    private func setupWatchConnectivity() {
        if WCSession.isSupported() {
            wcSession = WCSession.default
            wcSession?.delegate = self
            
            // Check for existing application context (token settings sent before watch was active)
            if let applicationContext = wcSession?.applicationContext, !applicationContext.isEmpty {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Found existing application context", metadata: ["keys": "\(applicationContext.keys)"], source: "Watch")
                if let type = applicationContext["type"] as? String, type == "watchTokenSettings" {
                    handleWatchTokenSettings(message: applicationContext, replyHandler: { _ in })
                }
            } else {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "No application context available yet", source: "Watch")
            }
            
            wcSession?.activate()
        }
    }
    
    // MARK: - WCSessionDelegate
    func session(_ session: WCSession, activationDidCompleteWith activationState: WCSessionActivationState, error: Error?) {
        if let error = error {
            LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "WCSession activation failed", metadata: ["error": error.localizedDescription], source: "Watch")
        } else {
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "WCSession activated", metadata: ["state": "\(activationState.rawValue)"], source: "Watch")
            DispatchQueue.main.async {
                self.isConnected = activationState == .activated
            }
            
            // After activation, check for application context again (in case it was set while activating)
            if activationState == .activated {
                let applicationContext = session.applicationContext
                if !applicationContext.isEmpty {
                    LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Application context available after activation", metadata: ["keys": "\(applicationContext.keys)"], source: "Watch")
                    if let type = applicationContext["type"] as? String, type == "watchTokenSettings" {
                        handleWatchTokenSettings(message: applicationContext, replyHandler: { _ in })
                    }
                } else {
                    LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Application context data is nil after activation", source: "Watch")
                }
            }
        }
    }
    
    func session(_ session: WCSession, didReceiveMessage message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let type = message["type"] as? String else {
            replyHandler(["success": false, "error": "Missing message type"])
            return
        }
        
        // Handle triggerFullSync message from iPhone
        if type == "triggerFullSync" {
            if WatchExtensionDelegate.isInBackground {
                replyHandler(["success": true, "message": "Full sync deferred (background)"])
                return
            }
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "WatchConnectivity",
                message: "Received full sync request from iPhone",
                source: "Watch"
            )
            
            // Immediately disable subscriptions to prevent receiving individual events during full sync
            WatchCloudKit.shared.disableSubscriptions { result in
                switch result {
                case .failure(let error):
                    LoggingSystem.shared.log(
                        level: "WARN",
                        tag: "WatchConnectivity",
                        message: "Failed to disable subscriptions before full sync (non-fatal)",
                        metadata: ["error": error.localizedDescription],
                        source: "Watch"
                    )
                case .success:
                    LoggingSystem.shared.log(
                        level: "INFO",
                        tag: "WatchConnectivity",
                        message: "Subscriptions disabled before full sync",
                        source: "Watch"
                    )
                }
                
                // Trigger full sync on watch
                DispatchQueue.main.async { [weak self] in
                    self?.isFullSyncing = true
                }
                self.requestSync(fullSync: true)
            }
            
            replyHandler(["success": true, "message": "Full sync triggered"])
            return
        }
        
        if type == "watchTokenSettings" {
            handleWatchTokenSettings(message: message, replyHandler: replyHandler)
        } else {
            replyHandler(["success": false, "error": "Unknown message type"])
        }
    }
    
    func session(_ session: WCSession, didReceiveApplicationContext applicationContext: [String: Any]) {
        if let type = applicationContext["type"] as? String {
            if type == "watchTokenSettings" {
                handleWatchTokenSettings(message: applicationContext, replyHandler: { _ in })
            } else if type == "triggerFullSync" {
                if WatchExtensionDelegate.isInBackground {
                    return
                }
                // Handle full sync request from iPhone (works in background via applicationContext)
                LoggingSystem.shared.log(
                    level: "INFO",
                    tag: "WatchConnectivity",
                    message: "Received full sync request from iPhone (via applicationContext)",
                    source: "Watch"
                )
                
                // Immediately disable subscriptions to prevent receiving individual events during full sync
                WatchCloudKit.shared.disableSubscriptions { result in
                    switch result {
                    case .failure(let error):
                        LoggingSystem.shared.log(
                            level: "WARN",
                            tag: "WatchConnectivity",
                            message: "Failed to disable subscriptions before full sync (non-fatal)",
                            metadata: ["error": error.localizedDescription],
                            source: "Watch"
                        )
                    case .success:
                        LoggingSystem.shared.log(
                            level: "INFO",
                            tag: "WatchConnectivity",
                            message: "Subscriptions disabled before full sync",
                            source: "Watch"
                        )
                    }
                    
                    // Trigger full sync on watch
                    DispatchQueue.main.async { [weak self] in
                        self?.isFullSyncing = true
                    }
                    self.requestSync(fullSync: true)
                }
            }
        }
    }
    
    private func handleWatchTokenSettings(message: [String: Any], replyHandler: @escaping ([String: Any]) -> Void) {
        guard let token = message["token"] as? String,
              let serverAddress = message["serverAddress"] as? String else {
            LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Missing token or server address", source: "Watch")
            replyHandler(["success": false, "error": "Missing token or server address"])
            return
        }
        
        // Save token and server address to UserDefaults
        UserDefaults.standard.set(token, forKey: "watch_access_token")
        UserDefaults.standard.set(serverAddress, forKey: "watch_server_address")
        UserDefaults.standard.synchronize()
        
        LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Watch token settings received and saved", source: "Watch")
        
        // Post notification to show confirmation in UI
        NotificationCenter.default.post(
            name: NSNotification.Name("WatchTokenSettingsReceived"),
            object: nil,
            userInfo: ["token": token, "serverAddress": serverAddress]
        )
        
        replyHandler(["success": true])
    }
    
    @objc private func appDidBecomeActive() {
        // Check if iPhone did a full sync while watch was in background
        // If iPhone's last full sync is more recent than watch's last full sync,
        // perform full sync instead of incremental to avoid processing hundreds of individual events
        let sharedDefaults = UserDefaults(suiteName: "group.com.apocaliss92.zentik")
        let iphoneLastFullSync = sharedDefaults?.double(forKey: "iphone_last_fullsync_timestamp") ?? 0
        let watchLastFullSync = sharedDefaults?.double(forKey: "watch_last_fullsync_timestamp") ?? 0
        
        if iphoneLastFullSync > watchLastFullSync && iphoneLastFullSync > 0 {
            // iPhone did full sync more recently than watch
            // Disable subscriptions immediately to prevent receiving individual events
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "WatchConnectivity",
                message: "iPhone did full sync while watch was in background, performing full sync instead of incremental",
                metadata: [
                    "iphone_last_fullsync": iphoneLastFullSync,
                    "watch_last_fullsync": watchLastFullSync
                ],
                source: "Watch"
            )
            
            WatchCloudKit.shared.disableSubscriptions { [weak self] result in
                switch result {
                case .failure(let error):
                    LoggingSystem.shared.log(
                        level: "WARN",
                        tag: "WatchConnectivity",
                        message: "Failed to disable subscriptions before full sync (non-fatal)",
                        metadata: ["error": error.localizedDescription],
                        source: "Watch"
                    )
                case .success:
                    LoggingSystem.shared.log(
                        level: "INFO",
                        tag: "WatchConnectivity",
                        message: "Subscriptions disabled before full sync",
                        source: "Watch"
                    )
                }
                
                // Perform full sync instead of incremental
                DispatchQueue.main.async { [weak self] in
                    self?.isFullSyncing = true
                }
                self?.requestSync(fullSync: true)
            }
        } else {
            // Normal incremental sync
            performIncrementalSync()
        }
    }
    
    @objc private func appWillResignActive() {
        // Best-effort: persist any pending cache writes before backgrounding.
        dataStore.flushPendingWrites()
    }
    
    /// Public method to trigger incremental sync (used by UI)
    func syncFromCloudKitIncremental() {
        performIncrementalSync()
    }
    
    private func performIncrementalSync() {
        requestSync(fullSync: false)
    }
    
    private func requestSync(fullSync: Bool) {
        syncStateQueue.async { [weak self] in
            guard let self = self else { return }

            if self.syncInFlight {
                LoggingSystem.shared.log(
                    level: "INFO",
                    tag: "CloudKit",
                    message: "Sync already in progress; skipping",
                    metadata: ["fullSync": fullSync ? "true" : "false"],
                    source: "Watch"
                )

                if fullSync {
                    DispatchQueue.main.async { [weak self] in
                        self?.isFullSyncing = false
                    }
                }
                return
            }

            self.syncInFlight = true
            DispatchQueue.main.async { [weak self] in
                self?.isSyncing = true
            }

            self.performSyncInternal(fullSync: fullSync)
        }
    }

    private func performSyncInternal(fullSync: Bool) {
        // Check if CloudKit is enabled before syncing
        guard WatchCloudKit.shared.isCloudKitEnabled else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit is disabled, skipping sync", source: "Watch")
            DispatchQueue.main.async { [weak self] in
                self?.isSyncing = false
                self?.isFullSyncing = false
            }
            syncStateQueue.async { [weak self] in
                guard let self = self else { return }
                self.syncInFlight = false
            }
            return
        }

        WatchCloudKit.shared.syncFromCloudKitIncremental(fullSync: fullSync) { count, error in
            DispatchQueue.main.async { [weak self] in
                guard let self = self else { return }
                self.isSyncing = false
                if fullSync {
                    self.isFullSyncing = false
                }

                if let error = error {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: fullSync ? "Full sync failed" : "Incremental sync failed", metadata: ["error": error.localizedDescription], source: "Watch")
                } else if count > 0 {
                    LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: fullSync ? "Full sync completed" : "Incremental sync completed", metadata: ["updatedCount": "\(count)"], source: "Watch")
                    self.scheduleUIRefresh(reason: fullSync ? "fullSync" : "incrementalSync")
                    
                    // After full sync, ensure we're filled to max limit (refill if needed after deletions)
                    if fullSync {
                        self.ensureFilledToMaxLimit(reason: "fullSync")
                    }
                }
            }

            self.syncStateQueue.async { [weak self] in
                guard let self = self else { return }
                self.syncInFlight = false
            }
        }
    }
    
    deinit {
        NotificationCenter.default.removeObserver(self)
    }
    
    @objc private func handleCloudKitSyncProgress(_ notification: Notification) {
        guard let userInfo = notification.userInfo,
              let currentItem = userInfo["currentItem"] as? Int,
              let totalItems = userInfo["totalItems"] as? Int,
              let itemType = userInfo["itemType"] as? String,
              let phase = userInfo["phase"] as? String else {
            return
        }
        
        let step = userInfo["step"] as? String ?? ""
        
        DispatchQueue.main.async { [weak self] in
            self?.syncProgressCurrentItem = currentItem
            self?.syncProgressTotalItems = totalItems
            self?.syncProgressItemType = itemType
            self?.syncProgressPhase = phase
            self?.syncProgressStep = step
            
            // Update isFullSyncing based on step
            if step == "full_sync" {
                if phase == "starting" {
                    self?.isFullSyncing = true
                } else if phase == "completed" || phase == "failed" {
                    self?.isFullSyncing = false
                }
            }
        }
    }
    
    @objc private func handleCloudKitDataUpdate(_ notification: Notification) {
        let changedNotificationIds = (notification.userInfo?["changedNotificationIds"] as? [String]) ?? []
        let deletedNotificationIds = (notification.userInfo?["deletedNotificationIds"] as? [String]) ?? []
        let changedBucketIds = (notification.userInfo?["changedBucketIds"] as? [String]) ?? []
        let deletedBucketIds = (notification.userInfo?["deletedBucketIds"] as? [String]) ?? []

        // If we have diff info, apply it without reloading JSON from disk.
        if !changedNotificationIds.isEmpty || !deletedNotificationIds.isEmpty || !changedBucketIds.isEmpty || !deletedBucketIds.isEmpty {
            scheduleUIRefresh(
                reason: "cloudKitDataUpdated(diff)",
                debounceInterval: uiRefreshFastDebounceInterval
            ) { [weak self] in
                self?.applyCloudKitDiffToUI(
                    changedNotificationIds: changedNotificationIds,
                    deletedNotificationIds: deletedNotificationIds,
                    changedBucketIds: changedBucketIds,
                    deletedBucketIds: deletedBucketIds
                )
            }
            return
        }

        // Fallback (older versions): reload from cache.
        scheduleUIRefresh(reason: "cloudKitDataUpdated")
    }

    private func scheduleUIRefresh(
        reason: String,
        debounceInterval: TimeInterval? = nil,
        work: (() -> Void)? = nil
    ) {
        // Coalesce bursts of updates to avoid blocking the UI when many notifications arrive
        uiRefreshWorkItem?.cancel()
        let interval = debounceInterval ?? uiRefreshDebounceInterval
        let workItem = DispatchWorkItem { [weak self] in
            guard let self = self else { return }
            if let work {
                work()
            } else {
                self.loadCachedData()
                self.updateBucketCounts()
            }
        }
        uiRefreshWorkItem = workItem
        DispatchQueue.main.asyncAfter(deadline: .now() + interval, execute: workItem)
    }

    private func makeNotificationData(from cached: WatchDataStore.CachedNotification) -> NotificationData {
        let notification = WidgetNotification(
            id: cached.id,
            title: cached.title,
            body: cached.body,
            subtitle: cached.subtitle,
            createdAt: cached.createdAt,
            isRead: cached.isRead,
            bucketId: cached.bucketId,
            bucketName: cached.bucketName,
            bucketColor: cached.bucketColor,
            bucketIconUrl: cached.bucketIconUrl,
            attachments: cached.attachments.map { WidgetAttachment(mediaType: $0.mediaType, url: $0.url, name: $0.name) },
            actions: cached.actions.map { NotificationAction(type: $0.type, label: $0.label, value: $0.value, id: $0.id, url: $0.url, bucketId: $0.bucketId, minutes: $0.minutes) }
        )
        return NotificationData(notification: notification)
    }

    private func normalizeNotificationsForDisplay() {
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit

        let mostRecent = notifications
            .sorted { $0.notification.createdAtDate > $1.notification.createdAtDate }

        let limited = Array(mostRecent.prefix(maxLimit))

        notifications = limited.sorted { a, b in
            if a.notification.isRead != b.notification.isRead {
                return !a.notification.isRead && b.notification.isRead
            }
            return a.notification.createdAtDate > b.notification.createdAtDate
        }
    }

    private func applyCloudKitDiffToUI(
        changedNotificationIds: [String],
        deletedNotificationIds: [String],
        changedBucketIds: [String],
        deletedBucketIds: [String]
    ) {
        let cache = dataStore.loadCache()

        let deletedSet = Set(deletedNotificationIds)
        if !deletedSet.isEmpty {
            notifications.removeAll { deletedSet.contains($0.notification.id) }
        }

        let changedSet = Set(changedNotificationIds)
        if !changedSet.isEmpty {
            for id in changedSet {
                if let cached = cache.notifications.first(where: { $0.id == id }) {
                    let updated = makeNotificationData(from: cached)
                    if let idx = notifications.firstIndex(where: { $0.notification.id == id }) {
                        notifications[idx] = updated
                    } else {
                        notifications.append(updated)
                    }
                } else {
                    // Might have been trimmed out of the bounded cache.
                    notifications.removeAll { $0.notification.id == id }
                }
            }
        }

        // Buckets are typically few; replace them from cache for consistency.
        buckets = cache.buckets.map { cached in
            BucketItem(
                id: cached.id,
                name: cached.name,
                unreadCount: cached.unreadCount,
                totalCount: 0,
                color: cached.color,
                iconUrl: cached.iconUrl,
                lastNotificationDate: nil
            )
        }

        unreadCount = cache.unreadCount
        lastUpdate = cache.lastUpdate

        normalizeNotificationsForDisplay()
        updateBucketCounts()

        if !deletedNotificationIds.isEmpty {
            ensureFilledToMaxLimit(reason: "cloudKitDeletion")
        }
    }
    
    /// Reload notifications and buckets from WatchDataStore (e.g. after extension wrote a new notification).
    func reloadFromLocalCache() {
        dataStore.reloadFromDisk()
        loadCachedData()
        updateBucketCounts()
    }
    
    /// Ensure a single notification (e.g. from tap) is in the list by reading from disk; list will update automatically later.
    func ensureNotificationLoadedFromDisk(id: String) {
        if notifications.contains(where: { $0.notification.id == id }) { return }
        let cache = dataStore.getCacheFromDisk()
        guard let cached = cache.notifications.first(where: { $0.id == id }) else { return }
        let notification = WidgetNotification(
            id: cached.id,
            title: cached.title,
            body: cached.body,
            subtitle: cached.subtitle,
            createdAt: cached.createdAt,
            isRead: cached.isRead,
            bucketId: cached.bucketId,
            bucketName: cached.bucketName,
            bucketColor: cached.bucketColor,
            bucketIconUrl: cached.bucketIconUrl,
            attachments: cached.attachments.map { WidgetAttachment(mediaType: $0.mediaType, url: $0.url, name: $0.name) },
            actions: cached.actions.map { NotificationAction(type: $0.type, label: $0.label, value: $0.value, id: $0.id, url: $0.url, bucketId: $0.bucketId, minutes: $0.minutes) }
        )
        var list = notifications
        list.insert(NotificationData(notification: notification), at: 0)
        list.sort { a, b in
            if a.notification.isRead != b.notification.isRead { return !a.notification.isRead && b.notification.isRead }
            return a.notification.createdAtDate > b.notification.createdAtDate
        }
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(list.prefix(maxLimit))
        unreadCount = notifications.filter { !$0.notification.isRead }.count
        updateBucketCounts()
    }
    
    private func loadCachedData() {
        let cache = dataStore.loadCache()
        
        // Convert cached notifications to NotificationData
        let mappedNotifications = cache.notifications.map { cached in
            let notification = WidgetNotification(
                id: cached.id,
                title: cached.title,
                body: cached.body,
                subtitle: cached.subtitle,
                createdAt: cached.createdAt,
                isRead: cached.isRead,
                bucketId: cached.bucketId,
                bucketName: cached.bucketName,
                bucketColor: cached.bucketColor,
                bucketIconUrl: cached.bucketIconUrl,
                attachments: cached.attachments.map { WidgetAttachment(mediaType: $0.mediaType, url: $0.url, name: $0.name) },
                actions: cached.actions.map { NotificationAction(type: $0.type, label: $0.label, value: $0.value, id: $0.id, url: $0.url, bucketId: $0.bucketId, minutes: $0.minutes) }
            )
            return NotificationData(notification: notification)
        }
        
        // Apply maximum notifications limit (keep only the N most recent by createdAt)
        // Then sort for display (unread first, then newest first).
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        let totalAvailable = mappedNotifications.count

        let mostRecent = mappedNotifications
            .sorted { $0.notification.createdAtDate > $1.notification.createdAtDate }

        let limited = Array(mostRecent.prefix(maxLimit))

        let displaySorted = limited.sorted { a, b in
            if a.notification.isRead != b.notification.isRead {
                return !a.notification.isRead && b.notification.isRead
            }
            return a.notification.createdAtDate > b.notification.createdAtDate
        }

        notifications = displaySorted
        if totalAvailable > maxLimit {
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "WatchConnectivity",
                message: "Applied notifications display limit",
                metadata: [
                    "totalAvailable": "\(totalAvailable)",
                    "displayLimit": "\(maxLimit)",
                    "displayed": "\(notifications.count)"
                ],
                source: "Watch"
            )
        }
        
        // Convert cached buckets to BucketItem
        buckets = cache.buckets.map { cached in
            BucketItem(
                id: cached.id,
                name: cached.name,
                unreadCount: cached.unreadCount,
                totalCount: 0,
                color: cached.color,
                iconUrl: cached.iconUrl,
                lastNotificationDate: nil
            )
        }
        
        unreadCount = cache.unreadCount
        lastUpdate = cache.lastUpdate
    }
    
    func fetchDataFromCloudKit() {
        DispatchQueue.main.async {
            self.isWaitingForResponse = true
            self.isConnected = true
        }
        
        let group = DispatchGroup()
        var fetchedNotifications: [[String: Any]] = []
        var fetchedBuckets: [[String: Any]] = []
        var fetchError: Error?
        
        // Fetch notifications
        group.enter()
        // Check if CloudKit is enabled before fetching
        guard WatchCloudKit.shared.isCloudKitEnabled else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit is disabled, skipping fetch", source: "Watch")
            group.leave()
            return
        }

        WatchCloudKit.shared.fetchAllNotificationsFromCloudKit { notifications, error in
            if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching notifications from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
                fetchError = error
                    } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched notifications from CloudKit", metadata: ["count": "\(notifications.count)"], source: "Watch")
                fetchedNotifications = notifications
            }
            group.leave()
        }
        
        // Fetch buckets
        group.enter()
        // Check if CloudKit is enabled before fetching
        guard WatchCloudKit.shared.isCloudKitEnabled else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit is disabled, skipping fetch", source: "Watch")
            group.leave()
            return
        }

        WatchCloudKit.shared.fetchAllBucketsFromCloudKit { buckets, error in
        if let error = error {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching buckets from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
                fetchError = error
        } else {
                LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Fetched buckets from CloudKit", metadata: ["count": "\(buckets.count)"], source: "Watch")
                fetchedBuckets = buckets
            }
            group.leave()
        }
        
        group.notify(queue: .main) {
            if let error = fetchError {
                LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Error fetching data from CloudKit", metadata: ["error": error.localizedDescription], source: "Watch")
                self.isWaitingForResponse = false
            return
        }
        
            // Create a lookup map for buckets by ID
            var bucketMap: [String: [String: Any]] = [:]
            for bucket in fetchedBuckets {
                if let bucketId = bucket["id"] as? String {
                    bucketMap[bucketId] = bucket
                }
            }
            
            // Enrich notifications with bucket information
            let enrichedNotifications = fetchedNotifications.map { notification -> [String: Any] in
                var enriched = notification
                if let bucketId = notification["bucketId"] as? String,
                   let bucket = bucketMap[bucketId] {
                    // Add bucket information to notification
                    enriched["bucketName"] = bucket["name"] as? String
                    enriched["bucketColor"] = bucket["color"] as? String
                    enriched["bucketIconUrl"] = bucket["iconUrl"] as? String
                }
                return enriched
            }
            
            // Calculate unread count
            let unreadCount = enrichedNotifications.filter { ($0["isRead"] as? Bool) == false }.count
            
            // Update WatchDataStore
            self.dataStore.updateFromiPhone(
                notifications: enrichedNotifications,
                buckets: fetchedBuckets,
                        unreadCount: unreadCount
                    )
            
            // Reload from cache and update UI (already on main thread from group.notify)
            self.loadCachedData()
            self.updateBucketCounts()
            self.lastUpdate = Date()
            self.isWaitingForResponse = false
                            
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Data fetched and cached successfully", metadata: ["notifications": "\(enrichedNotifications.count)", "buckets": "\(fetchedBuckets.count)", "unread": "\(unreadCount)"], source: "Watch")
        }
    }
    
    private func updateBucketCounts() {
        // Calculate notification counts per bucket
        var bucketCounts: [String: (total: Int, unread: Int)] = [:]
        var bucketLastDates: [String: Date] = [:]
        
        for notificationData in notifications {
            let bucketId = notificationData.notification.bucketId
            let isRead = notificationData.notification.isRead
            
            if bucketCounts[bucketId] == nil {
                bucketCounts[bucketId] = (total: 0, unread: 0)
            }
            
            bucketCounts[bucketId]?.total += 1
            if !isRead {
                bucketCounts[bucketId]?.unread += 1
            }
            
            // Track last notification date per bucket
            let createdAt = notificationData.notification.createdAtDate
            if let existingDate = bucketLastDates[bucketId] {
                if createdAt > existingDate {
                    bucketLastDates[bucketId] = createdAt
                }
                } else {
                bucketLastDates[bucketId] = createdAt
            }
        }
        
        // Update buckets with counts
        buckets = buckets.map { bucket in
            let counts = bucketCounts[bucket.id] ?? (total: 0, unread: 0)
            return BucketItem(
                id: bucket.id,
                name: bucket.name,
                unreadCount: counts.unread,
                totalCount: counts.total,
                color: bucket.color,
                iconUrl: bucket.iconUrl,
                lastNotificationDate: bucketLastDates[bucket.id]
            )
        }
    }
    
    /// Request incremental refresh (used by UI refresh button)
    func requestFullRefresh() {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Incremental refresh requested", source: "Watch")
        
        // Perform incremental sync in background without blocking UI
        // Check if CloudKit is enabled before syncing
        guard WatchCloudKit.shared.isCloudKitEnabled else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit is disabled, skipping sync", source: "Watch")
            return
        }
        
        // Use incremental sync (not full sync)
        performIncrementalSync()
    }
    
    /// Request full sync (used by settings button)
    func requestFullSync() {
        LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "Full sync requested from settings", source: "Watch")
        
        // Perform full sync in background without blocking UI
        // Check if CloudKit is enabled before syncing
        guard WatchCloudKit.shared.isCloudKitEnabled else {
            LoggingSystem.shared.log(level: "INFO", tag: "CloudKit", message: "CloudKit is disabled, skipping full sync", source: "Watch")
            return
        }
        
        DispatchQueue.main.async { [weak self] in
            self?.isFullSyncing = true
        }
        requestSync(fullSync: true)
    }

    // MARK: - Watch REST helpers (using watch token settings)

    private func buildApiBaseWithPrefix(from serverAddress: String) -> String {
        let trimmed = serverAddress.trimmingCharacters(in: .whitespacesAndNewlines)
        let base = trimmed.replacingOccurrences(of: "/$", with: "", options: .regularExpression)

        // If user already includes /api/v1, don't double-append.
        if base.hasSuffix("/api/v1") {
            return base
        }
        return base + "/api/v1"
    }

    private func makeWatchApiRequest(
        path: String,
        method: String,
        jsonBody: [String: Any]? = nil
    ) -> URLRequest? {
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
            if let data = try? JSONSerialization.data(withJSONObject: jsonBody) {
                request.httpBody = data
            }
        }

        return request
    }

    private func performWatchApiRequest(
        path: String,
        method: String,
        jsonBody: [String: Any]? = nil,
        completion: @escaping (Bool) -> Void
    ) {
        guard let request = makeWatchApiRequest(path: path, method: method, jsonBody: jsonBody) else {
            // Missing watch settings is not an error condition for CloudKit sync.
            // It simply means watch-scoped REST actions are currently unavailable.
            LoggingSystem.shared.log(level: "INFO", tag: "WatchREST", message: "Missing watch token/serverAddress; skipping REST call", metadata: ["path": path, "method": method], source: "Watch")
            completion(false)
            return
        }

        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error {
                LoggingSystem.shared.log(level: "ERROR", tag: "WatchREST", message: "REST call failed", metadata: ["path": path, "error": error.localizedDescription], source: "Watch")
                completion(false)
                return
            }

            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            if status >= 200 && status < 300 {
                completion(true)
            } else {
                // REST is best-effort from watch. Backend may have already cleaned up notifications.
                // Treat common idempotent statuses as success to avoid noisy logs and blocking follow-up.
                if status == 404 || status == 410 {
                    LoggingSystem.shared.log(
                        level: "INFO",
                        tag: "WatchREST",
                        message: "REST resource missing; treating as success",
                        metadata: ["path": path, "status": "\(status)", "method": method],
                        source: "Watch"
                    )
                    completion(true)
                } else {
                    LoggingSystem.shared.log(level: "WARN", tag: "WatchREST", message: "REST call returned HTTP error", metadata: ["path": path, "status": "\(status)", "method": method], source: "Watch")
                    completion(false)
                }
            }
        }.resume()
    }

    private func ensureFilledToMaxLimit(reason: String) {
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        guard notifications.count < maxLimit else { return }

        topUpQueue.async { [weak self] in
            guard let self = self else { return }
            if self.topUpInFlight { return }
            self.topUpInFlight = true

            WatchCloudKit.shared.fetchLatestNotificationsFromCloudKit(limit: maxLimit) { notifications, error in
                if let error {
                    LoggingSystem.shared.log(level: "ERROR", tag: "CloudKit", message: "Top-up fetch failed", metadata: ["error": error.localizedDescription, "reason": reason], source: "Watch")
                    self.topUpQueue.async { self.topUpInFlight = false }
                    return
                }

                self.dataStore.replaceNotificationsFromCloudKit(notifications: notifications)
                DispatchQueue.main.async { [weak self] in
                    self?.scheduleUIRefresh(reason: "topUp(\(reason))", debounceInterval: self?.uiRefreshFastDebounceInterval)
                }

                self.topUpQueue.async { self.topUpInFlight = false }
            }
        }
    }
    
    func markNotificationAsReadFromWatch(id: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Mark notification as read requested", metadata: ["notificationId": id], source: "Watch")

        // Update UI state immediately (avoid disk IO + heavy reload on main thread)
        let wasRead = notifications.first(where: { $0.notification.id == id })?.notification.isRead ?? true
        if !wasRead {
            unreadCount = max(0, unreadCount - 1)
        }
        notifications = notifications.map { item in
            guard item.notification.id == id else { return item }
            let n = item.notification
            let updated = WidgetNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                subtitle: n.subtitle,
                createdAt: n.createdAt,
                isRead: true,
                bucketId: n.bucketId,
                bucketName: n.bucketName,
                bucketColor: n.bucketColor,
                bucketIconUrl: n.bucketIconUrl,
                attachments: n.attachments,
                actions: n.actions
            )
            return NotificationData(notification: updated)
        }

        // Re-apply sort + limit (list is small on watch)
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(
            notifications
                .sorted { a, b in
                    if a.notification.isRead != b.notification.isRead {
                        return !a.notification.isRead && b.notification.isRead
                    }
                    return a.notification.createdAtDate > b.notification.createdAtDate
                }
                .prefix(maxLimit)
        )
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.setNotificationReadStatus(id: id, isRead: true)
        }

        // Best-effort remote updates (REST + CloudKit) via shared handler
        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "MARK_AS_READ", notificationId: id)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "MARK_AS_READ"],
                source: "Watch"
            )
            self?.performIncrementalSync()
        }
    }
    
    func markMultipleNotificationsAsReadFromWatch(ids: [String]) {
        guard !ids.isEmpty else { return }

        // Update UI state immediately
        let idSet = Set(ids)
        let previouslyUnread = notifications.filter { idSet.contains($0.notification.id) && !$0.notification.isRead }.count
        if previouslyUnread > 0 {
            unreadCount = max(0, unreadCount - previouslyUnread)
        }
        notifications = notifications.map { item in
            guard idSet.contains(item.notification.id) else { return item }
            let n = item.notification
            if n.isRead { return item }
            let updated = WidgetNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                subtitle: n.subtitle,
                createdAt: n.createdAt,
                isRead: true,
                bucketId: n.bucketId,
                bucketName: n.bucketName,
                bucketColor: n.bucketColor,
                bucketIconUrl: n.bucketIconUrl,
                attachments: n.attachments,
                actions: n.actions
            )
            return NotificationData(notification: updated)
        }

        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(
            notifications
                .sorted { a, b in
                    if a.notification.isRead != b.notification.isRead {
                        return !a.notification.isRead && b.notification.isRead
                    }
                    return a.notification.createdAtDate > b.notification.createdAtDate
                }
                .prefix(maxLimit)
        )
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.setNotificationsReadStatus(ids: ids, isRead: true)
        }

        // Best-effort remote updates (REST + CloudKit) via shared handler (batch)
        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdatesBatch(actionType: "MARK_AS_READ", notificationIds: ids)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["count": "\(ids.count)", "type": "MARK_AS_READ"],
                source: "Watch"
            )
            await MainActor.run {
                self?.performIncrementalSync()
            }
        }
    }

    /// Execute a notification action from the Watch UI.
    /// WC is NOT used for actions; only REST (WATCH scope) is used.
    func executeNotificationAction(notificationId: String, action: NotificationAction) {
        let actionType = action.type.uppercased()
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Execute action requested", metadata: ["notificationId": notificationId, "type": actionType], source: "Watch")

        func extractMinutes(from action: NotificationAction) -> Int? {
            if let minutes = action.minutes { return minutes }
            if let value = action.value, let minutes = Int(value.trimmingCharacters(in: .whitespacesAndNewlines)) {
                return minutes
            }
            return nil
        }

        switch actionType {
        case "MARK_AS_READ":
            markNotificationAsReadFromWatch(id: notificationId)
            return
        case "MARK_AS_UNREAD":
            markNotificationAsUnreadFromWatch(id: notificationId)
            return
        case "DELETE":
            deleteNotificationFromWatch(id: notificationId)
            return
        case "POSTPONE":
            if let minutes = extractMinutes(from: action) {
                postponeNotificationFromWatch(id: notificationId, minutes: minutes)
                return
            }
            break
        case "SNOOZE":
            if let minutes = extractMinutes(from: action) {
                let bucketId = action.bucketId ?? notifications.first(where: { $0.notification.id == notificationId })?.notification.bucketId
                if let bucketId {
                    snoozeBucketFromWatch(bucketId: bucketId, minutes: minutes)
                    return
                }
            }
            break
        case "WEBHOOK":
            if let webhookId = action.value?.trimmingCharacters(in: .whitespacesAndNewlines), !webhookId.isEmpty {
                executeWebhookFromWatch(webhookId: webhookId)
                return
            }
            break
        case "BACKGROUND_CALL":
            let raw = (action.value ?? "").trimmingCharacters(in: .whitespacesAndNewlines)

            // Supported formats:
            // 1) url is provided explicitly (action.url) and action.value is the HTTP method (or empty)
            // 2) action.value contains "METHOD::URL"
            // 3) action.value is a URL (defaults to GET)
            let explicitUrl = action.url?.trimmingCharacters(in: .whitespacesAndNewlines)
            if let explicitUrl, !explicitUrl.isEmpty {
                let method = (raw.isEmpty ? "GET" : raw).uppercased()
                executeBackgroundCallFromWatch(method: method, url: explicitUrl)
                return
            }

            if raw.contains("::") {
                let parts = raw.components(separatedBy: "::")
                if parts.count >= 2 {
                    let method = parts[0].trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
                    let url = parts[1].trimmingCharacters(in: .whitespacesAndNewlines)
                    if !method.isEmpty, !url.isEmpty {
                        executeBackgroundCallFromWatch(method: method, url: url)
                        return
                    }
                }
            }

            if raw.lowercased().hasPrefix("http://") || raw.lowercased().hasPrefix("https://") {
                executeBackgroundCallFromWatch(method: "GET", url: raw)
                return
            }
            break
        default:
            break
        }

        LoggingSystem.shared.log(
            level: "WARN",
            tag: "WatchAction",
            message: "Action not supported or missing required data",
            metadata: ["notificationId": notificationId, "type": actionType],
            source: "Watch"
        )
    }

    private func snoozeBucketFromWatch(bucketId: String, minutes: Int) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Snooze bucket requested", metadata: ["bucketId": bucketId, "minutes": "\(minutes)"], source: "Watch")
        performWatchApiRequest(
            path: "/buckets/\(bucketId)/snooze-minutes",
            method: "POST",
            jsonBody: ["minutes": minutes]
        ) { success in
            LoggingSystem.shared.log(
                level: success ? "INFO" : "WARN",
                tag: "WatchREST",
                message: success ? "Snooze executed via REST" : "Snooze failed via REST",
                metadata: ["bucketId": bucketId, "minutes": "\(minutes)"],
                source: "Watch"
            )
        }
    }

    private func executeWebhookFromWatch(webhookId: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Execute webhook requested", metadata: ["webhookId": webhookId], source: "Watch")
        performWatchApiRequest(path: "/webhooks/\(webhookId)/execute", method: "POST") { success in
            LoggingSystem.shared.log(
                level: success ? "INFO" : "WARN",
                tag: "WatchREST",
                message: success ? "Webhook executed via REST" : "Webhook execution failed via REST",
                metadata: ["webhookId": webhookId],
                source: "Watch"
            )
        }
    }

    private func executeBackgroundCallFromWatch(method: String, url: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Background call requested", metadata: ["method": method, "url": url], source: "Watch")
        guard let target = URL(string: url) else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchAction", message: "Invalid background call URL", metadata: ["url": url], source: "Watch")
            return
        }

        var request = URLRequest(url: target)
        request.httpMethod = method
        URLSession.shared.dataTask(with: request) { _, response, error in
            if let error {
                LoggingSystem.shared.log(level: "WARN", tag: "WatchREST", message: "Background call failed", metadata: ["method": method, "url": url, "error": error.localizedDescription], source: "Watch")
                return
            }
            let status = (response as? HTTPURLResponse)?.statusCode ?? -1
            if status >= 200 && status < 300 {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchREST", message: "Background call ok", metadata: ["method": method, "url": url, "status": "\(status)"], source: "Watch")
            } else {
                LoggingSystem.shared.log(level: "WARN", tag: "WatchREST", message: "Background call HTTP error", metadata: ["method": method, "url": url, "status": "\(status)"], source: "Watch")
            }
        }.resume()
    }
    
    func markNotificationAsUnreadFromWatch(id: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Mark notification as unread requested", metadata: ["notificationId": id], source: "Watch")

        // Update UI state immediately
        let wasRead = notifications.first(where: { $0.notification.id == id })?.notification.isRead ?? false
        if wasRead {
            unreadCount += 1
        }
        notifications = notifications.map { item in
            guard item.notification.id == id else { return item }
            let n = item.notification
            let updated = WidgetNotification(
                id: n.id,
                title: n.title,
                body: n.body,
                subtitle: n.subtitle,
                createdAt: n.createdAt,
                isRead: false,
                bucketId: n.bucketId,
                bucketName: n.bucketName,
                bucketColor: n.bucketColor,
                bucketIconUrl: n.bucketIconUrl,
                attachments: n.attachments,
                actions: n.actions
            )
            return NotificationData(notification: updated)
        }

        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        notifications = Array(
            notifications
                .sorted { a, b in
                    if a.notification.isRead != b.notification.isRead {
                        return !a.notification.isRead && b.notification.isRead
                    }
                    return a.notification.createdAtDate > b.notification.createdAtDate
                }
                .prefix(maxLimit)
        )
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.setNotificationReadStatus(id: id, isRead: false)
        }

        // Best-effort remote updates (REST + CloudKit) via shared handler
        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "MARK_AS_UNREAD", notificationId: id)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "MARK_AS_UNREAD"],
                source: "Watch"
            )
            self?.performIncrementalSync()
        }
    }

    private func postponeNotificationFromWatch(id: String, minutes: Int) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Postpone requested", metadata: ["notificationId": id, "minutes": "\(minutes)"], source: "Watch")

        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "POSTPONE", notificationId: id, minutes: minutes)
            LoggingSystem.shared.log(
                level: results.contains(where: { !$0.success }) ? "WARN" : "INFO",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: ["notificationId": id, "type": "POSTPONE", "minutes": "\(minutes)"],
                source: "Watch"
            )
            await MainActor.run {
                self?.performIncrementalSync()
            }
        }
    }
    
    func deleteNotificationFromWatch(id: String) {
        LoggingSystem.shared.log(level: "INFO", tag: "WatchAction", message: "Delete notification requested", metadata: ["notificationId": id], source: "Watch")

        // Update UI state immediately
        let wasUnread = notifications.first(where: { $0.notification.id == id }).map { !$0.notification.isRead } ?? false
        notifications.removeAll { $0.notification.id == id }
        if wasUnread {
            unreadCount = max(0, unreadCount - 1)
        }
        updateBucketCounts()

        // Persist cache update off the main thread (record-level)
        DispatchQueue.global(qos: .utility).async { [weak self] in
            self?.dataStore.deleteNotificationFromCache(id: id)
        }

        Task { [weak self] in
            let results = await NotificationActionHandler.executeWatchRemoteUpdates(actionType: "DELETE", notificationId: id)
            let failed = results.filter { !$0.success }
            var metadata: [String: String] = ["notificationId": id, "type": "DELETE"]
            if !failed.isEmpty {
                let errors = failed.map { "\($0.name): \($0.errorDescription ?? "unknown")" }.joined(separator: "; ")
                metadata["errors"] = errors
            }
            LoggingSystem.shared.log(
                level: failed.isEmpty ? "INFO" : "WARN",
                tag: "WatchAction",
                message: "Remote updates completed (best-effort)",
                metadata: metadata,
                source: "Watch"
            )
            await MainActor.run {
                self?.performIncrementalSync()
                self?.ensureFilledToMaxLimit(reason: "delete")
            }
        }
    }

    /// Manually send Watch logs to iPhone (invoked by LogsView button).
    /// Uses `sendMessage` with batching, therefore requires iPhone to be reachable.
    func sendLogsToiPhone(completion: @escaping (Bool, String?) -> Void) {
        guard let session = wcSession else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchConnectivity", message: "WCSession not available, cannot send logs", source: "Watch")
            completion(false, "WCSession not available")
            return
        }

        // Ensure buffered logs are persisted before reading
        LoggingSystem.shared.flushLogs()

        guard session.isReachable else {
            LoggingSystem.shared.log(level: "WARN", tag: "WatchConnectivity", message: "iPhone not reachable, cannot send logs", source: "Watch")
            completion(false, "iPhone not reachable")
            return
        }

        let allLogs = LoggingSystem.shared.readLogs()
        guard !allLogs.isEmpty else {
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "No logs to send", source: "Watch")
            completion(true, nil)
            return
        }

        // Keep payload bounded to avoid WatchConnectivity message limits.
        let maxLogsToSend = 2000
        let logsToSend = Array(allLogs.prefix(maxLogsToSend))

        let logsData: [[String: Any]] = logsToSend.map { entry in
            var dict: [String: Any] = [
                "id": entry.id,
                "level": entry.level,
                "message": entry.message,
                "timestamp": entry.timestamp,
                "source": entry.source
            ]
            if let tag = entry.tag {
                dict["tag"] = tag
            }
            if let metadata = entry.metadata {
                dict["metadata"] = metadata
            }
            return dict
        }

        let batchSize = 50
        let totalBatches = Int(ceil(Double(logsData.count) / Double(batchSize)))
        var currentBatch = 0
        var didComplete = false

        if allLogs.count > maxLogsToSend {
            LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Trimming logs for transfer", metadata: ["totalLogs": "\(allLogs.count)", "sending": "\(maxLogsToSend)"], source: "Watch")
        }

        LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Sending logs to iPhone", metadata: ["logs": "\(logsData.count)", "batchSize": "\(batchSize)", "totalBatches": "\(totalBatches)"], source: "Watch")

        func finish(_ success: Bool, _ error: String?) {
            guard !didComplete else { return }
            didComplete = true
            completion(success, error)
        }

        func sendNextBatch() {
            if currentBatch >= totalBatches {
                LoggingSystem.shared.log(level: "INFO", tag: "WatchConnectivity", message: "Finished sending logs to iPhone", metadata: ["totalBatches": "\(totalBatches)", "logs": "\(logsData.count)"], source: "Watch")
                finish(true, nil)
                return
            }

            let startIndex = currentBatch * batchSize
            let endIndex = min(startIndex + batchSize, logsData.count)
            let batch = Array(logsData[startIndex..<endIndex])

            let message: [String: Any] = [
                "type": "watchLogs",
                "logs": batch,
                "batchIndex": currentBatch,
                "totalBatches": totalBatches,
                "count": batch.count,
                "isLastBatch": currentBatch == totalBatches - 1
            ]

            session.sendMessage(message, replyHandler: { reply in
                if let success = reply["success"] as? Bool, success {
                    currentBatch += 1
                    // Small delay between batches to avoid overwhelming the link
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) {
                        sendNextBatch()
                    }
                } else {
                    let errorMsg = reply["error"] as? String ?? "Unknown error"
                    LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Failed to send logs batch", metadata: ["batch": "\(currentBatch + 1)/\(totalBatches)", "error": errorMsg], source: "Watch")
                    finish(false, errorMsg)
                }
            }, errorHandler: { error in
                LoggingSystem.shared.log(level: "ERROR", tag: "WatchConnectivity", message: "Error sending logs batch", metadata: ["batch": "\(currentBatch + 1)/\(totalBatches)", "error": error.localizedDescription], source: "Watch")
                finish(false, error.localizedDescription)
            })
        }

        sendNextBatch()
    }
}
