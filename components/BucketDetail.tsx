import { useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useMassMarkNotificationsAsRead } from "@/hooks/useNotifications";
import { useAppContext } from "@/contexts/AppContext";
import { useUserSettings, userSettings } from "@/services/user-settings";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Badge,
  FAB,
  Icon,
  IconButton,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import BucketIcon from "./BucketIcon";
import MessageBuilder from "./MessageBuilder";
import { NotificationsListWithContext } from "./NotificationsList";
import NotificationSnoozeButton from "./NotificationSnoozeButton";
import CopyButton from "./ui/CopyButton";

interface BucketDetailProps {
  bucketId: string;
}

export default function BucketDetail({ bucketId }: BucketDetailProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToEditBucket, navigateToBucketsSettings } =
    useNavigationUtils();
  const { massMarkAsRead, loading: markAllAsReadLoading } =
    useMassMarkNotificationsAsRead();

  const [isMessageBuilderVisible, setIsMessageBuilderVisible] = useState(false);

  const { notifications, connectionStatus } = useAppContext();
  const {
    settings: { notificationFilters },
  } = useUserSettings();
  const { bucket, error } = useGetBucketData(bucketId);

  const isOrphaned = error && error.message.includes("Bucket not found");

  useEffect(() => {
    if (isOrphaned) {
      navigateToBucketsSettings(bucketId);
    }
  }, [bucketId, isOrphaned]);

  // Filter notifications for this bucket
  const bucketNotifications = useMemo(() => {
    return notifications.filter(
      (notification) => notification.message?.bucket?.id === bucketId
    );
  }, [notifications, bucketId]);

  // Calculate unread notifications
  const unreadNotifications = useMemo(() => {
    return bucketNotifications.filter((notification) => !notification.readAt);
  }, [bucketNotifications]);

  const filteredNotifications = useMemo(() => {
    if (!bucketNotifications) return [];

    // Apply global filters (including bucket filter since we're already in a bucket context)
    let filtered = bucketNotifications.filter((notification) => {
      return userSettings.shouldFilterNotification(notification, false);
    });

    // Apply sorting based on global settings
    const comparator = userSettings.getNotificationSortComparator();
    filtered = filtered.sort(comparator);

    return filtered;
  }, [bucketNotifications, notificationFilters, userSettings]);

  const handleMarkAllAsRead = async () => {
    if (unreadNotifications.length === 0) return;

    const unreadIds = unreadNotifications.map((n) => n.id);
    try {
      await massMarkAsRead(unreadIds);
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const renderBucketHeader = () => (
    <Surface style={styles.bucketHeader} elevation={0}>
      <View style={styles.bucketInfo}>
        <BucketIcon bucketId={bucketId} size="xl" noRouting />

        <View style={styles.bucketDetails}>
          <Text style={[styles.bucketName, { color: theme.colors.onSurface }]}>
            {bucket?.name}
          </Text>
          {bucket?.description && (
            <Text
              style={[
                styles.bucketDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {bucket.description}
            </Text>
          )}

          {/* Statistics */}
          <View style={styles.bucketStats}>
            <View style={styles.statItem}>
              <Icon
                source="bell-outline"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
              <Text
                style={[
                  styles.statText,
                  { color: theme.colors.onSurfaceVariant },
                ]}
              >
                {bucketNotifications.length} {t("buckets.item.messages")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Block (Top row: mark/edit/copy; Bottom row: snooze) */}
      <View style={styles.actionBlock}>
        <View style={styles.actionTopRow}>
          {/* Mark All as Read - rectangular button with badge */}
          <View style={{ position: "relative" }}>
            <TouchableRipple
              style={[
                styles.actionButton,
                {
                  backgroundColor:
                    unreadNotifications.length > 0
                      ? theme.colors.primary
                      : theme.colors.surfaceVariant,
                  width: 32,
                  height: 32,
                },
              ]}
              onPress={handleMarkAllAsRead}
              disabled={
                unreadNotifications.length === 0 || markAllAsReadLoading
              }
            >
              <View>
                <Icon
                  source="check-all"
                  size={16}
                  color={
                    unreadNotifications.length > 0
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                />
              </View>
            </TouchableRipple>
            {unreadNotifications.length > 0 && (
              <Badge
                size={16}
                style={{ position: "absolute", top: -2, right: -2 }}
              >
                {unreadNotifications.length}
              </Badge>
            )}
          </View>

          {/* Edit Button */}
          <TouchableRipple
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.surfaceVariant,
                width: 32,
                height: 32,
              },
            ]}
            onPress={() => navigateToEditBucket(bucketId, true)}
          >
            <View>
              <Icon
                source="pencil"
                size={16}
                color={theme.colors.onSurfaceVariant}
              />
            </View>
          </TouchableRipple>

          {/* Copy Bucket ID Button */}
          <CopyButton
            text={bucketId}
            size={16}
            style={[
              styles.actionButton,
              {
                backgroundColor: theme.colors.surfaceVariant,
                width: 32,
                height: 32,
                margin: 0,
                padding: 0,
              },
            ]}
          />

          {/* Snooze Button */}
          <NotificationSnoozeButton
            bucketId={bucketId}
            variant="detail"
            showText={false}
            style={{
              width: 32,
              height: 32,
            }}
          />
        </View>
      </View>
    </Surface>
  );

  if (!bucket) {
    return null;
  }

  return (
    <Surface
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      elevation={0}
    >
      {/* Sticky Header with Bucket Info */}
      <View
        style={[
          styles.stickyHeader,
          { backgroundColor: theme.colors.background },
        ]}
      >
        {renderBucketHeader()}
      </View>

      {/* Notifications List */}
      <NotificationsListWithContext
        notifications={filteredNotifications}
        hideBucketInfo
        customHeader={<View style={[styles.filtersContainer]} />}
      />

      <MessageBuilder
        bucketId={bucketId}
        isVisible={isMessageBuilderVisible}
        onClose={() => setIsMessageBuilderVisible(false)}
        trigger={
          <FAB
            icon="message"
            style={styles.fab}
            onPress={() => setIsMessageBuilderVisible(true)}
          />
        }
      />
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: "white",
    zIndex: 1,
  },

  bucketHeader: {
    padding: 12,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  bucketInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    flex: 1,
  },
  bucketDetails: {
    flex: 1,
  },
  bucketName: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 4,
  },
  bucketDescription: {
    fontSize: 14,
    marginBottom: 12,
  },
  bucketStats: {
    flexDirection: "row",
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    fontSize: 12,
  },
  filtersContainer: {},
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: "center",
    opacity: 0.7,
  },
  actionBlock: {
    flexDirection: "column",
    gap: 8,
  },
  actionTopRow: {
    flexDirection: "row",
    gap: 8,
    justifyContent: "flex-end",
  },
  actionButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  markAllButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 36,
  },
  markAllButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  markAllButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#fff",
  },
  fab: {
    position: "absolute",
    margin: 16,
    right: 0,
    bottom: 0,
  },
});
