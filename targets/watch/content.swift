import SwiftUI
import ImageIO
import WatchKit
import CloudKit

// MARK: - Watch Settings Manager

/// Manages Watch-specific settings stored in UserDefaults
class WatchSettingsManager {
    static let shared = WatchSettingsManager()
    
    private let maxNotificationsLimitKey = "watch_max_notifications_limit"
    
    private init() {}
    
    /// Get maximum number of notifications to display (default: 100)
    var maxNotificationsLimit: Int {
        let value = UserDefaults.standard.integer(forKey: maxNotificationsLimitKey)
        return value > 0 ? value : 100 // Default to 100 if not set
    }
    
    /// Set maximum number of notifications to display
    func setMaxNotificationsLimit(_ limit: Int) {
        UserDefaults.standard.set(limit, forKey: maxNotificationsLimitKey)
        UserDefaults.standard.synchronize()
    }
}

// MARK: - Global Bucket Icon Cache

/// Global cache for loaded bucket icons shared across all views
/// This cache is managed ONLY by BucketMenuView (root component)
/// Child components MUST NOT load icons directly - they receive icons from parent
class BucketIconCache: ObservableObject {
    static let shared = BucketIconCache()
    
    /// Cache for loaded bucket icons (bucketId -> UIImage)
    /// Icons are loaded once by root component and reused everywhere
    @Published private(set) var bucketIcons: [String: UIImage] = [:]
    
    /// Track which buckets have been logged (to avoid duplicate logs)
    private var loggedBuckets = Set<String>()
    
    private init() {}
    
    /// Get icon for bucket ID
    func getIcon(bucketId: String) -> UIImage? {
        return bucketIcons[bucketId]
    }
    
    /// Load and cache icon for bucket (ONLY called by root component)
    func loadIcon(bucketId: String, bucketName: String, bucketColor: String?, iconUrl: String?) {
        // Skip if already loaded
        if bucketIcons[bucketId] != nil {
            return
        }
        
        // Try to get icon from MediaAccess
        if let iconData = MediaAccess.getBucketIconFromSharedCache(
            bucketId: bucketId,
            bucketName: bucketName,
            bucketColor: bucketColor,
            iconUrl: iconUrl
        ), let image = UIImage(data: iconData) {
            bucketIcons[bucketId] = image
        }
    }
    
    /// Check if bucket has been logged
    func hasBeenLogged(_ bucketId: String) -> Bool {
        return loggedBuckets.contains(bucketId)
    }
    
    /// Mark bucket as logged
    func markAsLogged(_ bucketId: String) {
        loggedBuckets.insert(bucketId)
    }
    
    /// Clear cache (useful for memory pressure or debugging)
    func clearCache() {
        bucketIcons.removeAll()
        loggedBuckets.removeAll()
    }
}

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @StateObject private var iconCache = BucketIconCache.shared
    @State private var isInitialLoad: Bool = true
    @State private var lastFetchTime: Date?
    @Environment(\.scenePhase) private var scenePhase
    
    var body: some View {
        BucketMenuView(
            buckets: connectivityManager.buckets,
            totalUnreadCount: connectivityManager.unreadCount,
            totalNotificationsCount: connectivityManager.notifications.count,
            isLoading: connectivityManager.isWaitingForResponse,
            isInitialLoad: isInitialLoad,
            isConnected: connectivityManager.isConnected,
            lastUpdate: connectivityManager.lastUpdate,
            hasCache: !connectivityManager.notifications.isEmpty,
            onRefresh: requestFullRefresh,
            connectivityManager: connectivityManager
        )
        .environmentObject(iconCache)
        .environmentObject(connectivityManager)
        .onAppear {
            // Clear icon cache on app open to ensure fresh icons
            iconCache.clearCache()
            
            // Data is alreadmy loaded from cache in WatchConnectivityManager init
            // No need to fetch - just mark as loaded
            print("⌚ [ContentView] 📱 App opened - data loaded from cache")
            isInitialLoad = false
            lastFetchTime = Date()
        }
        .onChange(of: scenePhase) { oldPhase, newPhase in
            // Detect when app transitions from background to active (foreground)
            if oldPhase == .background && newPhase == .active {
                print("⌚ [ContentView] 📱→⌚ App returned to foreground from background")
                checkAndRefreshIfNeeded()
            } else if newPhase == .active && oldPhase != .background {
                // App opened for the first time or from inactive state
                print("⌚ [ContentView] 📱→⌚ App became active")
                checkAndRefreshIfNeeded()
            } else if newPhase == .background {
                // App going to background - send logs to iPhone
                print("⌚ [ContentView] 📴 App going to background - sending logs to iPhone")
                connectivityManager.sendLogsToiPhone { success, error in
                    if success {
                        print("⌚ [ContentView] ✅ Logs sent successfully")
                    } else {
                        print("⌚ [ContentView] ⚠️ Failed to send logs: \(error ?? "Unknown error")")
                    }
                }
            }
        }
    }
    
    /**
     * Request FULL refresh from iPhone when user taps refresh button
     * Uses WatchConnectivity to request data from iPhone app
     */
    private func requestFullRefresh() {
        lastFetchTime = Date()
        connectivityManager.requestFullRefresh()
        isInitialLoad = false
    }
    
    /**
     * Check if last refresh was more than 30 minutes ago and auto-refresh if needed
     * Uses incremental sync only - full sync is only done during initialization or manual refresh
     */
    private func checkAndRefreshIfNeeded() {
        guard let lastUpdate = connectivityManager.lastUpdate else {
            // No previous update - check if initial sync has been completed
            // If not, let initialization handle it. Otherwise, do incremental sync
            let initialSyncCompleted = UserDefaults.standard.bool(forKey: CloudKitManager.cloudKitInitialSyncCompletedKey)
            if initialSyncCompleted {
                print("⌚ [ContentView] 🔄 No previous update found but initial sync completed - triggering incremental sync")
                connectivityManager.syncFromCloudKitIncremental()
            } else {
                print("⌚ [ContentView] ⏳ No previous update found and initial sync not completed - waiting for initialization")
            }
            return
        }
        
        let thirtyMinutesAgo = Date().addingTimeInterval(-30 * 60)
        
        if lastUpdate < thirtyMinutesAgo {
            let minutesAgo = Int(-lastUpdate.timeIntervalSinceNow / 60)
            print("⌚ [ContentView] 🔄 Last update was \(minutesAgo) minutes ago - triggering incremental sync")
            
            LoggingSystem.shared.log(
                level: "INFO",
                tag: "autoRefresh",
                message: "Auto-refresh triggered: Last update exceeded 30 minutes threshold - using incremental sync",
                metadata: [
                    "minutesAgo": "\(minutesAgo)",
                    "lastUpdate": ISO8601DateFormatter().string(from: lastUpdate)
                ],
                source: "Watch"
            )
            
            // Use incremental sync instead of full sync
            connectivityManager.syncFromCloudKitIncremental()
        } else {
            let minutesAgo = Int(-lastUpdate.timeIntervalSinceNow / 60)
            print("⌚ [ContentView] ✅ Last update was \(minutesAgo) minutes ago - using cached data")
        }
    }
}

