import BucketAccessTokensSection from "@/components/BucketAccessTokensSection";
import BucketSharingSection from "@/components/BucketSharingSection";
import BucketInviteCodesSection from "@/components/BucketInviteCodesSection";
import CreateBucketForm from "@/components/CreateBucketForm";
import { useAppContext } from "@/contexts/AppContext";
import {
  GetBucketsDocument,
  ResourceType,
  useUnshareBucketMutation,
  useRegenerateMagicCodeMutation,
} from "@/generated/gql-operations-generated";
import {
  useBucket,
  useRefreshBucket,
  useDeleteBucketWithNotifications,
} from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Surface, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import { useNavigationUtils } from "@/utils/navigation";
import { useDateFormat } from "@/hooks/useDateFormat";
import SnoozeSchedulesManager from "./SnoozeSchedulesManager";
import MagicCodeSection from "./MagicCodeSection";
import BucketInfoSection from "./BucketInfoSection";

interface EditBucketProps {
  bucketId: string;
  onBack?: () => void;
}

export default function EditBucket({ bucketId, onBack }: EditBucketProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    userId,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const offline = isOfflineAuth || isBackendUnreachable;
  const { navigateToHome, navigateToBuckets } = useNavigationUtils();
  const { formatDate } = useDateFormat();
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  const { bucket, loading, error, canAdmin, canDelete, isSharedWithMe } =
    useBucket(bucketId, { autoFetch: true, userId: userId ?? undefined });
  const refreshBucket = useRefreshBucket();
  const magicCode = bucket?.userBucket?.magicCode;

  const isProtectedBucket = bucket?.isPublic || bucket?.isAdmin;
  const handleRefresh = async () => {
    await refreshBucket(bucketId).catch(console.error);
    setRefetchTrigger((prev) => prev + 1);
  };

  const { deleteBucket } = useDeleteBucketWithNotifications({
    onSuccess: () => {
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

  const [regenerateMagicCode, { loading: regeneratingMagicCode }] =
    useRegenerateMagicCodeMutation({
      onCompleted: () => {
        handleRefresh();
      },
      onError: (error) => {
        console.error("Error regenerating magic code:", error);
        Alert.alert(
          t("common.error"),
          t("buckets.form.magicCodeRegenerateError")
        );
      },
    });

  const showDeleteAlert = () => {
    if (!bucket) return;

    const actions = [];

    if (canDelete) {
      actions.push({
        text: t("buckets.delete.deleteBucket"),
        onPress: () => deleteBucket(bucket.id),
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

  if (!bucket && !loading) {
    navigateToBuckets();
  }

  if (error) {
    console.error("Error loading bucket:", error);
  }

  if (!bucket) {
    navigateToBuckets();
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

      {!isProtectedBucket && (
        <MagicCodeSection
          bucketId={bucket.id}
          magicCode={magicCode}
          onRegenerate={() =>
            regenerateMagicCode({ variables: { bucketId: bucket.id } })
          }
          regenerating={regeneratingMagicCode}
        />
      )}

      <SnoozeSchedulesManager bucketId={bucketId} disabled={offline} />

      {canAdmin && (
        <>
          <BucketAccessTokensSection
            bucketId={bucketId}
            bucketName={bucket?.name || ""}
            refetchTrigger={refetchTrigger}
          />

          <BucketSharingSection
            bucketId={bucketId}
            refetchTrigger={refetchTrigger}
          />

          <BucketInviteCodesSection
            bucketId={bucketId}
            bucketName={bucket?.name || ""}
            refetchTrigger={refetchTrigger}
          />
        </>
      )}

      {!isProtectedBucket && (
        <BucketInfoSection
          bucketId={bucket.id}
          createdAt={bucket.createdAt}
          formatDate={formatDate}
        />
      )}

      {canAdmin && (
        <>
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
  deleteButton: {
    marginTop: 16,
  },
});
