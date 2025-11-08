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
      "onWatchNotificationRead",
      "onWatchNotificationUnread",
      "onWatchNotificationDeleted"
    ]
  }
  
  // MARK: - Event Emitters (called from WatchConnectivityManager)
  
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
  func notifyWatchNotificationsRead(_ notificationIds: [String], readAt: String, resolver resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    logger.info(
      tag: "ReactNative→Watch",
      message: "React Native requested batch mark as read",
      metadata: ["count": String(notificationIds.count), "readAt": readAt, "action": "batchRead"],
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
}