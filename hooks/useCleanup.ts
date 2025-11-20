import {
    useNotificationsState,
} from "@/hooks/notifications/useNotificationQueries";
import { cleanupGalleryBySettings, mediaCache } from "@/services/media-cache-service";
import { cleanupNotificationsBySettings, getAllNotificationsFromCache } from "@/services/notifications-repository";
import { settingsService } from "@/services/settings-service";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useRef } from "react";
import { getAllBuckets } from "@/db/repositories/buckets-repository";

// Polyfill for requestIdleCallback (not available in React Native)
const requestIdleCallbackPolyfill = (callback: () => void) => {
    if (typeof requestIdleCallback !== 'undefined') {
        return requestIdleCallback(callback);
    }
    // Fallback: use setTimeout with 0ms delay
    return setTimeout(callback, 0) as any;
};

interface CleanupProps {
    force?: boolean,
}

export const useCleanup = () => {
    const queryClient = useQueryClient();
    const { refreshAll } = useNotificationsState();

    // Use ref to track if cleanup is currently running
    const isCleanupRunningRef = useRef(false);

    const cleanup = useCallback(async (props?: CleanupProps) => {
        const { force } = props || {};
        // Prevent multiple concurrent cleanup operations
        if (isCleanupRunningRef.current) {
            console.log('[Cleanup] ⏭️ Cleanup already running, skipping duplicate call');
            return;
        }

        isCleanupRunningRef.current = true;

        try {
            const shouldCleanup = !!settingsService.shouldRunCleanup();

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


            // 0. Load buckets from SQL/IndexedDB into React Query cache (before backend sync)
            // await executeWithRAF(
            //     async () => {
            //         // console.log('[Cleanup] Loading buckets from local DB into React Query cache...');
            //         const localBuckets = await getAllBuckets();

            //         // Update React Query cache with buckets from local DB
            //         queryClient.setQueryData(['app-state'], (oldData: any) => {
            //             if (!oldData) {
            //                 // No existing data - initialize with buckets from DB
            //                 return {
            //                     buckets: localBuckets,
            //                     notifications: [],
            //                     stats: {
            //                         totalCount: 0,
            //                         unreadCount: 0,
            //                         readCount: 0,
            //                         byBucket: [],
            //                     },
            //                     lastSync: new Date().toISOString(),
            //                 };
            //             }

            //             // Merge buckets from local DB with existing data
            //             return {
            //                 ...oldData,
            //                 buckets: localBuckets,
            //             };
            //         });

            //         console.log(`[Cleanup] Loaded ${localBuckets.length} buckets from local DB into React Query cache`);
            //     },
            //     'loading buckets from local DB'
            // ).catch((e) => {
            //     console.error('[Cleanup] Error loading buckets from local DB', e);
            // });

            // 1. Sync complete app state with BACKEND (single unified call)
            await executeWithRAF(
                async () => {
                    console.log('[Cleanup] Syncing complete app state with backend...');
                    await refreshAll();
                    console.log('[Cleanup] Complete app state synced with backend');
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

            console.log('[Cleanup] Cleanup completed');
        } finally {
            // Always release the lock when cleanup completes or fails
            isCleanupRunningRef.current = false;
        }
    }, [queryClient, refreshAll]);

    return { cleanup };
}