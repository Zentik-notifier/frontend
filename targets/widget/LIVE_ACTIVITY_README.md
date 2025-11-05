# Live Activity Integration Guide

## Overview
The Notification Live Activity provides real-time notification updates on the Lock Screen and Dynamic Island (iPhone 14 Pro and later).

## Features

### Dynamic Island
- **Compact**: Shows bell icon + unread count badge
- **Minimal**: Bell icon only (when multiple activities active)
- **Expanded**: Full notification details with:
  - Unread count
  - Latest notification title and body
  - Quick "Open" action

### Lock Screen
- Large card showing:
  - App icon
  - Unread count badge
  - Latest notification title and body
  - Relative timestamp

## Requirements
- iOS 16.1 or later
- ActivityKit framework
- Info.plist configuration

## Info.plist Configuration

Add to your app's Info.plist:

```xml
<key>NSSupportsLiveActivities</key>
<true/>
<key>NSSupportsLiveActivitiesFrequentUpdates</key>
<true/>
```

## Usage in Swift

### Start a Live Activity

```swift
import ActivityKit

func startNotificationActivity(unreadCount: Int, latestNotification: NotificationFragment?) {
    guard ActivityAuthorizationInfo().areActivitiesEnabled else {
        print("Live Activities are not enabled")
        return
    }
    
    let attributes = NotificationActivityAttributes(appName: "Zentik")
    
    let contentState = NotificationActivityAttributes.ContentState(
        unreadCount: unreadCount,
        latestNotificationTitle: latestNotification?.message?.title,
        latestNotificationBody: latestNotification?.message?.body,
        latestNotificationId: latestNotification?.id,
        bucketIconUrl: latestNotification?.message?.bucket?.iconUrl,
        timestamp: Date()
    )
    
    do {
        let activity = try Activity<NotificationActivityAttributes>.request(
            attributes: attributes,
            contentState: contentState,
            pushType: .token
        )
        print("✅ Live Activity started: \(activity.id)")
    } catch {
        print("❌ Failed to start Live Activity: \(error)")
    }
}
```

### Update a Live Activity

```swift
func updateNotificationActivity(activity: Activity<NotificationActivityAttributes>, 
                                unreadCount: Int, 
                                latestNotification: NotificationFragment?) async {
    let contentState = NotificationActivityAttributes.ContentState(
        unreadCount: unreadCount,
        latestNotificationTitle: latestNotification?.message?.title,
        latestNotificationBody: latestNotification?.message?.body,
        latestNotificationId: latestNotification?.id,
        bucketIconUrl: latestNotification?.message?.bucket?.iconUrl,
        timestamp: Date()
    )
    
    await activity.update(using: contentState)
}
```

### End a Live Activity

```swift
func endNotificationActivity(activity: Activity<NotificationActivityAttributes>) async {
    await activity.end(dismissalPolicy: .immediate)
}
```

### Get Active Activities

```swift
func getActiveNotificationActivities() -> [Activity<NotificationActivityAttributes>] {
    return Activity<NotificationActivityAttributes>.activities
}
```

## React Native Integration

### Create TypeScript Service

```typescript
// services/live-activity-service.ts
import { NativeModules } from 'react-native';

const { LiveActivityModule } = NativeModules;

export class LiveActivityService {
  static async start(unreadCount: number, latestNotification?: Notification) {
    if (!LiveActivityModule) {
      console.warn('Live Activity module not available');
      return;
    }
    
    try {
      await LiveActivityModule.startNotificationActivity({
        unreadCount,
        latestNotificationTitle: latestNotification?.message?.title,
        latestNotificationBody: latestNotification?.message?.body,
        latestNotificationId: latestNotification?.id,
      });
    } catch (error) {
      console.error('Failed to start Live Activity:', error);
    }
  }
  
  static async update(unreadCount: number, latestNotification?: Notification) {
    if (!LiveActivityModule) return;
    
    try {
      await LiveActivityModule.updateNotificationActivity({
        unreadCount,
        latestNotificationTitle: latestNotification?.message?.title,
        latestNotificationBody: latestNotification?.message?.body,
        latestNotificationId: latestNotification?.id,
      });
    } catch (error) {
      console.error('Failed to update Live Activity:', error);
    }
  }
  
  static async end() {
    if (!LiveActivityModule) return;
    
    try {
      await LiveActivityModule.endNotificationActivity();
    } catch (error) {
      console.error('Failed to end Live Activity:', error);
    }
  }
}
```

### Native Module (Swift)

```swift
import ActivityKit
import Foundation

@objc(LiveActivityModule)
class LiveActivityModule: NSObject {
    private var currentActivity: Activity<NotificationActivityAttributes>?
    
    @objc
    func startNotificationActivity(_ params: NSDictionary) {
        guard ActivityAuthorizationInfo().areActivitiesEnabled else {
            print("Live Activities not enabled")
            return
        }
        
        let attributes = NotificationActivityAttributes(appName: "Zentik")
        
        let contentState = NotificationActivityAttributes.ContentState(
            unreadCount: params["unreadCount"] as? Int ?? 0,
            latestNotificationTitle: params["latestNotificationTitle"] as? String,
            latestNotificationBody: params["latestNotificationBody"] as? String,
            latestNotificationId: params["latestNotificationId"] as? String,
            bucketIconUrl: nil,
            timestamp: Date()
        )
        
        do {
            currentActivity = try Activity<NotificationActivityAttributes>.request(
                attributes: attributes,
                contentState: contentState,
                pushType: .token
            )
            print("✅ Live Activity started")
        } catch {
            print("❌ Failed to start: \(error)")
        }
    }
    
    @objc
    func updateNotificationActivity(_ params: NSDictionary) {
        Task {
            guard let activity = currentActivity else { return }
            
            let contentState = NotificationActivityAttributes.ContentState(
                unreadCount: params["unreadCount"] as? Int ?? 0,
                latestNotificationTitle: params["latestNotificationTitle"] as? String,
                latestNotificationBody: params["latestNotificationBody"] as? String,
                latestNotificationId: params["latestNotificationId"] as? String,
                bucketIconUrl: nil,
                timestamp: Date()
            )
            
            await activity.update(using: contentState)
        }
    }
    
    @objc
    func endNotificationActivity() {
        Task {
            await currentActivity?.end(dismissalPolicy: .immediate)
            currentActivity = nil
        }
    }
}
```

## Best Practices

1. **Lifecycle Management**
   - Start activity when app enters background with unread notifications
   - Update activity when new notifications arrive
   - End activity when all notifications are read or app is active

2. **Battery Optimization**
   - Limit update frequency (iOS limits to ~4 updates per hour for push updates)
   - Use `.frequent` update mode only when necessary

3. **User Experience**
   - Always check if Live Activities are enabled
   - Provide fallback to regular notifications
   - Don't start activity if unread count is 0

4. **Testing**
   - Test on real device (Live Activities don't work in Simulator)
   - Test with Dynamic Island (iPhone 14 Pro+) and without
   - Test Lock Screen appearance in different states

## Troubleshooting

### Activity Not Showing
- Check if NSSupportsLiveActivities is in Info.plist
- Verify user has enabled Live Activities in Settings
- Ensure activity was started successfully (check logs)

### Updates Not Working
- Check update frequency limits
- Verify contentState is different from previous
- Ensure activity is still active (not ended)

### Push Token Issues
- Register for push notifications
- Handle activity push token in AppDelegate
- Send token to backend for remote updates

## Next Steps

1. Create Native Module bridge in React Native
2. Integrate with notification service
3. Add settings toggle for Live Activities
4. Implement push token registration
5. Add backend support for push updates

