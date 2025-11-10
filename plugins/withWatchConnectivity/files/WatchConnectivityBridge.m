#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WatchConnectivityBridge, NSObject)

RCT_EXTERN_METHOD(notifyWatchOfUpdate:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(notifyWatchToSyncIncremental:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(notifyWatchNotificationRead:(NSString *)notificationId
                  readAt:(NSString *)readAt
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(notifyWatchNotificationUnread:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(notifyWatchNotificationsRead:(NSArray *)notificationIds
                  readAt:(NSString *)readAt
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(notifyWatchNotificationDeleted:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(notifyWatchNotificationAdded:(NSString *)notificationId
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
  return NO;
}

@end