struct BucketItem: Identifiable, Equatable {
    let id: String
    let name: String
    let unreadCount: Int
    let totalCount: Int
    let color: String?
    let iconUrl: String?
    let lastNotificationDate: Date?
    
    static func == (lhs: BucketItem, rhs: BucketItem) -> Bool {
        return lhs.id == rhs.id &&
               lhs.name == rhs.name &&
               lhs.unreadCount == rhs.unreadCount &&
               lhs.totalCount == rhs.totalCount &&
               lhs.color == rhs.color &&
               lhs.iconUrl == rhs.iconUrl
    }
}

struct NotificationData: Identifiable, Equatable {
    var id: String { notification.id }
    let notification: WidgetNotification
    
    static func == (lhs: NotificationData, rhs: NotificationData) -> Bool {
        return lhs.notification.id == rhs.notification.id &&
               lhs.notification.isRead == rhs.notification.isRead
    }
}

struct BucketMenuView: View {
    let buckets: [BucketItem]
    let totalUnreadCount: Int
    let totalNotificationsCount: Int
    let isLoading: Bool
    let isInitialLoad: Bool
    let isConnected: Bool
    let lastUpdate: Date?
    let hasCache: Bool
    let onRefresh: () -> Void
    @ObservedObject var connectivityManager: WatchConnectivityManager
    
    @EnvironmentObject var iconCache: BucketIconCache
    
    // Computed properties that react to connectivityManager changes
    private var currentBuckets: [BucketItem] {
        connectivityManager.buckets
    }
    
    private var currentTotalUnreadCount: Int {
        connectivityManager.unreadCount
    }
    
    private var currentTotalNotificationsCount: Int {
        connectivityManager.notifications.count
    }
    
    private var currentIsLoading: Bool {
        connectivityManager.isWaitingForResponse
    }
    
    private var currentIsSyncing: Bool {
        connectivityManager.isSyncing
    }
    
    private var currentIsConnected: Bool {
        connectivityManager.isConnected
    }
    
    private var currentLastUpdate: Date? {
        connectivityManager.lastUpdate
    }
    
    private var isSyncStale: Bool {
        guard let lastUpdate = currentLastUpdate else {
            return true // Never synced is considered stale
        }
        let minutesSinceUpdate = Date().timeIntervalSince(lastUpdate) / 60
        return minutesSinceUpdate > 15
    }
    
    private var currentHasCache: Bool {
        !connectivityManager.notifications.isEmpty
    }
    
    private var timeString: String {
        let formatter = DateFormatter()
        formatter.timeStyle = .short
        return formatter.string(from: Date())
    }
    
