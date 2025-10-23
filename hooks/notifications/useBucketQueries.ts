/**
 * React Query hooks for bucket queries
 * Provides hooks for fetching and managing buckets with React Query
 */

import { saveBucket } from '@/db/repositories/buckets-repository';
import {
    GetBucketQuery,
    NotificationFragment,
    useGetBucketLazyQuery
} from '@/generated/gql-operations-generated';
import { BucketWithStats } from '@/types/notifications';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { useNotificationsState } from './useNotificationQueries';

// ====================
// TYPES
// ====================

/**
 * Type for bucket from GetBucketQuery (includes all nested data)
 */
export type BucketDetailData = NonNullable<GetBucketQuery['bucket']>;

/**
 * Bucket permissions and ownership info
 */
export interface BucketPermissions {
    canDelete: boolean;
    canAdmin: boolean;
    canWrite: boolean;
    canRead: boolean;
    isOwner: boolean;
    isSharedWithMe: boolean;
    sharedCount: number;
    allPermissions: BucketDetailData['permissions'];
}

/**
 * Complete bucket data with permissions
 */
export interface BucketWithPermissions extends BucketPermissions {
    bucket: BucketDetailData | null;
    isSnoozed: boolean;
    loading: boolean;
    error: any;
    isOrphan: boolean; // Bucket exists locally but not on remote server
}

// ====================
// QUERY KEYS
// ====================

export const bucketKeys = {
    all: ['buckets'] as const,
    lists: () => [...bucketKeys.all, 'list'] as const,
    list: () => [...bucketKeys.lists(), 'all'] as const,
    details: () => [...bucketKeys.all, 'detail'] as const,
    detail: (id: string) => [...bucketKeys.details(), id] as const,
};

// ====================
// QUERY HOOKS
// ====================

/**
 * Hook for fetching a single bucket by ID with permissions
 * Reads from GLOBAL bucketsStats cache for basic info
 * Use useRefreshBucket to manually fetch full bucket details with permissions from GraphQL
 * 
 * @param bucketId - The bucket ID to fetch
 * @param options - Hook options
 * @param options.autoFetch - If true, automatically fetches full bucket details (with permissions) ONLY if data is not available in appState
 * @param options.userId - User ID for permission checks (optional, for breaking circular dependencies)
 * 
 * @example
 * ```tsx
 * // Basic usage - reads from global cache only
 * const { bucket, isSnoozed } = useBucket('bucket-id', { userId });
 * 
 * // Auto-fetch permissions only if not in appState (for EditBucket, etc.)
 * const { bucket, canAdmin, canDelete } = useBucket('bucket-id', { autoFetch: true, userId });
 * ```
 */
export function useBucket(
    bucketId?: string,
    options?: { autoFetch?: boolean; userId?: string }
): BucketWithPermissions {
    const { autoFetch = false, userId } = options || {};

    // Get bucket info from app state (includes orphan status)
    const { data: appState, isLoading: appStateLoading } = useNotificationsState();
    const bucketFromGlobal = appState?.buckets.find((b) => b.id === bucketId);

    // Use lazy query ONLY for manual refetch (via useRefreshBucket)
    const [getBucket] = useGetBucketLazyQuery({
        fetchPolicy: 'network-only',
    });

    // Read bucket details from separate query (for permissions and full data)
    // This query is populated by manual refetch via useRefreshBucket OR autoFetch
    // BUT: Don't fetch if bucket is orphan (exists only through notifications)
    const { data: bucketDetail, isLoading: loadingDetail, error } = useQuery({
        queryKey: bucketKeys.detail(bucketId!),
        queryFn: async () => {
            console.log(`[useBucket] Fetching bucket ${bucketId} details from GraphQL...`);
            const { data } = await getBucket({ variables: { id: bucketId! } });
            return data?.bucket ?? null;
        },
        enabled: autoFetch && !!bucketId && !appStateLoading && !bucketFromGlobal?.isOrphan && !bucketFromGlobal,
        staleTime: Infinity,
        gcTime: Infinity,
    });

    // Use bucketDetail if manually fetched (has permissions), otherwise use bucketFromGlobal
    // bucketFromGlobal has: id, name, description, icon, color, isSnoozed, snoozeUntil, etc.
    // bucketDetail has: full BucketFragment with permissions, user, userBucket
    const bucket = bucketDetail ?? (bucketFromGlobal as any) ?? null;

    // Loading state logic:
    // - If appState is loading: loading = true (waiting for initial data)
    // - If bucket is orphan: never loading (no fetch will happen)
    // - If bucket data is available in appState: never loading (no fetch needed)
    // - If autoFetch is enabled: loading = true when fetching and no data yet
    // - If autoFetch is disabled: loading = true only when manually fetching and no fallback data
    const loading = appStateLoading
        ? true // App state is still initializing
        : bucketFromGlobal?.isOrphan
            ? false // Orphan buckets never load
            : bucketFromGlobal
                ? false // Data available in appState, no loading needed
                : autoFetch
                    ? loadingDetail && !bucketDetail  // With autoFetch: loading until we have full details
                    : loadingDetail && !bucketFromGlobal; // Without autoFetch: loading only if no global data

    // Get snooze info from global cache (always up-to-date from bucketsStats)
    const isSnoozedFromGlobal = bucketFromGlobal?.isSnoozed ?? false;

    return useMemo(() => {
        // Use snooze info from GLOBAL cache (always up-to-date)
        // Fallback to bucket.userBucket.snoozeUntil if not in global cache yet
        const isSnoozed = isSnoozedFromGlobal ?? (
            bucket?.userBucket?.snoozeUntil
                ? new Date().getTime() < new Date(bucket.userBucket.snoozeUntil).getTime()
                : false
        );

        // Check if bucket is orphan (exists locally but not on remote server)
        const isOrphan = bucketFromGlobal?.isOrphan ?? false;

        // If no bucket or userId, return empty permissions
        if (!userId || !bucketId || !bucket) {
            return {
                bucket: bucket ?? null,
                isSnoozed,
                loading,
                error: error ?? null,
                isOrphan: isOrphan ?? false,
                canDelete: false,
                canAdmin: false,
                canWrite: false,
                canRead: false,
                isOwner: false,
                isSharedWithMe: false,
                sharedCount: 0,
                allPermissions: [],
            };
        }

        // Get all permissions for allPermissions array
        const allPermissions = bucket.permissions || [];

        // Use userPermissions from backend (always available when bucket is fetched)
        if (!bucket.userPermissions) {
            // If userPermissions is not available, bucket data is incomplete
            return {
                bucket,
                isSnoozed,
                loading,
                error,
                isOrphan: isOrphan ?? false,
                canDelete: false,
                canAdmin: false,
                canWrite: false,
                canRead: false,
                isOwner: false,
                isSharedWithMe: false,
                sharedCount: 0,
                allPermissions: [],
            };
        }

        return {
            bucket,
            isSnoozed,
            loading,
            error,
            isOrphan: isOrphan ?? false,
            canDelete: bucket.userPermissions.canDelete,
            canAdmin: bucket.userPermissions.canAdmin,
            canWrite: bucket.userPermissions.canWrite,
            canRead: bucket.userPermissions.canRead,
            isOwner: bucket.userPermissions.isOwner,
            isSharedWithMe: bucket.userPermissions.isSharedWithMe,
            sharedCount: bucket.userPermissions.sharedCount,
            allPermissions,
        };
    }, [userId, bucket, bucketId, loading, error, isSnoozedFromGlobal, bucketFromGlobal, bucketDetail]);
}

