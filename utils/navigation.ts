import { useDeviceType } from "@/hooks/useDeviceType";
import { Href, useRouter } from "expo-router";

export function useNavigationUtils() {
    const { isMobile } = useDeviceType();
    const router = useRouter();

    const homeRoute: Href =
        isMobile ?
            "/(mobile)/(home)/(tabs)/notifications" :
            "/(tablet)/(home)/notifications";

    return {
        homeRoute,
        navigateBack: () => {
            router.back();
        },

        navigateToNotificationDetail: (notificationId: string, forceFetch?: boolean) => {
            if (isMobile) {
                router.push(`/(mobile)/(home)/notification/${notificationId}?forceFetch=${forceFetch}`);
            } else {
                router.push(`/(tablet)/(home)/notification/${notificationId}?forceFetch=${forceFetch}`);
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
                router.push(`/(tablet)/(settings)/user/profile`);
            }
        },

        navigateToAppSettings: (fromSettings: boolean) => {
            if (fromSettings) {
                if (isMobile) {
                    router.push(`/(mobile)/(settings)/app-settings`);
                } else {
                    router.push(`/(tablet)/(settings)/app-settings`);
                }
            } else {
                router.push(`/(common)/(auth)/app-settings`);
            }
        },

        navigateToUserProfile: () => {
            if (isMobile) {
                router.push(`/(mobile)/(settings)/user/profile`);
            } else {
                router.push(`/(tablet)/(settings)/user/profile`);
            }
        },

        navigateToBucketsSettings: () => {
            if (isMobile) {
                router.push({ pathname: `/(mobile)/(settings)/bucket/list` });
            } else {
                router.push({ pathname: `/(tablet)/(settings)/bucket/list` });
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
            if (isMobile) {
                router.push(`/(mobile)/(admin)`);
            } else {
                router.push(`/(tablet)/(admin)/user-management/list`);
            }
        },

        navigateToUserManagement: () => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/user-management/list`);
            } else {
                router.push(`/(tablet)/(admin)/user-management/list`);
            }
        },

        navigateToOauthProviders: () => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/oauth-providers/list`);
            } else {
                router.push(`/(tablet)/(admin)/oauth-providers/list`);
            }
        },

        navigateToSystemAccessTokens: () => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/system-access-tokens/list`);
            } else {
                router.push(`/(tablet)/(admin)/system-access-tokens/list`);
            }
        },

        navigateToEventsReview: () => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/events-review`);
            } else {
                router.push(`/(tablet)/(admin)/events-review`);
            }
        },

        navigateToCreateOAuthProvider: () => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/oauth-providers/create`);
            } else {
                router.push(`/(tablet)/(admin)/oauth-providers/create`);
            }
        },

        navigateToEditOAuthProvider: (providerId: string) => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/oauth-providers/${providerId}`);
            } else {
                router.push(`/(tablet)/(admin)/oauth-providers/${providerId}`);
            }
        },

        navigateToCreateSystemAccessToken: () => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/system-access-tokens/create`);
            } else {
                router.push(`/(tablet)/(admin)/system-access-tokens/create`);
            }
        },

        navigateToEditSystemAccessToken: (tokenId: string) => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/system-access-tokens/${tokenId}`);
            } else {
                router.push(`/(tablet)/(admin)/system-access-tokens/${tokenId}`);
            }
        },

        navigateToUserDetails: (userId: string) => {
            if (isMobile) {
                router.push(`/(mobile)/(admin)/user-management/${userId}`);
            } else {
                router.push(`/(tablet)/(admin)/user-management/${userId}`);
            }
        },

        navigateToHome: () => {
            router.push(homeRoute);
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

        navigateToTerms: () => {
            router.push({ pathname: `/(common)/terms-acceptance` });
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
                router.push("/(mobile)/(settings)/user/change-password");
            } else {
                router.push("/(tablet)/(settings)/user/change-password");
            }
        },

        navigateToDanglingBucket: (bucketId: string, fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(mobile)/(home)/bucket/link/${bucketId}`);
                } else {
                    router.push(`/(tablet)/(home)/bucket/link/${bucketId}`);
                }
            } else {
                if (isMobile) {
                    router.push(`/(mobile)/(settings)/bucket/link/${bucketId}`);
                } else {
                    router.push(`/(tablet)/(settings)/bucket/link/${bucketId}`);
                }
            }
        },
    };
}