import PaperScrollView from "@/components/ui/PaperScrollView";
import { useAppState } from "@/hooks/notifications";
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
  const { navigateToCreateBucket, navigateToDanglingBucket } =
    useNavigationUtils();

  const [showDanglingBuckets, setShowDanglingBuckets] = useState(false);

  const {
    data: appState,
    isLoading: loading,
    error,
    refreshAll,
  } = useAppState({ forceFullDetails: true });
  const { buckets, orphanedBuckets } = useMemo(() => {
    const buckets = appState?.buckets || [];
    return {
      buckets: buckets.filter((bucket) => !bucket.isOrphan),
      orphanedBuckets: buckets.filter((bucket) => bucket.isOrphan),
    };
  }, [appState]);

  const handleRefresh = async () => {
    await refreshAll();
  };

  const handleBucketDeleted = async () => {
    await refreshAll();
  };

  const sortedBuckets = useEntitySorting(buckets, "desc");

  const handleDanglingBucketPress = (bucket: any) => {
    navigateToDanglingBucket(bucket.id, false);
  };

  return (
    <View style={styles.container}>
      <PaperScrollView
        onRefresh={handleRefresh}
        loading={loading}
        onAdd={() => navigateToCreateBucket(false)}
        error={!loading && !!error}
      >
        {/* Header collassabile Dangling Buckets */}
        {orphanedBuckets.length > 0 && (
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
                      {orphanedBuckets.length}{" "}
                      {orphanedBuckets.length === 1 ? "bucket" : "buckets"}
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
                  {orphanedBuckets.map((bucket) => (
                    <Card
                      key={bucket.id}
                      style={[
                        styles.danglingBucketItem,
                        { backgroundColor: theme.colors.surface },
                      ]}
                      elevation={0}
                    >
                      <TouchableRipple
                        onPress={() => handleDanglingBucketPress(bucket)}
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
                                {bucket.name ||
                                  `Bucket ${bucket.id.slice(0, 8)}`}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={[
                                  styles.danglingBucketCount,
                                  { color: theme.colors.onSurfaceVariant },
                                ]}
                              >
                                {t("buckets.danglingBucketItem", {
                                  count: bucket.totalMessages,
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
                bucketDeleted={handleBucketDeleted}
                onSharingRevoked={handleRefresh}
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
