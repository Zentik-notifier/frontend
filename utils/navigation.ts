import { useDeviceType } from "@/hooks/useDeviceType";
import { router } from "expo-router";

export function useNavigationUtils() {
    const { isMobile } = useDeviceType();

    return {
        navigateToNotificationDetail: (notificationId: string) => {
            if (isMobile) {
                router.push(`/(home)/notification-standalone/${notificationId}`);
            } else {
                router.push(`/(home)/(stack)/notification/${notificationId}`);
            }
        },

        navigateToBucketDetail: (bucketId: string) => {
            if (isMobile) {
                router.push(`/(home)/bucket-standalone/${bucketId}`);
            } else {
                router.push(`/(home)/(stack)/bucket/${bucketId}`);
            }
        },

        navigateToEditBucket: (bucketId: string, fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(home)/bucket-setting-standalone/${bucketId}`);
                } else {
                    router.push(`/(home)/(stack)/bucket-setting/${bucketId}`);
                }
            } else {
                router.push(`/(home)/(stack)/bucket/${bucketId}`);
            }
        },

        navigateToCreateBucket: (fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(home)/bucket-setting-standalone/create`);
                } else {
                    router.push(`/(home)/(stack)/bucket-setting/create`);
                }
            } else {
                router.push(`/(settings)/bucket/create`);
            }
        },

        navigateToCreateAccessToken: () => {
            router.push(`/(settings)/access-token/create`);
        },

        navigateToCreateWebhook: () => {
            router.push(`/(settings)/webhook/create`);
        },

        navigateToEditWebhook: (webhookId: string) => {
            router.push(`/(settings)/webhook/${webhookId}`);
        },

        navigateToSettings: () => {
            router.push(`/(settings)`);
        },

        navigateToAppSettings: () => {
            router.push(`/(settings)/app-settings`);
        },

        navigateToUserProfile: () => {
            router.push(`/(settings)/user-profile`);
        },

        navigateToBucketsSettings: (danglingBucketId?: string) => {
            router.push({ pathname: `/(settings)/bucket/list`, params: danglingBucketId ? { danglingBucketId } : undefined });
        },

        navigateToAccessTokensSettings: () => {
            router.push(`/(settings)/access-token/list`);
        },

        navigateToWebhooksSettings: () => {
            router.push(`/(settings)/webhook/list`);
        },

        navigateToDevicesSettings: () => {
            router.push(`/(settings)/devices`);
        },

        navigateToNotificationsSettings: () => {
            router.push(`/(settings)/notifications`);
        },

        navigateToUserSessionsSettings: () => {
            router.push(`/(settings)/user-sessions`);
        },

        navigateToLogs: () => {
            router.push(`/(settings)/logs`);
        },

        navigateToAdmin: () => {
            router.push(`/admin`);
        },

        navigateToUserManagement: () => {
            router.push(`/(admin)/user-management`);
        },

        navigateToOAuthProviders: () => {
            router.push(`/(admin)/oauth-providers`);
        },

        navigateToSystemAccessTokens: () => {
            router.push(`/(admin)/system-acces-token`);
        },

        navigateToEventsReview: () => {
            router.push(`/(admin)/events-review`);
        },

        navigateToCreateOAuthProvider: () => {
            router.push(`/(admin)/create-oauth-provider`);
        },

        navigateToEditOAuthProvider: (providerId: string) => {
            router.push(`/(admin)/edit-oauth-provider/${providerId}`);
        },

        navigateToCreateSystemAccessToken: () => {
            router.push("/(admin)/create-system-access-token");
        },

        navigateToUserDetails: (userId: string) => {
            router.push("/(admin)/user-details/${userId}");
        },

        navigateToHome: () => {
            if (isMobile) {
                router.push("/(home)/(tabs)/notifications");
            } else {
                router.push("/(home)/(stack)/notifications");
            }
        },

        navigateToGallery: () => {
            if (isMobile) {
                router.push("/(home)/(tabs)/gallery");
            } else {
                router.push("/(home)/(stack)/gallery");
            }
        },

        navigateToBuckets: () => {
            router.push("/(home)/(tabs)/buckets");
        },

        navigateToLogin: (email?: string) => {
            router.push({ pathname: `/(auth)/login`, params: email ? { email } : undefined });
        },

        navigateToEmailConfirmation: (props: { email?: string, code?: string }) => {
            const { code, email } = props;
            router.push({ pathname: `/(auth)/email-confirmation`, params: { code, email } });
        },

        navigateToRegister: (email?: string) => {
            router.push({ pathname: `/(auth)/register`, params: email ? { email } : undefined });
        },

        navigateToForgotPassword: (email?: string) => {
            router.push({ pathname: `/(auth)/forgot-password`, params: email ? { email } : undefined });
        },

        navigateToChangePassword: () => {
            router.push(`/(settings)/change-password`);
        },
    };
}