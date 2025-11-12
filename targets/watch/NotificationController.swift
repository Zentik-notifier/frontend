import WatchKit
import Foundation
import UserNotifications

/// Custom notification controller for Long Look view
/// This provides a custom UI when the user raises their wrist to see a notification
class NotificationController: WKUserNotificationHostingController<NotificationView> {
    
    override var body: NotificationView {
        return NotificationView()
    }
    
    override func willActivate() {
        // This method is called when watch view controller is about to be visible to user
        super.willActivate()
    }
    
    override func didDeactivate() {
        // This method is called when watch view controller is no longer visible
        super.didDeactivate()
    }
    
    override func didReceive(_ notification: UNNotification) {
        // This method is called when a notification needs to be presented
        // Forward the notification to the SwiftUI view
        let content = notification.request.content
        
        // Extract notification data
        let title = content.title
        let body = content.body
        let subtitle = content.subtitle
        let userInfo = content.userInfo
        
        // Update the body with notification data
        self.body.updateNotification(
            title: title,
            subtitle: subtitle.isEmpty ? nil : subtitle,
            body: body,
            userInfo: userInfo
        )
    }
}
