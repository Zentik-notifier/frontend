import { cleanupGalleryBySettings, mediaCache } from "@/services/media-cache-service";
import { cleanupNotificationsBySettings, getAllNotificationsFromCache } from "@/services/notifications-repository";
import { userSettings } from "@/services/user-settings";
import { setBadgeCount } from "@/utils/badgeUtils";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { 
    useSyncNotificationsFromAPI, 
    useInitializeBucketsStats,
    useLoadBucketsFromCache,
    notificationKeys 
} from "@/hooks/notifications/useNotificationQueries";

interface CleanupProps {
    immediate?: boolean,
    force?: boolean,
}

export const useCleanup = () => {
    const queryClient = useQueryClient();
    const { syncNotifications } = useSyncNotificationsFromAPI();
    const { initializeBucketsStats } = useInitializeBucketsStats();
    const { loadBucketsFromCache } = useLoadBucketsFromCache();

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

        // 1. Sync notifications from API (initial startup sync)
        await executeWithRAF(
            async () => {
                console.log('[Cleanup] Starting notification sync from API...');
                const count = await syncNotifications();
                console.log(`[Cleanup] Synced ${count} notifications from API`);

                // Invalidate notification queries to refresh UI with new data
                await queryClient.invalidateQueries({ queryKey: notificationKeys.all });
                console.log('[Cleanup] Notification queries invalidated');

                // Update badge count with unread notifications
                try {
                    const dbNotifications = await getAllNotificationsFromCache();
                    const unreadCount = dbNotifications.filter(n => !n.readAt).length;
                    await setBadgeCount(unreadCount);
                    console.log(`[Cleanup] Badge count updated: ${unreadCount} unread`);
                } catch (error) {
                    console.error('[Cleanup] Error updating badge count:', error);
                }
            },
            'syncing notifications from API'
        ).catch(() => { }); // Continue on error
        await waitRAF();

        // 2. Load buckets from local DB cache (instant display)
        await executeWithRAF(
            async () => {
                console.log('[Cleanup] Loading buckets from local DB cache...');
                await loadBucketsFromCache();
                console.log('[Cleanup] Buckets loaded from cache into React Query');
            },
            'loading buckets from cache'
        ).catch(() => { }); // Continue on error - will fetch from backend
        await waitRAF();

        // 3. Sync buckets with backend (fetch from GraphQL + save to DB + update stats)
        await executeWithRAF(
            async () => {
                console.log('[Cleanup] Syncing buckets with backend...');
                await initializeBucketsStats();
                console.log('[Cleanup] Buckets synced with backend and saved to DB');
            },
            'syncing buckets with backend'
        ).catch(() => { }); // Continue on error
        await waitRAF();

        // 4. Cleanup notifications by settings
        if (shouldCleanup || force) {
            await executeWithRAF(
                async () => {
                    await cleanupNotificationsBySettings();
                    console.log('[Cleanup] Cleaned up notifications');
                },
                'cleaning notifications'
            ).catch(() => { }); // Continue on error

            await waitRAF();

            // 5. Cleanup gallery by settings
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

        // 6. Reload media cache metadata
        await executeWithRAF(
            async () => {
                await mediaCache.reloadMetadata();
                console.log('[Cleanup] Reloaded media cache metadata');
            },
            'reloading media cache'
        ).catch(() => { }); // Continue on error

        await waitRAF();

        console.log('[Cleanup] Cleanup completed');
    }, [queryClient, syncNotifications, loadBucketsFromCache, initializeBucketsStats]);

    return { cleanup };
}