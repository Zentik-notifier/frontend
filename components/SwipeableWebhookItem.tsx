import { Colors } from "@/constants/Colors";
import {
  UserWebhookFragment,
  useDeleteWebhookMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { getHttpMethodColor } from "@/utils/webhookUtils";
import { useRouter } from "expo-router";
import React from "react";
import {
  Alert,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import IdWithCopyButton from "./IdWithCopyButton";
import SwipeableItem from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

interface SwipeableWebhookItemProps {
  webhook: UserWebhookFragment;
}

const SwipeableWebhookItem: React.FC<SwipeableWebhookItemProps> = ({
  webhook,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const router = useRouter();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;
  const [deleteWebhookMutation] = useDeleteWebhookMutation();

  const handleEditWebhook = (webhookId: string) => {
    router.push(`/(mobile)/private/edit-webhook?webhookId=${webhookId}`);
  };

  const deleteWebhook = async (webhookId: string) => {
    Alert.alert(
      t("webhooks.deleteConfirmTitle"),
      t("webhooks.deleteConfirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("webhooks.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteWebhookMutation({
                variables: { id: webhookId },
                refetchQueries: ["GetUserWebhooks"],
              });
              Alert.alert(
                t("common.success"),
                t("webhooks.deleteSuccessMessage")
              );
            } catch (error) {
              console.error("Error deleting webhook:", error);
              Alert.alert(t("common.error"), t("webhooks.deleteErrorMessage"));
            }
          },
        },
      ]
    );
  };

  const deleteAction = !isOffline
    ? {
        icon: "delete" as const,
        label: t("webhooks.delete"),
        backgroundColor: "#ff4444",
        onPress: () => deleteWebhook(webhook.id),
      }
    : undefined;

  return (
    <SwipeableItem rightAction={deleteAction}>
      <TouchableWithoutFeedback onPress={() => handleEditWebhook(webhook.id)}>
        <ThemedView
          style={[
            styles.itemCard,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
            },
          ]}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <View
                style={[
                  styles.methodBadge,
                  { backgroundColor: getHttpMethodColor(webhook.method) },
                ]}
              >
                <Text style={styles.methodText}>{webhook.method}</Text>
              </View>
              <View style={styles.webhookDetails}>
                <ThemedText style={styles.itemName}>{webhook.name}</ThemedText>
                <ThemedText style={styles.webhookUrl} numberOfLines={1}>
                  {webhook.url}
                </ThemedText>
              </View>
            </View>
          </View>

          {webhook.headers && webhook.headers.length > 0 && (
            <View style={styles.headersInfo}>
              <Icon
                name="settings"
                size={12}
                color={Colors[colorScheme ?? "light"].icon}
              />
              <ThemedText style={styles.headersText}>
                {webhook.headers.length} header
                {webhook.headers.length !== 1 ? "s" : ""}
              </ThemedText>
            </View>
          )}

          <ThemedText style={styles.itemDetail}>
            Created:{" "}
            {formatDate(webhook.createdAt, {
              format: "short",
              includeTime: false,
            })}
          </ThemedText>

          <IdWithCopyButton
            id={webhook.id}
            label="Webhook ID"
            copyMessage="Webhook ID copied"
            style={styles.webhookIdContainer}
            valueStyle={styles.itemId}
          />
        </ThemedView>
      </TouchableWithoutFeedback>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  methodBadge: {
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 60,
    alignItems: "center",
  },
  methodText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  webhookDetails: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  webhookUrl: {
    fontSize: 14,
    opacity: 0.7,
  },
  headersInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headersText: {
    fontSize: 12,
    opacity: 0.6,
    marginLeft: 4,
  },
  itemDetail: {
    fontSize: 13,
    opacity: 0.7,
    marginBottom: 4,
  },
  itemId: {
    fontSize: 11,
    opacity: 0.7,
    fontFamily: "monospace",
    marginBottom: 4,
  },
  webhookIdContainer: {
    marginBottom: 0,
  },
});

export default SwipeableWebhookItem;
