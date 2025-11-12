import WidgetKit
import SwiftUI
import Foundation
import AppIntents

enum WidgetType {
    case all
    case unread
}

struct NotificationEntry: TimelineEntry {
    let date: Date
    let notifications: [WidgetNotificationData]
    let unreadCount: Int
    let widgetType: WidgetType
}

struct WidgetNotificationData {
    let notification: WidgetNotification
    let bucketIconData: Data?
}

struct NotificationProvider: TimelineProvider {
    let widgetType: WidgetType
    
    func placeholder(in context: Context) -> NotificationEntry {
        NotificationEntry(
            date: Date(),
            notifications: [],
            unreadCount: 0,
            widgetType: widgetType
        )
    }

    func getSnapshot(in context: Context, completion: @escaping (NotificationEntry) -> Void) {
        let entry = NotificationEntry(
            date: Date(),
            notifications: [],
            unreadCount: 0,
            widgetType: widgetType
        )
        completion(entry)
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<NotificationEntry>) -> Void) {
        let currentDate = Date()
        let unreadOnly = widgetType == .unread
        
        DatabaseAccess.getNotificationCount(source: "Widget") { unreadCount in
            DatabaseAccess.getRecentNotifications(limit: 10, unreadOnly: unreadOnly, source: "Widget") { notifications in
                // Load bucket icons for each notification
                let notificationsWithIcons = notifications.map { notification -> WidgetNotificationData in
                    let bucketIconData = MediaAccess.getBucketIconFromSharedCache(
                        bucketId: notification.bucketId,
                        bucketName: notification.bucketName,
                        bucketColor: notification.bucketColor,
                        iconUrl: notification.bucketIconUrl
                    )
                    return WidgetNotificationData(
                        notification: notification,
                        bucketIconData: bucketIconData
                    )
                }
                
                let entry = NotificationEntry(
                    date: currentDate,
                    notifications: notificationsWithIcons,
                    unreadCount: unreadCount,
                    widgetType: widgetType
                )
                
                // Auto-refresh policy:
                // 1. .atEnd = refresh immediately when widget becomes visible
                // 2. .after(nextUpdate) = also refresh every 15 minutes automatically
                let nextUpdate = Calendar.current.date(byAdding: .minute, value: 15, to: currentDate)!
                let timeline = Timeline(entries: [entry], policy: .after(nextUpdate))
                completion(timeline)
            }
        }
    }
}

struct NotificationWidgetEntryView: View {
    var entry: NotificationProvider.Entry
    @Environment(\.widgetFamily) var family

    var body: some View {
        switch family {
        case .systemSmall:
            SmallNotificationView(entry: entry)
        case .systemMedium:
            MediumNotificationView(entry: entry)
        case .systemLarge:
            LargeNotificationView(entry: entry)
        default:
            SmallNotificationView(entry: entry)
        }
    }
}

struct SmallNotificationView: View {
    var entry: NotificationProvider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 2) {
            HStack(spacing: 3) {
                Image(systemName: entry.widgetType == .unread ? "envelope.badge.fill" : "bell.fill")
                    .font(.system(size: 10))
                    .foregroundColor(entry.widgetType == .unread ? .orange : .blue)
                Text(entry.widgetType == .unread ? "Unread" : "All")
                    .font(.system(size: 10))
                Spacer()
                if entry.widgetType == .all && entry.unreadCount > 0 {
                    Text("\(entry.unreadCount)")
                        .font(.system(size: 8))
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 4)
                        .padding(.vertical, 2)
                        .background(Color.red)
                        .clipShape(Capsule())
                }
                Button(intent: RefreshWidgetIntent()) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12))
                        .foregroundColor(.blue)
                }
                .buttonStyle(.plain)
            }
            
            if entry.notifications.isEmpty {
                Spacer()
                Text("No notifications")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Spacer()
            } else {
                Spacer()
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(entry.notifications.prefix(2)), id: \.notification.id) { notificationData in
                        Link(destination: URL(string: "/(phone)/(home)/notification/\(notificationData.notification.id)")!) {
                            HStack(spacing: 3) {
                                // Unread indicator bar
                                if !notificationData.notification.isRead {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color.blue)
                                        .frame(width: 3)
                                }
                                
                                if let iconData = notificationData.bucketIconData,
                                   let uiImage = UIImage(data: iconData) {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .frame(width: 20, height: 20)
                                        .clipShape(Circle())
                                        .overlay(
                                            !notificationData.notification.isRead ?
                                            Circle()
                                                .strokeBorder(Color.blue, lineWidth: 2)
                                            : nil
                                        )
                                }
                                
                                VStack(alignment: .leading, spacing: 1) {
                                    Text(notificationData.notification.title)
                                        .font(.system(size: 10))
                                        .fontWeight(!notificationData.notification.isRead ? .bold : .semibold)
                                        .foregroundColor(!notificationData.notification.isRead ? .primary : .primary)
                                        .lineLimit(1)
                                    
                                    Text(notificationData.notification.body)
                                        .font(.system(size: 9))
                                        .foregroundColor(!notificationData.notification.isRead ? .primary : .secondary)
                                        .lineLimit(2)
                                }
                            }
                            .padding(.vertical, 2)
                            .padding(.horizontal, 2)
                            .background(
                                !notificationData.notification.isRead ?
                                Color.blue.opacity(0.08) : Color.clear
                            )
                            .cornerRadius(6)
                        }
                        
                        if notificationData.notification.id != Array(entry.notifications.prefix(2)).last?.notification.id {
                            Divider()
                        }
                    }
                }
                Spacer()
            }
        }
        .padding(0)
    }
}

