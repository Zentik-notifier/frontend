//
//  NotificationController.swift
//  ZentikNotificationWatch
//
//  Created by Gianluca Ruocco on 08.08.25.
//

import WatchKit
import Foundation
import UserNotifications

class NotificationController: WKUserNotificationInterfaceController {

    // MARK: - Outlets
    @IBOutlet weak var iconImageView: WKInterfaceImage!
    @IBOutlet weak var titleLabel: WKInterfaceLabel!
    @IBOutlet weak var subtitleLabel: WKInterfaceLabel!
    @IBOutlet weak var bodyLabel: WKInterfaceLabel!
    @IBOutlet weak var mediaImageView: WKInterfaceImage!
    @IBOutlet weak var placeholderLabel: WKInterfaceLabel!
    
    // MARK: - Properties
    private var attachmentData: [[String: Any]] = []
    private var notificationTitleText: String = ""
    private var notificationSubtitleText: String = ""
    private var notificationBodyText: String = ""
    
    override init() {
        super.init()
        print("🍎⌚ [WatchNotification] NotificationController initialized")
    }
    
    override func awake(withContext context: Any?) {
        super.awake(withContext: context)
        print("🍎⌚ [WatchNotification] Controller awake with context: \(String(describing: context))")
        
        // Configure interface controller here
        setupInitialUI()
    }
    
    override func willActivate() {
        super.willActivate()
        print("🍎⌚ [WatchNotification] Controller will activate")
    }
    
    override func didDeactivate() {
        super.didDeactivate()
        print("🍎⌚ [WatchNotification] Controller did deactivate")
    }
    
    // MARK: - UNUserNotificationCenterDelegate
    
    override func didReceive(_ notification: UNNotification) {
        print("🍎⌚ [WatchNotification] ========== NOTIFICATION RECEIVED ==========")
        print("🍎⌚ [WatchNotification] Title: \(notification.request.content.title)")
        print("🍎⌚ [WatchNotification] Body: \(notification.request.content.body)")
        print("🍎⌚ [WatchNotification] Subtitle: \(notification.request.content.subtitle)")
        print("🍎⌚ [WatchNotification] Category: \(notification.request.content.categoryIdentifier)")
        print("🍎⌚ [WatchNotification] Attachments count: \(notification.request.content.attachments.count)")
        print("🍎⌚ [WatchNotification] UserInfo: \(notification.request.content.userInfo)")
        
        // Store notification content
        notificationTitleText = notification.request.content.title
        notificationSubtitleText = notification.request.content.subtitle
        notificationBodyText = notification.request.content.body
        
        // Extract attachment data from userInfo
        if let data = notification.request.content.userInfo["attachmentData"] as? [[String: Any]] {
            attachmentData = data
            print("🍎⌚ [WatchNotification] AttachmentData count: \(attachmentData.count)")
            print("🍎⌚ [WatchNotification] AttachmentData content: \(attachmentData)")
        } else {
            print("🍎⌚ [WatchNotification] ❌ No attachmentData found in userInfo")
            attachmentData = []
        }
        
        // Update UI with notification content
        setupNotificationUI()
    }
    
    // Apple Watch doesn't use UNNotificationContentExtensionResponseOption
    // Actions are handled differently on watchOS
    
    // MARK: - Setup Methods
    
    private func setupInitialUI() {
        // Set initial placeholder state
        titleLabel.setText("Zentik Notification")
        subtitleLabel.setText("")
        bodyLabel.setText("Loading...")
        placeholderLabel.setText("Loading notification content...")
        mediaImageView.setHidden(true)
        placeholderLabel.setHidden(false)
        
        // Hide icon initially
        iconImageView.setHidden(true)
        
        print("🍎⌚ [WatchNotification] ✅ Initial UI setup completed")
    }
    
    private func setupNotificationUI() {
        print("🍎⌚ [WatchNotification] 🎨 Setting up notification UI")
        
        // Set texts
        titleLabel.setText(notificationTitleText.isEmpty ? "Zentik" : notificationTitleText)
        
        // Handle subtitle - hide if empty
        if notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            subtitleLabel.setHidden(true)
        } else {
            subtitleLabel.setText(notificationSubtitleText)
            subtitleLabel.setHidden(false)
        }
        
        // Handle body - hide if empty
        if notificationBodyText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty {
            bodyLabel.setHidden(true)
        } else {
            bodyLabel.setText(notificationBodyText)
            bodyLabel.setHidden(false)
        }
        
        // Handle icon - look for ICON media type
        setupIconImage()
        
        // Handle media content - look for first non-ICON media
        setupMediaContent()
        
