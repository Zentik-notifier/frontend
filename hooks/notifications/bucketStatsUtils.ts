import { BucketFragment, NotificationFragment } from "@/generated/gql-operations-generated";
import { keyBy } from "@/utils/array-utils";

/**
 * In-memory bucket statistics calculated from arrays
 * Used for sidebar bucket list display
 */
export interface SidebarBucketStats {
    bucket: BucketFragment;
    isDangling: boolean;
    color: string | null;
    icon: string | null;
    name: string;
    description?: string | null;
    id: string;
    totalMessages: number;
    unreadCount: number;
    lastNotificationAt: string | null;
}

/**
 * Calculate bucket statistics from buckets and notifications arrays
 * Used for in-memory stats calculation in the sidebar
 */
export const getBucketStats = (
    buckets: BucketFragment[], 
    notifications: NotificationFragment[]
) => {
    const bucketData: Record<string, SidebarBucketStats> = {};
    const bucketsById = keyBy(buckets, "id");
    const notificationToBucketMap = new Map<string, string>();

    const checkBucketsData = (bucket: BucketFragment) => {
        const bucketId = bucket.id;
        if (!bucketData[bucketId]) {
            bucketData[bucketId] = {
                bucket,
                isDangling: !bucketsById[bucketId],
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
