/**
 * API Service for notifications
 * Handles REST API calls to backend without GraphQL
 */

import { ApiConfigService } from '../api-config';
import { getAccessToken } from '../auth-storage';
import { NotificationFragment } from '@/generated/gql-operations-generated';
import {
  CreateNotificationInput,
  UpdateNotificationInput,
  MarkAsReadInput,
  DeleteNotificationInput,
  NotificationFilters,
  NotificationSort,
  PaginationOptions,
} from '@/types/notifications';

// ====================
// TYPE DEFINITIONS
// ====================

/**
 * API response for notifications list
 */
export interface NotificationsApiResponse {
  notifications: NotificationFragment[];
  total?: number;
}

/**
 * API response for single notification
 */
export interface NotificationApiResponse {
  notification: NotificationFragment;
}

/**
 * API error response
 */
export interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

// ====================
// HTTP CLIENT
// ====================

/**
 * Build authorization headers
 */
async function getAuthHeaders(): Promise<HeadersInit> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No authentication token found');
  }

  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

/**
 * Build API URL
 */
async function buildApiUrl(path: string): Promise<string> {
  const apiUrl = await ApiConfigService.getApiUrl();
  return `${apiUrl}${path}`;
}

/**
 * Handle API errors
 */
function handleApiError(status: number, data: any): never {
  const error: ApiError = {
    message: data?.message || 'An error occurred',
    statusCode: status,
    error: data?.error,
  };

  throw error;
}

/**
 * Generic fetch wrapper with error handling
 */
