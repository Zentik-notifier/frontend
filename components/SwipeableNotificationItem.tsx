import { Colors } from "@/constants/Colors";
import {
  MediaType,
  NotificationDeliveryType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import {
  useDeleteNotification,
  useMarkNotificationRead,
  useMarkNotificationUnread,
} from "@/hooks/useNotifications";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import BucketIcon from "./BucketIcon";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";
import NotificationActionsButton, {
  filteredActions,
} from "./NotificationActionsButton";
import SwipeableItem from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Icon, SmartTextRenderer } from "./ui";

interface SwipeableNotificationItemProps {
  notification: NotificationFragment;
  hideBucketInfo?: boolean; // Renamed: hides bucket name, icon and left border
  isMultiSelectionMode?: boolean;
  isSelected?: boolean;
  isVisible?: boolean;
  onToggleSelection?: () => void;
  onLongPress?: () => void;
}

const SwipeableNotificationItem: React.FC<SwipeableNotificationItemProps> = React.memo(({
  notification,
  hideBucketInfo = false, // Default to showing bucket info
  isMultiSelectionMode = false,
  isSelected = false,
  isVisible = true,
  onToggleSelection,
  onLongPress,
}) => {
  const isBucketSnoozed = Boolean(notification?.message?.bucket?.isSnoozed);

  const colorScheme = useColorScheme();
  const router = useRouter();
  const { t } = useI18n();
  const { formatRelativeTime } = useDateFormat();
  const {
    userSettings: {
      settings: { isCompactMode },
    },
  } = useAppContext();

  const deleteNotification = useDeleteNotification();
  const markAsRead = useMarkNotificationRead();
  const markAsUnread = useMarkNotificationUnread();

  // State for full screen visual modal (images and gifs)
  const [fullScreenIndex, setFullScreenIndex] = useState<number>(-1);

  const [swipeActive, setSwipeActive] = useState(false);

  const attachments = useMemo(
    () =>
      (notification.message?.attachments ?? []).filter((a) =>
        [
          MediaType.Image,
          MediaType.Gif,
          MediaType.Video,
          MediaType.Audio,
        ].includes(a.mediaType)
      ),
    [notification]
  );
  const [selectedPreviewIndex, setSelectedPreviewIndex] = useState<number>(0);

  useEffect(() => {
    // Reset selection when notification changes
    setSelectedPreviewIndex(0);
  }, [notification.id]);

  const handlePress = () => {
    if (swipeActive) {
      return; // avoid triggering press when swipe is active/recovering
    }

    if (isMultiSelectionMode) {
      onToggleSelection?.();
    } else {
      router.push(
        `/(mobile)/private/notification-detail?id=${notification.id}`
      );
    }
  };

  const handleDelete = async () => {
    try {
      await deleteNotification(notification.id);
    } catch (error) {
      console.error("❌ Failed to delete notification:", error);
      Alert.alert(t("common.error"), t("swipeActions.delete.error"));
    }
  };

  const handleMarkAsRead = async () => {
    try {
      await markAsRead(notification.id);
    } catch (error) {}
  };

  const handleMarkAsUnread = async () => {
    try {
      await markAsUnread(notification.id);
    } catch (error) {}
  };
  const deleteAction = {
    icon: "delete" as const,
    label: t("swipeActions.delete.label"),
    backgroundColor: "#ff4444",
    onPress: handleDelete,
    showAlert: {
      title: t("swipeActions.delete.title"),
      message: t("swipeActions.delete.message"),
      confirmText: t("swipeActions.delete.confirm"),
      cancelText: t("swipeActions.delete.cancel"),
    },
  };

  const isRead = !!notification.readAt;
  const toggleReadAction = isRead
    ? {
        icon: "view" as const,
        label: t("swipeActions.markAsUnread.label"),
        backgroundColor: "#007AFF",
        onPress: handleMarkAsUnread,
      }
    : {
        icon: "view-off" as const,
        label: t("swipeActions.markAsRead.label"),
        backgroundColor: "#28a745",
        onPress: handleMarkAsRead,
      };

  const bucketColor = notification.message?.bucket?.color || "#6c757d"; // Gray color for General
  const bucketIcon = notification.message?.bucket?.icon || "";
  const bucketName = notification.message?.bucket?.name || t("common.general");

  // Currently visible attachment in extended mode
  const visibleAttachment = !isCompactMode
    ? attachments[selectedPreviewIndex] || null
    : null;

  const handleVisualPress = (
    visualUri: string,
    mediaType: MediaType = MediaType.Image
  ) => {
    if (mediaType !== MediaType.Video) {
      const attachmentIndex = attachments.findIndex(
        (att) => att.url === visualUri
      );
      setFullScreenIndex(attachmentIndex >= 0 ? attachmentIndex : 0);
    }
  };

  const handleCloseFullScreenImage = () => {
    setFullScreenIndex(-1);
  };

  const hasAttachments = attachments.length > 0;
  const actions = filteredActions(notification);

  const withLastRow = hasAttachments || isBucketSnoozed || actions.length;
  const additionalLines = !withLastRow ? 2 : 0;

  return (
    <SwipeableItem
      leftAction={isMultiSelectionMode ? undefined : toggleReadAction}
      rightAction={isMultiSelectionMode ? undefined : deleteAction}
      onSwipeActiveChange={setSwipeActive}
      containerStyle={styles.swipeContainer}
      contentStyle={[
        styles.swipeContent,
        {
          backgroundColor:
            isMultiSelectionMode && isSelected
              ? Colors[colorScheme].selected
              : isRead
              ? Colors[colorScheme].backgroundCard
              : Colors[colorScheme].selected,
        },
      ]}
      marginBottom={2} // Pass the custom margin
      marginHorizontal={16} // Pass the horizontal margin
    >
      <TouchableWithoutFeedback onPress={handlePress} onLongPress={onLongPress}>
        <ThemedView
          style={[
            styles.itemCard,
            {
              backgroundColor: "transparent", // Let SwipeableItem handle the background
              borderColor: Colors[colorScheme].border,
              // Add priority borders for delivery type
              ...(notification.message?.deliveryType ===
                NotificationDeliveryType.Critical ||
              notification.message?.deliveryType ===
                NotificationDeliveryType.Silent
                ? {
                    borderWidth: 2,
                    borderColor:
                      notification.message?.deliveryType ===
                      NotificationDeliveryType.Critical
                        ? Colors[colorScheme].error
                        : Colors[colorScheme].textSecondary,
                  }
                : {}),
            },
          ]}
        >
          {/* Priority background overlay for critical/silent notifications */}
          {(notification.message?.deliveryType ===
            NotificationDeliveryType.Critical ||
            notification.message?.deliveryType ===
              NotificationDeliveryType.Silent) && (
            <View
              style={[
                styles.priorityBackground,
                {
                  backgroundColor:
                    notification.message?.deliveryType ===
                    NotificationDeliveryType.Critical
                      ? Colors[colorScheme].error
                      : Colors[colorScheme].textSecondary,
                },
              ]}
            />
          )}

          {/* RIGA 1: Checkbox/Icona bucket (col 1) + Contenuto testuale (col 2) + Data (col 3) */}
          <ThemedView
            style={[styles.firstRow, { backgroundColor: "transparent" }]}
          >
            {/* Colonna 1: Checkbox (in multi-selezione) o Icona bucket */}
            {isMultiSelectionMode ? (
              <TouchableOpacity
                style={styles.checkboxContainer}
                onPress={onToggleSelection}
                activeOpacity={0.7}
              >
                <ThemedView
                  style={[
                    styles.checkbox,
                    {
                      backgroundColor: isSelected
                        ? Colors[colorScheme].tint
                        : "transparent",
                      borderColor: Colors[colorScheme].border,
                    },
                  ]}
                >
                  {isSelected && (
                    <Ionicons name="checkmark" size={16} color="white" />
                  )}
                </ThemedView>
              </TouchableOpacity>
            ) : (
              !hideBucketInfo && (
                <View style={styles.bucketIconContainer}>
                  <BucketIcon
                    bucketId={notification.message?.bucket?.id}
                    size="lg"
                  />
                </View>
              )
            )}

            {/* Colonna 2: Contenuto testuale */}
            <ThemedView
              style={[styles.textContent, { backgroundColor: "transparent" }]}
            >
              {/* Riga con nome bucket, titolo e orario */}
              <View style={styles.titleAndDateRow}>
                <View style={styles.titleSection}>
                  {/* Nome bucket (solo in modalità estesa) */}
                  {!hideBucketInfo && !isCompactMode && (
                    <ThemedText style={styles.bucketName}>
                      {bucketName}
                    </ThemedText>
                  )}

                  {/* Titolo notifica */}
                  <SmartTextRenderer
                    content={notification.message?.title}
                    maxLines={1}
                    style={[styles.title, !isRead && styles.titleUnread]}
                  />
                </View>

                {/* Orario */}
                <ThemedText style={styles.date}>
                  {formatRelativeTime(notification.createdAt)}
                </ThemedText>
              </View>

              {/* Messaggio/Body - ora può estendersi completamente */}
              {notification.message?.body && (
                <SmartTextRenderer
                  content={notification.message.body}
                  maxLines={(isCompactMode ? 1 : 2) + additionalLines}
                  style={styles.body}
                />
              )}

              {/* Subtitle (solo se non c'è body) */}
              {notification.message?.subtitle && !notification.message.body && (
                <SmartTextRenderer
                  content={notification.message.subtitle}
                  maxLines={1}
                  style={styles.subtitle}
                />
              )}
            </ThemedView>

            {/* Read indicator (only when not in multi-selection mode) */}
            {!isMultiSelectionMode && !isRead && (
              <ThemedView
                style={[
                  styles.unreadIndicator,
                  { backgroundColor: Colors[colorScheme].tint },
                ]}
              />
            )}
          </ThemedView>

          {/* RIGA 2: Preview del media selezionato (solo in modalità estesa) */}
          {visibleAttachment?.url && isVisible && (
            <ThemedView
              style={[
                styles.mediaPreviewRow,
                { backgroundColor: "transparent" },
              ]}
            >
              <TouchableOpacity activeOpacity={0.8}>
                <CachedMedia
                  notificationDate={new Date(notification.createdAt).getTime()}
                  key={`${visibleAttachment.url}-${selectedPreviewIndex}`}
                  mediaType={visibleAttachment.mediaType}
                  url={visibleAttachment.url || ""}
                  style={styles.expandedImage}
                  originalFileName={visibleAttachment.name || undefined}
                  noAutoDownload={!isVisible} // Only download when visible
                  videoProps={{
                    autoPlay: false, // Disable autoplay for better performance
                    isMuted: true,
                    isLooping: true,
                  }}
                  audioProps={{
                    shouldPlay: false,
                    showControls: true,
                  }}
                  onPress={() =>
                    handleVisualPress(
                      visibleAttachment.url!,
                      visibleAttachment.mediaType
                    )
                  }
                />
              </TouchableOpacity>
            </ThemedView>
          )}

          {/* RIGA 3: Allegati (sinistra) + Azioni e Snooze (destra) */}
          {withLastRow ? (
            <ThemedView
              style={[styles.bottomRow, { backgroundColor: "transparent" }]}
            >
              {/* Indicatori allegati */}
              <ThemedView
                style={[
                  styles.mediaIndicators,
                  { backgroundColor: "transparent" },
                ]}
              >
                {attachments.length > 0 &&
                  (isCompactMode ? (
                    // Modalità compatta: mostra conteggio raggruppato
                    <ThemedView
                      style={[
                        styles.mediaIndicator,
                        {
                          backgroundColor:
                            Colors[colorScheme].backgroundSecondary,
                        },
                      ]}
                    >
                      <Icon name="image" size="xs" color="secondary" />
                      <ThemedText style={styles.mediaText}>
                        {t("attachmentGallery.attachments", {
                          count: attachments.length,
                        })}
                      </ThemedText>
                    </ThemedView>
                  ) : (
                    // Modalità estesa: mostra singoli indicatori selezionabili
                    attachments.map((attachment, index) => {
                      const isSelected = index === selectedPreviewIndex;

                      const pill = (
                        <ThemedView
                          key={index}
                          style={[
                            styles.mediaIndicator,
                            {
                              backgroundColor:
                                Colors[colorScheme].backgroundSecondary,
                              borderWidth: isSelected ? 1.5 : 0,
                              borderColor: isSelected
                                ? Colors[colorScheme].tint
                                : "transparent",
                            },
                          ]}
                        >
                          <MediaTypeIcon
                            mediaType={attachment.mediaType}
                            size={12}
                            base
                            showLabel
                            label={attachment.name}
                          />
                        </ThemedView>
                      );

                      return (
                        <TouchableOpacity
                          key={index}
                          activeOpacity={0.8}
                          onPress={(e) => {
                            e.stopPropagation();
                            if (index >= 0) {
                              setSelectedPreviewIndex(index);
                            }
                          }}
                        >
                          {pill}
                        </TouchableOpacity>
                      );
                    })
                  ))}
              </ThemedView>

              {/* Azioni e Snooze */}
              <View style={styles.actionsContainer}>
                <NotificationActionsButton
                  notification={notification}
                  actions={actions}
                  showInline
                />
                {isBucketSnoozed && (
                  <Icon name="snooze" size="xs" color="secondary" />
                )}
              </View>
            </ThemedView>
          ) : null}
        </ThemedView>
      </TouchableWithoutFeedback>

      {/* Full Screen Media Viewer */}
      {fullScreenIndex >= 0 && attachments[fullScreenIndex] && (
        <FullScreenMediaViewer
          visible
          notificationDate={new Date(notification.createdAt).getTime()}
          url={attachments[fullScreenIndex].url || ""}
          mediaType={attachments[fullScreenIndex].mediaType}
          originalFileName={attachments[fullScreenIndex].name || undefined}
          onClose={handleCloseFullScreenImage}
          enableSwipeNavigation={attachments.length > 1}
          onSwipeLeft={() => {
            // Array circolare: dall'ultimo va al primo
            setFullScreenIndex((fullScreenIndex + 1) % attachments.length);
          }}
          onSwipeRight={() => {
            // Array circolare: dal primo va all'ultimo
            setFullScreenIndex(
              fullScreenIndex === 0
                ? attachments.length - 1
                : fullScreenIndex - 1
            );
          }}
          currentPosition={`${fullScreenIndex + 1} / ${attachments.length}`}
        />
      )}
    </SwipeableItem>
  );
});

