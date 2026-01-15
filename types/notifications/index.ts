/**
 * Types and interfaces for the notification management system
 * Using react-query and local storage (IndexedDB/SQLite)
 */

import { NotificationFragment } from '@/generated/gql-operations-generated';

// ====================
// FILTER & SORT TYPES
// ====================

/**
 * Sort direction for queries
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort field options for notifications
 */
export type NotificationSortField = 'createdAt' | 'readAt';

/**
 * Sort configuration for notifications
 */
export interface NotificationSort {
  field: NotificationSortField;
  direction: SortDirection;
}

/**
 * Filter options for notifications
 */
export interface NotificationFilters {
  /** Filter by bucket ID */
  bucketId?: string;
  
  /** Filter by read status */
  isRead?: boolean;
  
  /** Filter by attachment presence */
  hasAttachments?: boolean;
  
  /** Filter by date range - created after */
  createdAfter?: Date | string;
  
  /** Filter by date range - created before */
  createdBefore?: Date | string;
  
  /** Search in title/body/subtitle */
  searchQuery?: string;
}

/**
 * Pagination options
 */
export interface PaginationOptions {
  /** Number of items per page */
  limit?: number;
  
  /** Offset for pagination */
  offset?: number;
}

/**
 * Complete query options for notifications
 */
export interface NotificationQueryOptions {
  filters?: NotificationFilters;
  sort?: NotificationSort;
  pagination?: PaginationOptions;
}

// ====================
// STATISTICS TYPES
// ====================

/**
 * Statistics for a single bucket
 */
export interface BucketStats {
  /** Bucket ID */
  bucketId: string;
  
  /** Bucket name */
  bucketName?: string;
  
  /** Total number of notifications in this bucket */
  totalCount: number;
  
  /** Number of unread notifications */
  unreadCount: number;
  
  /** Number of read notifications */
  readCount: number;
  
  /** Number of notifications with attachments */
  withAttachmentsCount: number;
  
  /** Most recent notification date */
  lastNotificationDate?: string;
  
  /** Oldest notification date */
  firstNotificationDate?: string;
}

/**
 * Bucket with notification statistics
 * Used by useBucketsStats to return complete bucket information
 * Includes all BucketFragment fields plus stats
 */
export interface BucketWithStats {
  /** Bucket ID */
  id: string;
  
  /** Bucket name */
  name: string;
  
  /** Bucket description */
  description?: string | null;
  
  /** Bucket icon */
  icon?: string | null;
  
  /** Bucket icon attachment UUID */
  iconAttachmentUuid?: string | null;
  
  /** Bucket icon URL (public URL for the icon) */
  iconUrl?: string | null;
  
  /** Bucket color */
  color?: string | null;
  
  /** Bucket creation date */
  createdAt: string;
  
  /** Bucket last update date */
  updatedAt: string;
  
  /** Whether the bucket is protected */
  isProtected: boolean | null;
  
  /** Whether the bucket is public */
  isPublic: boolean | null;
  
  /** Whether the bucket is admin-only */
  isAdmin?: boolean | null;
  
  /** Preset ID that was used to create this bucket */
  preset?: string | null;
  
  /** Total number of notifications in this bucket */
  totalMessages: number;
  
  /** Number of unread notifications */
  unreadCount: number;
  
  /** Most recent notification date */
  lastNotificationAt: string | null;
  
  /** Whether the bucket is currently snoozed */
  isSnoozed: boolean;
  
  /** Snooze expiration date if snoozed */
  snoozeUntil: string | null;
  
  /** Bucket owner */
  user?: any;
  
  /** Bucket permissions */
  permissions?: any[];
  
  /** User permissions for this bucket (calculated by backend) */
  userPermissions?: {
    canWrite: boolean;
    canDelete: boolean;
    canAdmin: boolean;
    canRead: boolean;
    isOwner: boolean;
    isSharedWithMe: boolean;
    sharedCount: number;
  };
  
  /** User-specific bucket settings */
  userBucket?: any;
  
  /** Magic code for bucket access */
  magicCode?: string | null;
  
