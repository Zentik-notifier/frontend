/**
 * Hook for network sync and cache merging
 * Handles fetching from network and merging with local cache
 */

import {
    BucketData,
    getAllBuckets,
    saveBuckets
} from '@/db/repositories/buckets-repository';
import {
    getNotificationStats,
} from '@/db/repositories/notifications-query-repository';
import {
    GetBucketsQuery,
    NotificationFragment,
    useGetBucketsLazyQuery,
    useGetNotificationsLazyQuery,
    useUpdateReceivedNotificationsMutation
} from '@/generated/gql-operations-generated';
import {
    getAllNotificationsFromCache,
    upsertNotificationsBatch,
} from '@/services/notifications-repository';
import { settingsService } from '@/services/settings-service';
import {
    BucketWithStats
} from '@/types/notifications';
import { useCallback, useContext, useRef } from 'react';
import { AppContext } from '@/contexts/AppContext';
import { useQueryClient } from '@tanstack/react-query';

// Type for bucket from GetBucketsQuery (includes userBucket)
type BucketWithUserData = NonNullable<GetBucketsQuery['buckets']>[number];

export interface NetworkSyncResult {
    networkTime: number;
    mergeTime: number;
}

export function useNetworkSync() {
    const queryClient = useQueryClient();
    const appContext = useContext(AppContext);
    const lastUserId = appContext?.lastUserId ?? null;
    const [updateReceivedNotifications] = useUpdateReceivedNotificationsMutation();

    // Use lazy queries for manual control
    const [fetchBuckets] = useGetBucketsLazyQuery({
        fetchPolicy: 'network-only',
    });
    const [fetchNotifications] = useGetNotificationsLazyQuery({
        fetchPolicy: 'network-only',
    });

    // Prevent bursty triggers (e.g. multiple CloudKit invalidations) from running
    // multiple concurrent network syncs that race and cause repeated upserts.
    const syncInFlightRef = useRef<Promise<NetworkSyncResult> | null>(null);

    const syncFromNetwork = useCallback(async (): Promise<NetworkSyncResult> => {
        if (!lastUserId) {
            return { networkTime: 0, mergeTime: 0 };
        }
        if (syncInFlightRef.current) {
            // console.log('[useNetworkSync] Sync already in-flight; awaiting');
            return await syncInFlightRef.current;
        }

        const run = (async (): Promise<NetworkSyncResult> => {
        let networkTime = 0;
        let mergeTime = 0;

        try {
            // ============================================================
            // PHASE 1: FETCH FROM NETWORK
            // ============================================================
            const networkStart = performance.now();
            const [notificationsResult, bucketsResult] = await Promise.allSettled([
                fetchNotifications(),
                fetchBuckets(),
            ]);
            networkTime = performance.now() - networkStart;

            // Process notifications from API
            let apiNotifications: NotificationFragment[] = [];
            if (notificationsResult.status === 'fulfilled' && notificationsResult.value.data?.notifications) {
                apiNotifications = notificationsResult.value.data.notifications as NotificationFragment[];

                if (apiNotifications.length > 0) {
                    // Load existing notifications once and only persist new ones
                    const existingNotifications = await getAllNotificationsFromCache();
                    const existingIds = new Set(existingNotifications.map((n) => n.id));

                    const newNotifications = apiNotifications.filter(
                        (n) => !existingIds.has(n.id)
                    );

                    if (newNotifications.length > 0) {
                        await upsertNotificationsBatch(newNotifications);
                    }

                    // Client-side receivedAt sync: inform backend up to the newest notification
                    try {
                        const latestNotificationId = apiNotifications[0]?.id;
                        if (latestNotificationId) {
                            const lastSeenId = settingsService.getSettings().notificationsLastSeenId;

                            // Only call backend if we have a newer ID than what we've already reported
                            if (!lastSeenId || latestNotificationId > lastSeenId) {
                                console.log(
                                    '[useNetworkSync] Updating received notifications up to ID:',
                                    latestNotificationId,
                                    '(previous lastSeenId:',
                                    lastSeenId,
                                    ')'
                                );
                                await updateReceivedNotifications({
                                    variables: { id: latestNotificationId },
                                });
                                await settingsService.setNotificationsLastSeenId(latestNotificationId);
                            }
                        }
                    } catch (error) {
                        console.warn('[useNetworkSync] Failed to update received notifications on backend:', error);
                    }
                }
            }

            // Process buckets from API
            let apiBuckets: BucketWithUserData[] = [];
            let apiSuccess = false;

            if (bucketsResult.status === 'fulfilled' && bucketsResult.value.data?.buckets) {
                apiBuckets = bucketsResult.value.data.buckets as BucketWithUserData[];
                apiSuccess = true;

                // Debug: check iconUrl for shared buckets
                const sharedBuckets = apiBuckets.filter(b => b.userPermissions?.isSharedWithMe === true);
                if (sharedBuckets.length > 0) {
                    console.log(`[useNetworkSync] Found ${sharedBuckets.length} shared buckets`);
                    sharedBuckets.forEach(bucket => {
                        console.log(`[useNetworkSync] Shared bucket ${bucket.id} (${bucket.name}): iconUrl=${bucket.iconUrl ?? 'MISSING'}, icon=${bucket.icon ?? 'null'}, iconAttachmentUuid=${bucket.iconAttachmentUuid ?? 'null'}`);
                    });
                }
            }

            // ============================================================
            // PHASE 2: MERGE WITH CACHE
            // ============================================================
            if (apiSuccess && apiBuckets.length > 0) {
                const mergeStart = performance.now();

                // Load current cache state
                const cachedBuckets = await getAllBuckets();

                // Recalculate stats after API sync
                const updatedStats = await getNotificationStats([]);
                const updatedBucketFromNotifications = updatedStats.byBucket ?? [];

                // API is available: merge API buckets with orphans
                const apiBucketIds = new Set(apiBuckets.map(b => b.id));

                // Identify orphans: buckets in cache but NOT in API
                const orphanedCachedBuckets = cachedBuckets.filter(b => !apiBucketIds.has(b.id));

                // Also check notification stats for buckets not in API (true orphans)
                const orphanedFromNotifications = updatedBucketFromNotifications
                    .filter(bucket => !apiBucketIds.has(bucket.bucketId))
                    .map(bucket => bucket.bucketId);

                const allOrphanIds = new Set([
                    ...orphanedCachedBuckets.map(b => b.id),
                    ...orphanedFromNotifications
                ]);

                // Convert API buckets to BucketWithStats
                const apiBucketsWithStats: BucketWithStats[] = apiBuckets.map((bucket) => {
                    const bucketStat = updatedStats.byBucket?.find(s => s.bucketId === bucket.id);
                    const snoozeUntil = bucket.userBucket?.snoozeUntil;
                    const isSnoozed = snoozeUntil
                        ? new Date().getTime() < new Date(snoozeUntil).getTime()
                        : false;

                    return {
                        id: bucket.id,
                        name: bucket.name,
                        description: bucket.description,
                        icon: bucket.icon,
                        iconAttachmentUuid: bucket.iconAttachmentUuid,
                        iconUrl: bucket.iconUrl,
                        color: bucket.color,
                        createdAt: bucket.createdAt,
                        updatedAt: bucket.updatedAt,
                        isProtected: bucket.isProtected,
                        isPublic: bucket.isPublic,
                        isAdmin: bucket.isAdmin,
                        preset: bucket.preset ?? null,
                        externalNotifySystem: bucket.externalNotifySystem ?? null,
                        externalSystemChannel: bucket.externalSystemChannel ?? null,
                        totalMessages: bucketStat?.totalCount ?? 0,
                        unreadCount: bucketStat?.unreadCount ?? 0,
                        lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                        isSnoozed,
                        snoozeUntil: snoozeUntil ?? null,
                        user: bucket.user,
                        permissions: bucket.permissions,
                        userPermissions: bucket.userPermissions,
                        userBucket: bucket.userBucket,
                        magicCode: bucket.userBucket?.magicCode ?? null,
                        isOrphan: false,
                    };
                });

                // Create orphaned bucket entries
                const orphanedBuckets: BucketWithStats[] = Array.from(allOrphanIds).map(orphanId => {
                    const cachedBucket = cachedBuckets.find(b => b.id === orphanId);
                    const bucketStat = updatedStats.byBucket?.find(s => s.bucketId === orphanId);
                    const notificationBucket = updatedBucketFromNotifications.find(b => b.bucketId === orphanId);

                    if (cachedBucket) {
                        return {
                            id: cachedBucket.id,
                            name: cachedBucket.name,
                            description: cachedBucket.description,
                            icon: cachedBucket.icon,
                            iconAttachmentUuid: cachedBucket.iconAttachmentUuid,
                            iconUrl: cachedBucket.iconUrl,
                            color: cachedBucket.color,
                            createdAt: cachedBucket.createdAt,
                            updatedAt: cachedBucket.updatedAt,
                            isProtected: cachedBucket.isProtected ?? false,
                            isPublic: cachedBucket.isPublic ?? false,
                            isAdmin: cachedBucket.isAdmin ?? false,
                            preset: cachedBucket.preset ?? null,
                            externalNotifySystem: cachedBucket.externalNotifySystem ?? null,
                            externalSystemChannel: cachedBucket.externalSystemChannel ?? null,
                            totalMessages: bucketStat?.totalCount ?? 0,
                            unreadCount: bucketStat?.unreadCount ?? 0,
                            lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                            isSnoozed: false,
                            snoozeUntil: null,
                            user: cachedBucket.user,
                            permissions: cachedBucket.permissions ?? [],
                            userPermissions: cachedBucket.userPermissions,
                            userBucket: cachedBucket.userBucket,
                            magicCode: cachedBucket.userBucket?.magicCode ?? null,
                            isOrphan: true,
                        };
                    } else {
                        return {
                            id: orphanId,
                            name: notificationBucket?.bucketName ?? `Bucket ${orphanId.slice(0, 8)}`,
                            description: null,
                            icon: null,
                            iconAttachmentUuid: null,
                            iconUrl: null,
                            color: null,
                            createdAt: new Date().toISOString(),
                            updatedAt: new Date().toISOString(),
                            isProtected: false,
                            isPublic: false,
                            isAdmin: false,
                            preset: null,
                            externalNotifySystem: null,
                            externalSystemChannel: null,
                            totalMessages: bucketStat?.totalCount ?? 0,
                            unreadCount: bucketStat?.unreadCount ?? 0,
                            lastNotificationAt: bucketStat?.lastNotificationDate ?? null,
                            isSnoozed: false,
                            snoozeUntil: null,
                            user: null,
                            permissions: [],
                            userBucket: null,
                            isOrphan: true,
                        };
                    }
                });

                // Save API buckets + orphans to cache
                const bucketsToSave: BucketData[] = [
                    ...apiBuckets.map(bucket => {
                        // Debug: log if iconUrl is missing for shared buckets
                        if (bucket.userPermissions?.isSharedWithMe === true && !bucket.iconUrl) {
                            console.warn(`[useNetworkSync] ⚠️ Shared bucket ${bucket.id} (${bucket.name}) missing iconUrl from GraphQL`);
                        }
                        return {
                            id: bucket.id,
                            name: bucket.name,
                            icon: bucket.icon,
                            iconAttachmentUuid: bucket.iconAttachmentUuid,
                            iconUrl: bucket.iconUrl,
                            description: bucket.description,
                            updatedAt: bucket.updatedAt,
                            color: bucket.color,
                            createdAt: bucket.createdAt,
                            isProtected: bucket.isProtected,
                            isPublic: bucket.isPublic,
                            isAdmin: bucket.isAdmin,
                            preset: bucket.preset ?? null,
                            externalNotifySystem: bucket.externalNotifySystem ?? null,
                            externalSystemChannel: bucket.externalSystemChannel ?? null,
                            userBucket: bucket.userBucket,
                            user: bucket.user,
                            permissions: bucket.permissions,
                            userPermissions: bucket.userPermissions,
                            isOrphan: false,
                        };
                    }),
                    ...orphanedBuckets.map(bucket => ({
                        id: bucket.id,
                        name: bucket.name,
                        icon: bucket.icon,
                        iconAttachmentUuid: bucket.iconAttachmentUuid,
                        iconUrl: bucket.iconUrl,
                        description: bucket.description,
                        updatedAt: bucket.updatedAt,
                        color: bucket.color,
                        createdAt: bucket.createdAt,
                        isProtected: bucket.isProtected,
                        isPublic: bucket.isPublic,
                        isAdmin: bucket.isAdmin ?? false,
                        preset: bucket.preset ?? null,
                        externalNotifySystem: bucket.externalNotifySystem ?? null,
                        externalSystemChannel: bucket.externalSystemChannel ?? null,
                        userBucket: bucket.userBucket,
                        user: bucket.user,
                        permissions: bucket.permissions,
                        userPermissions: bucket.userPermissions,
                        isOrphan: true,
                    }))
                ];

                // Always save all buckets to local DB to ensure the JSON fragment
                // contains all fields (e.g. externalNotifySystem, userPermissions).
                // The previous updatedAt-only filter could leave stale fragments in the DB
                // when new fields were added without changing updatedAt.
                // Bucket count is typically small (tens), so the write cost is negligible.
                if (bucketsToSave.length > 0) {
                    await saveBuckets(bucketsToSave);
                }

                // Combine all buckets
                const mergedBuckets = [...apiBucketsWithStats, ...orphanedBuckets];
                mergedBuckets.sort((a, b) => {
                    if (a.unreadCount !== b.unreadCount) {
                        return b.unreadCount - a.unreadCount;
                    }
                    const aTime = a.lastNotificationAt ? new Date(a.lastNotificationAt).getTime() : 0;
                    const bTime = b.lastNotificationAt ? new Date(b.lastNotificationAt).getTime() : 0;
                    if (aTime !== bTime) {
                        return bTime - aTime;
                    }
                    return a.name.localeCompare(b.name);
                });

                // Update React Query cache with merged data
                queryClient.setQueryData(['app-state'], {
                    buckets: mergedBuckets,
                    stats: updatedStats,
                    lastSync: new Date().toISOString(),
                });

                mergeTime = performance.now() - mergeStart;
            }

            return { networkTime, mergeTime };
        } catch (error) {
            console.error('[useNetworkSync] Error syncing from network:', error);
            throw error;
        }
        })();

        syncInFlightRef.current = run;
        try {
            return await run;
        } finally {
            if (syncInFlightRef.current === run) {
                syncInFlightRef.current = null;
            }
        }
    }, [lastUserId, fetchBuckets, fetchNotifications, queryClient, updateReceivedNotifications]);

    return { syncFromNetwork };
}

