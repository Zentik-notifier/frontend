//
//  CKSyncBridge.swift
//  ZentikShared
//
//  React Native bridge for CloudKit sync via CKSyncEngine.
//  Single bridge: replaces both the old CloudKitSyncBridge and CKSyncBridge.
//

#if os(iOS)

import Foundation
import React
import CloudKit
import WatchConnectivity

@objc(CKSyncBridge)
class CKSyncBridge: RCTEventEmitter {

    private var hasListeners = false
    private var ckObserver: NSObjectProtocol?

    @objc override static func requiresMainQueueSetup() -> Bool { false }

    override func supportedEvents() -> [String]! {
        ["onCloudKitDataUpdated"]
    }

    override func startObserving() {
        hasListeners = true
        ckObserver = NotificationCenter.default.addObserver(
            forName: NSNotification.Name("CloudKitDataUpdated"),
            object: nil,
            queue: nil
        ) { [weak self] notification in
            guard let self, self.hasListeners else { return }
            let userInfo = notification.userInfo ?? [:]
            let changedIds = userInfo["changedNotificationIds"] as? [String] ?? []
            let deletedIds = userInfo["deletedNotificationIds"] as? [String] ?? []
            let bucketIds = userInfo["changedBucketIds"] as? [String] ?? []
            self.sendEvent(withName: "onCloudKitDataUpdated", body: [
                "changedNotificationIds": changedIds,
                "deletedNotificationIds": deletedIds,
                "changedBucketIds": bucketIds,
            ])
        }
    }

    override func stopObserving() {
        hasListeners = false
        if let observer = ckObserver {
            NotificationCenter.default.removeObserver(observer)
            ckObserver = nil
        }
    }

    // MARK: - Watch support

    @objc func isWatchSupported(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let supported = WCSession.isSupported() && ProcessInfo.processInfo.isOperatingSystemAtLeast(
            OperatingSystemVersion(majorVersion: 17, minorVersion: 0, patchVersion: 0)
        )
        resolve(["supported": supported])
    }

    // MARK: - Enable / Disable

