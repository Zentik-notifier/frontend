import { useNotificationsState } from "@/hooks/notifications/useNotificationQueries";
import {
  cleanupGalleryBySettings,
  mediaCache,
} from "@/services/media-cache-service";
import {
  cleanupNotificationsBySettings,
  getAllNotificationsFromCache,
} from "@/services/notifications-repository";
import { settingsService } from "@/services/settings-service";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";
import { getAllBuckets } from "@/db/repositories/buckets-repository";
import { Platform } from "react-native";
import { useNotificationActions } from "./useNotificationActions";
import { useGetVersionsInfo } from "./useGetVersionsInfo";
import iosBridgeService from "@/services/ios-bridge";

// NOTE: `useCleanup()` is used in multiple places (AppContext + push/background hooks).
// A per-hook `useRef` lock won't prevent concurrent cleanups across instances.
// Keep a module-level lock + throttling to avoid repeated runs/log spam.
let globalCleanupInFlight: Promise<void> | null = null;
let globalCleanupLastStartedAtMs = 0;
let globalCleanupLastFinishedAtMs = 0;
const GLOBAL_CLEANUP_MIN_INTERVAL_MS = 12_000;

let globalCloudKitInFlight: Promise<void> | null = null;
let globalCloudKitLastAttemptAtMs = 0;
const GLOBAL_CLOUDKIT_MIN_INTERVAL_MS = 45_000;

// Polyfill for requestIdleCallback (not available in React Native)
const requestIdleCallbackPolyfill = (callback: () => void) => {
  if (typeof requestIdleCallback !== "undefined") {
    return requestIdleCallback(callback);
  }
  // Fallback: use setTimeout with 0ms delay
  return setTimeout(callback, 0) as any;
};

interface CleanupProps {
  force?: boolean;
  skipNetwork?: boolean;
  onRotateDeviceKeys?: () => Promise<boolean | void>;
}

