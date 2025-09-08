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
    
    // Download management
    private var currentDownloadTask: URLSessionDownloadTask?
    private var mediaLoadingIndicator: UIActivityIndicatorView?
    private var errorView: UIView?
    private var downloadCTAButton: UIButton?

    // Stored notification texts
    private var notificationTitleText: String = ""
    private var notificationSubtitleText: String = ""
    private var notificationBodyText: String = ""
    private var audioInfoView: UIView?
    
    // Current notification data for tap actions
    private var currentNotificationUserInfo: [AnyHashable: Any]?
    
    // Outlets (if you use Storyboard)
    @IBOutlet weak var bodyLabel: UILabel?
    @IBOutlet weak var titleLabel: UILabel?
    @IBOutlet weak var containerView: UIView?
    
    // MARK: - Lifecycle
    
    override func viewDidLoad() {
        super.viewDidLoad()
        print("📱 [ContentExtension] viewDidLoad - Initializing")
        
        // Clean up any residual observers from previous instances
        cleanupAllObservers()
        
        setupUI()
    }
    
    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        
        // Content Extension is always expanded - no mode changes
        print("📱 [ContentExtension] Layout updated. Bounds: \(view.bounds)")
        
        updateLayout()
    }
    
    // MARK: - UNNotificationContentExtension
    
    func didReceive(_ notification: UNNotification) {
        print("📱 [ContentExtension] ========== NOTIFICATION RECEIVED ==========")
        print("📱 [ContentExtension] Title: \(notification.request.content.title)")
        print("📱 [ContentExtension] Body: \(notification.request.content.body)")
        print("📱 [ContentExtension] Category: \(notification.request.content.categoryIdentifier)")
        print("📱 [ContentExtension] Attachments count: \(notification.request.content.attachments.count)")
        
        // Clean up any previous media and observers before processing new notification
        cleanupCurrentMedia()
        
        // Store notification texts
        notificationTitleText = notification.request.content.title
        notificationSubtitleText = notification.request.content.subtitle
        notificationBodyText = notification.request.content.body
        
        // Store current notification data for tap actions
        currentNotificationUserInfo = notification.request.content.userInfo
        
        // Store attachments and data
        attachments = notification.request.content.attachments
        if let data = notification.request.content.userInfo["attachmentData"] as? [[String: Any]] {
            attachmentData = data
            print("📱 [ContentExtension] AttachmentData count: \(attachmentData.count)")
            print("📱 [ContentExtension] AttachmentData content: \(attachmentData)")
        } else {
            print("📱 [ContentExtension] ❌ No attachmentData found in userInfo")
            attachmentData = []
        }
        
                // Content Extension is ALWAYS in expanded mode
        // Compact mode is handled by NotificationService alone
        isExpandedMode = true
        print("📱 [ContentExtension] View bounds: \(view.bounds)")
        print("📱 [ContentExtension] Mode: EXPANDED (Content Extension always expanded)")
        
        // Setup expanded mode
        setupExpandedMode()
        // Adjust header lines after receiving content
        adjustHeaderLineCounts()
    }
    
    func didReceive(_ response: UNNotificationResponse, completionHandler completion: @escaping (UNNotificationContentExtensionResponseOption) -> Void) {
        print("📱 [ContentExtension] ========== ACTION RESPONSE RECEIVED ==========")
        print("📱 [ContentExtension] Action identifier: \(response.actionIdentifier)")
        print("📱 [ContentExtension] Notification ID: \(response.notification.request.identifier)")
        
        let userInfo = response.notification.request.content.userInfo
        print("📱 [ContentExtension] UserInfo: \(userInfo)")
        
        // Handle the action when app is terminated
        handleNotificationAction(response: response) { [weak self] success in
            if success {
                print("📱 [ContentExtension] ✅ Action handled successfully")
                completion(.dismiss)
            } else {
                print("📱 [ContentExtension] ❌ Action handling failed")
                completion(.doNotDismiss)
            }
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
        } else {
            // Try to find app icon
            var fallbackImage: UIImage?
            
            // Try different app icon names
            let appIconNames = ["AppIcon", "AppIcon-60", "AppIcon-76", "AppIcon-83.5", "AppIcon-1024"]
            for iconName in appIconNames {
                if let appIcon = UIImage(named: iconName) {
                    fallbackImage = appIcon
                    print("📱 [ContentExtension] ✅ Found app icon: \(iconName)")
                    break
                }
            }
            
            if let appIcon = fallbackImage {
                iconView.image = appIcon
                iconView.isHidden = false
            } else {
                // Hide icon completely if no app icon is available
                iconView.isHidden = true
                print("📱 [ContentExtension] ⚠️ No icon available, hiding icon view")
            }
        }

        let labelsStack = UIStackView()
        labelsStack.axis = .vertical
        labelsStack.alignment = .fill
        labelsStack.spacing = 2
        labelsStack.setContentCompressionResistancePriority(.required, for: .vertical)
        labelsStack.setContentHuggingPriority(.required, for: .vertical)
        
        let title = UILabel()
        title.font = .systemFont(ofSize: 16, weight: .semibold)
        title.textColor = .label
        title.numberOfLines = 2
        title.text = notificationTitleText.isEmpty ? "" : notificationTitleText
        title.setContentCompressionResistancePriority(.required, for: .vertical)
        title.setContentHuggingPriority(.required, for: .vertical)
        headerTitleLabel = title
        
        let subtitle = UILabel()
        subtitle.font = .systemFont(ofSize: 12)
        subtitle.textColor = .secondaryLabel
        subtitle.numberOfLines = 2
        subtitle.text = notificationSubtitleText
        subtitle.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        subtitle.setContentCompressionResistancePriority(.required, for: .vertical)
        subtitle.setContentHuggingPriority(.required, for: .vertical)
        headerSubtitleLabel = subtitle
        
        let body = UILabel()
        body.font = .systemFont(ofSize: 12)
        body.textColor = .secondaryLabel
        body.numberOfLines = 3
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

        // Footer container (selector)
        let footer = UIView()
        view.addSubview(footer)
        footerContainerView = footer
        footer.translatesAutoresizingMaskIntoConstraints = false
        footerTopToContainerConstraint = footer.topAnchor.constraint(equalTo: container.bottomAnchor, constant: 8)
        NSLayoutConstraint.activate([
            footerTopToContainerConstraint!,
            footer.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            footer.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            footer.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        
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

    // MARK: - Dynamic Header Lines (max total 10)
    private func adjustHeaderLineCounts() {
        guard let titleLabel = headerTitleLabel,
              let subtitleLabel = headerSubtitleLabel,
              let bodyLabel = headerBodyLabel else { return }

        // Normalizza i separatori di riga (ad es. U+2028, U+2029) per un wrapping coerente
        let normalizedTitle = normalizeLineSeparators(notificationTitleText)
        let normalizedSubtitle = normalizeLineSeparators(notificationSubtitleText)
        let normalizedBody = normalizeLineSeparators(notificationBodyText)

        let totalWidth = view.bounds.width
        let horizontalInsets: CGFloat = 12 + 12
        let headerStackInsets: CGFloat = 8 + 8
        let iconWidth: CGFloat = (headerIconImageView?.isHidden ?? false) ? 0 : 50
        let spacing: CGFloat = (headerIconImageView?.isHidden ?? false) ? 0 : 10
        let availableWidth = max(100, totalWidth - horizontalInsets - headerStackInsets - iconWidth - spacing)
        // Ensure UILabels know their wrapping width for correct intrinsic height calculation
        titleLabel.preferredMaxLayoutWidth = availableWidth
        subtitleLabel.preferredMaxLayoutWidth = availableWidth
        bodyLabel.preferredMaxLayoutWidth = availableWidth
        // Improve truncation appearance
        bodyLabel.allowsDefaultTighteningForTruncation = true
        print("📱 [ContentExtension] Header width calc -> total: \(totalWidth), available: \(availableWidth), iconHidden: \(headerIconImageView?.isHidden ?? false)")

        func requiredLines(for text: String, font: UIFont, width: CGFloat) -> Int {
            if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return 0 }
            // Usa NSTextStorage + NSLayoutManager + NSTextContainer per un conteggio linee accurato, inclusi separatori Unicode
            let textStorage = NSTextStorage(string: text)
            let textContainer = NSTextContainer(size: CGSize(width: width, height: .greatestFiniteMagnitude))
            textContainer.lineFragmentPadding = 0
            let layoutManager = NSLayoutManager()
            layoutManager.addTextContainer(textContainer)
            textStorage.addLayoutManager(layoutManager)
            textStorage.addAttribute(.font, value: font, range: NSRange(location: 0, length: textStorage.length))
            var lineCount = 0
            var index = 0
            while index < layoutManager.numberOfGlyphs {
                var lineRange = NSRange(location: 0, length: 0)
                layoutManager.lineFragmentRect(forGlyphAt: index, effectiveRange: &lineRange)
                lineCount += 1
                index = NSMaxRange(lineRange)
            }
            return lineCount
        }

        let totalCap = 15

        let needTitle = requiredLines(for: normalizedTitle, font: titleLabel.font, width: availableWidth)
        let needSubtitle = requiredLines(for: normalizedSubtitle, font: subtitleLabel.font, width: availableWidth)
        let needBody = requiredLines(for: normalizedBody, font: bodyLabel.font, width: availableWidth)
        print("📱 [ContentExtension] Needed lines -> title: \(needTitle), subtitle: \(needSubtitle), body: \(needBody)")

        // Title max 2, Subtitle max 1, rest to body up to total 10
        var useTitle = min(needTitle, 2)
        var useSubtitle = min(needSubtitle, 1)
        var bodyCap = max(0, totalCap - (useTitle + useSubtitle))
        var useBody = min(needBody, bodyCap)
        print("📱 [ContentExtension] Initial alloc -> title: \(useTitle)/2, subtitle: \(useSubtitle)/1, bodyCap: \(bodyCap), body: \(useBody)")

        titleLabel.numberOfLines = max(1, useTitle)
        subtitleLabel.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        subtitleLabel.numberOfLines = subtitleLabel.isHidden ? 0 : max(0, useSubtitle)
        // If text is longer than allocated lines, add a visual buffer by allowing one extra truncation line when under total cap
        if needBody > useBody {
            let extra = min(1, max(0, totalCap - (useTitle + useSubtitle + useBody)))
            useBody += extra
        }
        bodyLabel.numberOfLines = max(0, useBody)
        print("📱 [ContentExtension] Applied lines -> title: \(titleLabel.numberOfLines), subtitle: \(subtitleLabel.numberOfLines), body: \(bodyLabel.numberOfLines) (cap: \(totalCap))")
        titleLabel.lineBreakMode = .byTruncatingTail
        subtitleLabel.lineBreakMode = .byTruncatingTail
        bodyLabel.lineBreakMode = .byTruncatingTail

        // Avoid forcing layout here to prevent potential layout loops
    }
    

    
    private func setupExpandedMode() {
        print("📱 [ContentExtension] Setting up EXPANDED mode")
        print("📱 [ContentExtension] AttachmentData count: \(attachmentData.count)")
        print("📱 [ContentExtension] Attachments count: \(attachments.count)")
        
        // Use attachmentData (all media) instead of attachments (only NSE downloaded media)
        if attachmentData.isEmpty {
            print("📱 [ContentExtension] ⚠️ No attachment data available - showing header only")
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
            print("📱 [ContentExtension] Preferred size (header-only): \(preferredContentSize)")
            return
        }
        
        print("📱 [ContentExtension] Using attachmentData with \(attachmentData.count) items instead of \(attachments.count) NSE attachments")
        
        // Continue with normal expanded mode setup
        
        // Aggiorna header (testi + icona) dopo didReceive
        headerTitleLabel?.text = notificationTitleText
        headerSubtitleLabel?.text = notificationSubtitleText
        headerSubtitleLabel?.isHidden = notificationSubtitleText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        headerBodyLabel?.text = normalizeLineSeparators(notificationBodyText)
        refreshHeaderIcon()

        // Footer selector mostrato solo se esistono almeno 2 media non-ICON e non-AUDIO
        let nonIconItemsCount = attachmentData.filter { (item) in
            let t = (item["mediaType"] as? String ?? "").uppercased()
            return t != "ICON" && t != "AUDIO"
        }.count
        if nonIconItemsCount > 1 {
            setupMediaSelectorFromData()
            footerTopToContainerConstraint?.constant = 8
        } else {
            mediaSelectorView?.removeFromSuperview()
            footerTopToContainerConstraint?.constant = 0 // elimina il bordo/spacing quando non c'è footer
        }
        
        // Se ci sono solo ICON e AUDIO, o nessun media disponibile, non espandere con contenuto gigante: mostra placeholder compatto
        let hasNonIcon = attachmentData.contains { item in
            let t = (item["mediaType"] as? String ?? "").uppercased()
            return t != "ICON" && t != "AUDIO"
        }

        if hasNonIcon {
            // Display first non-ICON media from attachmentData
            let firstNonIconIndex = findFirstNonIconMediaIndex()
            selectedMediaIndex = firstNonIconIndex
            displayMediaFromSharedCache(at: firstNonIconIndex)
        } else {
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
            print("📱 [ContentExtension] Showing header-only mode (only ICON/AUDIO). Preferred size: \(preferredContentSize)")
            return
        }
        
        // Set expanded size (iniziale), verrà aggiustata in base al media
        preferredContentSize = CGSize(width: view.bounds.width, height: headerViewHeight() + 240 + footerHeight())
    }

    private func refreshHeaderIcon() {
        guard let imageView = headerIconImageView else { return }
        // Cerca ICON negli attachmentData
        if let iconData = attachmentData.first(where: { ($0["mediaType"] as? String ?? "").uppercased() == "ICON" }),
           let iconUrl = iconData["url"] as? String {
            // Ensure icon is visible since we have an ICON attachment
            imageView.isHidden = false
            // Prova cache condivisa, poi download diretto
            loadIconFromSharedCache(iconUrl: iconUrl, iconImageView: imageView)
        } else {
            // Try to find app icon
            var fallbackImage: UIImage?
            
            // Try different app icon names
            let appIconNames = ["AppIcon", "AppIcon-60", "AppIcon-76", "AppIcon-83.5", "AppIcon-1024"]
            for iconName in appIconNames {
                if let appIcon = UIImage(named: iconName) {
                    fallbackImage = appIcon
                    print("📱 [ContentExtension] ✅ Found app icon: \(iconName)")
                    break
                }
            }
            
            if let appIcon = fallbackImage {
                imageView.image = appIcon
                imageView.isHidden = false
            } else {
                // Nessuna icona disponibile: manteniamo comunque lo spazio dell'icona per non alterare la larghezza disponibile
                // Impostiamo un placeholder trasparente 50x50 per mantenere la metrica coerente con il caso con icona
                imageView.image = UIImage()
                imageView.isHidden = false
                print("📱 [ContentExtension] ⚠️ No icon available, keeping placeholder to preserve layout width")
            }
        }
    }

    

    // MARK: - Dynamic height adjustments
    private func adjustPreferredHeight(forContentSize size: CGSize) {
        guard size.width > 0 && size.height > 0 else { return }
        let maxWidth = view.bounds.width
        let aspect = size.height / size.width
        let targetHeight = max(120, min(700, maxWidth * aspect))
        preferredContentSize = CGSize(width: maxWidth, height: targetHeight + headerViewHeight() + footerHeight())
        mediaHeightConstraint?.constant = targetHeight
        view.layoutIfNeeded()
        print("📱 [ContentExtension] 🔧 Adjusted preferred/media height: viewer=\(targetHeight)")
    }

    private func headerViewHeight() -> CGFloat {
        guard let header = headerView else { return 0 }
        header.setNeedsLayout()
        header.layoutIfNeeded()
        // Constrain width to available content width (leading/trailing 12)
        let availableWidth = max(100, view.bounds.width - 24)
        let targetSize = CGSize(width: availableWidth, height: UIView.layoutFittingCompressedSize.height)
        let height = header.systemLayoutSizeFitting(
            targetSize,
            withHorizontalFittingPriority: .required,
            verticalFittingPriority: .fittingSizeLevel
        ).height
        // Fallback expected height from line counts if AutoLayout underestimates
        var expectedLabelsHeight: CGFloat = 0
        if let t = headerTitleLabel { expectedLabelsHeight += t.font.lineHeight * CGFloat(max(1, t.numberOfLines)) }
        if let s = headerSubtitleLabel, !(s.isHidden) { expectedLabelsHeight += s.font.lineHeight * CGFloat(max(0, s.numberOfLines)) + 2 }
        if let b = headerBodyLabel { expectedLabelsHeight += b.font.lineHeight * CGFloat(max(0, b.numberOfLines)) }
        // Stack paddings: headerStack top/bottom 8, header outer top 8 + bottom 8
        let verticalPaddings: CGFloat = 8 + 8 + 8 + 8
        let labelsTotal = expectedLabelsHeight + verticalPaddings
        let iconBlock: CGFloat = 50 + (8 + 8 + 8 + 8) // icon 50 + same paddings
        let expected = max(labelsTotal, iconBlock)
        let final = max(56, max(height + 8, expected))
        print("📱 [ContentExtension] headerViewHeight -> availableWidth: \(availableWidth), measured: \(height), expected: \(expected), final: \(final)")
        return final
    }

    private func computeHeaderExpectedHeight() -> CGFloat {
        let availableWidth = max(100, view.bounds.width - 24)
        let normalizedTitle = normalizeLineSeparators(notificationTitleText)
        let normalizedSubtitle = normalizeLineSeparators(notificationSubtitleText)
        let normalizedBody = normalizeLineSeparators(notificationBodyText)
        func neededLines(_ text: String, font: UIFont, cap: Int) -> (lines: Int, height: CGFloat) {
            if text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty { return (0, 0) }
            let rect = (text as NSString).boundingRect(
                with: CGSize(width: availableWidth, height: .greatestFiniteMagnitude),
                options: [.usesLineFragmentOrigin, .usesFontLeading],
                attributes: [.font: font],
                context: nil
            )
            let lh = font.lineHeight
            let maxH = lh * CGFloat(cap)
            let usedH = min(rect.height, maxH)
            let usedLines = Int(ceil(usedH / max(lh, 1)))
            return (usedLines, usedH)
        }
        let titleFont = headerTitleLabel?.font ?? .systemFont(ofSize: 16, weight: .semibold)
        let subtitleFont = headerSubtitleLabel?.font ?? .systemFont(ofSize: 12)
        let bodyFont = headerBodyLabel?.font ?? .systemFont(ofSize: 12)
        let totalCap = 15
        let titleRes = neededLines(normalizedTitle, font: titleFont, cap: 2)
        let subtitleCap = normalizedSubtitle.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? 0 : 1
        let subtitleRes = neededLines(normalizedSubtitle, font: subtitleFont, cap: subtitleCap)
        let bodyCap = max(0, totalCap - (titleRes.lines + subtitleRes.lines))
        let bodyRes = neededLines(normalizedBody, font: bodyFont, cap: bodyCap)
        let labelsHeight = titleRes.height + subtitleRes.height + bodyRes.height
        let verticalPaddings: CGFloat = 8 + 8 + 8 + 8
        let iconBlock: CGFloat = (headerIconImageView?.isHidden ?? false) ? 0 : (50 + verticalPaddings)
        let expected = max(labelsHeight + verticalPaddings, iconBlock, 56)
        print("📱 [ContentExtension] computeHeaderExpectedHeight -> labels: \(labelsHeight), expected: \(expected)")
        return expected
    }

    private func footerHeight() -> CGFloat {
        return (mediaSelectorView?.superview != nil) ? 88 : 0
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
    
    
    private func setupMediaSelector() {
        print("📱 [ContentExtension] Setting up media selector with \(attachments.count) items")
        
        // Remove existing selector if any
        mediaSelectorView?.removeFromSuperview()
        mediaThumbnails.forEach { $0.removeFromSuperview() }
        mediaThumbnails.removeAll()
        
        // Create selector scroll view
        let scrollView = UIScrollView()
        scrollView.backgroundColor = UIColor.systemGray6
        scrollView.showsHorizontalScrollIndicator = false
        scrollView.showsVerticalScrollIndicator = false
        scrollView.layer.borderWidth = 1
        scrollView.layer.borderColor = UIColor.systemGray4.cgColor
        view.addSubview(scrollView)
        mediaSelectorView = scrollView
        
        print("📱 [ContentExtension] Created media selector with background")
        
        // Setup constraints for selector
        scrollView.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            scrollView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            scrollView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            scrollView.bottomAnchor.constraint(equalTo: view.bottomAnchor),
            scrollView.heightAnchor.constraint(equalToConstant: 80)
        ])
        
        // Update container constraints to make room for selector
        if let container = mediaContainerView {
            // Remove all existing constraints for the container
            container.removeFromSuperview()
            view.addSubview(container)
            
            // Re-setup container constraints with proper bottom constraint
            container.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                container.topAnchor.constraint(equalTo: view.topAnchor),
                container.leadingAnchor.constraint(equalTo: view.leadingAnchor),
                container.trailingAnchor.constraint(equalTo: view.trailingAnchor),
                container.bottomAnchor.constraint(equalTo: scrollView.topAnchor)
            ])
        }
        
        // Create thumbnails
        let thumbnailSize: CGFloat = 60
        let spacing: CGFloat = 10
        var xOffset: CGFloat = spacing
        
        for (index, attachment) in attachments.enumerated() {
            // Skip AUDIO media types - they shouldn't appear in the selector
            let mediaType = getMediaType(for: attachment)
            if mediaType == .audio {
                print("📱 [ContentExtension] Skipping AUDIO attachment at index \(index) from media selector")
                continue
            }
            
            let button = UIButton(type: .custom)
            button.tag = index
            button.layer.cornerRadius = 8
            button.layer.borderWidth = 3
            button.layer.borderColor = (index == 0) ? UIColor.systemBlue.cgColor : UIColor.systemGray3.cgColor
            button.backgroundColor = UIColor.systemBackground
            button.clipsToBounds = true
            button.addTarget(self, action: #selector(thumbnailTapped(_:)), for: .touchUpInside)
            
            // Set thumbnail based on media type
            setupThumbnail(for: button, attachment: attachment, index: index)
            
            scrollView.addSubview(button)
            button.frame = CGRect(x: xOffset, y: 10, width: thumbnailSize, height: thumbnailSize)
            
            mediaThumbnails.append(button)
            xOffset += thumbnailSize + spacing
            
            print("📱 [ContentExtension] Created thumbnail \(index) at x: \(xOffset - thumbnailSize - spacing)")
        }
        
        scrollView.contentSize = CGSize(width: xOffset, height: 80)
    }
    
    private func setupMediaSelectorFromData() {
        print("📱 [ContentExtension] Setting up media selector from attachmentData with \(attachmentData.count) items")
        
        // Remove existing selector if any
        mediaSelectorView?.removeFromSuperview()
        mediaThumbnails.forEach { $0.removeFromSuperview() }
        mediaThumbnails.removeAll()
        
        // Create container view for selector (no icon inside footer per richiesta)
        let selectorContainer = footerContainerView ?? UIView()
        if selectorContainer.superview == nil {
            selectorContainer.backgroundColor = UIColor.systemGray6
            selectorContainer.layer.borderWidth = 1
            selectorContainer.layer.borderColor = UIColor.systemGray4.cgColor
            view.addSubview(selectorContainer)
            footerContainerView = selectorContainer
        }
        
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
        
        print("📱 [ContentExtension] Created media selector from data with background")
        
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
                print("📱 [ContentExtension] Skipping ICON attachment at index \(index) from media selector")
                continue
            }
            if mediaTypeString.uppercased() == "AUDIO" {
                print("📱 [ContentExtension] Skipping AUDIO attachment at index \(index) from media selector")
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
            
            print("📱 [ContentExtension] Created thumbnail \(index) from data at x: \(xOffset - thumbnailSize - spacing)")
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
    
    private func setupThumbnail(for button: UIButton, attachment: UNNotificationAttachment, index: Int) {
        let mediaType = getMediaType(for: attachment)
        
        // Create type label
        let label = UILabel()
        label.textAlignment = .center
        label.font = .systemFont(ofSize: 10, weight: .medium)
        label.textColor = .white
        label.backgroundColor = UIColor.black.withAlphaComponent(0.6)
        
        switch mediaType {
        case .image, .gif:
            // Try to load thumbnail
            if let data = try? Data(contentsOf: attachment.url),
               let image = UIImage(data: data) {
                button.setImage(image, for: .normal)
                button.imageView?.contentMode = .scaleAspectFill
            }
            label.text = mediaType == .gif ? "GIF" : "IMG"
            
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
        print("📱 [ContentExtension] Thumbnail from data tapped: \(index)")
        
        // Check if we're already displaying this media
        if selectedMediaIndex == index {
            print("📱 [ContentExtension] Same media already selected (\(index)), skipping refresh")
            return
        }
        
        // Update selection UI
        mediaThumbnails.forEach { $0.layer.borderColor = UIColor.systemGray3.cgColor }
        sender.layer.borderColor = UIColor.systemBlue.cgColor
        
        // Display selected media from attachmentData
        selectedMediaIndex = index
        displayMediaFromSharedCache(at: index)
    }
    
    @objc private func thumbnailTapped(_ sender: UIButton) {
        let index = sender.tag
        print("📱 [ContentExtension] Thumbnail tapped: \(index)")
        
        // Check if we're already displaying this media
        if selectedMediaIndex == index {
            print("📱 [ContentExtension] Same media already selected (\(index)), skipping refresh")
            return
        }
        
        // Update selection UI
        mediaThumbnails.forEach { $0.layer.borderColor = UIColor.systemGray3.cgColor }
        sender.layer.borderColor = UIColor.systemBlue.cgColor
        
        // Display selected media
        selectedMediaIndex = index
        displayMedia(at: index)
    }
    
    // MARK: - Media Display
    
    private func displayMedia(at index: Int) {
        guard attachments.indices.contains(index) else {
            print("📱 [ContentExtension] Invalid index: \(index)")
                return
        }
        
        let attachment = attachments[index]
        print("📱 [ContentExtension] Displaying media at index \(index): \(attachment.url.lastPathComponent)")
        
        // Clean up previous media
        cleanupCurrentMedia()
        
        // Display based on type
        let mediaType = getMediaType(for: attachment)
        
        switch mediaType {
        case .image, .gif:
            displayImage(from: attachment.url)
        case .video:
            displayVideo(from: attachment.url)
        case .audio:
            displayAudio(from: attachment.url)
        }
    }
    
    private func displayMediaFromData(at index: Int) {
        guard attachmentData.indices.contains(index) else {
            print("📱 [ContentExtension] Invalid attachmentData index: \(index)")
            return
        }
        
        let attachmentDataItem = attachmentData[index]
        print("📱 [ContentExtension] Displaying media from data at index \(index)")
        
        guard let urlString = attachmentDataItem["url"] as? String,
              let url = URL(string: urlString) else {
            print("📱 [ContentExtension] Invalid URL in attachmentData")
            return
        }
        
        let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "IMAGE"
        let mediaType = getMediaTypeFromString(mediaTypeString)
        
        print("📱 [ContentExtension] Media type: \(mediaTypeString), URL: \(urlString)")
        
        // Clean up previous media
        cleanupCurrentMedia()
        
        // Download and display media
        downloadAndDisplayMedia(from: url, mediaType: mediaType)
    }
    
    private func downloadAndDisplayMedia(from url: URL, mediaType: MediaType) {
        print("📱 [ContentExtension] Downloading media: \(mediaType)")
        
        // Cancel any existing download
        currentDownloadTask?.cancel()
        
        // Show loading indicator
        showMediaLoadingIndicator()
        
        // Prepare shared cache destination (always save in shared directory)
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let mediaTypeString: String = {
            switch mediaType {
            case .image: return "IMAGE"
            case .gif: return "GIF"
            case .video: return "VIDEO"
            case .audio: return "AUDIO"
            }
        }()
        let safeFileName = generateSafeFileName(url: url.absoluteString, mediaType: mediaTypeString, originalFileName: nil)
        let typeDirectory = sharedCacheDirectory.appendingPathComponent(mediaTypeString)
        let sharedFileURL = typeDirectory.appendingPathComponent(safeFileName)
        do {
            try FileManager.default.createDirectory(at: typeDirectory, withIntermediateDirectories: true, attributes: nil)
        } catch {
            print("📱 [ContentExtension] ⚠️ Failed to create type directory: \(error)")
        }
        
        print("📱 [ContentExtension] Original URL: \(url.absoluteString)")
        print("📱 [ContentExtension] Original extension: \(url.pathExtension)")
        print("📱 [ContentExtension] Target shared filename: \(safeFileName)")
        
        // Download media
        let task = URLSession.shared.downloadTask(with: url) { [weak self] tempURL, response, error in
            guard let self = self else { return }
            
            DispatchQueue.main.async {
                // Hide loading indicator
                self.hideMediaLoadingIndicator()
            }
            
            guard let tempURL = tempURL, error == nil else {
                print("📱 [ContentExtension] Download failed: \(error?.localizedDescription ?? "Unknown error")")
                DispatchQueue.main.async {
                    self.showMediaError(
                        "Download failed",
                        allowRetry: true,
                        retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        }
                    )
                }
                return
            }
            
            do {
                // Persist file in shared cache
                let data = try Data(contentsOf: tempURL)
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

                DispatchQueue.main.async {
                    print("📱 [ContentExtension] ✅ Media downloaded to shared cache: \(sharedFileURL.lastPathComponent)")
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
                print("📱 [ContentExtension] File operation failed: \(error)")
                DispatchQueue.main.async {
                    self.showMediaError(
                        "File operation failed",
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
        
        print("📱 [ContentExtension] 🔄 Showing media loading indicator")
    }
    
    private func hideMediaLoadingIndicator() {
        mediaLoadingIndicator?.stopAnimating()
        mediaLoadingIndicator?.removeFromSuperview()
        mediaLoadingIndicator = nil
        print("📱 [ContentExtension] ✅ Hidden media loading indicator")
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
                print("📱 [ContentExtension] 🔄 Retry button tapped")
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
        
        print("📱 [ContentExtension] ❌ Showing media error: \(message) (retry: \(allowRetry))")
    }
    
    private func hideMediaError() {
        // Remove any existing error views
        mediaContainerView?.subviews.forEach { subview in
            if subview.tag == 999 { // Error view tag
                subview.removeFromSuperview()
            }
        }
        print("📱 [ContentExtension] ✅ Hidden media error view")
    }
    
    private func retryCurrentMediaDownload() {
        guard attachmentData.indices.contains(selectedMediaIndex) else {
            print("📱 [ContentExtension] ❌ Invalid selectedMediaIndex for retry: \(selectedMediaIndex)")
            return
        }
        
        let attachmentDataItem = attachmentData[selectedMediaIndex]
        guard let urlString = attachmentDataItem["url"] as? String,
              let url = URL(string: urlString) else {
            print("📱 [ContentExtension] ❌ Invalid URL for retry")
            return
        }
        
        let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "IMAGE"
        let mediaType = getMediaTypeFromString(mediaTypeString)
        
        print("📱 [ContentExtension] 🔄 Retrying download for media at index \(selectedMediaIndex): \(mediaTypeString)")
        
        // Clear error flag in shared metadata first
        clearMediaErrorFlag(url: urlString, mediaType: mediaTypeString)
        
        // Hide any existing error view
        hideMediaError()
        
        // Show loading indicator
        showMediaLoadingIndicator()
        
        // Start direct download (this will handle the completion properly)
        downloadAndDisplayMedia(from: url, mediaType: mediaType)
    }
    
    private func clearMediaErrorFlag(url: String, mediaType: String) {
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let metadataFile = sharedCacheDirectory.appendingPathComponent("metadata.json")
        
        guard FileManager.default.fileExists(atPath: metadataFile.path) else {
            return
        }
        
        do {
            let data = try Data(contentsOf: metadataFile)
            var metadata = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] ?? [:]
            
            let cacheKey = "\(mediaType.uppercased())_\(url)"
            if var item = metadata[cacheKey] as? [String: Any] {
                item["hasError"] = false
                item["errorMessage"] = nil
                item["isDownloading"] = true
                item["downloadProgress"] = 0
                metadata[cacheKey] = item
                
                let updatedData = try JSONSerialization.data(withJSONObject: metadata, options: .prettyPrinted)
                try updatedData.write(to: metadataFile)
                
                print("📱 [ContentExtension] ✅ Cleared error flag for: \(cacheKey)")
            }
        } catch {
            print("📱 [ContentExtension] ❌ Failed to clear error flag: \(error)")
        }
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
        
        print("📱 [ContentExtension] 🔊 Showing audio limitation message")
    }
    
    private func displayImage(from url: URL) {
        print("📱 [ContentExtension] Displaying image/gif")
        
        guard let container = mediaContainerView else {
            print("📱 [ContentExtension] ❌ No media container available")
            return
        }
        
        let imgView = UIImageView()
        imgView.contentMode = .scaleAspectFit
        imgView.backgroundColor = .black
        imgView.clipsToBounds = true
        
        // Start accessing security-scoped resource
        let accessGranted = url.startAccessingSecurityScopedResource()
        print("📱 [ContentExtension] Image security-scoped access: \(accessGranted)")
        
        if let data = try? Data(contentsOf: url),
           let image = UIImage(data: data) {
            
            print("📱 [ContentExtension] ✅ Image loaded successfully: \(image.size)")
            
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
                print("📱 [ContentExtension] ✅ GIF loaded in centered WKWebView with data URL")
                // Adjust height to image intrinsic aspect
                adjustPreferredHeight(forContentSize: image.size)
                return
            } else {
                imgView.image = image
                // Adjust height to image intrinsic aspect
                adjustPreferredHeight(forContentSize: image.size)
            }
        } else {
            print("📱 [ContentExtension] ❌ Failed to load image data")
            // Show placeholder
            imgView.backgroundColor = .darkGray
            let label = UILabel()
            label.text = "Image not available"
            label.textColor = .white
            label.textAlignment = .center
            imgView.addSubview(label)
            label.translatesAutoresizingMaskIntoConstraints = false
            NSLayoutConstraint.activate([
                label.centerXAnchor.constraint(equalTo: imgView.centerXAnchor),
                label.centerYAnchor.constraint(equalTo: imgView.centerYAnchor)
            ])
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
        
        print("📱 [ContentExtension] ✅ Image view setup completed")
    }
    
        private func displayVideo(from url: URL) {
        print("📱 [ContentExtension] Displaying video")
        
        guard let container = mediaContainerView else {
            print("📱 [ContentExtension] ❌ No media container available")
            return
        }
        
        // Start accessing security-scoped resource
        let accessGranted = url.startAccessingSecurityScopedResource()
        print("📱 [ContentExtension] Security-scoped resource access: \(accessGranted)")
        
        // Create player
        player = AVPlayer(url: url)
        
        // Create player layer
        let layer = AVPlayerLayer(player: player)
        layer.videoGravity = .resizeAspect
        layer.backgroundColor = UIColor.black.cgColor
        layer.frame = container.bounds
        container.layer.addSublayer(layer)
        playerLayer = layer
        
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
        
        print("📱 [ContentExtension] ✅ Video player setup completed")

        // Adjust height using video natural size
        adjustPreferredHeightForVideo(url: url)
    }
    
    private func displayAudio(from url: URL) {
        print("📱 [ContentExtension] Displaying audio from: \(url.path)")
        
        guard let container = mediaContainerView else {
            print("📱 [ContentExtension] ❌ No media container available")
            return
        }
        
        // Start accessing security-scoped resource
        let accessGranted = url.startAccessingSecurityScopedResource()
        print("📱 [ContentExtension] Audio security-scoped access: \(accessGranted)")
        
        // Verify file exists and is readable
        guard FileManager.default.fileExists(atPath: url.path) else {
            print("📱 [ContentExtension] ❌ Audio file does not exist at path: \(url.path)")
            showMediaError("Audio file not found")
            return
        }
        
        // Get file size and format info
        do {
            let attributes = try FileManager.default.attributesOfItem(atPath: url.path)
            if let fileSize = attributes[.size] as? Int {
                print("📱 [ContentExtension] Audio file size: \(fileSize) bytes")
            }
            print("📱 [ContentExtension] Audio file extension: \(url.pathExtension)")
        } catch {
            print("📱 [ContentExtension] ⚠️ Could not get file attributes: \(error)")
        }
        
        // Note: Notification Content Extensions have severe limitations on audio session management
        // We'll try to setup audio session but won't fail if it doesn't work
        print("📱 [ContentExtension] ⚠️ Note: Audio playback in Notification Content Extensions has limitations")
        
        do {
            let audioSession = AVAudioSession.sharedInstance()
            print("📱 [ContentExtension] Current audio session category: \(audioSession.category)")
            print("📱 [ContentExtension] Current audio session mode: \(audioSession.mode)")
            print("📱 [ContentExtension] Audio session is active: \(audioSession.isOtherAudioPlaying)")
            print("📱 [ContentExtension] Audio session output volume: \(audioSession.outputVolume)")
            
            // Try different audio session configurations for Notification Content Extensions
            // First try playback category with mix with others option
            try audioSession.setCategory(.playback, mode: .default, options: [.mixWithOthers, .allowAirPlay])
            try audioSession.setActive(true, options: [])
            
            print("📱 [ContentExtension] ✅ Audio session configured with playback category")
            print("📱 [ContentExtension] Audio session now active: \(!audioSession.isOtherAudioPlaying)")
            print("📱 [ContentExtension] Audio session route: \(audioSession.currentRoute.outputs.first?.portName ?? "Unknown")")
        } catch {
            print("📱 [ContentExtension] ⚠️ Playback category failed, trying ambient: \(error)")
            do {
                // Fallback to ambient category
                let audioSession = AVAudioSession.sharedInstance()
                try audioSession.setCategory(.ambient, mode: .default, options: [.mixWithOthers])
                try audioSession.setActive(true, options: [])
                print("📱 [ContentExtension] ✅ Audio session configured with ambient category (fallback)")
            } catch {
                print("📱 [ContentExtension] ⚠️ Audio session setup failed completely: \(error)")
                print("📱 [ContentExtension] Proceeding with audio playback attempt anyway...")
            }
        }
        
        // Create player with explicit asset
        print("📱 [ContentExtension] Creating AVURLAsset from URL: \(url)")
        let asset = AVURLAsset(url: url)
        
        // Check asset properties synchronously
        print("📱 [ContentExtension] Asset URL: \(asset.url.absoluteString)")
        print("📱 [ContentExtension] Asset duration: \(CMTimeGetSeconds(asset.duration))")
        print("📱 [ContentExtension] Asset is playable: \(asset.isPlayable)")
        print("📱 [ContentExtension] Asset is readable: \(asset.isReadable)")
        print("📱 [ContentExtension] Asset has protected content: \(asset.hasProtectedContent)")
        
        // Load asset properties asynchronously for more details
        asset.loadValuesAsynchronously(forKeys: ["duration", "tracks", "playable"]) {
            DispatchQueue.main.async {
                var error: NSError?
                let status = asset.statusOfValue(forKey: "duration", error: &error)
                print("📱 [ContentExtension] Asset duration status: \(status.rawValue)")
                if let error = error {
                    print("📱 [ContentExtension] ❌ Asset duration loading error: \(error)")
                }
                
                let tracksStatus = asset.statusOfValue(forKey: "tracks", error: &error)
                print("📱 [ContentExtension] Asset tracks status: \(tracksStatus.rawValue)")
                if let error = error {
                    print("📱 [ContentExtension] ❌ Asset tracks loading error: \(error)")
                } else {
                    let audioTracks = asset.tracks(withMediaType: .audio)
                    print("📱 [ContentExtension] Audio tracks found: \(audioTracks.count)")
                    for (index, track) in audioTracks.enumerated() {
                        print("📱 [ContentExtension] Track \(index): enabled=\(track.isEnabled), playable=\(track.isPlayable)")
                        print("📱 [ContentExtension] Track \(index) format: \(track.mediaType)")
                    }
                }
            }
        }
        
        let playerItem = AVPlayerItem(asset: asset)
        print("📱 [ContentExtension] Created AVPlayerItem, status: \(playerItem.status.rawValue)")
        
        player = AVPlayer(playerItem: playerItem)
        
        print("📱 [ContentExtension] Created audio player with asset")
        print("📱 [ContentExtension] Player status: \(player?.status.rawValue ?? -1)")
        
        // Check if we should attempt audio playback or show info message
        // Due to iOS limitations, audio in Notification Content Extensions is very restricted
        if shouldAttemptAudioPlayback() {
            // Create audio visualization
            setupAudioVisualization()
            
            // Setup controls
            setupVideoControls() // Reuse video controls for audio
            
            // Setup autoplay with audio-specific handling
            setupAudioAutoplay()
            
            print("📱 [ContentExtension] ✅ Audio player setup completed")
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
            print("📱 [ContentExtension] No player available for time observer setup")
            return 
        }
        
        // Remove existing observer from the SAME player instance that created it
        if let token = timeObserverToken, let observerPlayer = timeObserverPlayer {
            print("📱 [ContentExtension] Removing existing time observer from correct player")
            observerPlayer.removeTimeObserver(token)
            timeObserverToken = nil
            timeObserverPlayer = nil
        }
        
        print("📱 [ContentExtension] Setting up new time observer")
        
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
        
        print("📱 [ContentExtension] ✅ Time observer setup completed")
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
            print("📱 [ContentExtension] No player available for autoplay setup")
            return 
        }
        
        print("📱 [ContentExtension] Setting up autoplay")
        
        // Remove existing status observer if any (safety check)
        if isObservingPlayerStatus, let observed = observedPlayerForStatus {
            print("📱 [ContentExtension] Removing existing AVPlayer status observer before adding new one")
            do {
                observed.removeObserver(self, forKeyPath: "status")
                isObservingPlayerStatus = false
                observedPlayerForStatus = nil
                print("📱 [ContentExtension] ✅ Removed existing AVPlayer status observer")
            } catch {
                print("📱 [ContentExtension] ⚠️ Failed to remove existing AVPlayer observer: \(error)")
            }
        }
        
        // Remove existing PlayerItem observer if any
        if isObservingPlayerItemStatus, let itemObserved = observedPlayerItemForStatus {
            print("📱 [ContentExtension] Removing existing AVPlayerItem status observer before adding new one")
            do {
                itemObserved.removeObserver(self, forKeyPath: "status")
                isObservingPlayerItemStatus = false
                observedPlayerItemForStatus = nil
                print("📱 [ContentExtension] ✅ Removed existing AVPlayerItem status observer")
            } catch {
                print("📱 [ContentExtension] ⚠️ Failed to remove existing AVPlayerItem observer: \(error)")
            }
        }
        
        // Add status observer
        currentPlayer.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        isObservingPlayerStatus = true
        observedPlayerForStatus = currentPlayer
        print("📱 [ContentExtension] Added status observer to current player")
        
        // Remove existing notification observer
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        
        // Add end observer for looping
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(playerDidFinishPlaying),
            name: .AVPlayerItemDidPlayToEndTime,
            object: currentPlayer.currentItem
        )
        print("📱 [ContentExtension] Added playback completion observer")
    }
    
    private func setupAudioAutoplay() {
        guard let currentPlayer = player else { 
            print("📱 [ContentExtension] No player available for audio autoplay setup")
            return 
        }
        
        print("📱 [ContentExtension] Setting up audio autoplay")
        
        // Remove existing status observer if any (safety check)
        if isObservingPlayerStatus, let observed = observedPlayerForStatus {
            print("📱 [ContentExtension] Removing existing status observer before adding new one")
            observed.removeObserver(self, forKeyPath: "status")
            isObservingPlayerStatus = false
            observedPlayerForStatus = nil
        }
        
        // Add status observer for audio
        currentPlayer.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
        isObservingPlayerStatus = true
        print("📱 [ContentExtension] Added status observer to audio player")
        
        // Add specific observers for audio debugging
        if let playerItem = currentPlayer.currentItem {
            // Remove existing observer first
            if isObservingPlayerItemStatus, let itemObserved = observedPlayerItemForStatus {
                print("📱 [ContentExtension] Removing existing PlayerItem status observer before adding new one")
                itemObserved.removeObserver(self, forKeyPath: "status")
                observedPlayerItemForStatus = nil
            }
            
            playerItem.addObserver(self, forKeyPath: "status", options: [.new], context: nil)
            isObservingPlayerItemStatus = true
            observedPlayerItemForStatus = playerItem
            print("📱 [ContentExtension] Added status observer to audio player item")
            
            // Log audio asset information
            let asset = playerItem.asset
            print("📱 [ContentExtension] Audio asset duration: \(CMTimeGetSeconds(asset.duration))")
            print("📱 [ContentExtension] Audio asset playable: \(asset.isPlayable)")
            
            // Check audio tracks
            asset.loadValuesAsynchronously(forKeys: ["tracks"]) {
                DispatchQueue.main.async {
                    let tracks = asset.tracks(withMediaType: .audio)
                    print("📱 [ContentExtension] Audio tracks count: \(tracks.count)")
                    for (index, track) in tracks.enumerated() {
                        print("📱 [ContentExtension] Audio track \(index): enabled=\(track.isEnabled), playable=\(track.isPlayable)")
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
        print("📱 [ContentExtension] Added audio playback completion observer")
        
        // Try to play immediately if ready
        if currentPlayer.status == .readyToPlay {
            print("📱 [ContentExtension] Audio player already ready, starting playback")
            currentPlayer.play()
        } else {
            // Set a timeout to fallback to info message if player doesn't become ready
            DispatchQueue.main.asyncAfter(deadline: .now() + 3.0) { [weak self] in
                guard let self = self, let player = self.player else { return }
                if player.status == .failed || player.status == .unknown {
                    print("📱 [ContentExtension] Audio player failed to load after timeout, showing info message")
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
                print("📱 [ContentExtension] AVPlayer status changed: \(player.status.rawValue) (\(statusString))")
                
                if player.status == .readyToPlay {
                    print("📱 [ContentExtension] Player ready, starting autoplay")
                    print("📱 [ContentExtension] Player rate: \(player.rate)")
                    print("📱 [ContentExtension] Player current time: \(CMTimeGetSeconds(player.currentTime()))")
                    print("📱 [ContentExtension] Player volume: \(player.volume)")
                    
                    // Ensure volume is set to maximum
                    player.volume = 1.0
                    
                    // Check audio session state before playing
                    let audioSession = AVAudioSession.sharedInstance()
                    print("📱 [ContentExtension] Before play - Audio session category: \(audioSession.category)")
                    print("📱 [ContentExtension] Before play - Audio session active: \(!audioSession.isOtherAudioPlaying)")
                    print("📱 [ContentExtension] Before play - System volume: \(audioSession.outputVolume)")
                    
                    player.play()
                    
                    // Check if playback actually started
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) {
                        print("📱 [ContentExtension] After play attempt - Player rate: \(player.rate)")
                        print("📱 [ContentExtension] After play attempt - Player timeControlStatus: \(player.timeControlStatus.rawValue)")
                        if player.rate == 0 {
                            print("📱 [ContentExtension] ⚠️ Player rate is still 0, playback may not have started")
                        }
                    }
                    
                    loadingIndicator?.stopAnimating()
                    loadingIndicator?.removeFromSuperview()
                } else if player.status == .failed {
                    print("📱 [ContentExtension] ❌ Player failed!")
                    if let error = player.error {
                        print("📱 [ContentExtension] Player error: \(error)")
                        print("📱 [ContentExtension] Player error description: \(error.localizedDescription)")
                        if let nsError = error as NSError? {
                            print("📱 [ContentExtension] Player error domain: \(nsError.domain)")
                            print("📱 [ContentExtension] Player error code: \(nsError.code)")
                            print("📱 [ContentExtension] Player error userInfo: \(nsError.userInfo)")
                        }
                    }
                    loadingIndicator?.stopAnimating()
                    loadingIndicator?.removeFromSuperview()
                    
                    // Check if this is an audio player failure - if so, show limitation message
                    if let currentItem = player.currentItem,
                       let asset = currentItem.asset as? AVURLAsset {
                        let fileExtension = asset.url.pathExtension.lowercased()
                        let audioExtensions = ["mp3", "m4a", "aac", "wav", "mp4"]
                        if audioExtensions.contains(fileExtension) {
                            print("📱 [ContentExtension] Audio playback failed (\(fileExtension)), showing limitation message")
                            showAudioLimitationMessage()
                        } else {
                            showMediaError("Player failed: \(player.error?.localizedDescription ?? "Unknown error")")
                        }
                    } else {
                        showMediaError("Player failed: \(player.error?.localizedDescription ?? "Unknown error")")
                    }
                }
            } else if let playerItem = object as? AVPlayerItem {
                let statusString = playerItem.status == .readyToPlay ? "readyToPlay" : 
                                 playerItem.status == .failed ? "failed" : "unknown"
                print("📱 [ContentExtension] AVPlayerItem status changed: \(playerItem.status.rawValue) (\(statusString))")
                
                if playerItem.status == .readyToPlay {
                    print("📱 [ContentExtension] PlayerItem ready!")
                    print("📱 [ContentExtension] PlayerItem duration: \(CMTimeGetSeconds(playerItem.duration))")
                    print("📱 [ContentExtension] PlayerItem playback likely to keep up: \(playerItem.isPlaybackLikelyToKeepUp)")
                    print("📱 [ContentExtension] PlayerItem playback buffer empty: \(playerItem.isPlaybackBufferEmpty)")
                    print("📱 [ContentExtension] PlayerItem playback buffer full: \(playerItem.isPlaybackBufferFull)")
                    // Player should already be playing from AVPlayer observer
                } else if playerItem.status == .failed {
                    print("📱 [ContentExtension] ❌ PlayerItem failed!")
                    if let error = playerItem.error {
                        print("📱 [ContentExtension] PlayerItem error: \(error)")
                        print("📱 [ContentExtension] PlayerItem error description: \(error.localizedDescription)")
                        if let nsError = error as NSError? {
                            print("📱 [ContentExtension] PlayerItem error domain: \(nsError.domain)")
                            print("📱 [ContentExtension] PlayerItem error code: \(nsError.code)")
                            print("📱 [ContentExtension] PlayerItem error userInfo: \(nsError.userInfo)")
                        }
                    }
                    
                    // Check if this is an audio player item failure - if so, show limitation message
                    if let asset = playerItem.asset as? AVURLAsset {
                        let fileExtension = asset.url.pathExtension.lowercased()
                        let audioExtensions = ["mp3", "m4a", "aac", "wav", "mp4"]
                        if audioExtensions.contains(fileExtension) {
                            print("📱 [ContentExtension] Audio PlayerItem failed (\(fileExtension)), showing limitation message")
                            showAudioLimitationMessage()
                        } else {
                            showMediaError("Media failed: \(playerItem.error?.localizedDescription ?? "Unknown error")")
                        }
                    } else {
                        showMediaError("Media failed: \(playerItem.error?.localizedDescription ?? "Unknown error")")
                    }
                }
            }
        }
    }
    
    @objc private func playerDidFinishPlaying() {
        print("📱 [ContentExtension] Media finished, looping")
        player?.seek(to: .zero)
        player?.play()
    }
    
    // MARK: - Cleanup
    
    private func cleanupAllObservers() {
        print("📱 [ContentExtension] Force cleaning up all observers")
        
        // Clean up time observer - handle all possible states
        if let token = timeObserverToken {
            if let observerPlayer = timeObserverPlayer {
                do {
                    observerPlayer.removeTimeObserver(token)
                    print("📱 [ContentExtension] ✅ Force removed time observer from correct player")
                } catch {
                    print("📱 [ContentExtension] ⚠️ Force cleanup failed for time observer: \(error)")
                }
            } else {
                print("📱 [ContentExtension] ⚠️ Time observer token exists but no player reference")
            }
        }
        
        // Clean up any remaining player observers if player exists
        if let currentPlayer = player, let observed = observedPlayerForStatus, observed === currentPlayer {
            // Try to remove any remaining observers from current player
            do {
                observed.removeObserver(self, forKeyPath: "status")
                print("📱 [ContentExtension] ✅ Removed status observer from current player")
            } catch {
                print("📱 [ContentExtension] ⚠️ Failed to remove status observer: \(error)")
            }
            
            // Try to remove any remaining observers from current player item
            if let currentItem = currentPlayer.currentItem, let itemObserved = observedPlayerItemForStatus, itemObserved === currentItem {
                currentItem.removeObserver(self, forKeyPath: "status")
                print("📱 [ContentExtension] ✅ Removed item status observer")
            }
        }
        
        // NOTE: non rimuovere mai il time observer da un player diverso da quello che lo ha creato
        
        // Reset observer states
        timeObserverToken = nil
        timeObserverPlayer = nil
        isObservingPlayerStatus = false
        isObservingPlayerItemStatus = false
        observedPlayerForStatus = nil
        observedPlayerItemForStatus = nil
        
        // Remove notification observers
        NotificationCenter.default.removeObserver(self, name: .AVPlayerItemDidPlayToEndTime, object: nil)
        
        print("📱 [ContentExtension] ✅ Force cleanup completed")
    }
    
        private func cleanupCurrentMedia() {
        print("📱 [ContentExtension] Cleaning up current media")

        // Stop player
        player?.pause()
        
        // Force cleanup of all observers regardless of player state
        cleanupAllObservers()
        
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
        

        
        // Nullify player AFTER removing all observers
        player = nil
        
        print("📱 [ContentExtension] ✅ Media cleanup completed")
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
            print("📱 [ContentExtension] Audio session configured for \(type)")
        } catch {
            print("📱 [ContentExtension] Failed to setup audio session: \(error)")
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
        print("📱 [ContentExtension] Deinitializing")
        
        // Safe cleanup with try-catch for observers
        if let token = timeObserverToken, let observerPlayer = timeObserverPlayer {
            do {
                observerPlayer.removeTimeObserver(token)
                print("📱 [ContentExtension] Removed time observer in deinit")
            } catch {
                print("📱 [ContentExtension] Error removing time observer in deinit: \(error)")
            }
        }
        
        if isObservingPlayerStatus, let currentPlayer = player {
            do {
                currentPlayer.removeObserver(self, forKeyPath: "status")
                print("📱 [ContentExtension] Removed status observer in deinit")
            } catch {
                print("📱 [ContentExtension] Error removing status observer in deinit: \(error)")
            }
        }
        
        NotificationCenter.default.removeObserver(self)
        print("📱 [ContentExtension] Removed all notification observers")
        
        cleanupCurrentMedia()
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
        print("📱 [ContentExtension] Media play button pressed")
        player?.play()
    }
    
    @objc func mediaPause() {
        print("📱 [ContentExtension] Media pause button pressed")
        player?.pause()
    }
}

// MARK: - Notification Action Handling

extension NotificationViewController {
    
    private func handleNotificationAction(response: UNNotificationResponse, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 🎬 Handling notification action...")
        
        let actionIdentifier = response.actionIdentifier
        let userInfo = response.notification.request.content.userInfo
        
        // Extract notification ID and payload
        guard let notificationId = extractNotificationId(from: userInfo) else {
            print("📱 [ContentExtension] ❌ No notification ID found")
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
    
    private func extractNotificationId(from userInfo: [AnyHashable: Any]) -> String? {
        if let notificationId = userInfo["notificationId"] as? String {
            return notificationId
        } else if let payload = userInfo["payload"] as? [String: Any],
                  let notificationId = payload["notificationId"] as? String {
            return notificationId
        }
        return nil
    }
    
    private func handleDefaultTapAction(userInfo: [AnyHashable: Any], notificationId: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 🔔 Handling default tap action for notification: \(notificationId)")
        
        // Check if there's a custom tapAction defined
        if let tapAction = extractTapAction(from: userInfo) {
            print("📱 [ContentExtension] 🎯 Found custom tapAction: \(tapAction)")
            executeAction(action: tapAction, notificationId: notificationId, completion: completion)
        } else {
            // Default behavior: store navigation intent for app launch
            let navigationData = [
                "type": "OPEN_NOTIFICATION",
                "value": notificationId,
                "timestamp": ISO8601DateFormatter().string(from: Date())
            ]
            storeNavigationIntent(data: navigationData)
            print("📱 [ContentExtension] 📂 Stored default open notification intent")
            
            // Open the main app to process the navigation intent
            DispatchQueue.main.async {
                self.extensionContext?.dismissNotificationContentExtension()
                self.extensionContext?.performNotificationDefaultAction()
            }
            
            completion(true)
        }
    }
    
    @objc private func headerTapped() {
        print("📱 [ContentExtension] 👆 Header tapped - triggering default tap action")
        
        // Get current notification data
        guard let userInfo = currentNotificationUserInfo,
              let notificationId = extractNotificationId(from: userInfo) else {
            print("📱 [ContentExtension] ❌ No notification data available for header tap")
            return
        }
        
        // Call handleDefaultTapAction with a dummy completion
        handleDefaultTapAction(userInfo: userInfo, notificationId: notificationId) { success in
            print("📱 [ContentExtension] ✅ Header tap action completed with success: \(success)")
        }
    }
    
    private func extractTapAction(from userInfo: [AnyHashable: Any]) -> [String: Any]? {
        if let tapAction = userInfo["tapAction"] as? [String: Any] {
            return tapAction
        } else if let payload = userInfo["payload"] as? [String: Any],
                  let tapAction = payload["tapAction"] as? [String: Any] {
            return tapAction
        }
        return nil
    }
    
    private func handleCustomAction(actionIdentifier: String, userInfo: [AnyHashable: Any], notificationId: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 🎯 Handling custom action: \(actionIdentifier)")
        
        // Find the matching action in the payload
        guard let action = findMatchingAction(actionIdentifier: actionIdentifier, userInfo: userInfo) else {
            print("📱 [ContentExtension] ❌ No matching action found for identifier: \(actionIdentifier)")
            completion(false)
            return
        }
        
        executeAction(action: action, notificationId: notificationId, completion: completion)
    }
    
    private func findMatchingAction(actionIdentifier: String, userInfo: [AnyHashable: Any]) -> [String: Any]? {
        var actions: [[String: Any]] = []
        
        // Extract actions from different payload structures
        if let actionsArray = userInfo["actions"] as? [[String: Any]] {
            actions = actionsArray
        } else if let singleAction = userInfo["action"] as? [String: Any] {
            actions = [singleAction]
        } else if let payload = userInfo["payload"] as? [String: Any] {
            if let payloadActions = payload["actions"] as? [[String: Any]] {
                actions = payloadActions
            } else if let singlePayloadAction = payload["action"] as? [String: Any] {
                actions = [singlePayloadAction]
            }
        }
        
        // Try to match by action identifier pattern
        for action in actions {
            guard let type = action["type"] as? String,
                  let value = action["value"] as? String else { continue }
            
            let expectedId = "action_\(type)_\(value)"
            if actionIdentifier == expectedId || actionIdentifier.contains(value) {
                return action
            }
        }
        
        // Fallback: parse action identifier (format: action_TYPE_VALUE)
        let parts = actionIdentifier.split(separator: "_")
        if parts.count >= 3 {
            let actionType = String(parts[1]).uppercased()
            let actionValue = parts[2...].joined(separator: "_")
            
            return [
                "type": actionType,
                "value": actionValue,
                "destructive": false,
                "title": actionValue
            ]
        }
        
        return nil
    }
    
    private func executeAction(action: [String: Any], notificationId: String, completion: @escaping (Bool) -> Void) {
        guard let type = action["type"] as? String,
              let value = action["value"] as? String else {
            print("📱 [ContentExtension] ❌ Invalid action data")
            completion(false)
            return
        }
        
        print("📱 [ContentExtension] 🎬 Executing action: \(type) with value: \(value)")
        
        switch type.uppercased() {
        case "NAVIGATE":
            handleNavigateAction(value: value, completion: completion)
        case "WEBHOOK":
            handleWebhookAction(webhookId: value, notificationId: notificationId, action: action, completion: completion)
        case "BACKGROUND_CALL":
            handleBackgroundCallAction(value: value, completion: completion)
        case "MARK_AS_READ":
            handleMarkAsReadAction(notificationId: notificationId, completion: completion)
        case "DELETE":
            handleDeleteAction(notificationId: notificationId, completion: completion)
        case "SNOOZE":
            handleSnoozeAction(value: value, completion: completion)
        case "OPEN_NOTIFICATION":
            handleOpenNotificationAction(value: value, completion: completion)
        default:
            print("📱 [ContentExtension] ❌ Unknown action type: \(type)")
            completion(false)
        }
    }
}

// MARK: - Action Implementations

extension NotificationViewController {
    
    private func handleNavigateAction(value: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 🧭 Navigate action: \(value)")
        
        let navigationData = [
            "type": "NAVIGATE",
            "value": value,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        
        storeNavigationIntent(data: navigationData)
        
        // Open the main app to process the navigation intent
        DispatchQueue.main.async {
            self.extensionContext?.dismissNotificationContentExtension()
            self.extensionContext?.performNotificationDefaultAction()
        }
        
        completion(true)
    }
    
    private func handleWebhookAction(webhookId: String, notificationId: String, action: [String: Any], completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 🪝 Webhook action: \(webhookId)")
        
        Task {
            do {
                // First, get the webhook configuration
                let webhook = try await fetchWebhook(webhookId: webhookId)
                
                // Build the payload
                var payload: [String: Any] = [
                    "notificationId": notificationId,
                    "actionType": action["type"] ?? "",
                    "actionValue": action["value"] ?? "",
                    "timestamp": ISO8601DateFormatter().string(from: Date()),
                    "webhookId": webhook["id"] ?? "",
                    "webhookName": webhook["name"] ?? ""
                ]
                
                // Merge webhook body if provided
                if let webhookBody = webhook["body"] as? [String: Any] {
                    payload.merge(webhookBody) { _, new in new }
                }
                
                // Execute the webhook
                try await executeWebhook(webhook: webhook, payload: payload)
                
                await MainActor.run {
                    print("📱 [ContentExtension] ✅ Webhook executed successfully")
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    print("📱 [ContentExtension] ❌ Webhook execution failed: \(error)")
                    completion(false)
                }
            }
        }
    }
    
    private func handleBackgroundCallAction(value: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 📞 Background call action: \(value)")
        
        let components = value.components(separatedBy: "::")
        guard components.count == 2 else {
            print("📱 [ContentExtension] ❌ Invalid background call format. Expected METHOD::URL")
            completion(false)
            return
        }
        
        let method = components[0]
        let url = components[1]
        
        Task {
            do {
                try await executeBackgroundCall(method: method, url: url)
                await MainActor.run {
                    print("📱 [ContentExtension] ✅ Background call executed successfully")
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    print("📱 [ContentExtension] ❌ Background call failed: \(error)")
                    completion(false)
                }
            }
        }
    }
    
    private func handleMarkAsReadAction(notificationId: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] ✅ Mark as read action: \(notificationId)")
        
        Task {
            do {
                try await markNotificationAsRead(notificationId: notificationId)
                // Decrease badge count since notification is marked as read
                decrementBadgeCount()
                await MainActor.run {
                    print("📱 [ContentExtension] ✅ Notification marked as read successfully")
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    print("📱 [ContentExtension] ❌ Mark as read failed: \(error)")
                    completion(false)
                }
            }
        }
    }
    
    private func handleDeleteAction(notificationId: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 🗑️ Delete action: \(notificationId)")
        
        Task {
            do {
                try await deleteNotification(notificationId: notificationId)
                // Decrease badge count since notification is deleted
                decrementBadgeCount()
                await MainActor.run {
                    print("📱 [ContentExtension] ✅ Notification deleted successfully")
                    completion(true)
                }
            } catch {
                await MainActor.run {
                    print("📱 [ContentExtension] ❌ Delete notification failed: \(error)")
                    completion(false)
                }
            }
        }
    }
    
    private func handleSnoozeAction(value: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] ⏰ Snooze action: \(value)")
        
        // Parse snooze duration (format: snooze_X where X is minutes)
        if let match = value.range(of: #"snooze_(\d+)"#, options: .regularExpression) {
            let minutesString = String(value[match]).replacingOccurrences(of: "snooze_", with: "")
            if let minutes = Int(minutesString) {
                scheduleSnoozeNotification(minutes: minutes)
                print("📱 [ContentExtension] ⏰ Scheduled snooze for \(minutes) minutes")
                completion(true)
                return
            }
        }
        
        print("📱 [ContentExtension] ❌ Invalid snooze format: \(value)")
        completion(false)
    }
    
    private func handleOpenNotificationAction(value: String, completion: @escaping (Bool) -> Void) {
        print("📱 [ContentExtension] 📂 Open notification action: \(value)")
        
        let navigationData = [
            "type": "OPEN_NOTIFICATION",
            "value": value,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ]
        
        storeNavigationIntent(data: navigationData)
        
        // Open the main app to process the navigation intent
        DispatchQueue.main.async {
            self.extensionContext?.dismissNotificationContentExtension()
            self.extensionContext?.performNotificationDefaultAction()
        }
        
        completion(true)
    }
    
    // MARK: - Helper Methods
    
    private func storeNavigationIntent(data: [String: Any]) {
        do {
            try storeIntentInKeychain(data: data, service: "zentik-pending-navigation")
            print("📱 [ContentExtension] 💾 Stored navigation intent in keychain: \(data)")
        } catch {
            print("📱 [ContentExtension] ❌ Failed to store navigation intent in keychain: \(error)")
        }
    }
    
    private func scheduleSnoozeNotification(minutes: Int) {
        let snoozeData = [
            "type": "SNOOZE",
            "minutes": minutes,
            "timestamp": ISO8601DateFormatter().string(from: Date())
        ] as [String : Any]
        
        do {
            try storeIntentInKeychain(data: snoozeData, service: "zentik-pending-snooze")
            print("📱 [ContentExtension] ⏰ Stored snooze intent in keychain for \(minutes) minutes")
        } catch {
            print("📱 [ContentExtension] ❌ Failed to store snooze intent in keychain: \(error)")
        }
    }
}

// MARK: - Network Operations

extension NotificationViewController {
    
    private func fetchWebhook(webhookId: String) async throws -> [String: Any] {
        print("📱 [ContentExtension] 📡 Fetching webhook: \(webhookId)")
        
        guard let apiEndpoint = getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not configured"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/webhooks/\(webhookId)"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "GET"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication token if available
        if let authToken = getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("📱 [ContentExtension] 📥 Fetch webhook response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
        
        guard let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] else {
            throw NSError(domain: "APIError", code: -3, userInfo: [NSLocalizedDescriptionKey: "Invalid JSON response"])
        }
        
        return json
    }
    
    private func executeWebhook(webhook: [String: Any], payload: [String: Any]) async throws {
        guard let url = webhook["url"] as? String,
              let method = webhook["method"] as? String else {
            throw NSError(domain: "WebhookError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid webhook configuration"])
        }
        
        print("📱 [ContentExtension] 📤 Executing webhook: \(method) \(url)")
        
        guard let requestUrl = URL(string: url) else {
            throw NSError(domain: "WebhookError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid webhook URL"])
        }
        
        var request = URLRequest(url: requestUrl)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Zentik-Mobile/1.0", forHTTPHeaderField: "User-Agent")
        
        // Add custom headers
        if let headers = webhook["headers"] as? [[String: Any]] {
            for header in headers {
                if let key = header["key"] as? String,
                   let value = header["value"] as? String {
                    request.setValue(value, forHTTPHeaderField: key)
                }
            }
        }
        
        // Set request body
        let jsonData = try JSONSerialization.data(withJSONObject: payload)
        request.httpBody = jsonData
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("📱 [ContentExtension] 📥 Webhook response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "WebhookError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    private func executeBackgroundCall(method: String, url: String) async throws {
        print("📱 [ContentExtension] 📞 Executing background call: \(method) \(url)")
        
        guard let requestUrl = URL(string: url) else {
            throw NSError(domain: "BackgroundCallError", code: -1, userInfo: [NSLocalizedDescriptionKey: "Invalid URL"])
        }
        
        var request = URLRequest(url: requestUrl)
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("📱 [ContentExtension] 📥 Background call response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "BackgroundCallError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    private func markNotificationAsRead(notificationId: String) async throws {
        print("📱 [ContentExtension] ✅ Marking notification as read: \(notificationId)")
        
        guard let apiEndpoint = getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not configured"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)/read"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication token if available
        if let authToken = getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("📱 [ContentExtension] 📥 Mark as read response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    private func deleteNotification(notificationId: String) async throws {
        print("📱 [ContentExtension] 🗑️ Deleting notification: \(notificationId)")
        
        guard let apiEndpoint = getApiEndpoint() else {
            throw NSError(domain: "APIError", code: -1, userInfo: [NSLocalizedDescriptionKey: "API endpoint not configured"])
        }
        
        let urlString = "\(apiEndpoint)/api/v1/notifications/\(notificationId)"
        guard let url = URL(string: urlString) else {
            throw NSError(domain: "APIError", code: -2, userInfo: [NSLocalizedDescriptionKey: "Invalid API URL"])
        }
        
        var request = URLRequest(url: url)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        // Add authentication token if available
        if let authToken = getStoredAuthToken() {
            request.setValue("Bearer \(authToken)", forHTTPHeaderField: "Authorization")
        }
        
        let (data, response) = try await URLSession.shared.data(for: request)
        
        if let httpResponse = response as? HTTPURLResponse {
            print("📱 [ContentExtension] 📥 Delete notification response: \(httpResponse.statusCode)")
            if httpResponse.statusCode >= 400 {
                let responseString = String(data: data, encoding: .utf8) ?? "Unknown error"
                throw NSError(domain: "APIError", code: httpResponse.statusCode, userInfo: [NSLocalizedDescriptionKey: "HTTP \(httpResponse.statusCode): \(responseString)"])
            }
        }
    }
    
    private func getApiEndpoint() -> String? {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-api-endpoint",
            kSecAttrAccount as String: "endpoint",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, let data = result as? Data, let endpoint = String(data: data, encoding: .utf8) {
            print("📱 [ContentExtension] ✅ Retrieved API endpoint from keychain: \(endpoint)")
            return endpoint
        }
        
        print("📱 [ContentExtension] ℹ️ No API endpoint found in keychain, using default")
        return "https://notifier-api.zentik.app"
    }
    
    private func getStoredAuthToken() -> String? {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        print("📱 [ContentExtension] 🔍 Looking for auth token with bundle: \(bundleIdentifier)")
        print("📱 [ContentExtension] 🔍 Access group: \(accessGroup)")
        print("📱 [ContentExtension] 🔍 Current bundle ID: \(Bundle.main.bundleIdentifier ?? "nil")")
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-auth",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecReturnAttributes as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        print("📱 [ContentExtension] 🔍 Keychain query: \(query)")
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        print("📱 [ContentExtension] 🔍 Keychain query status: \(status)")
        if let resultDict = result as? [String: Any] {
            print("📱 [ContentExtension] 🔍 Keychain result keys: \(resultDict.keys)")
        }
        
        if status == errSecSuccess, let item = result as? [String: Any] {
            // react-native-keychain stores accessToken as kSecAttrAccount and refreshToken as kSecValueData
            print("📱 [ContentExtension] 🔍 Trying to extract accessToken from item...")
            
            // Try to get account as String directly first
            if let accessToken = item[kSecAttrAccount as String] as? String {
                print("📱 [ContentExtension] ✅ Retrieved auth token from keychain (as String)")
                return accessToken
            }
            // Try to get account as Data and convert to String
            else if let accountData = item[kSecAttrAccount as String] as? Data,
                    let accessToken = String(data: accountData, encoding: .utf8) {
                print("📱 [ContentExtension] ✅ Retrieved auth token from keychain (as Data)")
                return accessToken
            } else {
                print("📱 [ContentExtension] ❌ Found keychain item but failed to extract accessToken")
                print("📱 [ContentExtension] 🔍 Item keys: \(item.keys)")
                if let acctValue = item[kSecAttrAccount as String] {
                    print("📱 [ContentExtension] 🔍 Account value type: \(type(of: acctValue))")
                    print("📱 [ContentExtension] 🔍 Account value: \(acctValue)")
                }
            }
        }
        
        print("📱 [ContentExtension] ℹ️ No auth token found in keychain (status: \(status))")
        print("📱 [ContentExtension] 🔍 Bundle identifier: \(Bundle.main.bundleIdentifier ?? "nil")")
        return nil
    }
}

// MARK: - Keychain Operations

extension NotificationViewController {
    
    private func storeIntentInKeychain(data: [String: Any], service: String) throws {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let jsonData = try JSONSerialization.data(withJSONObject: data)
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "intent",
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: jsonData,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        // Delete any existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "intent",
            kSecAttrAccessGroup as String: accessGroup
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add the new item
        let status = SecItemAdd(query as CFDictionary, nil)
        if status != errSecSuccess {
            throw NSError(domain: "KeychainError", code: Int(status), userInfo: [NSLocalizedDescriptionKey: "Failed to store intent in keychain"])
        }
        
        print("📱 [ContentExtension] ✅ Successfully stored intent in keychain with service: \(service)")
    }
    
    private func getIntentFromKeychain(service: String) -> [String: Any]? {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "intent",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, let data = result as? Data {
            do {
                let json = try JSONSerialization.jsonObject(with: data) as? [String: Any]
                print("📱 [ContentExtension] ✅ Retrieved intent from keychain with service: \(service)")
                return json
            } catch {
                print("📱 [ContentExtension] ❌ Failed to parse intent data from keychain: \(error)")
            }
        } else {
            print("📱 [ContentExtension] ℹ️ No intent found in keychain with service: \(service) (status: \(status))")
        }
        
        return nil
    }
    
    private func clearNavigationIntent() {
        clearIntentFromKeychain(service: "zentik-pending-navigation")
    }
    
    private func clearIntentFromKeychain(service: String) {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: "intent",
            kSecAttrAccessGroup as String: accessGroup
        ]
        
        let status = SecItemDelete(query as CFDictionary)
        if status == errSecSuccess {
            print("📱 [ContentExtension] ✅ Cleared intent from keychain with service: \(service)")
        } else {
            print("📱 [ContentExtension] ℹ️ No intent to clear in keychain with service: \(service) (status: \(status))")
        }
    }
    
    // MARK: - Badge Count Management
    
    private func getBadgeCountFromKeychain() -> Int {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-badge-count",
            kSecAttrAccount as String: "badge",
            kSecAttrAccessGroup as String: accessGroup,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]
        
        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        
        if status == errSecSuccess, 
           let data = result as? Data, 
           let countString = String(data: data, encoding: .utf8),
           let count = Int(countString) {
            print("📱 [ContentExtension] 🔢 Retrieved badge count from keychain: \(count)")
            return count
        }
        
        print("📱 [ContentExtension] 🔢 No badge count found in keychain, defaulting to 0")
        return 0
    }
    
    private func saveBadgeCountToKeychain(count: Int) {
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "com.apocaliss92.zentik"
        let accessGroup = "C3F24V5NS5.\(bundleIdentifier).keychain"
        
        let countData = String(count).data(using: .utf8)!
        
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-badge-count",
            kSecAttrAccount as String: "badge",
            kSecAttrAccessGroup as String: accessGroup,
            kSecValueData as String: countData,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlock
        ]
        
        // Delete any existing item first
        let deleteQuery: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: "zentik-badge-count",
            kSecAttrAccount as String: "badge",
            kSecAttrAccessGroup as String: accessGroup
        ]
        SecItemDelete(deleteQuery as CFDictionary)
        
        // Add the new item
        let status = SecItemAdd(query as CFDictionary, nil)
        if status == errSecSuccess {
            print("📱 [ContentExtension] ✅ Successfully saved badge count \(count) to keychain")
        } else {
            print("📱 [ContentExtension] ❌ Failed to save badge count to keychain (status: \(status))")
        }
    }
    
    private func decrementBadgeCount() {
        print("📱 [ContentExtension] 🔢 Decrementing badge count...")
        let currentCount = getBadgeCountFromKeychain()
        let newCount = max(0, currentCount - 1) // Ensure it doesn't go below 0
        saveBadgeCountToKeychain(count: newCount)
        
        // Also update the system badge count (iOS 16.0+)
        if #available(iOS 16.0, *) {
            UNUserNotificationCenter.current().setBadgeCount(newCount) { error in
                if let error = error {
                    print("📱 [ContentExtension] ❌ Failed to update system badge count: \(error)")
                } else {
                    print("📱 [ContentExtension] ✅ System badge count updated to \(newCount)")
                }
            }
        } else {
            // For iOS < 16.0, we can only update the keychain
            // The main app will sync the badge count when it becomes active
            print("📱 [ContentExtension] ℹ️ iOS < 16.0: Badge count saved to keychain, main app will sync")
        }
        
        print("📱 [ContentExtension] 🔢 Badge count decremented from \(currentCount) to \(newCount)")
    }
    
    // MARK: - Shared Cache Management
    
    private func displayMediaFromSharedCache(at index: Int) {
        guard attachmentData.indices.contains(index) else {
            print("📱 [ContentExtension] Invalid attachmentData index: \(index)")
            return
        }
        
        let attachmentDataItem = attachmentData[index]
        print("📱 [ContentExtension] Displaying media from shared cache at index \(index)")
        
        guard let urlString = attachmentDataItem["url"] as? String else {
            print("📱 [ContentExtension] Invalid URL in attachmentData")
            return
        }
        
        let mediaTypeString = attachmentDataItem["mediaType"] as? String ?? "IMAGE"
        let mediaType = getMediaTypeFromString(mediaTypeString)
        
        print("📱 [ContentExtension] Media type: \(mediaTypeString), URL: \(urlString)")
        print("📱 [ContentExtension] Selected media index: \(selectedMediaIndex), Requested index: \(index)")
        
        // Clean up previous media
        cleanupCurrentMedia()
        
        // Try to load from shared cache first
        if let cachedPath = getCachedMediaPath(url: urlString, mediaType: mediaTypeString) {
            print("📱 [ContentExtension] ✅ Found media in shared cache: \(cachedPath)")
            let cachedURL = URL(fileURLWithPath: cachedPath)
            
            DispatchQueue.main.async {
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
            // Media non in cache: controlla se esiste in shared cache appena scaricato manualmente
            if let cachedPath = getCachedMediaPath(url: urlString, mediaType: mediaTypeString) {
                print("📱 [ContentExtension] ✅ Found media in shared cache after recheck: \(cachedPath)")
                let cachedURL = URL(fileURLWithPath: cachedPath)
                switch mediaType {
                case .image, .gif:
                    self.displayImage(from: cachedURL)
                case .video:
                    self.displayVideo(from: cachedURL)
                case .audio:
                    self.displayAudio(from: cachedURL)
                }
            } else if isMediaDownloading(url: urlString, mediaType: mediaTypeString) {
                print("📱 [ContentExtension] 📥 Media is currently downloading (recheck), showing loader...")
                showMediaLoadingIndicator()
                pollForMediaCompletion(url: urlString, mediaType: mediaTypeString, originalMediaType: mediaType)
            } else {
                // Offri un pulsante per avviare il download manualmente
                presentDownloadCTA(urlString: urlString, mediaType: mediaType, metaMediaType: mediaTypeString)
            }
        }
    }

    private func presentDownloadCTA(urlString: String, mediaType: MediaType, metaMediaType: String) {
        guard let container = mediaContainerView else { return }
        cleanupCurrentMedia()
        hideMediaLoadingIndicator()

        let button = UIButton(type: .system)
        button.setTitle("⬇️ Download media", for: .normal)
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
    
    private func getSharedMediaCacheDirectory() -> URL {
        // Use App Groups shared container for cross-process access
        let bundleIdentifier = Bundle.main.bundleIdentifier?.replacingOccurrences(of: ".ZentikNotificationContentExtension", with: "") ?? "{{MAIN_BUNDLE_ID}}"
        let appGroupIdentifier = "group.\(bundleIdentifier)"
        
        if let sharedContainerURL = FileManager.default.containerURL(forSecurityApplicationGroupIdentifier: appGroupIdentifier) {
            return sharedContainerURL.appendingPathComponent("shared_media_cache")
        } else {
            // Fallback to Documents directory if App Groups not available
            let documentsPath = FileManager.default.urls(for: .documentDirectory, in: .userDomainMask).first!
            return documentsPath.appendingPathComponent("shared_media_cache")
        }
    }
    
    private func getCachedMediaPath(url: String, mediaType: String) -> String? {
        let cacheKey = "\(mediaType.uppercased())_\(url)"
        let filename = generateSafeFileName(url: url, mediaType: mediaType, originalFileName: nil)
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let typeDirectory = sharedCacheDirectory.appendingPathComponent(mediaType.uppercased())
        let filePath = typeDirectory.appendingPathComponent(filename).path
        
        print("📱 [ContentExtension] 🔍 Checking cached file: \(filePath)")
        print("📱 [ContentExtension] 📁 Cache directory: \(sharedCacheDirectory.path)")
        print("📱 [ContentExtension] 📄 Generated filename: \(filename)")
        
        if FileManager.default.fileExists(atPath: filePath) {
            print("📱 [ContentExtension] ✅ Found cached file: \(filePath)")
            return filePath
        } else {
            print("📱 [ContentExtension] ❌ Cached file not found: \(filePath)")
        }
        
        return nil
    }
    
    private func isMediaDownloading(url: String, mediaType: String) -> Bool {
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let metadataFile = sharedCacheDirectory.appendingPathComponent("metadata.json")
        
        print("📱 [ContentExtension] 🔍 Checking metadata file: \(metadataFile.path)")
        
        guard FileManager.default.fileExists(atPath: metadataFile.path) else {
            print("📱 [ContentExtension] ❌ Metadata file does not exist")
            return false
        }
        
        do {
            let data = try Data(contentsOf: metadataFile)
            guard let metadata = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] else {
                print("📱 [ContentExtension] ❌ Failed to parse metadata JSON")
                return false
            }
            
            let cacheKey = "\(mediaType.uppercased())_\(url)"
            let isDownloading = metadata[cacheKey]?["isDownloading"] as? Bool ?? false
            
            print("📱 [ContentExtension] 📊 Metadata keys: \(Array(metadata.keys))")
            print("📱 [ContentExtension] 🔍 Looking for cache key: \(cacheKey)")
            print("📱 [ContentExtension] 📥 Is downloading: \(isDownloading)")
            
            return isDownloading
        } catch {
            print("📱 [ContentExtension] ❌ Failed to read shared metadata: \(error)")
            return false
        }
    }
    
    private func hasMediaDownloadError(url: String, mediaType: String) -> (hasError: Bool, errorMessage: String?) {
        let sharedCacheDirectory = getSharedMediaCacheDirectory()
        let metadataFile = sharedCacheDirectory.appendingPathComponent("metadata.json")
        
        guard FileManager.default.fileExists(atPath: metadataFile.path) else {
            return (false, nil)
        }
        
        do {
            let data = try Data(contentsOf: metadataFile)
            let metadata = try JSONSerialization.jsonObject(with: data) as? [String: [String: Any]] ?? [:]
            
            let cacheKey = "\(mediaType.uppercased())_\(url)"
            let hasError = metadata[cacheKey]?["hasError"] as? Bool ?? false
            let errorMessage = metadata[cacheKey]?["errorMessage"] as? String
            
            print("📱 [ContentExtension] 🔍 Media error check for \(cacheKey): hasError=\(hasError), message=\(errorMessage ?? "none")")
            
            return (hasError, errorMessage)
        } catch {
            print("📱 [ContentExtension] ❌ Failed to read shared metadata for error check: \(error)")
            return (false, nil)
        }
    }
    
    private func pollForMediaCompletion(url: String, mediaType: String, originalMediaType: MediaType) {
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.5) { [weak self] in
            guard let self = self else { return }
            
            // Check if media is still the currently selected one
            guard self.attachmentData.indices.contains(self.selectedMediaIndex) else {
                print("📱 [ContentExtension] ⚠️ Media index changed during polling, stopping")
                return
            }
            
            let currentMedia = self.attachmentData[self.selectedMediaIndex]
            guard let currentUrl = currentMedia["url"] as? String,
                  currentUrl == url else {
                print("📱 [ContentExtension] ⚠️ Different media selected during polling, stopping")
                return
            }
            
            if let cachedPath = self.getCachedMediaPath(url: url, mediaType: mediaType) {
                print("📱 [ContentExtension] ✅ Media download completed, displaying from cache")
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
                let isDownloading = self.isMediaDownloading(url: url, mediaType: mediaType)
                let errorCheck = self.hasMediaDownloadError(url: url, mediaType: mediaType)
                
                print("📱 [ContentExtension] Polling states - Downloading: \(isDownloading), HasError: \(errorCheck.hasError)")
                
                if isDownloading {
                    // Still downloading, continue polling
                    self.pollForMediaCompletion(url: url, mediaType: mediaType, originalMediaType: originalMediaType)
                } else if errorCheck.hasError {
                    print("📱 [ContentExtension] ❌ Download failed with error: \(errorCheck.errorMessage ?? "Unknown error")")
                    self.hideMediaLoadingIndicator()
                    self.showMediaError(
                        errorCheck.errorMessage ?? "Download failed",
                        allowRetry: true,
                        retryAction: { [weak self] in
                            self?.retryCurrentMediaDownload()
                        }
                    )
                } else {
                    // Download completed but no file found, fallback to direct download
                    print("📱 [ContentExtension] ⚠️ Download completed but no file found, falling back to direct download")
                    self.hideMediaLoadingIndicator()
                    guard let originalURL = URL(string: url) else { return }
                    self.downloadAndDisplayMedia(from: originalURL, mediaType: originalMediaType)
                }
            }
        }
    }
    
    private func generateSafeFileName(url: String, mediaType: String, originalFileName: String?) -> String {
        // Extract the extension from the original filename or URL
        let fileExtension = getFileExtension(url: url, mediaType: mediaType, originalFileName: originalFileName)
        
        // Generate a robust hash for the filename
        let longHash = generateLongHash(url: url)
        
        let safeFileName = "\(mediaType.lowercased())_\(longHash)"
        
        return "\(safeFileName)\(fileExtension)"
    }
    
    /**
     * Generate a robust hash for URL-based filename generation
     * Uses the same algorithm as the mobile app
     */
    private func generateLongHash(url: String) -> String {
        // Use a simple but effective hash algorithm matching React Native
        var hash: UInt32 = 0
        for char in url.utf8 {
            hash = hash &* 31 &+ UInt32(char) // Safe multiplication and addition
        }
        // Convert to hex string and pad to 8 characters
        return String(format: "%08x", hash)
    }
    
    private func getFileExtension(url: String, mediaType: String, originalFileName: String?) -> String {
        // Try first from the original filename
        if let originalFileName = originalFileName {
            let parts = originalFileName.components(separatedBy: ".")
            if parts.count > 1 {
                let ext = parts.last!
                if ext.count <= 5 && ext.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil {
                    return ".\(ext.lowercased())"
                }
            }
        }
        
        // Try from the URL
        let urlParts = url.components(separatedBy: "?")[0].components(separatedBy: ".")
        if urlParts.count > 1 {
            let ext = urlParts.last!
            if ext.count <= 5 && ext.range(of: "^[a-zA-Z0-9]+$", options: .regularExpression) != nil {
                return ".\(ext.lowercased())"
            }
        }
        
        // Default based on media type
        switch mediaType.uppercased() {
        case "IMAGE":
            return ".jpg"
        case "GIF":
            return ".gif"
        case "VIDEO":
            return ".mp4"
        case "AUDIO":
            return ".mp3"
        default:
            return ".dat"
        }
    }
    
    // MARK: - Icon Loading from Shared Cache
    
    private func loadIconFromSharedCache(iconUrl: String, iconImageView: UIImageView) {
        print("📱 [ContentExtension] Loading bucket icon from shared cache: \(iconUrl)")
        
        // Ensure icon is visible since we have an ICON attachment
        iconImageView.isHidden = false
        
        // First, try to get the icon from shared cache
        let sharedCacheDir = getSharedMediaCacheDirectory()
        
        let filename = generateSafeFileName(url: iconUrl, mediaType: "ICON", originalFileName: nil)
        let cachedIconPath = sharedCacheDir.appendingPathComponent("ICON").appendingPathComponent(filename)
        
        // Check if icon exists in shared cache
        if FileManager.default.fileExists(atPath: cachedIconPath.path) {
            print("📱 [ContentExtension] ✅ Found icon in shared cache: \(cachedIconPath.path)")
            
            if let data = try? Data(contentsOf: cachedIconPath),
               let image = UIImage(data: data) {
                DispatchQueue.main.async {
                    iconImageView.image = image
                    print("📱 [ContentExtension] ✅ Bucket icon loaded from shared cache")
                }
                return
            } else {
                print("📱 [ContentExtension] ⚠️ Failed to load icon data from shared cache")
            }
        } else {
            print("📱 [ContentExtension] 📁 Icon not found in shared cache: \(cachedIconPath.path)")
        }
        
        // Fallback to direct download
        downloadIconDirectly(iconUrl: iconUrl, iconImageView: iconImageView)
    }
    
    private func downloadIconDirectly(iconUrl: String, iconImageView: UIImageView) {
        guard let url = URL(string: iconUrl) else {
            print("📱 [ContentExtension] ❌ Invalid icon URL: \(iconUrl)")
            // Since we have an ICON attachment, show a placeholder instead of hiding
            iconImageView.image = UIImage(systemName: "photo")
            iconImageView.tintColor = .systemGray
            iconImageView.isHidden = false
            return
        }
        
        print("📱 [ContentExtension] 📥 Downloading icon directly: \(iconUrl)")
        
        URLSession.shared.dataTask(with: url) { data, response, error in
            DispatchQueue.main.async {
                if let data = data, let image = UIImage(data: data) {
                    iconImageView.image = image
                    print("📱 [ContentExtension] ✅ Bucket icon loaded via direct download")
                } else {
                    print("📱 [ContentExtension] ❌ Failed to load bucket icon: \(error?.localizedDescription ?? "Unknown error")")
                    // Since we have an ICON attachment, show a placeholder instead of hiding
                    iconImageView.image = UIImage(systemName: "photo")
                    iconImageView.tintColor = .systemGray
                    iconImageView.isHidden = false
                    print("📱 [ContentExtension] ⚠️ Showing placeholder icon for failed ICON attachment")
                }
            }
        }.resume()
    }
}
