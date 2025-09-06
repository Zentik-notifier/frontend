#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(SharedContainer, NSObject)

RCT_EXTERN_METHOD(getSharedMediaCacheDirectory:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(getSharedUserDefaults:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(setSharedUserDefault:(id)value
                  forKey:(NSString *)key
                  withResolver:(RCTPromiseResolveBlock)resolve
                  withRejecter:(RCTPromiseRejectBlock)reject)

@end
