//
//  ExtensionDelegate.swift
//  ZentikNotificationWatch
//
//  Created by Gianluca Ruocco on 08.08.25.
//

import WatchKit
import Foundation
import UserNotifications

class ExtensionDelegate: NSObject, WKExtensionDelegate {
    
    override init() {
        super.init()
        print("🍎⌚ [WatchExtension] ExtensionDelegate initialized")
    }
    
    func applicationDidFinishLaunching() {
        print("🍎⌚ [WatchExtension] Application did finish launching")
        
        // Request notification permissions
        requestNotificationPermissions()
    }
    
    func applicationDidBecomeActive() {
        print("🍎⌚ [WatchExtension] Application did become active")
        
        // Check for pending deep links from notifications
        checkForPendingDeepLinks()
    }
    
    func applicationWillResignActive() {
        print("🍎⌚ [WatchExtension] Application will resign active")
    }
    
    func applicationWillEnterForeground() {
        print("🍎⌚ [WatchExtension] Application will enter foreground")
    }
    
    func applicationDidEnterBackground() {
        print("🍎⌚ [WatchExtension] Application did enter background")
    }
    
    // MARK: - Notification Permissions
    
    private func requestNotificationPermissions() {
        UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .sound, .badge]) { granted, error in
            DispatchQueue.main.async {
                if granted {
                    print("🍎⌚ [WatchExtension] ✅ Notification permissions granted")
                } else {
                    print("🍎⌚ [WatchExtension] ❌ Notification permissions denied")
                    if let error = error {
                        print("🍎⌚ [WatchExtension] Permission error: \(error.localizedDescription)")
                    }
                }
            }
        }
    }
    
    // MARK: - Deep Link Handling
    
    private func checkForPendingDeepLinks() {
        guard let sharedDefaults = UserDefaults(suiteName: "{{MAIN_BUNDLE_ID}}.shared") else {
            print("🍎⌚ [WatchExtension] ❌ Cannot access shared UserDefaults")
            return
        }
        
        // Check if there's a pending deep link from notification tap
        if let bucketId = sharedDefaults.string(forKey: "pendingBucketId") {
            let messageId = sharedDefaults.string(forKey: "pendingMessageId")
            let timestamp = sharedDefaults.double(forKey: "pendingDeepLinkTimestamp")
            
            // Only process recent deep links (within last 30 seconds)
            let now = Date().timeIntervalSince1970
            if now - timestamp < 30 {
                print("🍎⌚ [WatchExtension] 🔗 Processing pending deep link: bucket=\(bucketId), message=\(String(describing: messageId))")
                
                // Clear the pending data
                sharedDefaults.removeObject(forKey: "pendingBucketId")
                sharedDefaults.removeObject(forKey: "pendingMessageId")
                sharedDefaults.removeObject(forKey: "pendingDeepLinkTimestamp")
                sharedDefaults.synchronize()
                
                // Handle the deep link (open main app)
                handleDeepLink(bucketId: bucketId, messageId: messageId)
            } else {
                print("🍎⌚ [WatchExtension] ⏰ Pending deep link expired (timestamp: \(timestamp), now: \(now))")
            }
        }
    }
    
    private func handleDeepLink(bucketId: String, messageId: String?) {
        print("🍎⌚ [WatchExtension] 🚀 Handling deep link to bucketId: \(bucketId)")
        
        // Create deep link URL
        var urlString = "zentik://bucket/\(bucketId)"
        if let messageId = messageId {
            urlString += "/message/\(messageId)"
        }
        
        guard let url = URL(string: urlString) else {
            print("🍎⌚ [WatchExtension] ❌ Invalid deep link URL: \(urlString)")
            return
        }
        
        // Open the main app with the deep link
        WKExtension.shared().openSystemURL(url)
        print("🍎⌚ [WatchExtension] ✅ Requested to open main app with URL: \(url.absoluteString)")
    }
}
