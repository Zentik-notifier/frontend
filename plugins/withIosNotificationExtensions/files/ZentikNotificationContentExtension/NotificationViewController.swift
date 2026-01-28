//
//  NotificationViewController.swift
//  ZentikNotificationContentExtension
//
//  Created by Gianluca Ruocco on 08.08.25.
//

import UIKit
import UserNotifications
import UserNotificationsUI
import AVKit
import AVFoundation
import WebKit
import Security
import SQLite3
import MobileCoreServices
import SafariServices
import CloudKit

// SQLite helper for Swift bindings
private let SQLITE_TRANSIENT = unsafeBitCast(-1, to: sqlite3_destructor_type.self)

class NotificationViewController: UIViewController, UNNotificationContentExtension {
    
    // MARK: - Properties
    
    // Media players
    private var player: AVPlayer?
    private var playerLayer: AVPlayerLayer?
    private var timeObserverToken: Any?
    private var timeObserverPlayer: AVPlayer? // Track which player created the observer
    private var isObservingPlayerStatus: Bool = false
    private var isObservingPlayerItemStatus: Bool = false
    private weak var observedPlayerForStatus: AVPlayer?
    private weak var observedPlayerItemForStatus: AVPlayerItem?
    
    // UI Components
    private var mediaContainerView: UIView?
    private var imageView: UIImageView?
    private var webView: WKWebView?
    private var audioVisualizationView: UIView?
    private var headerView: UIView?
    private var footerContainerView: UIView?
    private var headerTitleLabel: UILabel?
    private var headerSubtitleLabel: UILabel?
    private var headerBodyLabel: UILabel?
    private var headerIconImageView: UIImageView?
    private var mediaHeightConstraint: NSLayoutConstraint?
    private var footerTopToContainerConstraint: NSLayoutConstraint?
    private var headerBottomConstraint: NSLayoutConstraint?

    private var loadingIndicator: UIActivityIndicatorView?
    
    // Database queue for thread-safe operations
    private static let dbQueue = DispatchQueue(label: "com.zentik.nce.database", qos: .userInitiated)
    
    // Database operation configuration
    private static let DB_OPERATION_TIMEOUT: TimeInterval = 10.0  // Max 10 seconds per operation (NCE has more time)
    private static let DB_BUSY_TIMEOUT: Int32 = 5000  // 5 seconds busy timeout
    private static let DB_MAX_RETRIES: Int = 5  // Max 5 retry attempts (NCE can retry more)
    
    // Media selector for expanded mode
    private var mediaSelectorView: UIScrollView?
    private var mediaThumbnails: [UIButton] = []
    private var selectedMediaIndex: Int = 0
    
    // Media controls
    private var controlsView: UIView?
    private var playPauseButton: UIButton?
    private var timeSlider: UISlider?
    private var currentTimeLabel: UILabel?
    private var durationLabel: UILabel?
    
    // Data
    private var attachments: [UNNotificationAttachment] = []
    private var attachmentData: [[String: Any]] = []
    private var isExpandedMode: Bool = false
    
    // Footer state management
    private var isFooterHiddenForError: Bool = false
    
    // Download management
    private var currentDownloadTask: URLSessionDownloadTask?
    private var mediaLoadingIndicator: UIActivityIndicatorView?
    private var errorView: UIView?
    
    // Cleanup state management
    private var isCleaningUp: Bool = false
    private var downloadCTAButton: UIButton?

    // Stored notification texts
    private var notificationTitleText: String = ""
    private var notificationSubtitleText: String = ""
    private var notificationBodyText: String = ""
    private var audioInfoView: UIView?
    
    // Current notification data for tap actions
    private var currentNotificationUserInfo: [AnyHashable: Any]?
    private var currentNotificationRequestIdentifier: String?
    
    // Outlets (if you use Storyboard)
    @IBOutlet weak var bodyLabel: UILabel?
    @IBOutlet weak var titleLabel: UILabel?
    @IBOutlet weak var containerView: UIView?
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        // Clean up any residual observers from previous instances
        cleanupAllObservers()
        
