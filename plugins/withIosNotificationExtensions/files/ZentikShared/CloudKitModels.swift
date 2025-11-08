import Foundation
import CloudKit

/**
 * CloudKitModels - Data structures for CloudKit synchronization
 * 
 * Nuovo approccio basato su file JSON:
 * - Un file JSON per i buckets (buckets.json)
 * - Un file JSON per le notifications (notifications.json)
 * - iOS sincronizza il DB locale SQL -> JSON -> CloudKit (CKAsset)
 * - Watch scarica i JSON da CloudKit -> sostituisce il DB locale
 * - Messaggi real-time tra dispositivi per aggiornamenti immediati
 */

// MARK: - CloudKit Record Type Names

public struct CloudKitRecordType {
    public static let bucketsData = "BucketsData"
    public static let notificationsData = "NotificationsData"
}

// MARK: - CloudKit Field Names

public struct CloudKitField {
    // SyncData fields (JSON file as CKAsset)
    public static let dataFile = "dataFile"
    public static let syncTimestamp = "syncTimestamp"
    public static let recordCount = "recordCount" // numero di record nel JSON
}


// MARK: - Bucket Model (JSON-serializable)

/**
 * Bucket - Modello per sincronizzazione JSON
 * 
 * Rappresenta un bucket nel file JSON condiviso via CloudKit
 */
public struct Bucket: Codable {
    public let id: String
    public let name: String
    public let description: String?
    public let color: String?
    public let iconUrl: String?
    public let createdAt: String // ISO8601 string
    public let updatedAt: String // ISO8601 string
    public let isOrphan: Bool?
    
    enum CodingKeys: String, CodingKey {
        case id, name, description, color, iconUrl, createdAt, updatedAt, isOrphan
    }
    
    public init(
        id: String,
        name: String,
        description: String? = nil,
        color: String? = nil,
        iconUrl: String? = nil,
        createdAt: String,
        updatedAt: String,
        isOrphan: Bool? = nil
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.color = color
        self.iconUrl = iconUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
        self.isOrphan = isOrphan
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

// MARK: - CloudKit Sync Data Container

/**
 * BucketsDataContainer - Container per i dati dei buckets
 * 
 * Questo è il JSON che viene salvato come CKAsset su CloudKit
 */
public struct BucketsDataContainer: Codable {
    public let buckets: [Bucket]
    public let syncTimestamp: String // ISO8601 string
    
    public init(buckets: [Bucket], syncTimestamp: String = ISO8601DateFormatter().string(from: Date())) {
        self.buckets = buckets
        self.syncTimestamp = syncTimestamp
    }
}

/**
 * NotificationsDataContainer - Container per i dati delle notifiche
 * 
 * Questo è il JSON che viene salvato come CKAsset su CloudKit
 */
public struct NotificationsDataContainer: Codable {
    public let notifications: [SyncNotification]
    public let syncTimestamp: String // ISO8601 string
    
    public init(notifications: [SyncNotification], syncTimestamp: String = ISO8601DateFormatter().string(from: Date())) {
        self.notifications = notifications
        self.syncTimestamp = syncTimestamp
    }
}

// MARK: - CloudKit Helper Methods

public extension BucketsDataContainer {
    /**
     * Crea un CKRecord con il file JSON come CKAsset
     */
    func toCKRecord(zoneID: CKRecordZone.ID) throws -> CKRecord {
        let recordID = CKRecord.ID(recordName: "buckets_data", zoneID: zoneID)
        let record = CKRecord(recordType: CloudKitRecordType.bucketsData, recordID: recordID)
        
        // Encode to JSON
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let jsonData = try encoder.encode(self)
        
        // Write to temp file
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("buckets_\(UUID().uuidString).json")
        try jsonData.write(to: fileURL)
        
        // Create CKAsset
        let asset = CKAsset(fileURL: fileURL)
        record[CloudKitField.dataFile] = asset
        record[CloudKitField.syncTimestamp] = Date()
        record[CloudKitField.recordCount] = buckets.count
        
        return record
    }
    
    /**
     * Crea BucketsDataContainer da un CKRecord
     */
    static func from(record: CKRecord) throws -> BucketsDataContainer {
        guard record.recordType == CloudKitRecordType.bucketsData,
              let asset = record[CloudKitField.dataFile] as? CKAsset,
              let fileURL = asset.fileURL else {
            throw NSError(domain: "CloudKitModels", code: 1, userInfo: [NSLocalizedDescriptionKey: "Invalid buckets record"])
        }
        
        let jsonData = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        return try decoder.decode(BucketsDataContainer.self, from: jsonData)
    }
}

public extension NotificationsDataContainer {
    /**
     * Crea un CKRecord con il file JSON come CKAsset
     */
    func toCKRecord(zoneID: CKRecordZone.ID) throws -> CKRecord {
        let recordID = CKRecord.ID(recordName: "notifications_data", zoneID: zoneID)
        let record = CKRecord(recordType: CloudKitRecordType.notificationsData, recordID: recordID)
        
        // Encode to JSON
        let encoder = JSONEncoder()
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]
        let jsonData = try encoder.encode(self)
        
        // Write to temp file
        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent("notifications_\(UUID().uuidString).json")
        try jsonData.write(to: fileURL)
        
        // Create CKAsset
        let asset = CKAsset(fileURL: fileURL)
        record[CloudKitField.dataFile] = asset
        record[CloudKitField.syncTimestamp] = Date()
        record[CloudKitField.recordCount] = notifications.count
        
        return record
    }
    
    /**
     * Crea NotificationsDataContainer da un CKRecord
     */
    static func from(record: CKRecord) throws -> NotificationsDataContainer {
        guard record.recordType == CloudKitRecordType.notificationsData,
              let asset = record[CloudKitField.dataFile] as? CKAsset,
              let fileURL = asset.fileURL else {
            throw NSError(domain: "CloudKitModels", code: 2, userInfo: [NSLocalizedDescriptionKey: "Invalid notifications record"])
        }
        
        let jsonData = try Data(contentsOf: fileURL)
        let decoder = JSONDecoder()
        return try decoder.decode(NotificationsDataContainer.self, from: jsonData)
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

