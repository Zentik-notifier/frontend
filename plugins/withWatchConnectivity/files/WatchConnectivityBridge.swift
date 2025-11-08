import Foundation
import React

@objc(WatchConnectivityBridge)
class WatchConnectivityBridge: RCTEventEmitter {
  
  public static var shared: WatchConnectivityBridge?
  
  override init() {
    super.init()
    WatchConnectivityBridge.shared = self
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  override func supportedEvents() -> [String]! {
    return [
      "onWatchNotificationRead",
      "onWatchNotificationUnread",
      "onWatchNotificationDeleted"
    ]
  }
  
  // MARK: - Event Emitters (called from WatchConnectivityManager)
  
  func emitNotificationRead(notificationId: String, readAt: String) {
    print("📱 [WatchBridge] 🔔 Emitting onWatchNotificationRead event for: \(notificationId)")
    sendEvent(withName: "onWatchNotificationRead", body: [
      "notificationId": notificationId,
      "readAt": readAt
    ])
    print("📱 [WatchBridge] ✅ Event emitted")
  }
  
  func emitNotificationUnread(notificationId: String) {
    print("📱 [WatchBridge] 🔔 Emitting onWatchNotificationUnread event for: \(notificationId)")
    sendEvent(withName: "onWatchNotificationUnread", body: [
      "notificationId": notificationId
    ])
    print("📱 [WatchBridge] ✅ Event emitted")
  }
  
  func emitNotificationDeleted(notificationId: String) {
    print("📱 [WatchBridge] 🔔 Emitting onWatchNotificationDeleted event for: \(notificationId)")
    sendEvent(withName: "onWatchNotificationDeleted", body: [
      "notificationId": notificationId
    ])
    print("📱 [WatchBridge] ✅ Event emitted")
  }
  
  @objc
  func notifyWatchOfUpdate(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch (reload)")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchOfUpdate()
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationRead(_ notificationId: String, readAt: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch: notification \(notificationId) marked as read")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationRead(notificationId: notificationId, readAt: readAt)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationUnread(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch: notification \(notificationId) marked as unread")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationUnread(notificationId: notificationId)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationsRead(_ notificationIds: [String], readAt: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch: \(notificationIds.count) notifications marked as read")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationsRead(notificationIds: notificationIds, readAt: readAt)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationDeleted(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch: notification \(notificationId) deleted")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationDeleted(notificationId: notificationId)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationAdded(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch: notification \(notificationId) added")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationAdded(notificationId: notificationId)
    resolve(["success": true])
  }
}