const styles = StyleSheet.create({
  swipeContainer: {
    // marginBottom: 6, // Removed - now handled by SwipeableItem marginBottom prop
    // marginHorizontal: 16, // Moved to contentStyle for proper background sizing
  },
  swipeContent: {
    borderRadius: 8,
  },
  itemCard: {
    borderRadius: 8,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOpacity: 0.08,
    shadowRadius: 2,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
    borderWidth: 1,
  },

  firstRow: {
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
  },
  textContent: {
    flex: 1,
  },
  titleAndDateRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 4,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 6,
  },
  bucketInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  bucketIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  bucketName: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    marginBottom: 2,
  },
  date: {
    fontSize: 11,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 0,
    lineHeight: 18,
  },
  titleUnread: {
    fontWeight: "700",
  },
  titleWithoutBucket: {
    marginTop: 0, // Adjust top margin when bucket name is hidden
  },
  body: {
    fontSize: 13,
    lineHeight: 16,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 12,
    fontStyle: "italic",
    marginBottom: 2,
  },
  image: {
    width: "100%",
    height: 80,
    borderRadius: 6,
    marginTop: 6,
  },
  expandedImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 4,
  },
  expandedAudio: {
    height: 80, // Smaller height for audio players
  },
  unreadIndicator: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  mediaIndicators: {
    flexDirection: "row",
    marginTop: 6,
    gap: 8,
    flex: 1,
    alignItems: "center",
    minHeight: 24,
  },
  mediaPreviewRow: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    width: "100%",
  },
  mediaPreview: {
    width: "100%",
    height: 120,
    borderRadius: 8,
  },
  mediaPreviewAudio: {
    height: 80, // Altezza ridotta per i player audio
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    width: "100%",
  },
  actionsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    minHeight: 24,
  },
  snoozePill: {
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 0,
  },
  mediaIndicator: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    height: 24,
  },
  mediaText: {
    fontSize: 10,
    marginLeft: 3,
    fontWeight: "500",
  },
  contentColumn: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  compactBucketIcon: {
    marginRight: 4, // Space between bucket icon and title
  },
  // Rimosso contentArea - sostituito da textContent
  priorityBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12, // Increased opacity for more visible priority indication
  },
  checkboxContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
});

export default SwipeableNotificationItem;
