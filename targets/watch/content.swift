import SwiftUI
import ImageIO

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var isRefreshing: Bool = false
    @State private var isInitialLoad: Bool = true
    
    var body: some View {
        BucketMenuView(
            buckets: connectivityManager.buckets,
            totalUnreadCount: connectivityManager.unreadCount,
            totalNotificationsCount: connectivityManager.notifications.count,
            isLoading: isRefreshing,
            isInitialLoad: isInitialLoad,
            isConnected: connectivityManager.isConnected,
            lastUpdate: connectivityManager.lastUpdate,
            hasCache: !connectivityManager.notifications.isEmpty,
            onRefresh: loadData
        )
        .environmentObject(connectivityManager)
        .onAppear {
            // Only load if no cached data
            if connectivityManager.notifications.isEmpty {
                loadData()
            } else {
                isInitialLoad = false
            }
        }
    }
    
    private func loadData() {
        isRefreshing = true
        connectivityManager.requestData()
        
        // Stop loading after a timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 3) {
            isRefreshing = false
            isInitialLoad = false
        }
    }
}

struct BucketItem: Identifiable {
    let id: String
    let name: String
    let unreadCount: Int
    let totalCount: Int
    let color: String?
    let iconUrl: String?
}

struct NotificationData: Identifiable, Equatable {
    var id: String { notification.id }
    let notification: DatabaseAccess.WidgetNotification
    
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
    
