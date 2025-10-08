import BucketSharingSection from "@/components/BucketSharingSection";
import CreateBucketForm from "@/components/CreateBucketForm";
import { useAppContext } from "@/contexts/AppContext";
import {
  GetBucketsDocument,
  ResourceType,
  useUnshareBucketMutation,
} from "@/generated/gql-operations-generated";
import { useBucket, useRefreshBucket, useDeleteBucketWithNotifications } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Card, Surface, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import { useNavigationUtils } from "@/utils/navigation";
import IdWithCopyButton from "./IdWithCopyButton";
import { useDateFormat } from "@/hooks/useDateFormat";

interface EditBucketProps {
  bucketId: string;
  onBack?: () => void;
}

export default function EditBucket({ bucketId, onBack }: EditBucketProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const { userId } = useAppContext();
  const { navigateToHome } = useNavigationUtils();
  const { formatDate } = useDateFormat();

  const {
    bucket,
    loading,
    error,
    canAdmin,
    canDelete,
    isSharedWithMe,
  } = useBucket(bucketId);
  const refreshBucket = useRefreshBucket();

  const handleRefresh = async () => {
    await refreshBucket(bucketId).catch(console.error);
  };

  const { deleteBucketWithNotifications, loading: deleteLoading } =
    useDeleteBucketWithNotifications({
      onCompleted: () => {
        navigateToHome();
      },
      onError: (error) => {
        console.error("Error deleting bucket:", error);
        Alert.alert(t("common.error"), t("buckets.delete.error"));
      },
    });

  const [unshareBucket] = useUnshareBucketMutation({
    onCompleted: () => {
      onBack?.();
    },
    onError: (error) => {
      console.error("Error unsharing bucket:", error);
      Alert.alert(t("common.error"), t("buckets.sharing.unshareError"));
    },
    refetchQueries: [{ query: GetBucketsDocument }],
  });

  const showDeleteAlert = () => {
    if (!bucket) return;

    const actions = [];

    if (canDelete) {
      actions.push({
        text: t("buckets.delete.deleteBucket"),
        onPress: () => deleteBucketWithNotifications(bucket.id),
        style: "destructive" as const,
      });
    }

    if (isSharedWithMe) {
      actions.push({
        text: t("buckets.delete.revokeSharing"),
        onPress: () =>
          unshareBucket({
            variables: {
              input: {
                resourceType: ResourceType.Bucket,
                resourceId: bucket.id,
                userId: userId,
              },
            },
          }),
        style: "destructive" as const,
      });
    }

    actions.push({
      text: t("common.cancel"),
      style: "cancel" as const,
    });

    Alert.alert(
      t("buckets.delete.modalTitle"),
      t("buckets.delete.modalDescription", { bucketName: bucket.name }),
      actions
    );
  };

  if (!bucketId) {
    return (
      <Surface style={styles.errorContainer}>
        <Text style={[styles.errorText, { color: theme.colors.error }]}>
          {t("buckets.form.noBucketId")}
        </Text>
      </Surface>
    );
  }

  if (error) {
    console.error("Error loading bucket:", error);
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
    <PaperScrollView onRefresh={handleRefresh} loading={loading}>
      <CreateBucketForm bucketId={bucketId} />

      <Card style={styles.readonlyContainer}>
        <Card.Content>
          <IdWithCopyButton
            id={bucket.id}
            label={t("buckets.form.bucketId")}
            copyMessage={t("buckets.form.bucketIdCopied")}
            valueStyle={styles.readonlyValue}
          />
          <View style={styles.readonlyField}>
            <Text style={styles.readonlyLabel}>
              {t("buckets.item.created")}:
            </Text>
            <Text style={styles.readonlyValue}>
              {formatDate(bucket.createdAt)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {canAdmin && (
        <>
          <BucketSharingSection bucketId={bucketId} />
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            icon="delete"
            onPress={showDeleteAlert}
            style={styles.deleteButton}
          >
            {t("buckets.form.deleteBucket")}
          </Button>
        </>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  readonlyContainer: {
    marginBottom: 16,
  },
  readonlyValue: {
    fontSize: 14,
    fontFamily: "monospace",
  },
  readonlyField: {
    marginBottom: 10,
  },
  readonlyLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 4,
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
