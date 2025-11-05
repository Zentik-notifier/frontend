import { useAppContext } from "@/contexts/AppContext";
import {
  GetBucketsDocument,
  ResourceType,
  useUnshareBucketMutation,
} from "@/generated/gql-operations-generated";
import {
  BucketWithStats,
  useBucket,
  useDeleteBucketWithNotifications,
} from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useMemo } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import * as Clipboard from "expo-clipboard";
import BucketIcon from "./BucketIcon";
import SwipeableItem, { MenuItem } from "./SwipeableItem";

interface SwipeableBucketItemProps {
  bucket: BucketWithStats;
  bucketDeleted: () => void;
  onSharingRevoked: () => void;
}

const SwipeableBucketItem: React.FC<SwipeableBucketItemProps> = ({
  bucket,
  bucketDeleted,
  onSharingRevoked,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const {
    userId,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const { navigateToEditBucket } = useNavigationUtils();

  // Use the bucket permissions hook to check permissions
  const { canDelete, isSharedWithMe, allPermissions } = useBucket(bucket.id, {
    userId: userId ?? undefined,
    autoFetch: true,
  });
  const sharedCount = allPermissions.filter(
    (permission) => permission.user?.id !== userId
  ).length;

  const { deleteBucket } = useDeleteBucketWithNotifications({
    onSuccess: () => {
      bucketDeleted();
    },
    onError: (error) => {
      console.error("Error deleting bucket:", error);
      Alert.alert(t("common.error"), t("buckets.delete.error"));
    },
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

  const copyMagicCode = async () => {
    if (bucket.userBucket?.magicCode) {
      await Clipboard.setStringAsync(bucket.userBucket.magicCode);
    }
  };

  const handleDeletePress = async () => {
    if (canDelete) {
      await deleteBucket(bucket.id);
    } else if (isSharedWithMe) {
      await unshareBucket({
        variables: {
          input: {
            resourceType: ResourceType.Bucket,
            resourceId: bucket.id,
            userId: userId,
          },
        },
      });
    }
  };

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = [];

    items.push({
      id: "edit",
      label: t("webhooks.edit"),
      icon: "pencil",
      onPress: () => editBucket(bucket.id),
    });

    // Add magic code copy option if magic code exists
    if (bucket.userBucket?.magicCode) {
      items.push({
        id: "copyMagicCode",
        label: `${t("common.copy")} Magic Code`,
        icon: "content-copy",
        onPress: copyMagicCode,
      });
    }

    return items;
  }, [
    t,
    bucket.id,
    bucket.name,
    bucket.userBucket?.magicCode,
    editBucket,
    copyMagicCode,
    canDelete,
    isSharedWithMe,
    handleDeletePress,
    theme,
  ]);

  const getSharedUsersText = () => {
    if (sharedCount === 0) {
      return null;
    } else if (sharedCount === 1) {
      return t("buckets.item.sharedWith", { count: sharedCount });
    } else {
      return t("buckets.item.sharedWithPlural", { count: sharedCount });
    }
  };

  return (
    <SwipeableItem
      copyId={bucket.id}
      menuItems={menuItems}
      showMenu={true}
      rightAction={
        false &&
        !(isOfflineAuth || isBackendUnreachable) &&
        (canDelete || isSharedWithMe)
          ? {
              icon: "delete",
              label: t("buckets.item.delete"),
              destructive: true,
              onPress: handleDeletePress,
              showAlert: {
                title: t("buckets.delete.modalTitle"),
                message: t("buckets.delete.modalDescription", {
                  bucketName: bucket.name,
                }),
                confirmText: canDelete
                  ? t("buckets.delete.deleteBucket")
                  : t("buckets.delete.revokeSharing"),
                cancelText: t("common.cancel"),
              },
            }
          : undefined
      }
    >
      <Pressable onPress={() => editBucket(bucket.id)}>
        <View style={styles.itemCard}>
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <BucketIcon
                noRouting
                size="lg"
                bucketId={bucket.id}
                userId={userId}
              />
              <Text variant="titleMedium" style={styles.itemName}>
                {bucket.name}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isSharedWithMe && (
                <View style={styles.sharedWithMeTag}>
                  <Text variant="bodySmall" style={styles.sharedWithMeText}>
                    {t("buckets.item.sharedWithMe")}
                  </Text>
                </View>
              )}
            </View>
          </View>
          {getSharedUsersText() && (
            <Text variant="bodySmall" style={styles.sharingInfo}>
              👥 {getSharedUsersText()}
            </Text>
          )}
        </View>
      </Pressable>
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
