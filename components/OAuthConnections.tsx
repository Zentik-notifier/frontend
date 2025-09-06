import { SectionHeader } from "@/components/SectionHeader";
import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/Colors";
import {
  UserFragment,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { ApiConfigService } from "@/services/api-config";
import { useAppContext } from "@/services/app-context";
import { getAccessToken } from "@/services/auth-storage";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { AppLoader } from "./ui/AppLoader";

interface OAuthConnectionsProps {
  identities: UserFragment["identities"];
}

export default function OAuthConnections({
  identities,
}: OAuthConnectionsProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const {
    setLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const [connectingProvider, setConnectingProvider] = useState<string | null>(
    null
  );

  const { data: providersData, loading: providersLoading } =
    usePublicAppConfigQuery();
  useEffect(() => setLoading(providersLoading), [providersLoading]);

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
      const accessToken = await getAccessToken();
      if (!accessToken) {
        Alert.alert(
          t("common.error"),
          "No access token found. Please login again."
        );
        return;
      }

      const baseWithPrefix = ApiConfigService.getApiBaseWithPrefix();
      const redirect = `zentik://(mobile)/public/oauth`;

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
      await maybeCompleteAuthSession();

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

  return (
    <View style={styles.container}>
      <SectionHeader
        title={t("userProfile.oauthConnections.title")}
        iconName="connected"
      />

      {/* Available Providers */}
      {!providersLoading && availableProviders.length > 0 && (
        <View
          style={[
            styles.connectionsContainer,
            { backgroundColor: Colors[colorScheme].backgroundCard },
          ]}
        >
          {availableProviders.map((provider, index) => {
            const connectedIdentity = getProviderConnectionStatus(
              provider.providerId
            );
            const isConnected = !!connectedIdentity;

            // Use provider data from backend or fallback
            const providerColor = provider.color || "#666666";

            return (
              <View
                key={provider.id}
                style={[
                  styles.connectionItem,
                  index < availableProviders.length - 1 && {
                    borderBottomWidth: StyleSheet.hairlineWidth,
                    borderBottomColor: Colors[colorScheme].border,
                  },
                ]}
              >
                <View style={styles.connectionInfo}>
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
                      <Ionicons name="link" size={20} color={providerColor} />
                    )}
                  </View>
                  <View style={styles.textContainer}>
                    <ThemedText
                      style={[
                        styles.providerName,
                        { color: Colors[colorScheme].text },
                      ]}
                    >
                      {provider.name}
                    </ThemedText>
                    {isConnected ? (
                      <Text
                        style={[
                          styles.providerId,
                          { color: Colors[colorScheme].textSecondary },
                        ]}
                      >
                        {t("userProfile.oauthConnections.connectedAs", {
                          providerId: connectedIdentity.providerId,
                        })}
                      </Text>
                    ) : (
                      <Text
                        style={[
                          styles.providerId,
                          { color: Colors[colorScheme].textSecondary },
                        ]}
                      >
                        Available to connect
                      </Text>
                    )}
                  </View>
                </View>

                {/* Connection Status/Action */}
                {isConnected ? (
                  <View style={styles.statusContainer}>
                    <View
                      style={[styles.statusDot, { backgroundColor: "#10B981" }]}
                    />
                    <Text style={[styles.statusText, { color: "#10B981" }]}>
                      {t("userProfile.oauthConnections.connected")}
                    </Text>
                  </View>
                ) : (
                  (() => {
                    const isDisabled =
                      connectingProvider === provider.providerId ||
                      isOfflineAuth ||
                      isBackendUnreachable;
                    return (
                      <TouchableOpacity
                        style={[
                          styles.connectButton,
                          {
                            backgroundColor: isDisabled
                              ? Colors[colorScheme].buttonDisabled
                              : Colors[colorScheme].primary + "15",
                            borderColor: isDisabled
                              ? Colors[colorScheme].border
                              : Colors[colorScheme].primary,
                          },
                          isDisabled && styles.connectButtonDisabled,
                        ]}
                        onPress={() => handleConnect(provider.providerId)}
                        disabled={isDisabled}
                      >
                        <Text
                          style={[
                            styles.connectButtonText,
                            {
                              color: isDisabled
                                ? Colors[colorScheme].textSecondary
                                : Colors[colorScheme].primary,
                            },
                          ]}
                        >
                          {connectingProvider === provider.providerId
                            ? t("common.loading")
                            : t("userProfile.oauthConnections.connect")}
                        </Text>
                      </TouchableOpacity>
                    );
                  })()
                )}
              </View>
            );
          })}
        </View>
      )}

      {/* Empty State */}
      {!providersLoading &&
        availableProviders.length === 0 &&
        sortedOAuthIdentities.length === 0 && (
          <View
            style={[
              styles.emptyState,
              { backgroundColor: Colors[colorScheme].backgroundCard },
            ]}
          >
            <Ionicons
              name="link-outline"
              size={32}
              color={Colors[colorScheme].icon}
            />
            <ThemedText
              style={[
                styles.emptyText,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("userProfile.oauthConnections.noConnections")}
            </ThemedText>
          </View>
        )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  connectionsContainer: {
    borderRadius: 12,
    overflow: "hidden",
  },
  connectionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  connectionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  providerId: {
    fontSize: 14,
  },
  statusContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
  },
  connectButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
  },
  connectButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    borderRadius: 12,
  },
  emptyText: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 12,
  },
  providerIcon: {
    width: 20,
    height: 20,
  },
});
