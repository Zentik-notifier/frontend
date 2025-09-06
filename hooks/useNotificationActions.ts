import { UpdateUserDeviceInput, useUpdateUserDeviceMutation } from '@/generated/gql-operations-generated';
import { clearPendingNavigationIntent, getStoredDeviceToken } from '@/services/auth-storage';
import { mediaCache } from '@/services/media-cache';
import { useApolloClient } from '@apollo/client';
import * as Notifications from 'expo-notifications';
import { router } from 'expo-router';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  NotificationActionFragment,
  NotificationActionType,
  UpdateDeviceTokenDto,
  useDeviceReportNotificationReceivedMutation,
  useGetNotificationLazyQuery,
  useGetWebhookLazyQuery,
  useUpdateDeviceTokenMutation
} from '../generated/gql-operations-generated';
import { useI18n } from './useI18n';
import { useDeleteNotification, useFetchNotifications, useMarkNotificationRead } from './useNotifications';

/**
 * Hook that provides callbacks for handling notification actions
 * Centralizes all action logic with access to GraphQL and API
 */
export function useNotificationActions() {
  const { t } = useI18n();
  const apolloClient = useApolloClient();
  const deleteNotificationFn = useDeleteNotification();
  const markAsReadFn = useMarkNotificationRead();
  const [getWebhook] = useGetWebhookLazyQuery();
  const [getNotification] = useGetNotificationLazyQuery();
  const [deviceReportReceived] = useDeviceReportNotificationReceivedMutation();
  const [updateDeviceToken] = useUpdateDeviceTokenMutation();
  const [updateUserDeviceMutation] = useUpdateUserDeviceMutation();
  const { fetchNotifications } = useFetchNotifications();

  const deleteNotification = useCallback(async (notificationId: string) => {
    const deviceToken = await getStoredDeviceToken();
    deleteNotificationFn(notificationId);
  }, [deleteNotificationFn]);

  const markAsRead = useCallback(async (notificationId: string) => {
    markAsReadFn(notificationId,);
  }, [markAsReadFn]);

  const onNavigate = useCallback(async (destination: string) => {
    console.log('🧭 Navigating to:', destination);

    // Clear any pending navigation intent to avoid conflicts
    try {
      await clearPendingNavigationIntent();
      console.log('📱 Cleared pending navigation intent');
    } catch (error) {
      console.warn('⚠️ Failed to clear pending navigation intent:', error);
    }

    try {
      if (destination.startsWith('/')) {
        // Internal route - wait for router to be ready
        const routerReady = await waitForRouter();
        if (!routerReady) {
          console.error('❌ Router not ready for internal navigation');
          Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
          return;
        }
        router.push(destination as any);
      } else if (destination.startsWith('http')) {
        // External URL
        Linking.openURL(destination);
      } else {
        // Assume internal route, add leading slash
        const routerReady = await waitForRouter();
        if (!routerReady) {
          console.error('❌ Router not ready for internal navigation');
          Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
          return;
        }
        router.push(`/${destination}` as any);
      }
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
    }
  }, [t]);

  const onWebhook = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('🪝 Executing webhook:', JSON.stringify(action));

    try {
      // The action.value contains the webhook ID, load the webhook entity
      const webhookId = action.value;

      if (!webhookId) {
        throw new Error(t('webhooks.form.noWebhookId'));
      }

      // Load the webhook entity using GraphQL
      const webhookResponse = await getWebhook({
        variables: { id: webhookId }
      });

      const webhook = webhookResponse.data?.webhook;

      if (!webhook) {
        throw new Error(t('webhooks.form.webhookNotFound'));
      }

      console.log('📡 Loaded webhook entity:', webhook);

      // Build the request payload with notification context
      let payload: any = {
        notificationId,
        actionType: action.type,
        actionValue: action.value,
        timestamp: new Date().toISOString(),
        webhookId: webhook.id,
        webhookName: webhook.name,
      };

      // Merge webhook body if provided
      if (webhook.body && typeof webhook.body === 'object') {
        payload = {
          ...webhook.body,
          ...payload,
        };
      }

      // Convert webhook headers array to headers object
      const customHeaders: Record<string, string> = {};
      if (webhook.headers && Array.isArray(webhook.headers)) {
        webhook.headers.forEach((header: any) => {
          customHeaders[header.key] = header.value;
        });
      }

      console.log('📤 Final webhook payload:', payload);

      // Execute the webhook using the entity's URL and method
      const response = await fetch(webhook.url, {
        method: webhook.method,
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Zentik-Mobile/1.0',
          ...customHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const responseData = await response.text();
      console.log('✅ Webhook executed successfully:', {
        webhookName: webhook.name,
        url: webhook.url,
        method: webhook.method,
        status: response.status,
        statusText: response.statusText,
        response: responseData
      });

      // Show success feedback to user
      Alert.alert(t('common.success'), t('webhooks.form.webhookSuccess', { name: webhook.name }));
    } catch (error) {
      console.error('❌ Failed to execute webhook:', error);
      Alert.alert(t('webhooks.form.webhookError'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [getWebhook, t]);

  const onBackgroundCall = useCallback(async (action: NotificationActionFragment) => {
    console.log('📞 Executing background call:', JSON.stringify(action));

    try {
      // Parse method and URL from action value (format: "METHOD:URL")
      const [method, url] = action.value.split('::');

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

      console.log('✅ Background call executed successfully');
    } catch (error) {
      console.error('❌ Failed to execute background call:', error);
      Alert.alert(t('common.actionError'), t('common.actionFailed'));
    }
  }, [t]);

  const onMarkAsRead = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('✅ Marking notification as read:', JSON.stringify(action));

    try {
      if (notificationId) {
        // Use GraphQL mutation to mark as read
        await markAsRead(notificationId);
        console.log('✅ Notification marked as read successfully');
      } else {
        console.log('⚠️ No notification ID available, showing fallback message');
      }
    } catch (error) {
      console.error('❌ Failed to mark notification as read:', error);
      Alert.alert(t('common.error'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [markAsRead, t]);

  const onDelete = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('🗑️ Deleting notification:', JSON.stringify(action));

    try {
      if (notificationId) {
        await deleteNotification(notificationId);
        console.log('✅ Notification deleted successfully');
      } else {
        console.log('⚠️ No notification ID available, cannot delete notification');
        Alert.alert(t('common.info'), t('webhooks.form.webhookExecutionFailed'));
      }
    } catch (error) {
      console.error('❌ Failed to delete notification:', error);
      Alert.alert(t('common.error'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [deleteNotification, t]);

  const onSnooze = useCallback((action: NotificationActionFragment) => {
    console.log('⏰ Snoozing notification for:', action.value);

    // Parse snooze duration from action value (e.g., "snooze_5", "snooze_30")
    const match = action.value.match(/snooze_(\d+)/);
    if (match) {
      const minutes = parseInt(match[1], 10);
      console.log(`⏰ Snoozing notification for ${minutes} minutes`);
      Alert.alert(t('common.snooze'), t('common.snoozeMessage', { minutes: minutes.toString() }));
    } else {
      console.warn('⚠️ Invalid snooze format:', action.value);
      Alert.alert(t('common.snooze'), t('common.snoozeGeneric'));
    }
  }, [t]);

  // Helper function to wait for router to be ready
  const waitForRouter = async (maxAttempts = 10): Promise<boolean> => {
    for (let i = 0; i < maxAttempts; i++) {
      try {
        // Test if router is ready by checking if we can access current route
        if (router && typeof router.push === 'function') {
          console.log(`🧭 Router ready after ${i} attempts`);
          return true;
        }
      } catch (error) {
        console.log(`🧭 Router not ready, attempt ${i + 1}/${maxAttempts}`);
      }

      // Wait 100ms before next attempt
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    console.warn('🧭 Router not ready after maximum attempts');
    return false;
  };

  const onOpenNotification = useCallback(async (action: NotificationActionFragment) => {
    console.log('📂 Opening notification:', JSON.stringify(action));

    // Clear any pending navigation intent to avoid conflicts
    try {
      await clearPendingNavigationIntent();
      console.log('📱 Cleared pending navigation intent');
    } catch (error) {
      console.warn('⚠️ Failed to clear pending navigation intent:', error);
    }

    // Wait for router to be ready (important when app starts from killed state)
    const routerReady = await waitForRouter();
    if (!routerReady) {
      console.error('❌ Router not ready, cannot navigate');
      Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
      return;
    }

    try {
      // Navigate to notifications list or specific notification
      if (action.value && action.value.trim() !== '') {
        console.log('🧭 Navigating to notification detail:', action.value);
        const route = `/(mobile)/private/notification-detail?id=${encodeURIComponent(action.value)}` as any;
        console.log('🧭 Route:', route);
        router.push(route);
      } else {
        console.log('🧭 Navigating to home (no notification ID)');
        router.push('/(mobile)/private/home');
      }
    } catch (error) {
      console.error('❌ Navigation failed:', error);
      Alert.alert(t('common.navigationError'), t('common.navigationFailed'));
    }
  }, [t]);

  const executeAction = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('🎬 Executing action:', action.type, 'for notification:', notificationId);
    console.log('🎬 Action details:', JSON.stringify(action));

    switch (action.type) {
      case NotificationActionType.Navigate:
        console.log('🧭 Navigate action');
        onNavigate(action.value);
        break;
      case NotificationActionType.Webhook:
        console.log('🪝 Webhook action');
        await onWebhook(notificationId, action);
        break;
      case NotificationActionType.BackgroundCall:
        console.log('📞 Background call action');
        await onBackgroundCall(action);
        break;
      case NotificationActionType.MarkAsRead:
        console.log('✅ Mark as read action');
        await onMarkAsRead(notificationId, action);
        break;
      case NotificationActionType.Delete:
        console.log('🗑️ Delete action');
        await onDelete(notificationId, action);
        break;
      case NotificationActionType.Snooze:
        console.log('⏰ Snooze action');
        onSnooze(action);
        break;
      case NotificationActionType.OpenNotification:
        console.log('📂 Open notification action');
        onOpenNotification(action);
        break;
      default:
        console.warn('❌ Unknown action type:', action.type);
    }
  }, [onNavigate, onWebhook, onBackgroundCall, onMarkAsRead, onDelete, onSnooze, onOpenNotification, t]);

  const refreshPushToken = useCallback(async (updateTokenDto: UpdateDeviceTokenDto) => {
    await updateDeviceToken({
      variables: {
        input: updateTokenDto
      }
    });
  }, [updateDeviceToken]);

  const useUpdateUserDevice = useCallback(async (userDevice: UpdateUserDeviceInput) => {
    await updateUserDeviceMutation({
      variables: {
        input: userDevice
      }
    });
  }, [updateDeviceToken]);

  const pushNotificationReceived = useCallback(async (notificationId: string) => {
    try {
      await deviceReportReceived({ variables: { id: notificationId } });
      const res = await getNotification({ variables: { id: notificationId }, fetchPolicy: 'network-only' });
      const notif = res.data?.notification;
      try {
        await fetchNotifications();

        const currentCount = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(currentCount + 1);
      } catch (e) {
        console.warn('⚠️ Failed to refetch notifications list after push receipt:', e);
      }
      if (notif?.message?.attachments && notif.message.attachments.length > 0) {
        await mediaCache.reloadMetadata();
        const notificationDate = notif.createdAt ? new Date(notif.createdAt).getTime() : undefined;
        for (const att of notif.message.attachments) {
          if (att?.url && att?.mediaType) {
            await mediaCache.downloadMedia({
              url: att.url,
              mediaType: att.mediaType,
              notificationDate,
            });
          }
        }
      }
    } catch (error) {
      console.error('pushNotificationReceived error', error);
    }
  }, [getNotification, deviceReportReceived, apolloClient]);

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
    fetchNotifications,
  };
}

export type NotificationActionCallbacks = ReturnType<typeof useNotificationActions>;