import PaperScrollView from "@/components/ui/PaperScrollView";
import { useAppContext } from "@/contexts/AppContext";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import {
  Card,
  Icon,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import SwipeableBucketItem from "./SwipeableBucketItem";

export default function BucketsSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    notifications,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const {
    navigateToCreateBucket,
    navigateToBucketsSettings,
    navigateToDanglingBucket,
  } = useNavigationUtils();

  const [showDanglingBuckets, setShowDanglingBuckets] = useState(false);

  const { data, loading, error, refetch } = useGetBucketsQuery();

  const handleRefresh = async () => {
    await refetch();
  };

  const buckets = data?.buckets || [];
  const sortedBuckets = useEntitySorting(buckets, "desc");

  // Identifica i dangling buckets (bucket collegati a notifiche ma non esistenti nel remote)
  const danglingBuckets = useMemo(() => {
    const remoteBucketIds = new Set(buckets.map((bucket) => bucket.id));
    const danglingBucketMap = new Map<string, { bucket: any; count: number }>();

    notifications.forEach((notification) => {
      const bucket = notification.message?.bucket;
      if (bucket && !remoteBucketIds.has(bucket.id)) {
        const existing = danglingBucketMap.get(bucket.id);
        if (existing) {
          existing.count++;
        } else {
          danglingBucketMap.set(bucket.id, { bucket, count: 1 });
        }
      }
    });

    return Array.from(danglingBucketMap.values());
  }, [notifications, buckets]);

  if (error) {
    console.error("Error loading buckets:", error);
  }

  const handleDanglingBucketPress = (item: { bucket: any; count: number }) => {
    navigateToDanglingBucket(item.bucket.id, false);
  };

  return (
    <View style={styles.container}>
      <PaperScrollView
        onRefresh={handleRefresh}
        loading={loading}
        onAdd={() => navigateToCreateBucket(false)}
      >
        {/* Header collassabile Dangling Buckets */}
        {danglingBuckets.length > 0 && (
          <Card
            style={[
              styles.danglingSection,
              { backgroundColor: theme.colors.surfaceVariant },
            ]}
            elevation={0}
          >
            <TouchableRipple
              onPress={() => setShowDanglingBuckets(!showDanglingBuckets)}
            >
              <Card.Content style={styles.collapsibleHeader}>
                <View style={styles.headerLeft}>
                  <Icon source="alert" size={24} color={theme.colors.error} />
                  <View style={styles.headerTextContainer}>
                    <Text
                      variant="titleMedium"
                      style={[
                        styles.danglingTitle,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {t("buckets.danglingBuckets")}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.headerSubtitle,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {danglingBuckets.length}{" "}
                      {danglingBuckets.length === 1 ? "bucket" : "buckets"}
                    </Text>
                  </View>
                </View>
                <Icon
                  source={showDanglingBuckets ? "chevron-up" : "chevron-down"}
                  size={24}
                  color={theme.colors.onSurfaceVariant}
                />
              </Card.Content>
            </TouchableRipple>

            {showDanglingBuckets && (
              <Card.Content style={styles.collapsibleContent}>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.danglingDescription,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("buckets.danglingBucketsDescription")}
                </Text>

                <View style={styles.danglingBucketsContainer}>
                  {danglingBuckets.map((item) => (
                    <Card
                      key={item.bucket.id}
                      style={[
                        styles.danglingBucketItem,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      elevation={0}
                    >
                      <TouchableRipple
                        onPress={() => handleDanglingBucketPress(item)}
                      >
                        <Card.Content>
                          <View style={styles.danglingBucketInfo}>
                            <Icon
                              source="alert"
                              size={16}
                              color={theme.colors.error}
                            />
                            <View style={styles.danglingBucketDetails}>
                              <Text
                                variant="titleSmall"
                                style={styles.danglingBucketName}
                              >
                                {item.bucket.name ||
                                  `Bucket ${item.bucket.id.slice(0, 8)}`}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={[
                                  styles.danglingBucketCount,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                {t("buckets.danglingBucketItem", {
                                  count: item.count,
                                })}
                              </Text>
                            </View>
                            <Icon
                              source="chevron-right"
                              size={14}
                              color={theme.colors.onSurfaceVariant}
                            />
                          </View>
                        </Card.Content>
                      </TouchableRipple>
                    </Card>
                  ))}
                </View>
              </Card.Content>
            )}
          </Card>
        )}

        {buckets.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="folder"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("buckets.noBucketsYet")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("buckets.createFirstBucket")}
            </Text>
          </View>
        ) : (
          <View style={styles.bucketsContainer}>
            {sortedBuckets.map((item) => (
              <SwipeableBucketItem
                bucketDeleted={() => refetch()}
                onSharingRevoked={() => refetch()}
                key={item.id}
                bucket={item}
              />
            ))}
          </View>
        )}
      </PaperScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  bucketsContainer: {
    flex: 1,
  },
  danglingSection: {
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(255, 193, 7, 0.3)",
  },
  collapsibleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerSubtitle: {
    marginTop: 2,
  },
  collapsibleContent: {
    paddingTop: 8,
  },
  danglingTitle: {
    marginBottom: 0,
  },
  danglingDescription: {
    marginBottom: 16,
  },
  danglingBucketsContainer: {
    gap: 8,
  },
  danglingBucketItem: {
    marginBottom: 8,
  },
  danglingBucketInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  danglingBucketDetails: {
    marginLeft: 8,
    flex: 1,
  },
  danglingBucketName: {
    marginBottom: 1,
  },
  danglingBucketCount: {
    // fontSize handled by variant
  },
});
