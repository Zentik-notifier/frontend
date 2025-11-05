import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        AllNotificationsWidget()
        UnreadNotificationsWidget()
        widgetControl()
        if #available(iOS 16.1, *) {
            NotificationLiveActivity()
        }
        WidgetLiveActivity()
    }
}
