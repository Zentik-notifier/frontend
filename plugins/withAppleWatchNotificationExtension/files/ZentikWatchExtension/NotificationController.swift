import WatchKit
import Foundation
import UserNotifications

class NotificationController: WKUserNotificationInterfaceController {
    @IBOutlet weak var titleLabel: WKInterfaceLabel!
    @IBOutlet weak var subtitleLabel: WKInterfaceLabel!
    @IBOutlet weak var bodyLabel: WKInterfaceLabel!
    @IBOutlet weak var iconImageView: WKInterfaceImage!
    @IBOutlet weak var mediaImageView: WKInterfaceImage!
    @IBOutlet weak var placeholderLabel: WKInterfaceLabel!

    override init() {
        super.init()
    }

    override func willActivate() {
        super.willActivate()
    }

    override func didDeactivate() {
        super.didDeactivate()
    }

    override func didReceive(_ notification: UNNotification) {
        let content = notification.request.content
        titleLabel.setText(content.title)
        subtitleLabel.setText(content.subtitle)
        bodyLabel.setText(content.body)
        placeholderLabel.setHidden(false)

        // Basic icon/media population (URLs would come from payload custom fields)
        if let iconURLString = content.userInfo["icon"] as? String, let iconURL = URL(string: iconURLString) {
            loadImage(url: iconURL) { [weak self] img in
                if let img = img { self?.iconImageView.setImage(img) }
            }
        }
        if let mediaURLString = content.userInfo["media"] as? String, let mediaURL = URL(string: mediaURLString) {
            loadImage(url: mediaURL) { [weak self] img in
                if let img = img {
                    self?.mediaImageView.setImage(img)
                    self?.placeholderLabel.setHidden(true)
                }
            }
        }
    }

    private func loadImage(url: URL, completion: @escaping (UIImage?) -> Void) {
        URLSession.shared.dataTask(with: url) { data, _, _ in
            var image: UIImage? = nil
            if let data = data { image = UIImage(data: data) }
            DispatchQueue.main.async { completion(image) }
        }.resume()
    }
}
