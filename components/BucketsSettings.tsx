import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import SwipeableBucketItem from "./SwipeableBucketItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { AppLoader } from "./ui/AppLoader";

interface BucketsSettingsProps {
  refreshing?: boolean;
}

export default function BucketsSettings({
  refreshing: externalRefreshing,
}: BucketsSettingsProps) {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const {
    setLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const { data, loading, error, refetch } = useGetBucketsQuery();
  useEffect(() => setLoading(loading), [loading]);

  const buckets = data?.buckets || [];
  const sortedBuckets = useEntitySorting(buckets, "desc");

  useEffect(() => {
    if (externalRefreshing) {
      refetch();
    }
  }, [externalRefreshing, refetch]);

  // Handle GraphQL error
  if (error) {
    console.error("Error loading buckets:", error);
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t("buckets.title")}</ThemedText>
        <TouchableOpacity
          style={[
            styles.createButton,
            {
              backgroundColor:
                isOfflineAuth || isBackendUnreachable
                  ? Colors[colorScheme ?? "light"].buttonDisabled
                  : Colors[colorScheme ?? "light"].tint,
            },
          ]}
          onPress={() => router.push("/(mobile)/private/create-bucket")}
          disabled={isOfflineAuth || isBackendUnreachable}
        >
          <Ionicons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.description}>
        {t("buckets.organize")}
      </ThemedText>

      {buckets.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons
            name="folder-outline"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {t("buckets.noBucketsYet")}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {t("buckets.createFirstBucket")}
          </ThemedText>
        </ThemedView>
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
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  createButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
  },
  bucketsContainer: {
    flex: 1,
  },
});
