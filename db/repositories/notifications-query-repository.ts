/**
 * Advanced notification query repository
 * Provides filtering, sorting, and statistics operations on local storage
 */

import { Platform } from 'react-native';
import { openWebStorageDb, openSharedCacheDb, parseNotificationFromDB } from '../../services/db-setup';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import {
  NotificationFilters,
  NotificationSort,
  PaginationOptions,
  NotificationQueryResult,
  BucketStats,
  NotificationStats,
  DbQueryOptions,
} from '@/types/notifications';

// ====================
// DATABASE HELPERS
// ====================

/**
 * Get the appropriate database instance based on platform
 */
async function getDatabase() {
  if (Platform.OS === 'web') {
    return await openWebStorageDb();
  } else {
    return await openSharedCacheDb();
  }
}

/**
 * Execute a query on the appropriate database
 */
async function executeQuery<T>(queryFn: (db: any) => Promise<T>): Promise<T> {
  const db = await getDatabase();
  return await queryFn(db);
}

// ====================
// FILTER HELPERS
// ====================

/**
 * Apply filters to notifications array (used for IndexedDB)
 */
function applyFilters(
  notifications: NotificationFragment[],
  filters?: NotificationFilters
): NotificationFragment[] {
  if (!filters) return notifications;

  let filtered = [...notifications];

  // Filter by bucket
  if (filters.bucketId) {
    filtered = filtered.filter(n => n.message.bucket.id === filters.bucketId);
  }

  // Filter by read status
  if (filters.isRead !== undefined) {
    filtered = filtered.filter(n => {
      const isRead = n.readAt !== null && n.readAt !== undefined;
      return isRead === filters.isRead;
    });
  }

  // Filter by attachments
  if (filters.hasAttachments !== undefined) {
    filtered = filtered.filter(n => {
      const hasAttachments = n.message.attachments && n.message.attachments.length > 0;
      return hasAttachments === filters.hasAttachments;
    });
  }

  // Filter by date range - created after
  if (filters.createdAfter) {
    const afterTime = new Date(filters.createdAfter).getTime();
    filtered = filtered.filter(n => {
      const createdTime = new Date(n.createdAt).getTime();
      return createdTime >= afterTime;
    });
  }

  // Filter by date range - created before
  if (filters.createdBefore) {
    const beforeTime = new Date(filters.createdBefore).getTime();
    filtered = filtered.filter(n => {
      const createdTime = new Date(n.createdAt).getTime();
      return createdTime <= beforeTime;
    });
  }

  // Search in title/body/subtitle
  if (filters.searchQuery) {
    const query = filters.searchQuery.toLowerCase();
    filtered = filtered.filter(n => {
      const title = (n.message.title || '').toLowerCase();
      const body = (n.message.body || '').toLowerCase();
      const subtitle = (n.message.subtitle || '').toLowerCase();
      return title.includes(query) || body.includes(query) || subtitle.includes(query);
    });
  }

  return filtered;
}

/**
 * Apply sorting to notifications array
 */
function applySort(
  notifications: NotificationFragment[],
  sort?: NotificationSort
): NotificationFragment[] {
  if (!sort) {
    // Default: sort by createdAt desc
    return [...notifications].sort((a, b) => {
      const aTime = new Date(a.createdAt).getTime();
      const bTime = new Date(b.createdAt).getTime();
      return bTime - aTime;
    });
  }

  return [...notifications].sort((a, b) => {
    let aValue: number;
    let bValue: number;

    if (sort.field === 'createdAt') {
      aValue = new Date(a.createdAt).getTime();
      bValue = new Date(b.createdAt).getTime();
    } else if (sort.field === 'readAt') {
      // Handle null values for readAt (unread notifications)
      aValue = a.readAt ? new Date(a.readAt).getTime() : 0;
      bValue = b.readAt ? new Date(b.readAt).getTime() : 0;
    } else {
      return 0;
    }

    if (sort.direction === 'asc') {
      return aValue - bValue;
    } else {
      return bValue - aValue;
    }
  });
}

