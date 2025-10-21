import { apolloClient, subscriptionsEnabledVar } from '@/config/apollo-client';
import { GetNotificationsDocument, NotificationCreatedDocument, NotificationFragment } from '@/generated/gql-operations-generated';
import { NotificationActionCallbacks } from '@/hooks/useNotificationActions';
import * as BackgroundFetch from 'expo-background-task';
import * as Notifications from 'expo-notifications';
import * as TaskManager from 'expo-task-manager';
import { settingsService } from './settings-service';

export type DeliveryMode = 'nativePush' | 'gqlRealtime' | 'backgroundFetch';

const BACKGROUND_TASK = 'zentik-notifications-fetch';

class LocalNotificationsService {
  private isInitialized = false;
  private backgroundTaskRegistered = false;
  private actionCallbacks: NotificationActionCallbacks | null = null;
  private gqlUnsub: (() => void) | null = null;

  onNewLocalNotification(notification: NotificationFragment) {
    console.debug("🔔 New local notification:", notification);
    this.actionCallbacks?.pushNotificationReceived(notification.id);
  };

  async initializeGqlSubscriptions() {
    if (this.gqlUnsub) {
      this.gqlUnsub();
      this.gqlUnsub = null;
    }

    console.debug("🔄 Initializing GQL subscriptions...");
    subscriptionsEnabledVar(true);
    this.gqlUnsub = localNotifications.subscribeRealtimeLocalNotifications(
      this.onNewLocalNotification
    );
  };

  /**
   * Initialize local notifications service
   */
  async initialize(callbacks: any): Promise<void> {
    this.actionCallbacks = callbacks;
    if (this.isInitialized) {
      return;
    }

    try {
      await this.enableBackgroundFetch();

      this.isInitialized = true;
      console.debug('✅ Local notifications service initialized successfully');
    } catch (error) {
      console.error('❌ Error initializing local notifications service:', error);
    }
  }

  /**
   * Enable background fetch for notifications
   */
  async enableBackgroundFetch(minIntervalSeconds: number = 900): Promise<void> {
    try {
      const status = await BackgroundFetch.getStatusAsync();
      if (status === BackgroundFetch.BackgroundTaskStatus.Restricted) {
        console.warn('⚠️ Background fetch restricted on this device');
        return;
      }

      try {
        TaskManager.defineTask(BACKGROUND_TASK, async () => {
          try {
            const lastSeenId = settingsService.getSettings().notificationsLastSeenId;
            const res = await apolloClient?.query({
              query: GetNotificationsDocument,
              fetchPolicy: 'network-only'
            });

            const notifications: any[] = (res?.data as any)?.notifications ?? [];
            const unseen = lastSeenId ? notifications.filter((n) => n.id > lastSeenId) : notifications;

            for (const n of unseen.slice(0, 5)) {
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: n.title ?? 'Zentik',
                  body: n.body ?? '',
                  data: { id: n.id }
                },
                trigger: null,
              });
            }

            if (notifications[0]?.id) {
              await settingsService.setNotificationsLastSeenId(notifications[0].id);
            }
          } catch (e) {
            console.warn('⚠️ Background fetch task failed:', e);
          }
        });
      } catch (error) {
        console.warn('⚠️ Failed to define background task:', error);
      }

      try {
        await BackgroundFetch.registerTaskAsync(BACKGROUND_TASK, {
          minimumInterval: minIntervalSeconds
        });
        this.backgroundTaskRegistered = true;
        console.debug('✅ Background fetch task registered successfully');
      } catch (e) {
        // already registered or not supported
        console.debug('ℹ️ Background fetch task already registered or not supported');
      }
    } catch (error) {
      console.error('❌ Error enabling background fetch:', error);
    }
  }

  /**
   * Subscribe to realtime local notifications
   */
  subscribeRealtimeLocalNotifications(
    onNewNotification: (notification: NotificationFragment) => void
  ): () => void {
    const sub = apolloClient?.subscribe({
      query: NotificationCreatedDocument
    }).subscribe({
      next: async (payload) => {
        try {
          const n: any = payload?.data?.notificationCreated;
          if (!n) return;

          onNewNotification(n);

          // Commented out local notification scheduling for now
          // await Notifications.scheduleNotificationAsync({
          //   content: {
          //     title: n?.message?.title ?? 'Zentik',
          //     body: n?.message?.body ?? '',
          //     data: { id: n?.id },
          //   },
          //   trigger: null,
          // });
        } catch (error) {
          console.warn('⚠️ Error handling realtime notification:', error);
        }
      },
      error: (error) => {
        console.error('❌ Realtime notification subscription error:', error);
      },
    });

    return () => sub?.unsubscribe();
  }

  /**
   * Check if the service is initialized
   */
  isReady(): boolean {
    return this.isInitialized;
  }

  /**
   * Check if background fetch is registered
   */
  isBackgroundFetchEnabled(): boolean {
    return this.backgroundTaskRegistered;
  }

  /**
   * Cleanup resources
   */
  cleanup() {
    try {
      subscriptionsEnabledVar(false);
      if (this.gqlUnsub) {
        try { this.gqlUnsub(); } catch {}
        this.gqlUnsub = null;
      }
      // Unregister background task if needed
      if (this.backgroundTaskRegistered) {
        BackgroundFetch.unregisterTaskAsync(BACKGROUND_TASK);
        this.backgroundTaskRegistered = false;
      }

      this.isInitialized = false;
      console.debug('🧹 Local notifications service cleaned up');
    } catch (error) {
      console.warn('⚠️ Error during cleanup:', error);
    }
  }
}

// Export singleton instance
export const localNotifications = new LocalNotificationsService();

