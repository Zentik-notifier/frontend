import { useAppContext } from "@/contexts/AppContext";
import {
  OAuthProviderFragment,
  OAuthProviderType,
  useGetMyIdentitiesQuery,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { settingsService } from "@/services/settings-service";
import { createOAuthRedirectLink } from "@/utils/universal-links";
import { maybeCompleteAuthSession, openBrowserAsync } from "expo-web-browser";
import React, { useState } from "react";
import { Alert, Platform, StyleSheet, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  ActivityIndicator,
  Button,
  Card,
  Divider,
  Icon,
  List,
  Text,
  useTheme,
} from "react-native-paper";
import OAuthProviderIcon from "./OAuthProviderIcon";

export default function OAuthConnections() {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
    refreshUserData,
  } = useAppContext();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );
  const [appleAvailable, setAppleAvailable] = useState(false);

  const { data: providersData, loading: providersLoading } =
    usePublicAppConfigQuery();
  const {
    data: identitiesData,
    loading: identitiesLoading,
    refetch: refetchIdentities,
  } = useGetMyIdentitiesQuery();

  const identities = identitiesData?.me?.identities || [];
  const sortedOAuthIdentities = useEntitySorting(identities, "desc");

  const availableProviders =
    providersData?.publicAppConfig.oauthProviders || [];

  // Dynamically include Apple Sign In on iOS if available (not returned by backend providers)
  const providersWithApple = (() => {
    const list: OAuthProviderFragment[] = [
      ...availableProviders,
    ] as OAuthProviderFragment[];
    const hasAppleSignin = list.some(
      (p: any) => p.type === OAuthProviderType.AppleSignin
    );
    if (Platform.OS === "ios" && appleAvailable && !hasAppleSignin) {
      list.push({
        id: "apple_signin",
        name: "Apple",
        color: "#ffffff",
        iconUrl: null,
        textColor: "#000000",
        type: OAuthProviderType.AppleSignin,
      } as OAuthProviderFragment);
    }
    return list;
  })();

  React.useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const ok =
          Platform.OS === "ios"
            ? await AppleAuthentication.isAvailableAsync()
            : false;
        if (mounted) setAppleAvailable(ok);
      } catch {
        if (mounted) setAppleAvailable(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Determine which providers are connected (match by enum providerType only)
  const getProviderConnectionStatus = (providerType: OAuthProviderType) => {
    return (
      sortedOAuthIdentities.find(
        (identity) => identity.providerType === providerType
      ) || null
    );
  };

  const handleConnect = async (providerType: OAuthProviderType) => {
    try {
      setConnectingProvider(providerType);

      console.log(`🔗 Starting OAuth connection for provider: ${providerType}`);

      // Get the current access token to pass for authentication
      const accessToken = settingsService.getAuthData().accessToken;
      if (!accessToken) {
        Alert.alert(
          t("common.error"),
          "No access token found. Please login again."
        );
        return;
      }

      const baseWithPrefix = settingsService.getApiBaseWithPrefix();
      const redirect = createOAuthRedirectLink();

      // Native Apple Sign In connect flow (no login): do not open browser
      if (providerType === OAuthProviderType.AppleSignin) {
        if (Platform.OS !== "ios" || !appleAvailable) {
          Alert.alert(
            t("common.error"),
            "Apple Sign In non disponibile su questo dispositivo"
          );
          return;
        }

        const credential = await AppleAuthentication.signInAsync({
          requestedScopes: [
            AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
            AppleAuthentication.AppleAuthenticationScope.EMAIL,
          ],
        });
        const { identityToken, ...rest } = credential as any;
        if (!identityToken) {
          throw new Error("Missing identityToken");
        }

        const body = {
          identityToken,
          payload: JSON.stringify(rest),
        } as any;

        const response = await fetch(`${baseWithPrefix}/auth/apple/connect`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify(body),
        });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || "Apple connect failed");
        }
        await Promise.all([refreshUserData(), refetchIdentities()]);
        // Alert.alert(t('common.info'), t('userProfile.oauthConnections.connected'));
        return;
      }

      // Create state with connection context and access token
      const stateData = {
        redirect: redirect,
        connectToUserId: true, // Flag to indicate this is a connection flow
        accessToken: accessToken, // Include access token for authentication
      };
      const state = btoa(JSON.stringify(stateData))
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=/g, "");

      console.log("🔗 Redirect URI:", redirect);
      console.log("🔗 State with connection context:", stateData);

      if (Platform.OS === "web") {
        // Build redirect back to settings (full-page redirect on web)
        const settingsReturnUrl = `${window.location.origin}/(tablet)/(settings)/user/profile`;
        const url = `${baseWithPrefix}/auth/${providerType}?state=${encodeURIComponent(
          state
        )}&redirect=${encodeURIComponent(settingsReturnUrl)}`;
        console.log("🔗 OAuth connection URL:", url);
        // Full redirect on web to complete flow and land on settings
        window.location.assign(url);
        return;
      } else {
        // Mobile: use the redirect from stateData
        const url = `${baseWithPrefix}/auth/${providerType}?state=${encodeURIComponent(
          state
        )}`;
        console.log("🔗 OAuth connection URL:", url);
        const result = await openBrowserAsync(url, {
          showInRecents: false,
          createTask: false,
        });
        console.log("🔗 Browser result:", result);
        maybeCompleteAuthSession();
        if (result.type === "cancel") {
          console.log("🔗 OAuth connection was cancelled by user");
          Alert.alert(t("common.info"), t("login.providers.cancelled"));
        }
      }
    } catch (error) {
      console.error("🔗 Failed to open OAuth connection:", error);
      Alert.alert(
        t("common.error"),
        t("userProfile.oauthConnections.connectionError")
      );
    } finally {
      setConnectingProvider(null);
    }
  };

  const handleDisconnect = async (identityId: string, providerName: string) => {
    try {
      const confirmed = await new Promise<boolean>((resolve) => {
        Alert.alert(
          t("userProfile.oauthConnections.disconnectConfirmTitle"),
          t("userProfile.oauthConnections.disconnectConfirmMessage").replace(
            "{provider}",
            providerName
          ),
          [
            {
              text: t("common.cancel"),
              style: "cancel",
              onPress: () => resolve(false),
            },
            {
              text: t("common.ok"),
              style: "destructive",
              onPress: () => resolve(true),
            },
          ]
        );
      });
      if (!confirmed) return;

      const baseWithPrefix = settingsService.getApiBaseWithPrefix();
      const token = settingsService.getAuthData().accessToken;
      const response = await fetch(
        `${baseWithPrefix}/auth/identities/${identityId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const text = await response.text().catch(() => "");
        throw new Error(text || "Request failed");
      }

      // Ask the app to refresh user data to update identities list
      try {
        await Promise.all([refreshUserData(), refetchIdentities()]);
      } catch {}
    } catch (e) {
      console.error("🔗 Failed to disconnect identity", e);
      Alert.alert(
        t("common.error"),
        t("userProfile.oauthConnections.disconnectError")
      );
    }
  };

  if (providersLoading || identitiesLoading) {
    return (
      <Card>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            {t("common.loading")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (providersWithApple.length === 0 && sortedOAuthIdentities.length === 0) {
    return (
      <Card>
        <Card.Content style={styles.emptyState}>
          <Icon
            source="link-off"
            size={32}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[styles.emptyText, { color: theme.colors.onSurfaceVariant }]}
          >
            {t("userProfile.oauthConnections.noConnections")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  return (
    <Card>
      <Card.Content>
        <View style={styles.header}>
          <Icon source="link" size={24} color={theme.colors.primary} />
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {t("userProfile.oauthConnections.title")}
          </Text>
        </View>

        {providersWithApple.map((provider, index) => {
          const connectedIdentity = getProviderConnectionStatus(provider.type);
          const isConnected = !!connectedIdentity;
          const providerColor = provider.color || "#666666";

          return (
            <View key={provider.id}>
              <List.Item
                title={provider.name}
                description={
                  isConnected
                    ? t("userProfile.oauthConnections.connected")
                    : t("userProfile.oauthConnections.availableToConnect")
                }
                left={(props) => (
                  <OAuthProviderIcon
                    providerType={provider.type}
                    provider={provider}
                    backgroundColor={providerColor}
                    size={40}
                    iconSize={30}
                  />
                )}
                right={() => (
                  <View style={styles.rightContent}>
                    {isConnected ? (
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                        }}
                      >
                        <Button
                          mode="text"
                          compact
                          onPress={() =>
                            handleDisconnect(
                              connectedIdentity.id,
                              provider.name || provider.type
                            )
                          }
                          disabled={isOfflineAuth || isBackendUnreachable}
                        >
                          {t("userProfile.oauthConnections.disconnect")}
                        </Button>
                      </View>
                    ) : (
                      <Button
                        mode="outlined"
                        compact
                        onPress={() => handleConnect(provider.type)}
                        disabled={
                          connectingProvider === provider.type ||
                          isOfflineAuth ||
                          isBackendUnreachable
                        }
                        loading={connectingProvider === provider.type}
                      >
                        {t("userProfile.oauthConnections.connect")}
                      </Button>
                    )}
                  </View>
                )}
              />
              {index < providersWithApple.length - 1 && <Divider />}
            </View>
          );
        })}
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    gap: 12,
  },
  rightContent: {
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
  },
});