/**
 * Apply pagination to notifications array
 */
function applyPagination(
  notifications: NotificationFragment[],
  pagination?: PaginationOptions
): NotificationFragment[] {
  if (!pagination) return notifications;

  const { limit = 50, offset = 0 } = pagination;
  return notifications.slice(offset, offset + limit);
}

/**
 * Build SQL WHERE clause for SQLite queries
 */
function buildWhereClause(filters?: NotificationFilters): { where: string; params: any[] } {
  if (!filters) return { where: '', params: [] };

  const conditions: string[] = [];
  const params: any[] = [];

  if (filters.bucketId) {
    conditions.push('bucket_id = ?');
    params.push(filters.bucketId);
  }

  if (filters.isRead !== undefined) {
    if (filters.isRead) {
      conditions.push('read_at IS NOT NULL');
    } else {
      conditions.push('read_at IS NULL');
    }
  }

  if (filters.hasAttachments !== undefined) {
    conditions.push('has_attachments = ?');
    params.push(filters.hasAttachments ? 1 : 0);
  }

  if (filters.createdAfter) {
    conditions.push('created_at >= ?');
    params.push(new Date(filters.createdAfter).toISOString());
  }

  if (filters.createdBefore) {
    conditions.push('created_at <= ?');
    params.push(new Date(filters.createdBefore).toISOString());
  }

  // Note: searchQuery filtering on SQLite requires parsing JSON fragment
  // For performance, we'll filter this in-memory after fetching

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return { where, params };
}

/**
 * Build SQL ORDER BY clause
 */
function buildOrderByClause(sort?: NotificationSort): string {
  if (!sort) {
    return 'ORDER BY created_at DESC';
  }

  const field = sort.field === 'createdAt' ? 'created_at' : 'read_at';
  const direction = sort.direction === 'asc' ? 'ASC' : 'DESC';
  return `ORDER BY ${field} ${direction}`;
}

/**
 * Build SQL LIMIT/OFFSET clause
 */
function buildLimitClause(pagination?: PaginationOptions): string {
  if (!pagination) return '';

  const { limit = 50, offset = 0 } = pagination;
  return `LIMIT ${limit} OFFSET ${offset}`;
}

// ====================
// QUERY OPERATIONS
// ====================

/**
 * Query notifications with filters, sorting, and pagination
 */
export async function queryNotifications(
  options?: DbQueryOptions
): Promise<NotificationQueryResult> {
  const { filters, sort, pagination } = options || {};

  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - fetch all and filter in memory
        const allNotifications = await db.getAll('notifications');
        const parsed = allNotifications.map(parseNotificationFromDB);

        // Apply filters
        let filtered = applyFilters(parsed, filters);

        // Apply search query filter if present
        if (filters?.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          filtered = filtered.filter(n => {
            const title = (n.message.title || '').toLowerCase();
            const body = (n.message.body || '').toLowerCase();
            const subtitle = (n.message.subtitle || '').toLowerCase();
            return title.includes(query) || body.includes(query) || subtitle.includes(query);
          });
        }

        const totalCount = filtered.length;

        // Apply sorting
        const sorted = applySort(filtered, sort);

        // Apply pagination
        const paginated = applyPagination(sorted, pagination);

        return {
          notifications: paginated,
          totalCount,
          filters,
          sort,
          pagination: pagination
            ? {
                limit: pagination.limit || 50,
                offset: pagination.offset || 0,
                hasMore: (pagination.offset || 0) + paginated.length < totalCount,
              }
            : undefined,
        };
      } else {
        // SQLite - use SQL queries for better performance
        const { where, params } = buildWhereClause(filters);
        const orderBy = buildOrderByClause(sort);

        // Get total count
        const countQuery = `SELECT COUNT(*) as count FROM notifications ${where}`;
        const countResult = await db.getFirstAsync(countQuery, params);
        const totalCount = countResult?.count || 0;

        // Get notifications
        const limit = buildLimitClause(pagination);
        const query = `SELECT * FROM notifications ${where} ${orderBy} ${limit}`;
        const results = await db.getAllAsync(query, params);
        
        let parsed = results.map(parseNotificationFromDB);

        // Apply search query filter in-memory if present
        if (filters?.searchQuery) {
          const query = filters.searchQuery.toLowerCase();
          parsed = parsed.filter((n: NotificationFragment) => {
            const title = (n.message.title || '').toLowerCase();
            const body = (n.message.body || '').toLowerCase();
            const subtitle = (n.message.subtitle || '').toLowerCase();
            return title.includes(query) || body.includes(query) || subtitle.includes(query);
          });
        }

        return {
          notifications: parsed,
          totalCount,
          filters,
          sort,
          pagination: pagination
            ? {
                limit: pagination.limit || 50,
                offset: pagination.offset || 0,
                hasMore: (pagination.offset || 0) + parsed.length < totalCount,
              }
            : undefined,
        };
      }
    } catch (error) {
      console.error('[queryNotifications] Error:', error);
      return {
        notifications: [],
        totalCount: 0,
        filters,
        sort,
      };
    }
  });
}

