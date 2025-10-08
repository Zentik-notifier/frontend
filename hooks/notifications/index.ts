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
  useNotificationStats,
  useBucketStats,
  useUnreadCountsByBucket,
  useNotificationDetail,
  useSyncNotificationsFromAPI,
  useRefreshNotifications,
  notificationKeys,
  refreshNotificationQueries,
} from './useNotificationQueries';

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
  NotificationStats,
  NotificationQueryResult,
  CreateNotificationInput,
  UpdateNotificationInput,
  MarkAsReadInput,
  DeleteNotificationInput,
  UseNotificationsOptions,
  UseNotificationStatsOptions,
  NotificationEventType,
  NotificationEvent,
} from '@/types/notifications';
