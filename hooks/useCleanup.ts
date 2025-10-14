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

// Polyfill for requestIdleCallback (not available in React Native)
const requestIdleCallbackPolyfill = (callback: () => void) => {
    if (typeof requestIdleCallback !== 'undefined') {
        return requestIdleCallback(callback);
    }
    // Fallback: use setTimeout with 0ms delay
    return setTimeout(callback, 0) as any;
};

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
                requestIdleCallbackPolyfill(async () => {
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
            requestIdleCallbackPolyfill(() => {
                setTimeout(resolve, 0);
            });
        });

        const delay = immediate ? 0 : 15000;

        await new Promise(resolve => setTimeout(resolve, delay));

        // 1. Load from LOCAL CACHE in parallel (instant UI)
        await Promise.all([
            executeWithRAF(
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
            ).catch((e) => {
                console.error('[Cleanup] Error during sync of notifications with backend', e);
            }),
            executeWithRAF(
                async () => {
                    console.log('[Cleanup] Loading buckets from local DB cache...');
                    await loadBucketsFromCache();
                    console.log('[Cleanup] Buckets loaded from cache into React Query');
                },
                'loading buckets from cache'
            ).catch((e) => {
                console.error('[Cleanup] Error loading buckets from local DB cache', e);
            }),

            // Note: Notifications are loaded on-demand by useInfiniteNotifications from local DB
            // No need to preload all notifications into memory
        ]);
        await waitRAF();

        // 2. Sync with BACKEND in parallel (background updates)
        await Promise.all([
            executeWithRAF(
                async () => {
                    console.log('[Cleanup] Syncing buckets with backend...');
                    await initializeBucketsStats();
                    console.log('[Cleanup] Buckets synced with backend and saved to DB');
                },
                'syncing buckets with backend'
            ).catch((e) => {
                console.error('[Cleanup] Error during sync of buckets with backend', e);
            }),
        ]);
        await waitRAF();

        // 4. Cleanup notifications by settings
        if (shouldCleanup || force) {
            await executeWithRAF(
                async () => {
                    await cleanupNotificationsBySettings();
                    console.log('[Cleanup] Cleaned up notifications');
                },
                'cleaning notifications'
            ).catch(() => {
                console.error('[Cleanup] Error during cleanup of notifications');
            });

            await waitRAF();

            // 5. Cleanup gallery by settings
            await executeWithRAF(
                async () => {
                    await cleanupGalleryBySettings();
                    console.log('[Cleanup] Cleaned up gallery');
                },
                'cleaning gallery'
            ).catch((e) => {
                console.error('[Cleanup] Error during gallery cleanup', e);
            });
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
        ).catch((e) => {
            console.error('[Cleanup] Error reloading media cache metadata', e);
        });

        await waitRAF();

        console.log('[Cleanup] Cleanup completed');
    }, [queryClient, syncNotifications, loadBucketsFromCache, initializeBucketsStats]);

    return { cleanup };
}