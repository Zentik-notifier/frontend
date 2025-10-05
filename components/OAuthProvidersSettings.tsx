import {
  OAuthProviderFragment,
  useAllOAuthProvidersQuery
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import SwipeableOauthProviderItem from "./SwipeableOauthProviderItem";
import PaperScrollView from "./ui/PaperScrollView";

export default function OAuthProvidersSettings() {
  const { navigateToCreateOAuthProvider, navigateToEditOAuthProvider } =
    useNavigationUtils();
  const theme = useTheme();
  const { t } = useI18n();

  const { data, loading, error, refetch } = useAllOAuthProvidersQuery({});

  const allProviders = data?.allOAuthProviders || [];

  const handleCreateProvider = () => {
    navigateToCreateOAuthProvider();
  };

  const renderProviderItem = ({ item }: { item: OAuthProviderFragment }) => (
    <SwipeableOauthProviderItem
      provider={item}
      onDelete={() => refetch()}
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
        onAdd={handleCreateProvider}
        onRefresh={handleRefresh}
        loading={loading}
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
