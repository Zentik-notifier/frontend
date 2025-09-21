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
import { mediaCache } from "@/services/media-cache";
import { Ionicons } from "@expo/vector-icons";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useRecyclingState } from "@shopify/flash-list";
import BucketIcon from "./BucketIcon";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { filteredActions } from "./NotificationActionsButton";
import NotificationSnoozeButton from "./NotificationSnoozeButton";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Icon, SmartTextRenderer } from "./ui";
import SwipeableItem from "./SwipeableItem";
import { useNotificationActions } from "@/hooks/useNotificationActions";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";

// Dynamic height calculator to keep FlashList and item in sync
export function getNotificationItemHeight(
  notification: NotificationFragment,
  isCompactMode: boolean
): number {
  const message = notification.message;
  const hasMedia = (message?.attachments ?? []).some((a) =>
    [MediaType.Image, MediaType.Gif, MediaType.Video, MediaType.Audio].includes(
      a.mediaType
    )
  );
  const hasSubtitle = Boolean(message?.subtitle);
  const hasBody = Boolean(message?.body);
  const hasBucketName = Boolean(message?.bucket?.name);

  let height = 60;

  if (isCompactMode) {
    // if (hasActions || hasMedia) {
    //   height += 40;
    // }
  } else {
    if (hasMedia) {
      height += 180;
    }
    // height += 30;
  }
  height += 30;

  if (hasSubtitle) {
    height += 20;
  }

  if (hasBody) {
    const maxBodyLines = isCompactMode ? (hasMedia ? 1 : 2) : hasMedia ? 2 : 5;
    const charsPerLine = isCompactMode ? 42 : 60;
    const bodyText = message?.body ?? "";
    const perLine = 21; // approx styles.body lineHeight (17) + padding

    // Consider newline characters by splitting and estimating each paragraph
    const segments = bodyText.split(/\r?\n/);
    let totalEstimatedLines = 0;
    for (let i = 0; i < segments.length; i++) {
      const seg = segments[i];
      const len = seg.trim().length;
      const linesForSeg = Math.max(1, Math.ceil(len / charsPerLine));
      totalEstimatedLines += linesForSeg;
      if (totalEstimatedLines >= maxBodyLines) {
        totalEstimatedLines = maxBodyLines;
        break;
      }
    }

    if (totalEstimatedLines === 0) totalEstimatedLines = 1;
    height += totalEstimatedLines * perLine;
  }

  if (hasBucketName) {
    height += 10;
  }

  return Math.round(height);
}