    var body: some View {
        NavigationView {
            Group {
                // Show full screen loader only on initial load with no cache
                if isInitialLoad && !hasCache {
                    VStack(spacing: 16) {
                        ProgressView()
                            .scaleEffect(1.2)
                        Text("Loading notifications...")
                            .font(.caption)
                            .foregroundColor(.secondary)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if !isConnected && !hasCache {
                    VStack(spacing: 12) {
                        Image(systemName: "iphone.slash")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("No data available")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Pull down to refresh from CloudKit")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                    }
                    .padding()
                } else {
                    List {
                        // All notifications item
                        NavigationLink(destination: FilteredNotificationListView(bucketId: nil, bucketName: nil, bucket: nil, allBuckets: buckets)) {
                            HStack(spacing: 10) {
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.blue)
                                    .frame(width: 32, height: 32)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("All Notifications")
                                        .font(.headline)
                                    Text("\(totalNotificationsCount) notifications")
                                        .font(.caption2)
                                        .foregroundColor(.secondary)
                                }
                                
                                Spacer()
                                
                                if totalUnreadCount > 0 {
                                    Text("\(totalUnreadCount)")
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
                        
                        // Buckets section
                        if !buckets.isEmpty {
                            Section(header: Text("Buckets")) {
                                ForEach(buckets) { bucket in
                                    NavigationLink(destination: FilteredNotificationListView(bucketId: bucket.id, bucketName: bucket.name, bucket: bucket, allBuckets: buckets)) {
                                        BucketRowView(bucket: bucket)
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
                    if let lastUpdate = lastUpdate {
                        Text("Synced \(timeAgo(from: lastUpdate))")
                            .font(.system(size: 8))
                            .foregroundColor(.secondary)
                    }
                }
                
                ToolbarItem(placement: .topBarTrailing) {
                    if isLoading {
                        ProgressView()
                            .scaleEffect(0.7)
                    } else {
                        Button(action: {
                            onRefresh()
                        }) {
                            Image(systemName: "arrow.clockwise")
                                .font(.system(size: 14))
                        }
                    }
                }
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
}

struct BucketRowView: View {
    let bucket: BucketItem
    @State private var iconImage: UIImage?
    
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
                Text("\(bucket.totalCount) notifications")
                    .font(.caption2)
                    .foregroundColor(.secondary)
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
        .onAppear {
            loadIcon()
        }
    }
    
    private func loadIcon() {
        guard let iconUrl = bucket.iconUrl, !iconUrl.isEmpty else {
            print("⌚ [BucketRowView] ⚠️ No iconUrl for bucket \(bucket.id) (\(bucket.name))")
            return
        }
        
        print("⌚ [BucketRowView] 🔍 Loading icon for bucket \(bucket.id) (\(bucket.name)), iconUrl: \(iconUrl)")
        
        // Try to get icon from cache or download
        if let iconData = MediaAccess.getBucketIconFromSharedCache(
            bucketId: bucket.id,
            bucketName: bucket.name,
            bucketColor: bucket.color,
            iconUrl: iconUrl
        ) {
            self.iconImage = UIImage(data: iconData)
            print("⌚ [BucketRowView] ✅ Loaded icon for bucket \(bucket.id) (\(bucket.name))")
        } else {
            print("⌚ [BucketRowView] ⚠️ Icon not found in cache for bucket \(bucket.id) (\(bucket.name)), iconUrl: \(iconUrl)")
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
    
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var filteredNotifications: [NotificationData] = []
    @State private var isLoading: Bool = false
    @Environment(\.dismiss) var dismiss
    
    var body: some View {
        Group {
            if filteredNotifications.isEmpty {
                VStack(spacing: 12) {
                    Image(systemName: "bell.slash")
                        .font(.system(size: 40))
                        .foregroundColor(.secondary)
                    Text("No notifications")
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
                    }
                }
            }
        }
        .navigationTitle(bucketId == nil ? "All" : (bucketName ?? "Bucket"))
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .topBarTrailing) {
                if isLoading {
                    ProgressView()
                        .scaleEffect(0.7)
                } else {
                    Button(action: {
                        isLoading = true
                        connectivityManager.requestData()
                        DispatchQueue.main.asyncAfter(deadline: .now() + 1) {
                            isLoading = false
                        }
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
        if let bucketId = bucketId {
            filteredNotifications = connectivityManager.notifications.filter { $0.notification.bucketId == bucketId }
        } else {
            filteredNotifications = connectivityManager.notifications
        }
    }
}

struct NotificationRowView: View {
    let notificationData: NotificationData
    let bucket: BucketItem?
    @State private var iconImage: UIImage?
    
    var body: some View {
        HStack(spacing: 8) {
            // Show bucket icon if available, otherwise show colored rectangle
            if let iconImage = iconImage {
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
            }
        }
        .padding(.vertical, 4)
        .onAppear {
            loadIcon()
        }
    }
    
    private func loadIcon() {
        // Use bucket data if available (from main page), otherwise fallback to notification data
        let iconUrl = bucket?.iconUrl ?? notificationData.notification.bucketIconUrl
        let bucketId = bucket?.id ?? notificationData.notification.bucketId
        let bucketName = bucket?.name ?? notificationData.notification.bucketName ?? ""
        let bucketColor = bucket?.color ?? notificationData.notification.bucketColor
        
        guard let iconUrl = iconUrl else { return }
        
        // Try to get icon from cache or download
        if let iconData = MediaAccess.getBucketIconFromSharedCache(
            bucketId: bucketId,
            bucketName: bucketName,
            bucketColor: bucketColor,
            iconUrl: iconUrl
        ) {
            self.iconImage = UIImage(data: iconData)
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

struct NotificationDetailView: View {
    let notificationId: String
    let bucket: BucketItem?
    
    @State private var iconImage: UIImage?
    @State private var isDeleted = false
    @EnvironmentObject var connectivityManager: WatchConnectivityManager
    @Environment(\.dismiss) var dismiss
    
    // Computed property to get the latest notification data from manager
    private var notificationData: NotificationData? {
        connectivityManager.notifications.first { $0.notification.id == notificationId }
    }
    
    // Filter to only show supported attachments (IMAGE and GIF)
    private var supportedAttachments: [DatabaseAccess.WidgetAttachment] {
        guard let notificationData = notificationData else { return [] }
        return notificationData.notification.attachments.filter { attachment in
            let type = attachment.mediaType.uppercased()
            return type == "IMAGE" || type == "GIF"
        }
    }
    
    var body: some View {
        if let notificationData = notificationData {
            ScrollView {
                VStack(alignment: .leading, spacing: 12) {
                    // Header with bucket icon
                    HStack(spacing: 10) {
                        // Show bucket icon if available, otherwise show colored rectangle
                        if let iconImage = iconImage {
                            Image(uiImage: iconImage)
                                .resizable()
                                .scaledToFill()
                                .frame(width: 40, height: 40)
                                .clipShape(RoundedRectangle(cornerRadius: 8))
                        } else {
                            RoundedRectangle(cornerRadius: 8)
                                .fill(hexColor(bucket?.color ?? notificationData.notification.bucketColor) ?? Color.blue)
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
                    .onAppear {
                        loadIcon()
                    }
                
                Divider()
                
                // Subtitle (if exists)
                if let subtitle = notificationData.notification.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(.subheadline)
                        .foregroundColor(.secondary)
                }
                
                // Body
                Text(notificationData.notification.body)
                    .font(.body)
                
                // Attachments - only show supported types (IMAGE and GIF)
                if !supportedAttachments.isEmpty {
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
            }
            .padding()
        }
        .navigationTitle(bucket?.name ?? notificationData.notification.bucketName ?? "Notification")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
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
        } else {
            // Notification not found (deleted or not loaded yet)
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
    }
    
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
    
    private func loadIcon() {
        guard let notificationData = notificationData else { return }
        
        // Use bucket data if available (from main page), otherwise fallback to notification data
        let iconUrl = bucket?.iconUrl ?? notificationData.notification.bucketIconUrl
        let bucketId = bucket?.id ?? notificationData.notification.bucketId
        let bucketName = bucket?.name ?? notificationData.notification.bucketName ?? ""
        let bucketColor = bucket?.color ?? notificationData.notification.bucketColor
        
        guard let iconUrl = iconUrl else { return }
        
        // Try to get icon from cache or download
        if let iconData = MediaAccess.getBucketIconFromSharedCache(
            bucketId: bucketId,
            bucketName: bucketName,
            bucketColor: bucketColor,
            iconUrl: iconUrl
        ) {
            self.iconImage = UIImage(data: iconData)
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

// MARK: - Attachment Views

struct AttachmentThumbnailView: View {
    let attachment: DatabaseAccess.WidgetAttachment
    let notificationId: String
    @State private var thumbnailData: Data?
    
    var body: some View {
        ZStack {
            if let thumbnailData = thumbnailData {
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
            
            if let data = MediaAccess.getNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                print("⌚️ [AttachmentThumbnail] ✅ Got \(data.count) bytes")
                DispatchQueue.main.async {
                    self.thumbnailData = data
                }
            } else {
                print("⌚️ [AttachmentThumbnail] ❌ No cache data")
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
    let attachment: DatabaseAccess.WidgetAttachment
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
        guard let url = attachment.url else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            if let data = MediaAccess.getNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                DispatchQueue.main.async {
                    self.mediaData = data
                }
            }
        }
    }
}

struct AttachmentFullScreenView: View {
    let attachment: DatabaseAccess.WidgetAttachment
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
        guard let url = attachment.url else { return }
        DispatchQueue.global(qos: .userInitiated).async {
            if let data = MediaAccess.getNotificationMediaForWatch(
                url: url,
                mediaType: attachment.mediaType,
                notificationId: notificationId
            ) {
                DispatchQueue.main.async {
                    self.mediaData = data
                }
            }
        }
    }
}

struct AttachmentRowView: View {
    let attachment: DatabaseAccess.WidgetAttachment
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
            if let cachedData = MediaAccess.getNotificationMediaForWatch(
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

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}


