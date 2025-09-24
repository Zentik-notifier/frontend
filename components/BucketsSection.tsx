import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo } from "react";
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import BucketIcon from "./BucketIcon";
import NotificationSnoozeButton from "./NotificationSnoozeButton";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

interface BucketStats {
  id: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  totalMessages: number;
  unreadCount: number;
  lastNotificationAt: string | null;
}

const BucketsSection: React.FC = () => {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
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

  const bucketStats = useMemo((): BucketStats[] => {
    return buckets
      .map((bucket) => {
        const bucketNotifications = notifications.filter(
          (notification) => notification.message?.bucket?.id === bucket.id
        );

        const totalMessages = bucketNotifications.length;
        const unreadCount = bucketNotifications.filter(
          (notification) => !notification.readAt
        ).length;

        const lastNotification = bucketNotifications.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        return {
          id: bucket.id,
          name: bucket.name,
          description: bucket.description,
          color: bucket.color,
          icon: bucket.icon,
          totalMessages,
          unreadCount,
          lastNotificationAt: lastNotification?.createdAt || null,
        };
      })
      .sort((a, b) => {
        // Ordina per ultima notifica ricevuta (più recenti prima)
        if (!a.lastNotificationAt && !b.lastNotificationAt) return 0;
        if (!a.lastNotificationAt) return 1;
        if (!b.lastNotificationAt) return -1;
        return (
          new Date(b.lastNotificationAt).getTime() -
          new Date(a.lastNotificationAt).getTime()
        );
      });
  }, [buckets, notifications]);

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
      <ThemedView style={styles.container}>
        <View style={styles.emptyStateContainer}>
          <View
            style={[
              styles.emptyState,
              { backgroundColor: Colors[colorScheme].backgroundCard },
            ]}
          >
            <Icon name="bucket" size="lg" color="secondary" />
            <ThemedText
              style={[styles.emptyTitle, { color: Colors[colorScheme].text }]}
            >
              {t("buckets.noBucketsYet")}
            </ThemedText>
            <ThemedText
              style={[
                styles.emptyDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("buckets.createFirstBucket")}
            </ThemedText>
          </View>
        </View>

        {/* Floating Action Button per creare nuovo bucket */}
        <TouchableOpacity
          style={[styles.fab, { backgroundColor: Colors[colorScheme].tint }]}
          onPress={() => {
            navigateToCreateBucket(true);
          }}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </ThemedView>
    );
  }

  const refetch = async () => {
    await refetchNotifications();
    await refetchBuckets();
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={false}
            onRefresh={refetch}
            tintColor={Colors[colorScheme].tint}
          />
        }
      >
        <View style={styles.bucketsGrid}>
          {bucketStats.map((bucket) => (
            <TouchableOpacity
              key={bucket.id}
              style={[
                styles.bucketCard,
                {
                  backgroundColor: Colors[colorScheme].backgroundCard,
                  borderColor: Colors[colorScheme].border,
                },
              ]}
              onPress={() => handleBucketPress(bucket.id)}
              activeOpacity={0.7}
            >
              {/* Header con icona e nome */}
              <View style={styles.bucketHeader}>
                <BucketIcon bucketId={bucket.id} size="lg" noRouting />

                <View style={styles.bucketInfo}>
                  <ThemedText
                    style={[
                      styles.bucketName,
                      { color: Colors[colorScheme].text },
                    ]}
                    numberOfLines={1}
                  >
                    {bucket.name}
                  </ThemedText>
                  {bucket.description && (
                    <ThemedText
                      style={[
                        styles.bucketDescription,
                        { color: Colors[colorScheme].textSecondary },
                      ]}
                      numberOfLines={1}
                    >
                      {bucket.description}
                    </ThemedText>
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
                      { backgroundColor: Colors[colorScheme].error },
                    ]}
                  >
                    <ThemedText style={[styles.unreadText, { color: "white" }]}>
                      {bucket.unreadCount > 99 ? "99+" : bucket.unreadCount}
                    </ThemedText>
                  </View>
                )}
              </View>

              {/* Statistiche */}
              <View style={styles.bucketStats}>
                <View style={styles.statItem}>
                  <Icon name="notifications" size="xs" color="secondary" />
                  <ThemedText
                    style={[
                      styles.statText,
                      { color: Colors[colorScheme].textSecondary },
                    ]}
                  >
                    {bucket.totalMessages} {t("buckets.item.messages")}
                  </ThemedText>
                </View>

                <View style={styles.statItem}>
                  <Icon name="loading" size="xs" color="secondary" />
                  <ThemedText
                    style={[
                      styles.statText,
                      { color: Colors[colorScheme].textSecondary },
                    ]}
                  >
                    {formatLastActivity(bucket.lastNotificationAt)}
                  </ThemedText>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Floating Action Button per creare nuovo bucket */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: Colors[colorScheme].tint }]}
        onPress={() => {
          navigateToCreateBucket(true);
        }}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
    </ThemedView>
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
    padding: 16,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  bucketDescription: {
    fontSize: 13,
  },
  unreadBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
  },
  snoozePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    borderWidth: 1,
    marginRight: 6,
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
    fontSize: 12,
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
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});

export default BucketsSection;
