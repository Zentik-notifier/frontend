import { router } from "expo-router";
import { useDeviceType } from "@/hooks/useDeviceType";

export function useNavigationUtils() {
    const { isTablet, isDesktop } = useDeviceType();
    const isTabletOrDesktop = isTablet || isDesktop;
    const basePath = isTabletOrDesktop ? "/(tablet)" : "/(mobile)";

    return {
        navigateToNotificationDetail: (notificationId: string) => {
            router.push(`${basePath}/private/notification-detail?id=${notificationId}`);
        },

        navigateToBucketDetail: (bucketId: string) => {
            router.push(`${basePath}/private/bucket-detail?id=${bucketId}`);
        },

        navigateToSettings: () => {
            router.push(`${basePath}/private/settings`);
        },

        navigateToAdmin: () => {
            router.push(`${basePath}/private/admin`);
        },

        navigateToHome: () => {
            router.push(`${basePath}/private/home`);
        },

        isTabletOrDesktop,
    };
}