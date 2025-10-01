import { ApolloClient } from '@apollo/client';
import { useCallback } from 'react';
import { GetNotificationsDocument, GetNotificationsQuery, NotificationFragment, NotificationDeliveryType } from '../generated/gql-operations-generated';
import { clearPendingNavigationIntent, clearPendingNotifications, getPendingNavigationIntent, getPendingNotifications } from '../services/auth-storage';
import { Linking } from 'react-native';
import { useNavigationUtils } from '@/utils/navigation';

export function usePendingIntents() {
  const { navigateToNotificationDetail } = useNavigationUtils();

  const processPendingNotificationIntents = useCallback(async (apolloClient: ApolloClient) => {
    try {
      console.log('[PendingIntents] 📱 Processing pending notifications');

      const pendingNotifications = await getPendingNotifications();
      if (pendingNotifications.length === 0) {
        console.log('[PendingIntents] 📱 No pending notifications found');
        return;
      }

      console.log(`[PendingIntents] 📱 Found ${pendingNotifications.length} pending notifications`);
      if (pendingNotifications.length === 1) {
        console.log(JSON.stringify(pendingNotifications[0]));
      }

      // Read current cache
      let currentCache: GetNotificationsQuery | null = null;
      try {
        currentCache = apolloClient.readQuery<GetNotificationsQuery>({
          query: GetNotificationsDocument
        });
      } catch (error) {
        console.log('[PendingIntents] 📱 Cache not found, will skip pending notifications processing');
      }

      if (!currentCache) {
        console.log('[PendingIntents] 📱 No notifications cache found, skipping pending notifications');
        return;
      }

      // Convert pending notifications to NotificationFragment format
      const newNotifications: NotificationFragment[] = pendingNotifications.map((pending: any) => {
        // Create a minimal notification fragment with available data
        const notification: NotificationFragment = {
          __typename: 'Notification',
          id: pending.notificationId || `pending-${Date.now()}-${Math.random()}`,
          createdAt: pending.timestamp || new Date().toISOString(),
          updatedAt: pending.timestamp || new Date().toISOString(),
          readAt: null,
          receivedAt: pending.timestamp || new Date().toISOString(),
          sentAt: pending.timestamp || new Date().toISOString(),
          message: {
            __typename: 'Message',
            id: `message-${pending.notificationId || Date.now()}`,
            title: pending.title || '',
            body: pending.body || null,
            subtitle: pending.subtitle || null,
            sound: null,
            deliveryType: NotificationDeliveryType.Normal,
            locale: null,
            snoozes: [],
            createdAt: pending.timestamp || new Date().toISOString(),
            updatedAt: pending.timestamp || new Date().toISOString(),
            bucket: pending.bucketId ? {
              __typename: 'Bucket' as const,
              id: pending.bucketId,
              name: pending.bucketName || 'Loading...',
              description: null,
              color: null,
              icon: pending.bucketIconUrl || null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isProtected: null,
              isPublic: null
            } : {
              __typename: 'Bucket' as const,
              id: 'unknown',
              name: 'Unknown',
              description: null,
              color: null,
              icon: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isProtected: null,
              isPublic: null
            },
            actions: pending.actions ? pending.actions.map((action: any) => ({
              __typename: 'NotificationAction',
              type: action.type,
              value: action.value,
              destructive: action.destructive || false,
              icon: action.icon || '',
              title: action.title || ''
            })) : [],
            attachments: pending.attachmentData ? pending.attachmentData.map((attachment: any) => ({
              __typename: 'MessageAttachment' as const,
              url: attachment.url ?? null,
              mediaType: attachment.mediaType,
              name: attachment.name ?? null,
              attachmentUuid: null,
              saveOnServer: null,
            })) : [],
            tapAction: pending.tapAction ? {
              __typename: 'NotificationAction',
              type: pending.tapAction.type || 'OPEN_NOTIFICATION',
              value: pending.tapAction.value || '',
              destructive: false,
              icon: '',
              title: ''
            } : null
          }
        };

        return notification;
      });

      // Filter out notifications that already exist in cache
      const existingIds = new Set(currentCache.notifications?.map(n => n.id) || []);
      const uniqueNewNotifications = newNotifications.filter(n => !existingIds.has(n.id));

      if (uniqueNewNotifications.length === 0) {
        console.log('[PendingIntents] 📱 All pending notifications already exist in cache');
        await clearPendingNotifications();
        return;
      }

      console.log(`[PendingIntents] 📱 Adding ${uniqueNewNotifications.length} new notifications to cache`);

      // Update cache with new notifications (prepend to show newest first)
      const updatedNotifications = [
        ...uniqueNewNotifications,
        ...(currentCache.notifications || [])
      ];

      apolloClient.writeQuery<GetNotificationsQuery>({
        query: GetNotificationsDocument,
        data: {
          ...currentCache,
          notifications: updatedNotifications
        }
      });

      // Clear processed notifications
      await clearPendingNotifications();
      console.log('[PendingIntents] ✅ Pending notifications processed and cache updated');

    } catch (error) {
      console.error('[PendingIntents] ❌ Error processing pending notifications:', error);
    }
  }, []);

  const processPendingNavigationIntent = useCallback(async () => {
    try {
      const intent = await getPendingNavigationIntent();
      if (intent) {
        console.log(`[PendingIntents] ✅ Pending navigation intent found: ${JSON.stringify(intent)}`);
      } else {
        console.log('[PendingIntents] No Pending navigation intent found');
        return false;
      }

      // Expecting format: { type: 'NAVIGATE' | 'OPEN_NOTIFICATION', value: string }
      if (typeof intent?.value === 'string' && intent.value.length > 0) {
        if (intent.type === 'OPEN_NOTIFICATION') {
          console.log('[PendingIntents] 📂 Opening notification detail for ID:', intent.value);
          try {
            navigateToNotificationDetail(intent.value, true);
          } catch (e) {
            console.warn('[PendingIntents] ⚠️ Failed to navigate via router, falling back to deep link');
            await Linking.openURL(`zentik://notifications/${intent.value}`);
          }
        } else if (intent.type === 'NAVIGATE') {
          console.log('[PendingIntents] 🧭 Opening deep link for pending intent:', intent.value);
          await Linking.openURL(intent.value);
        } else {
          console.log('[PendingIntents] ⚠️ Unknown intent type, ignoring:', intent.type);
        }
      } else {
        console.log('[PendingIntents] ⚠️ Intent value missing or invalid', intent?.value);
      }

      await clearPendingNavigationIntent();
      console.log('[PendingIntents] 🧭 Pending navigation intent processed and cleared');
      return true;
    } catch (error) {
      console.error('[PendingIntents] ❌ Error processing pending navigation intent:', error);
      return false;
    }
  }, []);

  const processAllPending = useCallback(async (apolloClient: ApolloClient) => {
    console.log('[PendingIntents] 🔄 Processing all pending (notifications + navigation intent)');
    await processPendingNotificationIntents(apolloClient);
    await processPendingNavigationIntent();
    console.log('[PendingIntents] ✅ Completed processing all pending');
  }, [processPendingNavigationIntent, processPendingNotificationIntents]);

  return {
    processPendingNotificationIntents,
    processPendingNavigationIntent,
    processAllPending,
  };
}
