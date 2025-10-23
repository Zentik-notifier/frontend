/**
 * Notification Management System - Index
 * Export all notification-related hooks, types, and utilities
 */

// Provider
export {
  NotificationProvider,
  useNotificationContext,
  createNotificationQueryClient,
} from './NotificationProvider';

// Query Hooks
export {
  useNotification,
  useInfiniteNotifications,
  useAppState,
  useAllNotificationIds,
  refreshNotificationQueries,
  notificationKeys,
} from './useNotificationQueries';

// Bucket Query Hooks
export { 
  useBucket, 
  useRefreshBucket, 
  bucketKeys,
  type BucketDetailData,
  type BucketPermissions,
  type BucketWithPermissions
} from './useBucketQueries';

// Bucket Mutation Hooks
export {
  useDeleteBucketWithNotifications,
  useSetBucketSnooze,
  useUpdateBucketSnoozes,
  useShareBucket,
  useUnshareBucket,
} from './useBucketMutations';

// Bucket Stats Utilities
export { getBucketStats } from './bucketStatsUtils';

// Mutation Hooks
export {
  useMarkAsRead,
  useMarkAsUnread,
  useBatchMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useBatchDeleteNotifications,
} from './useNotificationMutations';

// Types
export type {
  NotificationFilters,
  NotificationSort,
  NotificationSortField,
  SortDirection,
  PaginationOptions,
  NotificationQueryOptions,
  BucketStats,
  BucketWithStats,
  NotificationStats,
  NotificationQueryResult,
  CreateNotificationInput,
  UpdateNotificationInput,
  MarkAsReadInput,
  DeleteNotificationInput,
  UseNotificationsOptions,
  UseNotificationStatsOptions,
  UseBucketsStatsOptions,
  NotificationEventType,
  NotificationEvent,
} from '@/types/notifications';