        setupUI()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        updateLayout()
    }
    
    // MARK: - UNNotificationContentExtension
    
    func didReceive(_ notification: UNNotification) {
        // Reset footer state for new notification
        isFooterHiddenForError = false
        
        // Clean up any previous media and observers before processing new notification
        cleanupCurrentMedia()
        
        // Log NCE initialization with complete information
        // Extract notification ID from userInfo (nid/n) or fallback to request identifier
        let userInfo = notification.request.content.userInfo
        let rawNid = (userInfo["nid"] as? String) ?? (userInfo["n"] as? String) ?? (userInfo["notificationId"] as? String)
        let notificationId = SharedUtils.normalizeUUID(rawNid) ?? notification.request.identifier
        
        let categoryId = notification.request.content.categoryIdentifier.lowercased()
        
        var initMeta: [String: Any] = [
            "notificationId": notificationId,
            "requestIdentifier": notification.request.identifier,
            "title": notification.request.content.title,
            "body": notification.request.content.body,
            "subtitle": notification.request.content.subtitle,
            "categoryIdentifier": categoryId,
            "badge": notification.request.content.badge ?? 0
        ]
        
        // Add actions data
        if let actionsData = (notification.request.content.userInfo["actions"] as? [[String: Any]]) ?? (notification.request.content.userInfo["act"] as? [[String: Any]]) ?? (notification.request.content.userInfo["a"] as? [[String: Any]]) {
            initMeta["actions"] = actionsData
            initMeta["actionsCount"] = actionsData.count
        } else {
            initMeta["actionsCount"] = 0
        }
        
        // Add attachments data (prefer attachmentData from NSE, fallback to att)
        var attachmentsCount = 0
        if let processedAttachmentData = notification.request.content.userInfo["attachmentData"] as? [[String: Any]] {
            initMeta["attachmentData"] = processedAttachmentData
            attachmentsCount = processedAttachmentData.count
        } else if let attachmentStrings = notification.request.content.userInfo["att"] as? [String] {
            let attachmentObjects = attachmentStrings.compactMap { item -> [String: Any]? in
                let parts = item.split(separator: ":", maxSplits: 1)
                if parts.count == 2 {
                    return ["mediaType": String(parts[0]), "url": String(parts[1])]
                }
                return nil
            }
            initMeta["attachmentData"] = attachmentObjects
            attachmentsCount = attachmentObjects.count
        }
        initMeta["attachmentsCount"] = attachmentsCount
        
        // Add bucket info: prefer bid from userInfo, fallback to threadIdentifier
        let rawBucketId = (notification.request.content.userInfo["bid"] as? String) ?? (notification.request.content.userInfo["b"] as? String) ?? (notification.request.content.threadIdentifier as? String)
        let bucketId = SharedUtils.normalizeUUID(rawBucketId)
        let bucketIconUrl = notification.request.content.userInfo["bi"] as? String
        
        if let bucketId = bucketId {
            initMeta["bucketId"] = bucketId
            // Icon retrieved from fileSystem, default color #007AFF
            initMeta["hasBucketIcon"] = MediaAccess.getBucketIconFromSharedCache(bucketId: bucketId, bucketName: nil, bucketColor: "#007AFF", iconUrl: bucketIconUrl) != nil
        }
        
        logToDatabase(
            level: "info",
            tag: "Lifecycle",
            message: "NCE initialized for notification",
            metadata: initMeta
        )
        
        if let actionsData = (notification.request.content.userInfo["actions"] as? [[String: Any]]) ?? (notification.request.content.userInfo["act"] as? [[String: Any]]) ?? (notification.request.content.userInfo["a"] as? [[String: Any]]) {
        } else {
        }
        
        if let actionsData = (notification.request.content.userInfo["actions"] as? [[String: Any]]) ?? (notification.request.content.userInfo["act"] as? [[String: Any]]) ?? (notification.request.content.userInfo["a"] as? [[String: Any]]) {
            
            let notificationActions = actionsData.compactMap { actionData -> UNNotificationAction? in
                let normalized = NotificationActionHandler.normalizeAction(actionData, notificationId: notificationId)
                guard let type = normalized?["type"] as? String,
                      let value = normalized?["value"] as? String else {
                    
                    logToDatabase(
                        level: "WARN",
                        tag: "Actions",
                        message: "Invalid action data",
                        metadata: [
                            "notificationId": notificationId,
                            "actionData": String(describing: actionData)
                        ]
                    )
                    return nil
                }
                
                let title = actionData["title"] as? String ?? value
                let destructive = actionData["destructive"] as? Bool ?? false
                let authRequired = actionData["authRequired"] as? Bool ?? true
                let actionId = "action_\(type)_\(value)"
                
                var options: UNNotificationActionOptions = []
                if destructive { options.insert(.destructive) }
                if authRequired { options.insert(.authenticationRequired) }
                
                var icon: UNNotificationActionIcon?
                if let iconName = actionData["icon"] as? String, !iconName.isEmpty {
                    let actualIconName = iconName.hasPrefix("sfsymbols:")
                        ? String(iconName.dropFirst("sfsymbols:".count))
                        : iconName
                    icon = UNNotificationActionIcon(systemImageName: actualIconName)
                }
                
                
                return UNNotificationAction(
                    identifier: actionId,
                    title: title,
                    options: options,
                    icon: icon
                )
            }
            
            
            // Inject actions into extension context
            if !notificationActions.isEmpty {
                extensionContext?.notificationActions = notificationActions
                
                // Log all action identifiers for debugging
                let actionIdentifiers = notificationActions.map { $0.identifier }.joined(separator: ", ")
            } else {
                
                // Reset actions when there are no valid actions
                extensionContext?.notificationActions = []
                
                logToDatabase(
                    level: "WARN",
                    tag: "Actions",
                    message: "No valid actions to inject",
                    metadata: [
                        "notificationId": notificationId,
                        "categoryId": categoryId,
                        "originalActionsCount": actionsData.count
                    ]
                )
            }
        } else {
            
            // Reset actions when there are no actions in userInfo
            extensionContext?.notificationActions = []
        }
        
        // Store notification texts
        notificationTitleText = notification.request.content.title
        
        // NSE may have prepended subtitle to body with newline separator
        // We need to extract it to avoid duplication in the NCE UI
        let rawBody = notification.request.content.body
        if rawBody.contains("\n") {
            // Body contains newline, likely subtitle was prepended
            let parts = rawBody.components(separatedBy: "\n")
            if parts.count >= 2 {
                notificationSubtitleText = parts[0]
                notificationBodyText = parts.dropFirst().joined(separator: "\n")
            } else {
                notificationSubtitleText = notification.request.content.subtitle
                notificationBodyText = rawBody
            }
        } else {
            // No newline, use original subtitle and body
            notificationSubtitleText = notification.request.content.subtitle
            notificationBodyText = rawBody
        }

        // ---------------------------------------------------------------------
        // Fallback title/body formatting (NCE)
        // Keep behavior aligned with NSE and Widget: if only one of title/body is present,
        // show the message in the body and use the bucket name (from SQLite) as title.
        // ---------------------------------------------------------------------
        var bucketIdForLookup: String? = nil
        if let ui = currentNotificationUserInfo {
            if let rawBid = (ui["bid"] as? String) ?? (ui["b"] as? String) {
                bucketIdForLookup = SharedUtils.normalizeUUID(rawBid)
            }
        }

        let fallback = DatabaseAccess.applySingleTextFieldTitleBodyBucketFallback(
            title: notificationTitleText,
            body: notificationBodyText,
            bucketIdForLookup: bucketIdForLookup,
            bucketNameFromPayload: nil,
            source: "NCE"
        )
        if fallback.applied {
            notificationTitleText = fallback.title
            notificationBodyText = fallback.body
        }
        
        // Store current notification data for tap actions
        currentNotificationUserInfo = notification.request.content.userInfo
        currentNotificationRequestIdentifier = notification.request.identifier
        
        // Store attachments and data
        attachments = notification.request.content.attachments
        
        // Prefer attachmentData (already processed by NSE), fallback to att (raw string array)
        if let processedAttachmentData = notification.request.content.userInfo["attachmentData"] as? [[String: Any]] {
            attachmentData = processedAttachmentData
        } else if let attachmentStrings = notification.request.content.userInfo["att"] as? [String] {
            // Convert raw string array to object array
            attachmentData = attachmentStrings.compactMap { item -> [String: Any]? in
                let parts = item.split(separator: ":", maxSplits: 1)
                if parts.count == 2 {
                    return ["mediaType": String(parts[0]), "url": String(parts[1])]
                }
                return nil
            }
        } else {
            attachmentData = []
        }
        
                // Content Extension is ALWAYS in expanded mode
        // Compact mode is handled by NotificationService alone
        isExpandedMode = true
        
        // Setup expanded mode
        setupExpandedMode()
        // Adjust header lines after receiving content
        adjustHeaderLineCounts()
    }
    
    func didReceive(_ response: UNNotificationResponse, completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {
        
        let userInfo = response.notification.request.content.userInfo
        // Use nid from userInfo (new format), fallback to notificationId (old format), then request.identifier
        // Normalize just in case NSE didn't run or failed
        let rawNid = (userInfo["nid"] as? String) ?? (userInfo["n"] as? String) ?? (userInfo["notificationId"] as? String)
        let notificationId = SharedUtils.normalizeUUID(rawNid) ?? response.notification.request.identifier
        
        // Check if actions data is available in userInfo
        if let actionsData = userInfo["actions"] as? [[String: Any]] {
        } else {
        }
        
        // Check if this is a dynamic action
        let isDynamicAction = response.actionIdentifier.hasPrefix("action_")
        
        // Find the action details from userInfo
        var actionDetails: [String: Any] = [
            "notificationId": notificationId,
            "requestIdentifier": response.notification.request.identifier,
            "actionIdentifier": response.actionIdentifier,
            "categoryId": response.notification.request.content.categoryIdentifier,
            "isDynamicAction": isDynamicAction
        ]
        
        // Try to find the specific action details in the actions array
        if let actionsData = userInfo["actions"] as? [[String: Any]] {
            if isDynamicAction {
                // Try exact match first by building the identifier from each action
                if let matchedAction = actionsData.first(where: { action in
                    guard let type = action["type"] as? String,
                          let value = action["value"] as? String else { return false }
                    let expectedIdentifier = "action_\(type)_\(value)"
                    return response.actionIdentifier == expectedIdentifier
                }) {
                    // Add found action details (as structured object, not stringified)
                    actionDetails["actionFound"] = true
                    actionDetails["actionType"] = matchedAction["type"]
                    actionDetails["actionValue"] = matchedAction["value"]
                    actionDetails["actionTitle"] = matchedAction["title"]
                    if let destructive = matchedAction["destructive"] {
                        actionDetails["actionDestructive"] = destructive
                    }
                    if let icon = matchedAction["icon"] {
                        actionDetails["actionIcon"] = icon
                    }
                } else {
                    actionDetails["actionFound"] = false
                }
            }
        }
        
        // Log user action with complete details
        logToDatabase(
            level: "info",
            tag: "UserAction",
            message: "User action triggered in NCE",
            metadata: actionDetails
        )
        
        // Close UI immediately to prevent blocking
        completion(.dismiss)

        // Execute action in background without blocking UI
        DispatchQueue.global(qos: .background).async { [weak self] in
            self?.handleNotificationActionInBackground(response: response)
        }
    }
    
    // MARK: - Setup Methods
    
    private func setupUI() {
        // Header (icon + texts)
        let header = UIView()
        view.addSubview(header)
        headerView = header
        header.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            header.topAnchor.constraint(equalTo: view.topAnchor, constant: 8),
            header.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 12),
            header.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -12)
        ])

        let iconView = UIImageView()
        iconView.contentMode = .scaleAspectFit
        iconView.layer.cornerRadius = 25
        iconView.clipsToBounds = true
        iconView.backgroundColor = .secondarySystemBackground
        iconView.widthAnchor.constraint(equalToConstant: 50).isActive = true
        iconView.heightAnchor.constraint(equalToConstant: 50).isActive = true
        headerIconImageView = iconView

        // Load bucket icon if available
        if let iconData = attachmentData.first(where: { ($0["mediaType"] as? String ?? "").uppercased() == "ICON" }),
           let iconUrl = iconData["url"] as? String {
            // Ensure icon is visible since we have an ICON attachment
            iconView.isHidden = false
            loadIconFromSharedCache(iconUrl: iconUrl, iconImageView: iconView)
        } 
        // else {
            // Try to find app icon
            // var fallbackImage: UIImage?
            
            // // Try different app icon names
            // let appIconNames = ["AppIcon", "AppIcon-60", "AppIcon-76", "AppIcon-83.5", "AppIcon-1024"]
            // for iconName in appIconNames {
            //     if let appIcon = UIImage(named: iconName) {
            //         fallbackImage = appIcon
            //         break
            //     }
            // }
            
            // if let appIcon = fallbackImage {
            //     iconView.image = appIcon
            //     iconView.isHidden = false
            // } else {
            //     // Hide icon completely if no app icon is available
            //     iconView.isHidden = true
            // }
        // }

        let labelsStack = UIStackView()
        labelsStack.axis = .vertical
        labelsStack.alignment = .fill
        labelsStack.spacing = 2
        labelsStack.setContentCompressionResistancePriority(.required, for: .vertical)
        labelsStack.setContentHuggingPriority(.required, for: .vertical)
        
        let title = UILabel()
        title.font = .systemFont(ofSize: 16, weight: .semibold)
        title.textColor = .label
        title.numberOfLines = 0  // Auto-resize based on content
        title.text = notificationTitleText.isEmpty ? "" : notificationTitleText
        title.setContentCompressionResistancePriority(.required, for: .vertical)
        title.setContentHuggingPriority(.required, for: .vertical)
        headerTitleLabel = title
        
        let subtitle = UILabel()
        subtitle.font = .systemFont(ofSize: 12)
        subtitle.textColor = .secondaryLabel
        subtitle.numberOfLines = 0  // Auto-resize based on content
        subtitle.text = notificationSubtitleText
        subtitle.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        subtitle.setContentCompressionResistancePriority(.required, for: .vertical)
        subtitle.setContentHuggingPriority(.required, for: .vertical)
        headerSubtitleLabel = subtitle
        
        let body = UILabel()
        body.font = .systemFont(ofSize: 12)
        body.textColor = .secondaryLabel
        body.numberOfLines = 0  // Auto-resize based on content
        body.text = normalizeLineSeparators(notificationBodyText)
        body.setContentCompressionResistancePriority(.required, for: .vertical)
        body.setContentHuggingPriority(.required, for: .vertical)
        headerBodyLabel = body
        
        labelsStack.addArrangedSubview(title)
        labelsStack.addArrangedSubview(subtitle)
        labelsStack.addArrangedSubview(body)
        
        let headerStack = UIStackView(arrangedSubviews: [iconView, labelsStack])
        headerStack.axis = .horizontal
        headerStack.alignment = .center
        headerStack.spacing = 10
        header.addSubview(headerStack)
        headerStack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            headerStack.topAnchor.constraint(equalTo: header.topAnchor, constant: 8),
            headerStack.leadingAnchor.constraint(equalTo: header.leadingAnchor),
            headerStack.trailingAnchor.constraint(equalTo: header.trailingAnchor),
            headerStack.bottomAnchor.constraint(equalTo: header.bottomAnchor, constant: -8)
        ])
        
        // Add tap gesture recognizer to header
        let tapGesture = UITapGestureRecognizer(target: self, action: #selector(headerTapped))
        header.addGestureRecognizer(tapGesture)
        header.isUserInteractionEnabled = true

        // Media container
        let container = UIView()
        container.backgroundColor = .black
        container.clipsToBounds = true
        view.addSubview(container)
        mediaContainerView = container
        container.translatesAutoresizingMaskIntoConstraints = false
        let heightConstraint = container.heightAnchor.constraint(equalToConstant: 200)
        heightConstraint.priority = .defaultHigh
        mediaHeightConstraint = heightConstraint
        NSLayoutConstraint.activate([
            container.topAnchor.constraint(equalTo: header.bottomAnchor, constant: 8),
            container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            heightConstraint
        ])
        
        // Add tap gesture recognizer to media container (for images/GIFs)
        // Note: Video controls will be handled separately by AVPlayerViewController
        let mediaTapGesture = UITapGestureRecognizer(target: self, action: #selector(mediaContainerTapped))
        container.addGestureRecognizer(mediaTapGesture)
        container.isUserInteractionEnabled = true

        // Footer selector will be created lazily only when needed
        footerContainerView = nil
        footerTopToContainerConstraint = nil

        // Hide default labels
            bodyLabel?.isHidden = true
            titleLabel?.isHidden = true
    }

    // Normalizza separatori di riga Unicode e ritorni a capo misti in "\n"
    private func normalizeLineSeparators(_ text: String) -> String {
        var s = text
        // U+2028 (LINE SEPARATOR), U+2029 (PARAGRAPH SEPARATOR)
        s = s.replacingOccurrences(of: "\u{2028}", with: "\n")
        s = s.replacingOccurrences(of: "\u{2029}", with: "\n")
        // Normalizza CRLF e CR a LF
        s = s.replacingOccurrences(of: "\r\n", with: "\n")
        s = s.replacingOccurrences(of: "\r", with: "\n")
        return s
    }

    // MARK: - Dynamic Header Setup with Auto Layout
    private func adjustHeaderLineCounts() {
        guard let titleLabel = headerTitleLabel,
              let subtitleLabel = headerSubtitleLabel,
              let bodyLabel = headerBodyLabel else { 
            return 
        }

        // Calcola la larghezza disponibile per il wrapping delle label
        let totalWidth = view.bounds.width
        let horizontalInsets: CGFloat = 12 + 12
        let headerStackInsets: CGFloat = 8 + 8
        let iconWidth: CGFloat = (headerIconImageView?.isHidden ?? false) ? 0 : 50
        let spacing: CGFloat = (headerIconImageView?.isHidden ?? false) ? 0 : 10
        let availableWidth = max(100, totalWidth - horizontalInsets - headerStackInsets - iconWidth - spacing)
        
        // Imposta preferredMaxLayoutWidth per consentire il wrapping corretto
        titleLabel.preferredMaxLayoutWidth = availableWidth
        subtitleLabel.preferredMaxLayoutWidth = availableWidth
        bodyLabel.preferredMaxLayoutWidth = availableWidth
        
        // Aggiorna il testo normalizzato
        titleLabel.text = normalizeLineSeparators(notificationTitleText)
        subtitleLabel.text = normalizeLineSeparators(notificationSubtitleText)
        subtitleLabel.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        bodyLabel.text = normalizeLineSeparators(notificationBodyText)
        
        // Imposta numberOfLines = 0 per auto-sizing (già fatto in setupUI)
        // Questo permette alle label di crescere in base al contenuto
        
    }
    

    
    private func setupExpandedMode() {
        // Use attachmentData (all media) instead of attachments (only NSE downloaded media)
        if attachmentData.isEmpty {
            // Show only header when no attachments are available
            headerTitleLabel?.text = notificationTitleText
            headerSubtitleLabel?.text = notificationSubtitleText
            headerSubtitleLabel?.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
            headerBodyLabel?.text = normalizeLineSeparators(notificationBodyText)
            refreshHeaderIcon()
            
            // Keep a tiny spacer container visible to help the host respect dynamic height
            mediaContainerView?.isHidden = false
            mediaContainerView?.backgroundColor = .clear
            mediaHeightConstraint?.constant = 1
            if let footer = footerContainerView {
                footer.removeFromSuperview()
                footerContainerView = nil
            }
            // Recalculate header lines and preferred size in header-only mode
            adjustHeaderLineCounts()
            let expected = computeHeaderExpectedHeight()
            // Host can ignore smaller increases; enforce via a min bump for header-only
            let minHeaderOnlyHeight: CGFloat = expected
            preferredContentSize = CGSize(width: view.bounds.width, height: minHeaderOnlyHeight)
            return
        }

        // Header (text + icon) shown immediately so first frame has no delay
        headerTitleLabel?.text = notificationTitleText
        headerSubtitleLabel?.text = notificationSubtitleText
        headerSubtitleLabel?.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        headerBodyLabel?.text = normalizeLineSeparators(notificationBodyText)
        refreshHeaderIcon()

        let hasNonIcon = attachmentData.contains { item in
            let t = (item["mediaType"] as? String ?? "").uppercased()
            return t != "ICON" && t != "AUDIO"
        }
        if hasNonIcon {
            let headerHeight = headerViewHeight()
            let mediaHeight: CGFloat = 200
            preferredContentSize = CGSize(width: view.bounds.width, height: headerHeight + mediaHeight)
            mediaHeightConstraint?.constant = mediaHeight
        }

        // Defer media setup to next run loop so header + icon appear immediately
        DispatchQueue.main.async { [weak self] in
            guard let self = self else { return }
            let nonIconItemsCount = self.attachmentData.filter { (item) in
                let t = (item["mediaType"] as? String ?? "").uppercased()
                return t != "ICON" && t != "AUDIO"
            }.count
            if nonIconItemsCount > 1 && !self.isFooterHiddenForError {
                self.setupMediaSelectorFromData()
            } else {
                self.hideFooterCompletely()
            }
            if hasNonIcon {
                let count = self.nonIconMediaCount()
                if count <= 1 { self.hideFooterCompletely() }
                let firstNonIconIndex = self.findFirstNonIconMediaIndex()
                self.selectedMediaIndex = firstNonIconIndex
                self.displayMediaFromSharedCache(at: firstNonIconIndex)
            }
        }
        if !hasNonIcon {
            // Solo ICON/AUDIO: mostra solo header. Mantieni un contenitore media minimo per far rispettare l'altezza dinamica dall'host
            mediaContainerView?.isHidden = false
            mediaContainerView?.backgroundColor = .clear
            mediaHeightConstraint?.constant = 1
            if let footer = footerContainerView {
                footer.removeFromSuperview()
                footerContainerView = nil
            }
            // Ricalcola le linee dell'header e usa l'altezza misurata per maggiore accuratezza
            adjustHeaderLineCounts()
            let measured = headerViewHeight()
            let expected = computeHeaderExpectedHeight()
            // Usa il massimo tra misurato e atteso, favorendo l'espansione quando serve
            let target = max(measured, expected)
            preferredContentSize = CGSize(width: view.bounds.width, height: target)
            return
        }
    }

    private func refreshHeaderIcon() {
        guard let imageView = headerIconImageView else { return }
        
        // Get bucket icon from cache using only bucketId (support both old and new abbreviated keys)
        if let userInfo = currentNotificationUserInfo {
            let rawBucketId = (userInfo["bid"] as? String) ?? (userInfo["bucketId"] as? String)
            if let bucketId = SharedUtils.normalizeUUID(rawBucketId) {
                if let bucketIconData = MediaAccess.getBucketIconFromSharedCache(
                    bucketId: bucketId,
                    bucketName: nil,
                    bucketColor: "#007AFF",
                    iconUrl: nil
                ),
                   let bucketIcon = UIImage(data: bucketIconData) {
                    imageView.image = bucketIcon
                    imageView.isHidden = false
                    print("📱 [ContentExtension] 🎭 Communication style with avatar (bucketId: \(bucketId))")
                }
            }
        }
    }

    

    // MARK: - Dynamic height adjustments
    private func adjustPreferredHeight(forContentSize size: CGSize) {
        guard size.width > 0 && size.height > 0 else { return }
        let maxWidth = view.bounds.width
        let aspect = size.height / size.width
        let targetHeight = max(120, min(700, maxWidth * aspect))
        let newSize = CGSize(width: maxWidth, height: targetHeight + headerViewHeight() + footerHeight())
        
        // Animate the expansion smoothly
        UIView.animate(withDuration: 0.3, delay: 0, options: [.curveEaseOut], animations: {
            self.preferredContentSize = newSize
            self.mediaHeightConstraint?.constant = targetHeight
            self.view.layoutIfNeeded()
        }, completion: nil)
    }

    private func headerViewHeight() -> CGFloat {
        guard let header = headerView else { return 0 }
        
        // Forza il layout dell'header per ottenere dimensioni accurate
        header.setNeedsLayout()
        header.layoutIfNeeded()
        
        // Calcola la larghezza disponibile (margini leading/trailing di 12pt ciascuno)
        let availableWidth = max(100, view.bounds.width - 24)
        let targetSize = CGSize(width: availableWidth, height: UIView.layoutFittingCompressedSize.height)
        
        // Usa systemLayoutSizeFitting per ottenere l'altezza reale basata su Auto Layout
        let calculatedSize = header.systemLayoutSizeFitting(
            targetSize,
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        )
        
        // Aggiungi un piccolo padding per sicurezza (evita troncamenti)
        let finalHeight = max(56, calculatedSize.height + 8)
        return finalHeight
    }

    private func computeHeaderExpectedHeight() -> CGFloat {
        // Usa semplicemente headerViewHeight() che ora calcola tutto con Auto Layout
        // Manteniamo questo metodo per compatibilità ma delega il calcolo
        return headerViewHeight()
    }

    private func footerHeight() -> CGFloat {
        // Hide footer entirely if there is 0 or 1 non-ICON/AUDIO media
        if nonIconMediaCount() <= 1 { return 0 }
        return (mediaSelectorView?.superview != nil) ? 88 : 0
    }

    private func nonIconMediaCount() -> Int {
        return attachmentData.filter { (item) in
            let t = (item["mediaType"] as? String ?? "").uppercased()
            return t != "ICON" && t != "AUDIO"
        }.count
    }

    private func hideFooterCompletely() {
        mediaSelectorView?.removeFromSuperview()
        if let footer = footerContainerView {
            // Deactivate explicit height constraints
            for c in footer.constraints where c.firstAttribute == .height { c.isActive = false }
            footer.removeFromSuperview()
            footerContainerView = nil
        }
        footerTopToContainerConstraint?.constant = 0
        view.layoutIfNeeded()
    }
    
    private func hideFooterIfSingleMedia() {
        let nonIconCount = attachmentData.filter { ($0["mediaType"] as? String ?? "").uppercased() != "ICON" && ($0["mediaType"] as? String ?? "").uppercased() != "AUDIO" }.count
        if nonIconCount <= 1 {
            isFooterHiddenForError = true
            hideFooterCompletely()
        }
    }

    private func adjustPreferredHeightForVideo(url: URL) {
        let asset = AVAsset(url: url)
        if let track = asset.tracks(withMediaType: .video).first {
            let size = track.naturalSize.applying(track.preferredTransform)
            let width = abs(size.width)
            let height = abs(size.height)
            if width > 0 && height > 0 {
                adjustPreferredHeight(forContentSize: CGSize(width: width, height: height))
            }
        }
    }

    private func showIconOnlyPlaceholder() {
        guard let container = mediaContainerView else { return }
        cleanupCurrentMedia()

        let stack = UIStackView()
        stack.axis = .vertical
        stack.alignment = .center
        stack.spacing = 8

        let label = UILabel()
        label.text = "Icona del bucket"
        label.font = .systemFont(ofSize: 16, weight: .medium)
        label.textColor = .secondaryLabel

        let sub = UILabel()
        sub.text = "Espandi per azioni, nessun media da mostrare"
        sub.font = .systemFont(ofSize: 13)
        sub.textColor = .tertiaryLabel

        stack.addArrangedSubview(label)
        stack.addArrangedSubview(sub)

        container.addSubview(stack)
        stack.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            stack.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            stack.centerYAnchor.constraint(equalTo: container.centerYAnchor)
        ])
    }
    
    
    
    private func setupMediaSelectorFromData() {
        
        // Remove existing selector if any
        mediaSelectorView?.removeFromSuperview()
        mediaThumbnails.forEach { $0.removeFromSuperview() }
        mediaThumbnails.removeAll()
        
        // Create container view for selector (no icon inside footer per richiesta) lazily
        let selectorContainer = UIView()
        selectorContainer.backgroundColor = UIColor.systemGray6
        selectorContainer.layer.borderWidth = 1
        selectorContainer.layer.borderColor = UIColor.systemGray4.cgColor
        view.addSubview(selectorContainer)
        footerContainerView = selectorContainer
        
        // Setup constraints for container
        selectorContainer.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            selectorContainer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            selectorContainer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            selectorContainer.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            selectorContainer.heightAnchor.constraint(equalToConstant: 80)
        ])
        
        // No icon in the footer selector
        let iconWidth: CGFloat = 0
        
        // Create selector scroll view
        let scrollView = UIScrollView()
        scrollView.backgroundColor = UIColor.clear
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        selectorContainer.addSubview(scrollView)
        mediaSelectorView = scrollView
        
        
        // Setup constraints for scroll view (accounting for icon width)
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            scrollView.leadingAnchor.constraint(equalTo: selectorContainer.leadingAnchor, constant: iconWidth),
            scrollView.trailingAnchor.constraint(equalTo: selectorContainer.trailingAnchor),
            scrollView.topAnchor.constraint(equalTo: selectorContainer.topAnchor),
            scrollView.bottomAnchor.constraint(equalTo: selectorContainer.bottomAnchor)
        ])
        
        // Update container constraints to make room for selector
        if let container = mediaContainerView {
            // Remove all existing constraints for the container
            container.removeFromSuperview()
            view.addSubview(container)
            
            // Re-setup container constraints with proper bottom constraint
            container.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                container.topAnchor.constraint(equalTo: headerView?.bottomAnchor ?? view.topAnchor, constant: 8),
                container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                container.bottomAnchor.constraint(equalTo: selectorContainer.topAnchor)
            ])
        }
        
        // Create thumbnails from attachmentData (excluding ICON types)
        let thumbnailSize: CGFloat = 60
        let spacing: CGFloat = 10
        var xOffset: CGFloat = spacing
        
        for (index, attachmentDataItem) in attachmentData.enumerated() {
            // Skip ICON and AUDIO media types - they shouldn't appear in the selector
            let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "UNKNOWN"
            if mediaTypeString.uppercased() == "ICON" {
                continue
            }
            if mediaTypeString.uppercased() == "AUDIO" {
                continue
            }
            
            let button = UIButton(type: .custom)
            button.tag = index
            button.layer.cornerRadius = 8
            button.layer.borderWidth = 3
            button.layer.borderColor = (index == 0) ? UIColor.systemBlue.cgColor : UIColor.systemGray3.cgColor
            button.backgroundColor = UIColor.systemBackground
            button.clipsToBounds = true
            button.addTarget(self, action: #selector(thumbnailTappedFromData(_:)), for: .touchUpInside)
            
            // Set thumbnail based on media type from attachmentData
            setupThumbnailFromData(for: button, attachmentDataItem: attachmentDataItem, index: index)
            
            scrollView.addSubview(button)
            button.frame = CGRect(x: xOffset, y: 10, width: thumbnailSize, height: thumbnailSize)
            
            mediaThumbnails.append(button)
            xOffset += thumbnailSize + spacing
            
        }
        
        scrollView.contentSize = CGSize(width: xOffset, height: 80)
    }
    

    
    private func findFirstNonIconMediaIndex() -> Int {
        for (index, attachmentDataItem) in attachmentData.enumerated() {
            let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "UNKNOWN"
            if mediaTypeString.uppercased() != "ICON" && mediaTypeString.uppercased() != "AUDIO" {
                return index
            }
        }
        // Fallback to index 0 if all media are icons or audio (shouldn't happen)
        return 0
    }
    
    
    private func setupThumbnailFromData(for button: UIButton, attachmentDataItem: [String: Any], index: Int) {
        let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "UNKNOWN"
        let mediaType = getMediaTypeFromString(mediaTypeString)
        
        // Create type label
        let label = UILabel()
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 10, weight: .medium)
        label.textColor = .white
        label.backgroundColor = UIColor.black.withAlphaComponent(0.6)
        
        switch mediaType {
        case .image:
            button.backgroundColor = .systemGreen
            if let icon = UIImage(systemName: "photo.fill") {
                button.setImage(icon, for: .normal)
                button.tintColor = .white
            }
            label.text = "IMG"
            
        case .gif:
            button.backgroundColor = .systemOrange
            if let icon = UIImage(systemName: "photo.stack.fill") {
                button.setImage(icon, for: .normal)
                button.tintColor = .white
            }
            label.text = "GIF"
            
        case .video:
            button.backgroundColor = .systemBlue
            if let icon = UIImage(systemName: "video.fill") {
                button.setImage(icon, for: .normal)
                button.tintColor = .white
            }
            label.text = "VIDEO"
            
        case .audio:
            button.backgroundColor = .systemPurple
            if let icon = UIImage(systemName: "music.note") {
                button.setImage(icon, for: .normal)
                button.tintColor = .white
            }
            label.text = "AUDIO"
        }
        
        // Add label
        button.addSubview(label)
        label.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            label.leadingAnchor.constraint(equalTo: button.leadingAnchor),
            label.trailingAnchor.constraint(equalTo: button.trailingAnchor),
            label.bottomAnchor.constraint(equalTo: button.bottomAnchor),
            label.heightAnchor.constraint(equalToConstant: 16)
        ])
    }
    
    @objc private func thumbnailTappedFromData(_ sender: UIButton) {
        let index = sender.tag
        
        // Check if we're already displaying this media
        if selectedMediaIndex == index {
            return
        }
        
        // Update selection UI
        mediaThumbnails.forEach { $0.layer.borderColor = UIColor.systemGray3.cgColor }
        sender.layer.borderColor = UIColor.systemBlue.cgColor
        
        // Display selected media from attachmentData
        selectedMediaIndex = index
        displayMediaFromSharedCache(at: index)
    }
    
    
    // MARK: - Media Display
    
    
    private func downloadAndDisplayMedia(from url: URL, mediaType: MediaType) {
        
        // Cancel any existing download
        currentDownloadTask?.cancel()
        
        // Show loading indicator
        showMediaLoadingIndicator()
        
        // Prepare shared cache destination (always save in shared directory)
        let sharedCacheDirectory = MediaAccess.getSharedMediaCacheDirectory()
        let mediaTypeString: String = {
            switch mediaType {
            case .image: return "IMAGE"
            case .gif: return "GIF"
            case .video: return "VIDEO"
            case .audio: return "AUDIO"
            }
        }()
        let safeFileName = MediaAccess.generateSafeFileName(url: url.absoluteString, mediaType: mediaTypeString, originalFileName: nil as String?)
        let typeDirectory = sharedCacheDirectory.appendingPathComponent(mediaTypeString)
        let sharedFileURL = typeDirectory.appendingPathComponent(safeFileName)
        do {
            try FileManager.default.createDirectory(at: typeDirectory, withIntermediateDirectories: true, attributes: nil)
        } catch {
        }
        
        
        // Download media
        let task = URLSession.shared.downloadTask(with: url) { [weak self] tempURL, response, error in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                // Hide loading indicator
                self.hideMediaLoadingIndicator()
            }
            
            // Check for network errors first
            if let error = error {
                let errorMessage = "Download failed: \(error.localizedDescription)"
                DispatchQueue.main.async {
                    self.hideFooterIfSingleMedia()
                    self.showMediaError(
                        errorMessage,
                        allowRetry: true,
                        retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        }
                    )
                }
                return
            }
            
            // Check HTTP status codes
            if let httpResponse = response as? HTTPURLResponse {
                let statusCode = httpResponse.statusCode
                
                if statusCode < 200 || statusCode >= 300 {
                    // Use same error message format as NotificationService for consistency
                    let statusMessage: String
                    switch statusCode {
                    case 400:
                        statusMessage = "Bad Request (400)"
                    case 401:
                        statusMessage = "Unauthorized (401)"
                    case 403:
                        statusMessage = "Forbidden (403)"
                    case 404:
                        statusMessage = "Not Found (404)"
                    case 500:
                        statusMessage = "Internal Server Error (500)"
                    case 503:
                        statusMessage = "Service Unavailable (503)"
                    default:
                        statusMessage = "HTTP Error (\(statusCode))"
                    }
                    let errorMessage = "Download failed: \(statusMessage)"
                    
                    DispatchQueue.main.async {
                        self.hideFooterIfSingleMedia()
                        self.showMediaError(
                            errorMessage,
                            allowRetry: true,
                            retryAction: { [weak self] in
                                self?.retryCurrentMediaDownload()
                            }
                        )
                    }
                    return
                }
            }
            
            // Check if we have a valid downloaded file
            guard let tempURL = tempURL else {
                let errorMessage = "Download failed: No data received"
                DispatchQueue.main.async {
                    self.hideFooterIfSingleMedia()
                    self.showMediaError(
                        errorMessage,
                        allowRetry: true,
                        retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        }
                    )
                }
                return
            }
            
            do {
                // Validate downloaded file before persisting
                let data = try Data(contentsOf: tempURL)
                let fileSize = data.count
                
                
                // Validate file size based on media type
                var minSize: Int
                switch mediaTypeString.uppercased() {
                case "VIDEO":
                    minSize = 10240 // 10KB minimum for video
                case "IMAGE", "GIF":
                    minSize = 1024  // 1KB minimum for images
                case "AUDIO":
                    minSize = 5120  // 5KB minimum for audio
                default:
                    minSize = 512   // 512 bytes minimum for other types
                }
                
                if fileSize < minSize {
                    let errorMessage = "Download failed: File too small (\(fileSize) bytes)"
                    DispatchQueue.main.async {
                        self.hideFooterIfSingleMedia()
                        self.showMediaError(
                            errorMessage,
                            allowRetry: true,
                            retryAction: { [weak self] in
                                self?.retryCurrentMediaDownload()
                            }
                        )
                    }
                    return
                }
                
                // Check if file might be an error page (HTML content)
                if fileSize < 100000 { // Only check small files
                    let dataString = String(data: data.prefix(512), encoding: .utf8) ?? ""
                    if dataString.lowercased().contains("<html") || dataString.lowercased().contains("<!doctype") {
                        let errorMessage = "Downloaded file appears to be an error page, not media content"
                        DispatchQueue.main.async {
                            self.hideFooterIfSingleMedia()
                            self.showMediaError(
                                "Download failed: Server returned error page",
                                allowRetry: true,
                                retryAction: { [weak self] in
                                    self?.retryCurrentMediaDownload()
                                }
                            )
                        }
                        return
                    }
                }
                
                
                // Persist file in shared cache
                if FileManager.default.fileExists(atPath: sharedFileURL.path) {
                    try? FileManager.default.removeItem(at: sharedFileURL)
                }
                try data.write(to: sharedFileURL, options: [.atomic])
                // Ensure accessibility and no-backup
                do { try FileManager.default.setAttributes([.protectionKey: FileProtectionType.none], ofItemAtPath: sharedFileURL.path) } catch { }
                do {
                    var rv = URLResourceValues()
                    rv.isExcludedFromBackup = true
                    var mutableUrl = sharedFileURL
                    try mutableUrl.setResourceValues(rv)
                } catch { }

                // Update DB with upsert
                let nowMs = Int(Date().timeIntervalSince1970 * 1000)
                
                MediaAccess.upsertCacheItem(url: url.absoluteString, mediaType: mediaTypeString, fields: [
                    "local_path": sharedFileURL.path,
                    "timestamp": nowMs,
                    "size": data.count,
                    "media_type": mediaTypeString,
                    "generating_thumbnail": 0,
                    "is_downloading": 0,
                    "downloaded_at": nowMs  // Always set to now when download completes successfully
                ])

                DispatchQueue.main.async {
                    // Display from shared cache path
                    switch mediaType {
                    case .image, .gif:
                        self.displayImage(from: sharedFileURL)
                    case .video:
                        self.displayVideo(from: sharedFileURL)
                    case .audio:
                        self.displayAudio(from: sharedFileURL)
                    }
                }
            } catch {
                DispatchQueue.main.async {
                    // Remove footer if only one non-ICON media
                    self.hideFooterIfSingleMedia()
                    
                    self.showMediaError(
                        "Download failed: File operation error",
                        allowRetry: true,
                        retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        }
                    )
                }
            }
        }
        
        currentDownloadTask = task
        task.resume()
    }
    
    private func getMediaTypeFromString(_ mediaTypeString: String) -> MediaType {
        switch mediaTypeString.uppercased() {
        case "IMAGE": return .image
        case "GIF": return .gif
        case "VIDEO": return .video
        case "AUDIO": return .audio
        default: return .image
        }
    }
    
    private func getFileExtension(for mediaType: MediaType) -> String {
        switch mediaType {
        case .image: return "jpg"
        case .gif: return "gif"
        case .video: return "mp4"
        case .audio: return "mp3" // Changed from m4a to mp3 as default
        }
    }
    
    private func getFileExtension(for mediaType: MediaType, originalURL: URL) -> String {
        // For audio, try to preserve original extension if it's a supported format
        if mediaType == .audio {
            let originalExtension = originalURL.pathExtension.lowercased()
            let supportedAudioExtensions = ["mp3", "m4a", "aac", "wav", "mp4"]
            if supportedAudioExtensions.contains(originalExtension) {
                return originalExtension
            }
            return "mp3" // Default fallback for audio
        }
        
        // For other media types, use the standard method
        return getFileExtension(for: mediaType)
    }
    
    private func showMediaLoadingIndicator() {
        guard let container = mediaContainerView else { return }
        
        // Remove existing indicator
        mediaLoadingIndicator?.removeFromSuperview()
        
        // Create new loading indicator
        let indicator = UIActivityIndicatorView(style: .large)
        indicator.color = .white
        indicator.backgroundColor = UIColor.black.withAlphaComponent(0.7)
        indicator.layer.cornerRadius = 8
        indicator.startAnimating()
        
        container.addSubview(indicator)
        mediaLoadingIndicator = indicator
        
        // Setup constraints
        indicator.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            indicator.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            indicator.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            indicator.widthAnchor.constraint(equalToConstant: 80),
            indicator.heightAnchor.constraint(equalToConstant: 80)
        ])
        
    }
    
    private func hideMediaLoadingIndicator() {
        mediaLoadingIndicator?.stopAnimating()
        mediaLoadingIndicator?.removeFromSuperview()
        mediaLoadingIndicator = nil
    }
    
    private func showMediaError(_ message: String, allowRetry: Bool = false, retryAction: (() -> Void)? = nil) {
        guard let container = mediaContainerView else { return }
        
        // Clear any existing content
        cleanupCurrentMedia()
        
        // Create error view
        let newErrorView = UIView()
        newErrorView.backgroundColor = .systemGray5
        newErrorView.tag = 999 // Tag for error view identification
        container.addSubview(newErrorView)
        errorView = newErrorView
        
        let errorLabel = UILabel()
        errorLabel.text = "⚠️ \(message)"
        errorLabel.textAlignment = .center
        errorLabel.textColor = .systemRed
        errorLabel.font = .systemFont(ofSize: 16, weight: .medium)
        errorLabel.numberOfLines = 0
        newErrorView.addSubview(errorLabel)
        
        // Setup constraints
        newErrorView.translatesAutoresizingMaskIntoConstraints = false
        errorLabel.translatesAutoresizingMaskIntoConstraints = false
        
        var constraints: [NSLayoutConstraint] = [
            newErrorView.topAnchor.constraint(equalTo: container.topAnchor),
            newErrorView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            newErrorView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            newErrorView.bottomAnchor.constraint(equalTo: container.bottomAnchor),
            
            errorLabel.leadingAnchor.constraint(greaterThanOrEqualTo: newErrorView.leadingAnchor, constant: 20),
            errorLabel.trailingAnchor.constraint(lessThanOrEqualTo: newErrorView.trailingAnchor, constant: -20)
        ]
        
        // Add retry button if allowed
        if allowRetry, let retryAction = retryAction {
            let retryButton = UIButton(type: .system)
            retryButton.setTitle("🔄 Retry", for: .normal)
            retryButton.setTitleColor(.systemBlue, for: .normal)
            retryButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
            retryButton.backgroundColor = .systemBackground
            retryButton.layer.cornerRadius = 8
            retryButton.layer.borderWidth = 1
            retryButton.layer.borderColor = UIColor.systemBlue.cgColor
            retryButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
            newErrorView.addSubview(retryButton)
            
            retryButton.translatesAutoresizingMaskIntoConstraints = false
            
            // Add retry button action
            retryButton.addAction(UIAction { _ in
                retryAction()
            }, for: .touchUpInside)
            
            constraints.append(contentsOf: [
                errorLabel.centerXAnchor.constraint(equalTo: newErrorView.centerXAnchor),
                errorLabel.centerYAnchor.constraint(equalTo: newErrorView.centerYAnchor, constant: -20),
                
                retryButton.centerXAnchor.constraint(equalTo: newErrorView.centerXAnchor),
                retryButton.topAnchor.constraint(equalTo: errorLabel.bottomAnchor, constant: 16),
                retryButton.heightAnchor.constraint(equalToConstant: 36)
            ])
        } else {
            constraints.append(errorLabel.centerXAnchor.constraint(equalTo: newErrorView.centerXAnchor))
            constraints.append(errorLabel.centerYAnchor.constraint(equalTo: newErrorView.centerYAnchor))
        }
        
        NSLayoutConstraint.activate(constraints)
        
        // Ensure header is properly configured when showing error
        adjustHeaderLineCounts()
        
        // Adjust preferred height for error view (fixed height for consistent error display)
        let errorHeight: CGFloat = 200
        adjustPreferredHeight(forContentSize: CGSize(width: view.bounds.width, height: errorHeight))
        
    }
    
    private func hideMediaError() {
        // Remove any existing error views
        mediaContainerView?.subviews.forEach { subview in
            if subview.tag == 999 { // Error view tag
                subview.removeFromSuperview()
            }
        }
    }
    
    private func retryCurrentMediaDownload() {
        guard attachmentData.indices.contains(selectedMediaIndex) else {
            return
        }
        
        let attachmentDataItem = attachmentData[selectedMediaIndex]
        guard let urlString = attachmentDataItem["url"] as? String,
              let url = URL(string: urlString) else {
            return
        }
        
        let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "IMAGE"
        let mediaType = getMediaTypeFromString(mediaTypeString)
        
        
        // Clear error flag in shared metadata first
        clearMediaErrorFlag(url: urlString, mediaType: mediaTypeString)
        
        // Hide any existing error view
        hideMediaError()
        
        // Ensure header is properly configured for retry
        adjustHeaderLineCounts()
        
        // Show loading indicator
        showMediaLoadingIndicator()
        
        // Start direct download (this will handle the completion properly)
        downloadAndDisplayMedia(from: url, mediaType: mediaType)
    }
    
    private func clearMediaErrorFlag(url: String, mediaType: String) {
        MediaAccess.upsertCacheItem(url: url, mediaType: mediaType, fields: [
            "is_permanent_failure": 0,
            "is_downloading": 1,
            "generating_thumbnail": 0,
            "size": 0,
            "is_user_deleted": 0,
            "timestamp": Int(Date().timeIntervalSince1970 * 1000),
            "downloaded_at": 0  // Reset to 0 for retry, will be set properly on successful download
        ])
    }
    
    private func shouldAttemptAudioPlayback() -> Bool {
        // Based on testing, iOS Notification Content Extensions cannot produce audible audio
        // Even though the player works technically (rate=1.0, status=playing), 
        // the system blocks audio output for security/privacy reasons.
        // Show the informative message instead.
        return false
    }
    
    private func showAudioLimitationMessage() {
        guard let container = mediaContainerView else { return }
        
        // Clear any existing content
        cleanupCurrentMedia()
        
        // Create info view
        let infoView = UIView()
        infoView.backgroundColor = .systemBlue.withAlphaComponent(0.1)
        infoView.layer.cornerRadius = 12
        infoView.layer.borderWidth = 1
        infoView.layer.borderColor = UIColor.systemBlue.cgColor
        container.addSubview(infoView)
        audioInfoView = infoView
        
        let iconLabel = UILabel()
        iconLabel.text = "🔊"
        iconLabel.font = .systemFont(ofSize: 48)
        iconLabel.textAlignment = .center
        infoView.addSubview(iconLabel)
        
        let titleLabel = UILabel()
        titleLabel.text = "Audio File"
        titleLabel.font = .systemFont(ofSize: 18, weight: .semibold)
        titleLabel.textAlignment = .center
        titleLabel.textColor = .label
        infoView.addSubview(titleLabel)
        
        let messageLabel = UILabel()
        messageLabel.text = "Audio playback is limited in notification previews.\nTap the notification to play in the main app."
        messageLabel.font = .systemFont(ofSize: 14)
        messageLabel.textAlignment = .center
        messageLabel.textColor = .secondaryLabel
        messageLabel.numberOfLines = 0
        infoView.addSubview(messageLabel)
        
        // Setup constraints
        infoView.translatesAutoresizingMaskIntoConstraints = false
        iconLabel.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        messageLabel.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            infoView.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            infoView.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            infoView.widthAnchor.constraint(lessThanOrEqualTo: container.widthAnchor, constant: -40),
            infoView.heightAnchor.constraint(lessThanOrEqualTo: container.heightAnchor, constant: -40),
            
            iconLabel.topAnchor.constraint(equalTo: infoView.topAnchor, constant: 20),
            iconLabel.centerXAnchor.constraint(equalTo: infoView.centerXAnchor),
            
            titleLabel.topAnchor.constraint(equalTo: iconLabel.bottomAnchor, constant: 12),
            titleLabel.leadingAnchor.constraint(equalTo: infoView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: infoView.trailingAnchor, constant: -20),
            
            messageLabel.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 8),
            messageLabel.leadingAnchor.constraint(equalTo: infoView.leadingAnchor, constant: 20),
            messageLabel.trailingAnchor.constraint(equalTo: infoView.trailingAnchor, constant: -20),
            messageLabel.bottomAnchor.constraint(equalTo: infoView.bottomAnchor, constant: -20)
        ])
        
    }
    
    private func displayImage(from url: URL) {
        
        guard let container = mediaContainerView else {
            return
        }
        
        let imgView = UIImageView()
        imgView.contentMode = .scaleAspectFit
        imgView.backgroundColor = .black
        imgView.clipsToBounds = true
        
        // Start accessing security-scoped resource
        let accessGranted = url.startAccessingSecurityScopedResource()
        
        if let data = try? Data(contentsOf: url),
           let image = UIImage(data: data) {
            
            
            // For GIFs, prefer WKWebView for accurate playback speed
            if url.pathExtension.lowercased() == "gif" {
                // Remove the placeholder imageView since we'll use a web view
                imgView.removeFromSuperview()

                let config = WKWebViewConfiguration()
                config.allowsInlineMediaPlayback = true
                let wv = WKWebView(frame: .zero, configuration: config)
                wv.isOpaque = false
                wv.backgroundColor = .black
                wv.scrollView.isScrollEnabled = false
                container.addSubview(wv)
                webView = wv

                // Constrain to container
                wv.translatesAutoresizingMaskIntoConstraints = false
                NSLayoutConstraint.activate([
                    wv.topAnchor.constraint(equalTo: container.topAnchor),
                    wv.leadingAnchor.constraint(equalTo: container.leadingAnchor),
                    wv.trailingAnchor.constraint(equalTo: container.trailingAnchor),
                    wv.bottomAnchor.constraint(equalTo: container.bottomAnchor)
                ])

                // Load GIF data directly as data URL to avoid file access issues
                let base64String = data.base64EncodedString()
                let dataUrl = "data:image/gif;base64,\(base64String)"
                
                // Create HTML wrapper to center the GIF
                let htmlContent = """
                <!DOCTYPE html>
                <html>
                <head>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                    <style>
                        * {
                            margin: 0;
                            padding: 0;
                            box-sizing: border-box;
                        }
                        html, body {
                            height: 100%;
                            background-color: black;
                            display: flex;
                            justify-content: center;
                            align-items: center;
                            overflow: hidden;
                        }
                        img {
                            max-width: 100%;
                            max-height: 100%;
                            object-fit: contain;
                            display: block;
                        }
                    </style>
                </head>
                <body>
                    <img src="\(dataUrl)" alt="GIF">
                </body>
                </html>
                """
                
                // Load HTML with data URL
                wv.loadHTMLString(htmlContent, baseURL: nil)
                // Adjust height to image intrinsic aspect
                adjustPreferredHeight(forContentSize: image.size)
                return
            } else {
                imgView.image = image
                // Adjust height to image intrinsic aspect
                adjustPreferredHeight(forContentSize: image.size)
            }
        } else {
            
            // Hide footer and show error with retry button for single media
            hideFooterIfSingleMedia()
            
            // Check if there's an error recorded in database for this URL
            if attachmentData.indices.contains(selectedMediaIndex),
               let urlString = attachmentData[selectedMediaIndex]["url"] as? String,
               let mediaTypeString = attachmentData[selectedMediaIndex]["mediaType"] as? String {
                
                let errorCheck = MediaAccess.hasMediaDownloadError(url: urlString, mediaType: mediaTypeString)
                let errorMessage = errorCheck.hasError && errorCheck.errorMessage != nil ? 
                    "Download failed: \(errorCheck.errorMessage!)" : "Download failed: Unable to load image"
                
                
                // Show error message with retry button
                showMediaError(errorMessage, allowRetry: true, retryAction: { [weak self] in
                    self?.retryCurrentMediaDownload()
                })
            } else {
                // Fallback error message
                showMediaError("Download failed: Unable to load image", allowRetry: true, retryAction: { [weak self] in
                    self?.retryCurrentMediaDownload()
                })
            }
            return
        }
        
        container.addSubview(imgView)
        imageView = imgView
        
        // Setup constraints for image view
        imgView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            imgView.topAnchor.constraint(equalTo: container.topAnchor),
            imgView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            imgView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            imgView.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        
    }
    
        private func displayVideo(from url: URL) {
        
        guard let container = mediaContainerView else {
            return
        }
        
        // Validate file before attempting playback
        do {
            let resourceValues = try url.resourceValues(forKeys: [.fileSizeKey, .isRegularFileKey])
            let fileSize = resourceValues.fileSize ?? 0
            let isRegularFile = resourceValues.isRegularFile ?? false
            
            
            if !isRegularFile {
                showMediaError("Video file is not accessible", allowRetry: true, retryAction: { [weak self] in
                    self?.retryCurrentMediaDownload()
                })
                return
            }
            
            if fileSize < 1024 { // Less than 1KB is likely corrupted
                
                // Check if there's a specific error recorded in database
                if let urlString = attachmentData[selectedMediaIndex]["url"] as? String,
                   let mediaTypeString = attachmentData[selectedMediaIndex]["mediaType"] as? String {
                    
                    let errorCheck = MediaAccess.hasMediaDownloadError(url: urlString, mediaType: mediaTypeString)
                    
                    if errorCheck.hasError && errorCheck.errorMessage != nil {
                        showMediaError("Download failed: \(errorCheck.errorMessage!)", allowRetry: true, retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        })
                        return
                    }
                }
                
                // Fallback to generic corrupted message
                showMediaError("Video file is corrupted or empty (\(fileSize) bytes)", allowRetry: true, retryAction: { [weak self] in
                    self?.retryCurrentMediaDownload()
                })
                return
            }
            
        } catch {
            showMediaError("Cannot access video file: \(error.localizedDescription)", allowRetry: true, retryAction: { [weak self] in
                self?.retryCurrentMediaDownload()
            })
            return
        }
        
        // Start accessing security-scoped resource
        let accessGranted = url.startAccessingSecurityScopedResource()
        
        // Clean up any existing player and observers before creating new one
        cleanupAllObservers()
        
        // Create player
        player = AVPlayer(url: url)
        
        // Create player layer
        let layer = AVPlayerLayer(player: player)
        layer.videoGravity = .resizeAspect
        layer.backgroundColor = UIColor.black.cgColor
        layer.frame = container.bounds
        container.layer.addSublayer(layer)
        playerLayer = layer
        
        // Ensure layer frame is updated after layout
        DispatchQueue.main.async {
            layer.frame = container.bounds
        }
        
        // Add loading indicator
        let indicator = UIActivityIndicatorView(style: .medium)
        indicator.color = .white
        indicator.startAnimating()
        container.addSubview(indicator)
        loadingIndicator = indicator
        
        // Setup constraints for loading indicator
        indicator.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            indicator.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            indicator.centerYAnchor.constraint(equalTo: container.centerYAnchor)
        ])
        
        // Setup controls
        setupVideoControls()
        
        // Setup audio session
        setupAudioSession(for: .video)
        
        // Setup autoplay
        setupAutoplay()
        

        // Adjust height using video natural size
        adjustPreferredHeightForVideo(url: url)
    }
    
    private func displayAudio(from url: URL) {
        
        guard let container = mediaContainerView else {
            return
        }
        
        // Start accessing security-scoped resource
        let accessGranted = url.startAccessingSecurityScopedResource()
        
        // Verify file exists and is readable
        guard FileManager.default.fileExists(atPath: url.path) else {
            hideFooterIfSingleMedia()
            showMediaError("Audio file not found")
            return
        }
        
        // Get file size and format info
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            if let fileSize = attributes[.size] as? Int {
            }
        } catch {
        }
        
        // Note: Notification Content Extensions have severe limitations on audio session management
        // We'll try to setup audio session but won't fail if it doesn't work
        
        do {
            let audioSession = AVAudioSession.sharedInstance()
            
            // Try different audio session configurations for Notification Content Extensions
            // First try playback category with mix with others option
            try audioSession.setCategory(.playback, mode: .default, options: [.mixWithOthers, .allowAirPlay])
            try audioSession.setActive(true, options: [])
            
        } catch {
            do {
                // Fallback to ambient category
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
                try audioSession.setActive(true, options: [])
            } catch {
            }
        }
        
        // Create player with explicit asset
        let asset = AVURLAsset(url: url)
        
        // Check asset properties synchronously
        
        // Load asset properties asynchronously for more details
        asset.loadValuesAsynchronously(forKeys: ["duration", "tracks", "playable"]) {
            DispatchQueue.main.async {
                var error: NSError?
                let status = asset.statusOfValue(forKey: "duration", error: &error)
                if let error = error {
                }
                
                let tracksStatus = asset.statusOfValue(forKey: "tracks", error: &error)
                if let error = error {
                } else {
                    let audioTracks = asset.tracks(withMediaType: .audio)
                    for (index, track) in audioTracks.enumerated() {
                    }
                }
            }
        }
        
        let playerItem = AVPlayerItem(asset: asset)
        
        // Clean up any existing player and observers before creating new one
        cleanupAllObservers()
        
        player = AVPlayer(playerItem: playerItem)
        
        
        // Check if we should attempt audio playback or show info message
        // Due to iOS limitations, audio in Notification Content Extensions is very restricted
        if shouldAttemptAudioPlayback() {
            // Create audio visualization
            setupAudioVisualization()
            
            // Setup controls
            setupVideoControls() // Reuse video controls for audio
            
            // Setup autoplay with audio-specific handling
            setupAudioAutoplay()
            
        } else {
            // Show informative message instead of failing
            showAudioLimitationMessage()
        }
    }
    
    // MARK: - Media Controls
    
    private func setupVideoControls() {
        guard let container = mediaContainerView else { return }
        
        // Create controls container
        let controls = UIView()
        controls.backgroundColor = UIColor.black.withAlphaComponent(0.5)
        controls.layer.cornerRadius = 8
        container.addSubview(controls)
        controlsView = controls
        
        // Setup constraints for controls
        controls.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            controls.leadingAnchor.constraint(equalTo: container.leadingAnchor, constant: 10),
            controls.trailingAnchor.constraint(equalTo: container.trailingAnchor, constant: -10),
            controls.bottomAnchor.constraint(equalTo: container.bottomAnchor, constant: -10),
            controls.heightAnchor.constraint(equalToConstant: 50)
        ])
        
        // Play/Pause button
        let playPause = UIButton(type: .system)
        playPause.tintColor = .white
        playPause.setImage(UIImage(systemName: "pause.fill"), for: .normal)
        playPause.addTarget(self, action: #selector(togglePlayPause), for: .touchUpInside)
        controls.addSubview(playPause)
        playPauseButton = playPause
        
        // Time labels
        let currentLabel = UILabel()
        currentLabel.text = "0:00"
        currentLabel.textColor = .white
        currentLabel.font = .monospacedDigitSystemFont(ofSize: 11, weight: .regular)
        controls.addSubview(currentLabel)
        currentTimeLabel = currentLabel
        
        let durLabel = UILabel()
        durLabel.text = "0:00"
        durLabel.textColor = .white
        durLabel.font = .monospacedDigitSystemFont(ofSize: 11, weight: .regular)
        controls.addSubview(durLabel)
        durationLabel = durLabel
        
        // Time slider
        let slider = UISlider()
        slider.minimumTrackTintColor = .systemBlue
        slider.maximumTrackTintColor = .gray
        slider.addTarget(self, action: #selector(sliderValueChanged(_:)), for: .valueChanged)
        controls.addSubview(slider)
        timeSlider = slider
        
        // Setup constraints for controls elements
        playPause.translatesAutoresizingMaskIntoConstraints = false
        currentLabel.translatesAutoresizingMaskIntoConstraints = false
        durLabel.translatesAutoresizingMaskIntoConstraints = false
        slider.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            // Play/Pause button
            playPause.leadingAnchor.constraint(equalTo: controls.leadingAnchor, constant: 10),
            playPause.centerYAnchor.constraint(equalTo: controls.centerYAnchor),
            playPause.widthAnchor.constraint(equalToConstant: 30),
            playPause.heightAnchor.constraint(equalToConstant: 30),
            
            // Current time label
            currentLabel.leadingAnchor.constraint(equalTo: playPause.trailingAnchor, constant: 10),
            currentLabel.centerYAnchor.constraint(equalTo: controls.centerYAnchor),
            
            // Duration label
            durLabel.trailingAnchor.constraint(equalTo: controls.trailingAnchor, constant: -10),
            durLabel.centerYAnchor.constraint(equalTo: controls.centerYAnchor),
            
            // Slider
            slider.leadingAnchor.constraint(equalTo: currentLabel.trailingAnchor, constant: 10),
            slider.trailingAnchor.constraint(equalTo: durLabel.leadingAnchor, constant: -10),
            slider.centerYAnchor.constraint(equalTo: controls.centerYAnchor)
        ])
        
        // Setup time observer
        setupTimeObserver()
    }
    
    private func setupAudioVisualization() {
        guard let container = mediaContainerView else { return }
        
        let vizView = UIView()
        vizView.backgroundColor = .black
        container.addSubview(vizView)
        audioVisualizationView = vizView
        
        // Setup constraints for visualization view
        vizView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            vizView.topAnchor.constraint(equalTo: container.topAnchor),
            vizView.leadingAnchor.constraint(equalTo: container.leadingAnchor),
            vizView.trailingAnchor.constraint(equalTo: container.trailingAnchor),
            vizView.bottomAnchor.constraint(equalTo: container.bottomAnchor)
        ])
        
        // Music icon
        let iconView = UIImageView(image: UIImage(systemName: "music.note"))
        iconView.tintColor = .systemPurple
        iconView.contentMode = .scaleAspectFit
        vizView.addSubview(iconView)
        
        // Title label
        let titleLabel = UILabel()
        titleLabel.text = "Audio Playing"
        titleLabel.textColor = .white
        titleLabel.font = .systemFont(ofSize: 16, weight: .medium)
        titleLabel.textAlignment = .center
        vizView.addSubview(titleLabel)
        
        // Waveform animation container
        let waveContainer = UIView()
        vizView.addSubview(waveContainer)
        
        // Create wave bars with constraints
        for i in 0..<5 {
            let bar = UIView()
            bar.backgroundColor = .systemPurple
            bar.layer.cornerRadius = 2
            waveContainer.addSubview(bar)
            
            bar.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                bar.widthAnchor.constraint(equalToConstant: 4),
                bar.heightAnchor.constraint(equalToConstant: 30),
                bar.centerYAnchor.constraint(equalTo: waveContainer.centerYAnchor),
                bar.leadingAnchor.constraint(equalTo: waveContainer.leadingAnchor, constant: CGFloat(i * 25))
            ])
            
            // Animate bars
            let animation = CABasicAnimation(keyPath: "transform.scale.y")
            animation.fromValue = 0.3
            animation.toValue = 1.0
            animation.duration = 0.6
            animation.repeatCount = .infinity
            animation.autoreverses = true
            animation.beginTime = CACurrentMediaTime() + Double(i) * 0.1
            bar.layer.add(animation, forKey: "pulse")
        }
        
        // Layout with constraints
        iconView.translatesAutoresizingMaskIntoConstraints = false
        titleLabel.translatesAutoresizingMaskIntoConstraints = false
        waveContainer.translatesAutoresizingMaskIntoConstraints = false
        
        NSLayoutConstraint.activate([
            iconView.centerXAnchor.constraint(equalTo: vizView.centerXAnchor),
            iconView.topAnchor.constraint(equalTo: vizView.topAnchor, constant: 40),
            iconView.widthAnchor.constraint(equalToConstant: 60),
            iconView.heightAnchor.constraint(equalToConstant: 60),
            
            titleLabel.centerXAnchor.constraint(equalTo: vizView.centerXAnchor),
            titleLabel.topAnchor.constraint(equalTo: iconView.bottomAnchor, constant: 20),
            titleLabel.leadingAnchor.constraint(equalTo: vizView.leadingAnchor, constant: 20),
            titleLabel.trailingAnchor.constraint(equalTo: vizView.trailingAnchor, constant: -20),
            
            waveContainer.centerXAnchor.constraint(equalTo: vizView.centerXAnchor),
            waveContainer.topAnchor.constraint(equalTo: titleLabel.bottomAnchor, constant: 20),
            waveContainer.widthAnchor.constraint(equalToConstant: 120),
            waveContainer.heightAnchor.constraint(equalToConstant: 30)
        ])
    }
    
        private func setupTimeObserver() {
        guard let currentPlayer = player else { 
            return 
        }
        
        // Remove existing observer from the SAME player instance that created it
        if let token = timeObserverToken, let observerPlayer = timeObserverPlayer {
            // Only remove if it's the same player instance
            if observerPlayer === currentPlayer {
                do {
                    observerPlayer.removeTimeObserver(token)
                } catch {
                }
            } else {
            }
            timeObserverToken = nil
            timeObserverPlayer = nil
        }
        
        
        // Add periodic observer
        let interval = CMTime(seconds: 0.5, preferredTimescale: 600)
        timeObserverToken = currentPlayer.addPeriodicTimeObserver(forInterval: interval, queue: .main) { [weak self] time in
            guard let self = self,
                  let item = currentPlayer.currentItem else { return }
            
            let duration = item.duration
            if duration.isNumeric {
                let total = CMTimeGetSeconds(duration)
                let current = CMTimeGetSeconds(time)
                
                self.timeSlider?.maximumValue = Float(total)
                self.timeSlider?.value = Float(current)
                self.currentTimeLabel?.text = self.formatTime(seconds: current)
                self.durationLabel?.text = self.formatTime(seconds: total)
            }
        }
        
        // Save reference to the player that created the observer
        timeObserverPlayer = currentPlayer
        
    }

    @objc private func togglePlayPause() {
        guard let player = player else { return }
        
        if player.timeControlStatus == .playing {
            player.pause()
            playPauseButton?.setImage(UIImage(systemName: "play.fill"), for: .normal)
        } else {
            player.play()
            playPauseButton?.setImage(UIImage(systemName: "pause.fill"), for: .normal)
        }
    }

    @objc private func sliderValueChanged(_ sender: UISlider) {
        guard let player = player else { return }
        
        let seconds = Double(sender.value)
        let target = CMTime(seconds: seconds, preferredTimescale: 600)
        player.seek(to: target, toleranceBefore: .zero, toleranceAfter: .zero)
    }

    // MARK: - Autoplay
    
    private func setupAutoplay() {
        guard let currentPlayer = player else { 
            return 
        }
        
        
        // Remove existing status observer if any (safety check)
        if isObservingPlayerStatus, let observed = observedPlayerForStatus {
            do {
                observed.removeObserver(self, forKeyPath: "status")
            } catch {
            }
            isObservingPlayerStatus = false
            observedPlayerForStatus = nil
        }
        
        // Remove existing PlayerItem observer if any
        if isObservingPlayerItemStatus, let itemObserved = observedPlayerItemForStatus {
            do {
                itemObserved.removeObserver(self, forKeyPath: "status")
            } catch {
            }
            isObservingPlayerItemStatus = false
            observedPlayerItemForStatus = nil
        }
        
        // Add status observer
        currentPlayer.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        isObservingPlayerStatus = true
        observedPlayerForStatus = currentPlayer
        
        // Remove existing notification observer
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        
        // Add end observer for looping
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFinishPlaying),
            name: .AVPlayerItemDidPlayToEndTime,
            object: currentPlayer.currentItem
        )
    }
    
    private func setupAudioAutoplay() {
        guard let currentPlayer = player else { 
            return 
        }
        
        
        // Remove existing status observer if any (safety check)
        if isObservingPlayerStatus, let observed = observedPlayerForStatus {
            observed.removeObserver(self, forKeyPath: "status")
            isObservingPlayerStatus = false
            observedPlayerForStatus = nil
        }
        
        // Add status observer for audio
        currentPlayer.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        isObservingPlayerStatus = true
        
        // Add specific observers for audio debugging
        if let playerItem = currentPlayer.currentItem {
            // Remove existing observer first
            if isObservingPlayerItemStatus, let itemObserved = observedPlayerItemForStatus {
                itemObserved.removeObserver(self, forKeyPath: "status")
                observedPlayerItemForStatus = nil
            }
            
            playerItem.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
            isObservingPlayerItemStatus = true
            observedPlayerItemForStatus = playerItem
            
            // Log audio asset information
            let asset = playerItem.asset
            
            // Check audio tracks
            asset.loadValuesAsynchronously(forKeys: ["tracks"]) {
                DispatchQueue.main.async {
                    let tracks = asset.tracks(withMediaType: .audio)
                    for (index, track) in tracks.enumerated() {
                    }
                }
            }
        }
        
        // Remove existing notification observer
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        
        // Add end observer for looping
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFinishPlaying),
            name: .AVPlayerItemDidPlayToEndTime,
            object: currentPlayer.currentItem
        )
        
        // Try to play immediately if ready
        if currentPlayer.status == .readyToPlay {
            currentPlayer.play()
        } else {
            // Set a timeout to fallback to info message if player doesn't become ready
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
                guard let self = self, let player = self.player else { return }
                if player.status == .failed || player.status == .unknown {
                    self.showAudioLimitationMessage()
                }
            }
        }
    }
    
    override func observeValue(forKeyPath keyPath: String?, of object: Any?, change: [NSKeyValueChangeKey : Any]?, context: UnsafeMutableRawPointer?) {
        if keyPath == "status" {
            if let player = object as? AVPlayer {
                let statusString = player.status == .readyToPlay ? "readyToPlay" : 
                                 player.status == .failed ? "failed" : "unknown"
                
                if player.status == .readyToPlay {
                    
                    // Ensure volume is set to maximum
                    player.volume = 1.0
                    
                    // Check audio session state before playing
                    let audioSession = AVAudioSession.sharedInstance()
                    
                    player.play()
                    
                    // Check if playback actually started
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        if player.rate == 0 {
                        }
                    }
                    
                    loadingIndicator?.stopAnimating()
                    loadingIndicator?.removeFromSuperview()
                } else if player.status == .failed {
                    
                    var errorMetadata: [String: Any] = [:]
                    if let error = player.error {
                        errorMetadata["error"] = error.localizedDescription
                        
                        if let nsError = error as NSError? {
                            errorMetadata["domain"] = nsError.domain
                            errorMetadata["code"] = nsError.code
                        }
                    }
                    
                    logToDatabase(
                        level: "ERROR",
                        tag: "Media",
                        message: "AVPlayer failed to load media",
                        metadata: errorMetadata
                    )
                    
                    loadingIndicator?.stopAnimating()
                    loadingIndicator?.removeFromSuperview()
                    
                    // Check if this is an audio player failure - if so, show limitation message
                    if let currentItem = player.currentItem,
                       let asset = currentItem.asset as? AVURLAsset {
                        let fileExtension = asset.url.pathExtension.lowercased()
                        let audioExtensions = ["mp3", "m4a", "aac", "wav", "mp4"]
                        if audioExtensions.contains(fileExtension) {
                            showAudioLimitationMessage()
                        } else {
                            self.hideFooterIfSingleMedia()
                            showMediaError("Player failed: \(player.error?.localizedDescription ?? "Unknown error")")
                        }
                    } else {
                        self.hideFooterIfSingleMedia()
                        showMediaError("Player failed: \(player.error?.localizedDescription ?? "Unknown error")")
                    }
                }
            } else if let playerItem = object as? AVPlayerItem {
                let statusString = playerItem.status == .readyToPlay ? "readyToPlay" : 
                                 playerItem.status == .failed ? "failed" : "unknown"
                
                if playerItem.status == .readyToPlay {
                    // Player should already be playing from AVPlayer observer
                } else if playerItem.status == .failed {
                    
                    var errorMetadata: [String: Any] = [:]
                    if let error = playerItem.error {
                        errorMetadata["error"] = error.localizedDescription
                        
                        if let nsError = error as NSError? {
                            errorMetadata["domain"] = nsError.domain
                            errorMetadata["code"] = nsError.code
                        }
                    }
                    
                    logToDatabase(
                        level: "ERROR",
                        tag: "Media",
                        message: "AVPlayerItem failed to load media",
                        metadata: errorMetadata
                    )
                    
                    // Check if this is an audio player item failure - if so, show limitation message
                    if let asset = playerItem.asset as? AVURLAsset {
                        let fileExtension = asset.url.pathExtension.lowercased()
                        let audioExtensions = ["mp3", "m4a", "aac", "wav", "mp4"]
                        if audioExtensions.contains(fileExtension) {
                            showAudioLimitationMessage()
                        } else {
                            self.hideFooterIfSingleMedia()
                            showMediaError("Media failed: \(playerItem.error?.localizedDescription ?? "Unknown error")")
                        }
                    } else {
                        self.hideFooterIfSingleMedia()
                        showMediaError("Media failed: \(playerItem.error?.localizedDescription ?? "Unknown error")")
                    }
                }
            }
        }
    }
    
    @objc private func playerDidFinishPlaying() {
        player?.seek(to: .zero)
        player?.play()
    }
    
    // MARK: - Cleanup
    
    private func cleanupAllObservers() {
        // Clean up time observer - handle all possible states with safer approach
        if let token = timeObserverToken {
            if let observerPlayer = timeObserverPlayer {
                // Only remove observer if the player is still the same instance
                if observerPlayer === player {
                    do {
                        observerPlayer.removeTimeObserver(token)
                    } catch {
                    }
                } else {
                }
            } else {
            }
            // Always reset the token and player reference
            timeObserverToken = nil
            timeObserverPlayer = nil
        }
        
        // Clean up any remaining player observers if player exists
        if let currentPlayer = player, let observed = observedPlayerForStatus {
            // Only remove if it's the same instance
            if observed === currentPlayer {
                do {
                    observed.removeObserver(self, forKeyPath: "status")
                } catch {
                }
            } else {
            }
            
            // Try to remove any remaining observers from current player item
            if let currentItem = currentPlayer.currentItem, let itemObserved = observedPlayerItemForStatus {
                // Only remove if it's the same instance
                if itemObserved === currentItem {
                    do {
                        currentItem.removeObserver(self, forKeyPath: "status")
                    } catch {
                    }
                } else {
                }
            }
        }
        
        // Always reset observer flags regardless of success/failure
        isObservingPlayerStatus = false
        isObservingPlayerItemStatus = false
        observedPlayerForStatus = nil
        observedPlayerItemForStatus = nil
        
        // Remove notification observers
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        
    }
    
    private func cleanupCurrentMedia() {
        // Prevent multiple cleanup calls
        guard !isCleaningUp else {
            return
        }
        
        isCleaningUp = true

        // Stop player
        player?.pause()
        
        // Force cleanup of all observers regardless of player state
        // But only if not already cleaned up (prevent double cleanup)
        if timeObserverToken != nil || isObservingPlayerStatus || isObservingPlayerItemStatus {
            cleanupAllObservers()
        } else {
        }
        
        // Cleanup UI components
        cleanupUIComponents()
        
        // Nullify player AFTER removing all observers
        player = nil
        
        // Reset cleanup flag
        isCleaningUp = false
        
    }
    
    private func cleanupUIComponents() {
        
        // Remove UI
        playerLayer?.removeFromSuperlayer()
        playerLayer = nil
        
        imageView?.removeFromSuperview()
        imageView = nil
        webView?.stopLoading()
        webView?.removeFromSuperview()
        webView = nil
        
        audioVisualizationView?.removeFromSuperview()
        audioVisualizationView = nil
        
        controlsView?.removeFromSuperview()
        controlsView = nil
        
        loadingIndicator?.removeFromSuperview()
        loadingIndicator = nil
        
        // Remove media loading indicator
        hideMediaLoadingIndicator()
        
        // Cancel any ongoing download
        currentDownloadTask?.cancel()
        currentDownloadTask = nil
        
        // Remove error view if present
        errorView?.removeFromSuperview()
        errorView = nil
        
        // Remove audio info view if present
        audioInfoView?.removeFromSuperview()
        audioInfoView = nil
        
    }
    
    // MARK: - Helpers
    
    private func getMediaType(for attachment: UNNotificationAttachment) -> MediaType {
        let ext = attachment.url.pathExtension.lowercased()
        
        if ["jpg", "jpeg", "png", "heic", "heif"].contains(ext) {
            return .image
        } else if ext == "gif" {
            return .gif
        } else if ["mp4", "mov", "m4v", "avi"].contains(ext) {
            return .video
        } else if ["mp3", "m4a", "aac", "wav"].contains(ext) {
            return .audio
        } else {
            return .image // Default
        }
    }
    
    private func getMediaPriority(for attachment: UNNotificationAttachment) -> Int {
        let type = getMediaType(for: attachment)
        switch type {
        case .image: return 1
        case .gif: return 2
        case .video: return 3
        case .audio: return 4
        }
    }
    
    private func formatTime(seconds: Double) -> String {
        guard seconds.isFinite && !seconds.isNaN else { return "0:00" }
        let total = Int(seconds)
        let mins = total / 60
        let secs = total % 60
        return String(format: "%d:%02d", mins, secs)
    }
    
    private func setupAudioSession(for type: MediaType) {
        do {
            if type == .video {
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .moviePlayback)
            } else {
                try AVAudioSession.sharedInstance().setCategory(.playback, mode: .default)
            }
            try AVAudioSession.sharedInstance().setActive(true)
        } catch {
        }
    }
    
    private func updateLayout() {
        // Update player layer frame (this needs manual frame setting)
        if let layer = playerLayer, let container = mediaContainerView {
            layer.frame = container.bounds
        }
        
        // Update loading indicator position
        if let indicator = loadingIndicator, let container = mediaContainerView {
            indicator.center = CGPoint(x: container.bounds.midX, y: container.bounds.midY)
        }
    }
    
    // MARK: - Deinit
    
    deinit {
        
        // Flush any pending logs before deinitialization
        LoggingSystem.shared.flushLogs()
        
        // Safe cleanup with try-catch for observers and instance checking
        if let token = timeObserverToken, let observerPlayer = timeObserverPlayer {
            // Only remove if it's still the same player instance
            if observerPlayer === player {
                do {
                    observerPlayer.removeTimeObserver(token)
                } catch {
                }
            } else {
            }
        }
        
        if isObservingPlayerStatus, let currentPlayer = player, let observed = observedPlayerForStatus {
            // Only remove if it's still the same player instance
            if observed === currentPlayer {
                do {
                    currentPlayer.removeObserver(self, forKeyPath: "status")
                } catch {
                }
            } else {
            }
        }
        
        if isObservingPlayerItemStatus, let currentPlayer = player, let currentItem = currentPlayer.currentItem, let itemObserved = observedPlayerItemForStatus {
            // Only remove if it's still the same item instance
            if itemObserved === currentItem {
                do {
                    currentItem.removeObserver(self, forKeyPath: "status")
                } catch {
                }
            } else {
            }
        }
        
        NotificationCenter.default.removeObserver(self)
        
        // Reset observer flags after cleanup to prevent double cleanup in future calls
        timeObserverToken = nil
        timeObserverPlayer = nil
        isObservingPlayerStatus = false
        isObservingPlayerItemStatus = false
        observedPlayerForStatus = nil
        observedPlayerItemForStatus = nil
        
        // Only cleanup UI components, don't call cleanupCurrentMedia which would try observer cleanup again
        player?.pause()
        cleanupUIComponents()
        player = nil
        
    }
    
    private func showErrorMessage(_ message: String, withRetry: Bool = false, retryAction: (() -> Void)? = nil) {
        
        guard let container = mediaContainerView else {
            return
        }
        
        // Remove any existing error view
        errorView?.removeFromSuperview()
        
        // Create error container
        let errorContainer = UIView()
        errorContainer.backgroundColor = UIColor.systemRed.withAlphaComponent(0.1)
        errorContainer.layer.cornerRadius = 8
        errorContainer.layer.borderWidth = 1
        errorContainer.layer.borderColor = UIColor.systemRed.cgColor
        
        // Create error label
        let errorLabel = UILabel()
        errorLabel.text = message
        errorLabel.textColor = .systemRed
        errorLabel.font = UIFont.systemFont(ofSize: 14, weight: .medium)
        errorLabel.textAlignment = .center
        errorLabel.numberOfLines = 0
        
        // Add to container
        errorContainer.addSubview(errorLabel)
        container.addSubview(errorContainer)
        
        // Setup constraints for error container
        errorContainer.translatesAutoresizingMaskIntoConstraints = false
        errorLabel.translatesAutoresizingMaskIntoConstraints = false
        
        var constraints: [NSLayoutConstraint] = [
            // Error container constraints
            errorContainer.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            errorContainer.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            errorContainer.leadingAnchor.constraint(greaterThanOrEqualTo: container.leadingAnchor, constant: 20),
            errorContainer.trailingAnchor.constraint(lessThanOrEqualTo: container.trailingAnchor, constant: -20),
        ]
        
        // Add retry button if requested
        if withRetry, let retryAction = retryAction {
            let retryButton = UIButton(type: .system)
            retryButton.setTitle("🔄 Retry", for: .normal)
            retryButton.setTitleColor(.systemBlue, for: .normal)
            retryButton.titleLabel?.font = .systemFont(ofSize: 16, weight: .medium)
            retryButton.backgroundColor = .systemBackground
            retryButton.layer.cornerRadius = 8
            retryButton.layer.borderWidth = 1
            retryButton.layer.borderColor = UIColor.systemBlue.cgColor
            retryButton.contentEdgeInsets = UIEdgeInsets(top: 8, left: 16, bottom: 8, right: 16)
            errorContainer.addSubview(retryButton)
            
            retryButton.translatesAutoresizingMaskIntoConstraints = false
            
            // Add retry button action
            retryButton.addAction(UIAction { _ in
                retryAction()
            }, for: .touchUpInside)
            
            // Update constraints to include retry button
            constraints.append(contentsOf: [
                // Error label constraints (with retry button)
                errorLabel.topAnchor.constraint(equalTo: errorContainer.topAnchor, constant: 12),
                errorLabel.leadingAnchor.constraint(equalTo: errorContainer.leadingAnchor, constant: 16),
                errorLabel.trailingAnchor.constraint(equalTo: errorContainer.trailingAnchor, constant: -16),
                
                // Retry button constraints
                retryButton.centerXAnchor.constraint(equalTo: errorContainer.centerXAnchor),
                retryButton.topAnchor.constraint(equalTo: errorLabel.bottomAnchor, constant: 16),
                retryButton.bottomAnchor.constraint(equalTo: errorContainer.bottomAnchor, constant: -12),
                retryButton.heightAnchor.constraint(equalToConstant: 36)
            ])
        } else {
            // Error label constraints (without retry button)
            constraints.append(contentsOf: [
                errorLabel.topAnchor.constraint(equalTo: errorContainer.topAnchor, constant: 12),
                errorLabel.bottomAnchor.constraint(equalTo: errorContainer.bottomAnchor, constant: -12),
                errorLabel.leadingAnchor.constraint(equalTo: errorContainer.leadingAnchor, constant: 16),
                errorLabel.trailingAnchor.constraint(equalTo: errorContainer.trailingAnchor, constant: -16)
            ])
        }
        
        NSLayoutConstraint.activate(constraints)
        errorView = errorContainer
    }

    private func getDbPath() -> String {
        return DatabaseAccess.getDbPath() ?? MediaAccess.getSharedMediaCacheDirectory().appendingPathComponent("cache.db").path
    }
    
    // MARK: - Logging (delegated to shared LoggingSystem)
    
    private func logToJSON(
        level: String,
        tag: String? = nil,
        message: String,
        metadata: [String: Any]? = nil
    ) {
        LoggingSystem.shared.log(
            level: level,
            tag: tag ?? "NCE",
            message: message,
            metadata: metadata,
            source: "NCE"
        )
    }
    
    // Legacy function that redirects to LoggingSystem
    private func logToDatabase(
        level: String,
        tag: String? = nil,
        message: String,
        metadata: [String: Any]? = nil
    ) {
        LoggingSystem.shared.log(
            level: level,
            tag: tag ?? "NCE",
            message: message,
            metadata: metadata,
            source: "NCE"
        )
    }
}

