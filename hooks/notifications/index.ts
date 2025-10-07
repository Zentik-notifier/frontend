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
  useNotifications,
  useNotification,
  useBucketNotifications,
  useInfiniteNotifications,
  useNotificationStats,
  useBucketStats,
  useUnreadCountsByBucket,
  notificationKeys,
  prefetchNotifications,
  prefetchBucketNotifications,
  syncNotificationsFromAPI,
  refreshNotificationQueries,
} from './useNotificationQueries';

// Mutation Hooks
export {
  useCreateNotification,
  useUpdateNotification,
  useMarkAsRead,
  useMarkAsUnread,
  useBatchMarkAsRead,
  useMarkAllAsRead,
  useDeleteNotification,
  useBatchDeleteNotifications,
  useClearAllNotifications,
  useOptimisticMarkAsRead,
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
  NotificationStats,
  NotificationQueryResult,
  CreateNotificationInput,
  UpdateNotificationInput,
  MarkAsReadInput,
  DeleteNotificationInput,
  UseNotificationsOptions,
  UseBucketNotificationsOptions,
  UseNotificationStatsOptions,
  NotificationEventType,
  NotificationEvent,
} from '@/types/notifications';
