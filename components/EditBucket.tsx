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
import { Stack } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

interface EditBucketProps {
  bucketId: string;
  onBack?: () => void;
}

export default function EditBucket({ bucketId, onBack }: EditBucketProps) {
  const { t } = useI18n();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { bucket, loading, error, canAdmin } = useGetBucketData(bucketId);

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
    onBack?.();
  };

  if (error) {
    console.error("Error loading bucket:", error);
  }

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ThemedText style={styles.loadingText}>
            {t("common.loading")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!bucket) {
    return (
      <ThemedView style={styles.errorContainer}>
        <ThemedText style={styles.errorText}>
          {t("buckets.form.bucketNotFound")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView>
      <ThemedView style={styles.container}>
        <Stack.Screen
          options={{
            title: t("buckets.form.editTitle", { name: bucket?.name! }),
            headerShown: true,
          }}
        />
        <View style={styles.content}>
          <CreateBucketForm bucketId={bucketId} />

          {canAdmin && (
            <View style={styles.sharingSection}>
              <BucketSharingSection bucketId={bucketId} />
              <IconButton
                title={t("buckets.form.deleteBucket")}
                iconName="delete"
                size="md"
                variant="danger"
                onPress={() => setShowDeleteModal(true)}
              />
            </View>
          )}
        </View>

        <BucketDeleteModal
          visible={showDeleteModal}
          bucket={bucket}
          onClose={() => setShowDeleteModal(false)}
          onBucketDeleted={onDeleteComplete}
          onSharingRevoked={onDeleteComplete}
        />
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 24,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  errorText: {
    fontSize: 16,
    color: Colors.light.error,
    textAlign: "center",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "700",
  },
  sharingSection: {
    marginTop: 16,
  },
});
