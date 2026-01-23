/**
 * CloudKit FullSync Event Schema
 * 
 * This file defines the complete event schema for CloudKit full sync operations.
 * Events are emitted in a specific order and can be used to build a progress UI.
 */

export type CloudKitSyncStep =
  | 'full_sync'
  | 'reset_cloudkit'
  | 'sync_buckets'
  | 'sync_notifications'
  | 'cleanup_old_notifications_cloudkit'
  | 'cleanup_database'
  | 'update_server_token'
  | 'restart_subscriptions';

export type CloudKitSyncPhase =
  | 'starting' // Step is starting
  | 'preparing' // Preparing data (loading from DB, filtering, etc.)
  | 'found' // Items found (shows count, no progress bar)
  | 'uploading' // Upload has started (show progress bar)
  | 'syncing' // Upload in progress (progress updates)
  | 'completed' // Step completed successfully
  | 'failed'; // Step failed

export type CloudKitSyncItemType = 'bucket' | 'notification' | '';

export interface CloudKitSyncProgressEvent {
  /**
   * Current item count (for progress)
   * - During 'found' phase: total items found
   * - During 'syncing' phase: items successfully uploaded (after retry)
   * - During 'completed' phase: final count
   */
  currentItem: number;

  /**
   * Total items expected
   * - During 'found' phase: total items found
   * - During 'syncing' phase: total items to upload
   * - During 'completed' phase: final count
   */
  totalItems: number;

  /**
   * Type of items being synced
   * - 'bucket' for bucket sync
   * - 'notification' for notification sync
   * - '' for global steps (reset, cleanup, etc.)
   */
  itemType: CloudKitSyncItemType;

  /**
   * Current phase of the step
   */
  phase: CloudKitSyncPhase;

  /**
   * Current step in the sync process
   */
  step: CloudKitSyncStep;

  /**
   * Optional metadata for additional context
   */
  metadata?: {
    /**
     * Error message if phase is 'failed'
     */
    error?: string;

    /**
     * Additional step-specific information
     */
    [key: string]: any;
  };
}

/**
 * Complete event flow for FullSync:
 * 
 * 1. full_sync: starting
 * 2. reset_cloudkit: starting → completed (or failed)
 * 3. sync_buckets: 
 *    - preparing → found (with count) → uploading → syncing (progress) → completed (or failed)
 * 4. sync_notifications:
 *    - preparing → found (with count) → uploading → syncing (progress) → completed (or failed)
 * 5. cleanup_old_notifications_cloudkit: starting → completed (or failed) [optional]
 * 6. cleanup_database: starting → completed (or failed)
 * 7. update_server_token: starting → completed (or failed)
 * 8. restart_subscriptions: starting → completed (or failed)
 * 9. full_sync: completed (or failed)
 * 
 * Progress bar should be shown ONLY during:
 * - sync_buckets: uploading/syncing phases
 * - sync_notifications: uploading/syncing phases
 * 
 * Label should show count during:
 * - sync_buckets: found phase ("18 buckets found")
 * - sync_notifications: found phase ("1542 notifications found")
 */
