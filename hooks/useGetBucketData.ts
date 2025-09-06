import { Permission, useGetBucketQuery } from '@/generated/gql-operations-generated';
import { useAppContext } from '@/services/app-context';
import { useMemo } from 'react';

export function useGetBucketData(bucketId?: string) {
    const { userId } = useAppContext();

    const bucketSrcData = useGetBucketQuery({
        variables: { id: bucketId || '' },
        skip: !bucketId,
    });
    const { data, loading, error } = bucketSrcData;
    const bucket = data?.bucket;
    const bucketData = {
        ...bucketSrcData,
        bucket
    }

    return useMemo(() => {
        if (!userId || !bucketId) {
            return {
                canDelete: false,
                canAdmin: false,
                canWrite: false,
                canRead: false,
                isOwner: false,
                isSharedWithMe: false,
                sharedCount: 0,
                allPermissions: [],
                ...bucketData,
            };
        }

        // Check if user is the owner of the bucket
        const bucketUserId = bucket?.user?.id;
        const isOwner = bucketUserId ? bucketUserId === userId : false;
        // Get all permissions for sharing calculations
        const allPermissions = bucket?.permissions || [];

        // Calculate shared count - show all permissions if user can admin
        const calculateSharedCount = () => {
            return allPermissions.length;
        };

        // Find permissions for current user
        const userPermissions = allPermissions?.find(
            permission => permission.user.id === userId
        );

        // If no specific permissions found, but user is owner, they have all permissions
        if (!userPermissions) {
            if (isOwner) {
                return {
                    canDelete: true,
                    canAdmin: true,
                    canWrite: true,
                    canRead: true,
                    isOwner: true,
                    isSharedWithMe: false,
                    sharedCount: calculateSharedCount(),
                    allPermissions,
                    ...bucketData,
                };
            } else {
                return {
                    canDelete: false,
                    canAdmin: false,
                    canWrite: false,
                    canRead: false,
                    isOwner: false,
                    isSharedWithMe: false,
                    sharedCount: 0,
                    allPermissions,
                    ...bucketData,
                };
            }
        }

        // Check specific permissions
        const permissions = userPermissions.permissions;
        const canRead = permissions.includes(Permission.Read) || permissions.includes(Permission.Admin);
        const canWrite = permissions.includes(Permission.Write) || permissions.includes(Permission.Admin);
        const canDelete = permissions.includes(Permission.Delete) || permissions.includes(Permission.Admin) || isOwner;
        const canAdmin = permissions.includes(Permission.Admin) || isOwner;

        // If user has permissions but is not owner, then bucket is shared with them
        const isSharedWithMe = !isOwner && permissions.length > 0;

        return {
            error,
            canDelete,
            canAdmin,
            canWrite,
            canRead,
            isOwner,
            isSharedWithMe,
            sharedCount: calculateSharedCount(),
            allPermissions,
            ...bucketData,
        };
    }, [userId, bucket, bucketId, loading]);
}
