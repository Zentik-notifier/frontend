import { GetNotificationsDocument, NotificationFragment } from "@/generated/gql-operations-generated";
import { cleanupGalleryBySettings, mediaCache } from "@/services/media-cache-service";
import { cleanupNotificationsBySettings, getAllNotificationsFromCache } from "@/services/notifications-repository";
import { userSettings } from "@/services/user-settings";
import { processJsonToCache } from "@/utils/cache-data-processor";
import { useApolloClient } from "@apollo/client";
import { useCallback } from "react";
import { useFetchNotifications, useMassDeleteNotifications } from "./useNotifications";
import { setBadgeCount } from "@/utils/badgeUtils";

interface CleanupProps {
    immediate?: boolean,
    force?: boolean,
}

export const useCleanup = () => {
    const apollo = useApolloClient();
    const { fetchNotifications } = useFetchNotifications();
    const { massDelete } = useMassDeleteNotifications();

    const syncApolloWithLocalDb = useCallback(async () => {
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

                await processJsonToCache(
                    apollo.cache,
                    mergedNotifications,
                    'SyncDB'
                );
            }

            if (extraInApollo.length > 0) {
                await massDelete(extraInApollo.map(n => n.id));
            }

            const result = {
                added: missingInApollo.length,
                removed: extraInApollo.length,
                total: dbNotifications.length
            };

            console.log(`[SyncDB] Sync completed: added ${result.added}, removed ${result.removed}, total ${result.total}`);

            // Update badge count with unread notifications from DB
            try {
                const unreadCount = dbNotifications.filter(n => !n.readAt).length;
                await setBadgeCount(unreadCount);
            } catch (error) {
                console.error('[SyncDB] Error updating badge count:', error);
            }

            return result;

        } catch (error) {
            console.error('[SyncDB] Error syncing Apollo with local DB:', error);
            throw error;
        }
    }, [apollo]);

    const cleanup = useCallback(async ({ immediate, force }: CleanupProps) => {
        const shouldCleanup = !userSettings.shouldRunCleanup() ? false : true;

        const executeWithRAF = <T>(fn: () => Promise<T>, label: string): Promise<T> => {
            return new Promise((resolve, reject) => {
                requestIdleCallback(async () => {
                    try {
                        const result = await fn();
                        resolve(result);
                    } catch (error) {
                        console.error(`[Cleanup] Error on ${label}:`, error);
                        reject(error);
                    }
                });
            });
        };

        const waitRAF = () => new Promise<void>(resolve => {
            requestIdleCallback(() => {
                setTimeout(resolve, 0);
            });
        });

        const delay = immediate ? 0 : 15000;

        await new Promise(resolve => setTimeout(resolve, delay));

        // // 1. Fetch notifications from remote
        // await executeWithRAF(
        //     async () => {
        //         await fetchNotifications();
        //         console.log('[Cleanup] Fetched notifications from remote');
        //     },
        //     'fetching notifications'
        // ).catch(() => { }); // Continue on error
        // await waitRAF();
        await fetchNotifications();

        // 2. Sync Apollo with LocalDB
        // await executeWithRAF(
        //     async () => {
        //         await syncApolloWithLocalDb();
        //         console.log('[Cleanup] Synced Apollo with LocalDB');
        //     },
        //     'syncing Apollo with local DB'
        // ).catch(() => { }); // Continue on error
        // await waitRAF();
        await syncApolloWithLocalDb();

        // 3. Cleanup notifications by settings
        if (shouldCleanup || force) {
            await executeWithRAF(
                async () => {
                    await cleanupNotificationsBySettings();
                    console.log('[Cleanup] Cleaned up notifications');
                },
                'cleaning notifications'
            ).catch(() => { }); // Continue on error

            await waitRAF();

            // 4. Cleanup gallery by settings
            await executeWithRAF(
                async () => {
                    await cleanupGalleryBySettings();
                    console.log('[Cleanup] Cleaned up gallery');
                },
                'cleaning gallery'
            ).catch(() => { }); // Continue on error
            await userSettings.setLastCleanup(new Date().toISOString());
            console.log('[Cleanup] Updated last cleanup timestamp');

            await waitRAF();
        }

        // 5. Reload media cache metadata
        await executeWithRAF(
            async () => {
                await mediaCache.reloadMetadata();
                console.log('[Cleanup] Reloaded media cache metadata');
            },
            'reloading media cache'
        ).catch(() => { }); // Continue on error

        await waitRAF();

        console.log('[Cleanup] Cleanup completed');
    }, [syncApolloWithLocalDb, fetchNotifications]);

    return { cleanup };
}