// MARK: - Media Type Enum

private enum MediaType {
    case image
    case gif
    case video
    case audio
}

// MARK: - GIF Support Extension

extension UIImage {
    static func gifImageArray(from data: Data) -> [UIImage]? {
        guard let source = CGImageSourceCreateWithData(data as CFData, nil) else { return nil }
        
        let count = CGImageSourceGetCount(source)
        var images: [UIImage] = []
        
        for i in 0..<count {
            if let cgImage = CGImageSourceCreateImageAtIndex(source, i, nil) {
                images.append(UIImage(cgImage: cgImage))
            }
        }
        
        return images.isEmpty ? nil : images
    }
}

// MARK: - Media Controls Support

extension NotificationViewController {
    
    @objc var mediaPlayPauseButtonType: UNNotificationContentExtensionMediaPlayPauseButtonType {
        // Disattiva il bottone di sistema (usiamo controlli custom)
        return .none
    }
    
    @objc var mediaPlayPauseButtonFrame: CGRect {
        // Not used since we return .none
        return CGRect.zero
    }
    
    @objc func mediaPlay() {
        player?.play()
    }
    
    @objc func mediaPause() {
        player?.pause()
    }
}

// MARK: - Notification Action Handling

extension NotificationViewController {

    private func handleNotificationActionInBackground(response: UNNotificationResponse) {

        let actionIdentifier = response.actionIdentifier
        let userInfo = response.notification.request.content.userInfo

        // Extract notification ID and payload
        // Use nid from userInfo (new format), fallback to notificationId (old format), then request.identifier
        let notificationId = extractNotificationId(from: userInfo, fallback: response.notification.request.identifier) ?? response.notification.request.identifier
        
        guard !notificationId.isEmpty else {
            return
        }

        // Handle default tap action
        if actionIdentifier == UNNotificationDefaultActionIdentifier {
            handleDefaultTapActionInBackground(userInfo: userInfo, notificationId: notificationId)
            return
        }

        // Handle custom action buttons
        handleCustomActionInBackground(actionIdentifier: actionIdentifier, userInfo: userInfo, notificationId: notificationId)
    }

