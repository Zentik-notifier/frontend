import ActivityKit
import WidgetKit
import SwiftUI

// MARK: - Live Activity Attributes

struct NotificationActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var unreadCount: Int
        var latestNotificationTitle: String?
        var latestNotificationBody: String?
        var latestNotificationId: String?
        var bucketIconUrl: String?
        var timestamp: Date
    }
    
    // Fixed attributes that don't change during the activity
    var appName: String
}

// MARK: - Live Activity Widget

struct NotificationLiveActivity: Widget {
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: NotificationActivityAttributes.self) { context in
            // Lock screen view
            NotificationLiveActivityLockScreenView(context: context)
                .activityBackgroundTint(Color.black.opacity(0.25))
                .activitySystemActionForegroundColor(Color.blue)
            
        } dynamicIsland: { context in
            DynamicIsland {
                // Expanded view
                DynamicIslandExpandedRegion(.leading) {
                    HStack(spacing: 8) {
                        Image(systemName: "bell.badge.fill")
                            .font(.title2)
                            .foregroundColor(.blue)
                        
                        VStack(alignment: .leading, spacing: 2) {
                            Text("Notifications")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            
                            Text("\(context.state.unreadCount) unread")
                                .font(.headline)
                                .foregroundColor(.primary)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.trailing) {
                    if let title = context.state.latestNotificationTitle {
                        VStack(alignment: .trailing, spacing: 2) {
                            Text("Latest")
                                .font(.caption2)
                                .foregroundColor(.secondary)
                            
                            Text(title)
                                .font(.caption)
                                .foregroundColor(.primary)
                                .lineLimit(1)
                        }
                    }
                }
                
                DynamicIslandExpandedRegion(.bottom) {
                    if let body = context.state.latestNotificationBody {
                        HStack {
                            Text(body)
                                .font(.caption)
                                .foregroundColor(.secondary)
                                .lineLimit(2)
                            
                            Spacer()
                            
                            Link(destination: URL(string: "/(phone)/(home)/(tabs)/notifications")!) {
                                Text("Open")
                                    .font(.caption)
                                    .fontWeight(.semibold)
                                    .foregroundColor(.blue)
                            }
                        }
                        .padding(.top, 8)
                    }
                }
            } compactLeading: {
                // Compact leading view (left side of notch)
                Image(systemName: "bell.badge.fill")
                    .foregroundColor(.blue)
            } compactTrailing: {
                // Compact trailing view (right side of notch)
                Text("\(context.state.unreadCount)")
                    .font(.caption2)
                    .fontWeight(.bold)
                    .foregroundColor(.white)
                    .padding(.horizontal, 6)
                    .padding(.vertical, 2)
                    .background(Color.red)
                    .clipShape(Capsule())
            } minimal: {
                // Minimal view (when multiple activities are active)
                Image(systemName: "bell.badge.fill")
                    .foregroundColor(.blue)
            }
            .widgetURL(URL(string: "/(phone)/(home)/(tabs)/notifications"))
        }
    }
}

// MARK: - Lock Screen View

struct NotificationLiveActivityLockScreenView: View {
    let context: ActivityViewContext<NotificationActivityAttributes>
    
    var body: some View {
        HStack(spacing: 12) {
            // Icon
            Image(systemName: "bell.badge.fill")
                .font(.title2)
                .foregroundColor(.blue)
                .frame(width: 44, height: 44)
                .background(Color.blue.opacity(0.2))
                .clipShape(Circle())
            
            // Content
            VStack(alignment: .leading, spacing: 4) {
                HStack {
                    Text(context.attributes.appName)
                        .font(.caption)
                        .fontWeight(.semibold)
                        .foregroundColor(.secondary)
                    
                    Spacer()
                    
                    Text("\(context.state.unreadCount) unread")
                        .font(.caption2)
                        .fontWeight(.bold)
                        .foregroundColor(.white)
                        .padding(.horizontal, 8)
                        .padding(.vertical, 3)
                        .background(Color.red)
                        .clipShape(Capsule())
                }
                
                if let title = context.state.latestNotificationTitle {
                    Text(title)
                        .font(.subheadline)
                        .fontWeight(.semibold)
                        .lineLimit(1)
                }
                
                if let body = context.state.latestNotificationBody {
                    Text(body)
                        .font(.caption)
                        .foregroundColor(.secondary)
                        .lineLimit(2)
                }
                
                HStack {
                    Spacer()
                    Text(context.state.timestamp, style: .relative)
                        .font(.caption2)
                        .foregroundColor(.secondary)
                }
            }
        }
        .padding()
    }
}

// MARK: - Preview

#Preview("Notification Live Activity", as: .content, using: NotificationActivityAttributes(appName: "Zentik")) {
    NotificationLiveActivity()
} contentStates: {
    NotificationActivityAttributes.ContentState(
        unreadCount: 3,
        latestNotificationTitle: "New Message",
        latestNotificationBody: "You have received a new message from John",
        latestNotificationId: "123",
        bucketIconUrl: nil,
        timestamp: Date()
    )
    
    NotificationActivityAttributes.ContentState(
        unreadCount: 7,
        latestNotificationTitle: "Important Update",
        latestNotificationBody: "Your account needs attention",
        latestNotificationId: "456",
        bucketIconUrl: nil,
        timestamp: Date()
    )
}