        print("🍎⌚ [WatchNotification] ✅ Notification UI setup completed")
    }
    
    private func setupIconImage() {
        print("🍎⌚ [WatchNotification] 🖼️ Setting up icon image")
        
        // Look for ICON media type in attachmentData
        if let iconData = attachmentData.first(where: { ($0["mediaType"] as? String ?? "").uppercased() == "ICON" }) {
            print("🍎⌚ [WatchNotification] Found ICON media type")
            
            if let iconUrl = iconData["url"] as? String {
                print("🍎⌚ [WatchNotification] Loading icon from URL: \(iconUrl)")
                loadIconFromURL(iconUrl)
                return
            }
        }
        
        // Fallback to app icon if no ICON media type found
        print("🍎⌚ [WatchNotification] No ICON media found, using default icon")
        iconImageView.setImageNamed("app-icon")
        iconImageView.setHidden(false)
    }
    
    private func setupMediaContent() {
        print("🍎⌚ [WatchNotification] 📱 Setting up media content")
        
        // Find first non-ICON, non-AUDIO media
        let mediaItem = attachmentData.first { item in
            let mediaTypeString = (item["mediaType"] as? String ?? "").uppercased()
            return mediaTypeString != "ICON" && mediaTypeString != "AUDIO"
        }
        
        guard let mediaItem = mediaItem else {
            print("🍎⌚ [WatchNotification] No displayable media found, showing placeholder")
            showPlaceholder("Tap to view in app")
            return
        }
        
        let mediaTypeString = mediaItem["mediaType"] as? String ?? "UNKNOWN"
        print("🍎⌚ [WatchNotification] Found media type: \(mediaTypeString)")
        
        guard let mediaUrlString = mediaItem["url"] as? String,
              let mediaUrl = URL(string: mediaUrlString) else {
            print("🍎⌚ [WatchNotification] ❌ Invalid media URL")
            showPlaceholder("Invalid media URL")
            return
        }
        
        // For Apple Watch, we primarily focus on images since video/complex media is limited
        switch mediaTypeString.uppercased() {
        case "IMAGE", "GIF":
            loadMediaImage(from: mediaUrl, mediaType: mediaTypeString)
        case "VIDEO":
            showVideoPlaceholder()
        default:
            showPlaceholder("Unsupported media type: \(mediaTypeString)")
        }
    }
    
    private func loadIconFromURL(_ urlString: String) {
        guard let url = URL(string: urlString) else {
            print("🍎⌚ [WatchNotification] ❌ Invalid icon URL: \(urlString)")
            return
        }
        
        print("🍎⌚ [WatchNotification] 🔄 Loading icon from: \(url.absoluteString)")
        
        // Use URLSession to download icon
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("🍎⌚ [WatchNotification] ❌ Icon download failed: \(error.localizedDescription)")
                return
            }
            
            guard let data = data else {
                print("🍎⌚ [WatchNotification] ❌ Failed to get icon data")
                return
            }
            
            DispatchQueue.main.async {
                print("🍎⌚ [WatchNotification] ✅ Icon loaded successfully")
                self.iconImageView.setImageData(data)
                self.iconImageView.setHidden(false)
            }
        }.resume()
    }
    
    private func loadMediaImage(from url: URL, mediaType: String) {
        print("🍎⌚ [WatchNotification] 🔄 Loading media image: \(mediaType) from \(url.absoluteString)")
        
        // Use URLSession to download media
        URLSession.shared.dataTask(with: url) { [weak self] data, response, error in
            guard let self = self else { return }
            
            if let error = error {
                print("🍎⌚ [WatchNotification] ❌ Media download failed: \(error.localizedDescription)")
                DispatchQueue.main.async {
                    self.showPlaceholder("Download failed")
                }
                return
            }
            
            guard let data = data else {
                print("🍎⌚ [WatchNotification] ❌ Failed to get media data")
                DispatchQueue.main.async {
                    self.showPlaceholder("Invalid image data")
                }
                return
            }
            
            DispatchQueue.main.async {
                print("🍎⌚ [WatchNotification] ✅ Media image loaded successfully")
                
                // Show the media image
                self.mediaImageView.setImageData(data)
                self.mediaImageView.setHidden(false)
                self.placeholderLabel.setHidden(true)
                
                // For GIFs, show a special indicator since WatchKit doesn't animate GIFs
                if mediaType.uppercased() == "GIF" {
                    // We could overlay a small "GIF" badge or indicator here
                    print("🍎⌚ [WatchNotification] 📱 Media is GIF (static on Watch)")
                }
            }
        }.resume()
    }
    
    private func showVideoPlaceholder() {
        print("🍎⌚ [WatchNotification] 📹 Showing video placeholder")
        
        // Show video placeholder message
        showPlaceholder("📹 Video content available in app")
    }
    
    private func showPlaceholder(_ message: String) {
        print("🍎⌚ [WatchNotification] 💬 Showing placeholder: \(message)")
        
        mediaImageView.setHidden(true)
        placeholderLabel.setText(message)
        placeholderLabel.setHidden(false)
    }
    
    // MARK: - Action Handling
    
    private func handleNotificationTap() {
        print("🍎⌚ [WatchNotification] 🎬 Handling notification tap")
        
        // For watch notifications, we'll primarily handle tap-to-open behavior
        // Action buttons are less common on Apple Watch notifications
        
        // Extract data from stored notification content
        // This would be used when the notification interface is tapped
        print("🍎⌚ [WatchNotification] 🚀 Opening main app")
        
        // Request to open the main app with a deep link
        let deepLinkURL = URL(string: "zentik://")!
        WKExtension.shared().openSystemURL(deepLinkURL)
    }
}