/**
 * Query notifications for a specific bucket
 */
export async function queryBucketNotifications(
  bucketId: string,
  options?: Omit<DbQueryOptions, 'filters'> & { filters?: Omit<NotificationFilters, 'bucketId'> }
): Promise<NotificationQueryResult> {
  const filters: NotificationFilters = {
    ...options?.filters,
    bucketId,
  };

  return queryNotifications({
    ...options,
    filters,
  });
}

/**
 * Get a single notification by ID
 */
export async function getNotificationById(
  notificationId: string
): Promise<NotificationFragment | null> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        const result = await db.get('notifications', notificationId);
        return result ? parseNotificationFromDB(result) : null;
      } else {
        const result = await db.getFirstAsync(
          'SELECT * FROM notifications WHERE id = ?',
          [notificationId]
        );
        return result ? parseNotificationFromDB(result) : null;
      }
    } catch {
      return null;
    }
  });
}

// ====================
// STATISTICS OPERATIONS
// ====================

/**
 * Get statistics for a specific bucket
 */
export async function getBucketStats(bucketId: string): Promise<BucketStats> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - fetch and calculate in memory
        const allNotifications = await db.getAll('notifications');
        const bucketNotifications = allNotifications
          .map(parseNotificationFromDB)
          .filter((n: NotificationFragment) => n.message.bucket.id === bucketId);

        if (bucketNotifications.length === 0) {
          return {
            bucketId,
            totalCount: 0,
            unreadCount: 0,
            readCount: 0,
            withAttachmentsCount: 0,
          };
        }

        const unreadCount = bucketNotifications.filter((n: NotificationFragment) => !n.readAt).length;
        const withAttachmentsCount = bucketNotifications.filter(
          (n: NotificationFragment) => n.message.attachments && n.message.attachments.length > 0
        ).length;

        const dates = bucketNotifications.map((n: NotificationFragment) => new Date(n.createdAt).getTime()).sort((a: number, b: number) => b - a);

        return {
          bucketId,
          bucketName: bucketNotifications[0]?.message.bucket.name,
          totalCount: bucketNotifications.length,
          unreadCount,
          readCount: bucketNotifications.length - unreadCount,
          withAttachmentsCount,
          lastNotificationDate: new Date(dates[0]).toISOString(),
          firstNotificationDate: new Date(dates[dates.length - 1]).toISOString(),
        };
      } else {
        // SQLite - use SQL aggregation
        const stats = await db.getFirstAsync(
          `SELECT 
            COUNT(*) as total_count,
            SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread_count,
            SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
            SUM(has_attachments) as with_attachments_count,
            MAX(created_at) as last_notification_date,
            MIN(created_at) as first_notification_date
           FROM notifications 
           WHERE bucket_id = ?`,
          [bucketId]
        );

        // Get bucket name from first notification
        const firstNotification = await db.getFirstAsync(
          'SELECT fragment FROM notifications WHERE bucket_id = ? LIMIT 1',
          [bucketId]
        );

        let bucketName: string | undefined;
        if (firstNotification) {
          const parsed = parseNotificationFromDB(firstNotification);
          bucketName = parsed.message.bucket.name;
        }

        return {
          bucketId,
          bucketName,
          totalCount: stats?.total_count || 0,
          unreadCount: stats?.unread_count || 0,
          readCount: stats?.read_count || 0,
          withAttachmentsCount: stats?.with_attachments_count || 0,
          lastNotificationDate: stats?.last_notification_date,
          firstNotificationDate: stats?.first_notification_date,
        };
      }
    } catch (error) {
      console.error('[getBucketStats] Error:', error);
      return {
        bucketId,
        totalCount: 0,
        unreadCount: 0,
        readCount: 0,
        withAttachmentsCount: 0,
      };
    }
  });
}

