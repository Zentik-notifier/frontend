import { router } from "expo-router";
import { useDeviceType } from "@/hooks/useDeviceType";

export function useNavigationUtils() {
    const { isTablet, isDesktop } = useDeviceType();
    const isTabletOrDesktop = isTablet || isDesktop;
    const basePath = isTabletOrDesktop ? "/(tablet)" : "/(mobile)";

    return {
        navigateToNotificationDetail: (notificationId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/home/notification-detail/${notificationId}`);
            } else {
                router.push(`/(mobile)/private/notification-detail?id=${notificationId}`);
            }
        },

        navigateToBucketDetail: (bucketId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/home/bucket/${bucketId}`);
            } else {
                router.push(`/(mobile)/private/bucket-detail?id=${bucketId}`);
            }
        },

        navigateToEditBucket: (bucketId: string, fromHome: boolean = true) => {
            if (fromHome) {
                router.push(`/home/edit-bucket/${bucketId}`);
            } else {
                // router.push(`private/settings/edit-bucket/${bucketId}`);
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

        navigateToBucketsSettings: (danglingBucketId?: string) => {
            const pathname = isTabletOrDesktop
                ? "/(tablet)/private/(settings)/buckets-settings"
                : "/(mobile)/private/buckets-settings";

            router.push({
                pathname,
                params: danglingBucketId ? { danglingBucketId } : undefined
            });
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
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)");
            } else {
                router.push("/(mobile)/private/admin");
            }
        },

        navigateToUserManagement: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)/user-management");
            } else {
                router.push("/(mobile)/private/user-management");
            }
        },

        navigateToOAuthProviders: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)/oauth-providers");
            } else {
                router.push("/(mobile)/private/oauth-providers");
            }
        },

        navigateToSystemAccessTokens: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)/system-access-tokens");
            } else {
                router.push("/(mobile)/private/system-access-tokens");
            }
        },

        navigateToEventsReview: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)/events-review");
            } else {
                router.push("/(mobile)/private/events-review");
            }
        },

        navigateToCreateOAuthProvider: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)/create-oauth-provider");
            } else {
                router.push("/(mobile)/private/create-oauth-provider");
            }
        },

        navigateToEditOAuthProvider: (providerId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/(tablet)/private/(admin)/edit-oauth-provider/${providerId}`);
            } else {
                router.push(`/(mobile)/private/edit-oauth-provider?providerId=${providerId}`);
            }
        },

        navigateToCreateSystemAccessToken: () => {
            if (isTabletOrDesktop) {
                router.push("/(tablet)/private/(admin)/create-system-access-token");
            } else {
                router.push("/(mobile)/private/create-system-access-token");
            }
        },

        navigateToUserDetails: (userId: string) => {
            if (isTabletOrDesktop) {
                router.push(`/(tablet)/private/(admin)/user-details/${userId}`);
            } else {
                router.push(`/(mobile)/private/user-details?id=${userId}`);
            }
        },

        navigateToHome: () => {
            router.push("/home");
            // if (isTabletOrDesktop) {
            //     router.push("/(tablet)/private/(home)");
            // } else {
            //     router.push("/(mobile)/private/(homeTabs)");
            // }
        },

        navigateToLogin: (email?: string) => {
            router.push({ pathname: `${basePath}/public/login`, params: email ? { email } : undefined });
        },

        navigateToEmailConfirmation: (props: { email?: string, code?: string }) => {
            const { code, email } = props;
            router.push({ pathname: `${basePath}/public/email-confirmation`, params: { code, email } });
        },

        navigateToRegister: (email?: string) => {
            router.push({ pathname: `${basePath}/public/register`, params: email ? { email } : undefined });
        },

        navigateToForgotPassword: (email?: string) => {
            router.push({ pathname: `${basePath}/public/forgot-password`, params: email ? { email } : undefined });
        },

        navigateToChangePassword: () => {
            router.push({ pathname: `${basePath}/private/change-password` });
        },

        isTabletOrDesktop,
    };
}