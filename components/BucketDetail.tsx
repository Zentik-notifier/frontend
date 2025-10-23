import { useI18n } from "@/hooks/useI18n";
import {
  useAppState,
  useBatchMarkAsRead,
  useBucket,
} from "@/hooks/notifications";
import { queryBucketNotifications } from "@/db/repositories/notifications-query-repository";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect } from "react";
import { StyleSheet, View } from "react-native";
import {
  Badge,
  FAB,
  Icon,
  IconButton,
  Surface,
  Text,
  Button,
  useTheme,
} from "react-native-paper";
import BucketIcon from "./BucketIcon";
import MessageBuilder from "./MessageBuilder";
import { NotificationsListWithContext } from "./NotificationsList";
import NotificationSnoozeButton from "./NotificationSnoozeButton";
import ButtonGroup from "./ui/ButtonGroup";
import CopyButton from "./ui/CopyButton";

interface BucketDetailProps {
  bucketId: string;
}

export default function BucketDetail({ bucketId }: BucketDetailProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { userId } = useAppContext();
  const { navigateToEditBucket, navigateToDanglingBucket } =
    useNavigationUtils();

  // Read from GLOBAL app state cache - automatically updates when cache refreshes
  const { data: appState } = useAppState();
  const bucketStats = appState?.buckets.find((b) => b.id === bucketId);

  // Bucket data with permissions
  const { bucket, isSnoozed, isOrphan, canWrite } = useBucket(bucketId, {
    userId: userId ?? undefined,
    autoFetch: true,
  });

  // Get counts from bucketsStats (automatically updates when cache refreshes)
  const totalCount = bucketStats?.totalMessages ?? 0;
  const unreadCount = bucketStats?.unreadCount ?? 0;

  const { mutateAsync: batchMarkAsRead, isPending: markAllAsReadLoading } =
    useBatchMarkAsRead();
 
  const handleMarkAllAsRead = async () => {
    if (unreadCount === 0) return;

    try {
      // Fetch only unread notifications to get their IDs (lightweight query from local DB)
      const unreadData = await queryBucketNotifications(bucketId, {
        filters: { isRead: false },
      });

      if (!unreadData?.notifications.length) return;

      const unreadIds = unreadData.notifications.map((n) => n.id);
      await batchMarkAsRead({
        notificationIds: unreadIds,
        readAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error marking all as read:", error);
    }
  };

  const renderBucketHeader = () => (
    <Surface style={styles.bucketHeader} elevation={0}>
      <View style={styles.bucketInfo}>
        <BucketIcon bucketId={bucketId} size="xl" noRouting userId={userId} />

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
                {totalCount} {t("buckets.item.messages")}
              </Text>
            </View>
          </View>
        </View>
      </View>

      {/* Action Block (Top row: mark/edit/copy; Bottom row: snooze) */}
      <View style={styles.actionBlock}>
        <View style={styles.actionTopRow}>
          {isOrphan ? (
            // Orphan bucket: show link bucket button
            <Button
              mode="contained"
              buttonColor={theme.colors.error}
              textColor={theme.colors.onError}
              icon="link"
              onPress={() => navigateToDanglingBucket(bucketId, false)}
              style={styles.orphanButton}
            >
              {t("buckets.linkBucket")}
            </Button>
          ) : (
            // Normal bucket: show standard actions
            <ButtonGroup>
              <View style={{ position: "relative" }}>
                <IconButton
                  icon="check-all"
                  size={15}
                  iconColor={
                    unreadCount > 0
                      ? theme.colors.onPrimary
                      : theme.colors.onSurfaceVariant
                  }
                  style={[
                    styles.actionButton,
                    {
                      backgroundColor:
                        unreadCount > 0
                          ? theme.colors.primary
                          : theme.colors.surfaceVariant,
                      width: 26,
                      height: 26,
                    },
                  ]}
                  onPress={handleMarkAllAsRead}
                  disabled={unreadCount === 0 || markAllAsReadLoading}
                  accessibilityLabel="mark-all-as-read"
                />
                {unreadCount > 0 && (
                  <Badge
                    size={16}
                    style={{ position: "absolute", top: -2, right: -2 }}
                  >
                    {unreadCount}
                  </Badge>
                )}
              </View>

              <IconButton
                icon="cog"
                size={15}
                iconColor={theme.colors.onSurfaceVariant}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    width: 26,
                    height: 26,
                  },
                ]}
                onPress={() => navigateToEditBucket(bucketId, true)}
                accessibilityLabel="edit-bucket"
              />

              <CopyButton
                text={bucketId}
                size={13}
                style={[
                  styles.actionButton,
                  {
                    backgroundColor: theme.colors.surfaceVariant,
                    width: 26,
                    height: 26,
                    margin: 0,
                    padding: 0,
                  },
                ]}
              />

              <NotificationSnoozeButton
                bucketId={bucketId}
                variant="detail"
                showText={false}
                style={{ width: 26, height: 26 }}
                isSnoozed={isSnoozed}
                snoozeUntilDate={bucket?.userBucket?.snoozeUntil ?? null}
              />
            </ButtonGroup>
          )}
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
        bucketId={bucketId}
        hideBucketInfo
        customHeader={<View style={[styles.filtersContainer]} />}
      />

      {canWrite && (
        <MessageBuilder
          bucketId={bucketId}
          trigger={(show: () => void) => (
            <FAB icon="message" style={styles.fab} onPress={show} />
          )}
        />
      )}
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
    padding: 5,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  orphanButton: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
