import { Colors } from "@/constants/Colors";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { useGetUserWebhooksQuery } from "../generated/gql-operations-generated";
import SwipeableWebhookItem from "./SwipeableWebhookItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

interface WebhooksSettingsProps {
  refreshing?: boolean;
}

export default function WebhooksSettings({
  refreshing,
}: WebhooksSettingsProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const router = useRouter();
  const {
    setLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;

  const {
    data: userWebhooksData,
    loading,
    refetch,
  } = useGetUserWebhooksQuery();
  useEffect(() => setLoading(loading), [loading]);

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
    router.push("/(mobile)/private/create-webhook");
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t("webhooks.title")}</ThemedText>
        <TouchableOpacity
          style={[
            styles.addButton,
            {
              backgroundColor: isOffline
                ? Colors[colorScheme ?? "light"].buttonDisabled
                : Colors[colorScheme ?? "light"].tint,
            },
          ]}
          onPress={handleCreateWebhook}
          disabled={isOffline}
        >
          <Icon name="add" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.description}>
        {t("webhooks.description")}
      </ThemedText>

      {webhooks.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Icon
            name="webhook"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {t("webhooks.noWebhooksTitle")}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {t("webhooks.noWebhooksSubtext")}
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.webhooksContainer}>
          {sortedWebhooks.map((webhook) => (
            <SwipeableWebhookItem key={webhook.id} webhook={webhook} />
          ))}
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
  addButton: {
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
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
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
  webhooksContainer: {
    flex: 1,
  },
});
