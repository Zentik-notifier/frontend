/**
 * Query keys for notification-related queries.
 * Kept in a separate file to avoid circular dependencies with useNotificationQueries.
 */
export const notificationKeys = {
  all: ["notifications"] as const,
  lists: () => [...notificationKeys.all, "list"] as const,
  list: (filters?: unknown, sort?: unknown, limit?: number) =>
    [...notificationKeys.lists(), { filters, sort, limit }] as const,
  detail: (id: string) => [...notificationKeys.all, "detail", id] as const,
  stats: () => [...notificationKeys.all, "stats"] as const,
  stat: (bucketIds?: string[]) =>
    [...notificationKeys.stats(), { bucketIds }] as const,
  bucketStat: (bucketId: string) =>
    [...notificationKeys.stats(), "bucket", bucketId] as const,
  bucketsStats: () => [...notificationKeys.all, "bucketsStats"] as const,
  allIds: (
    bucketIds?: string[],
    unreadOnly?: boolean,
    withAttachments?: boolean
  ) =>
    [
      ...notificationKeys.all,
      "allIds",
      { bucketIds, unreadOnly, withAttachments },
    ] as const,
};
