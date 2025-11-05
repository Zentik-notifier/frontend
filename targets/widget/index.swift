import WidgetKit
import SwiftUI

@main
struct exportWidgets: WidgetBundle {
    var body: some Widget {
        AllNotificationsWidget()
        UnreadNotificationsWidget()
        widgetControl()
        WidgetLiveActivity()
    }
}
