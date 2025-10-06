import { useNavigationUtils } from '@/utils/navigation';
import { useCallback } from 'react';
import { Linking } from 'react-native';
import { clearPendingNavigationIntent, getPendingNavigationIntent } from '../services/auth-storage';
import { getAllNotificationsFromCache } from '@/services/notifications-repository';
import { GetNotificationsDocument, NotificationFragment } from '@/generated/gql-operations-generated';
import { ApolloClient } from '@apollo/client';
import { processNotificationsToCacheWithQuery } from '@/utils/cache-data-processor';

export function usePendingNotificationIntents() {
  const { navigateToNotificationDetail } = useNavigationUtils();

  const processPendingNavigationIntent = useCallback(async () => {
    try {
      const intent = await getPendingNavigationIntent();
      if (intent) {
        console.log(`[PendingIntents] Pending navigation intent found: ${JSON.stringify(intent)}`);
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

  /**
   * Sincronizza Apollo cache con il database locale.
   * Controlla gli UUID nel DB e aggiunge/rimuove le notifiche gap in Apollo.
   * 
   * @returns {Promise<{ added: number, removed: number, total: number }>} Statistiche di sincronizzazione
   */
  const syncApolloWithLocalDb = useCallback(async (apollo: ApolloClient<any>) => {
    try {
      console.log('[SyncDB] Starting Apollo-LocalDB sync...');

      const dbNotifications = await getAllNotificationsFromCache();

      let apolloNotifications: NotificationFragment[] = [];
      try {
        const queryData = apollo.readQuery<{ notifications: NotificationFragment[] }>({
          query: GetNotificationsDocument,
        });
        apolloNotifications = queryData?.notifications || [];
      } catch (error) {
        console.warn('[SyncDB] Could not read Apollo cache, initializing empty:', error);
        apolloNotifications = [];
      }

      const dbUuids = new Set(dbNotifications.map(n => n.id));
      const apolloUuids = new Set(apolloNotifications.map(n => n.id));

      const missingInApollo = dbNotifications.filter(n => !apolloUuids.has(n.id));
      const extraInApollo = apolloNotifications.filter(n => !dbUuids.has(n.id));

      console.log(`[SyncDB] Gap analysis: ${missingInApollo.length} missing in Apollo, ${extraInApollo.length} extra in Apollo`);

      if (missingInApollo.length > 0) {
        const mergedNotifications = [...apolloNotifications, ...missingInApollo];

        mergedNotifications.sort((a, b) => {
          const aTime = new Date(a.createdAt).getTime();
          const bTime = new Date(b.createdAt).getTime();
          return bTime - aTime;
        });

        processNotificationsToCacheWithQuery(
          apollo.cache,
          mergedNotifications,
          'SyncDB'
        );

      }

      if (extraInApollo.length > 0) {
        apollo.cache.modify({
          fields: {
            notifications(existingNotifications: readonly any[] | any = [], { readField }) {
              if (!Array.isArray(existingNotifications)) {
                return existingNotifications;
              }

              const idsToRemove = new Set(extraInApollo.map(n => n.id));
              const filtered = existingNotifications.filter((notification: any) => {
                const notificationId = readField('id', notification) as string;
                return !idsToRemove.has(notificationId);
              });

              return filtered;
            }
          }
        });

        for (const notification of extraInApollo) {
          apollo.cache.evict({ id: `Notification:${notification.id}` });
        }

        apollo.cache.gc();
      }

      const result = {
        added: missingInApollo.length,
        removed: extraInApollo.length,
        total: dbNotifications.length
      };

      console.log(`[SyncDB] Sync completed: added ${result.added}, removed ${result.removed}, total ${result.total}`);
      return result;

    } catch (error) {
      console.error('[SyncDB] Error syncing Apollo with local DB:', error);
      throw error;
    }
  }, []);

  return {
    processPendingNavigationIntent,
    syncApolloWithLocalDb,
  };
}