    private func handleNotificationAction(response: UNNotificationResponse, completion: @escaping (Bool) -> Void) {
        
        let actionIdentifier = response.actionIdentifier
        let userInfo = response.notification.request.content.userInfo
        
        // Extract notification ID and payload
        // Use nid from userInfo (new format), fallback to notificationId (old format), then request.identifier
        let notificationId = extractNotificationId(from: userInfo, fallback: response.notification.request.identifier) ?? response.notification.request.identifier
        
        guard !notificationId.isEmpty else {
            completion(false)
            return
        }
        
        // Handle default tap action
        if actionIdentifier == UNNotificationDefaultActionIdentifier {
            handleDefaultTapAction(userInfo: userInfo, notificationId: notificationId, completion: completion)
            return
        }
        
        // Handle custom action buttons
        handleCustomAction(actionIdentifier: actionIdentifier, userInfo: userInfo, notificationId: notificationId, completion: completion)
    }

    private func handleDefaultTapActionInBackground(userInfo: [AnyHashable: Any], notificationId: String) {

        // Check if there's a custom tapAction defined
        if let tapAction = extractTapAction(from: userInfo) {

            executeActionInBackground(action: tapAction, notificationId: notificationId)
        } else {
            // Default behavior: store navigation intent for app launch
            let navigationData = [
                "type": "OPEN_NOTIFICATION",
                "value": notificationId,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]
            storeNavigationIntent(data: navigationData)

            // Note: UI is already dismissed, no need to call extensionContext methods
        }
    }

