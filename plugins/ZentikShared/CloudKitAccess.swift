import Foundation
import CloudKit

/**
 * CloudKitAccess - Gestione centralizzata di CloudKit
 * 
 * Nuovo approccio con record individuali:
 * - Ogni bucket è un CKRecord separato (tipo "Bucket")
 * - Ogni notifica è un CKRecord separato (tipo "Notification")
 * - Utilizza la zona di default (_defaultZone) per compatibilità
 * - iOS scrive e legge, Watch legge solo
 * - Sincronizzazione bidirezionale tra dispositivi
 */

// MARK: - CloudKit Configuration

public struct CloudKitConfig {
    /// Container identifier
    public static func getContainerIdentifier() -> String {
        let mainBundleId = KeychainAccess.getMainBundleIdentifier()
        return "iCloud.\(mainBundleId)"
    }
    
    /// Get CloudKit container
    public static func getContainer() -> CKContainer {
        return CKContainer(identifier: getContainerIdentifier())
    }
    
    /// Get private database (uses default zone)
    public static func getPrivateDatabase() -> CKDatabase {
        return getContainer().privateCloudDatabase
    }
}

// MARK: - Record Type Names

public struct CloudKitRecordType {
    public static let bucket = "Bucket"
    public static let notification = "Notification"
}

// MARK: - Field Names

public struct CloudKitField {
    // Bucket fields
    public static let bucketName = "name"
    public static let bucketDescription = "description"
    public static let bucketColor = "color"
    public static let bucketIconUrl = "iconUrl"
    public static let bucketCreatedAt = "createdAt"
    public static let bucketUpdatedAt = "updatedAt"
    
    // Notification fields
    public static let notificationTitle = "title"
    public static let notificationSubtitle = "subtitle"
    public static let notificationBody = "body"
    public static let notificationReadAt = "readAt"
    public static let notificationSentAt = "sentAt"
    public static let notificationCreatedAt = "createdAt"
    public static let notificationUpdatedAt = "updatedAt"
    public static let notificationBucketId = "bucketId"
    public static let notificationAttachments = "attachments"
    public static let notificationActions = "actions"
    public static let notificationTapAction = "tapAction"
}

// MARK: - Date Conversion Helpers

/**
 * Helper functions for converting between Date and ISO8601 String
 * Used to convert CloudKit Date fields to/from String format
 */
public struct DateConverter {
    
    private static let formatter: ISO8601DateFormatter = {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter
    }()
    
    /// Convert ISO8601 String to Date (non-optional)
    public static func stringToDate(_ dateString: String) -> Date {
        return formatter.date(from: dateString) ?? Date()
    }
    
    /// Convert ISO8601 String to Date (optional)
    public static func stringToDate(_ dateString: String?) -> Date? {
        guard let dateString = dateString else { return nil }
        return formatter.date(from: dateString)
    }
    
    /// Convert Date to ISO8601 String (non-optional)
    public static func dateToString(_ date: Date) -> String {
        return formatter.string(from: date)
    }
    
    /// Convert Date to ISO8601 String (optional)
    public static func dateToString(_ date: Date?) -> String? {
        guard let date = date else { return nil }
        return formatter.string(from: date)
    }
}

// MARK: - Bucket Model

/**
 * CloudKitBucket - Modello per bucket CloudKit
 */
public struct CloudKitBucket: Codable, Identifiable {
    public let id: String
    public let name: String
    public let description: String?
    public let color: String?
    public let iconUrl: String?
    public let createdAt: Date
    public let updatedAt: Date
    
    public init(
        id: String,
        name: String,
        description: String? = nil,
        color: String? = nil,
        iconUrl: String? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
    ) {
        self.id = id
        self.name = name
        self.description = description
        self.color = color
        self.iconUrl = iconUrl
        self.createdAt = createdAt
        self.updatedAt = updatedAt
    }
    
