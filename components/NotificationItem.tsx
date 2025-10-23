import { useAppContext } from "@/contexts/AppContext";
import {
  MediaType,
  NotificationActionType,
  NotificationDeliveryType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useNotificationActions, useNotificationUtils } from "@/hooks";
import {
  useDeleteNotification,
  useMarkAsRead,
  useMarkAsUnread,
} from "@/hooks/notifications";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n } from "@/hooks/useI18n";
import { mediaCache } from "@/services/media-cache-service";
import { useNavigationUtils } from "@/utils/navigation";
import { useRecyclingState } from "@shopify/flash-list";
import React, { useEffect, useMemo, useRef } from "react";
import { useSettings } from "@/hooks/useSettings";
import { Alert, Pressable, StyleSheet, View, ScrollView } from "react-native";
import {
  Icon,
  IconButton,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import BucketIcon from "./BucketIcon";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";
import SwipeableItem, { MenuItem, SwipeAction } from "./SwipeableItem";
import { SmartTextRenderer } from "./ui";

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
  noBucketRouting?: boolean;
  onToggleSelection?: () => void;
  enableHtmlRendering?: boolean;
}

const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  hideBucketInfo,
  isMultiSelectionMode,
  isSelected,
  noBucketRouting,
  isItemVisible,
  onToggleSelection,
  enableHtmlRendering = true,
}) => {
  const theme = useTheme();
  const mediaPressRef = useRef(false);
  const { navigateToNotificationDetail } = useNavigationUtils();
  const { t } = useI18n();
  const { formatRelativeTime } = useDateFormat();
  const {
    connectionStatus: { canAutoDownload },
    userSettings: {
      settings: {
        notificationVisualization: { loadOnlyVisible, isCompactMode },
      },
    },
  } = useAppContext();

  const deleteNotificationMutation = useDeleteNotification();
  const markAsReadMutation = useMarkAsRead();
  const markAsUnreadMutation = useMarkAsUnread();
  const { executeAction } = useNotificationActions();
  const { getActionTypeIcon } = useNotificationUtils();

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
  const attachment = attachments[selectedPreviewIndex];

  useEffect(() => {
    canAutoDownload &&
      mediaCache.tryAutoDownload(notification).catch(console.error);
  }, [notification, canAutoDownload]);

  const handlePress = () => {
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
      await deleteNotificationMutation.mutateAsync(notification.id);
    } catch (error) {
      console.error("❌ Failed to delete notification:", error);
      Alert.alert(t("common.error"), t("swipeActions.delete.error"));
    }
  };

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

  // const itemHeight = getNotificationItemHeight(notification, isCompactMode);
  const bodyMaxLines = isCompactMode ? 2 : 5;

  // Swipe actions
  const handleMarkAsRead = async () => {
    try {
      await markAsReadMutation.mutateAsync(notification.id);
    } catch {}
  };

  const handleMarkAsUnread = async () => {
    try {
      await markAsUnreadMutation.mutateAsync(notification.id);
    } catch {}
  };

  const deleteAction: SwipeAction = {
    icon: "delete",
    label: t("swipeActions.delete.label"),
    destructive: true,
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
        icon: "eye-outline",
        label: t("swipeActions.markAsUnread.label"),
        backgroundColor: "#007AFF",
        onPress: handleMarkAsUnread,
      }
    : {
        icon: "eye-off",
        label: t("swipeActions.markAsRead.label"),
        backgroundColor: "#28a745",
        onPress: handleMarkAsRead,
      };

  const filteredActions = useMemo(() => {
    const message = notification.message;
    return (
      (message?.actions || []).filter(
        (action) =>
          action &&
          [
            NotificationActionType.BackgroundCall,
            NotificationActionType.Webhook,
            NotificationActionType.Snooze,
            NotificationActionType.Navigate,
          ].includes(action.type)
      ) || []
    );
  }, [notification.message]);

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    if (filteredActions.length > 0) {
      filteredActions.forEach((action, index) => {
        if (action) {
          items.push({
            id: `action-${index}`,
            label: action.title || action.value?.slice(0, 50) || "Action",
            icon: getActionTypeIcon(action.type) as string,
            onPress: () => {
              executeAction(notification.id!, action);
            },
            type: action.destructive ? "destructive" : ("normal" as const),
          });
        }
      });
    }

    return items;
  }, [filteredActions, getActionTypeIcon, executeAction, notification.id]);

  // Memoize style props for SmartTextRenderer to prevent unnecessary re-renders
  const titleStyle = useMemo(
    () => [styles.title, !isRead && styles.titleUnread],
    [isRead]
  );
  const subtitleStyle = useMemo(() => styles.subtitle, []);
  const bodyStyle = useMemo(() => styles.body, []);

  const deliveryType = notification.message?.deliveryType;
  const borderColor =
    deliveryType === NotificationDeliveryType.Critical
      ? theme.colors.error
      : deliveryType === NotificationDeliveryType.Silent
      ? theme.colors.secondary
      : undefined;

  return (
    <SwipeableItem
      marginHorizontal={16}
      leftAction={isMultiSelectionMode ? undefined : toggleReadAction}
      rightAction={isMultiSelectionMode ? undefined : deleteAction}
      borderColor={borderColor}
      menuItems={isMultiSelectionMode ? [] : menuItems}
      showMenu={!isMultiSelectionMode}
      cardStyle={[
        isMultiSelectionMode &&
          isSelected && {
            backgroundColor: theme.colors.secondaryContainer,
          },
      ]}
    >
      {/* First row */}
      <Pressable style={[styles.firstRow]} onPress={handlePress}>
        {isMultiSelectionMode ? (
          <TouchableRipple
            onPress={onToggleSelection}
            borderless
            style={styles.checkboxContainer}
          >
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
              {isSelected && <Icon source="check" size={16} color={"#fff"} />}
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
                bucketId={notification.message?.bucket?.id}
                size={"lg"}
                noRouting={noBucketRouting}
              />
            </View>
          </View>
        )}

        {/* Text content */}
        <Surface style={[styles.textContent]} elevation={0}>
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
                style={titleStyle}
                enableHtml={enableHtmlRendering}
              />
            </View>
            <View style={styles.rightMeta}>
              <Text style={styles.date}>
                {formatRelativeTime(notification.createdAt)}
              </Text>
            </View>
          </View>

          {!!notification.message?.subtitle && (
            <SmartTextRenderer
              content={notification.message.subtitle}
              maxLines={1}
              style={subtitleStyle}
              enableHtml={enableHtmlRendering}
            />
          )}

          {!!notification.message?.body && (
            <SmartTextRenderer
              content={notification.message.body}
              maxLines={bodyMaxLines}
              style={bodyStyle}
              enableHtml={enableHtmlRendering}
            />
          )}
        </Surface>

        {!isMultiSelectionMode && !isRead && (
          <View
            style={[
              styles.unreadCornerFold,
              {
                borderTopColor: theme.colors.primary,
                borderRightColor: theme.colors.primary,
              },
            ]}
          />
        )}
      </Pressable>

      {!!visibleAttachment && (
        <View pointerEvents="auto">
          <Surface style={[styles.mediaPreviewRow]} elevation={0}>
            <View key={`${attachment.url}`} style={styles.expandedImage}>
              {(isItemVisible || !loadOnlyVisible) && (
                <CachedMedia
                  notificationDate={new Date(notification.createdAt).getTime()}
                  mediaType={attachment.mediaType}
                  url={attachment.url || ""}
                  style={styles.expandedImage}
                  originalFileName={attachment.name || undefined}
                  videoProps={{
                    autoPlay: isItemVisible,
                    isMuted: true,
                    isLooping: true,
                    showControls: false,
                  }}
                  audioProps={{
                    shouldPlay: false,
                    showControls: true,
                  }}
                  onPress={() => {
                    mediaPressRef.current = true;
                    handleVisualPress(attachment.url!);
                  }}
                />
              )}
            </View>
          </Surface>
        </View>
      )}

      <Surface style={[styles.bottomRow]} elevation={0}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.mediaScrollView}
          contentContainerStyle={styles.mediaIndicators}
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
                  <Icon
                    source="image"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
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
        </ScrollView>
      </Surface>

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
  );
};

const styles = StyleSheet.create({
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
    right: 13,
    top: -10,
  },
  detailButton: {
    width: 24,
    height: 24,
    marginTop: 2,
    borderRadius: 12,
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
  unreadCornerFold: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 0,
    height: 0,
    borderTopWidth: 16,
    borderRightWidth: 16,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    borderTopColor: "transparent",
    borderRightColor: "transparent",
    borderTopRightRadius: 8,
  },
  mediaScrollView: {
    flex: 1,
    maxWidth: "90%",
  },
  mediaIndicators: {
    flexDirection: "row",
    marginTop: 6,
    gap: 8,
    alignItems: "center",
    minHeight: 24,
    paddingHorizontal: 4,
  },
  inlinePillsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "nowrap",
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
