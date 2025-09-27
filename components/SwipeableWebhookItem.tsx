import {
  UserWebhookFragment,
  useDeleteWebhookMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { getHttpMethodColor } from "@/utils/webhookUtils";
import React, { useState } from "react";
import {
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import SwipeableItem from "./SwipeableItem";
import Icon from "./ui/Icon";
import CopyButton from "./ui/CopyButton";
import { useNavigationUtils } from "@/utils/navigation";
import {
  Card,
  Dialog,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

interface SwipeableWebhookItemProps {
  webhook: UserWebhookFragment;
}

const SwipeableWebhookItem: React.FC<SwipeableWebhookItemProps> = ({
  webhook,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const { navigateToEditWebhook } = useNavigationUtils();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const isOffline = isOfflineAuth || isBackendUnreachable;
  const [deleteWebhookMutation] = useDeleteWebhookMutation();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const handleEditWebhook = (webhookId: string) => {
    navigateToEditWebhook(webhookId);
  };

  const deleteWebhook = async (webhookId: string) => {
    try {
      await deleteWebhookMutation({
        variables: { id: webhookId },
        refetchQueries: ["GetUserWebhooks"],
      });
      setDialogMessage(t("webhooks.deleteSuccessMessage"));
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Error deleting webhook:", error);
      setDialogMessage(t("webhooks.deleteErrorMessage"));
      setShowErrorDialog(true);
    }
  };

  const deleteAction = !isOffline
    ? {
        icon: "delete" as const,
        label: t("webhooks.delete"),
        backgroundColor: "#ff4444",
        onPress: () => deleteWebhook(webhook.id),
        showAlert: {
          title: t("webhooks.deleteConfirmTitle"),
          message: t("webhooks.deleteConfirmMessage"),
          confirmText: t("webhooks.delete"),
          cancelText: t("common.cancel"),
        },
      }
    : undefined;

  return (
    <SwipeableItem
      rightAction={deleteAction}
      marginBottom={8}
      borderRadius={12}
    >
      <TouchableWithoutFeedback onPress={() => handleEditWebhook(webhook.id)}>
        <View style={styles.itemCard}>
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
                  <Text variant="titleMedium" style={styles.itemName}>
                    {webhook.name}
                  </Text>
                  <Text variant="bodySmall" style={styles.webhookUrl} numberOfLines={1}>
                    {webhook.url}
                  </Text>
                </View>
              </View>
              <CopyButton
                text={webhook.id}
                size={20}
                style={styles.copyIdButton}
              />
            </View>

            {webhook.headers && webhook.headers.length > 0 && (
              <View style={styles.headersInfo}>
                <Icon
                  name="settings"
                  size={12}
                  color={theme.colors.onSurfaceVariant}
                />
                <Text variant="bodySmall" style={styles.headersText}>
                  {webhook.headers.length} header
                  {webhook.headers.length !== 1 ? "s" : ""}
                </Text>
              </View>
            )}

            <Text variant="bodySmall" style={styles.itemDetail}>
              Created: {formatDate(webhook.createdAt)}
            </Text>
        </View>
      </TouchableWithoutFeedback>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
        >
          <Dialog.Title>{t("common.success")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowSuccessDialog(false)}>
              {t("common.ok")}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  copyIdButton: {
    margin: 0,
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
    marginBottom: 2,
  },
  webhookUrl: {
    opacity: 0.7,
  },
  headersInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  headersText: {
    opacity: 0.6,
    marginLeft: 4,
  },
  itemDetail: {
    opacity: 0.7,
    marginBottom: 4,
  },
});

export default SwipeableWebhookItem;