    @objc func isCloudKitEnabled(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["enabled": CloudKitManagerBase.isCloudKitEnabled])
    }

    @objc func setCloudKitEnabled(
        _ enabled: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        CloudKitManagerBase.setCloudKitEnabled(enabled)
        resolve(["success": true, "enabled": CloudKitManagerBase.isCloudKitEnabled])
    }

    // MARK: - Debug logging

    @objc func isCloudKitDebugEnabled(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["enabled": CloudKitManagerBase.isCloudKitDebugEnabled()])
    }

    @objc func setCloudKitDebugEnabled(
        _ enabled: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        CloudKitManagerBase.setCloudKitDebugEnabled(enabled)
        resolve(["success": true, "enabled": CloudKitManagerBase.isCloudKitDebugEnabled()])
    }

    // MARK: - Schema / Subscriptions (no-op with CKSyncEngine)

    @objc func initializeSchemaIfNeeded(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["success": true])
    }

    @objc func setupSubscriptions(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(["success": true])
    }

    // MARK: - Full sync to cloud

    @objc func triggerFullSyncToCloud(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true, "bucketsSynced": 0, "notificationsSynced": 0] as [String: Any])
            return
        }
        PhoneSyncEngineCKSync.shared.triggerFullSyncToCloud { success, bucketsCount, notificationsCount, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve([
                    "success": success,
                    "bucketsSynced": bucketsCount,
                    "notificationsSynced": notificationsCount,
                ] as [String: Any])
            }
        }
    }

    @objc func triggerSyncToCloudWithDebounce(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true])
            return
        }
        PhoneSyncEngineCKSync.shared.addPendingForRecentNotifications(limit: 20) { count, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": true, "count": count] as [String: Any])
            }
        }
    }

    // MARK: - Per-record CloudKit operations

    @objc func updateNotificationReadStatus(
        _ notificationId: String,
        readAtTimestamp: NSNumber?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true])
            return
        }
        let readAt: Date? = readAtTimestamp != nil ? Date(timeIntervalSince1970: readAtTimestamp!.doubleValue / 1000.0) : nil
        PhoneSyncEngineCKSync.shared.updateNotificationsReadStatusInCloudKit(notificationIds: [notificationId], readAt: readAt) { success, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": success])
            }
        }
    }

    @objc func updateNotificationsReadStatus(
        _ notificationIds: [String],
        readAtTimestamp: NSNumber?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true, "updatedCount": 0])
            return
        }
        let readAt: Date? = readAtTimestamp != nil ? Date(timeIntervalSince1970: readAtTimestamp!.doubleValue / 1000.0) : nil
        PhoneSyncEngineCKSync.shared.updateNotificationsReadStatusInCloudKit(notificationIds: notificationIds, readAt: readAt) { success, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": success, "updatedCount": notificationIds.count] as [String: Any])
            }
        }
    }

    @objc func deleteNotification(
        _ notificationId: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true])
            return
        }
        PhoneSyncEngineCKSync.shared.deleteNotificationFromCloudKit(notificationId: notificationId) { success, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": success])
            }
        }
    }

    @objc func deleteNotifications(
        _ notificationIds: [String],
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true, "deletedCount": 0])
            return
        }
        PhoneSyncEngineCKSync.shared.deleteNotificationsFromCloudKit(notificationIds: notificationIds) { success, count, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": success, "deletedCount": count] as [String: Any])
            }
        }
    }

    // MARK: - Fetch changes (incremental)

    @objc func syncFromCloudKitIncremental(
        _ fullSync: Bool,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true, "updatedCount": 0])
            return
        }
        PhoneSyncEngineCKSync.shared.fetchChangesNow { error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": true, "updatedCount": 0] as [String: Any])
            }
        }
    }

    // MARK: - NSE retry

    @objc func retryNSENotificationsToCloudKit(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard #available(iOS 17.0, *), PhoneSyncEngineCKSync.shared.isCloudKitEnabled else {
            resolve(["success": true, "count": 0])
            return
        }
        PhoneSyncEngineCKSync.shared.addPendingForRecentNotifications(limit: 50) { count, error in
            if let error {
                reject("CKSyncError", error.localizedDescription, nil)
            } else {
                resolve(["success": true, "count": count] as [String: Any])
            }
        }
    }

    // MARK: - Notification limit

    @objc func getCloudKitNotificationLimit(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let limit = CloudKitManagerBase.cloudKitNotificationLimit
        resolve(["limit": limit as Any])
    }

    @objc func setCloudKitNotificationLimit(
        _ limit: NSNumber?,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        CloudKitManagerBase.cloudKitNotificationLimit = limit?.intValue
        resolve(["success": true, "limit": CloudKitManagerBase.cloudKitNotificationLimit as Any])
    }

    // MARK: - Initial sync flag

    @objc func isInitialSyncCompleted(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let key = CloudKitManagerBase.cloudKitInitialSyncCompletedKey
        let completed = UserDefaults.standard.bool(forKey: key)
        resolve(["completed": completed])
    }

    @objc func resetInitialSyncFlag(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let key = CloudKitManagerBase.cloudKitInitialSyncCompletedKey
        UserDefaults.standard.removeObject(forKey: key)
        resolve(["success": true])
    }

    // MARK: - Zone management

    @objc func deleteCloudKitZone(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let base = CloudKitManagerBase()
        base.deleteZone { result in
            switch result {
            case .success:
                resolve(["success": true])
            case .failure(let error):
                reject("CKSyncError", error.localizedDescription, nil)
            }
        }
    }

    @objc func resetCloudKitZone(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let base = CloudKitManagerBase()
        base.deleteZone { result in
            switch result {
            case .failure(let error):
                reject("CKSyncError", error.localizedDescription, nil)
            case .success:
                base.resetServerChangeToken()
                base.ensureZone { ensureResult in
                    switch ensureResult {
                    case .failure(let error):
                        reject("CKSyncError", error.localizedDescription, nil)
                    case .success:
                        resolve(["success": true])
                    }
                }
            }
        }
    }

    // MARK: - Watch full sync

    @objc func triggerWatchFullSync(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard WCSession.isSupported() else {
            resolve(["success": false, "error": "WatchConnectivity not supported"])
            return
        }
        let session = WCSession.default
        guard session.activationState == .activated else {
            resolve(["success": false, "error": "WCSession not activated"])
            return
        }
        let context: [String: Any] = ["type": "triggerFullSync"]
        do {
            try session.updateApplicationContext(context)
            resolve(["success": true, "note": session.isReachable ? "Sent" : "Will sync when Watch is active"])
        } catch {
            reject("CKSyncError", "Failed to send triggerFullSync: \(error.localizedDescription)", error)
        }
    }

    // MARK: - Watch token settings

    @objc func sendWatchTokenSettings(
        _ token: String,
        serverAddress: String,
        resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        guard WCSession.isSupported() else {
            reject("CKSyncError", "WatchConnectivity not supported", nil)
            return
        }
        let session = WCSession.default
        guard session.activationState == .activated else {
            reject("CKSyncError", "WCSession not activated", nil)
            return
        }

        let context: [String: Any] = [
            "type": "watchTokenSettings",
            "token": token,
            "serverAddress": serverAddress,
            "timestamp": Date().timeIntervalSince1970
        ]

        do {
            try session.updateApplicationContext(context)
        } catch {
            // Continue anyway, try message
        }

        if session.isReachable {
            session.sendMessage(context, replyHandler: { _ in
                resolve(["success": true])
            }, errorHandler: { _ in
                resolve(["success": true])
            })
        } else {
            resolve(["success": true])
        }
    }

    // MARK: - Fetch all (recovery)

    @objc func fetchAllNotificationsFromCloudKit(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let base = CloudKitManagerBase()
        base.queryRecords(recordType: "Notifications") { result in
            switch result {
            case .failure(let error):
                reject("CKSyncError", error.localizedDescription, nil)
            case .success(let records):
                let formatter = ISO8601DateFormatter()
                formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
                let notifications: [[String: Any]] = records.compactMap { record in
                    guard let id = record["id"] as? String,
                          let bucketId = record["bucketId"] as? String,
                          let title = record["title"] as? String,
                          let body = record["body"] as? String,
                          let createdAt = record["createdAt"] as? Date else { return nil }
                    let readAt = record["readAt"] as? Date
                    var dict: [String: Any] = [
                        "id": id,
                        "bucketId": bucketId,
                        "title": title,
                        "body": body,
                        "createdAt": formatter.string(from: createdAt),
                        "isRead": readAt != nil
                    ]
                    if let subtitle = record["subtitle"] as? String { dict["subtitle"] = subtitle }
                    if let readAt { dict["readAt"] = formatter.string(from: readAt) }
                    return dict
                }
                resolve(["success": true, "count": notifications.count, "notifications": notifications] as [String: Any])
            }
        }
    }

    // MARK: - Destructive sync (reset + re-upload)

    @objc func triggerSyncToCloudWithReset(
        _ resolve: @escaping RCTPromiseResolveBlock,
        reject: @escaping RCTPromiseRejectBlock
    ) {
        let base = CloudKitManagerBase()
        base.deleteZone { result in
            switch result {
            case .failure(let error):
                reject("CKSyncError", error.localizedDescription, nil)
            case .success:
                base.resetServerChangeToken()
                base.ensureZone { ensureResult in
                    switch ensureResult {
                    case .failure(let error):
                        reject("CKSyncError", error.localizedDescription, nil)
                    case .success:
                        guard #available(iOS 17.0, *) else {
                            resolve(["success": true, "notificationsSynced": 0, "bucketsSynced": 0] as [String: Any])
                            return
                        }
                        PhoneSyncEngineCKSync.shared.triggerFullSyncToCloud { success, bucketsCount, notificationsCount, error in
                            if let error {
                                reject("CKSyncError", error.localizedDescription, nil)
                            } else {
                                resolve([
                                    "success": success,
                                    "bucketsSynced": bucketsCount,
                                    "notificationsSynced": notificationsCount,
                                ] as [String: Any])
                            }
                        }
                    }
                }
            }
        }
    }
}

#endif