    private func extractNotificationId(from userInfo: [AnyHashable: Any], fallback: String? = nil) -> String? {
        // Prefer nid from userInfo (new format), fallback to notificationId (old format), then fallback parameter
        if let nid = userInfo["nid"] as? String {
            return nid
        } else if let notificationId = userInfo["notificationId"] as? String {
            return notificationId
        } else if let payload = userInfo["payload"] as? [String: Any],
                  let notificationId = payload["notificationId"] as? String {
            return notificationId
        } else if let fallback = fallback {
            return fallback
        }
        return nil
    }
    
    private func handleDefaultTapAction(userInfo: [AnyHashable: Any], notificationId: String, completion: @escaping (Bool) -> Void) {
        
        // Check if there's a custom tapAction defined
        if let tapAction = extractTapAction(from: userInfo) {
            
            executeAction(action: tapAction, notificationId: notificationId, completion: completion)
        } else {
            // Default behavior: store navigation intent for app launch
            let navigationData = [
                "type": "OPEN_NOTIFICATION",
                "value": notificationId,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]
            storeNavigationIntent(data: navigationData)

            // Use the system default action to open the host app.
            // This is more reliable than dismissing the extension and then trying to open a deep link.
            DispatchQueue.main.async {
                self.extensionContext?.performNotificationDefaultAction()
            }

            completion(true)
        }
    }
    
