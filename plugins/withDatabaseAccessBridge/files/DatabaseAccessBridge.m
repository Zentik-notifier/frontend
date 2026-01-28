#import <React/RCTBridgeModule.h>

@interface RCT_EXTERN_MODULE(DatabaseAccessBridge, NSObject)

// MARK: - Notification Operations

/**
 * Mark a single notification as read
 * @param notificationId The ID of the notification to mark as read
 */
RCT_EXTERN_METHOD(
  markNotificationAsRead:(NSString *)notificationId
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Mark multiple notifications as read in bulk
 * @param notificationIds Array of notification IDs to mark as read
 */
RCT_EXTERN_METHOD(
  markMultipleNotificationsAsRead:(NSArray<NSString *> *)notificationIds
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Mark a single notification as unread
 * @param notificationId The ID of the notification to mark as unread
 */
RCT_EXTERN_METHOD(
  markNotificationAsUnread:(NSString *)notificationId
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Delete a single notification
 * @param notificationId The ID of the notification to delete
 */
RCT_EXTERN_METHOD(
  deleteNotification:(NSString *)notificationId
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Get unread notification count
 */
RCT_EXTERN_METHOD(
  getNotificationCount:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Check if notification exists in database
 * @param notificationId The ID of the notification to check
 */
RCT_EXTERN_METHOD(
  notificationExists:(NSString *)notificationId
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

// MARK: - Bucket Operations

/**
 * Get all buckets from database
 */
RCT_EXTERN_METHOD(
  getAllBuckets:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Get recent notifications for widget/watch display
 * @param limit Maximum number of notifications to return
 * @param unreadOnly If true, only return unread notifications
 */
RCT_EXTERN_METHOD(
  getRecentNotifications:(nonnull NSNumber *)limit
  unreadOnly:(BOOL)unreadOnly
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

// MARK: - Settings Operations

/**
 * Get a setting value from app_settings table
 * @param key The setting key to retrieve
 */
RCT_EXTERN_METHOD(
  getSettingValue:(NSString *)key
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Set a setting value in app_settings table
 * @param key The setting key to set
 * @param value The value to set
 */
RCT_EXTERN_METHOD(
  setSettingValue:(NSString *)key
  value:(NSString *)value
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Remove a setting value from app_settings table
 * @param key The setting key to remove
 */
RCT_EXTERN_METHOD(
  removeSettingValue:(NSString *)key
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Get all keys from app_settings table (KV store)
 */
RCT_EXTERN_METHOD(
  getAllSettingKeys:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Run PRAGMA quick_check under lock (integrity check).
 */
RCT_EXTERN_METHOD(
  runIntegrityCheck:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Ensure shared cache.db exists with full schema. Idempotent; call at app startup on iOS.
 */
RCT_EXTERN_METHOD(
  ensureCacheDbInitialized:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Get database path (for debugging purposes)
 */
RCT_EXTERN_METHOD(
  getDbPath:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Get lock file path in App Group. Logs are in JSON files, not in cache.db.
 */
RCT_EXTERN_METHOD(
  getSharedCacheLockPath:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Get total notification count (read + unread)
 */
RCT_EXTERN_METHOD(
  getTotalNotificationCount:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

// MARK: - Generic SQL Operations

/**
 * Execute a generic SQL query (SELECT)
 * @param sql The SQL query to execute
 * @param params Array of parameters to bind to the query
 */
RCT_EXTERN_METHOD(
  executeQuery:(NSString *)sql
  params:(NSArray *)params
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

/**
 * Execute a generic SQL statement (INSERT, UPDATE, DELETE)
 * @param sql The SQL statement to execute
 * @param params Array of parameters to bind to the statement
 */
RCT_EXTERN_METHOD(
  executeUpdate:(NSString *)sql
  params:(NSArray *)params
  resolver:(RCTPromiseResolveBlock)resolve
  rejecter:(RCTPromiseRejectBlock)reject
)

@end
