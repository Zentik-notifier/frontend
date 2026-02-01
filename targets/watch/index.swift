import SwiftUI
import WatchKit

@main
struct watchEntry: App {
    @WKExtensionDelegateAdaptor(WatchExtensionDelegate.self) var extensionDelegate
    
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
    }
}