    /// Convert to CKRecord
    public func toCKRecord() -> CKRecord {
        let recordID = CKRecord.ID(recordName: id)
        let record = CKRecord(recordType: CloudKitRecordType.bucket, recordID: recordID)
        
        record[CloudKitField.bucketName] = name as CKRecordValue
        record[CloudKitField.bucketDescription] = (description ?? "") as CKRecordValue
        record[CloudKitField.bucketColor] = (color ?? "") as CKRecordValue
        record[CloudKitField.bucketIconUrl] = (iconUrl ?? "") as CKRecordValue
        record[CloudKitField.bucketCreatedAt] = createdAt as CKRecordValue
        record[CloudKitField.bucketUpdatedAt] = updatedAt as CKRecordValue
        
        return record
    }
    
    /// Create from CKRecord
    public static func from(record: CKRecord) -> CloudKitBucket? {
        guard record.recordType == CloudKitRecordType.bucket,
              let name = record[CloudKitField.bucketName] as? String,
              let createdAt = record[CloudKitField.bucketCreatedAt] as? Date,
              let updatedAt = record[CloudKitField.bucketUpdatedAt] as? Date else {
            return nil
        }
        
        let description = record[CloudKitField.bucketDescription] as? String
        let color = record[CloudKitField.bucketColor] as? String
        let iconUrl = record[CloudKitField.bucketIconUrl] as? String
        
        return CloudKitBucket(
            id: record.recordID.recordName,
            name: name,
            description: description?.isEmpty == false ? description : nil,
            color: color?.isEmpty == false ? color : nil,
            iconUrl: iconUrl?.isEmpty == false ? iconUrl : nil,
            createdAt: createdAt,
            updatedAt: updatedAt,
        )
    }
}

// MARK: - Notification Attachment Model

/**
 * CloudKitAttachment - Allegato della notifica
 */
public struct CloudKitAttachment: Codable {
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
 * CloudKitAction - Azione della notifica
 */
public struct CloudKitAction: Codable {
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

// MARK: - Notification Model

/**
 * CloudKitNotification - Modello per notifica CloudKit
 */
public struct CloudKitNotification: Codable, Identifiable {
    public let id: String
    public let title: String
    public let subtitle: String?
    public let body: String?
    public let readAt: Date?
    public let sentAt: Date?
    public let createdAt: Date
    public let updatedAt: Date
    public let bucketId: String
    public let attachments: [CloudKitAttachment]
    public let actions: [CloudKitAction]
    public let tapAction: CloudKitAction?
    
