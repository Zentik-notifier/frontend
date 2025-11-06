#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(WatchConnectivityBridge, NSObject)

RCT_EXTERN_METHOD(notifyWatchOfUpdate:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

@end

