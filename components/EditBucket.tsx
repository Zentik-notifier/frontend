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
import {
  Button,
  Card,
  Icon,
  IconButton,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import { useNavigationUtils } from "@/utils/navigation";
import IdWithCopyButton from "./IdWithCopyButton";
import { useDateFormat } from "@/hooks/useDateFormat";
import CopyButton from "./ui/CopyButton";
import SnoozeSchedulesManager from "./SnoozeSchedulesManager";

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

      <View style={styles.magicCodeContainer}>
        <View style={styles.magicCodeRow}>
          <View style={styles.magicCodeLabelContainer}>
            <Icon source="key" size={20} color={theme.colors.primary} />
            <Text
              style={[styles.magicCodeLabel, { color: theme.colors.onSurface }]}
            >
              {t("buckets.form.magicCodeLabel")}:
            </Text>
          </View>
          <IconButton
            icon="refresh"
            size={18}
            onPress={() =>
              regenerateMagicCode({ variables: { bucketId: bucket.id } })
            }
            disabled={regeneratingMagicCode}
            loading={regeneratingMagicCode}
          />
        </View>
        <View style={styles.magicCodeValueContainer}>
          <Text
            style={[styles.magicCodeValue, { color: theme.colors.onSurface }]}
          >
            {magicCode ?? "-"}
          </Text>
          {magicCode && (
            <CopyButton text={magicCode} size={18} label={t("common.copy")} />
          )}
        </View>
        <Surface
          style={[
            styles.magicCodeWarning,
            { backgroundColor: theme.colors.errorContainer },
          ]}
        >
          <Icon
            source="alert"
            size={16}
            color={theme.colors.onErrorContainer}
          />
          <Text
            style={[
              styles.magicCodeWarningText,
              { color: theme.colors.onErrorContainer },
            ]}
          >
            {t("buckets.form.magicCodeWarning")}
          </Text>
        </Surface>
      </View>

      <SnoozeSchedulesManager bucketId={bucketId} disabled={offline} />

      {!isProtectedBucket && (
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
      )}

      {canAdmin && (
        <>
          <BucketAccessTokensSection
            bucketId={bucketId}
            bucketName={bucket?.name || ""}
            refetchTrigger={refetchTrigger}
          />
          <View style={styles.readonlyContainer} />

          <BucketSharingSection
            bucketId={bucketId}
            refetchTrigger={refetchTrigger}
          />

          <View style={styles.readonlyContainer} />

          <BucketInviteCodesSection
            bucketId={bucketId}
            bucketName={bucket?.name || ""}
            refetchTrigger={refetchTrigger}
          />
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
  magicCodeContainer: {
    marginTop: 12,
    marginBottom: 12,
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.02)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  magicCodeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  magicCodeLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  magicCodeLabel: {
    fontSize: 14,
    fontWeight: "600",
  },
  magicCodeValueContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  magicCodeValue: {
    fontSize: 16,
    fontFamily: "monospace",
    fontWeight: "600",
    flex: 1,
  },
  magicCodeWarning: {
    padding: 8,
    borderRadius: 6,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  magicCodeWarningText: {
    fontSize: 12,
    flex: 1,
  },
});
