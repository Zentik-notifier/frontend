import Foundation
import React

@objc(WatchConnectivityBridge)
class WatchConnectivityBridge: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func notifyWatchOfUpdate(_ resolve: @escaping RCTPromiseResolveBlock, rejecter reject: @escaping RCTPromiseRejectBlock) {
    print("📱 [WatchBridge] React Native requested to notify Watch")
    
    iPhoneWatchConnectivityManager.shared.notifyWatchOfUpdate()
    resolve(["success": true])
  }
}

