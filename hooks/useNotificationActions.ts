import { UpdateUserDeviceInput, useUpdateUserDeviceMutation } from '@/generated/gql-operations-generated';
import { clearPendingNavigationIntent } from '@/services/auth-storage';
import { mediaCache } from '@/services/media-cache';
import { useNavigationUtils } from '@/utils/navigation';
import * as Notifications from 'expo-notifications';
import { useCallback } from 'react';
import { Alert, Linking } from 'react-native';
import {
  NotificationActionFragment,
  NotificationActionType,
  UpdateDeviceTokenDto,
  useDeviceReportNotificationReceivedMutation,
  useExecuteWebhookMutation,
  useGetNotificationLazyQuery,
  useSetBucketSnoozeMinutesMutation,
  useUpdateDeviceTokenMutation
} from '../generated/gql-operations-generated';
import { useI18n } from './useI18n';
import { useDeleteNotification, useFetchNotifications, useMarkNotificationRead } from './useNotifications';
import { usePendingIntents } from './usePendingNotifications';
import { useApolloClient } from '@apollo/client';

/**
 * Hook that provides callbacks for handling notification actions
 * Centralizes all action logic with access to GraphQL and API
 */
export function useNotificationActions() {
  const { t } = useI18n();
  const deleteNotificationFn = useDeleteNotification();
  const markAsReadFn = useMarkNotificationRead();
  const [getNotification] = useGetNotificationLazyQuery();
  const [executeWebhook] = useExecuteWebhookMutation();
  const [setBucketSnoozeMinutes] = useSetBucketSnoozeMinutesMutation();
  const [deviceReportReceived] = useDeviceReportNotificationReceivedMutation();
  const [updateDeviceToken] = useUpdateDeviceTokenMutation();
  const [updateUserDeviceMutation] = useUpdateUserDeviceMutation();
  const { fetchNotifications } = useFetchNotifications(true);
  const { navigateToNotificationDetail, navigateToHome } = useNavigationUtils();
  const { processPendingNotificationIntents } = usePendingIntents();
  const apolloClient = useApolloClient();

  const deleteNotification = useCallback(async (notificationId: string) => {
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
      if (destination.startsWith('http')) {
        Linking.openURL(destination);
      } else {
        console.log('🧭 Navigating not supported:', destination);
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

      console.log('📡 Executing webhook via backend endpoint:', webhookId);

      // Execute the webhook using the new backend endpoint
      const response = await executeWebhook({
        variables: { id: webhookId }
      });

      if (response.data?.executeWebhook) {
        console.log('✅ Webhook executed successfully via backend');
        // Show success feedback to user
        Alert.alert(t('common.success'), t('webhooks.form.webhookSuccess', { name: webhookId }));
      } else {
        throw new Error('Webhook execution returned false');
      }
    } catch (error) {
      console.error('❌ Failed to execute webhook:', error);
      Alert.alert(t('webhooks.form.webhookError'), t('webhooks.form.webhookExecutionFailed'));
    }
  }, [executeWebhook, t]);

  const onBackgroundCall = useCallback(async (action: NotificationActionFragment) => {
    console.log('📞 Executing background call:', JSON.stringify(action));

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

      console.log('✅ Background call executed successfully');
    } catch (error) {
      console.error('❌ Failed to execute background call:', error);
      Alert.alert(t('common.actionError'), t('common.actionFailed'));
    }
  }, [t]);

  const onMarkAsRead = useCallback(async (notificationId: string, action?: NotificationActionFragment) => {
    console.log('✅ Marking notification as read:', JSON.stringify(action ?? {}));

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

  const onDelete = useCallback(async (notificationId: string, action?: NotificationActionFragment) => {
    console.log('🗑️ Deleting notification:', JSON.stringify(action ?? {}));

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

  const onSnooze = useCallback(async (notificationId: string, action: NotificationActionFragment) => {
    console.log('⏰ Snoozing notification for:', action.value);

    try {
      // Get the notification to extract bucket ID
      const notificationResponse = await getNotification({
        variables: { id: notificationId }
      });

      const notification = notificationResponse.data?.notification;
      if (!notification) {
        throw new Error('Notification not found');
      }

      const bucketId = notification.message.bucket.id;

      // Parse snooze duration from action value (e.g., "5", "30")
      if (action.value && /^\d+$/.test(action.value)) {
        const minutes = parseInt(action.value, 10);
        console.log(`⏰ Snoozing bucket ${bucketId} for ${minutes} minutes`);

        // Use the new endpoint to snooze the bucket
        await setBucketSnoozeMinutes({
          variables: {
            bucketId: bucketId,
            input: { minutes: minutes }
          }
        });

        console.log('✅ Bucket snoozed successfully');
        Alert.alert(t('common.success'), t('common.snoozeMessage', { minutes: minutes.toString() }));
      } else {
        console.warn('⚠️ Invalid snooze format (expected number):', action.value);
        Alert.alert(t('common.error'), 'Invalid snooze format');
      }
    } catch (error) {
      console.error('❌ Failed to snooze bucket:', error);
      Alert.alert(t('common.error'), 'Failed to snooze notification');
    }
  }, [getNotification, setBucketSnoozeMinutes, t]);

  const onOpenNotification = useCallback(async (action: NotificationActionFragment) => {
    console.log('📂 Opening notification:', JSON.stringify(action));

    // Clear any pending navigation intent to avoid conflicts
    try {
      await clearPendingNavigationIntent();
      console.log('📱 Cleared pending navigation intent');
    } catch (error) {
      console.warn('⚠️ Failed to clear pending navigation intent:', error);
    }

    try {
      // Navigate to notifications list or specific notification
      if (action.value && action.value.trim() !== '') {
        console.log('🧭 Navigating to notification detail:', action.value);
        navigateToNotificationDetail(action.value);
      } else {
        console.log('🧭 Navigating to home (no notification ID)');
        navigateToHome();
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
        if (action.value) {
          onNavigate(action.value);
        }
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
        await onSnooze(notificationId, action);
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
      try {
        await deviceReportReceived({ variables: { id: notificationId } });
      } catch {
      }

      try {
        await processPendingNotificationIntents(apolloClient);
        await fetchNotifications();

        const currentCount = await Notifications.getBadgeCountAsync();
        await Notifications.setBadgeCountAsync(currentCount + 1);
      } catch (e) {
        console.warn('⚠️ Failed to refetch notifications list after push receipt:', e);
      }

      // const res = await getNotification({ variables: { id: notificationId }, fetchPolicy: 'network-only' });
      // const notif = res.data?.notification;
      // if (notif?.message?.attachments && notif.message.attachments.length > 0) {
      //   await mediaCache.reloadMetadata();
      //   const notificationDate = notif.createdAt ? new Date(notif.createdAt).getTime() : undefined;
      //   for (const att of notif.message.attachments) {
      //     if (att?.url && att?.mediaType) {
      //       console.log(`[NotificationActions] Downloading ${JSON.stringify(att)}`);
      //       await mediaCache.downloadMedia({
      //         url: att.url,
      //         mediaType: att.mediaType,
      //         notificationDate,
      //       });
      //     }
      //   }
      // }
    } catch (error) {
      console.error('pushNotificationReceived error', error);
    }
  }, [getNotification, deviceReportReceived]);

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