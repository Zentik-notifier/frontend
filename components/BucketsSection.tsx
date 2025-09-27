import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { getBucketStats } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { FAB, Icon, Text, TouchableRipple, useTheme } from "react-native-paper";
import BucketIcon from "./BucketIcon";
import NotificationSnoozeButton from "./NotificationSnoozeButton";

const BucketsSection: React.FC = () => {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    data: bucketsData,
    loading: bucketsLoading,
    refetch: refetchBuckets,
  } = useGetBucketsQuery();
  const {
    notifications,
    setMainLoading,
    refetchNotifications,
    notificationsLoading,
  } = useAppContext();
  const buckets = bucketsData?.buckets ?? [];
  const { navigateToCreateBucket, navigateToBucketDetail } =
    useNavigationUtils();

  const loading = notificationsLoading || bucketsLoading;

  useEffect(() => setMainLoading(loading), [loading]);

  const { bucketStats } = useMemo(
    () => getBucketStats(buckets, notifications),
    [buckets, notifications]
  );

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

  if (bucketStats.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.emptyStateContainer}>
          <View style={[
            styles.emptyState,
            { backgroundColor: theme.colors.surface },
          ]}>
            <Icon source="bucket" size={64} color={theme.colors.onSurfaceVariant} />
            <Text 
              variant="headlineSmall" 
              style={[
                styles.emptyTitle,
                { color: theme.colors.onSurface },
              ]}
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

        {/* Floating Action Button per creare nuovo bucket */}
        <FAB
          icon="plus"
          style={styles.fab}
          onPress={() => {
            navigateToCreateBucket(true);
          }}
        />
      </View>
    );
  }

  const refetch = async () => {
    await refetchNotifications();
    await refetchBuckets();
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={theme.colors.primary}
          />
        }
      >
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
                  <BucketIcon bucketId={bucket.id} size="lg" noRouting />

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
                  </View>

                  <NotificationSnoozeButton
                    bucketId={bucket.id}
                    variant="swipeable"
                    showText
                  />

                  {/* Badge per notifiche non lette */}
                  {bucket.unreadCount > 0 && (
                    <View
                      style={[
                        styles.unreadBadge,
                        { backgroundColor: theme.colors.error },
                      ]}
                    >
                      <Text style={[styles.unreadText, { color: theme.colors.onError }]}>
                        {bucket.unreadCount > 99 ? "99+" : bucket.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>

                {/* Statistiche */}
                <View style={styles.bucketStats}>
                  <View style={styles.statItem}>
                    <Icon source="bell" size={16} color={theme.colors.onSurfaceVariant} />
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
                    <Icon source="clock" size={16} color={theme.colors.onSurfaceVariant} />
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
      </ScrollView>

      {/* Floating Action Button per creare nuovo bucket */}
      <FAB
        icon="plus"
        style={styles.fab}
        onPress={() => {
          navigateToCreateBucket(true);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  scrollView: {
    flex: 1,
  },
  bucketsGrid: {
    padding: 16,
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
});

export default BucketsSection;
