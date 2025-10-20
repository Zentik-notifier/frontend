/**
 * React Query hooks for bucket queries
 * Provides hooks for fetching and managing buckets with React Query
 */

import {
    GetBucketQuery,
    Permission,
    useGetBucketLazyQuery
} from '@/generated/gql-operations-generated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';
import { notificationKeys } from './useNotificationQueries';
import { saveBucket } from '@/db/repositories/buckets-repository';

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
 * @param options.autoFetch - If true, automatically fetches full bucket details (with permissions) on mount
 * @param options.userId - User ID for permission checks (optional, for breaking circular dependencies)
 * 
 * @example
 * ```tsx
 * // Basic usage - reads from global cache only
 * const { bucket, isSnoozed } = useBucket('bucket-id', { userId });
 * 
 * // Auto-fetch permissions on mount (for EditBucket, etc.)
 * const { bucket, canAdmin, canDelete } = useBucket('bucket-id', { autoFetch: true, userId });
 * ```
 */
export function useBucket(
    bucketId?: string,
    options?: { autoFetch?: boolean; userId?: string }
): BucketWithPermissions {
    const queryClient = useQueryClient();
    const { autoFetch = false, userId } = options || {};

    // Use lazy query ONLY for manual refetch (via useRefreshBucket)
    const [getBucket] = useGetBucketLazyQuery({
        fetchPolicy: 'network-only',
    });

    // Read bucket details from separate query (for permissions and full data)
    // This query is populated by manual refetch via useRefreshBucket OR autoFetch
    const { data: bucketDetail, isLoading: loadingDetail, error } = useQuery({
        queryKey: bucketKeys.detail(bucketId!),
        queryFn: async () => {
            console.log(`[useBucket] Fetching bucket ${bucketId} details from GraphQL...`);
            const { data } = await getBucket({ variables: { id: bucketId! } });
            return data?.bucket ?? null;
        },
        enabled: autoFetch && !!bucketId, // ✅ Auto-fetch if option is enabled
        staleTime: Infinity,
        gcTime: Infinity,
    });

    // Read bucket from GLOBAL bucketsStats cache for basic info
    const bucketsStats = queryClient.getQueryData<any[]>(['notifications', 'bucketsStats']);
    const bucketFromGlobal = bucketsStats?.find((b: any) => b.id === bucketId);

    // Use bucketDetail if manually fetched (has permissions), otherwise use bucketFromGlobal
    // bucketFromGlobal has: id, name, description, icon, color, isSnoozed, snoozeUntil, etc.
    // bucketDetail has: full BucketFragment with permissions, user, userBucket
    const bucket = bucketDetail ?? (bucketFromGlobal as any) ?? null;
    
    // Loading state logic:
    // - If autoFetch is enabled: loading = true when fetching and no data yet
    // - If autoFetch is disabled: loading = true only when manually fetching and no fallback data
    const loading = autoFetch 
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

        // If no bucket or userId, return empty permissions
        if (!userId || !bucketId || !bucket) {
            return {
                bucket: bucket ?? null,
                isSnoozed,
                loading,
                error: error ?? null,
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
            canDelete: bucket.userPermissions.canDelete,
            canAdmin: bucket.userPermissions.canAdmin,
            canWrite: bucket.userPermissions.canWrite,
            canRead: bucket.userPermissions.canRead,
            isOwner: bucket.userPermissions.isOwner,
            isSharedWithMe: bucket.userPermissions.isSharedWithMe,
            sharedCount: bucket.userPermissions.sharedCount,
            allPermissions,
        };
    }, [userId, bucket, bucketId, loading, error, isSnoozedFromGlobal]);
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

            // 3. Update the bucket in global bucketsStats cache
            queryClient.setQueryData<any[]>(notificationKeys.bucketsStats(), (old) => {
                if (!old) return old;
                
                return old.map(bucket => {
                    if (bucket.id === bucketId) {
                        console.log(`[refreshBucket] Updating bucket ${bucketId} in bucketsStats cache`);
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
                        };
                    }
                    return bucket;
                });
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
