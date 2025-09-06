import { Colors } from "@/constants/Colors";
import {
  OAuthProviderFragment,
  useAllOAuthProvidersQuery,
  useToggleOAuthProviderMutation
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { AppLoader } from "./ui/AppLoader";

interface OAuthProvidersSettingsProps {
  refreshing?: boolean;
}

function OAuthProviderItem({
  provider,
  onEdit,
  onToggle,
  toggleLoading,
}: {
  provider: OAuthProviderFragment;
  onEdit: (provider: OAuthProviderFragment) => void;
  onToggle: (provider: OAuthProviderFragment) => void;
  toggleLoading?: boolean;
}) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  return (
    <TouchableOpacity
      style={[
        styles.providerCard,
        {
          backgroundColor: Colors[colorScheme].background,
          borderColor: Colors[colorScheme].border,
          opacity: provider.isEnabled ? 1 : 0.7,
        },
      ]}
      onPress={() => onEdit(provider)}
    >
      <View style={styles.providerInfo}>
        <View
          style={[
            styles.providerIcon,
            {
              backgroundColor: `${provider.color}15`,
            },
          ]}
        >
          {
            <Image
              source={{ uri: provider.iconUrl! }}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          }
        </View>
        <View style={styles.providerDetails}>
          <ThemedText style={styles.providerName}>{provider.name}</ThemedText>
          <ThemedText
            style={[
              styles.providerStatus,
              { color: provider.isEnabled ? "#4CAF50" : "#9E9E9E" },
            ]}
          >
            {provider.isEnabled
              ? `✅ ${t("administration.enabled")}`
              : `❌ ${t("administration.disabled")}`}
          </ThemedText>
        </View>
      </View>

      <View style={styles.providerActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: provider.isEnabled
                ? "#4CAF5020"
                : `${provider.color}15`,
              borderColor: provider.isEnabled ? "#4CAF50" : provider.color!,
              opacity: toggleLoading ? 0.6 : 1,
            },
          ]}
          onPress={() => onToggle(provider)}
          disabled={toggleLoading}
        >
          {toggleLoading ? (
            <ActivityIndicator
              size="small"
              color={provider.isEnabled ? "#4CAF50" : provider.color!}
            />
          ) : (
            <Ionicons
              name={provider.isEnabled ? "checkmark" : "add"}
              size={16}
              color={provider.isEnabled ? "#4CAF50" : provider.color!}
            />
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.actionButton,
            {
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].border,
            },
          ]}
          onPress={() => onEdit(provider)}
        >
          <Ionicons
            name="chevron-forward"
            size={16}
            color={Colors[colorScheme].text}
          />
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
}

export default function OAuthProvidersSettings({
  refreshing: externalRefreshing,
}: OAuthProvidersSettingsProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [togglingProviderId, setTogglingProviderId] = useState<string | null>(
    null
  );

  const { data, loading, error, refetch } = useAllOAuthProvidersQuery({});
  const [toggleOAuthProvider] = useToggleOAuthProviderMutation();

  const allProviders = data?.allOAuthProviders || [];

  useEffect(() => {
    if (externalRefreshing) {
      refetch();
    }
  }, [externalRefreshing, refetch]);

  const handleCreateProvider = () => {
    router.push("/(mobile)/private/create-oauth-provider");
  };

  const handleEditProvider = (provider: OAuthProviderFragment) => {
    router.push(`/(mobile)/private/edit-oauth-provider?providerId=${provider.id}`);
  };

  const handleToggleProvider = async (provider: OAuthProviderFragment) => {
    if (togglingProviderId === provider.id) return;

    setTogglingProviderId(provider.id);

    try {
      await toggleOAuthProvider({
        variables: {
          id: provider.id,
        },
        refetchQueries: ["AllOAuthProviders"],
        optimisticResponse: {
          toggleOAuthProvider: {
            __typename: "OAuthProvider",
            id: provider.id,
            name: provider.name,
            providerId: provider.providerId,
            isEnabled: !provider.isEnabled,
          },
        },
      });
    } catch (error) {
      console.error("Error toggling OAuth provider:", error);
      // TODO: Show error message to user
    } finally {
      setTogglingProviderId(null);
    }
  };

  const renderProviderItem = ({ item }: { item: OAuthProviderFragment }) => (
    <OAuthProviderItem
      provider={item}
      onEdit={handleEditProvider}
      onToggle={handleToggleProvider}
      toggleLoading={togglingProviderId === item.id}
      key={item.id}
    />
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <AppLoader text={t("common.loading")} size="medium" />
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning" size={48} color="#ff6b6b" />
          <ThemedText style={styles.errorTitle}>
            {t("administration.errorLoadingOAuthProviders")}
          </ThemedText>
          <ThemedText style={styles.errorText}>
            {t("administration.errorLoadingOAuthProvidersDescription")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("administration.oauthProviders")}
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.createButton,
            { backgroundColor: Colors[colorScheme ?? "light"].tint },
          ]}
          onPress={handleCreateProvider}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.description}>
        {t("administration.oauthProvidersDescription")}
      </ThemedText>

      {allProviders.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons
            name="folder-outline"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {t("administration.noOAuthProviders")}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {t("administration.noOAuthProvidersDescription")}
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.container}>
          {allProviders.map((item) => renderProviderItem({ item }))}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: "center",
  },
  providersList: {
    paddingBottom: 20,
  },
  providerCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 20,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  providerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  providerIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  providerType: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  providerStatus: {
    fontSize: 12,
    fontWeight: "500",
  },
  providerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  providersContainer: {
    flex: 1,
  },
});