    var body: some View {
        NavigationView {
            Group {
                // Show full screen loader only on initial load with no cache
                if isInitialLoad && !currentHasCache {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Loading notifications...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !currentIsConnected && !currentHasCache {
                    VStack(spacing: 12) {
                        Image(systemName: "iphone.slash")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No data available")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Press refresh button to sync from iCloud")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        // Header with sync status
                        Section {
                            EmptyView()
                        } header: {
                            // Sync status text (no loader, just icon and text)
                            HStack {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 8))
                                    .foregroundColor(.green)
                                
                                if let lastUpdate = currentLastUpdate {
                                    Text("Synced \(timeAgo(from: lastUpdate))")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                } else {
                                    Text("Never synced")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                            }
                            .padding(.vertical, 2)
                        }
                        
                        // All notifications item
                        NavigationLink(destination: FilteredNotificationListView(bucketId: nil, bucketName: nil, bucket: nil, allBuckets: currentBuckets)) {
                            HStack(spacing: 10) {
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.blue)
                                    .frame(width: 32, height: 32)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("All Notifications")
                                        .font(.headline)
                                    Text("\(currentTotalNotificationsCount) notifications")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                                
                                if currentTotalUnreadCount > 0 {
                                    Text("\(currentTotalUnreadCount)")
                                        .font(.caption2)
                                        .fontWeight(.bold)
                                        .foregroundColor(.white)
                                        .padding(.horizontal, 6)
                                        .padding(.vertical, 2)
                                        .background(Color.red)
                                        .clipShape(Capsule())
                                }
                            }
                        }
                        .swipeActions(edge: .leading) {
                            // Swipe left: Mark all unread as read
                            if currentTotalUnreadCount > 0 {
                                Button {
                                    WKInterfaceDevice.current().play(.success)
                                    // Mark all unread notifications as read (bulk operation)
                                    let unreadIds = connectivityManager.notifications
                                        .filter { !$0.notification.isRead }
                                        .map { $0.notification.id }
                                    connectivityManager.markMultipleNotificationsAsReadFromWatch(ids: unreadIds)
                                } label: {
                                    Label("Read All", systemImage: "envelope.open.fill")
                                }
                                .tint(.green)
                            }
                        }
                        
                        // Buckets section - only show buckets with notifications
                        let bucketsWithNotifications = currentBuckets.filter { $0.unreadCount > 0 || $0.totalCount > 0 }
                        // Sort buckets: unread first, then by lastNotificationDate descending (most recent first)
                        let sortedBuckets = bucketsWithNotifications.sorted { bucket1, bucket2 in
                            // Unread buckets come first
                            let bucket1HasUnread = bucket1.unreadCount > 0
                            let bucket2HasUnread = bucket2.unreadCount > 0
                            if bucket1HasUnread != bucket2HasUnread {
                                return bucket1HasUnread && !bucket2HasUnread
                            }
                            // Then sort by lastNotificationDate descending (most recent first)
                            if let date1 = bucket1.lastNotificationDate, let date2 = bucket2.lastNotificationDate {
                                return date1 > date2
                            }
                            // If one has a date and the other doesn't, prioritize the one with a date
                            if bucket1.lastNotificationDate != nil && bucket2.lastNotificationDate == nil {
                                return true
                            }
                            if bucket1.lastNotificationDate == nil && bucket2.lastNotificationDate != nil {
                                return false
                            }
                            // If both have no date or same date, maintain original order
                            return false
                        }
                        if !sortedBuckets.isEmpty {
                            Section(header: Text("Buckets")) {
                                ForEach(sortedBuckets) { bucket in
                                    NavigationLink(destination: FilteredNotificationListView(bucketId: bucket.id, bucketName: bucket.name, bucket: bucket, allBuckets: currentBuckets)) {
                                        BucketRowView(bucket: bucket, iconImage: iconCache.getIcon(bucketId: bucket.id))
                                    }
                                    .swipeActions(edge: .leading) {
                                        // Swipe left: Mark all unread in bucket as read
                                        if bucket.unreadCount > 0 {
                                            Button {
                                                WKInterfaceDevice.current().play(.success)
                                                // Mark all unread notifications in this bucket as read (bulk operation)
                                                let unreadIds = connectivityManager.notifications
                                                    .filter { $0.notification.bucketId == bucket.id && !$0.notification.isRead }
                                                    .map { $0.notification.id }
                                                connectivityManager.markMultipleNotificationsAsReadFromWatch(ids: unreadIds)
                                            } label: {
                                                Label("Read All", systemImage: "envelope.open.fill")
                                            }
                                            .tint(.green)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Zentik")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    HStack(spacing: 6) {
                        // Settings button
                        NavigationLink(destination: SettingsView()) {
                            Image(systemName: "gearshape.fill")
                                .font(.system(size: 11))
                        }
                        
                        // Refresh button with loader
                        if currentIsSyncing || currentIsLoading {
                            ProgressView()
                                .scaleEffect(0.6)
                        } else {
                            Button(action: {
                                onRefresh()
                            }) {
                                Image(systemName: "arrow.clockwise")
                                    .font(.system(size: 11))
                                    .foregroundColor(isSyncStale ? .orange : .primary)
                            }
                            .disabled(currentIsSyncing || currentIsLoading) // Disabled during sync
                        }
                    }
                }
            }
            .onAppear {
                loadAllIcons()
            }
            .onChange(of: currentBuckets) { _ in
                loadAllIcons()
            }
            .onChange(of: connectivityManager.notifications) { _ in
                loadAllIcons()
            }
        }
    }
    
    private func timeAgo(from date: Date) -> String {
        let seconds = Int(Date().timeIntervalSince(date))
        
        if seconds < 60 {
            return "now"
        } else if seconds < 3600 {
            let minutes = seconds / 60
            return "\(minutes)m"
        } else if seconds < 86400 {
            let hours = seconds / 3600
            return "\(hours)h"
        } else {
            let days = seconds / 86400
            return "\(days)d"
        }
    }
    
    /// Load ALL icons needed for UI (buckets + notifications)
    /// This is the ONLY place where icons are loaded - child components never load icons
    private func loadAllIcons() {
        // Create a lookup map for buckets by ID
        var bucketMap: [String: BucketItem] = [:]
        for bucket in currentBuckets {
            bucketMap[bucket.id] = bucket
        }
        
        // 1. Load bucket icons for buckets with notifications
        let bucketsWithNotifications = currentBuckets.filter { $0.unreadCount > 0 || $0.totalCount > 0 }
        for bucket in bucketsWithNotifications {
            iconCache.loadIcon(
                bucketId: bucket.id,
                bucketName: bucket.name,
                bucketColor: bucket.color,
                iconUrl: bucket.iconUrl
            )
        }
        
        // 2. Load icons for all notifications (some notifications may have buckets not in bucket list)
        for notificationData in connectivityManager.notifications {
            let notification = notificationData.notification
            
            // Try to get bucket info from bucketMap first, then from notification
            let bucketInfo = bucketMap[notification.bucketId]
            let bucketName = notification.bucketName ?? bucketInfo?.name
            let bucketColor = notification.bucketColor ?? bucketInfo?.color
            let bucketIconUrl = notification.bucketIconUrl ?? bucketInfo?.iconUrl
            
            // Only load icon if we have at least a bucketName or bucketInfo
            if let bucketName = bucketName {
            iconCache.loadIcon(
                bucketId: notification.bucketId,
                    bucketName: bucketName,
                    bucketColor: bucketColor,
                    iconUrl: bucketIconUrl
            )
        }
        }
    }
}

struct BucketRowView: View {
    let bucket: BucketItem
    let iconImage: UIImage?
    
    var body: some View {
        HStack(spacing: 10) {
            // Show icon if available, otherwise show colored rectangle
            if let iconImage = iconImage {
                Image(uiImage: iconImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 32, height: 32)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                RoundedRectangle(cornerRadius: 6)
                    .fill(hexColor(bucket.color) ?? Color.blue)
                    .frame(width: 32, height: 32)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(bucket.name)
                    .font(.headline)
                HStack(spacing: 4) {
                    Text("\(bucket.totalCount)")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    
                    // Show date of most recent notification
                    if let lastDate = bucket.lastNotificationDate {
                        Text("•")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(formatDate(lastDate))
                            .font(.caption2)
                            .foregroundColor(.secondary.opacity(0.8))
                    }
                }
            }
            
            Spacer()
            
            if bucket.unreadCount > 0 {
                Text("\(bucket.unreadCount)")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.red)
                    .clipShape(Capsule())
            }
        }
    }
    
    private func hexColor(_ hex: String?) -> Color? {
        guard var hex = hex else { return nil }
        hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        
        guard hex.count == 6 else { return nil }
        
        var rgb: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgb)
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
}

struct FilteredNotificationListView: View {
    let bucketId: String?
    let bucketName: String?
    let bucket: BucketItem?
    let allBuckets: [BucketItem]
    var showOnlyUnread: Bool = false
    
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var filteredNotifications: [NotificationData] = []
    @State private var isLoading: Bool = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Group {
            if filteredNotifications.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: showOnlyUnread ? "envelope.open" : "bell.slash")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary)
                    Text(showOnlyUnread ? "No unread notifications" : "No notifications")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            } else {
                List {
                    ForEach(filteredNotifications) { notificationData in
                        let notificationBucket = bucket ?? allBuckets.first(where: { $0.id == notificationData.notification.bucketId })
                        
                        NavigationLink(destination: NotificationDetailView(
                            notificationId: notificationData.notification.id,
                            bucket: notificationBucket
                        )) {
                            NotificationRowView(
                                notificationData: notificationData,
                                bucket: notificationBucket
                            )
                        }
                        .swipeActions(edge: .leading) {
                            // Swipe da sinistra: Mark as Read/Unread
                            if notificationData.notification.isRead {
                                Button {
                                    WKInterfaceDevice.current().play(.click)
                                    connectivityManager.markNotificationAsUnreadFromWatch(id: notificationData.notification.id)
                                } label: {
                                    Label("Unread", systemImage: "envelope.badge")
                                }
                                .tint(.blue)
                            } else {
                                Button {
                                    WKInterfaceDevice.current().play(.success)
                                    connectivityManager.markNotificationAsReadFromWatch(id: notificationData.notification.id)
                                } label: {
                                    Label("Read", systemImage: "envelope.open")
                                }
                                .tint(.green)
                            }
                        }
                        .swipeActions(edge: .trailing) {
                            // Swipe da destra: Delete
                            Button(role: .destructive) {
                                WKInterfaceDevice.current().play(.notification)
                                connectivityManager.deleteNotificationFromWatch(id: notificationData.notification.id)
                            } label: {
                                Label("Delete", systemImage: "trash")
                            }
                        }
                    }
                }
            }
        }
        .navigationTitle(showOnlyUnread ? "Unread" : (bucketId == nil ? "All" : (bucketName ?? "Bucket")))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                } else {
                    Button(action: {
                        // Request FULL refresh - sync happens in background, UI remains responsive
                        connectivityManager.requestFullRefresh()
                    }) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 14))
                    }
                }
            }
        }
        .onAppear {
            filterNotifications()
        }
        .onChange(of: connectivityManager.notifications) {
            filterNotifications()
        }
    }
    
    private func filterNotifications() {
        // Start with all notifications from connectivityManager (already sorted)
        var notifications = connectivityManager.notifications
        
        // Filter by bucket if specified
        if let bucketId = bucketId {
            notifications = notifications.filter { $0.notification.bucketId == bucketId }
        }
        
        // Filter only unread if specified
        if showOnlyUnread {
            notifications = notifications.filter { !$0.notification.isRead }
        }
        
        // Ensure sorting: unread first, then by createdAt descending (newest first)
        let sorted = notifications.sorted { notif1, notif2 in
            // Unread notifications come first
            if notif1.notification.isRead != notif2.notification.isRead {
                return !notif1.notification.isRead && notif2.notification.isRead
            }
            // Then sort by createdAt descending (newest first)
            let dateFormatter = ISO8601DateFormatter()
            dateFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
            if let date1 = dateFormatter.date(from: notif1.notification.createdAt),
               let date2 = dateFormatter.date(from: notif2.notification.createdAt) {
                return date1 > date2
            }
            return false
        }
        
        // Apply maximum notifications limit
        let maxLimit = WatchSettingsManager.shared.maxNotificationsLimit
        filteredNotifications = Array(sorted.prefix(maxLimit))
    }
}

