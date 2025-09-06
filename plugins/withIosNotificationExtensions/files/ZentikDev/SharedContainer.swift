import Foundation
import React

@objc(SharedContainer)
class SharedContainer: NSObject {
  
  @objc
  static func requiresMainQueueSetup() -> Bool {
    return false
  }
  
  @objc
  func getSharedMediaCacheDirectory(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) {
    // Get the main bundle identifier
    guard let bundleIdentifier = Bundle.main.bundleIdentifier else {
      print("📱 [SharedContainer] ❌ Failed to get bundle identifier")
      reject("BUNDLE_ID_ERROR", "Failed to get bundle identifier", nil)
      return
    }
    
    let appGroupIdentifier = "group.\(bundleIdentifier)"
    
    // Get shared container URL
    guard let sharedContainerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) else {
      print("📱 [SharedContainer] ❌ Failed to get shared container URL for: \(appGroupIdentifier)")
      reject("SHARED_CONTAINER_ERROR", "Failed to get shared container URL", nil)
      return
    }
    
    let sharedCacheDirectory = sharedContainerURL.appendingPathComponent("shared_media_cache")
    
    // Create directory if it doesn't exist
    do {
      try FileManager.default.createDirectory(at: sharedCacheDirectory, withIntermediateDirectories: true, attributes: nil)
      
      // Create subdirectories for each media type
      let mediaTypes = ["IMAGE", "VIDEO", "GIF", "AUDIO", "ICON"]
      for mediaType in mediaTypes {
        let typeDir = sharedCacheDirectory.appendingPathComponent(mediaType)
        try FileManager.default.createDirectory(at: typeDir, withIntermediateDirectories: true, attributes: nil)
      }
    } catch {
      print("📱 [SharedContainer] ❌ Failed to create shared cache directory: \(error)")
      reject("DIRECTORY_ERROR", "Failed to create shared cache directory", error)
      return
    }
    
    let path = sharedCacheDirectory.path
    print("📱 [SharedContainer] ✅ Shared cache directory: \(path)")
    resolve(path)
  }
  
  @objc
  func getSharedUserDefaults(_ resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let bundleIdentifier = Bundle.main.bundleIdentifier else {
      reject("BUNDLE_ID_ERROR", "Failed to get bundle identifier", nil)
      return
    }
    
    let appGroupIdentifier = "group.\(bundleIdentifier)"
    guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("SHARED_DEFAULTS_ERROR", "Failed to get shared UserDefaults", nil)
      return
    }
    
    // Return all shared defaults as dictionary
    resolve(sharedDefaults.dictionaryRepresentation())
  }
  
  @objc
  func setSharedUserDefault(_ value: Any, forKey key: String, withResolver resolve: @escaping RCTPromiseResolveBlock, withRejecter reject: @escaping RCTPromiseRejectBlock) {
    guard let bundleIdentifier = Bundle.main.bundleIdentifier else {
      reject("BUNDLE_ID_ERROR", "Failed to get bundle identifier", nil)
      return
    }
    
    let appGroupIdentifier = "group.\(bundleIdentifier)"
    guard let sharedDefaults = UserDefaults(suiteName: appGroupIdentifier) else {
      reject("SHARED_DEFAULTS_ERROR", "Failed to get shared UserDefaults", nil)
      return
    }
    
    sharedDefaults.set(value, forKey: key)
    sharedDefaults.synchronize()
    resolve(nil)
  }
}