export const useCleanup = () => {
  const queryClient = useQueryClient();
  const { refreshAll } = useNotificationsState();
  const notificationCallbacks = useNotificationActions();
  const { versions } = useGetVersionsInfo();

  const cleanup = useCallback(
    async (props?: CleanupProps) => {
      const { force, skipNetwork = false, onRotateDeviceKeys } = props || {};
      const nowMs = Date.now();

      const authDataAtStart = settingsService.getAuthData();
      const hasAuthAtStart = !!authDataAtStart.accessToken;
      const effectiveSkipNetwork = skipNetwork || !hasAuthAtStart;

      // Global in-flight lock across all `useCleanup()` hook instances.
      if (globalCleanupInFlight) {
        return globalCleanupInFlight;
      }

      // Global throttle to prevent rapid repeat triggers (AppState/background tasks).
      if (
        !force &&
        nowMs - globalCleanupLastStartedAtMs < GLOBAL_CLEANUP_MIN_INTERVAL_MS
      ) {
        return;
      }

      globalCleanupLastStartedAtMs = nowMs;

      globalCleanupInFlight = (async () => {
        try {
          const shouldCleanup = !!settingsService.shouldRunCleanup();

          const formatTime = (ms: number): string => {
            if (ms < 1000) return `${ms.toFixed(0)}ms`;
            return `${(ms / 1000).toFixed(2)}s`;
          };

          const executeWithRAF = <T>(
            fn: () => Promise<T>,
            label: string,
          ): Promise<T> => {
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
          const waitRAF = () =>
            new Promise<void>((resolve) => {
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

          // 1. Load buckets from cache
          const bucketsCacheStart = performance.now();
          await executeWithRAF(async () => {
            await getAllBuckets();
          }, "loading buckets from cache").catch(() => {});
          const bucketsCacheTime = performance.now() - bucketsCacheStart;
          console.log(
            `[Cleanup] ✓ Loading buckets from cache: ${formatTime(bucketsCacheTime)}`,
          );
          await waitRAF();

          // 2. Load notifications from cache
          const notificationsCacheStart = performance.now();
          await executeWithRAF(async () => {
            await getAllNotificationsFromCache();
          }, "loading notifications from cache").catch(() => {});
          const notificationsCacheTime =
            performance.now() - notificationsCacheStart;
          console.log(
            `[Cleanup] ✓ Loading notifications from cache: ${formatTime(notificationsCacheTime)}`,
          );
          await waitRAF();

          // 3. Load data from network and merging (if not skipped)
          // If user is logged out, force cache-only mode to avoid noisy failing requests.
          if (!effectiveSkipNetwork) {
            const timings = await executeWithRAF(async () => {
              return await refreshAll(false);
            }, "loading data from network and merging").catch(() => ({
              networkTime: 0,
              mergeTime: 0,
            }));

            if (timings) {
              console.log(
                `[Cleanup] ✓ Loading data from network: ${formatTime(timings.networkTime)}`,
              );
              console.log(
                `[Cleanup] ✓ Combined merging: ${formatTime(timings.mergeTime)}`,
              );
            }
          } else {
            await executeWithRAF(async () => {
              await refreshAll(true);
            }, "skipping network, using cache only").catch(() => {});
            console.log(`[Cleanup] ✓ Network skip, using cache only`);
          }
          await waitRAF();

          // 4. Update device metadata (app versions, build info) for the current user device
          try {
            const authData = settingsService.getAuthData();
            const deviceId = authData.deviceId;
            const hasAuth = !!authData.accessToken;

            if (hasAuth && deviceId) {
              await notificationCallbacks.useUpdateUserDevice({
                deviceId,
                metadata: JSON.stringify(versions),
              });

              console.log("[Cleanup] ✓ Updated device metadata", versions);
            } else {
              console.log(
                "[Cleanup] Skipping device metadata update: missing auth/deviceId",
              );
            }
          } catch (error) {
            console.warn("[Cleanup] Failed to update device metadata", error);
          }

          // 4.1 Rotate device keys (every 7 days)
          try {
            const sevenDaysInMs = 7 * 24 * 60 * 60 * 1000;
            const now = new Date();
            const lastKeysRotation =
              settingsService.getSettings().lastKeysRotation;

            const lastRotationDate = lastKeysRotation
              ? new Date(lastKeysRotation)
              : null;
            const isLastRotationValid =
              !!lastRotationDate && !Number.isNaN(lastRotationDate.getTime());
            const shouldRotate =
              !lastKeysRotation ||
              !isLastRotationValid ||
              now.getTime() - (lastRotationDate as Date).getTime() >=
                sevenDaysInMs;

            const authData = settingsService.getAuthData();
            const hasAuth = !!authData.accessToken;
            const hasDeviceId = !!authData.deviceId;
            const hasDeviceToken = !!authData.deviceToken;

            if (
              shouldRotate &&
              hasAuth &&
              hasDeviceId &&
              hasDeviceToken &&
              onRotateDeviceKeys
            ) {
              console.log("[Cleanup] Rotating device keys (7 days elapsed)");
              const ok = await onRotateDeviceKeys();
              if (ok === false) {
                console.warn("[Cleanup] Device key rotation failed");
              } else {
                await settingsService.setLastKeysRotation(now.toISOString());
                console.log("[Cleanup] ✓ Device keys rotated");
              }
            }
          } catch (error) {
            console.warn("[Cleanup] Failed to rotate device keys", error);
          }

          // 5. Cleanup local notifications by settings
          if (shouldCleanup || force) {
            await executeWithRAF(async () => {
              await cleanupNotificationsBySettings();
            }, "cleaning notifications").catch(() => {});

            await waitRAF();

            // 6. Cleanup gallery by settings
            await executeWithRAF(async () => {
              await cleanupGalleryBySettings();
            }, "cleaning gallery").catch(() => {});
            await settingsService.setLastCleanup(new Date().toISOString());
            await waitRAF();
          }

          // 7. Reload media cache metadata
          await executeWithRAF(async () => {
            await mediaCache.reloadMetadata();
          }, "reloading media cache").catch(() => {});

          // 8. Preload bucket icons (especially for shared buckets)
          await executeWithRAF(async () => {
            // Get buckets from React Query cache
            const appState = queryClient.getQueryData(["app-state"]) as any;
            const buckets = appState?.buckets || [];

            if (buckets.length > 0) {
              await mediaCache.preloadBucketIcons(buckets);
              console.log(
                `[Cleanup] ✓ Preloaded icons for ${buckets.length} buckets`,
              );
            }
          }, "preloading bucket icons").catch(() => {});

          // 9. CloudKit initialization and sync (iOS only) - OR WC Sync when enabled
          // Must be independent from app login / backend network refresh:
          // CloudKit is a native/iCloud pipeline and should still run when `skipNetwork` is true.
          // WC Sync is used for direct iPhone-Watch communication when WC mode is enabled.
          if (Platform.OS === "ios") {
            const cloudKitNowMs = Date.now();

            if (
              !force &&
              (globalCloudKitInFlight ||
                cloudKitNowMs - globalCloudKitLastAttemptAtMs <
                  GLOBAL_CLOUDKIT_MIN_INTERVAL_MS)
            ) {
              // Avoid spamming schema/subscription/sync logs if cleanup gets triggered repeatedly.
              return;
            }

            globalCloudKitLastAttemptAtMs = cloudKitNowMs;

            globalCloudKitInFlight = executeWithRAF(async () => {
              try {
                const watchSupported =
                  await iosBridgeService.isWatchSupported();
                if (!watchSupported.supported) {
                  return;
                }

                // Check if WC-only sync mode is enabled
                const wcSyncStatus = await iosBridgeService.isWCSyncEnabled();

                if (wcSyncStatus.enabled) {
                  // WC Sync Mode: Use WatchConnectivity for iPhone-Watch sync
                  // Only retry NSE notifications that weren't delivered yet (uses cursor)
                  console.log(
                    "[Cleanup] WC sync mode enabled, retrying NSE notifications to Watch...",
                  );

                  try {
                    const result =
                      await iosBridgeService.retryNSENotificationsToWatch();
                    if (result.count > 0) {
                      console.log(
                        `[Cleanup] ✓ NSE retry to Watch: pushed ${result.count} notification(s)`,
                      );
                      // Invalidate React Query to refresh UI
                      queryClient.invalidateQueries({
                        queryKey: ["notifications"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["app-state"],
                      });
                    } else {
                      console.log(
                        "[Cleanup] ✓ No NSE notifications to retry to Watch",
                      );
                    }
                  } catch (error) {
                    console.warn(
                      "[Cleanup] ⚠️ NSE retry to Watch error:",
                      error,
                    );
                  }

                  // Skip CloudKit operations when WC sync is enabled
                  return;
                }

                // CloudKit Sync Mode: Traditional CloudKit-based sync
                const cloudKitEnabled =
                  await iosBridgeService.isCloudKitEnabled();
                if (!cloudKitEnabled.enabled) {
                  console.log(
                    "[Cleanup] CloudKit is disabled, skipping CloudKit operations",
                  );
                  return;
                }

                console.log("[Cleanup] Initializing CloudKit schema...");
                await iosBridgeService.initializeCloudKitSchema();
                console.log("[Cleanup] ✓ CloudKit schema initialized");

                // Step 2: Setup subscriptions (after zone is initialized)
                try {
                  await iosBridgeService.setupCloudKitSubscriptions();
                  console.log(
                    "[Cleanup] ✓ CloudKit subscriptions setup completed",
                  );
                } catch (error) {
                  console.warn(
                    "[Cleanup] ⚠️ CloudKit subscriptions setup failed (will retry later):",
                    error,
                  );
                  // Don't throw - subscriptions can be retried later
                }

                // Step 3: Trigger incremental sync (only if initial sync already completed)
                const syncStatus =
                  await iosBridgeService.isInitialSyncCompleted();
                if (syncStatus.completed) {
                  try {
                    const result =
                      await iosBridgeService.syncFromCloudKitIncremental(false);
                    if (result.success) {
                      console.log(
                        `[Cleanup] ✓ CloudKit incremental sync completed - Updated: ${result.updatedCount} records`,
                      );
                      // Invalidate React Query to refresh UI
                      queryClient.invalidateQueries({
                        queryKey: ["notifications"],
                      });
                      queryClient.invalidateQueries({
                        queryKey: ["app-state"],
                      });
                    } else {
                      console.warn(
                        `[Cleanup] ⚠️ CloudKit incremental sync failed`,
                      );
                    }
                  } catch (error) {
                    console.warn(
                      `[Cleanup] ⚠️ CloudKit incremental sync error:`,
                      error,
                    );
                  }
                } else {
                  console.log(
                    "[Cleanup] Initial sync not completed yet, will be triggered by schema initialization",
                  );
                }

                // Step 4: Push to CloudKit any notifications saved by NSE that didn't make it (no cursor or after cursor)
                try {
                  const retryResult =
                    await iosBridgeService.retryNSENotificationsToCloudKit();
                  if (retryResult.count > 0) {
                    console.log(
                      `[Cleanup] ✓ NSE retry to CloudKit: pushed ${retryResult.count} notification(s)`,
                    );
                    queryClient.invalidateQueries({
                      queryKey: ["notifications"],
                    });
                    queryClient.invalidateQueries({ queryKey: ["app-state"] });
                  }
                } catch (error) {
                  console.warn(
                    "[Cleanup] ⚠️ NSE retry to CloudKit failed:",
                    error,
                  );
                }
              } catch (error) {
                console.error(
                  "[Cleanup] Error during CloudKit/WC operations:",
                  error,
                );
                // Don't throw - this is not critical for cleanup
              }
            }, "CloudKit/WC initialization and sync")
              .catch(() => {})
              .finally(() => {
                globalCloudKitInFlight = null;
              });

            await globalCloudKitInFlight;
          }
        } finally {
          globalCleanupLastFinishedAtMs = Date.now();
          globalCleanupInFlight = null;
        }
      })();

      return globalCleanupInFlight;
    },
    [queryClient, refreshAll, notificationCallbacks, versions],
  );

  return { cleanup };
};
