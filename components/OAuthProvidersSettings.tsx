import {
  OAuthProviderFragment,
  useAllOAuthProvidersQuery,
  useToggleOAuthProviderMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  FAB,
  Icon,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useAppContext } from "@/contexts/AppContext";
import PaperScrollView from "./ui/PaperScrollView";

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
  const theme = useTheme();
  const { t } = useI18n();

  return (
    <Card
      style={[
        styles.providerCard,
        {
          opacity: provider.isEnabled ? 1 : 0.7,
        },
      ]}
      onPress={() => onEdit(provider)}
      mode="outlined"
    >
      <Card.Content style={[styles.providerInfo, { paddingVertical: 8 }]}>
        <View
          style={[
            styles.providerIcon,
            {
              backgroundColor: `${provider.color}15`,
            },
          ]}
        >
          {provider.iconUrl && (
            <Image
              source={{ uri: provider.iconUrl }}
              style={{ width: 24, height: 24 }}
              resizeMode="contain"
            />
          )}
        </View>
        <View style={styles.providerDetails}>
          <Text variant="titleMedium" style={styles.providerName}>
            {provider.name}
          </Text>
          <Chip
            mode="flat"
            compact
            style={[
              styles.statusChip,
              {
                backgroundColor: provider.isEnabled
                  ? theme.colors.primaryContainer
                  : theme.colors.surfaceVariant,
              },
            ]}
            textStyle={{
              color: provider.isEnabled
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant,
            }}
          >
            {provider.isEnabled
              ? t("administration.enabled")
              : t("administration.disabled")}
          </Chip>
        </View>
      </Card.Content>

      <Card.Actions style={styles.providerActions}>
        <IconButton
          icon={provider.isEnabled ? "check" : "plus"}
          size={20}
          iconColor={
            provider.isEnabled ? theme.colors.primary : provider.color!
          }
          onPress={() => onToggle(provider)}
          disabled={toggleLoading}
          loading={toggleLoading}
        />

        <IconButton
          icon="chevron-right"
          size={20}
          iconColor={theme.colors.onSurface}
          onPress={() => onEdit(provider)}
        />
      </Card.Actions>
    </Card>
  );
}

export default function OAuthProvidersSettings() {
  const { navigateToCreateOAuthProvider, navigateToEditOAuthProvider } =
    useNavigationUtils();
  const theme = useTheme();
  const { t } = useI18n();
  const [togglingProviderId, setTogglingProviderId] = useState<string | null>(
    null
  );
  const { setMainLoading } = useAppContext();

  const { data, loading, error, refetch } = useAllOAuthProvidersQuery({});
  const [toggleOAuthProvider] = useToggleOAuthProviderMutation();
  useEffect(() => setMainLoading(loading), [loading]);

  const allProviders = data?.allOAuthProviders || [];

  const handleCreateProvider = () => {
    navigateToCreateOAuthProvider();
  };

  const handleEditProvider = (provider: OAuthProviderFragment) => {
    navigateToEditOAuthProvider(provider.id);
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

  if (error) {
    return (
      <Surface style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon source="alert-circle" size={48} color={theme.colors.error} />
          <Text variant="headlineSmall" style={styles.errorTitle}>
            {t("administration.errorLoadingOAuthProviders")}
          </Text>
          <Text variant="bodyMedium" style={styles.errorText}>
            {t("administration.errorLoadingOAuthProvidersDescription")}
          </Text>
        </View>
      </Surface>
    );
  }

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <View style={styles.container}>
      <PaperScrollView
        onRefresh={handleRefresh}
        loading={loading}
        contentContainerStyle={styles.scrollContent}
      >
        {allProviders.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="folder-open"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("administration.noOAuthProviders")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("administration.noOAuthProvidersDescription")}
            </Text>
          </View>
        ) : (
          <View style={styles.providersContainer}>
            {allProviders.map((item) => renderProviderItem({ item }))}
          </View>
        )}
      </PaperScrollView>

      {/* FAB per creare nuovo provider */}
      <FAB icon="plus" style={styles.fab} onPress={handleCreateProvider} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100, // Space for FAB
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 40,
  },
  errorTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    opacity: 0.7,
    textAlign: "center",
  },
  providerCard: {
    marginBottom: 8,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  providerIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  providerDetails: {
    flex: 1,
  },
  providerName: {
    marginBottom: 4,
  },
  statusChip: {
    alignSelf: "flex-start",
  },
  providerActions: {
    justifyContent: "flex-end",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 60,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  providersContainer: {},
});
