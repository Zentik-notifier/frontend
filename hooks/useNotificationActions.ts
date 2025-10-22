import { UpdateUserDeviceInput, getSdk } from '@/generated/gql-operations-generated';
import { graphqlClient } from '@/services/graphql-client';
import { settingsService } from '@/services/settings-service';
import { useNavigationUtils } from '@/utils/navigation';
import * as Notifications from 'expo-notifications';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  NotificationActionFragment,
  NotificationActionType,
  UpdateDeviceTokenDto,
} from '../generated/gql-operations-generated';
import { useI18n } from './useI18n';
import { useCleanup } from './useCleanup';
import { setBadgeCount } from '@/utils/badgeUtils';
import {
  useMarkAsRead as useMarkAsReadRQ,
  useDeleteNotification as useDeleteNotificationRQ,
} from '@/hooks/notifications/useNotificationMutations';
import {
  refreshNotificationQueries,
} from '@/hooks/notifications/useNotificationQueries';
import { useQueryClient } from '@tanstack/react-query';/**
 * Hook that provides callbacks for handling notification actions
 * Centralizes all action logic with access to GraphQL and API
 */
export function useNotificationActions() {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const sdk = getSdk(graphqlClient);
  const { navigateToNotificationDetail, navigateToHome } = useNavigationUtils();
  const { cleanup } = useCleanup();

  // React Query mutations
  const deleteNotificationMutation = useDeleteNotificationRQ();
  const markAsReadMutation = useMarkAsReadRQ();

  const deleteNotification = useCallback(async (notificationId: string) => {
    await deleteNotificationMutation.mutateAsync(notificationId);
  }, [deleteNotificationMutation]);

  const markAsRead = useCallback(async (notificationId: string) => {
    await markAsReadMutation.mutateAsync(notificationId);
  }, [markAsReadMutation]);

  const onNavigate = useCallback(async (destination: string) => {
    console.log('[useNotificationActions] Navigating to:', destination);

    // Clear any pending navigation intent to avoid conflicts
    try {
      await settingsService.clearPendingNavigationIntent();
      console.log('[useNotificationActions] Cleared pending navigation intent');
    } catch (error) {
      console.warn('[useNotificationActions] Failed to clear pending navigation intent:', error);
    }

    try {
      if (destination.startsWith('http')) {
        Linking.openURL(destination);
      } else {
        console.log('[useNotificationActions] Navigating not supported:', destination);
      }
    } catch (error) {
      console.error('[useNotificationActions] Navigation failed:', error);
      Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
    }
  }, [t]);

  const onWebhook = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('[useNotificationActions] Executing webhook:', JSON.stringify(action));

    try {
      // The action.value contains the webhook ID, load the webhook entity
      const webhookId = action.value;

      if (!webhookId) {
        throw new Error(t('webhooks.form.noWebhookId'));
      }

      console.log('[useNotificationActions] Executing webhook via backend endpoint:', webhookId);

      // Execute the webhook using the new backend endpoint
      const response = await sdk.ExecuteWebhook({ id: webhookId });

      if (response.executeWebhook) {
        console.log('[useNotificationActions] Webhook executed successfully via backend');
        // Show success feedback to user
        Alert.alert(t('common.success'), t('webhooks.form.webhookSuccess', { name: webhookId }));
      } else {
        throw new Error('Webhook execution returned false');
      }
    } catch (error) {
      console.error('[useNotificationActions] Failed to execute webhook:', error);
      Alert.alert(t('webhooks.form.webhookError'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [sdk, t]);

  const onBackgroundCall = useCallback(async (action: NotificationActionFragment) => {
    console.log('[useNotificationActions] Executing background call:', JSON.stringify(action));

    try {
      // Parse method and URL from action value (format: "METHOD:URL")
      const [method, url] = action.value?.split('::') || [];

      if (!url) {
        throw new Error('Invalid background call format. Expected METHOD:URL');
      }

      const response = await fetch(url, {
        method: method || 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      console.log('[useNotificationActions] Background call executed successfully');
    } catch (error) {
      console.error('[useNotificationActions] Failed to execute background call:', error);
      Alert.alert(t('common.actionError'), t('common.actionFailed'));
    }
  }, [t]);

  const onMarkAsRead = useCallback(async (notificationId: string) => {
    console.log('[useNotificationActions] Marking notification as read:', notificationId);

    try {
      if (notificationId) {
        // Use GraphQL mutation to mark as read
        await markAsRead(notificationId);
        console.log('[useNotificationActions] Notification marked as read successfully');
      } else {
        console.log('[useNotificationActions] No notification ID available, showing fallback message');
      }
    } catch (error) {
      console.error('[useNotificationActions] Failed to mark notification as read:', error);
      Alert.alert(t('common.error'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [markAsRead, t]);

  const onDelete = useCallback(async (notificationId: string) => {
    console.log('[useNotificationActions] Deleting notification:', notificationId);

    try {
      if (notificationId) {
        await deleteNotification(notificationId);
        console.log('[useNotificationActions] Notification deleted successfully');
      } else {
        console.log('[useNotificationActions] No notification ID available, cannot delete notification');
        Alert.alert(t('common.info'), t('webhooks.form.webhookExecutionFailed'));
      }
    } catch (error) {
      console.error('[useNotificationActions] Failed to delete notification:', error);
      Alert.alert(t('common.error'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [deleteNotification, t]);

  const onSnooze = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('[useNotificationActions] Snoozing notification for:', action.value);

    try {
      // Get the notification to extract bucket ID
      const notificationResponse = await sdk.GetNotification({ id: notificationId });

      const notification = notificationResponse.notification;
      if (!notification) {
        throw new Error('Notification not found');
      }

      const bucketId = notification.message.bucket.id;

      // Parse snooze duration from action value (e.g., "5", "30")
      if (action.value && /^\d+$/.test(action.value)) {
        const minutes = parseInt(action.value, 10);
        console.log(`[useNotificationActions] Snoozing bucket ${bucketId} for ${minutes} minutes`);

        // Use the new endpoint to snooze the bucket
        await sdk.SetBucketSnoozeMinutes({
          bucketId: bucketId,
          input: { minutes: minutes }
        });

        console.log('[useNotificationActions] Bucket snoozed successfully');
        Alert.alert(t('common.success'), t('common.snoozeMessage', { minutes: minutes.toString() }));
      } else {
        console.warn('[useNotificationActions] Invalid snooze format (expected number):', action.value);
        Alert.alert(t('common.error'), 'Invalid snooze format');
      }
    } catch (error) {
      console.error('[useNotificationActions] Failed to snooze bucket:', error);
      Alert.alert(t('common.error'), 'Failed to snooze notification');
    }
  }, [sdk, t]);

  const onOpenNotification = useCallback(async (action: NotificationActionFragment) => {
    console.log('[useNotificationActions] Opening notification:', JSON.stringify(action));

    // Clear any pending navigation intent to avoid conflicts
    try {
      await settingsService.clearPendingNavigationIntent();
      console.log('[useNotificationActions] Cleared pending navigation intent');
    } catch (error) {
      console.warn('[useNotificationActions] Failed to clear pending navigation intent:', error);
    }

    try {
      // Navigate to notifications list or specific notification
      if (action.value && action.value.trim() !== '') {
        console.log('[useNotificationActions] Navigating to notification detail:', action.value);
        navigateToNotificationDetail(action.value);
      } else {
        console.log('[useNotificationActions] Navigating to home (no notification ID)');
        navigateToHome();
      }
    } catch (error) {
      console.error('[useNotificationActions] Navigation failed:', error);
      Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
    }
  }, [t]);

  const executeAction = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('[useNotificationActions] Executing action:', action.type, 'for notification:', notificationId);
    console.log('[useNotificationActions] Action details:', JSON.stringify(action));

    switch (action.type) {
      case NotificationActionType.Navigate:
        console.log('[useNotificationActions] Navigate action');
        if (action.value) {
          onNavigate(action.value);
        }
        break;
      case NotificationActionType.Webhook:
        console.log('[useNotificationActions] Webhook action');
        await onWebhook(notificationId, action);
        break;
      case NotificationActionType.BackgroundCall:
        console.log('[useNotificationActions] Background call action');
        await onBackgroundCall(action);
        break;
      case NotificationActionType.MarkAsRead:
        console.log('[useNotificationActions] Mark as read action');
        await onMarkAsRead(notificationId);
        break;
      case NotificationActionType.Delete:
        console.log('[useNotificationActions] Delete action');
        await onDelete(notificationId);
        break;
      case NotificationActionType.Snooze:
        console.log('[useNotificationActions] Snooze action');
        await onSnooze(notificationId, action);
        break;
      case NotificationActionType.OpenNotification:
        console.log('[useNotificationActions] Open notification action');
        onOpenNotification(action);
        break;
      default:
        console.warn('[useNotificationActions] Unknown action type:', action.type);
    }
  }, [onNavigate, onWebhook, onBackgroundCall, onMarkAsRead, onDelete, onSnooze, onOpenNotification, t]);

  const refreshPushToken = useCallback(async (updateTokenDto: UpdateDeviceTokenDto) => {
    await sdk.UpdateDeviceToken({
      input: updateTokenDto
    });
  }, [sdk]);

  const useUpdateUserDevice = useCallback(async (userDevice: UpdateUserDeviceInput) => {
    await sdk.UpdateUserDevice({
      input: userDevice
    });
  }, [sdk]);

  const pushNotificationReceived = useCallback(async (notificationId: string) => {
    try {
      // Report to server that notification was received
      try {
        await sdk.DeviceReportNotificationReceived({ id: notificationId });
      } catch (error) {
        console.warn('[useNotificationActions] Failed to report notification received:', error);
      }

      try {
        console.log('[useNotificationActions] Processing notification:', notificationId);

        // Notification is already saved in DB by push notification system
        // Just invalidate React Query cache to refresh all lists
        await refreshNotificationQueries(queryClient);

        const currentCount = await Notifications.getBadgeCountAsync();
        await setBadgeCount(currentCount + 1);
      } catch (e) {
        console.warn('[useNotificationActions] Failed to handle push notification:', e);
      }
    } catch (error) {
      console.error('[useNotificationActions] pushNotificationReceived error', error);
    }
  }, [queryClient, sdk]);

  return {
    onNavigate,
    onWebhook,
    onBackgroundCall,
    onMarkAsRead,
    onDelete,
    onSnooze,
    onOpenNotification,
    executeAction,
    refreshPushToken,
    pushNotificationReceived,
    useUpdateUserDevice,
    cleanup,
  };
}

export type NotificationActionCallbacks = ReturnType<typeof useNotificationActions>;