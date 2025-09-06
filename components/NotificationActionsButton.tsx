import { Colors } from "@/constants/Colors";
import { AppIcons } from "@/constants/Icons";
import {
  NotificationActionFragment,
  NotificationActionType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNotificationActions } from "@/hooks/useNotificationActions";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import { useColorScheme } from "@/hooks/useTheme";

import React, { useState } from "react";
import { Modal, StyleSheet, TouchableOpacity, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Icon } from "./ui";

export const filteredActions = (notification: NotificationFragment) => {
  const message = notification.message;
  return ([...(message?.actions || []), message?.tapAction]?.filter(
    (action) =>
      action &&
      [
        NotificationActionType.BackgroundCall,
        NotificationActionType.Webhook,
        NotificationActionType.Snooze,
        NotificationActionType.Navigate,
      ].includes(action.type)
  ) || []) as NotificationActionFragment[];
};

interface NotificationActionsButtonProps {
  actions: NotificationActionFragment[];
  notification: NotificationFragment;
  showInline?: boolean;
}

const NotificationActionsButton: React.FC<NotificationActionsButtonProps> = ({
  showInline = false,
  actions,
  notification,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { getActionTypeIcon, getActionTypeFriendlyName } =
    useNotificationUtils();
  const { executeAction } = useNotificationActions();
  const [modalVisible, setModalVisible] = useState(false);

  if (!actions.length) {
    return null;
  }

  const handleExecuteAction = (action: NotificationActionFragment) => {
    executeAction(notification.id!, action);
    setModalVisible(false);
  };

  const actionCount = actions.length;

  if (showInline) {
    if (actionCount === 0) return null;

    return (
      <>
        <TouchableOpacity
          style={[
            styles.compactActionButton,
            { backgroundColor: "transparent" },
          ]}
          onPress={() => setModalVisible(true)}
        >
          <Icon name="action" size="xs" color="secondary" />
          <ThemedText style={styles.compactActionText}>
            {actionCount}
          </ThemedText>
        </TouchableOpacity>

        <Modal
          visible={modalVisible}
          animationType="slide"
          presentationStyle="pageSheet"
          onRequestClose={() => setModalVisible(false)}
        >
          <ThemedView style={styles.modalContainer}>
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: Colors[colorScheme ?? "light"].border },
              ]}
            >
              <ThemedText style={styles.modalTitle}>
                {t("notificationActions.availableActions")}
              </ThemedText>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setModalVisible(false)}
              >
                <Icon name="cancel" size="md" color="secondary" />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {/* Other Actions Section */}
              {actions.length > 0 && (
                <View style={styles.section}>
                  {actions.map((action, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.actionItem,
                        {
                          backgroundColor:
                            Colors[colorScheme ?? "light"].backgroundCard,
                          borderColor: Colors[colorScheme ?? "light"].border,
                        },
                      ]}
                      onPress={() => handleExecuteAction(action)}
                    >
                      <View style={styles.actionInfo}>
                        <View
                          style={[
                            styles.actionIconContainer,
                            {
                              backgroundColor: action.destructive
                                ? Colors[colorScheme ?? "light"].error
                                : Colors[colorScheme ?? "light"]
                                    .backgroundSecondary,
                            },
                          ]}
                        >
                          <Icon
                            name={getActionTypeIcon(action.type)}
                            size="sm"
                            color={action.destructive ? "white" : "secondary"}
                          />
                        </View>
                        <View style={styles.actionDetails}>
                          <ThemedText
                            style={[
                              styles.actionTitle,
                              action.destructive && {
                                color: Colors[colorScheme ?? "light"].error,
                              },
                            ]}
                          >
                            {action.title || action.value}
                          </ThemedText>
                          <ThemedText style={styles.actionMeta}>
                            {getActionTypeFriendlyName(action.type)} •{" "}
                            {action.value}
                            {action.destructive &&
                              ` • ${t("notificationActions.destructive")}`}
                          </ThemedText>
                        </View>
                      </View>
                      <Icon name="chevron" size="sm" color="secondary" />
                    </TouchableOpacity>
                  ))}
                </View>
              )}

              {/* Empty State */}
              {!actions.length && (
                <View style={styles.emptyState}>
                  <Icon name="warning" size="lg" color="secondary" />
                  <ThemedText style={styles.emptyStateText}>
                    {t("notificationActions.noActionsAvailable")}
                  </ThemedText>
                </View>
              )}
            </View>
          </ThemedView>
        </Modal>
      </>
    );
  }

  const buttonText =
    actionCount === 1
      ? t("notificationActions.actionCount", { count: actionCount })
      : t("notificationActions.actionCountPlural", { count: actionCount });

  return (
    <>
      <TouchableOpacity
        style={[
          styles.actionButton,
          {
            backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary,
            borderColor: Colors[colorScheme ?? "light"].border,
          },
        ]}
        onPress={() => setModalVisible(true)}
      >
        <Icon
          name="action"
          size="sm"
          color={Colors[colorScheme ?? "light"].tint}
        />
        <ThemedText style={styles.actionButtonText}>{buttonText}</ThemedText>
        <Icon name="chevron" size="xs" color="secondary" />
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: Colors[colorScheme ?? "light"].border },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              {t("notificationActions.availableActions")}
            </ThemedText>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={() => setModalVisible(false)}
            >
              <Icon name="cancel" size="md" color="secondary" />
            </TouchableOpacity>
          </View>

          <View style={styles.modalContent}>
            {/* Other Actions Section */}
            {actions.length > 0 && (
              <View style={styles.section}>
                {actions.map((action, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.actionItem,
                      {
                        backgroundColor:
                          Colors[colorScheme ?? "light"].backgroundCard,
                        borderColor: Colors[colorScheme ?? "light"].border,
                      },
                    ]}
                    onPress={() => handleExecuteAction(action)}
                  >
                    <View style={styles.actionInfo}>
                      <View
                        style={[
                          styles.actionIconContainer,
                          {
                            backgroundColor: action.destructive
                              ? Colors[colorScheme ?? "light"].error
                              : Colors[colorScheme ?? "light"]
                                  .backgroundSecondary,
                          },
                        ]}
                      >
                        <Icon
                          name={
                            getActionTypeIcon(
                              action.type
                            ) as keyof typeof AppIcons
                          }
                          size="sm"
                          color={action.destructive ? "white" : "secondary"}
                        />
                      </View>
                      <View style={styles.actionDetails}>
                        <ThemedText
                          style={[
                            styles.actionTitle,
                            action.destructive && {
                              color: Colors[colorScheme ?? "light"].error,
                            },
                          ]}
                        >
                          {action.title || action.value}
                        </ThemedText>
                        <ThemedText style={styles.actionMeta}>
                          {getActionTypeFriendlyName(action.type)} •{" "}
                          {action.value}
                          {action.destructive &&
                            ` • ${t("notificationActions.destructive")}`}
                        </ThemedText>
                      </View>
                    </View>
                    <Icon name="chevron" size="sm" color="secondary" />
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* Empty State */}
            {!actions.length && (
              <View style={styles.emptyState}>
                <Icon name="warning" size="lg" color="secondary" />
                <ThemedText style={styles.emptyStateText}>
                  {t("notificationActions.noActionsAvailable")}
                </ThemedText>
              </View>
            )}
          </View>
        </ThemedView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    marginVertical: 8,
  },
  actionButtonText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "500",
  },
  inlineActionsContainer: {
    flexDirection: "row",
    gap: 6,
    marginTop: 8,
  },
  inlineActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  inlineActionText: {
    fontSize: 11,
    fontWeight: "500",
  },
  compactActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
    gap: 2,
    backgroundColor: "transparent",
  },
  compactActionText: {
    fontSize: 10,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  closeButton: {
    padding: 4,
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    color: "#666",
  },
  actionItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 8,
  },
  actionInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  actionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  actionDetails: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  actionMeta: {
    fontSize: 13,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginTop: 16,
  },
});

export default NotificationActionsButton;