struct NotificationRowView: View {
    let notificationData: NotificationData
    let bucket: BucketItem?
    
    @EnvironmentObject var iconCache: BucketIconCache
    
    var body: some View {
        HStack(spacing: 8) {
            // Show bucket icon from cache - NEVER load directly
            let bucketId = bucket?.id ?? notificationData.notification.bucketId
            if let iconImage = iconCache.getIcon(bucketId: bucketId) {
                Image(uiImage: iconImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 24, height: 24)
                    .clipShape(RoundedRectangle(cornerRadius: 4))
            } else {
                RoundedRectangle(cornerRadius: 4)
                    .fill(hexColor(bucket?.color ?? notificationData.notification.bucketColor) ?? Color.blue)
                    .frame(width: 24, height: 24)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                HStack {
                    Text(notificationData.notification.title)
                        .font(.caption)
                        .fontWeight(!notificationData.notification.isRead ? .bold : .semibold)
                        .lineLimit(2)
                    
                    if !notificationData.notification.isRead {
                        Circle()
                            .fill(Color.blue)
                            .frame(width: 6, height: 6)
                    }
                }
                
                HStack(spacing: 4) {
                Text(notificationData.notification.body)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
                    
                    if !notificationData.notification.attachments.isEmpty {
                        Spacer()
                        HStack(spacing: 2) {
                            Image(systemName: "paperclip")
                                .font(.system(size: 8))
                            Text("\(notificationData.notification.attachments.count)")
                                .font(.system(size: 8))
                        }
                        .foregroundColor(.secondary)
                    }
                }
                
                // Date/Time display
                if let formattedDate = formatNotificationDate(notificationData.notification.createdAt) {
                    Text(formattedDate)
                        .font(.system(size: 9))
                        .foregroundColor(.secondary.opacity(0.8))
                }
            }
        }
        .padding(.vertical, 4)
    }
    
    private func hexColor(_ hex: String?) -> Color? {
        guard var hex = hex else { return nil }
        hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        
        guard hex.count == 6 else { return nil }
        
        var rgb: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgb)
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
}

struct NotificationDetailView: View {
    let notificationId: String
    let bucket: BucketItem?
    
    @State private var isDeleted = false
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @EnvironmentObject var iconCache: BucketIconCache
    @Environment(\.dismiss) var dismiss
    
    // Computed property to get the latest notification data from manager
    private var notificationData: NotificationData? {
        connectivityManager.notifications.first { $0.notification.id == notificationId }
    }
    
    // Filter to only show supported attachments (IMAGE and GIF)
    private var supportedAttachments: [WidgetAttachment] {
        guard let notificationData = notificationData else { return [] }
        return notificationData.notification.attachments.filter { attachment in
            let type = attachment.mediaType.uppercased()
            return type == "IMAGE" || type == "GIF"
        }
    }
    
    // Computed property for bucket icon background color
    private var bucketIconColor: Color {
        guard let notificationData = notificationData else { return Color.blue }
        let colorHex = bucket?.color ?? notificationData.notification.bucketColor
        return hexColor(colorHex) ?? Color.blue
    }
    
