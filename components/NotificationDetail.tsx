import { SmartTextRenderer } from "@/components";
import AttachmentGallery from "@/components/AttachmentGallery";
import BucketIcon from "@/components/BucketIcon";
import FullScreenMediaViewer from "@/components/FullScreenMediaViewer";
import NotificationSnoozeButton from "@/components/NotificationSnoozeButton";
import { MediaType } from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import {
  useDeleteNotification,
  useMarkNotificationRead,
  useNotificationById,
} from "@/hooks/useNotifications";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import * as Clipboard from "expo-clipboard";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { Icon, IconButton, Surface, Text, useTheme } from "react-native-paper";
import { NotificationActionsMenu } from "./NotificationActionsMenu";
import ButtonGroup from "./ui/ButtonGroup";

interface NotificationDetailProps {
  notificationId: string;
  forceFetch?: boolean;
  onBack?: () => void;
}

export default function NotificationDetail({
  notificationId,
  forceFetch,
  onBack,
}: NotificationDetailProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const { getDeliveryTypeFriendlyName, getDeliveryTypeColor } =
    useNotificationUtils();
  const markAsRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();

  const { notification, loading, error } = useNotificationById(
    notificationId,
    forceFetch
  );
  const [isCopying, setIsCopying] = useState(false);

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
      markAsRead(notification.id).catch(console.error);
    }
  }, [notification]);

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

  const message = notification.message;
  const bucketName = message?.bucket?.name;

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
              await deleteNotification(notification.id);
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
                    size={18}
                    iconColor={isCopying ? theme.colors.primary : theme.colors.onSurfaceVariant}
                    style={styles.actionButton}
                    onPress={copyNotificationToClipboard}
                    accessibilityLabel="copy-notification"
                  />
                  <IconButton
                    icon="share"
                    size={18}
                    iconColor={theme.colors.onSurfaceVariant}
                    style={styles.actionButton}
                    onPress={shareNotification}
                    accessibilityLabel="share-notification"
                  />
                  <IconButton
                    icon="delete"
                    size={18}
                    iconColor={theme.colors.error}
                    style={styles.actionButton}
                    onPress={handleDeleteNotification}
                    accessibilityLabel="delete-notification"
                  />
                  {/* priority badge removed from this group */}
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
            </View>
          </View>

          {/* Actions and Snooze buttons */}
          <View style={styles.actionsRow}>
            <NotificationActionsMenu
              notification={notification}
              onlyActions
              showTextAndIcon
            />
            <View style={styles.filler} />
            <NotificationSnoozeButton
              bucketId={message?.bucket?.id}
              variant="detail"
              showText
            />
          </View>

          {/* Title */}
          <SmartTextRenderer content={message?.title} style={styles.title} />

          {/* Subtitle */}
          {message?.subtitle && (
            <SmartTextRenderer
              content={message.subtitle}
              style={styles.subtitle}
            />
          )}

          {/* Body */}
          {message?.body && (
            <SmartTextRenderer content={message.body} style={styles.body} />
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
    padding: 8,
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
  attachmentsContainer: {
    marginBottom: 16,
  },
});
