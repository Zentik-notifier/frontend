import PaperScrollView from "@/components/ui/PaperScrollView";
import { useAppContext } from "@/contexts/AppContext";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import { useGetUserWebhooksQuery } from "../generated/gql-operations-generated";
import SwipeableWebhookItem from "./SwipeableWebhookItem";

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
    <PaperScrollView
      onAdd={handleCreateWebhook}
      onRefresh={handleRefresh}
      loading={loading}
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
  );
}

const styles = StyleSheet.create({
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
});