  /** Whether the bucket is orphan (exists only through notifications, not in global cache) */
  isOrphan?: boolean;
}

/**
 * Overall statistics across all notifications
 */
export interface NotificationStats {
  /** Total number of all notifications */
  totalCount: number;
  
  /** Total unread notifications */
  unreadCount: number;
  
  /** Total read notifications */
  readCount: number;
  
  /** Total notifications with attachments */
  withAttachmentsCount: number;
  
  /** Statistics grouped by bucket */
  byBucket: BucketStats[];
  
  /** Most recent notification date across all buckets */
  lastNotificationDate?: string;
  
  /** Oldest notification date across all buckets */
  firstNotificationDate?: string;
}

// ====================
// QUERY RESULT TYPES
// ====================

/**
 * Result of a paginated notification query
 */
export interface NotificationQueryResult {
  /** Array of notifications */
  notifications: NotificationFragment[];
  
  /** Total count (useful for pagination) */
  totalCount: number;
  
  /** Applied filters */
  filters?: NotificationFilters;
  
  /** Applied sort */
  sort?: NotificationSort;
  
  /** Pagination info */
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

// ====================
// MUTATION TYPES
// ====================

/**
 * Input for creating a notification
 * (Simplified - adjust based on backend API)
 */
export interface CreateNotificationInput {
  bucketId: string;
  title: string;
  body?: string;
  subtitle?: string;
  imageUrl?: string;
  tapUrl?: string;
  // Add other fields as needed
}

/**
 * Input for updating a notification
 */
export interface UpdateNotificationInput {
  id: string;
  readAt?: string | null;
  // Add other updatable fields
}

/**
 * Input for marking notifications as read/unread
 */
export interface MarkAsReadInput {
  notificationIds: string[];
  readAt: string | null; // null = mark as unread
}

/**
 * Input for deleting notifications
 */
export interface DeleteNotificationInput {
  notificationIds: string[];
}

// ====================
// CACHE SYNC TYPES
// ====================

/**
 * Sync status between react-query cache and local DB
 */
export type SyncStatus = 'idle' | 'syncing' | 'synced' | 'error';

/**
 * Event types for real-time notification updates
 */
export type NotificationEventType = 
  | 'notification_created'
  | 'notification_updated'
  | 'notification_deleted'
  | 'notification_read'
  | 'notification_unread';

/**
 * Real-time notification event
 */
export interface NotificationEvent {
  type: NotificationEventType;
  notificationId: string;
  notification?: NotificationFragment;
  timestamp: string;
}

// ====================
// HOOK OPTIONS TYPES
// ====================

/**
 * Options for useNotifications hook
 */
export interface UseNotificationsOptions extends NotificationQueryOptions {
  /** Enable real-time updates */
  realtime?: boolean;
  
  /** Auto-sync with local DB */
  autoSync?: boolean;
  
  /** Refetch interval in ms (0 = disabled) */
  refetchInterval?: number;
}

/**
 * Options for useNotificationStats hook
 */
export interface UseNotificationStatsOptions {
  /** Bucket IDs to include (empty = all buckets) */
  bucketIds?: string[];
  
  /** Enable real-time updates */
  realtime?: boolean;
  
  /** Refetch interval in ms */
  refetchInterval?: number;
}

/**
 * Options for useBucketsStats hook
 */
export interface UseBucketsStatsOptions {
  /** Enable real-time updates */
  realtime?: boolean;
  
  /** Refetch interval in ms */
  refetchInterval?: number;
  
  /** Force fetch full details (user, permissions) from API instead of using cache */
  forceFullDetails?: boolean;
}

// ====================
// REPOSITORY TYPES
// ====================

/**
 * Options for querying notifications from local DB
 */
export interface DbQueryOptions extends NotificationQueryOptions {
  /** Include deleted notifications */
  includeDeleted?: boolean;
}

/**
 * Batch operation result
 */
export interface BatchOperationResult {
  /** Number of successful operations */
  successCount: number;
  
  /** Number of failed operations */
  failureCount: number;
  
  /** IDs of items that failed */
  failedIds?: string[];
  
  /** Error messages */
  errors?: string[];
}
