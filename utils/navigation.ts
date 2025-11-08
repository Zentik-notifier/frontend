import { useDeviceType } from "@/hooks/useDeviceType";
import { Href, useRouter } from "expo-router";

export function useNavigationUtils() {
    const { isMobile } = useDeviceType();
    const router = useRouter();

    const homeRoute: Href =
        isMobile ?
            "/(phone)/(home)/(tabs)/notifications" :
            "/(desktop)/(home)/notifications";

    return {
        homeRoute,
        navigateBack: () => {
            router.back();
        },

        navigateToNotificationDetail: (notificationId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(home)/notification/${notificationId}`);
            } else {
                router.push(`/(desktop)/(home)/notification/${notificationId}`);
            }
        },

        navigateToBucketDetail: (bucketId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(home)/bucket/${bucketId}`);
            } else {
                router.push(`/(desktop)/(home)/bucket/${bucketId}`);
            }
        },

        navigateToEditBucket: (bucketId: string, fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(phone)/(home)/bucket/settings/${bucketId}`);
                } else {
                    router.push(`/(desktop)/(home)/bucket/settings/${bucketId}`);
                }
            } else {
                if (isMobile) {
                    router.push(`/(phone)/(settings)/bucket/${bucketId}`);
                } else {
                    router.push(`/(desktop)/(settings)/bucket/${bucketId}`);
                }
            }
        },

        navigateToCreateBucket: (fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(phone)/(home)/bucket/settings/create`);
                } else {
                    router.push(`/(desktop)/(home)/bucket/settings/create`);
                }
            } else {
                if (isMobile) {
                    router.push(`/(phone)/(settings)/bucket/create`);
                } else {
                    router.push(`/(desktop)/(settings)/bucket/create`);
                }
            }
        },

        navigateToCreateAccessToken: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/access-token/create`);
            } else {
                router.push(`/(desktop)/(settings)/access-token/create`);
            }
        },

        navigateToEditAccessToken: (tokenId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/access-token/${tokenId}`);
            } else {
                router.push(`/(desktop)/(settings)/access-token/${tokenId}`);
            }
        },

        navigateToCreateWebhook: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/webhook/create`);
            } else {
                router.push(`/(desktop)/(settings)/webhook/create`);
            }
        },

        navigateToEditWebhook: (webhookId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/webhook/${webhookId}`);
            } else {
                router.push(`/(desktop)/(settings)/webhook/${webhookId}`);
            }
        },

        navigateToSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)`);
            } else {
                router.push(`/(desktop)/(settings)/user/profile`);
            }
        },

        navigateToAppSettings: (fromSettings: boolean) => {
            if (fromSettings) {
                if (isMobile) {
                    router.push(`/(phone)/(settings)/app-settings`);
                } else {
                    router.push(`/(desktop)/(settings)/app-settings`);
                }
            } else {
                router.push(`/(common)/(auth)/app-settings`);
            }
        },

        navigateToUserProfile: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/user/profile`);
            } else {
                router.push(`/(desktop)/(settings)/user/profile`);
            }
        },

        navigateToUserAttachments: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/user/attachments`);
            } else {
                router.push(`/(desktop)/(settings)/user/attachments`);
            }
        },

        navigateToBucketsSettings: () => {
            if (isMobile) {
                router.push({ pathname: `/(phone)/(settings)/bucket/list` });
            } else {
                router.push({ pathname: `/(desktop)/(settings)/bucket/list` });
            }
        },

        navigateToAccessTokensSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/access-token/list`);
            } else {
                router.push(`/(desktop)/(settings)/access-token/list`);
            }
        },

        navigateToWebhooksSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/webhook/list`);
            } else {
                router.push(`/(desktop)/(settings)/webhook/list`);
            }
        },

        navigateToPayloadMappersSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/payload-mapper/list`);
            } else {
                router.push(`/(desktop)/(settings)/payload-mapper/list`);
            }
        },

        navigateToCreatePayloadMapper: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/payload-mapper/create`);
            } else {
                router.push(`/(desktop)/(settings)/payload-mapper/create`);
            }
        },

        navigateToEditPayloadMapper: (payloadMapperId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/payload-mapper/${payloadMapperId}`);
            } else {
                router.push(`/(desktop)/(settings)/payload-mapper/${payloadMapperId}`);
            }
        },

        navigateToDevicesSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/devices`);
            } else {
                router.push(`/(desktop)/(settings)/devices`);
            }
        },

        navigateToNotificationsSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/notifications`);
            } else {
                router.push(`/(desktop)/(settings)/notifications`);
            }
        },

        navigateToUserSessionsSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/user-sessions`);
            } else {
                router.push(`/(desktop)/(settings)/user-sessions`);
            }
        },

        navigateToLogs: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/logs`);
            } else {
                router.push(`/(desktop)/(settings)/logs`);
            }
        },

        navigateToCachedData: () => {
            if (isMobile) {
                router.push(`/(phone)/(settings)/cached-data`);
            } else {
                router.push(`/(desktop)/(settings)/cached-data`);
            }
        },

        navigateToAdmin: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)`);
            } else {
                router.push(`/(desktop)/(admin)/server-settings`);
            }
        },

        navigateToUserManagement: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/user-management/list`);
            } else {
                router.push(`/(desktop)/(admin)/user-management/list`);
            }
        },

        navigateToOauthProviders: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/oauth-providers/list`);
            } else {
                router.push(`/(desktop)/(admin)/oauth-providers/list`);
            }
        },

        navigateToSystemAccessTokens: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/system-access-tokens/list`);
            } else {
                router.push(`/(desktop)/(admin)/system-access-tokens/list`);
            }
        },

        navigateToEventsReview: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/events-review`);
            } else {
                router.push(`/(desktop)/(admin)/events-review`);
            }
        },

        navigateToServerSettings: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/server-settings`);
            } else {
                router.push(`/(desktop)/(admin)/server-settings`);
            }
        },

        navigateToBackupManagement: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/backup-management`);
            } else {
                router.push(`/(desktop)/(admin)/backup-management`);
            }
        },

        navigateToServerLogs: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/server-logs`);
            } else {
                router.push(`/(desktop)/(admin)/server-logs`);
            }
        },

        navigateToServerFiles: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/server-files`);
            } else {
                router.push(`/(desktop)/(admin)/server-files`);
            }
        },

        navigateToCreateOAuthProvider: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/oauth-providers/create`);
            } else {
                router.push(`/(desktop)/(admin)/oauth-providers/create`);
            }
        },

        navigateToEditOAuthProvider: (providerId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/oauth-providers/${providerId}`);
            } else {
                router.push(`/(desktop)/(admin)/oauth-providers/${providerId}`);
            }
        },

        navigateToCreateSystemAccessToken: () => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/system-access-tokens/create`);
            } else {
                router.push(`/(desktop)/(admin)/system-access-tokens/create`);
            }
        },

        navigateToEditSystemAccessToken: (tokenId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/system-access-tokens/${tokenId}`);
            } else {
                router.push(`/(desktop)/(admin)/system-access-tokens/${tokenId}`);
            }
        },

        navigateToUserDetails: (userId: string) => {
            if (isMobile) {
                router.push(`/(phone)/(admin)/user-management/${userId}`);
            } else {
                router.push(`/(desktop)/(admin)/user-management/${userId}`);
            }
        },

        navigateToHome: () => {
            router.push(homeRoute);
        },

        navigateToGallery: () => {
            if (isMobile) {
                router.push("/(phone)/(home)/(tabs)/gallery");
            } else {
                router.push("/(desktop)/(home)/gallery");
            }
        },

        navigateToBuckets: () => {
            router.push("/(phone)/(home)/(tabs)/buckets");
        },

        navigateToLogin: (emailOrParams?: string | { email?: string, error?: string, errorTitle?: string }) => {
            if (typeof emailOrParams === 'string') {
                router.push({ pathname: `/(common)/(auth)/login`, params: { email: emailOrParams } });
            } else {
                const params: any = {};
                if (emailOrParams?.email) params.email = emailOrParams.email;
                if (emailOrParams?.error) params.error = emailOrParams.error;
                if (emailOrParams?.errorTitle) params.errorTitle = emailOrParams.errorTitle;
                router.push({ pathname: `/(common)/(auth)/login`, params });
            }
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

        navigateToSelfService: () => {
            router.push(`/self-service/token-requests`);
        },

        navigateToChangePassword: () => {
            if (isMobile) {
                router.push("/(phone)/(settings)/user/change-password");
            } else {
                router.push("/(desktop)/(settings)/user/change-password");
            }
        },

        navigateToDanglingBucket: (bucketId: string, fromHome: boolean) => {
            if (fromHome) {
                if (isMobile) {
                    router.push(`/(phone)/(home)/bucket/link/${bucketId}`);
                } else {
                    router.push(`/(desktop)/(home)/bucket/link/${bucketId}`);
                }
            } else {
                if (isMobile) {
                    router.push(`/(phone)/(settings)/bucket/link/${bucketId}`);
                } else {
                    router.push(`/(desktop)/(settings)/bucket/link/${bucketId}`);
                }
            }
        },
    };
}