    var body: some View {
        if let notificationData = notificationData {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    headerView(for: notificationData)
                    
                    Divider()
                    
                    contentView(for: notificationData)
                    
                    if !supportedAttachments.isEmpty {
                        attachmentsView(for: notificationData)
                    }
                    
                    if !notificationData.notification.watchDisplayActions.isEmpty {
                        actionsView(for: notificationData)
                    }
                }
                .padding()
            }
            .navigationTitle(bucket?.name ?? notificationData.notification.bucketName ?? "Notification")
            .navigationBarTitleDisplayMode(.inline)
            .onAppear {
                logDetailViewEntry()
            }
            .toolbar {
                toolbarContent(for: notificationData)
            }
        } else {
            notificationNotFoundView
        }
    }
    
    // MARK: - View Builders
    
    @ViewBuilder
    private func headerView(for notificationData: NotificationData) -> some View {
        HStack(spacing: 10) {
            // Show bucket icon from cache - NEVER load directly
            let bucketId = bucket?.id ?? notificationData.notification.bucketId
            if let iconImage = iconCache.getIcon(bucketId: bucketId) {
                Image(uiImage: iconImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 40, height: 40)
                    .clipShape(RoundedRectangle(cornerRadius: 8))
            } else {
                RoundedRectangle(cornerRadius: 8)
                    .fill(bucketIconColor)
                    .frame(width: 40, height: 40)
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(notificationData.notification.title)
                    .font(.headline)
                    .foregroundColor(.primary)
                
                if !notificationData.notification.isRead {
                    Text("Unread")
                        .font(.caption2)
                        .foregroundColor(.blue)
                }
            }
        }
        .padding(.bottom, 4)
    }
    
    @ViewBuilder
    private func contentView(for notificationData: NotificationData) -> some View {
        // Subtitle (if exists)
        if let subtitle = notificationData.notification.subtitle, !subtitle.isEmpty {
            Text(subtitle)
                .font(.subheadline)
                .foregroundColor(.secondary)
        }
        
        // Body
        Text(notificationData.notification.body)
            .font(.body)
    }
    
    @ViewBuilder
    private func attachmentsView(for notificationData: NotificationData) -> some View {
        Divider()
            .padding(.vertical, 4)
        
        if supportedAttachments.count == 1 {
            // Single attachment - show full size immediately
            AttachmentFullView(
                attachment: supportedAttachments[0],
                notificationId: notificationData.notification.id
            )
        } else {
            // Multiple attachments - show grid of thumbnails
            VStack(alignment: .leading, spacing: 8) {
                Text("Attachments (\(supportedAttachments.count))")
                    .font(.caption)
                    .foregroundColor(.secondary)
                
                LazyVGrid(columns: [
                    GridItem(.flexible(), spacing: 8),
                    GridItem(.flexible(), spacing: 8)
                ], spacing: 8) {
                    ForEach(Array(supportedAttachments.enumerated()), id: \.offset) { index, attachment in
                        NavigationLink(destination: AttachmentFullScreenView(
                            attachment: attachment,
                            notificationId: notificationData.notification.id
                        )) {
                            AttachmentThumbnailView(
                                attachment: attachment,
                                notificationId: notificationData.notification.id
                            )
                        }
                    }
                }
            }
        }
    }
    
    @ViewBuilder
    private func actionsView(for notificationData: NotificationData) -> some View {
        Divider()
            .padding(.vertical, 4)
        
        VStack(alignment: .leading, spacing: 8) {
            Text("Actions")
                .font(.caption)
                .foregroundColor(.secondary)
            
            ForEach(notificationData.notification.watchDisplayActions, id: \.label) { action in
                Button(action: {
                    executeAction(action)
                }) {
                    HStack {
                        Image(systemName: systemImageForAction(action.type))
                            .foregroundColor(.blue)
                        Text(action.label)
                            .font(.body)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .padding(.vertical, 8)
                    .padding(.horizontal, 12)
                    .background(Color.secondary.opacity(0.1))
                    .cornerRadius(8)
                }
                .buttonStyle(PlainButtonStyle())
            }
        }
    }
    
    @ToolbarContentBuilder
    private func toolbarContent(for notificationData: NotificationData) -> some ToolbarContent {
        ToolbarItemGroup(placement: .bottomBar) {
            // Mark as read/unread button
            Button(action: toggleReadStatus) {
                Label(notificationData.notification.isRead ? "Mark Unread" : "Mark Read",
                      systemImage: notificationData.notification.isRead ? "envelope.badge" : "envelope.open")
            }
            .disabled(isDeleted)
            
            Spacer()
            
            // Delete button
            Button(role: .destructive, action: deleteNotification) {
                Label("Delete", systemImage: "trash")
            }
            .disabled(isDeleted)
        }
    }
    
    private var notificationNotFoundView: some View {
        VStack {
            Text("Notification not available")
                .foregroundColor(.secondary)
        }
        .navigationTitle("Notification")
        .onAppear {
            // If notification is gone, go back
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                if notificationData == nil {
                    dismiss()
                }
            }
        }
    }
    
    private func logDetailViewEntry() {
        if let notificationData = notificationData {
            print("⌚ [NotificationDetailView] 📄 Entered detail view for notification: \(notificationData.notification.id)")
            print("⌚ [NotificationDetailView] 📝 Title: \(notificationData.notification.title)")
            print("⌚ [NotificationDetailView] 📖 Read status: \(notificationData.notification.isRead ? "read" : "unread")")
            print("⌚ [NotificationDetailView] 🎬 Watch display actions count: \(notificationData.notification.watchDisplayActions.count)")
            
            if notificationData.notification.watchDisplayActions.isEmpty {
                print("⌚ [NotificationDetailView] ⚠️ No actions available for this notification")
            } else {
                print("⌚ [NotificationDetailView] ✅ Actions available:")
                for (index, action) in notificationData.notification.watchDisplayActions.enumerated() {
                    print("⌚ [NotificationDetailView]   \(index + 1). \(action.label) (type: \(action.type))")
                }
            }
            
            print("⌚ [NotificationDetailView] 📎 Attachments: \(notificationData.notification.attachments.count)")
            print("⌚ [NotificationDetailView] 📎 Supported attachments (IMAGE/GIF): \(supportedAttachments.count)")
            
            // Auto-mark as read when opening an unread notification
            if !notificationData.notification.isRead {
                print("⌚ [NotificationDetailView] 🔄 Auto-marking unread notification as read")
                connectivityManager.markNotificationAsReadFromWatch(id: notificationData.notification.id)
            }
        } else {
            print("⌚ [NotificationDetailView] ⚠️ Entered detail view but notificationData is nil")
        }
    }
    
    // MARK: - Actions
    
    private func toggleReadStatus() {
        guard let notificationData = notificationData else { return }
        let notifId = notificationData.notification.id
        
        if notificationData.notification.isRead {
            // Mark as unread
            connectivityManager.markNotificationAsUnreadFromWatch(id: notifId)
        } else {
            // Mark as read
            connectivityManager.markNotificationAsReadFromWatch(id: notifId)
        }
    }
    
    private func deleteNotification() {
        guard let notificationData = notificationData else { return }
        let notifId = notificationData.notification.id
        
        // Delete locally and notify iPhone
        connectivityManager.deleteNotificationFromWatch(id: notifId)
        
        // Mark as deleted and dismiss
        isDeleted = true
        dismiss()
    }
    
    private func hexColor(_ hex: String?) -> Color? {
        guard var hex = hex else { return nil }
        hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        
        guard hex.count == 6 else { return nil }
        
        var rgb: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgb)
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
    
    // MARK: - Action Handling
    
    private func executeAction(_ action: NotificationAction) {
        guard let notificationData = notificationData else { return }
        
        print("⌚ [NotificationDetailView] 🎬 Executing action: \(action.type) - \(action.label) for notification \(notificationData.notification.id)")
        
        // Send action execution request to iPhone via WCSession
        connectivityManager.executeNotificationAction(
            notificationId: notificationData.notification.id,
            action: action
        )
        
        // Provide haptic feedback
        WKInterfaceDevice.current().play(.success)
        
        // Show confirmation (optional - could add a toast/alert here)
        print("⌚ [NotificationDetailView] ✅ Action sent to iPhone: \(action.label)")
    }
    
    private func systemImageForAction(_ actionType: String) -> String {
        switch actionType {
        case "MARK_AS_READ":
            return "envelope.open"
        case "DELETE":
            return "trash"
        case "WEBHOOK":
            return "arrow.up.right.circle"
        case "BACKGROUND_CALL":
            return "phone.arrow.up.right"
        case "POSTPONE":
            return "calendar.badge.clock"
        case "SNOOZE":
            return "bell.slash"
        default:
            return "arrow.right.circle"
        }
    }
}

// MARK: - Date Formatting Helper

