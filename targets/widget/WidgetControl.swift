import AppIntents
import SwiftUI
import WidgetKit

/// Control Widget that shows unread notification count
/// Tapping opens the app (Watch app on watchOS, iOS app on iOS)
struct NotificationCountControl: ControlWidget {
    static let kind: String = "com.apocaliss92.zentik.notificationCount"

    var body: some ControlWidgetConfiguration {
        StaticControlConfiguration(
            kind: Self.kind
        ) {
            ControlWidgetButton(action: OpenAppIntent()) {
                Label {
                    Text("\(NotificationCountProvider.shared.unreadCount)")
                        .font(.system(size: 16, weight: .bold))
                } icon: {
                    Image(systemName: "bell.badge.fill")
                        .foregroundColor(.red)
                }
            }
        }
        .displayName("Unread Notifications")
        .description("Shows unread notification count. Tap to open app.")
    }
}

/// Intent to open the main app
struct OpenAppIntent: AppIntent {
    static let title: LocalizedStringResource = "Open Zentik"
    static let description = IntentDescription("Opens the Zentik app")
    
    static var openAppWhenRun: Bool = true
    
    func perform() async throws -> some IntentResult {
        return .result()
    }
}

/// Shared provider for notification count
/// This should be updated by the app when notifications change
class NotificationCountProvider {
    static let shared = NotificationCountProvider()
    
    private init() {
        // Load initial count from UserDefaults
        loadCount()
    }
    
    private(set) var unreadCount: Int = 0 {
        didSet {
            saveCount()
            // Reload all timelines when count changes
            ControlCenter.shared.reloadControls(ofKind: NotificationCountControl.kind)
        }
    }
    
    func updateCount(_ count: Int) {
        unreadCount = count
    }
    
    private func saveCount() {
        UserDefaults(suiteName: "group.com.apocaliss92.zentik.dev")?.set(unreadCount, forKey: "unreadNotificationCount")
    }
    
    private func loadCount() {
        unreadCount = UserDefaults(suiteName: "group.com.apocaliss92.zentik.dev")?.integer(forKey: "unreadNotificationCount") ?? 0
    }
}
