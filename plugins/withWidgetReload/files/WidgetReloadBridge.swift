import Foundation
import WidgetKit

@objc(WidgetReloadBridge)
class WidgetReloadBridge: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func reloadAllWidgets() {
        print("📦 [WidgetReload] reloadAllWidgets() called from React Native")
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-all")
        print("📦 [WidgetReload] Reloaded 'zentik-notifications-all' widget")
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-unread")
        print("📦 [WidgetReload] Reloaded 'zentik-notifications-unread' widget")
        print("📦 [WidgetReload] All widgets reload completed")
    }
}
