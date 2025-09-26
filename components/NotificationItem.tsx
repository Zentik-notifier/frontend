import {
  MediaType,
  NotificationDeliveryType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { useNotificationActions } from "@/hooks/useNotificationActions";
import {
  useDeleteNotification,
  useMarkNotificationRead,
  useMarkNotificationUnread,
} from "@/hooks/useNotifications";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import { useAppContext } from "@/services/app-context";
import { mediaCache } from "@/services/media-cache";
import { useNavigationUtils } from "@/utils/navigation";
import { useRecyclingState } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { Divider, IconButton, Icon as PaperIcon, TouchableRipple, useTheme, Surface, Text } from "react-native-paper";
import InlineMenu, { InlineMenuItem } from "./ui/InlineMenu";
import BucketIcon from "./BucketIcon";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";
import { filteredActions } from "./NotificationActionsButton";
import NotificationSnoozeButton from "./NotificationSnoozeButton";
import SwipeableItem from "./SwipeableItem";
// Replaced ThemedText/ThemedView with Paper Text/Surface
import { Icon, SmartTextRenderer } from "./ui";

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
  const theme = useTheme();
  const mediaPressRef = useRef(false);
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
    if (mediaPressRef.current) {
      mediaPressRef.current = false;
      return;
    }
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

  const menuItems: InlineMenuItem[] = useMemo(() => {
    const items: InlineMenuItem[] = [
      {
        id: "toggleRead",
        label: isRead ? t("swipeActions.markAsUnread.label") : t("swipeActions.markAsRead.label"),
        icon: isRead ? "view" : "view-off",
        onPress: () => {
          isRead ? handleMarkAsUnread() : handleMarkAsRead();
        },
      },
      {
        id: "delete",
        label: t("swipeActions.delete.label"),
        icon: "delete",
        onPress: () => {
          handleDelete();
        },
        type: "destructive",
      },
    ];

    if (hasActions) {
      actions.forEach((action, index) => {
        items.push({
          id: `action-${index}`,
          label: action.title || action.value?.slice(0, 50) || "Action",
          icon: getActionTypeIcon(action.type) as string,
          onPress: () => {
            executeAction(notification.id!, action);
          },
          type: action.destructive ? "destructive" : "normal",
        });
      });
    }

    return items;
  }, [isRead, t, handleMarkAsUnread, handleMarkAsRead, handleDelete, hasActions, actions, getActionTypeIcon, executeAction, notification.id]);

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
          <Surface
            onStartShouldSetResponder={() => true}
            elevation={0}
            style={[
              styles.itemCard,
              { height: "100%" },
              {
                backgroundColor:
                  isMultiSelectionMode && isSelected
                    ? theme.colors.secondaryContainer
                    : theme.colors.elevation?.level1 || theme.colors.surface,
                borderColor: theme.colors.outline,
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
                    ? theme.colors.error
                    : theme.colors.secondary,
              },
            ]}
          >
            {(notification.message?.deliveryType ===
              NotificationDeliveryType.Critical ||
              notification.message?.deliveryType ===
                NotificationDeliveryType.Silent) && (
              <Surface
                style={[
                  styles.priorityBackground,
                  {
                    backgroundColor:
                      notification.message?.deliveryType ===
                      NotificationDeliveryType.Critical
                        ? theme.colors.error
                        : theme.colors.secondary,
                  },
                ]}
              >
                <></>
              </Surface>
            )}

            {/* First row */}
            <Surface
                style={[styles.firstRow]}
              elevation={0}
            >
              {isMultiSelectionMode ? (
                <TouchableRipple onPress={onToggleSelection} borderless style={styles.checkboxContainer}>
                  <Surface
                    style={[
                      styles.checkbox,
                      {
                        backgroundColor: isSelected
                          ? theme.colors.primary
                          : "transparent",
                        borderColor: theme.colors.outline,
                      },
                    ]}
                  >
                    {isSelected && (
                      <PaperIcon source="check" size={16} color={"#fff"} />
                    )}
                  </Surface>
                </TouchableRipple>
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
              <Surface
                style={[styles.textContent]}
                elevation={0}
              >
                <View style={styles.titleAndDateRow}>
                  <View style={styles.titleSection}>
                    {!hideBucketInfo && (
                      <Text
                        style={styles.bucketName}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        {bucketName}
                      </Text>
                    )}
                    <SmartTextRenderer
                      content={notification.message?.title}
                      maxLines={1}
                      style={[styles.title, !isRead && styles.titleUnread]}
                    />
                  </View>
                  <View style={styles.rightMeta}>
                    <Text style={styles.date}>
                      {formatRelativeTime(notification.createdAt)}
                    </Text>
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
              </Surface>

              {!isMultiSelectionMode && !isRead && (
                <Surface
                  style={[
                    styles.unreadIndicator,
                    { backgroundColor: theme.colors.primary },
                  ]}
                >
                  <></>
                </Surface>
              )}
            </Surface>

            {!!visibleAttachment && (
              <Surface
                style={[styles.mediaPreviewRow]}
                elevation={0}
              >
                {attachments.map((attachment, index) => {
                  const isPreviewSelected = index === selectedPreviewIndex;
                  return (
                    <View
                      key={`${attachment.url}-${index}`}
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
                          onPress={() => {
                            mediaPressRef.current = true;
                            handleVisualPress(attachment.url!);
                          }}
                        />
                      )}
                    </View>
                  );
                })}
              </Surface>
            )}

            <Surface
              style={[styles.bottomRow]}
              elevation={0}
            >
              <Surface
                style={[styles.mediaIndicators]}
                elevation={0}
              >
                {attachments.length > 0 &&
                  (isCompactMode ? (
                    <View style={styles.inlinePillsRow}>
                      <Surface
                        style={[
                          styles.mediaIndicator,
                          {
                            backgroundColor: theme.colors.secondaryContainer,
                          },
                        ]}
                        elevation={0}
                      >
                        <Icon name="image" size="xs" color="secondary" />
                        <Text
                          style={styles.mediaText}
                          numberOfLines={1}
                          ellipsizeMode="tail"
                        >
                          {t("attachmentGallery.attachments", {
                            count: attachments.length,
                          })}
                        </Text>
                      </Surface>
                    </View>
                  ) : (
                    attachments.map((attachment, index) => {
                      const isPreviewSelected = index === selectedPreviewIndex;
                      const pill = (
                        <Surface
                          key={index}
                          style={[
                            styles.mediaIndicator,
                            {
                              backgroundColor: theme.colors.secondaryContainer,
                              borderWidth: isPreviewSelected ? 1.5 : 0,
                              borderColor: isPreviewSelected
                                ? theme.colors.primary
                                : "transparent",
                            },
                          ]}
                          elevation={0}
                        >
                          <MediaTypeIcon
                            mediaType={attachment.mediaType}
                            size={12}
                            base
                            showLabel
                            label={attachment.name}
                          />
                        </Surface>
                      );

                      return (
                        <TouchableRipple
                          key={index}
                          onPress={() => {
                            if (index >= 0) setSelectedPreviewIndex(index);
                          }}
                          borderless
                        >
                          {pill}
                        </TouchableRipple>
                      );
                    })
                  ))}
              </Surface>
              <View style={styles.bottomRightActions}>
                <InlineMenu
                  anchor={
                    <IconButton
                      icon="dots-vertical"
                      size={18}
                      containerColor={theme.colors.surface}
                      style={styles.actionsFab}
                    />
                  }
                  items={menuItems}
                  anchorPosition="bottom"
                  maxHeight={300}
                />
              </View>
            </Surface>
          </Surface>
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
      {/* Menu gestito da react-native-paper al posto del Modal personalizzato */}
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
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
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
  // Paper Menu styles no longer needed
  priorityBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.06,
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