/**
 * Hook for refreshing a specific bucket from the API
 * Forces a refetch from GraphQL and invalidates React Query cache
 * 
 * @example
 * ```tsx
 * const refreshBucket = useRefreshBucket();
 * await refreshBucket('bucket-id');
 * ```
 */
export function useRefreshBucket() {
    const queryClient = useQueryClient();
    const [getBucket] = useGetBucketLazyQuery({
        fetchPolicy: 'network-only',
    });

    const refreshBucket = async (bucketId: string): Promise<void> => {
        try {
            // Check if bucket is orphan before attempting to fetch
            const appState = queryClient.getQueryData<{
                buckets: BucketWithStats[];
                notifications: NotificationFragment[];
                stats: any;
                lastSync: string;
            }>(['app-state']);

            const bucketFromGlobal = appState?.buckets.find((b) => b.id === bucketId);

            if (bucketFromGlobal?.isOrphan) {
                console.log(`[refreshBucket] Skipping fetch for orphan bucket ${bucketId}`);
                return;
            }

            console.log(`[refreshBucket] Manually fetching bucket ${bucketId} from GraphQL...`);

            // 1. Fetch fresh data from GraphQL API
            const { data } = await getBucket({ variables: { id: bucketId } });
            const freshBucket = data?.bucket;

            if (!freshBucket) {
                console.warn(`[refreshBucket] Bucket ${bucketId} not found`);
                return;
            }

            // 2. Set data directly in React Query cache for this bucket detail
            queryClient.setQueryData(bucketKeys.detail(bucketId), freshBucket);

            // 3. Update the bucket in appState cache
            queryClient.setQueryData<{
                buckets: BucketWithStats[];
                notifications: NotificationFragment[];
                stats: any;
                lastSync: string;
            }>(['app-state'], (oldAppState) => {
                if (!oldAppState) return oldAppState;

                const updatedBuckets = oldAppState.buckets.map(bucket => {
                    if (bucket.id === bucketId) {
                        console.log(`[refreshBucket] Updating bucket ${bucketId} in appState cache`);
                        return {
                            ...bucket,
                            name: freshBucket.name,
                            description: freshBucket.description,
                            icon: freshBucket.icon,
                            iconAttachmentUuid: freshBucket.iconAttachmentUuid,
                            color: freshBucket.color,
                            updatedAt: freshBucket.updatedAt,
                            isProtected: freshBucket.isProtected,
                            isPublic: freshBucket.isPublic,
                            userBucket: freshBucket.userBucket,
                            user: freshBucket.user,
                            permissions: freshBucket.permissions,
                            isOrphan: false, // Mark as no longer orphan
                        };
                    }
                    return bucket;
                });

                return {
                    ...oldAppState,
                    buckets: updatedBuckets,
                };
            });

            // 4. Save to local DB
            await saveBucket({
                id: freshBucket.id,
                name: freshBucket.name,
                icon: freshBucket.icon,
                iconAttachmentUuid: freshBucket.iconAttachmentUuid,
                description: freshBucket.description,
                updatedAt: freshBucket.updatedAt,
                color: freshBucket.color,
                createdAt: freshBucket.createdAt,
                isProtected: freshBucket.isProtected,
                isPublic: freshBucket.isPublic,
                userBucket: freshBucket.userBucket,
                user: freshBucket.user,
                permissions: freshBucket.permissions,
            });

            console.log(`[refreshBucket] Bucket ${bucketId} refreshed successfully in all caches and DB`);
        } catch (error) {
            console.error('[refreshBucket] Error refreshing bucket:', error);
            throw error;
        }
    };

    return refreshBucket;
}
