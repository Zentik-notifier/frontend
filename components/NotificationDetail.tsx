import { SmartTextRenderer } from "@/components";
import AttachmentGallery from "@/components/AttachmentGallery";
import BucketIcon from "@/components/BucketIcon";
import FullScreenMediaViewer from "@/components/FullScreenMediaViewer";
import NotificationSnoozeButton from "@/components/NotificationSnoozeButton";
import {
  MediaType,
  NotificationActionType,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import {
  useNotificationDetail,
  useDeleteNotification,
  useMarkAsRead,
} from "@/hooks/notifications";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Linking,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { NotificationActionsMenu } from "./NotificationActionsMenu";
import ButtonGroup from "./ui/ButtonGroup";

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
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const markAsReadMutation = useMarkAsRead();
  const deleteNotificationMutation = useDeleteNotification();

  const {
    data: notification,
    isLoading: loading,
    error,
  } = useNotificationDetail(notificationId);
  const [isCopying, setIsCopying] = useState(false);
  const [enableHtmlRendering, setEnableHtmlRendering] = useState(true);

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
      markAsReadMutation.mutate(notification.id);
    }
  }, [notification, markAsReadMutation]);

  const message = notification?.message;
  const bucketName = message?.bucket?.name;

  // Extract all Navigate actions from actions and tapAction
  const navigationLinks = useMemo(() => {
    const links = [];

    // Check tapAction
    if (
      message?.tapAction?.type === NotificationActionType.Navigate &&
      message.tapAction.value
    ) {
      links.push({
        title: message.tapAction.title || message.tapAction.value,
        url: message.tapAction.value,
      });
    }

    // Check actions
    message?.actions?.forEach((action) => {
      if (action.type === NotificationActionType.Navigate && action.value) {
        links.push({
          title: action.title || action.value,
          url: action.value,
        });
      }
    });

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
              await deleteNotificationMutation.mutateAsync(notification.id);
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

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
                    accessibilityLabel="copy-notification"
                  />
                  <IconButton
                    icon="share"
                    size={15}
                    iconColor={theme.colors.onSurfaceVariant}
                    style={[styles.actionButton, { width: 26, height: 26 }]}
                    onPress={shareNotification}
                    accessibilityLabel="share-notification"
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

              {/* HTML Rendering Toggle */}
              <TouchableOpacity
                style={[
                  styles.htmlToggleButtonSmall,
                  {
                    backgroundColor: enableHtmlRendering
                      ? theme.colors.primaryContainer
                      : theme.colors.surfaceVariant,
                    borderColor: theme.colors.outline,
                  },
                ]}
                onPress={() => setEnableHtmlRendering(!enableHtmlRendering)}
              >
                <Icon
                  source={"code-tags"}
                  size={12}
                  color={
                    enableHtmlRendering
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant
                  }
                />
                <Text
                  style={[
                    styles.htmlToggleTextSmall,
                    {
                      color: enableHtmlRendering
                        ? theme.colors.onPrimaryContainer
                        : theme.colors.onSurfaceVariant,
                    },
                  ]}
                >
                  {enableHtmlRendering
                    ? t("notificationDetail.htmlEnabled")
                    : t("notificationDetail.htmlDisabled")}
                </Text>
              </TouchableOpacity>
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
      </ScrollView>

      {/* Actions Menu FAB */}
      <NotificationActionsMenu
        notification={notification}
        onlyActions
        showTextAndIcon={false}
      />

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
    </Surface>
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
    marginBottom: 8,
    lineHeight: 30,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
    fontStyle: "italic",
    marginBottom: 16,
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
    borderRadius: 6,
    borderWidth: 1,
    marginTop: 4,
  },
  htmlToggleTextSmall: {
    fontSize: 9,
    fontWeight: "500",
  },
});