/**
 * Get overall statistics across all notifications
 */
export async function getNotificationStats(
  bucketIds?: string[]
): Promise<NotificationStats> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        // IndexedDB - fetch and calculate in memory
        const allNotifications = await db.getAll('notifications');
        const parsed = allNotifications.map(parseNotificationFromDB);

        // Filter by bucket IDs if provided
        const filtered = bucketIds && bucketIds.length > 0
          ? parsed.filter((n: NotificationFragment) => bucketIds.includes(n.message.bucket.id))
          : parsed;

        if (filtered.length === 0) {
          return {
            totalCount: 0,
            unreadCount: 0,
            readCount: 0,
            withAttachmentsCount: 0,
            byBucket: [],
          };
        }

        const unreadCount = filtered.filter((n: NotificationFragment) => !n.readAt).length;
        const withAttachmentsCount = filtered.filter(
          (n: NotificationFragment) => n.message.attachments && n.message.attachments.length > 0
        ).length;

        const dates = filtered.map((n: NotificationFragment) => new Date(n.createdAt).getTime()).sort((a: number, b: number) => b - a);

        // Group by bucket
        const bucketMap = new Map<string, NotificationFragment[]>();
        filtered.forEach((n: NotificationFragment) => {
          const bucketId = n.message.bucket.id;
          if (!bucketMap.has(bucketId)) {
            bucketMap.set(bucketId, []);
          }
          bucketMap.get(bucketId)!.push(n);
        });

        // Calculate stats per bucket
        const byBucket: BucketStats[] = Array.from(bucketMap.entries()).map(([bucketId, notifications]) => {
          const bucketUnread = notifications.filter(n => !n.readAt).length;
          const bucketWithAttachments = notifications.filter(
            n => n.message.attachments && n.message.attachments.length > 0
          ).length;
          const bucketDates = notifications.map(n => new Date(n.createdAt).getTime()).sort((a, b) => b - a);

          return {
            bucketId,
            bucketName: notifications[0]?.message.bucket.name,
            totalCount: notifications.length,
            unreadCount: bucketUnread,
            readCount: notifications.length - bucketUnread,
            withAttachmentsCount: bucketWithAttachments,
            lastNotificationDate: new Date(bucketDates[0]).toISOString(),
            firstNotificationDate: new Date(bucketDates[bucketDates.length - 1]).toISOString(),
          };
        });

        return {
          totalCount: filtered.length,
          unreadCount,
          readCount: filtered.length - unreadCount,
          withAttachmentsCount,
          byBucket,
          lastNotificationDate: dates.length > 0 ? new Date(dates[0]).toISOString() : undefined,
          firstNotificationDate: dates.length > 0 ? new Date(dates[dates.length - 1]).toISOString() : undefined,
        };
      } else {
        // SQLite - use SQL aggregation
        let whereClause = '';
        let params: any[] = [];

        if (bucketIds && bucketIds.length > 0) {
          whereClause = `WHERE bucket_id IN (${bucketIds.map(() => '?').join(',')})`;
          params = bucketIds;
        }

        // Overall stats
        const overallStats = await db.getFirstAsync(
          `SELECT 
            COUNT(*) as total_count,
            SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread_count,
            SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
            SUM(has_attachments) as with_attachments_count,
            MAX(created_at) as last_notification_date,
            MIN(created_at) as first_notification_date
           FROM notifications ${whereClause}`,
          params
        );

        // Stats by bucket
        const bucketStatsResults = await db.getAllAsync(
          `SELECT 
            bucket_id,
            COUNT(*) as total_count,
            SUM(CASE WHEN read_at IS NULL THEN 1 ELSE 0 END) as unread_count,
            SUM(CASE WHEN read_at IS NOT NULL THEN 1 ELSE 0 END) as read_count,
            SUM(has_attachments) as with_attachments_count,
            MAX(created_at) as last_notification_date,
            MIN(created_at) as first_notification_date
           FROM notifications 
           ${whereClause}
           GROUP BY bucket_id`,
          params
        );

        // Get bucket names
        const byBucket: BucketStats[] = await Promise.all(
          bucketStatsResults.map(async (stats: any) => {
            const firstNotification = await db.getFirstAsync(
              'SELECT fragment FROM notifications WHERE bucket_id = ? LIMIT 1',
              [stats.bucket_id]
            );

            let bucketName: string | undefined;
            if (firstNotification) {
              const parsed = parseNotificationFromDB(firstNotification);
              bucketName = parsed.message.bucket.name;
            }

            return {
              bucketId: stats.bucket_id,
              bucketName,
              totalCount: stats.total_count || 0,
              unreadCount: stats.unread_count || 0,
              readCount: stats.read_count || 0,
              withAttachmentsCount: stats.with_attachments_count || 0,
              lastNotificationDate: stats.last_notification_date,
              firstNotificationDate: stats.first_notification_date,
            };
          })
        );

        return {
          totalCount: overallStats?.total_count || 0,
          unreadCount: overallStats?.unread_count || 0,
          readCount: overallStats?.read_count || 0,
          withAttachmentsCount: overallStats?.with_attachments_count || 0,
          byBucket,
          lastNotificationDate: overallStats?.last_notification_date,
          firstNotificationDate: overallStats?.first_notification_date,
        };
      }
    } catch (error) {
      console.error('[getNotificationStats] Error:', error);
      return {
        totalCount: 0,
        unreadCount: 0,
        readCount: 0,
        withAttachmentsCount: 0,
        byBucket: [],
      };
    }
  });
}

/**
 * Get unread count for all buckets
 * Optimized version that only returns unread counts
 */
export async function getUnreadCountsByBucket(): Promise<Map<string, number>> {
  return await executeQuery(async (db) => {
    try {
      if (Platform.OS === 'web') {
        const allNotifications = await db.getAll('notifications');
        const parsed = allNotifications.map(parseNotificationFromDB);
        const unread = parsed.filter((n: NotificationFragment) => !n.readAt);

        const countMap = new Map<string, number>();
        unread.forEach((n: NotificationFragment) => {
          const bucketId = n.message.bucket.id;
          countMap.set(bucketId, (countMap.get(bucketId) || 0) + 1);
        });

        return countMap;
      } else {
        const results = await db.getAllAsync(
          `SELECT bucket_id, COUNT(*) as count 
           FROM notifications 
           WHERE read_at IS NULL 
           GROUP BY bucket_id`
        );

        const countMap = new Map<string, number>();
        results.forEach((row: any) => {
          countMap.set(row.bucket_id, row.count);
        });

        return countMap;
      }
    } catch (error) {
      console.error('[getUnreadCountsByBucket] Error:', error);
      return new Map();
    }
  });
}
