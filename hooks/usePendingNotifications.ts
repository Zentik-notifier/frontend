import { useApolloClient } from '@apollo/client';
import { useCallback, useEffect } from 'react';
import { GetNotificationsDocument, GetNotificationsQuery, NotificationFragment, NotificationDeliveryType } from '../generated/gql-operations-generated';
import { clearPendingNotifications, getPendingNotifications } from '../services/auth-storage';

export function usePendingNotifications() {
  const apolloClient = useApolloClient();

  const processPendingNotifications = useCallback(async () => {
    try {
      console.log('📱 Processing pending notifications from NSE...');
      
      const pendingNotifications = await getPendingNotifications();
      if (pendingNotifications.length === 0) {
        console.log('📱 No pending notifications found');
        return;
      }

      console.log(`📱 Found ${pendingNotifications.length} pending notifications`);

      // Read current cache
      let currentCache: GetNotificationsQuery | null = null;
      try {
        currentCache = apolloClient.readQuery<GetNotificationsQuery>({
          query: GetNotificationsDocument
        });
      } catch (error) {
        console.log('📱 Cache not found, will skip pending notifications processing');
      }

      if (!currentCache) {
        console.log('📱 No notifications cache found, skipping pending notifications');
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
          userId: 'unknown',
          userDeviceId: null,
          userDevice: null,
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
              name: 'Loading...',
              description: null,
              color: null,
              icon: null,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              isSnoozed: false,
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
              isSnoozed: false,
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
              __typename: 'NotificationAttachment',
              id: `attachment-${Date.now()}-${Math.random()}`,
              url: attachment.url || '',
              mediaType: attachment.mediaType || 'IMAGE',
              fileName: attachment.fileName || null
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
        console.log('📱 All pending notifications already exist in cache');
        await clearPendingNotifications();
        return;
      }

      console.log(`📱 Adding ${uniqueNewNotifications.length} new notifications to cache`);

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
      console.log('✅ Pending notifications processed and cache updated');

    } catch (error) {
      console.error('❌ Error processing pending notifications:', error);
    }
  }, [apolloClient]);

  useEffect(() => {
    // Process pending notifications only at app startup (from killed state)
    console.log('📱 App startup - checking for pending notifications from NSE...');
    processPendingNotifications();
  }, [processPendingNotifications]);

  return {
    processPendingNotifications
  };
}