/// Format notification date - show time if today, otherwise show date
/// - Parameter dateString: ISO date string from notification
/// - Returns: Formatted string (e.g., "14:30" or "9 Nov")
private func formatNotificationDate(_ dateString: String) -> String? {
    let isoFormatter = ISO8601DateFormatter()
    isoFormatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    
    guard let date = isoFormatter.date(from: dateString) else {
        // Try without fractional seconds
        isoFormatter.formatOptions = [.withInternetDateTime]
        guard let date = isoFormatter.date(from: dateString) else {
            return nil
        }
        return formatDate(date)
    }
    
    return formatDate(date)
}

private func formatDate(_ date: Date) -> String {
    let calendar = Calendar.current
    let now = Date()
    
    // Check if date is today
    if calendar.isDateInToday(date) {
        // Show time only (e.g., "14:30")
        let timeFormatter = DateFormatter()
        timeFormatter.timeStyle = .short
        return timeFormatter.string(from: date)
    } else {
        // Show date (e.g., "9 Nov" or "9/11/24" for older dates)
        let dateFormatter = DateFormatter()
        
        // If within the same year, show day and month
        if calendar.component(.year, from: date) == calendar.component(.year, from: now) {
            dateFormatter.dateFormat = "d MMM"
        } else {
            // Different year, show full date
            dateFormatter.dateFormat = "d/M/yy"
        }
        
        return dateFormatter.string(from: date)
    }
}

// MARK: - Attachment Views

struct AttachmentThumbnailView: View {
    let attachment: WidgetAttachment
    let notificationId: String
    @State private var thumbnailData: Data?
    @State private var isLoading: Bool = true
    
    var body: some View {
        ZStack {
            if isLoading {
                // Show loading indicator while downloading
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.3))
                    .frame(maxWidth: .infinity, maxHeight: 60)
                    .overlay(
                        ProgressView()
                            .scaleEffect(0.8)
                    )
            } else if let thumbnailData = thumbnailData {
                // For GIFs, use AnimatedImageView to show animation
                if attachment.mediaType.uppercased() == "GIF" {
                    AnimatedImageView(imageData: thumbnailData)
                        .frame(maxWidth: .infinity, maxHeight: 60)
                        .clipped()
                        .cornerRadius(8)
                } else if let uiImage = UIImage(data: thumbnailData) {
                    Image(uiImage: uiImage)
                        .resizable()
                        .aspectRatio(contentMode: .fill)
                        .frame(maxWidth: .infinity, maxHeight: 60)
                        .clipped()
                        .cornerRadius(8)
                }
            } else {
                // Failed to load - show icon
                RoundedRectangle(cornerRadius: 8)
                    .fill(Color.gray.opacity(0.3))
                    .frame(maxWidth: .infinity, maxHeight: 60)
                    .overlay(
                        Image(systemName: iconForMediaType(attachment.mediaType))
                            .foregroundColor(.white)
                    )
            }
        }
        .onAppear {
            loadThumbnail()
        }
    }
    
    private func loadThumbnail() {
        guard let url = attachment.url else {
            print("⌚️ [AttachmentThumbnail] ❌ No URL for attachment")
            DispatchQueue.main.async {
                self.isLoading = false
            }
            return
        }
        
        print("⌚️ [AttachmentThumbnail] 🔍 Loading for: \(url)")
        print("⌚️ [AttachmentThumbnail] 📝 Type: \(attachment.mediaType), NotificationID: \(notificationId)")
        
        DispatchQueue.global(qos: .userInitiated).async {
            let cacheDir = MediaAccess.getSharedMediaCacheDirectory()
            print("⌚️ [AttachmentThumbnail] 📂 Cache dir: \(cacheDir.path)")
            
            if let localPath = MediaAccess.getLocalPathFromDb(url: url, mediaType: attachment.mediaType) {
                print("⌚️ [AttachmentThumbnail] 💾 DB path: \(localPath)")
                print("⌚️ [AttachmentThumbnail] 📁 Exists: \(FileManager.default.fileExists(atPath: localPath))")
            } else {
                print("⌚️ [AttachmentThumbnail] ⚠️ No DB path")
            }
            
            let notifDir = cacheDir.appendingPathComponent("NOTIFICATION_MEDIA").appendingPathComponent(notificationId)
            if FileManager.default.fileExists(atPath: notifDir.path) {
                if let files = try? FileManager.default.contentsOfDirectory(at: notifDir, includingPropertiesForKeys: nil) {
                    print("⌚️ [AttachmentThumbnail] 📄 Files: \(files.map { $0.lastPathComponent })")
                }
            } else {
                print("⌚️ [AttachmentThumbnail] ⚠️ Notif dir missing: \(notifDir.path)")
            }
            
            if let data = MediaAccess.getOptimizedNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                print("⌚️ [AttachmentThumbnail] ✅ Got \(data.count) bytes")
                DispatchQueue.main.async {
                    self.thumbnailData = data
                    self.isLoading = false
                }
            } else {
                print("⌚️ [AttachmentThumbnail] ❌ No cache data")
                DispatchQueue.main.async {
                    self.isLoading = false
                }
            }
        }
    }
    
    private func iconForMediaType(_ type: String) -> String {
        switch type.uppercased() {
        case "IMAGE": return "photo"
        case "VIDEO": return "video"
        case "AUDIO": return "waveform"
        case "GIF": return "photo.on.rectangle.angled"
        default: return "doc"
        }
    }
}

struct AttachmentFullView: View {
    let attachment: WidgetAttachment
    let notificationId: String
    @State private var mediaData: Data?
    
    var body: some View {
        VStack {
            if let mediaData = mediaData {
                if attachment.mediaType.uppercased() == "IMAGE" {
                    if let uiImage = UIImage(data: mediaData) {
                        Image(uiImage: uiImage)
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity)
                            .cornerRadius(8)
                    }
                } else if attachment.mediaType.uppercased() == "GIF" {
                    // Use AnimatedImageView for GIFs to show animation
                    AnimatedImageView(imageData: mediaData)
                        .aspectRatio(contentMode: .fit)
                        .frame(maxWidth: .infinity)
                        .cornerRadius(8)
                }
            } else {
                ProgressView()
                    .frame(maxWidth: .infinity, minHeight: 100)
            }
        }
        .onAppear {
            loadMedia()
        }
    }
    
    private func loadMedia() {
        guard let url = attachment.url else {
            print("⌚️ [AttachmentFullView] ❌ No URL for attachment")
            return
        }
        
        print("⌚️ [AttachmentFullView] 🔍 Loading media for: \(url)")
        print("⌚️ [AttachmentFullView] 📝 Type: \(attachment.mediaType), NotificationID: \(notificationId)")
        
        DispatchQueue.global(qos: .userInitiated).async {
            if let data = MediaAccess.getOptimizedNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                print("⌚️ [AttachmentFullView] ✅ Successfully loaded \(data.count) bytes")
                DispatchQueue.main.async {
                    self.mediaData = data
                }
            } else {
                print("⌚️ [AttachmentFullView] ❌ Failed to load media from cache for URL: \(url)")
                print("⌚️ [AttachmentFullView] ❌ NotificationID: \(notificationId), Type: \(attachment.mediaType)")
            }
        }
    }
}

