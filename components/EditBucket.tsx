import BucketDeleteModal from "@/components/BucketDeleteModal";
import BucketSharingSection from "@/components/BucketSharingSection";
import CreateBucketForm from "@/components/CreateBucketForm";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Card,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";

interface EditBucketProps {
  bucketId: string;
  onBack?: () => void;
}

export default function EditBucket({ bucketId, onBack }: EditBucketProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const { bucket, loading, error, canAdmin } = useGetBucketData(bucketId);

  if (!bucketId) {
    return (
      <Surface style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {t("buckets.form.noBucketId")}
        </Text>
      </Surface>
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
      <Surface style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.loadingText}>
            {t("common.loading")}
          </Text>
        </View>
      </Surface>
    );
  }

  if (!bucket) {
    return (
      <Surface style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {t("buckets.form.bucketNotFound")}
        </Text>
      </Surface>
    );
  }

  return (
    <ScrollView>
      <Surface style={styles.container}>
        <View style={styles.content}>
          <CreateBucketForm bucketId={bucketId} />

          {canAdmin && (
            <Card style={styles.sharingSection}>
              <Card.Content>
                <BucketSharingSection bucketId={bucketId} />
                <Button
                  mode="contained"
                  buttonColor={theme.colors.error}
                  textColor={theme.colors.onError}
                  icon="delete"
                  onPress={() => setShowDeleteModal(true)}
                  style={styles.deleteButton}
                >
                  {t("buckets.form.deleteBucket")}
                </Button>
              </Card.Content>
            </Card>
          )}
        </View>

        <BucketDeleteModal
          visible={showDeleteModal}
          bucket={bucket}
          onClose={() => setShowDeleteModal(false)}
          onBucketDeleted={onDeleteComplete}
          onSharingRevoked={onDeleteComplete}
        />
      </Surface>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    gap: 24,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
    gap: 16,
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
    textAlign: "center",
  },
  sharingSection: {
    marginTop: 16,
  },
  deleteButton: {
    marginTop: 16,
  },
});