    public init(
        id: String,
        title: String,
        subtitle: String? = nil,
        body: String? = nil,
        readAt: Date? = nil,
        sentAt: Date? = nil,
        createdAt: Date = Date(),
        updatedAt: Date = Date(),
        bucketId: String,
        attachments: [CloudKitAttachment] = [],
        actions: [CloudKitAction] = [],
        tapAction: CloudKitAction? = nil
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
    
    /// Convert to CKRecord
    public func toCKRecord() -> CKRecord {
        let recordID = CKRecord.ID(recordName: id)
        let record = CKRecord(recordType: CloudKitRecordType.notification, recordID: recordID)
        
        record[CloudKitField.notificationTitle] = title as CKRecordValue
        record[CloudKitField.notificationSubtitle] = (subtitle ?? "") as CKRecordValue
        record[CloudKitField.notificationBody] = (body ?? "") as CKRecordValue
        record[CloudKitField.notificationReadAt] = readAt as? CKRecordValue
        record[CloudKitField.notificationSentAt] = sentAt as? CKRecordValue
        record[CloudKitField.notificationCreatedAt] = createdAt as CKRecordValue
        record[CloudKitField.notificationUpdatedAt] = updatedAt as CKRecordValue
        record[CloudKitField.notificationBucketId] = bucketId as CKRecordValue
        
        // Serialize attachments, actions, tapAction as JSON strings
        if let attachmentsData = try? JSONEncoder().encode(attachments),
           let attachmentsString = String(data: attachmentsData, encoding: .utf8) {
            record[CloudKitField.notificationAttachments] = attachmentsString as CKRecordValue
        }
        
        if let actionsData = try? JSONEncoder().encode(actions),
           let actionsString = String(data: actionsData, encoding: .utf8) {
            record[CloudKitField.notificationActions] = actionsString as CKRecordValue
        }
        
        if let tapAction = tapAction,
           let tapActionData = try? JSONEncoder().encode(tapAction),
           let tapActionString = String(data: tapActionData, encoding: .utf8) {
            record[CloudKitField.notificationTapAction] = tapActionString as CKRecordValue
        }
        
        return record
    }
    
    /// Create from CKRecord
    public static func from(record: CKRecord) -> CloudKitNotification? {
        guard record.recordType == CloudKitRecordType.notification,
              let title = record[CloudKitField.notificationTitle] as? String,
              let createdAt = record[CloudKitField.notificationCreatedAt] as? Date,
              let updatedAt = record[CloudKitField.notificationUpdatedAt] as? Date,
              let bucketId = record[CloudKitField.notificationBucketId] as? String else {
            return nil
        }
        
        let subtitle = record[CloudKitField.notificationSubtitle] as? String
        let body = record[CloudKitField.notificationBody] as? String
        let readAt = record[CloudKitField.notificationReadAt] as? Date
        let sentAt = record[CloudKitField.notificationSentAt] as? Date
        
        // Deserialize attachments, actions, tapAction from JSON strings
        var attachments: [CloudKitAttachment] = []
        if let attachmentsString = record[CloudKitField.notificationAttachments] as? String,
           let attachmentsData = attachmentsString.data(using: .utf8),
           let decodedAttachments = try? JSONDecoder().decode([CloudKitAttachment].self, from: attachmentsData) {
            attachments = decodedAttachments
        }
        
        var actions: [CloudKitAction] = []
        if let actionsString = record[CloudKitField.notificationActions] as? String,
           let actionsData = actionsString.data(using: .utf8),
           let decodedActions = try? JSONDecoder().decode([CloudKitAction].self, from: actionsData) {
            actions = decodedActions
        }
        
        var tapAction: CloudKitAction? = nil
        if let tapActionString = record[CloudKitField.notificationTapAction] as? String,
           let tapActionData = tapActionString.data(using: .utf8),
           let decodedTapAction = try? JSONDecoder().decode(CloudKitAction.self, from: tapActionData) {
            tapAction = decodedTapAction
        }
        
        return CloudKitNotification(
            id: record.recordID.recordName,
            title: title,
            subtitle: subtitle?.isEmpty == false ? subtitle : nil,
            body: body?.isEmpty == false ? body : nil,
            readAt: readAt,
            sentAt: sentAt,
            createdAt: createdAt,
            updatedAt: updatedAt,
            bucketId: bucketId,
            attachments: attachments,
            actions: actions,
            tapAction: tapAction
        )
    }
}

// MARK: - CloudKit Operations

public class CloudKitAccess {
    
    private static let database = CloudKitConfig.getPrivateDatabase()
    private static let logger = LoggingSystem.shared
    
    // MARK: - Bucket Operations
    
