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
            tag: "ReactNative→Widget",
            message: "Reloading all widgets requested from React Native",
            metadata: ["widgets": "all,unread"],
            source: "WidgetReloadBridge"
        )
        
        // Use reloadAllTimelines() first for comprehensive reload
        WidgetCenter.shared.reloadAllTimelines()
        logger.debug(
            tag: "WidgetReload",
            message: "Called reloadAllTimelines() for all widgets",
            source: "WidgetReloadBridge"
        )
        
        // Then explicitly reload each widget kind for extra reliability
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-all")
        logger.debug(
            tag: "WidgetReload",
            message: "Explicitly reloaded zentik-notifications-all widget",
            source: "WidgetReloadBridge"
        )
        
        WidgetCenter.shared.reloadTimelines(ofKind: "zentik-notifications-unread")
        logger.debug(
            tag: "WidgetReload",
            message: "Explicitly reloaded zentik-notifications-unread widget",
            source: "WidgetReloadBridge"
        )
        
        logger.info(
            tag: "WidgetReload",
            message: "All widgets reload completed (reloadAllTimelines + specific kinds)",
            source: "WidgetReloadBridge"
        )
    }
}