    @objc private func headerTapped() {
        
        // Get current notification data
        guard let userInfo = currentNotificationUserInfo else {
            return
        }
        // Use nid from userInfo (new format), fallback to notificationId (old format), then request identifier
        let notificationId = extractNotificationId(from: userInfo, fallback: currentNotificationRequestIdentifier) ?? currentNotificationRequestIdentifier ?? ""
        guard !notificationId.isEmpty else {
            return
        }
        
        // Call handleDefaultTapAction with a dummy completion
        handleDefaultTapAction(userInfo: userInfo, notificationId: notificationId) { success in
        }
    }
    
    @objc private func mediaContainerTapped() {
        
        // Don't trigger tap action if video player is active (let video controls work)
        if player != nil {
            return
        }
        
        // Get current notification data
        guard let userInfo = currentNotificationUserInfo else {
            return
        }
        // Use nid from userInfo (new format), fallback to notificationId (old format), then request identifier
        let notificationId = extractNotificationId(from: userInfo, fallback: currentNotificationRequestIdentifier) ?? currentNotificationRequestIdentifier ?? ""
        guard !notificationId.isEmpty else {
            return
        }
        
        // Call handleDefaultTapAction with a dummy completion
        handleDefaultTapAction(userInfo: userInfo, notificationId: notificationId) { success in
        }
    }
    
