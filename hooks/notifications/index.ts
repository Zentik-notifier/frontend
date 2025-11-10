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
  useNotificationsState as useAppState,
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
  useCreateBucket,
  useUpdateBucket,
  useDeleteBucketWithNotifications,
  useSetBucketSnooze,
  useUpdateBucketSnoozes,
  useShareBucket,
  useUnshareBucket,
} from './useBucketMutations';

// Bucket Stats Utilities
export { getBucketStats } from './bucketStatsUtils';

// CloudKit Sync Hook

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
