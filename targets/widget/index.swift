import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        AllNotificationsWidget()
        UnreadNotificationsWidget()
        NotificationCountControl()
        if #available(iOS 16.1, *) {
            NotificationLiveActivity()
        }
    }
}
