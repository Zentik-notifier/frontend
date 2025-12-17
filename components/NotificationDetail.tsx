import { SmartTextRenderer } from "@/components";
import AttachmentGallery from "@/components/AttachmentGallery";
import BucketIcon from "@/components/BucketIcon";
import NotificationSnoozeButton from "@/components/NotificationSnoozeButton";
import {
  NotificationActionType,
  NotificationDeliveryType,
  useGetEntityExecutionQuery
} from "@/generated/gql-operations-generated";
import { useNotificationActions } from "@/hooks";
import {
  useBucket,
  useDeleteNotification,
  useMarkAsRead,
  useNotification,
} from "@/hooks/notifications";
import { useAppLog } from "@/hooks/useAppLog";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import * as Clipboard from "expo-clipboard";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { ExecutionExpandedContent } from "./EntityExecutionsSection";
import ButtonGroup from "./ui/ButtonGroup";
import DetailModal from "./ui/DetailModal";
import PaperScrollView from "./ui/PaperScrollView";

interface NotificationDetailProps {
  notificationId: string;
  onBack?: () => void;
}

export default function NotificationDetail({
  notificationId,
  onBack,
}: NotificationDetailProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const { getActionTypeIcon, getNotificationActions, getDeliveryTypeColor } =
    useNotificationUtils();
  const { executeAction } = useNotificationActions();
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const {
    data: notification,
    isLoading: loading,
    error,
  } = useNotification(notificationId);

  const message = notification?.message;
  const bucketId = message?.bucket?.id;

  // Fetch bucket from cache using useBucket hook
  const { bucket } = useBucket(bucketId);

  // Hook per ottenere i dettagli dell'esecuzione se executionId è presente
  const { data: executionData, loading: executionLoading } =
    useGetEntityExecutionQuery({
      variables: { id: message?.executionId || "" },
      skip: !message?.executionId,
    });
  const [enableHtmlRendering, setEnableHtmlRendering] = useState(true);
  const [payloadModalVisible, setPayloadModalVisible] = useState(false);

  const { logAppEvent } = useAppLog();

  // Get bucket name from hook (from cache) or fallback to notification bucket name
  const bucketName = bucket?.name || message?.bucket?.name || "";

  useEffect(() => {
    if (notification) {
      logAppEvent({
        event: "ui_notification_open",
        level: "info",
        message: "User opened notification detail",
        context: "NotificationDetail.useEffect",
        data: {
          notificationId: notification.id,
          bucketId: bucketId,
          bucketName: bucketName,
          isRead: !!notification.readAt,
          hasAttachments: (notification.message?.attachments?.length || 0) > 0,
        },
      }).catch(() => {});

      if (!notification.readAt) {
        markAsReadMutation.mutate({ notificationId: notification.id });
      }
    }
  }, [notification, bucketId, bucketName, logAppEvent]);

  // Get filtered notification actions
  const notificationActions = useMemo(() => {
    if (!notification) return [];
    return getNotificationActions(notification);
  }, [notification, getNotificationActions]);

  const deliveryType = message?.deliveryType ?? NotificationDeliveryType.Normal;

  // Extract all Navigate actions from actions and tapAction
  const navigationLinks = useMemo(() => {
    const links = (message?.actions ?? [])
      .filter(
        (action) =>
          action.type === NotificationActionType.Navigate && action.value
      )
      .map((action) => ({
        title: action.title || action.value?.substring(0, 10),
        url: action.value!,
      }));

    return links;
  }, [message?.tapAction, message?.actions]);

  if (loading || (!notification && !error)) {
    return (
      <Surface
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text
            style={[styles.loadingText, { color: theme.colors.onBackground }]}
          >
            {t("notificationDetail.loading")}
          </Text>
        </View>
      </Surface>
    );
  }

  if (error || !notification) {
    return (
      <Surface
        style={[styles.container, { backgroundColor: theme.colors.background }]}
      >
        <View style={styles.errorContainer}>
          <Icon source="alert-circle" size={48} color={theme.colors.error} />
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t("notificationDetail.notFound")}
          </Text>
        </View>
      </Surface>
    );
  }

  const buildNotificationText = () => {
    const textParts = [message?.title || ""];
    if (message?.subtitle && message.subtitle.trim()) {
      textParts.push(message.subtitle.trim());
    }
    if (message?.body && message.body.trim()) {
      textParts.push(message.body.trim());
    }
    return textParts.join("\n\n");
  };

  const shareNotification = async () => {
    const fullText = buildNotificationText();
    try {
      const result = await Share.share({
        message: fullText,
        title: t("notificationDetail.shareNotification"),
      });

      if (result.action === Share.sharedAction) {
        console.log("Notification shared successfully");
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.error("Error sharing notification:", error);
      // Fallback to clipboard
      try {
        await Clipboard.setStringAsync(fullText);
        Alert.alert(
          t("common.copied"),
          t("notificationDetail.shareNotification")
        );
      } catch (clipboardError) {
        console.error("Clipboard fallback failed:", clipboardError);
      }
    }
  };

  const shareNotificationSource = async () => {
    const sourceData = JSON.stringify(notification, null, 2);
    try {
      const result = await Share.share({
        message: sourceData,
        title: t("notificationDetail.shareSource"),
      });

      if (result.action === Share.sharedAction) {
        console.log("Notification source shared successfully");
      } else if (result.action === Share.dismissedAction) {
        console.log("Share dismissed");
      }
    } catch (error) {
      console.error("Error sharing notification source:", error);
      // Fallback to clipboard
      try {
        await Clipboard.setStringAsync(sourceData);
        Alert.alert(t("common.copied"), t("notificationDetail.shareSource"));
      } catch (clipboardError) {
        console.error("Clipboard fallback failed:", clipboardError);
      }
    }
  };

  const handleDeleteNotification = () => {
    Alert.alert(
      t("notificationDetail.deleteConfirmTitle"),
      t("notificationDetail.deleteConfirmMessage"),
      [
        {
          text: t("notificationDetail.deleteCancelButton"),
          style: "cancel",
        },
        {
          text: t("notificationDetail.deleteConfirmButton"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteNotificationMutation.mutateAsync({
                notificationId: notification.id,
              });
              onBack?.();
            } catch (error) {
              console.error("Error deleting notification:", error);
              Alert.alert(
                t("common.error"),
                t("notificationDetail.delete.error")
              );
            }
          },
        },
      ]
    );
  };

  const attachments = message?.attachments || [];

  const handleLinkPress = async (url: string) => {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (canOpen) {
        await Linking.openURL(url);
      } else {
        Alert.alert(t("common.error"), t("common.navigationFailed"));
      }
    } catch (error) {
      console.error("Error opening link:", error);
      Alert.alert(t("common.error"), t("common.actionFailed"));
    }
  };

  const formatJsonString = (jsonString?: string | null) => {
    if (!jsonString) return "";
    try {
      const parsed = JSON.parse(jsonString);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return jsonString;
    }
  };

  return (
    <PaperScrollView
      fabGroupIcon={notificationActions.length > 0 ? "play" : undefined}
      customActions={[
        {
          icon: "share",
          label: t("notificationDetail.shareSource"),
          onPress: shareNotificationSource,
        },
        ...notificationActions.map((action, index) => ({
          icon: getActionTypeIcon(action.type),
          label: action.title || action.value?.slice(0, 50) || "Action",
          onPress: () => executeAction(notification.id, action),
        })),
      ]}
    >
      <View style={styles.notificationContainer}>
        {/* Header with two columns: left (bucket info) and right (actions + timestamps) */}
        <View style={styles.headerRow}>
          {/* Left side: Bucket info */}
          <View style={styles.headerLeft}>
            <View style={styles.bucketContainer}>
              <BucketIcon
                icon={notification.message?.bucket?.iconUrl}
                bucketId={bucketId || ""}
                size="xxl"
                forceRefetch
              />
              <View style={styles.bucketInfo}>
                <Text
                  style={[
                    styles.bucketName,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {bucketName}
                </Text>
              </View>
            </View>
          </View>

          {/* Right side: Actions and timestamps */}
          <View style={styles.headerRight}>
            {/* Actions */}
            <View style={styles.actionsContainer}>
              <ButtonGroup
                style={{
                  borderWidth:
                    deliveryType === NotificationDeliveryType.Critical ||
                    deliveryType === NotificationDeliveryType.Silent ||
                    deliveryType === NotificationDeliveryType.NoPush
                      ? 2.5
                      : undefined,
                  borderColor: getDeliveryTypeColor(deliveryType),
                }}
              >
                {/* HTML Toggle Button */}
                <IconButton
                  icon={enableHtmlRendering ? "code-tags-check" : "code-tags"}
                  size={15}
                  iconColor={
                    enableHtmlRendering
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                  style={[styles.actionButton, { width: 26, height: 26 }]}
                  onPress={() => setEnableHtmlRendering(!enableHtmlRendering)}
                  accessibilityLabel="toggle-html"
                />

                {/* Share Text Button */}
                <IconButton
                  icon="share"
                  size={15}
                  iconColor={theme.colors.onSurfaceVariant}
                  style={[styles.actionButton, { width: 26, height: 26 }]}
                  onPress={shareNotification}
                  accessibilityLabel="share-text"
                />

                <IconButton
                  icon="delete"
                  size={15}
                  iconColor={theme.colors.error}
                  style={[styles.actionButton, { width: 26, height: 26 }]}
                  onPress={handleDeleteNotification}
                  accessibilityLabel="delete-notification"
                />
                <NotificationSnoozeButton
                  bucketId={bucketId!}
                  variant="detail"
                  showText={false}
                  style={{ width: 26, height: 26 }}
                />
              </ButtonGroup>
            </View>

            {/* Timestamps */}
            <View style={styles.timestampsContainer}>
              {notification.sentAt && (
                <Text
                  style={[
                    styles.timestampText,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {t("notificationDetail.sent")}{" "}
                  {formatDate(notification.sentAt, true)}
                </Text>
              )}
              {notification.readAt && (
                <Text
                  style={[
                    styles.timestampText,
                    { color: theme.colors.onBackground },
                  ]}
                >
                  {t("notificationDetail.read")}{" "}
                  {formatDate(notification.readAt, true)}
                </Text>
              )}
            </View>

            {/* Execution Payload Button */}
            {message?.executionId && (
              <ButtonGroup variant="compact">
                <TouchableOpacity
                  style={[
                    styles.payloadButtonContainer,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                    },
                  ]}
                  onPress={() => setPayloadModalVisible(true)}
                  accessibilityLabel="view-payload"
                >
                  <Icon
                    source="code-braces"
                    size={12}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <Text
                    style={[
                      styles.payloadButtonText,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("notificationDetail.showPayload")}
                  </Text>
                </TouchableOpacity>
              </ButtonGroup>
            )}
          </View>
        </View>

        {/* Title */}
        <SmartTextRenderer
          content={message?.title!}
          style={styles.title}
          enableHtml={enableHtmlRendering}
        />

        {/* Subtitle */}
        {message?.subtitle && (
          <SmartTextRenderer
            content={message.subtitle}
            style={styles.subtitle}
            enableHtml={enableHtmlRendering}
          />
        )}

        {/* Body */}
        {message?.body && (
          <SmartTextRenderer
            content={message.body}
            style={styles.body}
            enableHtml={enableHtmlRendering}
          />
        )}

        {/* Links */}
        {navigationLinks.length > 0 && (
          <View style={styles.linksContainer}>
            <Text
              style={[
                styles.linksTitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              Links
            </Text>
            <View style={styles.linksGrid}>
              {navigationLinks.slice(0, 3).map((link, index) => (
                <TouchableOpacity
                  key={index}
                  style={[
                    styles.linkItem,
                    { backgroundColor: theme.colors.surfaceVariant },
                  ]}
                  onPress={() => handleLinkPress(link.url)}
                  activeOpacity={0.7}
                >
                  <Icon
                    source="open-in-new"
                    size={18}
                    color={theme.colors.primary}
                  />
                  <Text
                    style={[styles.linkText, { color: theme.colors.primary }]}
                    numberOfLines={1}
                  >
                    {link.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* Attachments */}
        {attachments.length > 0 && (
          <AttachmentGallery
            attachments={attachments}
            selectorPosition="top"
            showTitle
            autoPlay
            enableFullScreen
            fullScreenTrigger="tap"
            notificationDate={new Date(notification.createdAt).getTime()}
          />
        )}
      </View>

      {/* Payload Modal */}
      <DetailModal
        visible={payloadModalVisible}
        onDismiss={() => setPayloadModalVisible(false)}
        title={t("notificationDetail.payloadModal.title")}
        icon="code-braces"
        actions={{
          cancel: {
            label: t("common.close"),
            onPress: () => setPayloadModalVisible(false),
          },
          confirm: {
            label: t("common.close"),
            onPress: () => setPayloadModalVisible(false),
          },
        }}
      >
        {executionLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>
              {t("notificationDetail.payloadModal.loading")}
            </Text>
          </View>
        ) : executionData?.entityExecution ? (
          <ExecutionExpandedContent execution={executionData.entityExecution} />
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>
              {t("notificationDetail.payloadModal.error")}
            </Text>
          </View>
        )}
      </DetailModal>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
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
    padding: 32,
  },
  errorText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  notificationContainer: {
    gap: 16,
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  headerLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  headerRight: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  actionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  bucketContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  bucketInfo: {
    marginLeft: 12,
  },
  bucketName: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
    textTransform: "uppercase",
  },
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
  },
  priorityBadge: {
    paddingHorizontal: 4,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 8,
  },
  priorityBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  timestampsContainer: {
    flexDirection: "column",
    alignItems: "flex-end",
    justifyContent: "flex-start",
    gap: 2,
  },
  timestampText: {
    fontSize: 10,
    opacity: 0.7,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  filler: {
    flex: 1,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    fontStyle: "italic",
    lineHeight: 22,
  },
  body: {
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 24,
    marginBottom: 16,
  },
  linksContainer: {
    marginTop: 16,
  },
  linksTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
  },
  linksGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  linkItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  linkText: {
    fontSize: 13,
    fontWeight: "500",
    flex: 1,
  },
  htmlToggleButtonSmall: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 0, // ✅ Rimuovo border radius per integrazione
    borderWidth: 0, // ✅ Rimuovo completamente il bordo
  },
  htmlToggleTextSmall: {
    fontSize: 9,
    fontWeight: "500",
  },
  payloadButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 0, // ✅ Rimuovo border radius per integrazione
    borderWidth: 0, // ✅ Rimuovo completamente il bordo
    minWidth: 80,
  },
  payloadButtonText: {
    fontSize: 9,
    fontWeight: "500",
  },
  // Details grid styles (reused from EntityExecutionsSection)
  detailsGrid: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  detailLabel: {
    fontWeight: "600",
    opacity: 0.7,
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: "right",
  },
  // Code section styles (reused from EntityExecutionsSection)
  codeSection: {
    marginBottom: 16,
  },
  codeSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  codeLabel: {
    fontWeight: "600",
  },
  codeScrollView: {
    maxHeight: 200,
    borderWidth: 1,
    borderColor: "#e0e0e0",
    borderRadius: 8,
  },
  codeInput: {
    fontFamily: "monospace",
    fontSize: 12,
    padding: 12,
    minHeight: 100,
  },
  // Menu item styles (from SwipeableItem)
  menuItem: {
    backgroundColor: "transparent",
    borderRadius: 4,
    marginVertical: 1,
  },
  menuItemContent: {
    borderRadius: 4,
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  menuItemText: {
    fontSize: 14,
    marginLeft: 8,
    flex: 1,
  },
});