struct MediumNotificationView: View {
    var entry: NotificationProvider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 3) {
                Image(systemName: entry.widgetType == .unread ? "envelope.badge.fill" : "bell.fill")
                    .font(.system(size: 10))
                    .foregroundColor(entry.widgetType == .unread ? .orange : .blue)
                Text(entry.widgetType == .unread ? "Unread" : "All")
                    .font(.system(size: 10))
                Spacer()
                if entry.widgetType == .all && entry.unreadCount > 0 {
                    Text("\(entry.unreadCount) unread")
                        .font(.system(size: 8))
                        .fontWeight(.semibold)
                        .foregroundColor(.red)
                }
                Button(intent: RefreshWidgetIntent()) {
                    Image(systemName: "arrow.clockwise")
                        .font(.system(size: 12))
                        .foregroundColor(.blue)
                }
                .buttonStyle(.plain)
            }
            
            if entry.notifications.isEmpty {
                Spacer()
                Text("No notifications")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(entry.notifications.prefix(4)), id: \.notification.id) { notificationData in
                        Link(destination: URL(string: "/(phone)/(home)/notification/\(notificationData.notification.id)")!) {
                            HStack(spacing: 3) {
                                // Unread indicator bar
                                if !notificationData.notification.isRead {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color.blue)
                                        .frame(width: 3)
                                }
                                
                                if let iconData = notificationData.bucketIconData,
                                   let uiImage = UIImage(data: iconData) {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .frame(width: 24, height: 24)
                                        .clipShape(Circle())
                                        .overlay(
                                            !notificationData.notification.isRead ?
                                            Circle()
                                                .strokeBorder(Color.blue, lineWidth: 2)
                                            : nil
                                        )
                                }
                                
                                VStack(alignment: .leading, spacing: 1) {
                                    HStack {
                                        Text(notificationData.notification.title)
                                            .font(.system(size: 11))
                                            .fontWeight(!notificationData.notification.isRead ? .bold : .semibold)
                                            .foregroundColor(!notificationData.notification.isRead ? .primary : .primary)
                                            .lineLimit(1)
                                        Spacer()
                                        if !notificationData.notification.isRead {
                                            Circle()
                                                .fill(Color.blue)
                                                .frame(width: 6, height: 6)
                                        }
                                    }
                                    Text(notificationData.notification.body)
                                        .font(.system(size: 9))
                                        .foregroundColor(!notificationData.notification.isRead ? .primary : .secondary)
                                        .lineLimit(2)
                                }
                            }
                            .padding(.vertical, 3)
                            .padding(.horizontal, 2)
                            .background(
                                !notificationData.notification.isRead ?
                                Color.blue.opacity(0.08) : Color.clear
                            )
                            .cornerRadius(6)
                        }
                        
                        if notificationData.notification.id != Array(entry.notifications.prefix(4)).last?.notification.id {
                            Divider()
                        }
                    }
                }
            }
        }
        .padding(0)
    }
}

struct LargeNotificationView: View {
    var entry: NotificationProvider.Entry
    