    private func extractTapAction(from userInfo: [AnyHashable: Any]) -> [String: Any]? {
        return NotificationActionHandler.extractTapAction(from: userInfo)
    }
    
    private func handleCustomActionInBackground(actionIdentifier: String, userInfo: [AnyHashable: Any], notificationId: String) {

        // Find the matching action in the payload
        guard let action = findMatchingAction(actionIdentifier: actionIdentifier, userInfo: userInfo) else {
            return
        }

        executeActionInBackground(action: action, notificationId: notificationId)
    }

    private func handleCustomAction(actionIdentifier: String, userInfo: [AnyHashable: Any], notificationId: String, completion: @escaping (Bool) -> Void) {

        // Find the matching action in the payload
        guard let action = findMatchingAction(actionIdentifier: actionIdentifier, userInfo: userInfo) else {
            completion(false)
            return
        }

        executeAction(action: action, notificationId: notificationId, completion: completion)
    }
    
    private func findMatchingAction(actionIdentifier: String, userInfo: [AnyHashable: Any]) -> [String: Any]? {
        return NotificationActionHandler.findMatchingAction(actionIdentifier: actionIdentifier, userInfo: userInfo)
    }
    
    private func executeAction(action: [String: Any], notificationId: String, completion: @escaping (Bool) -> Void) {
        guard let normalized = NotificationActionHandler.normalizeAction(action, notificationId: notificationId),
              let type = normalized["type"] as? String,
              let value = normalized["value"] as? String else {
            completion(false)
            return
        }
        
        guard let userInfo = currentNotificationUserInfo else {
            completion(false)
            return
        }
        
        // Check if this is a navigation action that requires opening the app
        let isNavigationAction = (type == "NAVIGATE" || type == "OPEN_NOTIFICATION")
        
        // Use shared NotificationActionHandler for action execution
        // NotificationActionHandler already handles DB updates for MARK_AS_READ and DELETE
        NotificationActionHandler.executeAction(
            type: type,
            value: value,
            notificationId: notificationId,
            userInfo: userInfo,
            source: "NCE",
            onComplete: { [weak self] result in
                switch result {
                case .success:
                    // For WEBHOOK actions, dismiss the NCE UI after execution.
                    // Header/media taps don't go through the UNNotificationResponse completion(.dismiss) path.
                    if type == "WEBHOOK" {
                        DispatchQueue.main.async {
                            self?.extensionContext?.dismissNotificationContentExtension()
                        }
                    }

                    // For navigation actions, open the app after storing the intent
                    if isNavigationAction {
                        DispatchQueue.main.async {
                            // Use default action to open the host app so it can consume the stored intent.
                            self?.extensionContext?.performNotificationDefaultAction()
                        }
                    }
                    completion(true)
                case .failure(let error):
                    completion(false)
                }
            }
        )
    }

