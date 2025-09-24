import { BucketFragment, NotificationFragment, Permission, useGetBucketQuery } from '@/generated/gql-operations-generated';
import { useAppContext } from '@/services/app-context';
import { keyBy } from 'lodash';
import { useMemo } from 'react';

export function useGetBucketData(bucketId?: string) {
    const { userId } = useAppContext();

    const bucketSrcData = useGetBucketQuery({
        fetchPolicy: 'cache-and-network',
        variables: { id: bucketId || '' },
        skip: !bucketId,
    });
    const { data, loading, error } = bucketSrcData;
    const bucket = data?.bucket;

    return useMemo(() => {
        const isSnoozed = bucket?.userBucket?.snoozeUntil ?
            new Date().getTime() < new Date(bucket.userBucket.snoozeUntil).getTime() :
            false;
        const bucketData = {
            ...bucketSrcData,
            bucket,
            isSnoozed,
        }

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

interface BucketStats {
    id: string;
    name: string;
    description: string | null;
    color: string | null;
    icon: string | null;
    totalMessages: number;
    unreadCount: number;
    lastNotificationAt: string | null;
}

export const getBucketStats = (buckets: BucketFragment[], notifications: NotificationFragment[]) => {
    const bucketData: Record<string, BucketStats> = {};
    const bucketsById = keyBy(buckets, "id");
    const notificationToBucketMap = new Map<string, string>();

    const checkBucketsData = (bucket: BucketFragment) => {
        const bucketId = bucket.id;
        if (!bucketData[bucketId]) {
            bucketData[bucketId] = {
                color: bucket?.color,
                icon: bucket?.icon,
                name: bucket?.name,
                description: bucket?.description,
                id: bucketId,
                totalMessages: 0,
                unreadCount: 0,
                lastNotificationAt: null,
            };
        }
    }

    buckets.forEach(checkBucketsData);

    notifications.forEach((notification) => {
        const bucket = notification.message?.bucket;
        const bucketId = bucket?.id;
        if (bucketId) {
            checkBucketsData(bucket)
            notificationToBucketMap.set(notification.id, bucketId);
            bucketData[bucketId].totalMessages++;
            if (!notification.readAt) {
                bucketData[bucketId].unreadCount++;
            }
            if (
                !bucketData[bucketId].lastNotificationAt ||
                new Date(notification.createdAt).getTime() >
                new Date(bucketData[bucketId].lastNotificationAt).getTime()
            ) {
                bucketData[bucketId].lastNotificationAt = notification.createdAt;
            }
        }
    });

    const bucketStats = Object.values(bucketData).sort((a, b) => {
        // 1) unreadCount desc
        if (a.unreadCount !== b.unreadCount) {
            return b.unreadCount - a.unreadCount;
        }
        // 2) lastNotificationAt desc (nulls last)
        const aTime = a.lastNotificationAt ? new Date(a.lastNotificationAt).getTime() : 0;
        const bTime = b.lastNotificationAt ? new Date(b.lastNotificationAt).getTime() : 0;
        if (aTime !== bTime) {
            return bTime - aTime;
        }
        // 3) name asc (fallback empty string)
        const aName = a.name || '';
        const bName = b.name || '';
        return aName.localeCompare(bName);
    });

    return {
        bucketStats,
        notificationToBucketMap,
    }
};