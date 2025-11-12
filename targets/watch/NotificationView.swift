import SwiftUI
import UserNotifications

/// SwiftUI view for Long Look notification display
struct NotificationView: View {
    @State private var title: String = ""
    @State private var subtitle: String?
    @State private var notificationBody: String = ""
    @State private var bucketName: String?
    @State private var bucketColor: String?
    @State private var bucketIconUrl: String?
    @State private var attachmentCount: Int = 0
    @State private var actionCount: Int = 0
    
    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            // Bucket info (if available)
            if let bucketName = bucketName {
                HStack(spacing: 6) {
                    // Bucket icon or colored circle
                    Circle()
                        .fill(hexColor(bucketColor) ?? Color.blue)
                        .frame(width: 20, height: 20)
                    
                    Text(bucketName)
                        .font(.caption)
                        .foregroundColor(.secondary)
                }
            }
            
            // Title
            Text(title)
                .font(.headline)
                .fontWeight(.bold)
            
            // Subtitle (if available)
            if let subtitle = subtitle, !subtitle.isEmpty {
                Text(subtitle)
                    .font(.subheadline)
                    .foregroundColor(.secondary)
            }
            
            // Body
            Text(notificationBody)
                .font(.body)
                .lineLimit(4)
            
            // Metadata row
            HStack(spacing: 12) {
                if attachmentCount > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "paperclip")
                            .font(.caption)
                        Text("\(attachmentCount)")
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
                
                if actionCount > 0 {
                    HStack(spacing: 4) {
                        Image(systemName: "hand.tap")
                            .font(.caption)
                        Text("\(actionCount)")
                            .font(.caption)
                    }
                    .foregroundColor(.secondary)
                }
            }
        }
        .padding()
    }
    
    /// Update notification data from UNNotification
    func updateNotification(title: String, subtitle: String?, body: String, userInfo: [AnyHashable: Any]) {
        self.title = title
        self.subtitle = subtitle
        self.notificationBody = body
        
        // Extract custom data from userInfo
        if let bucketName = userInfo["bucketName"] as? String {
            self.bucketName = bucketName
        }
        
        if let bucketColor = userInfo["bucketColor"] as? String {
            self.bucketColor = bucketColor
        }
        
        if let bucketIconUrl = userInfo["bucketIconUrl"] as? String {
            self.bucketIconUrl = bucketIconUrl
        }
        
        if let attachments = userInfo["attachments"] as? [[String: Any]] {
            self.attachmentCount = attachments.count
        }
        
        if let actions = userInfo["allowedActions"] as? [[String: Any]] {
            self.actionCount = actions.count
        }
    }
    
    private func hexColor(_ hex: String?) -> Color? {
        guard var hex = hex else { return nil }
        hex = hex.trimmingCharacters(in: .whitespacesAndNewlines)
        hex = hex.hasPrefix("#") ? String(hex.dropFirst()) : hex
        
        guard hex.count == 6 else { return nil }
        
        var rgb: UInt64 = 0
        Scanner(string: hex).scanHexInt64(&rgb)
        
        let r = Double((rgb & 0xFF0000) >> 16) / 255.0
        let g = Double((rgb & 0x00FF00) >> 8) / 255.0
        let b = Double(rgb & 0x0000FF) / 255.0
        
        return Color(red: r, green: g, blue: b)
    }
}

struct NotificationView_Previews: PreviewProvider {
    static var previews: some View {
        NotificationView()
    }
}