struct AttachmentFullScreenView: View {
    let attachment: WidgetAttachment
    let notificationId: String
    @State private var mediaData: Data?
    
    var body: some View {
        ScrollView {
            VStack {
                if let mediaData = mediaData {
                    if attachment.mediaType.uppercased() == "IMAGE" {
                        if let uiImage = UIImage(data: mediaData) {
                            Image(uiImage: uiImage)
                                .resizable()
                                .aspectRatio(contentMode: .fit)
                                .frame(maxWidth: .infinity)
                        }
                    } else if attachment.mediaType.uppercased() == "GIF" {
                        // Use AnimatedImageView for GIFs
                        AnimatedImageView(imageData: mediaData)
                            .aspectRatio(contentMode: .fit)
                            .frame(maxWidth: .infinity)
                    }
                } else {
                    ProgressView()
                        .padding()
                }
            }
        }
        .navigationTitle(attachment.name ?? "Attachment")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            loadMedia()
        }
    }
    
    private func loadMedia() {
        guard let url = attachment.url else {
            print("⌚️ [AttachmentFullScreenView] ❌ No URL for attachment")
            return
        }
        
        print("⌚️ [AttachmentFullScreenView] 🔍 Loading media for: \(url)")
        print("⌚️ [AttachmentFullScreenView] 📝 Type: \(attachment.mediaType), NotificationID: \(notificationId)")
        
        DispatchQueue.global(qos: .userInitiated).async {
            if let data = MediaAccess.getOptimizedNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                print("⌚️ [AttachmentFullScreenView] ✅ Successfully loaded \(data.count) bytes")
                DispatchQueue.main.async {
                    self.mediaData = data
                }
            } else {
                print("⌚️ [AttachmentFullScreenView] ❌ Failed to load media from cache for URL: \(url)")
                print("⌚️ [AttachmentFullScreenView] ❌ NotificationID: \(notificationId), Type: \(attachment.mediaType)")
            }
        }
    }
}

struct AttachmentRowView: View {
    let attachment: WidgetAttachment
    let notificationId: String
    @State private var thumbnailImage: UIImage?
    
    var body: some View {
        HStack(spacing: 8) {
            // Media type icon or thumbnail
            if let thumbnailImage = thumbnailImage {
                Image(uiImage: thumbnailImage)
                    .resizable()
                    .scaledToFill()
                    .frame(width: 60, height: 60)
                    .clipShape(RoundedRectangle(cornerRadius: 6))
            } else {
                ZStack {
                    RoundedRectangle(cornerRadius: 6)
                        .fill(Color.secondary.opacity(0.2))
                        .frame(width: 60, height: 60)
                    
                    Image(systemName: mediaTypeIcon(attachment.mediaType))
                        .font(.system(size: 24))
                        .foregroundColor(.secondary)
                }
            }
            
            VStack(alignment: .leading, spacing: 2) {
                Text(attachment.name ?? "Attachment")
                    .font(.caption)
                    .lineLimit(2)
                
                Text(mediaTypeLabel(attachment.mediaType))
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Spacer()
        }
        .padding(.vertical, 4)
        .onAppear {
            loadThumbnail()
        }
    }
    
    private func loadThumbnail() {
        guard let url = attachment.url else {
            print("⌚️ [AttachmentRow] ❌ No URL")
            return
        }
        
        print("⌚️ [AttachmentRow] 🔍 Type: \(attachment.mediaType)")
        
        // Only load thumbnails for images and GIFs
        if attachment.mediaType == "IMAGE" || attachment.mediaType == "GIF" {
            let cacheDir = MediaAccess.getSharedMediaCacheDirectory()
            print("⌚️ [AttachmentRow] 📂 Cache: \(cacheDir.path)")
            
            // Try to get from cache
            if let cachedData = MediaAccess.getOptimizedNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                print("⌚️ [AttachmentRow] ✅ Got \(cachedData.count) bytes")
                self.thumbnailImage = UIImage(data: cachedData)
            } else {
                print("⌚️ [AttachmentRow] ❌ No cache")
            }
        }
    }
    
    private func mediaTypeIcon(_ mediaType: String) -> String {
        switch mediaType {
        case "IMAGE": return "photo"
        case "VIDEO": return "video"
        case "AUDIO": return "waveform"
        case "GIF": return "photo.on.rectangle.angled"
        default: return "doc"
        }
    }
    
    private func mediaTypeLabel(_ mediaType: String) -> String {
        switch mediaType {
        case "IMAGE": return "Image"
        case "VIDEO": return "Video"
        case "AUDIO": return "Audio"
        case "GIF": return "GIF"
        default: return "File"
        }
    }
}

// MARK: - Animated Image View for GIFs
struct AnimatedImageView: View {
    let imageData: Data
    @State private var frames: [UIImage] = []
    @State private var currentFrameIndex = 0
    @State private var timer: Timer?
    
    var body: some View {
        Group {
            if !frames.isEmpty {
                Image(uiImage: frames[currentFrameIndex])
                    .resizable()
            } else if let staticImage = UIImage(data: imageData) {
                // Fallback to static image if GIF parsing fails
                Image(uiImage: staticImage)
                    .resizable()
            } else {
                Color.gray.opacity(0.2)
            }
        }
        .onAppear {
            extractFrames()
            startAnimation()
        }
        .onDisappear {
            stopAnimation()
        }
    }
    
    private func extractFrames() {
        guard let source = CGImageSourceCreateWithData(imageData as CFData, nil) else {
            print("⌚️ [AnimatedImage] ❌ Failed to create image source")
            return
        }
        
        let count = CGImageSourceGetCount(source)
        print("⌚️ [AnimatedImage] 🎬 Found \(count) frames")
        
        var extractedFrames: [UIImage] = []
        for i in 0..<count {
            if let cgImage = CGImageSourceCreateImageAtIndex(source, i, nil) {
                extractedFrames.append(UIImage(cgImage: cgImage))
            }
        }
        
        if !extractedFrames.isEmpty {
            frames = extractedFrames
            print("⌚️ [AnimatedImage] ✅ Extracted \(extractedFrames.count) frames")
        }
    }
    
    private func startAnimation() {
        guard frames.count > 1 else { return }
        
        // Animate at ~10fps to save battery on Watch
        timer = Timer.scheduledTimer(withTimeInterval: 0.1, repeats: true) { _ in
            currentFrameIndex = (currentFrameIndex + 1) % frames.count
        }
    }
    
    private func stopAnimation() {
        timer?.invalidate()
        timer = nil
    }
}

// MARK: - Settings View

