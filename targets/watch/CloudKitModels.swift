import Foundation
import CloudKit

/**
 * CloudKitModels - Data structures for CloudKit synchronization
 * 
 * Approccio basato su record individuali:
 * - Ogni bucket è un CKRecord separato
 * - Ogni notifica è un CKRecord separato
 * - Utilizza la zona di default
 * - iOS sincronizza il DB locale SQL -> CloudKit (record individuali)
 * - Watch scarica i record individuali da CloudKit -> salva nel DB locale
 */

// MARK: - Bucket Model (JSON-serializable)

/**
 * Bucket - Modello per sincronizzazione
 * 
 * Rappresenta un bucket sincronizzato via CloudKit come record individuale
 */
public struct Bucket: Codable {
    public let id: String
    public let name: String
    public let description: String?
    public let color: String?
    public let iconUrl: String?
    public let createdAt: String // ISO8601 string
    public let updatedAt: String // ISO8601 string
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, color, iconUrl, createdAt, updatedAt
    }
    
    public init(
        id: String,
        name: String,
        description: String? = nil,
        color: String? = nil,
        iconUrl: String? = nil,
        createdAt: String,
        updatedAt: String,
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.color = color
        self.iconUrl = iconUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
}

// MARK: - Notification Attachment Model

/**
 * SyncAttachment - Allegato della notifica per CloudKit sync
 */
public struct SyncAttachment: Codable {
    public let mediaType: String
    public let url: String?
    public let name: String?
    
    public init(mediaType: String, url: String?, name: String?) {
        self.mediaType = mediaType
        self.url = url
        self.name = name
    }
}

// MARK: - Notification Action Model

/**
 * SyncAction - Azione della notifica per CloudKit sync
 */
public struct SyncAction: Codable {
    public let type: String
    public let value: String?
    public let title: String?
    public let icon: String?
    public let destructive: Bool
    
    public init(type: String, value: String?, title: String?, icon: String?, destructive: Bool) {
        self.type = type
        self.value = value
        self.title = title
        self.icon = icon
        self.destructive = destructive
    }
}

// MARK: - Notification Model (JSON-serializable)

/**
 * SyncNotification - Modello per sincronizzazione JSON
 * 
 * Rappresenta una notifica nel file JSON condiviso via CloudKit
 */
public struct SyncNotification: Codable {
    public let id: String
    public let title: String
    public let subtitle: String?
    public let body: String?
    public let readAt: String? // ISO8601 string or null
    public let sentAt: String? // ISO8601 string
    public let createdAt: String // ISO8601 string
    public let updatedAt: String // ISO8601 string
    public let bucketId: String
    public let attachments: [SyncAttachment]
    public let actions: [SyncAction]
    public let tapAction: SyncAction?
    
    public init(
        id: String,
        title: String,
        subtitle: String? = nil,
        body: String? = nil,
        readAt: String? = nil,
        sentAt: String? = nil,
        createdAt: String,
        updatedAt: String,
        bucketId: String,
        attachments: [SyncAttachment] = [],
        actions: [SyncAction] = [],
        tapAction: SyncAction? = nil
    ) {
        self.id = id
        self.title = title
        self.subtitle = subtitle
        self.body = body
        self.readAt = readAt
        self.sentAt = sentAt
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.bucketId = bucketId
        self.attachments = attachments
        self.actions = actions
        self.tapAction = tapAction
    }
}

// MARK: - Device-to-Device Messaging

/**
 * SyncUpdateMessage - Messaggio per notificare aggiornamenti tra dispositivi
 * 
 * Inviato tramite WatchConnectivity quando una notifica viene modificata
 */
public struct SyncUpdateMessage: Codable {
    public enum UpdateType: String, Codable {
        case notificationRead
        case notificationDeleted
        case bucketCreated
        case bucketUpdated
        case bucketDeleted
        case fullSync
    }
    
    public let type: UpdateType
    public let entityId: String? // ID della notifica/bucket modificato
    public let timestamp: String // ISO8601 string
    
    public init(type: UpdateType, entityId: String? = nil, timestamp: String = ISO8601DateFormatter().string(from: Date())) {
        self.type = type
        self.entityId = entityId
        self.timestamp = timestamp
    }
}