async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const url = await buildApiUrl(path);
  const headers = await getAuthHeaders();

  const response = await fetch(url, {
    ...options,
    headers: {
      ...headers,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    handleApiError(response.status, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return await response.json();
}

// ====================
// QUERY OPERATIONS
// ====================

/**
 * Build query string from filters, sort, and pagination
 */
function buildQueryString(
  filters?: NotificationFilters,
  sort?: NotificationSort,
  pagination?: PaginationOptions
): string {
  const params = new URLSearchParams();

  // Add filters
  if (filters) {
    if (filters.bucketId) {
      params.append('bucketId', filters.bucketId);
    }
    if (filters.isRead !== undefined) {
      params.append('isRead', String(filters.isRead));
    }
    if (filters.hasAttachments !== undefined) {
      params.append('hasAttachments', String(filters.hasAttachments));
    }
    if (filters.createdAfter) {
      params.append('createdAfter', new Date(filters.createdAfter).toISOString());
    }
    if (filters.createdBefore) {
      params.append('createdBefore', new Date(filters.createdBefore).toISOString());
    }
    if (filters.searchQuery) {
      params.append('search', filters.searchQuery);
    }
  }

  // Add sort
  if (sort) {
    params.append('sortBy', sort.field);
    params.append('sortOrder', sort.direction);
  }

  // Add pagination
  if (pagination) {
    if (pagination.limit) {
      params.append('limit', String(pagination.limit));
    }
    if (pagination.offset) {
      params.append('offset', String(pagination.offset));
    }
  }

  const queryString = params.toString();
  return queryString ? `?${queryString}` : '';
}

/**
 * Fetch all notifications
 * GET /api/v1/notifications
 */
export async function fetchNotifications(
  filters?: NotificationFilters,
  sort?: NotificationSort,
  pagination?: PaginationOptions
): Promise<NotificationFragment[]> {
  const queryString = buildQueryString(filters, sort, pagination);
  const data = await apiFetch<NotificationFragment[]>(`/api/v1/notifications${queryString}`);
  return data;
}

/**
 * Fetch a single notification by ID
 * GET /api/v1/notifications/:id
 */
export async function fetchNotificationById(
  notificationId: string
): Promise<NotificationFragment> {
  const data = await apiFetch<NotificationFragment>(`/api/v1/notifications/${notificationId}`);
  return data;
}

/**
 * Fetch notifications for a specific bucket
 * GET /api/v1/notifications?bucketId=xxx
 */
export async function fetchBucketNotifications(
  bucketId: string,
  sort?: NotificationSort,
  pagination?: PaginationOptions
): Promise<NotificationFragment[]> {
  const filters: NotificationFilters = { bucketId };
  return fetchNotifications(filters, sort, pagination);
}

// ====================
// MUTATION OPERATIONS
// ====================

/**
 * Create a new notification
 * POST /api/v1/messages (using messages endpoint)
 * 
 * Note: Backend uses /api/v1/messages for creating notifications
 */
export async function createNotification(
  input: CreateNotificationInput
): Promise<NotificationFragment> {
  const data = await apiFetch<NotificationFragment>('/api/v1/messages', {
    method: 'POST',
    body: JSON.stringify(input),
  });
  return data;
}

/**
 * Update a notification
 * PATCH /api/v1/notifications/:id
 * 
 * Note: Backend has limited update capabilities, mainly for read status
 */
export async function updateNotification(
  input: UpdateNotificationInput
): Promise<NotificationFragment> {
  const { id, ...updateData } = input;
  const data = await apiFetch<NotificationFragment>(`/api/v1/notifications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updateData),
  });
  return data;
}

/**
 * Mark notification as read
 * PATCH /api/v1/notifications/:id/read
 */
export async function markNotificationAsRead(
  notificationId: string
): Promise<NotificationFragment> {
  const data = await apiFetch<NotificationFragment>(
    `/api/v1/notifications/${notificationId}/read`,
    {
      method: 'PATCH',
    }
  );
  return data;
}

/**
 * Mark notification as unread
 * PATCH /api/v1/notifications/:id/unread
 */
export async function markNotificationAsUnread(
  notificationId: string
): Promise<NotificationFragment> {
  const data = await apiFetch<NotificationFragment>(
    `/api/v1/notifications/${notificationId}/unread`,
    {
      method: 'PATCH',
    }
  );
  return data;
}

/**
 * Mark multiple notifications as read/unread
 * This is a batch operation that calls individual endpoints
 */
export async function markNotificationsAsRead(
  input: MarkAsReadInput
): Promise<NotificationFragment[]> {
  const { notificationIds, readAt } = input;

  // Execute in parallel for better performance
  const promises = notificationIds.map(async (id) => {
    if (readAt === null) {
      return markNotificationAsUnread(id);
    } else {
      return markNotificationAsRead(id);
    }
  });

  return Promise.all(promises);
}

/**
 * Mark all notifications as read
 * PATCH /api/v1/notifications/mark-all-read
 */
export async function markAllNotificationsAsRead(): Promise<void> {
  await apiFetch<void>('/api/v1/notifications/mark-all-read', {
    method: 'PATCH',
  });
}

/**
 * Delete a notification
 * DELETE /api/v1/notifications/:id
 */
export async function deleteNotification(
  notificationId: string
): Promise<void> {
  await apiFetch<void>(`/api/v1/notifications/${notificationId}`, {
    method: 'DELETE',
  });
}

/**
 * Delete multiple notifications
 * This is a batch operation that calls individual endpoints
 */
export async function deleteNotifications(
  input: DeleteNotificationInput
): Promise<void> {
  const { notificationIds } = input;

  // Execute in parallel for better performance
  const promises = notificationIds.map((id) => deleteNotification(id));
  await Promise.all(promises);
}

// ====================
// STATISTICS OPERATIONS
// ====================

/**
 * Fetch notification statistics
 * Note: If backend doesn't provide a stats endpoint, we'll need to
 * calculate statistics from the notifications list or use local DB
 */
export async function fetchNotificationStats(): Promise<{
  totalCount: number;
  unreadCount: number;
  readCount: number;
}> {
  // Fetch all notifications to calculate stats
  // In production, backend should provide a dedicated stats endpoint
  const notifications = await fetchNotifications();

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.readAt).length;
  const readCount = totalCount - unreadCount;

  return {
    totalCount,
    unreadCount,
    readCount,
  };
}

/**
 * Fetch bucket-specific statistics
 */
export async function fetchBucketStats(bucketId: string): Promise<{
  totalCount: number;
  unreadCount: number;
  readCount: number;
}> {
  // Fetch bucket notifications to calculate stats
  const notifications = await fetchBucketNotifications(bucketId);

  const totalCount = notifications.length;
  const unreadCount = notifications.filter(n => !n.readAt).length;
  const readCount = totalCount - unreadCount;

  return {
    totalCount,
    unreadCount,
    readCount,
  };
}

// ====================
// REALTIME OPERATIONS
// ====================

/**
 * Subscribe to notification updates via WebSocket/SSE
 * This is a placeholder - implement based on backend's realtime capabilities
 */
export function subscribeToNotificationUpdates(
  callback: (notification: NotificationFragment) => void
): () => void {
  // TODO: Implement WebSocket/SSE subscription
  // For now, return a no-op unsubscribe function
  console.warn('[subscribeToNotificationUpdates] Not implemented yet');
  return () => {
    // Unsubscribe logic
  };
}

/**
 * Test API connection
 */
export async function testApiConnection(): Promise<boolean> {
  try {
    const url = await buildApiUrl('/api/v1/health');
    const response = await fetch(url);
    return response.ok;
  } catch (error) {
    console.error('[testApiConnection] Error:', error);
    return false;
  }
}
