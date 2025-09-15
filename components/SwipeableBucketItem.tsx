import { Colors } from "@/constants/Colors";
import { BucketWithDevicesFragment } from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import * as Clipboard from 'expo-clipboard';
import React, { useState } from "react";
import { Alert, StyleSheet, TouchableOpacity, TouchableWithoutFeedback, View } from "react-native";
import BucketDeleteModal from "./BucketDeleteModal";
import BucketIcon from "./BucketIcon";
import SwipeableItem from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

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
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const router = useRouter();

  // Use the bucket permissions hook to check permissions
  const { canDelete, isSharedWithMe, sharedCount } = useGetBucketData(
    bucket.id
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const editBucket = (bucketId: string) => {
    router.push(`/(mobile)/private/edit-bucket?bucketId=${bucketId}`);
  };

  const copyBucketId = async () => {
    if (bucket.id && bucket.id !== "N/A") {
      await Clipboard.setStringAsync(bucket.id);
      Alert.alert("Copied!", t("buckets.item.bucketIdCopied"));
    }
  };

  const deleteAction =
    canDelete || isSharedWithMe
      ? {
          icon: "delete" as const,
          label: t("buckets.item.delete"),
          backgroundColor: "#ff4444",
          onPress: () => setShowDeleteModal(true),
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
        <ThemedView
          style={[
            styles.itemCard,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
            },
          ]}
        >
          <View style={styles.itemHeader}>
            <View style={styles.itemInfo}>
              <BucketIcon size="lg" bucketId={bucket.id} />
              <ThemedText style={styles.itemName}>{bucket.name}</ThemedText>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity
                style={[
                  styles.copyIdButton,
                  { backgroundColor: Colors[colorScheme ?? "light"].backgroundSecondary }
                ]}
                onPress={copyBucketId}
                activeOpacity={0.7}
              >
                <Icon name="copy" size="sm" color={Colors[colorScheme ?? "light"].tabIconDefault} />
              </TouchableOpacity>
              {isSharedWithMe && (
                <View style={styles.sharedWithMeTag}>
                  <ThemedText style={styles.sharedWithMeText}>
                    {t("buckets.item.sharedWithMe")}
                  </ThemedText>
                </View>
              )}
            </View>
          </View>
          {/* Device info removed */}
          {getSharedUsersText() && (
            <ThemedText style={styles.sharingInfo}>
              👥 {getSharedUsersText()}
            </ThemedText>
          )}
        </ThemedView>
      </TouchableWithoutFeedback>

      <BucketDeleteModal
        visible={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        bucket={bucket}
        onBucketDeleted={() => {
          bucketDeleted();
          setShowDeleteModal(false);
        }}
        onSharingRevoked={() => {
          onSharingRevoked();
          setShowDeleteModal(false);
        }}
      />
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  itemCard: {
    padding: 16,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    padding: 6,
    borderRadius: 6,
    flexShrink: 0,
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
    fontSize: 10,
    fontWeight: "600",
  },
  itemName: {
    fontSize: 16,
    fontWeight: "600",
  },
  sharingInfo: {
    fontSize: 13,
    opacity: 0.8,
    marginBottom: 4,
    color: "#666",
  },
});

export default SwipeableBucketItem;
