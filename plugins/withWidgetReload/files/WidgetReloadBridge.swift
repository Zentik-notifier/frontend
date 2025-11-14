import Foundation
import WidgetKit

@objc(WidgetReloadBridge)
class WidgetReloadBridge: NSObject {
    
    private let logger = LoggingSystem.shared
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return false
    }
    
    @objc
    func reloadAllWidgets() {
        logger.info(
            tag: "Widget",
            message: "Reloading all widgets from React Native",
            metadata: ["widgets": "all,unread"],
            source: "WidgetReloadBridge"
        )
        
        // Use reloadAllTimelines() for comprehensive reload
        WidgetCenter.shared.reloadAllTimelines()
        
        // Explicitly reload each widget kind for extra reliability
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-all")
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-unread")
    }
}
