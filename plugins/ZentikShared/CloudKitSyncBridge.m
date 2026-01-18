#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(CloudKitSyncBridge, NSObject)

RCT_EXTERN_METHOD(triggerSyncToCloud:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(triggerSyncToCloudWithDebounce:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateNotificationReadStatus:(NSString *)notificationId
                  isRead:(BOOL)isRead
                  readAtTimestamp:(id)readAtTimestamp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(updateNotificationsReadStatus:(NSArray<NSString *> *)notificationIds
                  isRead:(BOOL)isRead
                  readAtTimestamp:(id)readAtTimestamp
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteNotification:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(deleteNotifications:(NSArray<NSString *> *)notificationIds
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(syncFromCloudKitIncremental:(BOOL)fullSync
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(triggerFullSyncWithVerification:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end
