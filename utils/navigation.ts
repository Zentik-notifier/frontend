import { router } from "expo-router";
import { useDeviceType } from "@/hooks/useDeviceType";

export function useNavigationUtils() {
    const { isTablet, isDesktop } = useDeviceType();
    const isTabletOrDesktop = isTablet || isDesktop;
    const basePath = isTabletOrDesktop ? "/(tablet)" : "/(mobile)";

    return {
        navigateToNotificationDetail: (notificationId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/(tablet)/private/(home)/notification-detail/${notificationId}`);
            } else {
                router.push(`/(mobile)/private/notification-detail?id=${notificationId}`);
            }
        },

        navigateToBucketDetail: (bucketId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/(tablet)/private/(home)/bucket/${bucketId}`);
            } else {
                router.push(`/(mobile)/private/bucket-detail?id=${bucketId}`);
            }
        },

        navigateToEditBucket: (bucketId: string, fromHome: boolean) => {
            if (isTabletOrDesktop) {
                if(fromHome) {
                    router.push(`/(tablet)/private/(home)/edit-bucket/${bucketId}`);
                } else {
                    // router.push(`/(tablet)/private/(settings)/edit-bucket/${bucketId}`);
                }
            } else {
                router.push(`/(mobile)/private/edit-bucket?bucketId=${bucketId}`);
            }
        },

        navigateToSettings: () => {
            router.push(`${basePath}/private/settings`);
        },

        navigateToAdmin: () => {
            router.push(`${basePath}/private/admin`);
        },

        navigateToHome: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(home)");
            } else {
                router.push("/(mobile)/private/(homeTabs)");
            }
        },

        navigateToLogin: () => {
            router.push(`${basePath}/public/login`);
        },

        isTabletOrDesktop,
    };
}