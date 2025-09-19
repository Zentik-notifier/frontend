import { SmartTextRenderer } from "@/components";
import AttachmentGallery from "@/components/AttachmentGallery";
import BucketIcon from "@/components/BucketIcon";
import FullScreenMediaViewer from "@/components/FullScreenMediaViewer";

import NotificationActionsButton, {
  filteredActions,
} from "@/components/NotificationActionsButton";
import NotificationSnoozeButton from "@/components/NotificationSnoozeButton";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import {
  MediaType,
  NotificationDeliveryType,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import {
  useDeleteNotification,
  useMarkNotificationRead,
  useNotificationById,
} from "@/hooks/useNotifications";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import { Paths, File } from "expo-file-system";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const router = useRouter();
  const { formatDate } = useDateFormat();
  const [fullScreenImageVisible, setFullScreenImageVisible] = useState(false);
  const [fullScreenIndex, setFullScreenIndex] = useState(0);
  const { getDeliveryTypeFriendlyName, getDeliveryTypeColor } =
    useNotificationUtils();
  const markAsRead = useMarkNotificationRead();
  const deleteNotification = useDeleteNotification();

  const { notification, loading, error } = useNotificationById(id as string);
  const handleMediaPress = (imageUri: string) => {
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
      <>
        <Stack.Screen
          options={{
            title: t("notificationDetail.loading"),
            headerLeft: () => (
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].text}
                onPress={() => router.back()}
                style={{ paddingRight: 16 }}
              />
            ),
          }}
        />
        <ThemedView style={styles.container}>
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={Colors[colorScheme ?? "light"].tint}
            />
            <ThemedText style={styles.loadingText}>
              {t("notificationDetail.loading")}
            </ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  if (error || !notification) {
    return (
      <>
        <Stack.Screen
          options={{
            title: t("common.error"),
            headerLeft: () => (
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].text}
                onPress={() => router.back()}
                style={{ paddingRight: 16 }}
              />
            ),
          }}
        />
        <ThemedView style={styles.container}>
          <View style={styles.errorContainer}>
            <Ionicons name="alert-circle" size={48} color="#ff4444" />
            <ThemedText style={styles.errorText}>
              {t("notificationDetail.notFound")}
            </ThemedText>
          </View>
        </ThemedView>
      </>
    );
  }

  const message = notification.message;
  const bucketColor = message?.bucket?.color || "#6c757d";
  const bucketIcon = message?.bucket?.icon;
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
      Alert.alert(
        t("common.copied"),
        t("notificationDetail.notificationCopied")
      );
    } catch (error) {
      console.error("Error copying notification:", error);
    }
  };

  const shareNotification = async () => {
    const fullText = buildNotificationText();
    try {
      if (await Sharing.isAvailableAsync()) {
        // Creo un file temporaneo con il testo della notifica
        const fileName = `notification_${Date.now()}.txt`;
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        file.write(fullText);

        await Sharing.shareAsync(fileUri, {
          mimeType: "text/plain",
          dialogTitle: t("notificationDetail.shareNotification"),
          UTI: "public.plain-text",
        });

        // Pulisco il file temporaneo dopo la condivisione
        try {
          file.delete();
        } catch (cleanupError) {
          console.log("File cleanup failed:", cleanupError);
        }
      }
    } catch (error) {
      console.error("Error sharing notification:", error);
      // Fallback: copia negli appunti se la condivisione fallisce
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
                    onPress: () => router.back(),
                  },
                ]
              );
            } catch (error) {
              console.error("Error deleting notification:", error);
              Alert.alert(t("common.error"), t("common.error"));
            }
          },
        },
      ]
    );
  };

  const attachments = (message?.attachments ?? []).filter(
    (attachment) => attachment.mediaType !== MediaType.Icon
  );
  const actions = filteredActions(notification);

  return (
    <>
      <Stack.Screen
        options={{
          title: notification.message?.title || t("notificationDetail.title"),
          headerLeft: () => (
            <Ionicons
              name="close"
              size={24}
              color={Colors[colorScheme].text}
              onPress={() => router.back()}
              style={{ paddingRight: 16 }}
            />
          ),
          headerStyle: {
            backgroundColor: Colors[colorScheme].background,
          },
          headerTintColor: Colors[colorScheme].text,
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            {/* Bucket Info */}
            <View style={styles.bucketSection}>
              <View style={styles.leftColumn}>
                <View style={styles.bucketInfo}>
                  <BucketIcon
                    bucketId={message?.bucket?.id}
                    size="xxl"
                    noRouting
                  />
                  <ThemedText style={styles.bucketName}>
                    {bucketName}
                  </ThemedText>
                </View>
              </View>
              <View style={styles.statusSection}>
                <View style={styles.priorityRow}>
                  {/* Action Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor:
                            Colors[colorScheme].backgroundSecondary,
                        },
                      ]}
                      onPress={copyNotificationToClipboard}
                    >
                      <Ionicons
                        name="copy"
                        size={16}
                        color={Colors[colorScheme].tabIconDefault}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor:
                            Colors[colorScheme].backgroundSecondary,
                        },
                      ]}
                      onPress={shareNotification}
                    >
                      <Ionicons
                        name="share"
                        size={16}
                        color={Colors[colorScheme].tabIconDefault}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.actionButton,
                        {
                          backgroundColor: Colors[colorScheme].error,
                        },
                      ]}
                      onPress={handleDeleteNotification}
                    >
                      <Ionicons name="trash" size={16} color="white" />
                    </TouchableOpacity>

                    {message?.deliveryType !==
                      NotificationDeliveryType.Normal && (
                      <View
                        style={[
                          styles.actionButton,
                          {
                            backgroundColor: getDeliveryTypeColor(
                              message?.deliveryType as NotificationDeliveryType
                            ),
                          },
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {getDeliveryTypeFriendlyName(
                            message?.deliveryType as NotificationDeliveryType
                          )}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>

                {notification.sentAt && (
                  <ThemedText style={styles.timestampText}>
                    {t("notificationDetail.sent")}{" "}
                    {formatDate(notification.sentAt, true)}
                  </ThemedText>
                )}
                {notification.readAt && (
                  <ThemedText style={styles.timestampText}>
                    {t("notificationDetail.read")}{" "}
                    {formatDate(notification.readAt, true)}
                  </ThemedText>
                )}
                {/* Actions / Snooze row placed below to avoid conflict with dates */}
              </View>
            </View>

            {/* Header actions row: actions -- spacer -- snooze */}
            {(actions.length > 0 || message?.bucket?.id) && (
              <View style={styles.headerActionsRow}>
                {actions.length > 0 && (
                  <NotificationActionsButton
                    notification={notification}
                    actions={actions}
                    variant="detail"
                    showTextLabel
                  />
                )}
                <View style={styles.filler} />
                <NotificationSnoozeButton
                  bucketId={message?.bucket?.id}
                  variant="detail"
                  showText
                />
              </View>
            )}
            {/* Title */}
            <SmartTextRenderer content={message?.title} style={styles.title} />

            {/* Subtitle */}
            {message?.subtitle && (
              <SmartTextRenderer
                content={message.subtitle}
                style={styles.body}
              />
            )}

            {/* Body */}
            {message?.body && (
              <SmartTextRenderer
                containerStyle={styles.bodySection}
                content={message.body}
                style={styles.body}
              />
            )}

            {/* Attachments Gallery */}
            {attachments.length > 0 && (
              <AttachmentGallery
                attachments={attachments}
                onMediaPress={handleMediaPress}
                notificationDate={new Date(
                  notification.message.createdAt
                ).getTime()}
              />
            )}

            {/* Actions moved under icon in the header */}
          </View>
        </ScrollView>

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
              fullScreenIndex === 0
                ? attachments.length - 1
                : fullScreenIndex - 1
            )
          }
          currentPosition={
            attachments.length > 1
              ? `${fullScreenIndex + 1} / ${attachments.length}`
              : undefined
          }
        />
      </ThemedView>
    </>
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
    color: "#ff4444",
    marginTop: 16,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  bucketSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  leftColumn: {
    flexDirection: "column",
    alignItems: "flex-start",
    gap: 8,
  },
  actionsSnoozeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    width: "100%",
  },
  filler: {
    flex: 1,
  },
  bucketInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlineActionsUnderIcon: {
    width: 220,
  },
  headerActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 2,
    marginBottom: 8,
  },
  statusSection: {
    alignItems: "flex-end",
    gap: 8,
  },
  timestampText: {
    fontSize: 10,
    opacity: 0.7,
    marginTop: 4,
  },
  bucketName: {
    fontSize: 13,
    fontWeight: "600",
    opacity: 0.7,
    textTransform: "uppercase",
    marginLeft: 12, // Add spacing between icon and bucket name
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    // No vertical padding for fixed height pill
    paddingVertical: 0,
    borderRadius: 10,
    height: 24,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "500",
    color: "white",
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
  bodySection: {
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  body: {
    fontSize: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  mediaSection: {
    marginBottom: 24,
  },
  priorityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 8,
  },
  actionButtons: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "space-between",
  },
  snoozeActionsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  inlineActionsWrapper: {
    flex: 1,
    maxWidth: 220,
    marginLeft: 12,
  },
});
