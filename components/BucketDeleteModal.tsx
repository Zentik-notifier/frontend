import { Colors } from "@/constants/Colors";
import {
  GetBucketsDocument,
  ResourceType,
  useDeleteBucketMutation,
  useUnshareBucketMutation,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/contexts/AppContext";
import React, { useState } from "react";
import { Alert, Modal, StyleSheet, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Icon } from "./ui";
import { Button } from "./ui/Button";

interface BucketDeleteModalProps {
  visible: boolean;
  onClose: () => void;
  bucket: {
    id: string;
    name: string;
    user?: { id: string };
  };
  onBucketDeleted: () => void;
  onSharingRevoked: () => void;
}

export default function BucketDeleteModal({
  visible,
  onClose,
  bucket,
  onBucketDeleted,
  onSharingRevoked,
}: BucketDeleteModalProps) {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { userId } = useAppContext();
  const { canDelete, isSharedWithMe, isOwner } = useGetBucketData(
    bucket.id
  );

  const [deleteBucketMutation] = useDeleteBucketMutation({
    onCompleted: () => {
      console.log("Bucket deleted successfully");
      onBucketDeleted();
    },
    onError: (error) => {
      console.error("Error deleting bucket:", error);
    },
    refetchQueries: [{ query: GetBucketsDocument }],
  });

  const [unshareBucket] = useUnshareBucketMutation({
    onCompleted: () => {
      onSharingRevoked();
      onClose();
    },
    onError: (error) => {
      console.error("Error unsharing bucket:", error);
      Alert.alert(t("common.error"), t("buckets.sharing.unshareError"));
    },
    refetchQueries: [{ query: GetBucketsDocument }],
  });

  const [confirmStep, setConfirmStep] = useState<
    "initial" | "deleteBucket" | "revokeSharing"
  >("initial");

  const handleDeleteBucket = () => {
    if (isOwner || canDelete) {
      setConfirmStep("deleteBucket");
    }
  };

  const handleRevokeSharing = () => {
    if (isSharedWithMe) {
      setConfirmStep("revokeSharing");
    }
  };

  const confirmDeleteBucket = async () => {
    // Execute delete directly on confirm step
    await deleteBucketMutation({ variables: { id: bucket.id } });
    onClose();
  };

  const confirmRevokeSharing = () => {
    unshareBucket({
      variables: {
        input: {
          resourceType: ResourceType.Bucket,
          resourceId: bucket.id,
          userId: userId,
        },
      },
    });
  };

  const resetModal = () => {
    setConfirmStep("initial");
    onClose();
  };

  const renderInitialView = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Icon name="delete" size="lg" color="error" />
        <ThemedText style={styles.title}>
          {t("buckets.delete.modalTitle")}
        </ThemedText>
      </View>

      <ThemedText style={styles.description}>
        {t("buckets.delete.modalDescription", { bucketName: bucket.name })}
      </ThemedText>

      <View style={styles.actions}>
        {canDelete && (
          <Button
            title={
              isOwner
                ? t("buckets.delete.deleteBucket")
                : t("buckets.delete.deleteBucketWithPermission")
            }
            onPress={handleDeleteBucket}
            variant="destructive"
            style={styles.actionButton}
          />
        )}

        {isSharedWithMe && (
          <Button
            title={t("buckets.delete.revokeSharing")}
            onPress={handleRevokeSharing}
            variant="destructive"
            style={styles.actionButton}
          />
        )}

        <Button
          title={t("common.cancel")}
          onPress={resetModal}
          variant="outline"
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const renderDeleteBucketView = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Icon name="delete" size="lg" color="error" />
        <ThemedText style={styles.title}>
          {t("buckets.delete.confirmDeleteTitle")}
        </ThemedText>
      </View>

      <ThemedText style={styles.description}>
        {t("buckets.delete.confirmDeleteMessage", { bucketName: bucket.name })}
      </ThemedText>

      <View style={styles.actions}>
        <Button
          title={t("buckets.delete.confirm")}
          onPress={confirmDeleteBucket}
          variant="destructive"
          style={styles.actionButton}
        />
        <Button
          title={t("common.back")}
          onPress={() => setConfirmStep("initial")}
          variant="outline"
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const renderRevokeSharingView = () => (
    <View style={styles.content}>
      <View style={styles.header}>
        <Icon name="share" size="lg" color="warning" />
        <ThemedText style={styles.title}>
          {t("buckets.delete.confirmRevokeTitle")}
        </ThemedText>
      </View>

      <ThemedText style={styles.description}>
        {t("buckets.delete.confirmRevokeMessage", { bucketName: bucket.name })}
      </ThemedText>

      <View style={styles.actions}>
        <Button
          title={t("buckets.sharing.revoke")}
          onPress={confirmRevokeSharing}
          variant="destructive"
          style={styles.actionButton}
        />
        <Button
          title={t("common.back")}
          onPress={() => setConfirmStep("initial")}
          variant="outline"
          style={styles.actionButton}
        />
      </View>
    </View>
  );

  const renderContent = () => {
    switch (confirmStep) {
      case "deleteBucket":
        return renderDeleteBucketView();
      case "revokeSharing":
        return renderRevokeSharingView();
      default:
        return renderInitialView();
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={resetModal}
    >
      <View style={styles.overlay}>
        <ThemedView
          style={[
            styles.modal,
            { backgroundColor: Colors[colorScheme].backgroundCard },
          ]}
        >
          {renderContent()}
        </ThemedView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 16,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    alignItems: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    marginTop: 12,
  },
  description: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 24,
    lineHeight: 22,
  },
  actions: {
    width: "100%",
    gap: 12,
  },
  actionButton: {
    width: "100%",
  },
});
