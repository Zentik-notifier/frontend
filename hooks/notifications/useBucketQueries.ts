/**
 * React Query hooks for bucket queries
 * Provides hooks for fetching and managing buckets with React Query
 */

import { useAppContext } from '@/contexts/AppContext';
import {
    GetBucketQuery,
    Permission,
    useGetBucketLazyQuery
} from '@/generated/gql-operations-generated';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useMemo } from 'react';

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
 * Hook for reading a single bucket from GLOBAL bucketsStats cache
 * Reads from GLOBAL bucketsStats cache (populated by useCleanup)
 * Only fetches from GraphQL when manually called via useRefreshBucket
 * 
 * @example
 * ```tsx
 * const { 
 *   bucket, 
 *   isSnoozed,
 *   canDelete, 
 *   canAdmin,
 *   isOwner,
 *   loading 
 * } = useBucket('bucket-id');
 * ```
 */
export function useBucket(bucketId?: string): BucketWithPermissions {
    const { userId } = useAppContext();
    const queryClient = useQueryClient();

    // Use lazy query ONLY for manual refetch (via useRefreshBucket)
    const [getBucket] = useGetBucketLazyQuery({
        fetchPolicy: 'network-only',
    });

    // Read bucket details from separate query (for permissions and full data)
    // This query is populated ONLY by manual refetch via useRefreshBucket
    const { data: bucketDetail, isLoading: loadingDetail, error } = useQuery({
        queryKey: bucketKeys.detail(bucketId!),
        queryFn: async () => {
            console.log(`[useBucket] Fetching bucket ${bucketId} details from GraphQL...`);
            const { data } = await getBucket({ variables: { id: bucketId! } });
            return data?.bucket ?? null;
        },
        enabled: false, // ✅ MANUAL FETCH ONLY via useRefreshBucket
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
    const loading = loadingDetail && !bucketFromGlobal; // Only loading if no global data
    
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

        // Check if bucket has full details (fetched via useRefreshBucket)
        const hasFullDetails = bucket.user !== undefined && bucket.permissions !== undefined;

        // If no full details (using bucketFromGlobal), return basic info without permissions
        if (!hasFullDetails) {
            return {
                bucket,
                isSnoozed,
                loading,
                error,
                canDelete: false, // Unknown without full details
                canAdmin: false,
                canWrite: false,
                canRead: false,
                isOwner: false,
                isSharedWithMe: false,
                sharedCount: 0,
                allPermissions: [],
            };
        }

        // Check if user is the owner
        const bucketUserId = bucket.user?.id;
        const isOwner = bucketUserId ? bucketUserId === userId : false;

        // Get all permissions
        const allPermissions = bucket.permissions || [];
        const sharedCount = allPermissions.length;

        // Find permissions for current user
        const userPermissions = allPermissions.find(
            (permission: any) => permission.user.id === userId
        );

        // If no specific permissions found, but user is owner, they have all permissions
        if (!userPermissions) {
            if (isOwner) {
                return {
                    bucket,
                    isSnoozed,
                    loading,
                    error,
                    canDelete: true,
                    canAdmin: true,
                    canWrite: true,
                    canRead: true,
                    isOwner: true,
                    isSharedWithMe: false,
                    sharedCount,
                    allPermissions,
                };
            } else {
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
                    allPermissions,
                };
            }
        }

        // Check specific permissions
        const permissions = userPermissions.permissions;
        const canRead =
            permissions.includes(Permission.Read) ||
            permissions.includes(Permission.Admin);
        const canWrite =
            permissions.includes(Permission.Write) ||
            permissions.includes(Permission.Admin);
        const canDelete =
            permissions.includes(Permission.Delete) ||
            permissions.includes(Permission.Admin) ||
            isOwner;
        const canAdmin = permissions.includes(Permission.Admin) || isOwner;

        // If user has permissions but is not owner, then bucket is shared with them
        const isSharedWithMe = !isOwner && permissions.length > 0;

        return {
            bucket,
            isSnoozed,
            loading,
            error,
            canDelete,
            canAdmin,
            canWrite,
            canRead,
            isOwner,
            isSharedWithMe,
            sharedCount,
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

            // 2. Set data directly in React Query cache for this bucket
            queryClient.setQueryData(bucketKeys.detail(bucketId), freshBucket);

            console.log(`[refreshBucket] Bucket ${bucketId} refreshed successfully and cached`);
        } catch (error) {
            console.error('[refreshBucket] Error refreshing bucket:', error);
            throw error;
        }
    };

    return refreshBucket;
}
