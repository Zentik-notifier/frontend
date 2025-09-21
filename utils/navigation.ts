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

        navigateToEditBucket: (bucketId: string, fromHome: boolean = true) => {
            if (isTabletOrDesktop) {
                if (fromHome) {
                    router.push(`/(tablet)/private/(home)/edit-bucket/${bucketId}`);
                } else {
                    router.push(`/(tablet)/private/(settings)/edit-bucket/${bucketId}`);
                }
            } else {
                router.push(`/(mobile)/private/edit-bucket?bucketId=${bucketId}`);
            }
        },

        navigateToCreateBucket: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/create-bucket");
            } else {
                router.push("/(mobile)/private/create-bucket");
            }
        },

        navigateToCreateAccessToken: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/create-access-token");
            } else {
                router.push("/(mobile)/private/create-access-token");
            }
        },

        navigateToCreateWebhook: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/create-webhook");
            } else {
                router.push("/(mobile)/private/create-webhook");
            }
        },

        navigateToEditWebhook: (webhookId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/(tablet)/private/(settings)/edit-webhook/${webhookId}`);
            } else {
                router.push(`/(mobile)/private/edit-webhook?id=${webhookId}`);
            }
        },

        navigateToSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)");
            } else {
                router.push("/(mobile)/private/settings");
            }
        },

        navigateToAppSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/app-settings");
            } else {
                router.push("/(mobile)/private/app-settings");
            }
        },

        navigateToUserProfile: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/user-profile");
            } else {
                router.push("/(mobile)/private/user-profile");
            }
        },

        navigateToBucketsSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/buckets-settings");
            } else {
                router.push("/(mobile)/private/buckets-settings");
            }
        },

        navigateToAccessTokensSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/access-tokens-settings");
            } else {
                router.push("/(mobile)/private/access-tokens-settings");
            }
        },

        navigateToWebhooksSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/webhooks-settings");
            } else {
                router.push("/(mobile)/private/webhooks-settings");
            }
        },

        navigateToDevicesSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/devices-settings");
            } else {
                router.push("/(mobile)/private/devices-settings");
            }
        },

        navigateToNotificationsSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/notifications-settings");
            } else {
                router.push("/(mobile)/private/notifications-settings");
            }
        },

        navigateToUserSessionsSettings: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/user-sessions-settings");
            } else {
                router.push("/(mobile)/private/user-sessions-settings");
            }
        },

        navigateToLogs: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(settings)/logs");
            } else {
                router.push("/(mobile)/private/logs");
            }
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