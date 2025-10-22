import {
  useBucketsStats,
  useInitializeBucketsStats,
} from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, TouchableRipple, useTheme, Portal, Modal } from "react-native-paper";
import BucketIcon from "./BucketIcon";
import NotificationSnoozeButton from "./NotificationSnoozeButton";
import PaperScrollView from "./ui/PaperScrollView";
import RedeemInviteCodeModal from "./RedeemInviteCodeModal";

const BucketsSection: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  const { navigateToCreateBucket, navigateToBucketDetail } =
    useNavigationUtils();

  // State for redeem modal
  const [showRedeemModal, setShowRedeemModal] = useState(false);

  // Read buckets from GLOBAL cache (populated by useCleanup on startup)
  const { data: bucketStats = [], isLoading: loading } = useBucketsStats({});

  // Hook to manually refresh buckets from API (for pull-to-refresh)
  const { initializeBucketsStats } = useInitializeBucketsStats();

  // Initialize buckets on mount if not already loaded
  React.useEffect(() => {
    if (bucketStats.length === 0 && !loading) {
      console.log("[BucketsSection] No buckets in cache, initializing...");
      initializeBucketsStats().catch(console.error);
    }
  }, []);

  const handleBucketPress = (bucketId: string) => {
    navigateToBucketDetail(bucketId);
  };

  const formatLastActivity = (lastNotificationAt: string | null) => {
    if (!lastNotificationAt) return t("buckets.item.noActivity");

    const now = new Date();
    const lastActivity = new Date(lastNotificationAt);
    const diffMs = now.getTime() - lastActivity.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor(diffMs / (1000 * 60));

    if (diffDays > 0) {
      return t("buckets.item.daysAgo", { count: diffDays });
    } else if (diffHours > 0) {
      return t("buckets.item.hoursAgo", { count: diffHours });
    } else if (diffMinutes > 0) {
      return t("buckets.item.minutesAgo", { count: diffMinutes });
    } else {
      return t("buckets.item.justNow");
    }
  };

  const emptyState = (
    <View style={styles.emptyStateContainer}>
      <View
        style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}
      >
        <Icon source="bucket" size={64} color={theme.colors.onSurfaceVariant} />
        <Text
          variant="headlineSmall"
          style={[styles.emptyTitle, { color: theme.colors.onSurface }]}
        >
          {t("buckets.noBucketsYet")}
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.emptyDescription,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("buckets.createFirstBucket")}
        </Text>
      </View>
    </View>
  );

  const refetch = async () => {
    await initializeBucketsStats();
  };

  const handleRedeemSuccess = (resourceType: string, resourceId: string) => {
    console.log("[BucketsSection] Redeem successful:", { resourceType, resourceId });
    setShowRedeemModal(false);
    // Refresh buckets to show the newly joined bucket
    initializeBucketsStats().catch(console.error);
  };

  const handleRedeemCancel = () => {
    setShowRedeemModal(false);
  };

  return (
    <>
      <PaperScrollView
      onRefresh={() => refetch()}
      loading={loading}
      onAdd={() => navigateToCreateBucket(true)}
      fabGroupIcon="plus"
      customActions={[
        {
          icon: "ticket",
          label: t("buckets.inviteCodes.redeem"),
          onPress: () => setShowRedeemModal(true),
        },
      ]}
    >
      {bucketStats.length === 0 ? (
        emptyState
      ) : (
        <View style={styles.bucketsGrid}>
          {bucketStats.map((bucket) => (
            <TouchableRipple
              key={bucket.id}
              style={[
                styles.bucketCard,
                {
                  borderColor: theme.colors.outline,
                  backgroundColor: theme.colors.surface,
                },
              ]}
              onPress={() => handleBucketPress(bucket.id)}
            >
              <View style={styles.bucketCardContent}>
                {/* Header con icona e nome */}
                <View style={styles.bucketHeader}>
                  <BucketIcon bucketId={bucket.id} size="lg" />

                  <View style={styles.bucketInfo}>
                    <Text
                      variant="titleMedium"
                      style={[
                        styles.bucketName,
                        { color: theme.colors.onSurface },
                      ]}
                      numberOfLines={1}
                    >
                      {bucket.name}
                    </Text>
                    {bucket.description && (
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.bucketDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        {bucket.description}
                      </Text>
                    )}
                    {bucket.userPermissions?.isSharedWithMe && (
                      <View style={styles.sharedWithMeTag}>
                        <Text variant="bodySmall" style={styles.sharedWithMeText}>
                          {t("buckets.item.sharedWithMe")}
                        </Text>
                      </View>
                    )}
                  </View>

                  <NotificationSnoozeButton
                    bucketId={bucket.id}
                    variant="swipeable"
                    showText
                    isSnoozed={bucket.isSnoozed}
                    snoozeUntilDate={bucket.snoozeUntil}
                  />

                  {/* Badge per notifiche non lette */}
                  {bucket.unreadCount > 0 && (
                    <View
                      style={[
                        styles.unreadBadge,
                        { backgroundColor: theme.colors.error },
                      ]}
                    >
                      <Text
                        style={[
                          styles.unreadText,
                          { color: theme.colors.onError },
                        ]}
                      >
                        {bucket.unreadCount > 99 ? "99+" : bucket.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Statistiche */}
                <View style={styles.bucketStats}>
                  <View style={styles.statItem}>
                    <Icon
                      source="bell"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.statText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {bucket.totalMessages} {t("buckets.item.messages")}
                    </Text>
                  </View>

                  <View style={styles.statItem}>
                    <Icon
                      source="clock"
                      size={16}
                      color={theme.colors.onSurfaceVariant}
                    />
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.statText,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {formatLastActivity(bucket.lastNotificationAt)}
                    </Text>
                  </View>
                </View>
              </View>
            </TouchableRipple>
          ))}
        </View>
      )}
    </PaperScrollView>

    {/* Redeem Invite Code Modal */}
    <Portal>
      <Modal
        visible={showRedeemModal}
        onDismiss={handleRedeemCancel}
        contentContainerStyle={styles.modalContainer}
      >
        <RedeemInviteCodeModal
          onSuccess={handleRedeemSuccess}
          onCancel={handleRedeemCancel}
        />
      </Modal>
    </Portal>
    </>
  );
};

const styles = StyleSheet.create({
  bucketsGrid: {
    gap: 12,
  },
  bucketCard: {
    borderRadius: 12,
    borderWidth: 1,
    backgroundColor: "transparent", // Will be set dynamically
  },
  bucketCardContent: {
    padding: 16,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    marginBottom: 2,
  },
  bucketDescription: {
    // fontSize handled by variant
  },
  sharedWithMeTag: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginTop: 4,
    alignSelf: "flex-start",
  },
  sharedWithMeText: {
    color: "#fff",
    fontWeight: "600",
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  unreadText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bucketStats: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  statText: {
    // fontSize handled by variant
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    margin: 16,
    padding: 32,
    borderRadius: 12,
    backgroundColor: "transparent", // Will be set dynamically
  },
  emptyTitle: {
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
  },
  modalContainer: {
    margin: 20,
    padding: 0,
  },
});

export default BucketsSection;
