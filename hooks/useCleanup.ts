import { cleanupGalleryBySettings, mediaCache } from "@/services/media-cache-service";
import { cleanupNotificationsBySettings, getAllNotificationsFromCache } from "@/services/notifications-repository";
import { userSettings } from "@/services/user-settings";
import { ApolloClient, useApolloClient } from "@apollo/client";
import { useCallback } from "react"
import { usePendingNotificationIntents } from "./usePendingNotificationIntents";
import { GetNotificationsDocument, NotificationFragment } from "@/generated/gql-operations-generated";
import { processNotificationsToCacheWithQuery } from "@/utils/cache-data-processor";
import { useFetchNotifications } from "./useNotifications";

interface CleanupProps {
    immediate?: boolean,
    force?: boolean,
}

export const useCleanup = () => {
    const apollo = useApolloClient();
    const { fetchNotifications } = useFetchNotifications();

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
    }, [apollo]);

    const cleanup = useCallback(async ({ immediate, force }: CleanupProps) => {
        let shouldCleanup = true;
        if (!userSettings.shouldRunCleanup() && !force) {
            console.log(
                "[Cleanup] Skipping cleanup - last cleanup was less than 6 hours ago"
            );
            shouldCleanup = false;
        }

        const fn = async () => {
            await cleanupNotificationsBySettings();
            await cleanupGalleryBySettings();
            await mediaCache.reloadMetadata();
            await userSettings.setLastCleanup(new Date().toISOString());
            console.log("[Cleanup] cleanup completed");
        }

        try {
            await fetchNotifications();
        } catch (e) {
            console.error('[Cleanup] Error on fetching notifications from remote', e);
        }

        try {
            await syncApolloWithLocalDb();
        } catch (e) {
            console.error('[Cleanup] Error on syncing Apollo with local DB', e);
        }

        if (shouldCleanup) {
            if (immediate) {
                await fn();
            } else {
                setTimeout(async () => await fn(), 15000);
            }
        }
    }, [syncApolloWithLocalDb]);

    return { cleanup };
}