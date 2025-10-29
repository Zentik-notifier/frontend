import { settingsService } from "@/services/settings-service";
import { useAppContext } from "@/contexts/AppContext";
import {
  UserFragment,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Divider,
  Icon,
  List,
  Text,
  useTheme,
} from "react-native-paper";
import { createOAuthRedirectLink } from "@/utils/universal-links";

interface OAuthConnectionsProps {
  identities: UserFragment["identities"];
}

export default function OAuthConnections({
  identities,
}: OAuthConnectionsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
    refreshUserData,
  } = useAppContext();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );

  const {
    data: providersData,
    loading: providersLoading,
    error,
  } = usePublicAppConfigQuery();

  // Filter out any custom providers (those that might not be standard OAuth providers)
  const oauthIdentities =
    identities?.filter(
      (identity) =>
        !identity.provider.includes("custom") &&
        identity.provider !== "email" &&
        identity.provider !== "password"
    ) || [];

  const sortedOAuthIdentities = useEntitySorting(oauthIdentities, "desc");

  const availableProviders =
    providersData?.publicAppConfig.oauthProviders || [];

  // Determine which providers are connected
  const getProviderConnectionStatus = (providerId: string) => {
    return sortedOAuthIdentities.find(
      (identity) => identity.provider === providerId
    );
  };

  const handleConnect = async (providerId: string) => {
    try {
      setConnectingProvider(providerId);

      console.log("🔗 Starting OAuth connection for provider:", providerId);

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

      const url = `${baseWithPrefix}/auth/${providerId}?state=${encodeURIComponent(
        state
      )}`;

      console.log("🔗 OAuth connection URL:", url);
      console.log("🔗 Redirect URI:", redirect);
      console.log("🔗 State with connection context:", stateData);

      // Use in-app browser with proper session management (same as login)
      const { openBrowserAsync, maybeCompleteAuthSession } = await import(
        "expo-web-browser"
      );

      // Start the OAuth session
      const result = await openBrowserAsync(url, {
        showInRecents: false,
        createTask: false,
      });

      console.log("🔗 Browser result:", result);

      // Complete the auth session
      maybeCompleteAuthSession();

      // Check if the browser was closed without completing OAuth
      if (result.type === "cancel") {
        console.log("🔗 OAuth connection was cancelled by user");
        Alert.alert(t("common.info"), t("login.providers.cancelled"));
      } else if (result.type === "dismiss") {
        console.log(
          "🔗 OAuth connection completed via deep link (browser dismissed)"
        );
        // For OAuth connections, "dismiss" is actually expected when the deep link
        // redirects back to the app and the browser is automatically closed
      } else {
        console.log(
          "🔗 OAuth connection completed with result type:",
          result.type
        );
        // Note: The actual connection handling will be done by the deep link handler in _layout.tsx
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

      Alert.alert(
        t("common.success"),
        t("userProfile.oauthConnections.disconnectSuccess")
      );

      // Ask the app to refresh user data to update identities list
      try {
        await refreshUserData();
      } catch {}
    } catch (e) {
      console.error("🔗 Failed to disconnect identity", e);
      Alert.alert(
        t("common.error"),
        t("userProfile.oauthConnections.disconnectError")
      );
    }
  };

  if (providersLoading) {
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

  if (availableProviders.length === 0 && sortedOAuthIdentities.length === 0) {
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

        {availableProviders.map((provider, index) => {
          const connectedIdentity = getProviderConnectionStatus(
            provider.providerId
          );
          const isConnected = !!connectedIdentity;
          const providerColor = provider.color || "#666666";

          return (
            <View key={provider.id}>
              <List.Item
                title={provider.name}
                description={
                  isConnected
                    ? t("userProfile.oauthConnections.connectedAs", {
                        providerId: connectedIdentity.providerId,
                      })
                    : t("userProfile.oauthConnections.availableToConnect")
                }
                left={(props) => (
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: providerColor + "15" },
                    ]}
                  >
                    {provider.iconUrl ? (
                      <Image
                        source={{ uri: provider.iconUrl }}
                        style={styles.providerIcon}
                        resizeMode="contain"
                      />
                    ) : (
                      <Icon source="link" size={20} color={providerColor} />
                    )}
                  </View>
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
                        <Chip
                          mode="flat"
                          textStyle={{ color: theme.colors.primary }}
                          style={{
                            backgroundColor: theme.colors.primaryContainer,
                          }}
                        >
                          {t("userProfile.oauthConnections.connected")}
                        </Chip>
                        <Button
                          mode="text"
                          compact
                          onPress={() =>
                            handleDisconnect(
                              connectedIdentity.id,
                              provider.name || provider.providerId
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
                        onPress={() => handleConnect(provider.providerId)}
                        disabled={
                          connectingProvider === provider.providerId ||
                          isOfflineAuth ||
                          isBackendUnreachable
                        }
                        loading={connectingProvider === provider.providerId}
                      >
                        {t("userProfile.oauthConnections.connect")}
                      </Button>
                    )}
                  </View>
                )}
              />
              {index < availableProviders.length - 1 && <Divider />}
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
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
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
  providerIcon: {
    width: 20,
    height: 20,
  },
});