    /// Save a bucket to CloudKit
    public static func saveBucket(_ bucket: CloudKitBucket, completion: @escaping (Result<CloudKitBucket, Error>) -> Void) {
        let record = bucket.toCKRecord()
        
        logger.info(
            tag: "SaveBucket",
            message: "Saving bucket to CloudKit",
            metadata: [
                "bucketId": bucket.id,
                "bucketName": bucket.name
            ],
            source: "CloudKitAccess"
        )
        
        database.save(record) { savedRecord, error in
            if let error = error {
                logger.error(
                    tag: "SaveBucket",
                    message: "Failed to save bucket",
                    metadata: [
                        "bucketId": bucket.id,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            } else if let savedRecord = savedRecord, let savedBucket = CloudKitBucket.from(record: savedRecord) {
                logger.info(
                    tag: "SaveBucket",
                    message: "Successfully saved bucket",
                    metadata: ["bucketId": bucket.id],
                    source: "CloudKitAccess"
                )
                completion(.success(savedBucket))
            } else {
                let error = NSError(domain: "CloudKitAccess", code: 1, userInfo: [NSLocalizedDescriptionKey: "Failed to parse saved bucket"])
                completion(.failure(error))
            }
        }
    }
    
    /// Fetch a single bucket by ID
    public static func fetchBucket(id: String, completion: @escaping (Result<CloudKitBucket?, Error>) -> Void) {
        let recordID = CKRecord.ID(recordName: id)
        
        database.fetch(withRecordID: recordID) { record, error in
            if let error = error {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    completion(.success(nil))
                } else {
                    completion(.failure(error))
                }
            } else if let record = record, let bucket = CloudKitBucket.from(record: record) {
                completion(.success(bucket))
            } else {
                completion(.success(nil))
            }
        }
    }
    
    /// Fetch all buckets
    public static func fetchAllBuckets(completion: @escaping (Result<[CloudKitBucket], Error>) -> Void) {
        let query = CKQuery(recordType: CloudKitRecordType.bucket, predicate: NSPredicate(value: true))
        // Don't use sortDescriptors - fields may not be marked as sortable in CloudKit
        // We'll sort locally instead
        
        logger.info(
            tag: "FetchBuckets",
            message: "Fetching all buckets from CloudKit",
            source: "CloudKitAccess"
        )
        
        database.perform(query, inZoneWith: nil) { records, error in
            if let error = error {
                logger.error(
                    tag: "FetchBuckets",
                    message: "Failed to fetch buckets",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            } else {
                // Parse and sort locally by name
                let buckets = records?.compactMap { CloudKitBucket.from(record: $0) }
                    .sorted { $0.name.localizedCaseInsensitiveCompare($1.name) == .orderedAscending } ?? []
                logger.info(
                    tag: "FetchBuckets",
                    message: "Successfully fetched buckets",
                    metadata: ["count": String(buckets.count)],
                    source: "CloudKitAccess"
                )
                completion(.success(buckets))
            }
        }
    }
    
    /// Delete a bucket
    public static func deleteBucket(id: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let recordID = CKRecord.ID(recordName: id)
        
        logger.info(
            tag: "DeleteBucket",
            message: "Deleting bucket from CloudKit",
            metadata: ["bucketId": id],
            source: "CloudKitAccess"
        )
        
        database.delete(withRecordID: recordID) { deletedRecordID, error in
            if let error = error {
                logger.error(
                    tag: "DeleteBucket",
                    message: "Failed to delete bucket",
                    metadata: [
                        "bucketId": id,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            } else {
                logger.info(
                    tag: "DeleteBucket",
                    message: "Successfully deleted bucket",
                    metadata: ["bucketId": id],
                    source: "CloudKitAccess"
                )
                completion(.success(()))
            }
        }
    }
    
    // MARK: - Notification Operations
    
    /// Save a notification to CloudKit
    public static func saveNotification(_ notification: CloudKitNotification, completion: @escaping (Result<CloudKitNotification, Error>) -> Void) {
        let record = notification.toCKRecord()
        
        logger.info(
            tag: "SaveNotification",
            message: "Saving notification to CloudKit",
            metadata: [
                "notificationId": notification.id,
                "title": notification.title
            ],
            source: "CloudKitAccess"
        )
        
        database.save(record) { savedRecord, error in
            if let error = error {
                logger.error(
                    tag: "SaveNotification",
                    message: "Failed to save notification",
                    metadata: [
                        "notificationId": notification.id,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            } else if let savedRecord = savedRecord, let savedNotification = CloudKitNotification.from(record: savedRecord) {
                logger.info(
                    tag: "SaveNotification",
                    message: "Successfully saved notification",
                    metadata: ["notificationId": notification.id],
                    source: "CloudKitAccess"
                )
                completion(.success(savedNotification))
            } else {
                let error = NSError(domain: "CloudKitAccess", code: 2, userInfo: [NSLocalizedDescriptionKey: "Failed to parse saved notification"])
                completion(.failure(error))
            }
        }
    }
    
    /// Fetch a single notification by ID
    public static func fetchNotification(id: String, completion: @escaping (Result<CloudKitNotification?, Error>) -> Void) {
        let recordID = CKRecord.ID(recordName: id)
        
        database.fetch(withRecordID: recordID) { record, error in
            if let error = error {
                if let ckError = error as? CKError, ckError.code == .unknownItem {
                    completion(.success(nil))
                } else {
                    completion(.failure(error))
                }
            } else if let record = record, let notification = CloudKitNotification.from(record: record) {
                completion(.success(notification))
            } else {
                completion(.success(nil))
            }
        }
    }
    
    /// Fetch all notifications
    public static func fetchAllNotifications(limit: Int? = nil, completion: @escaping (Result<[CloudKitNotification], Error>) -> Void) {
        let query = CKQuery(recordType: CloudKitRecordType.notification, predicate: NSPredicate(value: true))
        // Don't use sortDescriptors - fields may not be marked as sortable in CloudKit
        // We'll sort locally instead
        
        logger.info(
            tag: "FetchNotifications",
            message: "Fetching all notifications from CloudKit",
            metadata: ["limit": limit.map { String($0) } ?? "none"],
            source: "CloudKitAccess"
        )
        
        let operation = CKQueryOperation(query: query)
        if let limit = limit {
            operation.resultsLimit = limit
        }
        
        var fetchedRecords: [CKRecord] = []
        
        operation.recordMatchedBlock = { recordID, result in
            switch result {
            case .success(let record):
                fetchedRecords.append(record)
            case .failure(let error):
                logger.warn(
                    tag: "FetchNotifications",
                    message: "Failed to fetch individual notification",
                    metadata: [
                        "recordId": recordID.recordName,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
            }
        }
        
        operation.queryResultBlock = { result in
            switch result {
            case .success:
                // Parse and sort locally by createdAt (most recent first)
                let notifications = fetchedRecords.compactMap { CloudKitNotification.from(record: $0) }
                    .sorted { $0.createdAt > $1.createdAt }
                logger.info(
                    tag: "FetchNotifications",
                    message: "Successfully fetched notifications",
                    metadata: ["count": String(notifications.count)],
                    source: "CloudKitAccess"
                )
                completion(.success(notifications))
            case .failure(let error):
                logger.error(
                    tag: "FetchNotifications",
                    message: "Failed to fetch notifications",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            }
        }
        
        database.add(operation)
    }
    
    /// Fetch notifications by bucket ID
    public static func fetchNotifications(bucketId: String, limit: Int? = nil, completion: @escaping (Result<[CloudKitNotification], Error>) -> Void) {
        let predicate = NSPredicate(format: "%K == %@", CloudKitField.notificationBucketId, bucketId)
        let query = CKQuery(recordType: CloudKitRecordType.notification, predicate: predicate)
        // Don't use sortDescriptors - fields may not be marked as sortable in CloudKit
        // We'll sort locally instead
        
        logger.info(
            tag: "FetchNotifications",
            message: "Fetching notifications for bucket",
            metadata: [
                "bucketId": bucketId,
                "limit": limit.map { String($0) } ?? "none"
            ],
            source: "CloudKitAccess"
        )
        
        let operation = CKQueryOperation(query: query)
        if let limit = limit {
            operation.resultsLimit = limit
        }
        
        var fetchedRecords: [CKRecord] = []
        
        operation.recordMatchedBlock = { recordID, result in
            switch result {
            case .success(let record):
                fetchedRecords.append(record)
            case .failure(let error):
                logger.warn(
                    tag: "FetchNotifications",
                    message: "Failed to fetch individual notification",
                    metadata: [
                        "recordId": recordID.recordName,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
            }
        }
        
        operation.queryResultBlock = { result in
            switch result {
            case .success:
                // Parse and sort locally by createdAt (most recent first)
                let notifications = fetchedRecords.compactMap { CloudKitNotification.from(record: $0) }
                    .sorted { $0.createdAt > $1.createdAt }
                logger.info(
                    tag: "FetchNotifications",
                    message: "Successfully fetched notifications for bucket",
                    metadata: [
                        "bucketId": bucketId,
                        "count": String(notifications.count)
                    ],
                    source: "CloudKitAccess"
                )
                completion(.success(notifications))
            case .failure(let error):
                logger.error(
                    tag: "FetchNotifications",
                    message: "Failed to fetch notifications for bucket",
                    metadata: [
                        "bucketId": bucketId,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            }
        }
        
        database.add(operation)
    }
    
    /// Delete a notification
    public static func deleteNotification(id: String, completion: @escaping (Result<Void, Error>) -> Void) {
        let recordID = CKRecord.ID(recordName: id)
        
        logger.info(
            tag: "DeleteNotification",
            message: "Deleting notification from CloudKit",
            metadata: ["notificationId": id],
            source: "CloudKitAccess"
        )
        
        database.delete(withRecordID: recordID) { deletedRecordID, error in
            if let error = error {
                logger.error(
                    tag: "DeleteNotification",
                    message: "Failed to delete notification",
                    metadata: [
                        "notificationId": id,
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            } else {
                logger.info(
                    tag: "DeleteNotification",
                    message: "Successfully deleted notification",
                    metadata: ["notificationId": id],
                    source: "CloudKitAccess"
                )
                completion(.success(()))
            }
        }
    }
    
    /// Mark notification as read
    public static func markNotificationAsRead(id: String, completion: @escaping (Result<CloudKitNotification, Error>) -> Void) {
        let recordID = CKRecord.ID(recordName: id)
        
        database.fetch(withRecordID: recordID) { record, error in
            if let error = error {
                completion(.failure(error))
                return
            }
            
            guard let record = record else {
                let error = NSError(domain: "CloudKitAccess", code: 3, userInfo: [NSLocalizedDescriptionKey: "Notification not found"])
                completion(.failure(error))
                return
            }
            
            // Update readAt field
            record[CloudKitField.notificationReadAt] = Date() as CKRecordValue
            record[CloudKitField.notificationUpdatedAt] = Date() as CKRecordValue
            
            database.save(record) { savedRecord, saveError in
                if let saveError = saveError {
                    completion(.failure(saveError))
                } else if let savedRecord = savedRecord, let notification = CloudKitNotification.from(record: savedRecord) {
                    completion(.success(notification))
                } else {
                    let error = NSError(domain: "CloudKitAccess", code: 4, userInfo: [NSLocalizedDescriptionKey: "Failed to parse updated notification"])
                    completion(.failure(error))
                }
            }
        }
    }
    
    // MARK: - Batch Operations
    
    /// Save multiple buckets
    public static func saveBuckets(_ buckets: [CloudKitBucket], completion: @escaping (Result<[CloudKitBucket], Error>) -> Void) {
        let records = buckets.map { $0.toCKRecord() }
        
        logger.info(
            tag: "SaveBuckets",
            message: "Saving multiple buckets to CloudKit",
            metadata: ["count": String(buckets.count)],
            source: "CloudKitAccess"
        )
        
        let operation = CKModifyRecordsOperation(recordsToSave: records, recordIDsToDelete: nil)
        operation.savePolicy = .changedKeys
        
        operation.modifyRecordsResultBlock = { result in
            switch result {
            case .success:
                logger.info(
                    tag: "SaveBuckets",
                    message: "Successfully saved buckets",
                    metadata: ["count": String(buckets.count)],
                    source: "CloudKitAccess"
                )
                completion(.success(buckets))
            case .failure(let error):
                logger.error(
                    tag: "SaveBuckets",
                    message: "Failed to save buckets",
                    metadata: [
                        "count": String(buckets.count),
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            }
        }
        
        database.add(operation)
    }
    
    /// Save multiple notifications
    public static func saveNotifications(_ notifications: [CloudKitNotification], completion: @escaping (Result<[CloudKitNotification], Error>) -> Void) {
        let records = notifications.map { $0.toCKRecord() }
        
        logger.info(
            tag: "SaveNotifications",
            message: "Saving multiple notifications to CloudKit",
            metadata: ["count": String(notifications.count)],
            source: "CloudKitAccess"
        )
        
        let operation = CKModifyRecordsOperation(recordsToSave: records, recordIDsToDelete: nil)
        operation.savePolicy = .changedKeys
        
        operation.modifyRecordsResultBlock = { result in
            switch result {
            case .success:
                logger.info(
                    tag: "SaveNotifications",
                    message: "Successfully saved notifications",
                    metadata: ["count": String(notifications.count)],
                    source: "CloudKitAccess"
                )
                completion(.success(notifications))
            case .failure(let error):
                logger.error(
                    tag: "SaveNotifications",
                    message: "Failed to save notifications",
                    metadata: [
                        "count": String(notifications.count),
                        "error": error.localizedDescription
                    ],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            }
        }
        
        database.add(operation)
    }
    
    // MARK: - Subscriptions
    
    /// Setup CloudKit subscriptions for real-time updates
    public static func setupSubscriptions(completion: @escaping (Result<Void, Error>) -> Void) {
        // Subscription for buckets
        let bucketSubscription = CKQuerySubscription(
            recordType: CloudKitRecordType.bucket,
            predicate: NSPredicate(value: true),
            subscriptionID: "bucket-changes",
            options: [.firesOnRecordCreation, .firesOnRecordUpdate, .firesOnRecordDeletion]
        )
        
        let bucketNotificationInfo = CKSubscription.NotificationInfo()
        bucketNotificationInfo.shouldSendContentAvailable = true
        bucketSubscription.notificationInfo = bucketNotificationInfo
        
        // Subscription for notifications
        let notificationSubscription = CKQuerySubscription(
            recordType: CloudKitRecordType.notification,
            predicate: NSPredicate(value: true),
            subscriptionID: "notification-changes",
            options: [.firesOnRecordCreation, .firesOnRecordUpdate, .firesOnRecordDeletion]
        )
        
        let notificationNotificationInfo = CKSubscription.NotificationInfo()
        notificationNotificationInfo.shouldSendContentAvailable = true
        notificationSubscription.notificationInfo = notificationNotificationInfo
        
        logger.info(
            tag: "SetupSubscriptions",
            message: "Setting up CloudKit subscriptions",
            source: "CloudKitAccess"
        )
        
        let operation = CKModifySubscriptionsOperation(
            subscriptionsToSave: [bucketSubscription, notificationSubscription],
            subscriptionIDsToDelete: nil
        )
        
        operation.modifySubscriptionsResultBlock = { result in
            switch result {
            case .success:
                logger.info(
                    tag: "SetupSubscriptions",
                    message: "Successfully setup subscriptions",
                    source: "CloudKitAccess"
                )
                completion(.success(()))
            case .failure(let error):
                logger.error(
                    tag: "SetupSubscriptions",
                    message: "Failed to setup subscriptions",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            }
        }
        
        database.add(operation)
    }
    
    // MARK: - Account Status
    
    /// Check iCloud account status
    public static func checkAccountStatus(completion: @escaping (Result<CKAccountStatus, Error>) -> Void) {
        CloudKitConfig.getContainer().accountStatus { status, error in
            if let error = error {
                logger.error(
                    tag: "AccountStatus",
                    message: "Failed to check account status",
                    metadata: ["error": error.localizedDescription],
                    source: "CloudKitAccess"
                )
                completion(.failure(error))
            } else {
                let statusString: String
                switch status {
                case .available:
                    statusString = "available"
                case .noAccount:
                    statusString = "noAccount"
                case .restricted:
                    statusString = "restricted"
                case .couldNotDetermine:
                    statusString = "couldNotDetermine"
                case .temporarilyUnavailable:
                    statusString = "temporarilyUnavailable"
                @unknown default:
                    statusString = "unknown"
                }
                
                logger.info(
                    tag: "AccountStatus",
                    message: "Account status checked",
                    metadata: ["status": statusString],
                    source: "CloudKitAccess"
                )
                completion(.success(status))
            }
        }
    }
}
