import SwiftUI

struct ContentView: View {
    @StateObject private var connectivityManager = WatchConnectivityManager.shared
    @State private var isLoading: Bool = true
    
    var body: some View {
        BucketMenuView(
            buckets: connectivityManager.buckets,
            totalUnreadCount: connectivityManager.unreadCount,
            isLoading: isLoading,
            isConnected: connectivityManager.isConnected,
            onRefresh: loadData
        )
        .onAppear {
            loadData()
        }
    }
    
    private func loadData() {
        isLoading = true
        connectivityManager.requestData()
        
        // Stop loading after a timeout
        DispatchQueue.main.asyncAfter(deadline: .now() + 2) {
            isLoading = false
        }
    }
}

struct BucketItem: Identifiable {
    let id: String
    let name: String
    let unreadCount: Int
    let color: String?
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
    let isLoading: Bool
    let isConnected: Bool
    let onRefresh: () -> Void
    
    var body: some View {
        NavigationView {
            Group {
                if isLoading {
                    VStack(spacing: 8) {
                        ProgressView()
                        Text("Loading...")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                    }
                } else if !isConnected {
                    VStack(spacing: 12) {
                        Image(systemName: "iphone.slash")
                            .font(.system(size: 40))
                            .foregroundColor(.secondary)
                        Text("iPhone not reachable")
                            .font(.caption)
                            .foregroundColor(.secondary)
                        Text("Make sure iPhone is nearby and unlocked")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                            .multilineTextAlignment(.center)
                        
                        Button(action: onRefresh) {
                            Label("Try Again", systemImage: "arrow.clockwise")
                        }
                        .buttonStyle(.borderedProminent)
                    }
                    .padding()
                } else {
                    List {
                        // All notifications item
                        NavigationLink(destination: FilteredNotificationListView(bucketId: nil)) {
                            HStack(spacing: 10) {
                                Image(systemName: "bell.fill")
                                    .font(.system(size: 20))
                                    .foregroundColor(.blue)
                                    .frame(width: 32, height: 32)
                                
                                VStack(alignment: .leading, spacing: 2) {
                                    Text("All Notifications")
                                        .font(.headline)
                                    if totalUnreadCount > 0 {
                                        Text("\(totalUnreadCount) unread")
                                            .font(.caption2)
                                            .foregroundColor(.secondary)
                                    }
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
                                    NavigationLink(destination: FilteredNotificationListView(bucketId: bucket.id)) {
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
                ToolbarItem(placement: .primaryAction) {
                    Button(action: onRefresh) {
                        Image(systemName: "arrow.clockwise")
                    }
                }
            }
        }
    }
}

struct BucketRowView: View {
    let bucket: BucketItem
    
    var body: some View {
        HStack(spacing: 10) {
            RoundedRectangle(cornerRadius: 6)
                .fill(hexColor(bucket.color) ?? Color.blue)
                .frame(width: 32, height: 32)
            
            VStack(alignment: .leading, spacing: 2) {
                Text(bucket.name)
                    .font(.headline)
                if bucket.unreadCount > 0 {
                    Text("\(bucket.unreadCount) unread")
                        .font(.caption2)
                        .foregroundColor(.secondary)
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
                    
                    Button(action: refreshData) {
                        Label("Refresh", systemImage: "arrow.clockwise")
                    }
                    .buttonStyle(.borderedProminent)
                }
            } else {
                List {
                    ForEach(filteredNotifications) { notificationData in
                        NavigationLink(destination: NotificationDetailView(
                            notificationData: notificationData,
                            onDelete: {
                                deleteNotification(notificationData)
                            },
                            onMarkAsRead: {
                                markAsRead(notificationData)
                            }
                        )) {
                            NotificationRowView(notificationData: notificationData)
                        }
                    }
                }
            }
        }
        .navigationTitle(bucketId == nil ? "All" : "Bucket")
        .navigationBarTitleDisplayMode(.inline)
        .toolbar {
            ToolbarItem(placement: .primaryAction) {
                Button(action: refreshData) {
                    Image(systemName: "arrow.clockwise")
                }
            }
        }
        .onAppear {
            filterNotifications()
        }
        .onChange(of: connectivityManager.notifications) { _ in
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
    
    private func refreshData() {
        connectivityManager.requestData()
    }
    
    private func deleteNotification(_ notificationData: NotificationData) {
        connectivityManager.deleteNotification(id: notificationData.notification.id) { success in
            if success {
                filterNotifications()
            }
        }
    }
    
    private func markAsRead(_ notificationData: NotificationData) {
        connectivityManager.markAsRead(id: notificationData.notification.id) { success in
            if success {
                filterNotifications()
            }
        }
    }
}

struct NotificationRowView: View {
    let notificationData: NotificationData
    
    var body: some View {
        HStack(spacing: 8) {
            RoundedRectangle(cornerRadius: 4)
                .fill(hexColor(notificationData.notification.bucketColor) ?? Color.blue)
                .frame(width: 24, height: 24)
            
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
                
                Text(notificationData.notification.body)
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .lineLimit(2)
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
    let notificationData: NotificationData
    let onDelete: () -> Void
    let onMarkAsRead: () -> Void
    
    @Environment(\.dismiss) var dismiss
    @State private var showDeleteConfirmation = false
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                // Header
                VStack(alignment: .leading, spacing: 2) {
                    Text(notificationData.notification.bucketName ?? "Notification")
                        .font(.headline)
                        .foregroundColor(.primary)
                    
                    if !notificationData.notification.isRead {
                        Text("Unread")
                            .font(.caption2)
                            .foregroundColor(.blue)
                    }
                }
                .padding(.bottom, 4)
                
                Divider()
                
                // Title
                VStack(alignment: .leading, spacing: 4) {
                    Text("Title")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(notificationData.notification.title)
                        .font(.headline)
                }
                
                // Subtitle (if exists)
                if let subtitle = notificationData.notification.subtitle, !subtitle.isEmpty {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Subtitle")
                            .font(.caption2)
                            .foregroundColor(.secondary)
                        Text(subtitle)
                            .font(.subheadline)
                    }
                }
                
                // Body
                VStack(alignment: .leading, spacing: 4) {
                    Text("Message")
                        .font(.caption2)
                        .foregroundColor(.secondary)
                    Text(notificationData.notification.body)
                        .font(.body)
                }
                
                Spacer()
                
                // Actions
                VStack(spacing: 8) {
                    Button(action: {
                        onMarkAsRead()
                        dismiss()
                    }) {
                        Label("Mark as Read", systemImage: "checkmark.circle.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.borderedProminent)
                    .disabled(notificationData.notification.isRead)
                    
                    Button(role: .destructive, action: {
                        showDeleteConfirmation = true
                    }) {
                        Label("Delete", systemImage: "trash.fill")
                            .frame(maxWidth: .infinity)
                    }
                    .buttonStyle(.bordered)
                }
            }
            .padding()
        }
        .navigationTitle("Details")
        .navigationBarTitleDisplayMode(.inline)
        .alert("Delete Notification", isPresented: $showDeleteConfirmation) {
            Button("Cancel", role: .cancel) { }
            Button("Delete", role: .destructive) {
                onDelete()
                dismiss()
            }
        } message: {
            Text("Are you sure you want to delete this notification?")
        }
    }
}

struct ContentView_Previews: PreviewProvider {
    static var previews: some View {
        ContentView()
    }
}

