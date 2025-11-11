import Foundation
import React

@objc(WatchConnectivityBridge)
class WatchConnectivityBridge: RCTEventEmitter {
  
  public static var shared: WatchConnectivityBridge?
  private let logger = LoggingSystem.shared
  
  override init() {
    super.init()
    WatchConnectivityBridge.shared = self
    logger.info(tag: "Init", message: "WatchConnectivityBridge initialized", source: "WatchBridge")
  }
  
  @objc
  override static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  override func supportedEvents() -> [String]! {
    return [
      "onWatchRefresh",
      "onWatchNotificationRead",
      "onWatchNotificationUnread",
      "onWatchNotificationDeleted"
    ]
  }
  
  // MARK: - Event Emitters (called from WatchConnectivityManager)
  
  func emitRefreshRequest() {
    logger.info(
      tag: "EmitEvent",
      message: "Emitting onWatchRefresh to React Native - Watch requested full sync from DB",
      metadata: ["event": "refreshRequest", "source": "watchRefreshButton"],
      source: "WatchBridge"
    )
    sendEvent(withName: "onWatchRefresh", body: [
      "timestamp": Date().timeIntervalSince1970,
      "source": "watchRefreshButton"
    ])
    logger.debug(tag: "EmitEvent", message: "Refresh request event emitted successfully", source: "WatchBridge")
  }
  
  func emitRefresh() {
    logger.info(
      tag: "EmitEvent",
      message: "Emitting onWatchRefresh to React Native - Watch requested full sync",
      metadata: ["event": "refresh"],
      source: "WatchBridge"
    )
    sendEvent(withName: "onWatchRefresh", body: [
      "timestamp": Date().timeIntervalSince1970
    ])
    logger.debug(tag: "EmitEvent", message: "Refresh event emitted successfully", source: "WatchBridge")
  }
  
  func emitNotificationRead(notificationId: String, readAt: String) {
    logger.info(
      tag: "EmitEvent",
      message: "Emitting onWatchNotificationRead to React Native",
      metadata: ["notificationId": notificationId, "readAt": readAt],
      source: "WatchBridge"
    )
    sendEvent(withName: "onWatchNotificationRead", body: [
      "notificationId": notificationId,
      "readAt": readAt
    ])
    logger.debug(tag: "EmitEvent", message: "Event emitted successfully", source: "WatchBridge")
  }
  
  func emitNotificationUnread(notificationId: String) {
    logger.info(
      tag: "EmitEvent",
      message: "Emitting onWatchNotificationUnread to React Native",
      metadata: ["notificationId": notificationId],
      source: "WatchBridge"
    )
    sendEvent(withName: "onWatchNotificationUnread", body: [
      "notificationId": notificationId
    ])
    logger.debug(tag: "EmitEvent", message: "Event emitted successfully", source: "WatchBridge")
  }
  
  func emitNotificationDeleted(notificationId: String) {
    logger.info(
      tag: "EmitEvent",
      message: "Emitting onWatchNotificationDeleted to React Native",
      metadata: ["notificationId": notificationId],
      source: "WatchBridge"
    )
    sendEvent(withName: "onWatchNotificationDeleted", body: [
      "notificationId": notificationId
    ])
    logger.debug(tag: "EmitEvent", message: "Event emitted successfully", source: "WatchBridge")
  }
  
  @objc
  func notifyWatchOfUpdate(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested Watch reload",
      metadata: ["action": "reload"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchOfUpdate()
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchToSyncIncremental(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested Watch incremental sync",
      metadata: ["action": "syncIncremental"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchToSyncIncremental()
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationRead(_ notificationId: String, readAt: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested mark as read",
      metadata: ["notificationId": notificationId, "readAt": readAt, "action": "read"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationRead(notificationId: notificationId, readAt: readAt)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationUnread(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested mark as unread",
      metadata: ["notificationId": notificationId, "action": "unread"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationUnread(notificationId: notificationId)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationsRead(_ notificationIds: [String], readAt: String?, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    let status = readAt != nil ? "read" : "unread"
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested batch mark as \(status)",
      metadata: ["count": String(notificationIds.count), "readAt": readAt ?? "null", "action": "batchStatusChange"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationsRead(notificationIds: notificationIds, readAt: readAt)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationDeleted(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested delete notification",
      metadata: ["notificationId": notificationId, "action": "delete"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationDeleted(notificationId: notificationId)
    resolve(["success": true])
  }
  
  @objc
  func notifyWatchNotificationAdded(_ notificationId: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested add notification",
      metadata: ["notificationId": notificationId, "action": "add"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.notifyWatchNotificationAdded(notificationId: notificationId)
    resolve(["success": true])
  }
  
  @objc
  func sendFullSyncToWatch(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested full sync via transferFile",
      metadata: ["action": "fullSync"],
      source: "WatchBridge"
    )
    
    iPhoneWatchConnectivityManager.shared.sendFullSyncToWatch { success, notificationsCount, bucketsCount in
      if success {
        self.logger.info(
          tag: "ReactNative→Watch",
          message: "Full sync sent successfully",
          metadata: [
            "notificationsCount": String(notificationsCount),
            "bucketsCount": String(bucketsCount)
          ],
          source: "WatchBridge"
        )
        resolve([
          "success": true,
          "notificationsCount": notificationsCount,
          "bucketsCount": bucketsCount
        ])
      } else {
        self.logger.error(
          tag: "ReactNative→Watch",
          message: "Failed to send full sync",
          source: "WatchBridge"
        )
        reject("FULL_SYNC_ERROR", "Failed to send full sync to Watch", nil)
      }
    }
  }
  
}