    private func executeActionInBackground(action: [String: Any], notificationId: String) {
        
        // Extract action type and value from action dictionary
        guard let normalized = NotificationActionHandler.normalizeAction(action, notificationId: notificationId),
              let type = normalized["type"] as? String,
              let value = normalized["value"] as? String else {
            return
        }

        guard let userInfo = currentNotificationUserInfo else {
            return
        }


        // Check if this is a navigation action that requires opening the app
        let isNavigationAction = (type == "NAVIGATE" || type == "OPEN_NOTIFICATION")

        // Use shared NotificationActionHandler for action execution
        // NotificationActionHandler already handles DB updates for MARK_AS_READ and DELETE
        NotificationActionHandler.executeAction(
            type: type,
            value: value,
            notificationId: notificationId,
            userInfo: userInfo,
            source: "NCE",
            onComplete: { [weak self] result in
                switch result {
                case .success:
                    
                    // For navigation actions, open the app after storing the intent
                    if isNavigationAction {
                        DispatchQueue.main.async {
                            // Use default action to open the host app so it can consume the stored intent.
                            self?.extensionContext?.performNotificationDefaultAction()
                        }
                    }
                    
                case .failure(let error):
                    _ = error
                    break
                }
            }
        )
    }
}

// MARK: - Helper Methods

extension NotificationViewController {
    
    private func storeNavigationIntent(data: [String: Any]) {
        do {
            try KeychainAccess.storeIntentInKeychain(data: data, service: "zentik-pending-navigation")
        } catch {
            
            logToDatabase(
                level: "ERROR",
                tag: "Navigation",
                message: "Failed to store navigation intent",
                metadata: ["error": error.localizedDescription]
            )
        }
    }
    
}

// MARK: - Network Operations

extension NotificationViewController {
    
    private func executeBackgroundCall(method: String, url: String) async throws {
        
        guard let requestUrl = URL(string: url) else {
            throw NSError(domain: "BackgroundCallError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var request = URLRequest(url: requestUrl)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "BackgroundCallError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
}

// MARK: - Keychain Operations

extension NotificationViewController {
    // MARK: - Shared Cache Management
    
    private func displayMediaFromSharedCache(at index: Int) {
        guard attachmentData.indices.contains(index) else {
            return
        }
        
        let attachmentDataItem = attachmentData[index]
        
        guard let urlString = attachmentDataItem["url"] as? String else {
            return
        }
        
        let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "IMAGE"
        let mediaType = getMediaTypeFromString(mediaTypeString)
        
        
        // Clean up previous media
        cleanupCurrentMedia()
        
        // Mostra loader immediatamente prima di qualsiasi operazione
        showMediaLoadingIndicator()
        
        // Check cache in background to avoid blocking UI
        DispatchQueue.global(qos: .userInitiated).async { [weak self] in
            guard let self = self else { return }
            
            // Try to load from shared cache first
            if let cachedPath = self.getCachedMediaPath(url: urlString, mediaType: mediaTypeString) {
                let cachedURL = URL(fileURLWithPath: cachedPath)
                
                DispatchQueue.main.async {
                    self.hideMediaLoadingIndicator()
                    
                    switch mediaType {
                    case .image, .gif:
                        self.displayImage(from: cachedURL)
                    case .video:
                        self.displayVideo(from: cachedURL)
                    case .audio:
                        self.displayAudio(from: cachedURL)
                    }
                }
            } else {
                
                // NCE should download media directly
                guard let originalURL = URL(string: urlString) else {
                    DispatchQueue.main.async {
                        self.hideMediaLoadingIndicator()
                    }
                    return
                }
                
                // Download and display media directly (già mostra/nasconde loader internamente)
                DispatchQueue.main.async {
                    // downloadAndDisplayMedia gestisce già il loader, quindi lo nascondiamo prima
                    self.hideMediaLoadingIndicator()
                    self.downloadAndDisplayMedia(from: originalURL, mediaType: mediaType)
                }
            }
        }
    }

    private func presentDownloadCTA(urlString: String, mediaType: MediaType, metaMediaType: String) {
        guard let container = mediaContainerView else { return }
        cleanupCurrentMedia()
        hideMediaLoadingIndicator()

        let button = UIButton(type: .system)
        button.setTitle("Tap to download", for: .normal)
        button.setTitleColor(.white, for: .normal)
        button.backgroundColor = .systemBlue
        button.layer.cornerRadius = 10
        button.contentEdgeInsets = UIEdgeInsets(top: 12, left: 16, bottom: 12, right: 16)
        button.addTarget(self, action: #selector(startManualDownloadTapped), for: .touchUpInside)
        button.accessibilityHint = "download:\(metaMediaType.uppercased())|\(urlString)"

        container.addSubview(button)
        button.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            button.centerXAnchor.constraint(equalTo: container.centerXAnchor),
            button.centerYAnchor.constraint(equalTo: container.centerYAnchor),
            button.heightAnchor.constraint(equalToConstant: 44)
        ])

        downloadCTAButton = button
    }

    @objc private func startManualDownloadTapped(_ sender: UIButton) {
        guard let hint = sender.accessibilityHint else { return }
        let parts = hint.components(separatedBy: "|")
        guard parts.count == 2 else { return }
        let typePart = parts[0].replacingOccurrences(of: "download:", with: "")
        let urlPart = parts[1]

        let mediaType = getMediaTypeFromString(typePart)
        guard let url = URL(string: urlPart) else { return }

        // Clear any previous error state for this media
        clearMediaErrorFlag(url: urlPart, mediaType: typePart)
        
        // Mostra loader e avvia download
        showMediaLoadingIndicator()
        downloadCTAButton?.removeFromSuperview()
        downloadCTAButton = nil
        downloadAndDisplayMedia(from: url, mediaType: mediaType)
        // Aggiorna stato selezionato per re-render corretti
        if let idx = attachmentData.firstIndex(where: { ($0["url"] as? String) == urlPart }) {
            selectedMediaIndex = idx
        }
        
    }
    
    
    private func getCachedMediaPath(url: String, mediaType: String) -> String? {
        let cacheKey = "\(mediaType.uppercased())_\(url)"
        let filename = MediaAccess.generateSafeFileName(url: url, mediaType: mediaType, originalFileName: nil as String?)
        let sharedCacheDirectory = MediaAccess.getSharedMediaCacheDirectory()
        let typeDirectory = sharedCacheDirectory.appendingPathComponent(mediaType.uppercased())
        let filePath = typeDirectory.appendingPathComponent(filename).path
        
        
        // Check if directory exists
        if !FileManager.default.fileExists(atPath: typeDirectory.path) {
            // Try to create it
            do {
                try FileManager.default.createDirectory(at: typeDirectory, withIntermediateDirectories: true, attributes: nil)
            } catch {
            }
        }
        
        if FileManager.default.fileExists(atPath: filePath) {
            
            // Verify file size
            do {
                let attributes = try FileManager.default.attributesOfItem(atPath: filePath)
                if let fileSize = attributes[.size] as? Int64 {
                    if fileSize > 0 {
                        return filePath
                    } else {
                        try? FileManager.default.removeItem(atPath: filePath)
                        return nil
                    }
                }
            } catch {
            }
            
            return filePath
        } else {
            
            // For ICON media type, also try with .jpg extension (in case it was resized and converted)
            if mediaType.uppercased() == "ICON" {
                let baseFilename = (typeDirectory.appendingPathComponent(filename).lastPathComponent as NSString).deletingPathExtension
                let jpegPath = typeDirectory.appendingPathComponent("\(baseFilename).jpg").path
                
                
                if FileManager.default.fileExists(atPath: jpegPath) {
                    
                    // Verify JPEG file size
                    do {
                        let attributes = try FileManager.default.attributesOfItem(atPath: jpegPath)
                        if let fileSize = attributes[.size] as? Int64 {
                            if fileSize > 0 {
                                return jpegPath
                            } else {
                                try? FileManager.default.removeItem(atPath: jpegPath)
                                return nil
                            }
                        }
                    } catch {
                    }
                    
                    return jpegPath
                } else {
                }
            }
        }
        
        return nil
    }
    
    private func pollForMediaCompletion(url: String, mediaType: String, originalMediaType: MediaType, attempt: Int = 1) {
        // Timeout after 30 attempts (15 seconds)
        if attempt > 30 {
            self.hideMediaLoadingIndicator()
            self.hideFooterIfSingleMedia()
            self.showMediaError(
                "Download failed: Timeout",
                allowRetry: true,
                retryAction: { [weak self] in
                    self?.retryCurrentMediaDownload()
                }
            )
            return
        }
        
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self else { return }
            
            
            // Check if media is still the currently selected one
            guard self.attachmentData.indices.contains(self.selectedMediaIndex) else {
                return
            }
            
            let currentMedia = self.attachmentData[self.selectedMediaIndex]
            guard let currentUrl = currentMedia["url"] as? String,
                  currentUrl == url else {
                return
            }
            
            if let cachedPath = self.getCachedMediaPath(url: url, mediaType: mediaType) {
                self.hideMediaLoadingIndicator()
                
                let cachedURL = URL(fileURLWithPath: cachedPath)
                switch originalMediaType {
                case .image, .gif:
                    self.displayImage(from: cachedURL)
                case .video:
                    self.displayVideo(from: cachedURL)
                case .audio:
                    self.displayAudio(from: cachedURL)
                }
            } else {
                // Check current states
                let isDownloading = MediaAccess.isMediaDownloading(url: url, mediaType: mediaType)
                let errorCheck = MediaAccess.hasMediaDownloadError(url: url, mediaType: mediaType)
                
                
                if isDownloading {
                    // Still downloading, continue polling
                    self.pollForMediaCompletion(url: url, mediaType: mediaType, originalMediaType: originalMediaType, attempt: attempt + 1)
                } else if errorCheck.hasError {
                    self.hideMediaLoadingIndicator()
                    
                    // Remove footer if only one non-ICON media (same logic as displayMediaFromSharedCache)
                    self.hideFooterIfSingleMedia()
                    
                    self.showMediaError(
                        errorCheck.errorMessage ?? "Download failed",
                        allowRetry: true,
                        retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        }
                    )
                } else {
                    // Download completed but no file found, fallback to direct download
                    self.hideMediaLoadingIndicator()
                    guard let originalURL = URL(string: url) else { return }
                    self.downloadAndDisplayMedia(from: originalURL, mediaType: originalMediaType)
                }
            }
        }
    }
    
    // MARK: - Icon Loading from Shared Cache
    
    private func loadIconFromSharedCache(iconUrl: String, iconImageView: UIImageView) {
        
        // Ensure icon is visible since we have an ICON attachment
        iconImageView.isHidden = false
        
        // First, try to get the icon from shared cache
        let sharedCacheDir = MediaAccess.getSharedMediaCacheDirectory()
        
        let filename = MediaAccess.generateSafeFileName(url: iconUrl, mediaType: "ICON", originalFileName: nil as String?)
        let cachedIconPath = sharedCacheDir.appendingPathComponent("ICON").appendingPathComponent(filename)
        
        // Check if icon exists in shared cache
        if FileManager.default.fileExists(atPath: cachedIconPath.path) {
            
            if let data = try? Data(contentsOf: cachedIconPath),
               let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    iconImageView.image = image
                }
                return
            } else {
            }
        } else {
            
            // Try with .jpg extension in case it was converted during resize
            let baseFilename = (cachedIconPath.lastPathComponent as NSString).deletingPathExtension
            let jpegIconPath = cachedIconPath.deletingLastPathComponent().appendingPathComponent("\(baseFilename).jpg")
            
            if FileManager.default.fileExists(atPath: jpegIconPath.path) {
                
                if let data = try? Data(contentsOf: jpegIconPath),
                   let image = UIImage(data: data) {
                    DispatchQueue.main.async {
                        iconImageView.image = image
                    }
                    return
                } else {
                }
            } else {
            }
        }
        
        // Fallback to direct download
        downloadIconDirectly(iconUrl: iconUrl, iconImageView: iconImageView)
    }
    
    private func downloadIconDirectly(iconUrl: String, iconImageView: UIImageView) {
        guard let url = URL(string: iconUrl) else {
            // Since we have an ICON attachment, show a placeholder instead of hiding
            iconImageView.image = UIImage(systemName: "photo")
            iconImageView.tintColor = .systemGray
            iconImageView.isHidden = false
            return
        }
        
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let data = data, let image = UIImage(data: data) {
                    iconImageView.image = image
                } else {
                    // Since we have an ICON attachment, show a placeholder instead of hiding
                    iconImageView.image = UIImage(systemName: "photo")
                    iconImageView.tintColor = .systemGray
                    iconImageView.isHidden = false
                }
            }
        }.resume()
    }
}