interface NotificationItemProps {
  notification: NotificationFragment;
  hideBucketInfo?: boolean;
  isMultiSelectionMode?: boolean;
  isSelected?: boolean;
  isItemVisible: boolean;
  onToggleSelection?: () => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  hideBucketInfo,
  isMultiSelectionMode,
  isSelected,
  isItemVisible,
  onToggleSelection,
}) => {
  const colorScheme = useColorScheme();
  const { navigateToNotificationDetail } = useNavigationUtils();
  const { t } = useI18n();
  const { formatRelativeTime } = useDateFormat();
  const {
    userSettings: {
      settings: {
        isCompactMode,
        mediaCache: {
          downloadSettings: { autoDownloadEnabled },
        },
        notificationFilters: { loadOnlyVisible },
      },
    },
  } = useAppContext();

  const deleteNotification = useDeleteNotification();
  const markAsRead = useMarkNotificationRead();
  const markAsUnread = useMarkNotificationUnread();

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

  const [selectedPreviewIndex, setSelectedPreviewIndex] =
    useRecyclingState<number>(0, [notification.id]);
  const [fullScreenIndex, setFullScreenIndex] = useRecyclingState<number>(-1, [
    notification.id,
  ]);

  useEffect(() => {
    if (!autoDownloadEnabled) return;
    for (const attachment of attachments) {
      attachment.url &&
        mediaCache.checkMediaExists({
          url: attachment.url,
          mediaType: attachment.mediaType,
          notificationDate: new Date(notification.createdAt).getTime(),
        });
    }
  }, [attachments, autoDownloadEnabled, notification]);

  const [swipeActive, setSwipeActive] = useRecyclingState<boolean>(false, [
    notification.id,
  ]);

  const handlePress = () => {
    if (swipeActive) return;
    if (isMultiSelectionMode) {
      onToggleSelection?.();
    } else {
      navigateToNotificationDetail(notification.id);
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

  // handlers already defined above (avoid redeclaration)

  const isRead = !!notification.readAt;
  const bucketName = notification.message?.bucket?.name || t("common.general");

  const visibleAttachment = !isCompactMode
    ? attachments[selectedPreviewIndex] || null
    : null;

  const handleVisualPress = (visualUri: string) => {
    const attachmentIndex = attachments.findIndex(
      (att) => att.url === visualUri
    );
    setFullScreenIndex(attachmentIndex >= 0 ? attachmentIndex : 0);
  };

  const handleCloseFullScreenImage = () => {
    setFullScreenIndex(-1);
  };

  const hasAttachments = attachments.length > 0;
  const actions = filteredActions(notification);
  const hasActions = actions.length > 0;

  const { executeAction } = useNotificationActions();
  const { getActionTypeIcon } = useNotificationUtils();

  const [isActionsMenuVisible, setIsActionsMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState<"above" | "below">("above");
  const actionButtonRef = useRef<View | null>(null);

  const openActionsMenu = () => {
    try {
      const windowHeight = Dimensions.get("window").height;
      actionButtonRef.current?.measure?.(
        (x, y, width, height, pageX, pageY) => {
          const spaceAbove = pageY;
          const spaceBelow = windowHeight - (pageY + height);
          setMenuPosition(spaceBelow >= spaceAbove ? "below" : "above");
          setIsActionsMenuVisible(true);
        }
      );
    } catch {
      setMenuPosition("above");
      setIsActionsMenuVisible(true);
    }
  };

  // const itemHeight = getNotificationItemHeight(notification, isCompactMode);
  const bodyMaxLines = isCompactMode
    ? hasAttachments
      ? 1
      : 2
    : hasAttachments
    ? 2
    : 5;

  // Swipe actions
  const handleMarkAsRead = async () => {
    try {
      await markAsRead(notification.id);
    } catch {}
  };

  const handleMarkAsUnread = async () => {
    try {
      await markAsUnread(notification.id);
    } catch {}
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

  return (
    <View style={[styles.wrapper]}>
      {/* <View style={[styles.wrapper, { height: itemHeight }]}> */}
      <SwipeableItem
        withButton={false}
        leftAction={isMultiSelectionMode ? undefined : toggleReadAction}
        rightAction={isMultiSelectionMode ? undefined : deleteAction}
        onSwipeActiveChange={setSwipeActive}
        contentStyle={styles.swipeContent}
        marginBottom={2}
        marginHorizontal={16}
        borderRadius={8}
      >
        <TouchableWithoutFeedback onPress={handlePress}>
          <ThemedView
            onStartShouldSetResponder={() => true}
            style={[
              styles.itemCard,
              { height: "100%" },
              {
                backgroundColor:
                  isMultiSelectionMode && isSelected
                    ? Colors[colorScheme].selected
                    : isRead
                    ? Colors[colorScheme].backgroundCard
                    : Colors[colorScheme].selected,
                borderColor: Colors[colorScheme].border,
              },
              // Priority border
              (notification.message?.deliveryType ===
                NotificationDeliveryType.Critical ||
                notification.message?.deliveryType ===
                  NotificationDeliveryType.Silent) && {
                borderWidth: 2,
                borderColor:
                  notification.message?.deliveryType ===
                  NotificationDeliveryType.Critical
                    ? Colors[colorScheme].error
                    : Colors[colorScheme].textSecondary,
              },
            ]}
          >
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

            {/* First row */}
            <ThemedView
              style={[styles.firstRow, { backgroundColor: "transparent" }]}
            >
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
                <View style={styles.leftColumn}>
                  <View
                    style={styles.bucketIconContainer}
                    onStartShouldSetResponder={() => true}
                  >
                    <BucketIcon
                      key={notification.message?.bucket?.id}
                      bucketId={notification.message?.bucket?.id ?? ""}
                      size={"lg"}
                    />
                  </View>
                  {/* Removed legacy inline actions button under bucket icon */}
                </View>
              )}

              {/* Text content */}
              <ThemedView
                style={[styles.textContent, { backgroundColor: "transparent" }]}
              >
                <View style={styles.titleAndDateRow}>
                  <View style={styles.titleSection}>
                    {!hideBucketInfo && (
                      <ThemedText
                        style={styles.bucketName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {bucketName}
                      </ThemedText>
                    )}
                    <SmartTextRenderer
                      content={notification.message?.title}
                      maxLines={1}
                      style={[styles.title, !isRead && styles.titleUnread]}
                    />
                  </View>
                  <View style={styles.rightMeta}>
                    <ThemedText style={styles.date}>
                      {formatRelativeTime(notification.createdAt)}
                    </ThemedText>
                    <NotificationSnoozeButton
                      bucketId={notification.message?.bucket?.id}
                      variant="inline"
                      showText
                    />
                  </View>
                </View>

                {!!notification.message?.subtitle && (
                  <SmartTextRenderer
                    content={notification.message.subtitle}
                    maxLines={1}
                    style={styles.subtitle}
                  />
                )}

                {!!notification.message?.body && (
                  <SmartTextRenderer
                    content={notification.message.body}
                    maxLines={bodyMaxLines}
                    style={styles.body}
                  />
                )}
              </ThemedView>

              {!isMultiSelectionMode && !isRead && (
                <ThemedView
                  style={[
                    styles.unreadIndicator,
                    { backgroundColor: Colors[colorScheme].tint },
                  ]}
                />
              )}
            </ThemedView>

            {!!visibleAttachment && (
              <ThemedView
                style={[
                  styles.mediaPreviewRow,
                  { backgroundColor: "transparent" },
                ]}
              >
                {attachments.map((attachment, index) => {
                  const isPreviewSelected = index === selectedPreviewIndex;
                  return (
                    <TouchableOpacity
                      key={`${attachment.url}-${index}`}
                      activeOpacity={0.8}
                      style={[
                        isPreviewSelected
                          ? styles.expandedImage
                          : {
                              width: 0,
                              height: 0,
                              opacity: 0,
                              position: "absolute",
                            },
                      ]}
                    >
                      {(isItemVisible || !loadOnlyVisible) && (
                        <CachedMedia
                          notificationDate={new Date(
                            notification.createdAt
                          ).getTime()}
                          mediaType={attachment.mediaType}
                          url={attachment.url || ""}
                          style={
                            isPreviewSelected
                              ? styles.expandedImage
                              : { width: 0, height: 0 }
                          }
                          originalFileName={attachment.name || undefined}
                          videoProps={{
                            autoPlay: isPreviewSelected,
                            isMuted: true,
                            isLooping: true,
                            showControls: false,
                          }}
                          audioProps={{ shouldPlay: false, showControls: true }}
                          onPress={() => handleVisualPress(attachment.url!)}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </ThemedView>
            )}

            <ThemedView
              style={[styles.bottomRow, { backgroundColor: "transparent" }]}
            >
              <ThemedView
                style={[
                  styles.mediaIndicators,
                  { backgroundColor: "transparent" },
                ]}
              >
                {attachments.length > 0 &&
                  (isCompactMode ? (
                    <View style={styles.inlinePillsRow}>
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
                        <ThemedText
                          style={styles.mediaText}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t("attachmentGallery.attachments", {
                            count: attachments.length,
                          })}
                        </ThemedText>
                      </ThemedView>
                    </View>
                  ) : (
                    attachments.map((attachment, index) => {
                      const isPreviewSelected = index === selectedPreviewIndex;
                      const pill = (
                        <ThemedView
                          key={index}
                          style={[
                            styles.mediaIndicator,
                            {
                              backgroundColor:
                                Colors[colorScheme].backgroundSecondary,
                              borderWidth: isPreviewSelected ? 1.5 : 0,
                              borderColor: isPreviewSelected
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
                            if (index >= 0) setSelectedPreviewIndex(index);
                          }}
                        >
                          {pill}
                        </TouchableOpacity>
                      );
                    })
                  ))}
              </ThemedView>
              <View style={styles.bottomRightActions}>
                <TouchableOpacity
                  ref={(r) => {
                    actionButtonRef.current = r;
                  }}
                  onPress={(e) => {
                    e.stopPropagation();
                    openActionsMenu();
                  }}
                  activeOpacity={0.8}
                  style={[
                    styles.actionsFab,
                    {
                      borderColor: Colors[colorScheme].border,
                      backgroundColor: Colors[colorScheme].background,
                    },
                  ]}
                >
                  <Icon name="more" size="sm" color="primary" />
                </TouchableOpacity>
              </View>
            </ThemedView>
          </ThemedView>
        </TouchableWithoutFeedback>

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
              setFullScreenIndex((fullScreenIndex + 1) % attachments.length);
            }}
            onSwipeRight={() => {
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
      <Modal
        visible={isActionsMenuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsActionsMenuVisible(false)}
      >
        <TouchableOpacity
          style={styles.actionsMenuOverlay}
          activeOpacity={1}
          onPress={() => setIsActionsMenuVisible(false)}
        >
          <ThemedView
            style={[
              styles.actionsMenu,
              menuPosition === "above" ? styles.menuAbove : styles.menuBelow,
              {
                borderColor: Colors[colorScheme].border,
                backgroundColor: Colors[colorScheme].background,
              },
            ]}
          >
            <TouchableOpacity
              onPress={() => {
                setIsActionsMenuVisible(false);
                isRead ? handleMarkAsUnread() : handleMarkAsRead();
              }}
              style={[
                styles.menuItem,
                { borderColor: Colors[colorScheme].borderLight },
              ]}
            >
              <Icon
                name={isRead ? "view" : "view-off"}
                size="sm"
                color="secondary"
              />
              <ThemedText style={styles.menuItemText}>
                {isRead
                  ? t("swipeActions.markAsUnread.label")
                  : t("swipeActions.markAsRead.label")}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {
                setIsActionsMenuVisible(false);
                handleDelete();
              }}
              style={[
                styles.menuItem,
                { borderColor: Colors[colorScheme].borderLight },
              ]}
            >
              <Icon name="delete" size="sm" color="error" />
              <ThemedText
                style={[
                  styles.menuItemText,
                  { color: Colors[colorScheme].error },
                ]}
              >
                {t("swipeActions.delete.label")}
              </ThemedText>
            </TouchableOpacity>

            {hasActions &&
              actions.map((action, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setIsActionsMenuVisible(false);
                    executeAction(notification.id!, action);
                  }}
                  style={[
                    styles.menuItem,
                    { borderColor: Colors[colorScheme].borderLight },
                  ]}
                >
                  <Icon
                    name={getActionTypeIcon(action.type) as any}
                    size="sm"
                    color={action.destructive ? "error" : "secondary"}
                  />
                  <ThemedText style={styles.menuItemText}>
                    {action.title || action.value?.slice(0, 50)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
          </ThemedView>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  swipeContent: {
    borderRadius: 8,
  },
  wrapper: {},
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
    paddingTop: 12,
    paddingHorizontal: 12,
    paddingBottom: 6,
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
  rightMeta: {
    marginLeft: 8,
    alignItems: "flex-end",
    gap: 4,
  },
  titleSection: {
    flex: 1,
    marginRight: 8,
  },
  bucketIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  leftColumn: {
    width: 40,
    marginRight: 12,
  },
  underIconRow: {
    marginTop: 8,
    alignItems: "stretch",
    gap: 6,
    flexDirection: "column",
    justifyContent: "flex-start",
    width: "100%",
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
  body: {
    fontSize: 13,
    lineHeight: 17,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 11,
    fontStyle: "italic",
    opacity: 0.7,
    marginBottom: 2,
    marginTop: 1,
  },
  expandedImage: {
    width: "100%",
    height: 160,
    borderRadius: 8,
    marginTop: 0,
    marginBottom: 4,
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
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  inlinePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  bottomRightActions: {
    justifyContent: "center",
    alignItems: "center",
  },
  actionsFab: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  mediaPreviewRow: {
    paddingHorizontal: 12,
    paddingTop: 0,
    width: "100%",
  },
  bottomRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 4,
    width: "100%",
  },
  filler: {
    flex: 1,
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
  actionsMenuOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "flex-end",
  },
  actionsMenu: {
    marginHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  menuAbove: {
    marginBottom: 56,
  },
  menuBelow: {
    marginBottom: 12,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "500",
  },
  menuSeparator: {
    height: 1,
    marginVertical: 4,
  },
  priorityBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.12,
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

export default React.memo(NotificationItem);
