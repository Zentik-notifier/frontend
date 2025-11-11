import { SmartTextRenderer } from "@/components";
import AttachmentGallery from "@/components/AttachmentGallery";
import BucketIcon from "@/components/BucketIcon";
import FullScreenMediaViewer from "@/components/FullScreenMediaViewer";
import NotificationSnoozeButton from "@/components/NotificationSnoozeButton";
import {
  MediaType,
  NotificationActionType,
  useGetEntityExecutionQuery,
} from "@/generated/gql-operations-generated";
import {
  useDeleteNotification,
  useMarkAsRead,
  useNotification,
} from "@/hooks/notifications";
import { useNotificationActions } from "@/hooks";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
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
  const {
    getNotificationActions,
    getActionTypeIcon,
    getActionTypeFriendlyName,
  } = useNotificationUtils();
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

  // Hook per ottenere i dettagli dell'esecuzione se executionId è presente
  const { data: executionData, loading: executionLoading } =
    useGetEntityExecutionQuery({
      variables: { id: message?.executionId || "" },
      skip: !message?.executionId,
    });
  const [isCopying, setIsCopying] = useState(false);
  const [enableHtmlRendering, setEnableHtmlRendering] = useState(true);
  const [payloadModalVisible, setPayloadModalVisible] = useState(false);

  const handleMediaPress = (imageUri: string) => {
    const attachments = notification?.message?.attachments || [];
    const index = attachments.findIndex(
      (attachment) => attachment.url === imageUri
    );
    setFullScreenIndex(index >= 0 ? index : 0);
    setFullScreenImageVisible(true);
  };

  useEffect(() => {
    if (notification && !notification.readAt) {
      markAsReadMutation.mutate({ notificationId: notification.id });
    }
  }, [notification, markAsReadMutation]);

  const bucketName = message?.bucket?.name;

  // Get filtered notification actions
  const notificationActions = useMemo(() => {
    if (!notification) return [];
    return getNotificationActions(notification);
  }, [notification, getNotificationActions]);

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

  const copyNotificationToClipboard = async () => {
    try {
      const fullText = buildNotificationText();
      await Clipboard.setStringAsync(fullText);
      setIsCopying(true);
      setTimeout(() => {
        setIsCopying(false);
      }, 2000);
    } catch (error) {
      console.error("Error copying notification:", error);
    }
  };

  const copyNotificationSource = async () => {
    try {
      const sourceData = JSON.stringify(notification, null, 2);
      await Clipboard.setStringAsync(sourceData);
      setIsCopying(true);
      setTimeout(() => {
        setIsCopying(false);
      }, 2000);
    } catch (error) {
      console.error("Error copying notification source:", error);
    }
  };

  const shareNotification = async () => {
    const fullText = buildNotificationText();
    try {
      if (await Sharing.isAvailableAsync()) {
        const fileName = `notification_${Date.now()}.txt`;
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        file.write(fullText, {});

        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: t("notificationDetail.shareNotification"),
          UTI: "public.plain-text",
        });

        try {
          file.delete();
        } catch (cleanupError) {
          console.log("File cleanup failed:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error sharing notification:", error);
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
      if (await Sharing.isAvailableAsync()) {
        const fileName = `notification_source_${Date.now()}.json`;
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        file.write(sourceData, {});

        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: t("notificationDetail.shareSource"),
          UTI: "public.json",
        });

        try {
          file.delete();
        } catch (cleanupError) {
          console.log("File cleanup failed:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error sharing notification source:", error);
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
              await deleteNotificationMutation.mutateAsync({ notificationId: notification.id });
              Alert.alert(
                t("common.success"),
                t("notificationDetail.deleteSuccess"),
                [
                  {
                    text: t("common.ok"),
                    onPress: onBack,
                  },
                ]
              );
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
          icon: "content-copy",
          label: t("notificationDetail.copySource"),
          onPress: copyNotificationSource,
        },
        {
          icon: "share",
          label: t("notificationDetail.shareSource"),
          onPress: shareNotificationSource,
        },
        {
          icon: "code-tags",
          label: enableHtmlRendering
            ? t("notificationDetail.htmlEnabled")
            : t("notificationDetail.htmlDisabled"),
          onPress: () => setEnableHtmlRendering(!enableHtmlRendering),
          style: {
            backgroundColor: enableHtmlRendering
              ? theme.colors.primaryContainer
              : theme.colors.surfaceVariant,
          },
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
              <BucketIcon bucketId={message?.bucket?.id || ""} size="xxl" />
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
              <ButtonGroup>
                {/* Copy Text Button */}
                <IconButton
                  icon={isCopying ? "check" : "content-copy"}
                  size={15}
                  iconColor={
                    isCopying
                      ? theme.colors.primary
                      : theme.colors.onSurfaceVariant
                  }
                  style={[styles.actionButton, { width: 26, height: 26 }]}
                  onPress={copyNotificationToClipboard}
                  accessibilityLabel="copy-text"
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
                  bucketId={message?.bucket?.id!}
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
          <View style={styles.attachmentsContainer}>
            <AttachmentGallery
              attachments={attachments}
              onMediaPress={handleMediaPress}
              notificationDate={new Date(notification.createdAt).getTime()}
            />
          </View>
        )}
      </View>

      {/* Full Screen Media Viewer */}
      <FullScreenMediaViewer
        visible={fullScreenImageVisible}
        url={attachments[fullScreenIndex]?.url || ""}
        mediaType={attachments[fullScreenIndex]?.mediaType || MediaType.Image}
        originalFileName={attachments[fullScreenIndex]?.name ?? undefined}
        notificationDate={new Date(notification.createdAt).getTime()}
        onClose={() => setFullScreenImageVisible(false)}
        enableSwipeNavigation={attachments.length > 1}
        onSwipeLeft={() =>
          setFullScreenIndex((fullScreenIndex + 1) % attachments.length)
        }
        onSwipeRight={() =>
          setFullScreenIndex(
            fullScreenIndex === 0 ? attachments.length - 1 : fullScreenIndex - 1
          )
        }
        currentPosition={
          attachments.length > 1
            ? `${fullScreenIndex + 1} / ${attachments.length}`
            : undefined
        }
      />

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
  attachmentsContainer: {
    marginBottom: 16,
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
