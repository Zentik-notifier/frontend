import { cleanupGalleryBySettings, mediaCache } from "@/services/media-cache-service";
import { cleanupNotificationsBySettings, getAllNotificationsFromCache } from "@/services/notifications-repository";
import { settingsService } from "@/services/settings-service";
import { setBadgeCount } from "@/utils/badgeUtils";
import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
    useNotificationsState,
} from "@/hooks/notifications/useNotificationQueries";
import IosBridgeService from "@/services/ios-bridge";
import { useSettings } from "./useSettings";

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
    syncCloud?: boolean,
    force?: boolean,
}

export const useCleanup = () => {
    const queryClient = useQueryClient();
    const { refreshAll } = useNotificationsState();
    const { settings } = useSettings();

    const cleanup = useCallback(async ({ immediate, syncCloud, force }: CleanupProps) => {
        const shouldCleanup = !settingsService.shouldRunCleanup() ? false : true;

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

        // 1. Sync complete app state with BACKEND (single unified call)
        await executeWithRAF(
            async () => {
                console.log('[Cleanup] Syncing complete app state with backend...');
                await refreshAll();
                console.log('[Cleanup] Complete app state synced with backend');

                // Update badge count after sync
                try {
                    const dbNotifications = await getAllNotificationsFromCache();
                    const unreadCount = dbNotifications.filter(n => !n.readAt).length;
                    await setBadgeCount(unreadCount);
                    console.log(`[Cleanup] Badge count updated: ${unreadCount} unread`);
                } catch (error) {
                    console.error('[Cleanup] Error updating badge count:', error);
                }
            },
            'syncing complete app state with backend'
        ).catch((e) => {
            console.error('[Cleanup] Error during sync of complete app state with backend', e);
        });
        await waitRAF();

        // 6. THIRD: Now cleanup local notifications by settings
        if (shouldCleanup || force) {
            await executeWithRAF(
                async () => {
                    console.log('[Cleanup] 🧹 Starting local cleanup...');
                    await cleanupNotificationsBySettings();
                    console.log('[Cleanup] 🧹 Cleaned up notifications');
                },
                'cleaning notifications'
            ).catch(() => {
                console.error('[Cleanup] Error during cleanup of notifications');
            });

            await waitRAF();

            // 7. Cleanup gallery by settings
            await executeWithRAF(
                async () => {
                    await cleanupGalleryBySettings();
                    console.log('[Cleanup] Cleaned up gallery');
                },
                'cleaning gallery'
            ).catch((e) => {
                console.error('[Cleanup] Error during gallery cleanup', e);
            });
            await settingsService.setLastCleanup(new Date().toISOString());
            console.log('[Cleanup] Updated last cleanup timestamp');

            await waitRAF();
        }

        // 8. Reload media cache metadata
        await executeWithRAF(
            async () => {
                await mediaCache.reloadMetadata();
                console.log('[Cleanup] Reloaded media cache metadata');
            },
            'reloading media cache'
        ).catch((e) => {
            console.error('[Cleanup] Error reloading media cache metadata', e);
        });


        if (syncCloud) {
            await waitRAF();

            await executeWithRAF(
                async () => {
                    console.log('[Cleanup] 🔄 Starting CloudKit incremental sync...');

                    // Step 1: Fetch incremental changes from CloudKit (using saved tokens)
                    const changes = await IosBridgeService.fetchIncrementalChanges();

                    console.log(`[Cleanup] ✅ Fetched ${changes.bucketChanges} bucket changes, ${changes.notificationChanges} notification changes`);

                    // Step 2: Native code already updated SQLite DB with changes
                    // Invalidate React Query cache to reload from updated DB
                    if (changes.bucketChanges > 0 || changes.notificationChanges > 0) {
                        console.log('[Cleanup] 🔄 Invalidating cache after CloudKit changes...');
                        await queryClient.invalidateQueries({ queryKey: ['app-state'] });
                        await queryClient.invalidateQueries({ queryKey: ['notifications', 'lists'] });
                    }

                    // Step 3: Upload local changes to CloudKit (if any new notifications)
                    const limit = settings.retentionPolicies?.watchNMaxNotifications ?? 150;
                    const uploadResult = await IosBridgeService.syncAllToCloudKit(limit);
                    console.log(`[Cleanup] ✅ Uploaded ${uploadResult.bucketsCount} buckets, ${uploadResult.notificationsCount} notifications`);
                },
                'CloudKit sync'
            ).catch((e) => {
                console.error('[Cleanup] Error during CloudKit sync', e);
            });

        }

        console.log('[Cleanup] Cleanup completed');
    }, [queryClient, refreshAll]);

    return { cleanup };
}