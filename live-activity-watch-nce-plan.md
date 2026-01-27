# Piano di Implementazione: Live Activity (iOS) e NCE (Watch)

## Panoramica

Questo documento descrive il piano per implementare:
1. **Live Activity (iOS)**: Mostra le ultime notifiche non lette in tempo reale
2. **NCE (Notification Content Extension) per Watch**: Custom long look screen con layout specifico

## 1. Live Activity (iOS)

### Obiettivo
Mostrare le ultime N (3-5) notifiche non lette in una Live Activity che si aggiorna automaticamente.

### Tecnologia
- **Libreria**: `expo-live-activity` (https://github.com/software-mansion-labs/expo-live-activity)
- **SwiftUI**: Per il design della Live Activity
- **WidgetKit**: Per l'aggiornamento in tempo reale

### Layout Live Activity

```
┌─────────────────────────────────────┐
│  Zentik Notifications               │
│  ─────────────────────────────────  │
│                                     │
│  📧 [Bucket Icon] Title 1           │
│     Subtitle 1                      │
│                                     │
│  📧 [Bucket Icon] Title 2           │
│     Subtitle 2                      │
│                                     │
│  📧 [Bucket Icon] Title 3           │
│     Subtitle 3                      │
│                                     │
│  [Tap to view all]                 │
└─────────────────────────────────────┘
```

### Componenti Necessari

#### 1.1 Live Activity State

```swift
// frontend/plugins/ZentikShared/LiveActivityState.swift

import ActivityKit
import Foundation

struct ZentikLiveActivityAttributes: ActivityAttributes {
    public struct ContentState: Codable, Hashable {
        var notifications: [NotificationItem]
        var unreadCount: Int
        var lastUpdate: Date
    }
    
    var id: String
}

struct NotificationItem: Codable, Hashable {
    let id: String
    let title: String
    let subtitle: String?
    let bucketId: String
    let bucketName: String?
    let bucketIconUrl: String?
    let createdAt: Date
}
```

#### 1.2 Live Activity View (SwiftUI)

```swift
// frontend/plugins/ZentikShared/LiveActivityView.swift

import SwiftUI
import WidgetKit

struct ZentikLiveActivityWidget: Widget {
    let kind: String = "ZentikLiveActivity"
    
    var body: some WidgetConfiguration {
        ActivityConfiguration(for: ZentikLiveActivityAttributes.self) { context in
            ZentikLiveActivityLockScreenView(context: context)
        } dynamicIsland: { context in
            DynamicIsland {
                DynamicIslandExpandedRegion(.leading) {
                    // Leading content
                }
                DynamicIslandExpandedRegion(.trailing) {
                    // Trailing content
                }
                DynamicIslandExpandedRegion(.center) {
                    // Center content
                }
                DynamicIslandExpandedRegion(.bottom) {
                    // Bottom content with notifications list
                }
            } compactLeading: {
                // Compact leading
            } compactTrailing: {
                // Compact trailing
            } minimal: {
                // Minimal view
            }
        }
    }
}

struct ZentikLiveActivityLockScreenView: View {
    let context: ActivityViewContext<ZentikLiveActivityAttributes>
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Header
            HStack {
                Text("Zentik Notifications")
                    .font(.headline)
                Spacer()
                Text("\(context.state.unreadCount) unread")
                    .font(.caption)
                    .foregroundColor(.secondary)
            }
            
            Divider()
            
            // Notifications list
            ForEach(context.state.notifications.prefix(5), id: \.id) { notification in
                HStack(alignment: .top, spacing: 8) {
                    // Bucket icon
                    AsyncImage(url: URL(string: notification.bucketIconUrl ?? "")) { image in
                        image
                            .resizable()
                            .aspectRatio(contentMode: .fit)
                    } placeholder: {
                        Image(systemName: "bell.fill")
                    }
                    .frame(width: 24, height: 24)
                    
                    VStack(alignment: .leading, spacing: 2) {
                        Text(notification.title)
                            .font(.subheadline)
                            .fontWeight(.medium)
                        if let subtitle = notification.subtitle {
                            Text(subtitle)
                                .font(.caption)
                                .foregroundColor(.secondary)
                        }
                    }
                    
                    Spacer()
                }
            }
            
            // Footer
            HStack {
                Spacer()
                Text("Tap to view all")
                    .font(.caption)
                    .foregroundColor(.blue)
            }
        }
        .padding()
    }
}
```

#### 1.3 Bridge React Native

```swift
// frontend/plugins/ZentikShared/LiveActivityBridge.swift

import ActivityKit
import Foundation

@objc(LiveActivityBridge)
class LiveActivityBridge: NSObject {
    
    @objc
    static func requiresMainQueueSetup() -> Bool {
        return true
    }
    
    @objc
    func startLiveActivity(
        _ notifications: [[String: Any]],
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        // Convert notifications to LiveActivity state
        let items = notifications.compactMap { dict -> NotificationItem? in
            guard let id = dict["id"] as? String,
                  let title = dict["title"] as? String,
                  let bucketId = dict["bucketId"] as? String else {
                return nil
            }
            
            let subtitle = dict["subtitle"] as? String
            let bucketName = dict["bucketName"] as? String
            let bucketIconUrl = dict["bucketIconUrl"] as? String
            
            // Parse createdAt
            var createdAt = Date()
            if let createdAtStr = dict["createdAt"] as? String {
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                if let date = formatter.date(from: createdAtStr) {
                    createdAt = date
                }
            }
            
            return NotificationItem(
                id: id,
                title: title,
                subtitle: subtitle,
                bucketId: bucketId,
                bucketName: bucketName,
                bucketIconUrl: bucketIconUrl,
                createdAt: createdAt
            )
        }
        
        let unreadCount = items.count
        let attributes = ZentikLiveActivityAttributes(id: UUID().uuidString)
        let contentState = ZentikLiveActivityAttributes.ContentState(
            notifications: items,
            unreadCount: unreadCount,
            lastUpdate: Date()
        )
        
        do {
            let activity = try Activity<ZentikLiveActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: .token
            )
            
            // Store activity ID for updates
            UserDefaults.standard.set(activity.id, forKey: "zentik_live_activity_id")
            
            resolve(["success": true, "activityId": activity.id])
        } catch {
            reject("START_FAILED", error.localizedDescription, error)
        }
    }
    
    @objc
    func updateLiveActivity(
        _ notifications: [[String: Any]],
        resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activityId = UserDefaults.standard.string(forKey: "zentik_live_activity_id"),
              let activity = Activity<ZentikLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            reject("NOT_FOUND", "Live Activity not found", nil)
            return
        }
        
        // Convert and update
        let items = notifications.compactMap { dict -> NotificationItem? in
            // Same conversion as startLiveActivity
            // ...
        }
        
        let contentState = ZentikLiveActivityAttributes.ContentState(
            notifications: items,
            unreadCount: items.count,
            lastUpdate: Date()
        )
        
        Task {
            await activity.update(using: contentState)
            resolve(["success": true])
        }
    }
    
    @objc
    func stopLiveActivity(
        _ resolver resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        guard let activityId = UserDefaults.standard.string(forKey: "zentik_live_activity_id"),
              let activity = Activity<ZentikLiveActivityAttributes>.activities.first(where: { $0.id == activityId }) else {
            reject("NOT_FOUND", "Live Activity not found", nil)
            return
        }
        
        Task {
            await activity.end(dismissalPolicy: .immediate)
            UserDefaults.standard.removeObject(forKey: "zentik_live_activity_id")
            resolve(["success": true])
        }
    }
}
```

#### 1.4 TypeScript Wrapper

```typescript
// frontend/services/live-activity-service.ts

import { NativeModules } from 'react-native';

const { LiveActivityBridge } = NativeModules;

export interface LiveActivityNotification {
  id: string;
  title: string;
  subtitle?: string;
  bucketId: string;
  bucketName?: string;
  bucketIconUrl?: string;
  createdAt: string;
}

export class LiveActivityService {
  async startLiveActivity(notifications: LiveActivityNotification[]): Promise<{ success: boolean; activityId?: string }> {
    if (!LiveActivityBridge) {
      return { success: false };
    }
    
    try {
      const result = await LiveActivityBridge.startLiveActivity(notifications);
      return { success: result.success || false, activityId: result.activityId };
    } catch (error) {
      console.error('[LiveActivity] Failed to start:', error);
      return { success: false };
    }
  }
  
  async updateLiveActivity(notifications: LiveActivityNotification[]): Promise<boolean> {
    if (!LiveActivityBridge) {
      return false;
    }
    
    try {
      const result = await LiveActivityBridge.updateLiveActivity(notifications);
      return result.success || false;
    } catch (error) {
      console.error('[LiveActivity] Failed to update:', error);
      return false;
    }
  }
  
  async stopLiveActivity(): Promise<boolean> {
    if (!LiveActivityBridge) {
      return false;
    }
    
    try {
      const result = await LiveActivityBridge.stopLiveActivity();
      return result.success || false;
    } catch (error) {
      console.error('[LiveActivity] Failed to stop:', error);
      return false;
    }
  }
}

export const liveActivityService = new LiveActivityService();
```

### Aggiornamento Live Activity

La Live Activity deve essere aggiornata quando:
- Arriva una nuova notifica non letta
- Una notifica viene marcata come letta
- L'utente apre l'app (sync con CloudKit)

**Trigger da CloudKit push notifications**:
- Ascoltare notifiche CloudKit
- Aggiornare Live Activity con le ultime N notifiche non lette

## 2. NCE (Notification Content Extension) per Watch

### Obiettivo
Custom long look screen per le notifiche sul watch con layout specifico:
- Titolo + sottotitolo sopra l'immagine
- Immagine full-width
- Body sotto l'immagine
- Azioni base (markAsRead, delete, open) come icone circolari in riga
- Azioni rimanenti sotto con label

### Tecnologia
- **WKUserNotificationHostingController**: Per SwiftUI-based custom UI
- **UNNotificationContentExtension**: Per gestire le notifiche
- **SwiftUI**: Per il layout

### Layout NCE Watch

```
┌─────────────────────────────────────┐
│  Title                              │
│  Subtitle                           │
│  ─────────────────────────────────  │
│                                     │
│  [Full-width Image]                 │
│                                     │
│  Body text here...                  │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  [✓] [🗑️] [→]                       │
│  Mark  Delete  Open                 │
│                                     │
│  ─────────────────────────────────  │
│                                     │
│  Action 1 Label                     │
│  Action 2 Label                     │
│  Action 3 Label                     │
└─────────────────────────────────────┘
```

### Componenti Necessari

#### 2.1 Notification Content Extension Target

**File**: `frontend/targets/watch/ZentikNotificationContentExtension/NotificationViewController.swift`

```swift
import SwiftUI
import UserNotifications
import UserNotificationsUI
import WatchKit

class NotificationViewController: WKUserNotificationHostingController<NotificationContentView> {
    
    override var body: NotificationContentView {
        return NotificationContentView()
    }
    
    override func didReceive(_ notification: UNNotification) {
        // Extract notification data
        let userInfo = notification.request.content.userInfo
        
        // Update view with notification data
        // ...
    }
    
    override func didReceive(_ response: UNNotificationResponse, completionHandler completion: @escaping (WKUserNotificationInterfaceType) -> Void) {
        // Handle action response
        // ...
        
        completion(.default)
    }
}
```

#### 2.2 Notification Content View (SwiftUI)

```swift
// frontend/targets/watch/ZentikNotificationContentExtension/NotificationContentView.swift

import SwiftUI

struct NotificationContentView: View {
    @State private var notificationData: NotificationData?
    
    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 12) {
                // Title and Subtitle (above image)
                if let data = notificationData {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(data.title)
                            .font(.headline)
                            .fontWeight(.bold)
                        
                        if let subtitle = data.subtitle {
                            Text(subtitle)
                                .font(.subheadline)
                                .foregroundColor(.secondary)
                        }
                    }
                    .padding(.horizontal)
                    .padding(.top)
                    
                    Divider()
                    
                    // Full-width image
                    if let imageUrl = data.imageUrl {
                        AsyncImage(url: URL(string: imageUrl)) { image in
                            image
                                .resizable()
                                .aspectRatio(contentMode: .fill)
                                .frame(maxWidth: .infinity)
                                .frame(height: 200)
                                .clipped()
                        } placeholder: {
                            Rectangle()
                                .fill(Color.gray.opacity(0.3))
                                .frame(height: 200)
                                .overlay(
                                    ProgressView()
                                )
                        }
                    }
                    
                    // Body (below image)
                    if let body = data.body {
                        Text(body)
                            .font(.body)
                            .padding(.horizontal)
                    }
                    
                    Divider()
                    
                    // Base actions (circular icons in row)
                    HStack(spacing: 20) {
                        // Mark as Read
                        Button(action: {
                            handleMarkAsRead(data.id)
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: "checkmark.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.green)
                                Text("Mark")
                                    .font(.caption)
                            }
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Delete
                        Button(action: {
                            handleDelete(data.id)
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: "trash.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.red)
                                Text("Delete")
                                    .font(.caption)
                            }
                        }
                        .buttonStyle(PlainButtonStyle())
                        
                        // Open
                        Button(action: {
                            handleOpen(data.id)
                        }) {
                            VStack(spacing: 4) {
                                Image(systemName: "arrow.right.circle.fill")
                                    .font(.system(size: 32))
                                    .foregroundColor(.blue)
                                Text("Open")
                                    .font(.caption)
                            }
                        }
                        .buttonStyle(PlainButtonStyle())
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical)
                    
                    // Remaining actions (with labels)
                    if !data.remainingActions.isEmpty {
                        Divider()
                        
                        ForEach(data.remainingActions, id: \.id) { action in
                            Button(action: {
                                handleAction(action)
                            }) {
                                HStack {
                                    Text(action.label)
                                        .font(.body)
                                    Spacer()
                                    Image(systemName: "chevron.right")
                                        .font(.caption)
                                        .foregroundColor(.secondary)
                                }
                                .padding(.vertical, 8)
                                .padding(.horizontal)
                            }
                            .buttonStyle(PlainButtonStyle())
                        }
                    }
                } else {
                    // Loading state
                    ProgressView()
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
    }
    
    private func handleMarkAsRead(_ notificationId: String) {
        // Call WatchCloudKit to mark as read
        // Then dismiss or update UI
    }
    
    private func handleDelete(_ notificationId: String) {
        // Call WatchCloudKit to delete
        // Then dismiss
    }
    
    private func handleOpen(_ notificationId: String) {
        // Open app and navigate to notification
        // If notification not in local cache, download on-demand
    }
    
    private func handleAction(_ action: NotificationAction) {
        // Handle custom action
    }
}

struct NotificationData {
    let id: String
    let title: String
    let subtitle: String?
    let body: String?
    let imageUrl: String?
    let remainingActions: [NotificationAction]
}

struct NotificationAction {
    let id: String
    let label: String
    let type: String
    let value: String?
}
```

#### 2.3 Download Notification on Demand

Quando l'utente apre una notifica che non è nella cache locale:

```swift
// In NotificationViewController

private func openNotification(_ notificationId: String) {
    // Check if notification is in local cache
    let cache = WatchDataStore.shared.loadCache()
    if cache.notifications.contains(where: { $0.id == notificationId }) {
        // Open app and navigate
        openApp(with: notificationId)
    } else {
        // Download from CloudKit on-demand
        downloadNotificationFromCloudKit(notificationId) { success in
            if success {
                openApp(with: notificationId)
            } else {
                // Show error
            }
        }
    }
}

private func downloadNotificationFromCloudKit(
    _ notificationId: String,
    completion: @escaping (Bool) -> Void
) {
    // Use WatchCloudKit to fetch single notification
    let recordID = CKRecord.ID(
        recordName: "Notification-\(notificationId)",
        zoneID: WatchCloudKit.shared.core.zoneID
    )
    
    WatchCloudKit.shared.fetchRecord(recordID: recordID) { result in
        switch result {
        case .success(let record):
            if let record = record {
                // Parse and save to cache
                // Then open app
                completion(true)
            } else {
                completion(false)
            }
        case .failure:
            completion(false)
        }
    }
}
```

### Configurazione Info.plist

Per la NCE, aggiungere in `Info.plist`:

```xml
<key>NSExtension</key>
<dict>
    <key>NSExtensionPointIdentifier</key>
    <string>com.apple.usernotifications.content-extension</string>
    <key>NSExtensionPrincipalClass</key>
    <string>NotificationViewController</string>
</dict>
```

## File Structure

```
frontend/
├── plugins/
│   └── ZentikShared/
│       ├── LiveActivityState.swift          (NUOVO)
│       ├── LiveActivityView.swift           (NUOVO)
│       └── LiveActivityBridge.swift          (NUOVO)
├── services/
│   └── live-activity-service.ts             (NUOVO)
└── targets/
    └── watch/
        └── ZentikNotificationContentExtension/
            ├── NotificationViewController.swift  (NUOVO)
            └── NotificationContentView.swift     (NUOVO)
```

## Prossimi Passi

### Live Activity
1. ⏳ Installare `expo-live-activity` package
2. ⏳ Creare `LiveActivityState.swift`
3. ⏳ Creare `LiveActivityView.swift`
4. ⏳ Creare `LiveActivityBridge.swift`
5. ⏳ Creare TypeScript wrapper
6. ⏳ Integrare con CloudKit sync
7. ⏳ Testare su device iOS

### NCE Watch
1. ⏳ Creare Notification Content Extension target
2. ⏳ Creare `NotificationViewController.swift`
3. ⏳ Creare `NotificationContentView.swift` con layout
4. ⏳ Implementare download on-demand
5. ⏳ Implementare azioni (markAsRead, delete, open)
6. ⏳ Configurare Info.plist
7. ⏳ Testare su device Watch
