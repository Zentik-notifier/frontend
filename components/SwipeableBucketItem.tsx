import {
  BucketWithDevicesFragment,
  GetBucketsDocument,
  ResourceType,
  useDeleteBucketMutation,
  useUnshareBucketMutation,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import BucketIcon from "./BucketIcon";
import SwipeableItem from "./SwipeableItem";
import { Icon } from "react-native-paper";
import CopyButton from "./ui/CopyButton";
import { useNavigationUtils } from "@/utils/navigation";
import {
  Button,
  Card,
  Dialog,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

interface SwipeableBucketItemProps {
  bucket: BucketWithDevicesFragment;
  bucketDeleted: () => void;
  onSharingRevoked: () => void;
}

const SwipeableBucketItem: React.FC<SwipeableBucketItemProps> = ({
  bucket,
  bucketDeleted,
  onSharingRevoked,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { userId } = useAppContext();
  const { navigateToEditBucket } = useNavigationUtils();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  // Use the bucket permissions hook to check permissions
  const { canDelete, isSharedWithMe, sharedCount } = useGetBucketData(
    bucket.id
  );

  const [deleteBucketMutation] = useDeleteBucketMutation({
    onCompleted: () => {
      bucketDeleted();
    },
    onError: (error) => {
      console.error("Error deleting bucket:", error);
      Alert.alert(t("common.error"), t("buckets.delete.error"));
    },
    refetchQueries: [{ query: GetBucketsDocument }],
  });

  const [unshareBucket] = useUnshareBucketMutation({
    onCompleted: () => {
      onSharingRevoked();
    },
    onError: (error) => {
      console.error("Error unsharing bucket:", error);
      Alert.alert(t("common.error"), t("buckets.sharing.unshareError"));
    },
    refetchQueries: [{ query: GetBucketsDocument }],
  });

  const editBucket = (bucketId: string) => {
    navigateToEditBucket(bucketId, false);
  };

  const showDeleteAlert = () => {
    const actions = [];

    if (canDelete) {
      actions.push({
        text: t("buckets.delete.deleteBucket"),
        onPress: () => deleteBucketMutation({ variables: { id: bucket.id } }),
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

  const deleteAction =
    canDelete || isSharedWithMe
      ? {
          icon: "delete" as const,
          label: t("buckets.item.delete"),
          backgroundColor: "#ff4444",
          onPress: showDeleteAlert,
        }
      : undefined;

  // Device info removed

  const getSharedUsersText = () => {
    // Always show sharing count if I've shared with someone, regardless of ownership
    if (sharedCount === 0) {
      return isSharedWithMe ? null : t("buckets.item.notShared");
    } else if (sharedCount === 1) {
      return t("buckets.item.sharedWith", { count: sharedCount });
    } else {
      return t("buckets.item.sharedWithPlural", { count: sharedCount });
    }
  };

  return (
    <SwipeableItem
      rightAction={deleteAction}
      marginBottom={8}
      borderRadius={12}
    >
      <TouchableWithoutFeedback onPress={() => editBucket(bucket.id)}>
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <BucketIcon noRouting size="lg" bucketId={bucket.id} />
              <Text variant="titleMedium" style={styles.itemName}>
                {bucket.name}
              </Text>
            </View>
            <View style={styles.headerRight}>
              <CopyButton
                text={bucket.id}
                size={20}
                style={styles.copyIdButton}
              />
              {isSharedWithMe && (
                <View style={styles.sharedWithMeTag}>
                  <Text variant="bodySmall" style={styles.sharedWithMeText}>
                    {t("buckets.item.sharedWithMe")}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {/* Device info removed */}
          {getSharedUsersText() && (
            <Text variant="bodySmall" style={styles.sharingInfo}>
              👥 {getSharedUsersText()}
            </Text>
          )}
        </View>
      </TouchableWithoutFeedback>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
        >
          <Dialog.Title>{t("common.success")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{successMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSuccessDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    padding: 16,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  itemInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  headerRight: {
    alignItems: "flex-end",
    gap: 8,
  },
  copyIdButton: {
    margin: 0,
  },
  sharedWithMeTag: {
    backgroundColor: "#007AFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  sharedWithMeText: {
    color: "#fff",
    fontWeight: "600",
  },
  itemName: {
    // Styles handled by Text variant
  },
  sharingInfo: {
    opacity: 0.8,
    marginBottom: 4,
  },
});

export default SwipeableBucketItem;
