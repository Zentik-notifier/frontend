//
//  CKSyncBridge.m
//  ZentikShared
//

#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(CKSyncBridge, RCTEventEmitter)

// Watch support
RCT_EXTERN_METHOD(isWatchSupported:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Enable / Disable
RCT_EXTERN_METHOD(isCloudKitEnabled:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setCloudKitEnabled:(BOOL)enabled
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Debug logging
RCT_EXTERN_METHOD(isCloudKitDebugEnabled:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setCloudKitDebugEnabled:(BOOL)enabled
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Schema / Subscriptions
RCT_EXTERN_METHOD(initializeSchemaIfNeeded:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setupSubscriptions:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Full sync
RCT_EXTERN_METHOD(triggerFullSyncToCloud:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(triggerSyncToCloudWithDebounce:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Per-record operations
RCT_EXTERN_METHOD(updateNotificationReadStatus:(NSString *)notificationId
                  readAtTimestamp:(NSNumber *)readAtTimestamp
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateNotificationsReadStatus:(NSArray *)notificationIds
                  readAtTimestamp:(NSNumber *)readAtTimestamp
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteNotification:(NSString *)notificationId
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteNotifications:(NSArray *)notificationIds
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Incremental fetch
RCT_EXTERN_METHOD(syncFromCloudKitIncremental:(BOOL)fullSync
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// NSE retry
RCT_EXTERN_METHOD(retryNSENotificationsToCloudKit:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Notification limit
RCT_EXTERN_METHOD(getCloudKitNotificationLimit:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setCloudKitNotificationLimit:(nonnull NSNumber *)limit
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Initial sync flag
RCT_EXTERN_METHOD(isInitialSyncCompleted:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resetInitialSyncFlag:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Zone management
RCT_EXTERN_METHOD(deleteCloudKitZone:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(resetCloudKitZone:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Watch full sync
RCT_EXTERN_METHOD(triggerWatchFullSync:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Watch token settings
RCT_EXTERN_METHOD(sendWatchTokenSettings:(NSString *)token
                  serverAddress:(NSString *)serverAddress
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Fetch all (recovery)
RCT_EXTERN_METHOD(fetchAllNotificationsFromCloudKit:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

// Destructive sync
RCT_EXTERN_METHOD(triggerSyncToCloudWithReset:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)

@end
