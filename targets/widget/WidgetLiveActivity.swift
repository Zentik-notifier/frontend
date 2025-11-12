import ActivityKit
import WidgetKit
import SwiftUI

struct WidgetAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        // Dynamic stateful properties about your activity go here!
        var emoji: String
    }

    // Fixed non-changing properties about your activity go here!
    var name: String
}

extension WidgetAttributes {
    fileprivate static var preview: WidgetAttributes {
        WidgetAttributes(name: "World")
    }
}

extension WidgetAttributes.ContentState {
    fileprivate static var smiley: WidgetAttributes.ContentState {
        WidgetAttributes.ContentState(emoji: "😀")
     }
     
     fileprivate static var starEyes: WidgetAttributes.ContentState {
         WidgetAttributes.ContentState(emoji: "🤩")
     }
}

#Preview("Notification", as: .content, using: WidgetAttributes.preview) {
   WidgetLiveActivity()
} contentStates: {
    WidgetAttributes.ContentState.smiley
    WidgetAttributes.ContentState.starEyes
}
