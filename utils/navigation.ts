import { useDeviceType } from "@/hooks/useDeviceType";
import { useRouter } from "expo-router";

export function useNavigationUtils() {
    const { isMobile } = useDeviceType();
    const router = useRouter();

    return {
        navigateBack: () => {
            router.back();
        },

        navigateToNotificationDetail: (notificationId: string) => {
            if (isMobile) {
                router.push(`/(mobile)/(home)/notification/${notificationId}`);
            } else {
                router.push(`/(tablet)/(home)/notification/${notificationId}`);
            }
        },

        navigateToBucketDetail: (bucketId: string) => {
            if (isMobile) {
                router.push(`/(mobile)/(home)/bucket/${bucketId}`);
            } else {
                router.push(`/(tablet)/(home)/bucket/${bucketId}`);
            }
        },

        navigateToEditBucket: (bucketId: string, fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(mobile)/(home)/bucket/settings/${bucketId}`);
                } else {
                    router.push(`/(tablet)/(home)/bucket/settings/${bucketId}`);
                }
            } else {
                if (isMobile) {
                    router.push(`/(mobile)/(settings)/bucket/${bucketId}`);
                } else {
                    router.push(`/(tablet)/(settings)/bucket/${bucketId}`);
                }
            }
        },

        navigateToCreateBucket: (fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(mobile)/(home)/bucket/settings/create`);
                } else {
                    router.push(`/(tablet)/(home)/bucket/settings/create`);
                }
            } else {
                if (isMobile) {
                    router.push(`/(mobile)/(settings)/bucket/create`);
                } else {
                    router.push(`/(tablet)/(settings)/bucket/create`);
                }
            }
        },

        navigateToCreateAccessToken: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/access-token/create`);
            } else {
                router.push(`/(tablet)/(settings)/access-token/create`);
            }
        },

        navigateToCreateWebhook: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/webhook/create`);
            } else {
                router.push(`/(tablet)/(settings)/webhook/create`);
            }
        },

        navigateToEditWebhook: (webhookId: string) => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/webhook/${webhookId}`);
            } else {
                router.push(`/(tablet)/(settings)/webhook/${webhookId}`);
            }
        },

        navigateToSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)`);
            } else {
                router.push(`/(tablet)/(settings)/user-profile`);
            }
        },

        navigateToAppSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/app-settings`);
            } else {
                router.push(`/(tablet)/(settings)/app-settings`);
            }
        },

        navigateToUserProfile: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/user-profile`);
            } else {
                router.push(`/(tablet)/(settings)/user-profile`);
            }
        },

        navigateToBucketsSettings: (danglingBucketId?: string) => {
            const params = danglingBucketId ? { danglingBucketId } : undefined;

            if (isMobile) {
                router.push({ pathname: `/(mobile)/(settings)/bucket/list`, params });
            } else {
                router.push({ pathname: `/(tablet)/(settings)/bucket/list`, params });
            }
        },

        navigateToAccessTokensSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/access-token/list`);
            } else {
                router.push(`/(tablet)/(settings)/access-token/list`);
            }
        },

        navigateToWebhooksSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/webhook/list`);
            } else {
                router.push(`/(tablet)/(settings)/webhook/list`);
            }
        },

        navigateToDevicesSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/devices`);
            } else {
                router.push(`/(tablet)/(settings)/devices`);
            }
        },

        navigateToNotificationsSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/notifications`);
            } else {
                router.push(`/(tablet)/(settings)/notifications`);
            }
        },

        navigateToUserSessionsSettings: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/user-sessions`);
            } else {
                router.push(`/(tablet)/(settings)/user-sessions`);
            }
        },

        navigateToLogs: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/logs`);
            } else {
                router.push(`/(tablet)/(settings)/logs`);
            }
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
                router.push("/(mobile)/(home)/(tabs)/notifications");
            } else {
                router.push("/(tablet)/(home)/notifications");
            }
        },

        navigateToGallery: () => {
            if (isMobile) {
                router.push("/(mobile)/(home)/(tabs)/gallery");
            } else {
                router.push("/(tablet)/(home)/gallery");
            }
        },

        navigateToBuckets: () => {
            router.push("/(mobile)/(home)/(tabs)/buckets");
        },

        navigateToLogin: (email?: string) => {
            router.push({ pathname: `/(common)/(auth)/login`, params: email ? { email } : undefined });
        },

        navigateToEmailConfirmation: (props: { email?: string, code?: string }) => {
            const { code, email } = props;
            router.push({ pathname: `/(common)/(auth)/email-confirmation`, params: { code, email } });
        },

        navigateToRegister: (email?: string) => {
            router.push({ pathname: `/(common)/(auth)/register`, params: email ? { email } : undefined });
        },

        navigateToForgotPassword: (email?: string) => {
            router.push({ pathname: `/(common)/(auth)/forgot-password`, params: email ? { email } : undefined });
        },

        navigateToOAuth: (params: string) => {
            router.push(`/(common)/(auth)/oauth?${params}`);
        },

        navigateToChangePassword: () => {
            if (isMobile) {
                router.push("/(mobile)/(settings)/change-password");
            } else {
                router.push("/(tablet)/(settings)/change-password");
            }
        },

    };
}