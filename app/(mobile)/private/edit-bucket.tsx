import BucketDeleteModal from "@/components/BucketDeleteModal";
import BucketSharingSection from "@/components/BucketSharingSection";
import CreateBucketForm from "@/components/CreateBucketForm";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import IconButton from "@/components/ui/IconButton";
import { Colors } from "@/constants/Colors";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState } from "react";
import { StyleSheet, View } from "react-native";

export default function EditBucketPage() {
  const colorScheme = useColorScheme();
  const { bucketId } = useLocalSearchParams<{ bucketId: string }>();
  const router = useRouter();
  const { t } = useI18n();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { bucket, loading, error, canAdmin, refetch } =
    useGetBucketData(bucketId);

  // Early return if no ID
  if (!bucketId) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>
          {t("buckets.form.noBucketId")}
        </ThemedText>
      </ThemedView>
    );
  }

  const onDeleteComplete = async () => {
    setShowDeleteModal(false);
    router.back();
  };

  // Handle GraphQL error
  if (error) {
    console.error("Error loading bucket:", error);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText
            style={[
              styles.loadingText,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("buckets.form.loadingBucket")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!bucket) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <ThemedText
            style={[styles.errorText, { color: Colors[colorScheme].error }]}
          >
            {t("buckets.form.bucketNotFound")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const handleRefresh = async () => {
    console.debug("Refreshing edit bucket form");
    await refetch?.();
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView style={styles.content} onRefresh={handleRefresh}>
        {(refreshing: boolean) => (
          <>
            <CreateBucketForm bucketId={bucketId} />

            {/* Bucket Sharing Section - Only show if user has ADMIN permissions */}
            {canAdmin && <BucketSharingSection bucketId={bucket.id} />}

            {/* Delete Bucket Button - Only show if user can delete */}
            <View
              style={[
                styles.deleteSection,
                {
                  backgroundColor: Colors[colorScheme].backgroundCard,
                  borderColor: Colors[colorScheme].border,
                  borderWidth: 1,
                },
              ]}
            >
              <IconButton
                title={t("buckets.form.deleteBucket")}
                iconName="delete"
                onPress={() => setShowDeleteModal(true)}
                variant="danger"
                size="lg"
              />
            </View>
          </>
        )}
      </RefreshableScrollView>

      <BucketDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        bucket={bucket}
        onBucketDeleted={onDeleteComplete}
        onSharingRevoked={onDeleteComplete}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.6,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    color: "#ff6b6b",
  },
  deleteSection: {
    marginTop: 20,
    marginHorizontal: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "#ffebee",
  },
  deleteButton: {
    backgroundColor: "#f44336",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    alignItems: "center",
  },
  deleteButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
});