    var body: some View {
        VStack(alignment: .leading, spacing: 3) {
            HStack(spacing: 3) {
                Image(systemName: entry.widgetType == .unread ? "envelope.badge.fill" : "bell.fill")
                    .font(.system(size: 10))
                    .foregroundColor(entry.widgetType == .unread ? .orange : .blue)
                Text(entry.widgetType == .unread ? "Unread" : "All Notifications")
                    .font(.system(size: 10))
                Spacer()
                if entry.widgetType == .all && entry.unreadCount > 0 {
                    Text("\(entry.unreadCount) unread")
                        .font(.system(size: 8))
                        .fontWeight(.semibold)
                        .foregroundColor(.red)
                }
                Button(intent: RefreshWidgetIntent()) {
                    HStack(spacing: 2) {
                        Image(systemName: "arrow.clockwise")
                            .font(.system(size: 12))
                        Text("Refresh")
                            .font(.system(size: 10))
                    }
                    .foregroundColor(.blue)
                }
                .buttonStyle(.plain)
            }
            
            if entry.notifications.isEmpty {
                Spacer()
                Text("No notifications")
                    .font(.system(size: 9))
                    .foregroundColor(.secondary)
                Spacer()
            } else {
                VStack(alignment: .leading, spacing: 4) {
                    ForEach(Array(entry.notifications.prefix(7)), id: \.notification.id) { notificationData in
                        Link(destination: URL(string: "/(phone)/(home)/notification/\(notificationData.notification.id)")!) {
                            HStack(spacing: 3) {
                                // Unread indicator bar
                                if !notificationData.notification.isRead {
                                    RoundedRectangle(cornerRadius: 2)
                                        .fill(Color.blue)
                                        .frame(width: 4)
                                }
                                
                                if let iconData = notificationData.bucketIconData,
                                   let uiImage = UIImage(data: iconData) {
                                    Image(uiImage: uiImage)
                                        .resizable()
                                        .frame(width: 28, height: 28)
                                        .clipShape(Circle())
                                        .overlay(
                                            !notificationData.notification.isRead ?
                                            Circle()
                                                .strokeBorder(Color.blue, lineWidth: 2)
                                            : nil
                                        )
                                }
                                
                                VStack(alignment: .leading, spacing: 1) {
                                    HStack {
                                        Text(notificationData.notification.title)
                                            .font(.system(size: 12))
                                            .fontWeight(!notificationData.notification.isRead ? .bold : .semibold)
                                            .foregroundColor(!notificationData.notification.isRead ? .primary : .primary)
                                            .lineLimit(1)
                                        Spacer()
                                        if !notificationData.notification.isRead {
                                            Circle()
                                                .fill(Color.blue)
                                                .frame(width: 7, height: 7)
                                        }
                                    }
                                    if let subtitle = notificationData.notification.subtitle, !subtitle.isEmpty {
                                        Text(subtitle)
                                            .font(.system(size: 9))
                                            .foregroundColor(!notificationData.notification.isRead ? .primary : .secondary)
                                            .lineLimit(1)
                                    }
                                    Text(notificationData.notification.body)
                                        .font(.system(size: 10))
                                        .foregroundColor(!notificationData.notification.isRead ? .primary : .secondary)
                                        .lineLimit(2)
                                }
                            }
                            .padding(.vertical, 4)
                            .padding(.horizontal, 2)
                            .background(
                                !notificationData.notification.isRead ?
                                Color.blue.opacity(0.08) : Color.clear
                            )
                            .cornerRadius(6)
                        }
                        
                        if notificationData.notification.id != Array(entry.notifications.prefix(7)).last?.notification.id {
                            Divider()
                        }
                    }
                }
            }
        }
        .padding(0)
    }
}

struct RefreshWidgetIntent: AppIntent {
    static var title: LocalizedStringResource = "Refresh widget"
    static var description: IntentDescription = "Refresh notifications in the widget"
    
    func perform() async throws -> some IntentResult {
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-all")
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-unread")
        return .result()
    }
}

struct AllNotificationsWidget: Widget {
    let kind: String = "zentik-notifications-all"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NotificationProvider(widgetType: .all)) { entry in
            NotificationWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("All Notifications")
        .description("View all your recent notifications")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        // Auto-refresh when widget becomes visible
        .onBackgroundURLSessionEvents { _, _ in
            WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-all")
        }
    }
}

struct UnreadNotificationsWidget: Widget {
    let kind: String = "zentik-notifications-unread"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: NotificationProvider(widgetType: .unread)) { entry in
            NotificationWidgetEntryView(entry: entry)
                .containerBackground(.fill.tertiary, for: .widget)
        }
        .configurationDisplayName("Unread Notifications")
        .description("View only your unread notifications")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
        // Auto-refresh when widget becomes visible
        .onBackgroundURLSessionEvents { _, _ in
            WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-unread")
        }
    }
}

// Widget bundle is defined in index.swift

#Preview(as: .systemSmall) {
    AllNotificationsWidget()
} timeline: {
    NotificationEntry(
        date: .now,
        notifications: [
            WidgetNotificationData(
                notification: WidgetNotification(
                    id: "1",
                    title: "Sample Notification",
                    body: "This is a sample notification",
                    subtitle: "Subtitle",
                    createdAt: "",
                    isRead: false,
                    bucketId: "",
                    bucketName: "",
                    bucketColor: nil,
                    bucketIconUrl: nil,
                    attachments: [],
                    actions: []
                ),
                bucketIconData: nil
            )
        ],
        unreadCount: 1,
        widgetType: .all
    )
}

