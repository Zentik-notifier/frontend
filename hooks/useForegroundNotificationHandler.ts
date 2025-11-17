import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useNotificationToast } from '../contexts/NotificationToastContext';
import { useRouter } from 'expo-router';
import { NotificationDeliveryType } from '@/generated/gql-operations-generated';

/**
 * Hook che ascolta le notifiche push ricevute quando l'app è in foreground
 * e le mostra usando il toast IncomingNotificationToast
 */
export function useForegroundNotificationHandler() {
  const { showNotification } = useNotificationToast();
  const router = useRouter();

  useEffect(() => {
    // Listener per notifiche ricevute quando l'app è aperta (foreground)
    const subscription = Notifications.addNotificationReceivedListener(
      (notification) => {
        const { title, body, data } = notification.request.content;

        showNotification({
          title: title || 'Nuova notifica',
          body: body || '',
          imageUrl: data?.imageUrl as string | undefined,
          icon: (data?.icon as string) || 'bell-ring',
          bucketColor: data?.bucketColor as string | undefined,
          deliveryType: data?.deliveryType as NotificationDeliveryType | undefined,
          onPress: () => {
            if (data?.route) {
              router.push(data.route as any);
            } else if (data?.notificationId) {
              router.push(`/notification/${data.notificationId}` as any);
            }
          },
          duration: data?.duration ? Number(data.duration) : 5000,
        });
      }
    );

    return () => {
      subscription.remove();
    };
  }, [showNotification, router]);
}
