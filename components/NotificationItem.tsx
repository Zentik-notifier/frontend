import { useAppContext } from "@/contexts/AppContext";
import {
  MediaType,
  NotificationDeliveryType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useNotificationActions, useNotificationUtils } from "@/hooks";
import {
  useBucket,
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
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import BucketIcon from "./BucketIcon";
import { CachedMedia } from "./CachedMedia";
import FullScreenMediaViewer from "./FullScreenMediaViewer";
import { MediaTypeIcon } from "./MediaTypeIcon";
import SwipeableItem, {
  MenuItem,
  SwipeAction,
  SwipeableItemRef,
} from "./SwipeableItem";
import { SmartTextRenderer } from "./ui";
import AttachmentGallery from "./AttachmentGallery";

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
  const swipeableRef = useRef<SwipeableItemRef>(null);
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
  const { getActionTypeIcon, getNotificationActions, getDeliveryTypeColor } =
    useNotificationUtils();

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

  // Close swipe when notification changes (fixes FlashList recycling issue)
  useEffect(() => {
    swipeableRef.current?.close();
  }, [notification.id]);
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
      await deleteNotificationMutation.mutateAsync({
        notificationId: notification.id,
      });
    } catch (error) {
      console.error("❌ Failed to delete notification:", error);
      Alert.alert(t("common.error"), t("swipeActions.delete.error"));
    }
  };

  const isRead = !!notification.readAt;

  // Use useRecyclingState to stabilize bucketId and prevent unnecessary BucketIcon re-renders
  const [stableBucketId] = useRecyclingState<string | undefined>(
    notification.message?.bucket?.id,
    [notification.id]
  );

  // Fetch bucket from cache using useBucket hook
  const { bucket } = useBucket(stableBucketId);

  // Get bucket name from hook (from cache) or fallback to notification bucket name
  const bucketName =
    bucket?.name || notification.message?.bucket?.name || t("common.general");

  const visibleAttachment = !isCompactMode && attachments.length > 0;

  const handleVisualPress = (visualUri: string) => {
    // Navigate to notification detail instead of opening fullscreen
    navigateToNotificationDetail(notification.id);
  };

  const handleFullscreenPress = (visualUri: string) => {
    const attachmentIndex = attachments.findIndex(
      (att) => att.url === visualUri
    );
    setFullScreenIndex(attachmentIndex >= 0 ? attachmentIndex : 0);
  };

  const handleCloseFullScreenImage = () => {
    setFullScreenIndex(-1);
  };

  const bodyMaxLines = isCompactMode ? 2 : 5;

  // Swipe actions
  const handleMarkAsRead = async () => {
    try {
      await markAsReadMutation.mutateAsync({ notificationId: notification.id });
    } catch {}
  };

  const handleMarkAsUnread = async () => {
    try {
      await markAsUnreadMutation.mutateAsync({
        notificationId: notification.id,
      });
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
    return getNotificationActions(notification);
  }, [notification]);

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
  const borderColor = deliveryType
    ? getDeliveryTypeColor(deliveryType)
    : undefined;

  const borderWidth =
    deliveryType === NotificationDeliveryType.Critical ||
    deliveryType === NotificationDeliveryType.Silent ||
    deliveryType === NotificationDeliveryType.NoPush
      ? 2.5
      : 1;

  return (
    <SwipeableItem
      ref={swipeableRef}
      marginHorizontal={16}
      leftAction={isMultiSelectionMode ? undefined : toggleReadAction}
      rightAction={isMultiSelectionMode ? undefined : deleteAction}
      borderColor={borderColor}
      borderWidth={borderWidth}
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
                bucketId={stableBucketId || ""}
                size={"lg"}
                noRouting={noBucketRouting}
                icon={notification.message?.bucket?.iconUrl}
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

        {/* Date positioned absolutely in top right */}
        <View style={styles.absoluteDate}>
          <Text style={styles.date}>
            {formatRelativeTime(notification.createdAt)}
          </Text>
        </View>

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

      {visibleAttachment && (
        <AttachmentGallery
          attachments={attachments}
          onMediaPress={() => {
            mediaPressRef.current = true;
            handleVisualPress(attachment.url!);
          }}
          enableFullScreen
          fullScreenTrigger="button"
          maxHeight={180}
          selectorPosition="top"
          notificationDate={new Date(notification.createdAt).getTime()}
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
  fullscreenButton: {
    position: "absolute",
    bottom: 8,
    left: 8,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  absoluteDate: {
    position: "absolute",
    top: 12,
    right: 12,
    zIndex: 5,
  },
});

export default React.memo(NotificationItem);
