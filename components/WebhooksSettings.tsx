import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { useGetUserWebhooksQuery } from "../generated/gql-operations-generated";
import SwipeableWebhookItem from "./SwipeableWebhookItem";
import { useNavigationUtils } from "@/utils/navigation";
import { FAB, Icon, Text, useTheme } from "react-native-paper";

interface WebhooksSettingsProps {
  refreshing?: boolean;
}

export default function WebhooksSettings({
  refreshing,
}: WebhooksSettingsProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToCreateWebhook } = useNavigationUtils();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;

  const {
    data: userWebhooksData,
    loading,
    refetch,
  } = useGetUserWebhooksQuery();
  useEffect(() => setMainLoading(loading), [loading]);

  const webhooks = userWebhooksData?.userWebhooks || [];
  const sortedWebhooks = useEntitySorting(webhooks, "desc");

  // Refetch data when refreshing prop changes
  useEffect(() => {
    if (refreshing) {
      console.log("WebhooksSettings: Refreshing data...");
    }
    refetch();
  }, [refreshing, refetch]);

  const handleCreateWebhook = () => {
    navigateToCreateWebhook();
  };

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <View style={styles.container}>
      <PaperScrollView
        onRefresh={handleRefresh}
        loading={loading}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {webhooks.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="webhook"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("webhooks.noWebhooksTitle")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("webhooks.noWebhooksSubtext")}
            </Text>
          </View>
        ) : (
          <View style={styles.webhooksContainer}>
            {sortedWebhooks.map((webhook) => (
              <SwipeableWebhookItem key={webhook.id} webhook={webhook} />
            ))}
          </View>
        )}
      </PaperScrollView>

      {/* FAB per creare nuovo webhook */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={handleCreateWebhook}
        disabled={isOffline}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  scrollView: {
    paddingHorizontal: 0, // Rimuove il padding orizzontale di PaperScrollView
  },
  scrollContent: {
    paddingHorizontal: 16, // Aggiunge il padding orizzontale solo al contenuto
    paddingVertical: 8, // Aggiunge padding verticale per evitare gap
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  webhooksContainer: {
    flex: 1,
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
});