struct SettingsView: View {
    @State private var cloudKitEnabled: Bool = CloudKitManager.shared.isCloudKitEnabled
    @State private var maxNotificationsLimit: Int = WatchSettingsManager.shared.maxNotificationsLimit
    
    var body: some View {
        List {
            Section(header: Text("CloudKit")) {
                HStack(spacing: 10) {
                    Image(systemName: "icloud.fill")
                        .font(.system(size: 20))
                        .foregroundColor(.blue)
                        .frame(width: 32, height: 32)
                    
                    VStack(alignment: .leading, spacing: 4) {
                        Text("CloudKit Sync")
                            .font(.headline)
                        Text(cloudKitEnabled ? "Enabled" : "Disabled")
                            .font(.caption)
                            .foregroundColor(cloudKitEnabled ? .green : .red)
                    }
                    
                    Spacer()
                    
                    Toggle("", isOn: $cloudKitEnabled)
                        .labelsHidden()
                }
                .onChange(of: cloudKitEnabled) { oldValue, newValue in
                    CloudKitManager.setCloudKitEnabled(newValue)
                }
                
                Button(action: {
                    WatchConnectivityManager.shared.requestFullSync()
                }) {
                    HStack(spacing: 10) {
                        Image(systemName: "arrow.clockwise.circle.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.blue)
                            .frame(width: 32, height: 32)
                        
                        Text("Full Sync")
                            .font(.headline)
                            .foregroundColor(.primary)
                        
                        Spacer()
                    }
                }
                .disabled(!cloudKitEnabled)
            }
            
            Section(header: Text("Notifications")) {
                NavigationLink(destination: MaxNotificationsSettingsView()) {
                    HStack {
                        Text("Max Notifications")
                            .font(.headline)
                        Spacer()
                        Text("\(maxNotificationsLimit)")
                            .font(.headline)
                            .foregroundColor(.blue)
                    }
                }
            }
            
            Section(header: Text("Logs")) {
                NavigationLink(destination: LogsView()) {
                    HStack(spacing: 10) {
                        Image(systemName: "doc.text.fill")
                            .font(.system(size: 20))
                            .foregroundColor(.blue)
                            .frame(width: 32, height: 32)
                        
                        Text("View Logs")
                            .font(.headline)
                    }
                }
            }
        }
        .navigationTitle("Settings")
        .navigationBarTitleDisplayMode(.inline)
        .onAppear {
            cloudKitEnabled = CloudKitManager.shared.isCloudKitEnabled
            maxNotificationsLimit = WatchSettingsManager.shared.maxNotificationsLimit
        }
    }
}

// MARK: - Max Notifications Settings View

struct MaxNotificationsSettingsView: View {
    @State private var maxNotificationsLimit: Int = WatchSettingsManager.shared.maxNotificationsLimit
    @Environment(\.dismiss) private var dismiss
    
    var body: some View {
        VStack(spacing: 16) {
            Text("Max Notifications")
                .font(.headline)
                .padding(.top, 8)
            
            Text("\(maxNotificationsLimit)")
                .font(.system(size: 48, weight: .bold))
                .foregroundColor(.blue)
            
            Text("Show up to \(maxNotificationsLimit) notifications")
                .font(.caption)
                .foregroundColor(.secondary)
                .multilineTextAlignment(.center)
                .padding(.horizontal)
            
            Stepper("", value: $maxNotificationsLimit, in: 10...1000, step: 10)
                .labelsHidden()
                .padding(.horizontal, 40)
                .padding(.top, 8)
            
            Spacer()
        }
        .navigationTitle("Notifications")
        .navigationBarTitleDisplayMode(.inline)
        .onChange(of: maxNotificationsLimit) { oldValue, newValue in
            WatchSettingsManager.shared.setMaxNotificationsLimit(newValue)
        }
        .onAppear {
            maxNotificationsLimit = WatchSettingsManager.shared.maxNotificationsLimit
        }
    }
}

// MARK: - Logs View

struct LogsView: View {
    @State private var logs: [LoggingSystem.LogEntry] = []
    @State private var isLoading: Bool = true
    @State private var isSending: Bool = false
    @State private var sendError: String?
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    
    var body: some View {
        Group {
            if isLoading {
                VStack(spacing: 16) {
                    ProgressView()
                        .scaleEffect(1.2)
                    Text("Loading logs...")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            } else if logs.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "doc.text")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary)
                    Text("No logs available")
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
                .padding()
            } else {
                List {
                    ForEach(logs, id: \.id) { log in
                        LogRowView(log: log)
                    }
                }
            }
        }
        .navigationTitle("Logs")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                Button(action: {
                    sendLogsToiPhone()
                }) {
                    if isSending {
                        ProgressView()
                            .scaleEffect(0.8)
                    } else {
                        Image(systemName: "square.and.arrow.up")
                    }
                }
                .disabled(isSending || logs.isEmpty)
            }
        }
        .alert("Error", isPresented: .constant(sendError != nil)) {
            Button("OK") {
                sendError = nil
            }
        } message: {
            if let error = sendError {
                Text(error)
            }
        }
        .onAppear {
            loadLogs()
        }
    }
    
    private func loadLogs() {
        isLoading = true
        DispatchQueue.global(qos: .userInitiated).async {
            let allLogs = LoggingSystem.shared.readLogs()
            DispatchQueue.main.async {
                self.logs = allLogs
                self.isLoading = false
            }
        }
    }
    
    private func sendLogsToiPhone() {
        isSending = true
        sendError = nil
        
        connectivityManager.sendLogsToiPhone { success, error in
            DispatchQueue.main.async {
                isSending = false
                if success {
                    // Reload logs (should be empty now)
                    loadLogs()
                } else {
                    sendError = error ?? "Failed to send logs"
                }
            }
        }
    }
}

// MARK: - Log Row View

struct LogRowView: View {
    let log: LoggingSystem.LogEntry
    
    private var levelColor: Color {
        switch log.level {
        case "ERROR":
            return .red
        case "WARN":
            return .orange
        case "INFO":
            return .blue
        case "DEBUG":
            return .gray
        default:
            return .primary
        }
    }
    
    private var formattedDate: String {
        let date = Date(timeIntervalSince1970: Double(log.timestamp) / 1000.0)
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .medium
        return formatter.string(from: date)
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            HStack {
                Text(log.level)
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(levelColor)
                    .padding(.horizontal, 4)
                    .padding(.vertical, 2)
                    .background(levelColor.opacity(0.2))
                    .clipShape(Capsule())
                
                if let tag = log.tag {
                    Text(tag)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
                
                Spacer()
                
                Text(formattedDate)
                    .font(.caption2)
                    .foregroundColor(.secondary)
            }
            
            Text(log.message)
                .font(.caption)
                .lineLimit(3)
            
            Text("Source: \(log.source)")
                .font(.caption2)
                .foregroundColor(.secondary)
        }
        .padding(.vertical, 4)
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}


