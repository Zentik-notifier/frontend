/**
 * React Query hooks for bucket queries
 * Provides hooks for fetching and managing buckets with React Query
 */

import { useAppContext } from '@/contexts/AppContext';
import {
    GetBucketQuery,
    GetBucketsQuery,
    Permission,
    useGetBucketLazyQuery,
    useGetBucketsLazyQuery,
} from '@/generated/gql-operations-generated';
import { useQuery, useQueryClient, UseQueryResult } from '@tanstack/react-query';
import { useEffect, useMemo, useState } from 'react';

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
 * Hook for fetching a single bucket with permissions
 * Replaces useGetBucketData from Apollo
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

    // Local state for bucket data
    const [bucketData, setBucketData] = useState<BucketDetailData | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    // Use lazy query to prevent Apollo from caching bucket data
    const [getBucket] = useGetBucketLazyQuery({
        fetchPolicy: 'network-only', // Don't use Apollo cache
    });

    // Fetch bucket when bucketId changes
    useEffect(() => {
        if (bucketId) {
            setLoading(true);
            getBucket({ variables: { id: bucketId } })
                .then((result) => {
                    setBucketData(result.data?.bucket ?? null);
                    setError(result.error ?? null);
                })
                .catch((err) => {
                    setError(err);
                    setBucketData(null);
                })
                .finally(() => {
                    setLoading(false);
                });
        } else {
            setBucketData(null);
            setLoading(false);
            setError(null);
        }
    }, [bucketId, getBucket]);

    const bucket = bucketData;

    return useMemo(() => {
        // Calculate isSnoozed
        const isSnoozed = bucket?.userBucket?.snoozeUntil
            ? new Date().getTime() < new Date(bucket.userBucket.snoozeUntil).getTime()
            : false;

        // If no bucket or userId, return empty permissions
        if (!userId || !bucketId || !bucket) {
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

        // Check if user is the owner
        const bucketUserId = bucket.user?.id;
        const isOwner = bucketUserId ? bucketUserId === userId : false;

        // Get all permissions
        const allPermissions = bucket.permissions || [];
        const sharedCount = allPermissions.length;

        // Find permissions for current user
        const userPermissions = allPermissions.find(
            (permission) => permission.user.id === userId
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
    }, [userId, bucket, bucketId, loading, error]);
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
            console.log(`[refreshBucket] Refreshing bucket ${bucketId} from GraphQL...`);

            // 1. Fetch fresh data from GraphQL API
            await getBucket({ variables: { id: bucketId } });

            // 2. Invalidate React Query cache to trigger re-renders
            await queryClient.invalidateQueries({
                queryKey: bucketKeys.detail(bucketId),
            });

            // 3. Also invalidate all buckets list
            await queryClient.invalidateQueries({
                queryKey: bucketKeys.lists(),
            });

            console.log(`[refreshBucket] Bucket ${bucketId} refreshed successfully`);
        } catch (error) {
            console.error('[refreshBucket] Error refreshing bucket:', error);
            throw error;
        }
    };

    return refreshBucket;
}
