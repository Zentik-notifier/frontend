import { Colors } from "@/constants/Colors";
import {
  BucketFullFragment,
  EntityPermissionFragment,
  GetBucketDocument,
  Permission,
  ResourceType,
  useShareBucketMutation,
  useUnshareBucketMutation,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import IdWithCopyButton from "./IdWithCopyButton";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface BucketSharingSectionProps {
  bucketId: string;
}

// Define permission levels
type PermissionLevel = "read" | "readwrite" | "admin";

const PERMISSION_LEVELS: {
  value: PermissionLevel;
  label: string;
  permissions: Permission[];
}[] = [
  {
    value: "read",
    label: "buckets.sharing.permission.read",
    permissions: [Permission.Read],
  },
  {
    value: "readwrite",
    label: "buckets.sharing.permission.readwrite",
    permissions: [Permission.Read, Permission.Write],
  },
  {
    value: "admin",
    label: "buckets.sharing.permission.admin",
    permissions: [
      Permission.Read,
      Permission.Write,
      Permission.Delete,
      Permission.Admin,
    ],
  },
];

interface ShareModalProps {
  visible: boolean;
  onClose: () => void;
  onShare: (identifier: string, permissions: Permission[]) => void;
  loading: boolean;
  editingPermission?: EntityPermissionFragment;
  onUpdate?: (permissions: Permission[]) => void;
}

const ShareModal: React.FC<ShareModalProps> = ({
  visible,
  onClose,
  onShare,
  loading,
  editingPermission,
  onUpdate,
}) => {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const [identifier, setIdentifier] = useState("");
  const [selectedPermissionLevel, setSelectedPermissionLevel] =
    useState<PermissionLevel>("read");

  const isEditing = !!editingPermission;

  const handleShare = () => {
    const selectedPermissions = PERMISSION_LEVELS.find(
      (level) => level.value === selectedPermissionLevel
    )?.permissions || [Permission.Read];

    if (isEditing) {
      if (onUpdate) {
        onUpdate(selectedPermissions);
      }
    } else {
      if (!identifier.trim()) {
        Alert.alert(t("common.error"), t("buckets.sharing.enterIdentifier"));
        return;
      }
      onShare(identifier.trim(), selectedPermissions);
    }
  };

  const reset = () => {
    setIdentifier("");
    setSelectedPermissionLevel("read");
  };

  // Initialize form with editing data
  useEffect(() => {
    if (isEditing && editingPermission) {
      // Find the matching permission level based on current permissions
      const currentLevel = PERMISSION_LEVELS.find(
        (level) =>
          level.permissions.length === editingPermission.permissions.length &&
          level.permissions.every((p) =>
            editingPermission.permissions.includes(p)
          )
      );
      setSelectedPermissionLevel(currentLevel?.value || "read");

      if (editingPermission.user?.username) {
        setIdentifier(editingPermission.user.username);
      } else if (editingPermission.user?.email) {
        setIdentifier(editingPermission.user.email);
      }
    } else {
      reset();
    }
  }, [isEditing, editingPermission]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <ThemedView
          style={[
            styles.modalContent,
            { backgroundColor: Colors[colorScheme].backgroundCard },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: Colors[colorScheme].border },
            ]}
          >
            <ThemedText style={styles.modalTitle}>
              {isEditing
                ? t("buckets.sharing.editTitle")
                : t("buckets.sharing.shareTitle")}
            </ThemedText>
            <TouchableOpacity onPress={onClose}>
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].textSecondary}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {!isEditing && (
              <>
                <ThemedText style={styles.label}>
                  {t("buckets.sharing.userIdentifier")}
                </ThemedText>
                <TextInput
                  style={[
                    styles.input,
                    {
                      backgroundColor: Colors[colorScheme].inputBackground,
                      borderColor: Colors[colorScheme].inputBorder,
                      color: Colors[colorScheme].text,
                    },
                  ]}
                  value={identifier}
                  onChangeText={setIdentifier}
                  placeholder={t("buckets.sharing.identifierPlaceholder")}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </>
            )}

            {isEditing && (
              <>
                <View style={styles.editingUserInfo}>
                  <ThemedText style={styles.editingUserLabel}>
                    {t("buckets.sharing.userIdentifier")}:
                  </ThemedText>
                  <ThemedText style={styles.editingUserValue}>
                    {identifier}
                  </ThemedText>
                </View>
                {editingPermission?.user?.id && (
                  <IdWithCopyButton
                    id={editingPermission.user.id}
                    label={t("buckets.sharing.userId")}
                    copyMessage={t("buckets.sharing.userIdCopied")}
                  />
                )}
              </>
            )}

            <ThemedText style={styles.label}>
              {t("buckets.sharing.permissions")}
            </ThemedText>
            <View style={styles.permissionsContainer}>
              {PERMISSION_LEVELS.map((level) => (
                <TouchableOpacity
                  key={level.value}
                  style={[
                    styles.permissionChip,
                    selectedPermissionLevel === level.value && [
                      {
                        backgroundColor: Colors[colorScheme].tint,
                        borderColor: Colors[colorScheme].tint,
                      },
                    ],
                  ]}
                  onPress={() => setSelectedPermissionLevel(level.value)}
                >
                  <Text
                    style={[
                      styles.permissionText,
                      { color: Colors[colorScheme].textSecondary },
                      selectedPermissionLevel === level.value && {
                        color: "#fff",
                      },
                    ]}
                  >
                    {t(level.label as any)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View
            style={[
              styles.modalFooter,
              { borderTopColor: Colors[colorScheme].border },
            ]}
          >
            <TouchableOpacity
              style={[
                styles.modalButton,
                {
                  backgroundColor: Colors[colorScheme].backgroundSecondary,
                  borderColor: Colors[colorScheme].border,
                  borderWidth: 1,
                },
              ]}
              onPress={() => {
                reset();
                onClose();
              }}
            >
              <Text
                style={[
                  styles.cancelButtonText,
                  { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {t("common.cancel")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.modalButton,
                { backgroundColor: Colors[colorScheme].tint },
              ]}
              onPress={handleShare}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={[styles.shareButtonText, { color: "#fff" }]}>
                  {isEditing
                    ? t("buckets.sharing.update")
                    : t("buckets.sharing.share")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </ThemedView>
      </View>
    </Modal>
  );
};

interface PermissionItemProps {
  permission: EntityPermissionFragment;
  onRevoke: (permission: EntityPermissionFragment) => void;
  onEdit: (permission: EntityPermissionFragment) => void;
  loading: boolean;
  bucket: BucketFullFragment;
}

const PermissionItem: React.FC<PermissionItemProps> = ({
  permission,
  onRevoke,
  onEdit,
  loading,
  bucket,
}) => {
  const { t } = useI18n();
  const colorScheme = useColorScheme();

  const getUserDisplayName = () => {
    if (permission.user?.username) return `@${permission.user.username}`;
    if (permission.user?.email) return permission.user.email;
    return t("buckets.sharing.unknownUser");
  };

  const getPermissionsText = () => {
    return permission.permissions
      .map((p) => {
        switch (p.toLowerCase()) {
          case "read":
            return t("buckets.sharing.permission.read");
          case "write":
            return t("buckets.sharing.permission.write");
          case "delete":
            return t("buckets.sharing.permission.delete");
          case "admin":
            return t("buckets.sharing.permission.admin");
          default:
            return p;
        }
      })
      .join(", ");
  };

  const getExpirationText = () => {
    if (!permission.expiresAt) return null;
    const date = new Date(permission.expiresAt);
    return t("buckets.sharing.expiresAt", { date: date.toLocaleDateString() });
  };

  const getGrantedByText = () => {
    if (!permission.grantedBy) {
      // If grantedBy is null, it was granted by the bucket owner
      const bucketOwner = bucket?.user;
      if (bucketOwner) {
        let ownerDisplayName = "";
        if (bucketOwner.username) {
          ownerDisplayName = `@${bucketOwner.username}`;
        } else if (bucketOwner.email) {
          ownerDisplayName = bucketOwner.email;
        } else {
          return "Granted by owner";
        }
        return `Granted by ${ownerDisplayName} (owner)`;
      }
      return "Granted by owner";
    }

    let displayName = "";
    if (permission.grantedBy.username) {
      displayName = `@${permission.grantedBy.username}`;
    } else if (permission.grantedBy.email) {
      displayName = permission.grantedBy.email;
    } else {
      return null;
    }

    // Check if the grantor is the bucket owner
    const isOwner = bucket?.user?.id === permission.grantedBy.id;
    return `Granted by ${displayName}${isOwner ? " (owner)" : ""}`;
  };

  return (
    <View
      style={[
        styles.permissionItem,
        { backgroundColor: Colors[colorScheme].backgroundCard },
      ]}
    >
      <View style={styles.permissionInfo}>
        <ThemedText style={styles.permissionUser}>
          {getUserDisplayName()}
        </ThemedText>
        <ThemedText style={styles.permissionDetails}>
          {getPermissionsText()}
        </ThemedText>
        {getExpirationText() && (
          <ThemedText style={styles.permissionExpiry}>
            {getExpirationText()}
          </ThemedText>
        )}
        {getGrantedByText() && (
          <ThemedText
            style={[
              styles.permissionGrantedBy,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {getGrantedByText()}
          </ThemedText>
        )}
      </View>
      <View style={styles.permissionActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => onEdit(permission)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
          ) : (
            <Ionicons
              name="pencil"
              size={18}
              color={Colors[colorScheme].tint}
            />
          )}
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.revokeButton}
          onPress={() => onRevoke(permission)}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={Colors[colorScheme].error} />
          ) : (
            <Ionicons
              name="person-remove"
              size={20}
              color={Colors[colorScheme].error}
            />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
};

const BucketSharingSection: React.FC<BucketSharingSectionProps> = ({
  bucketId,
}) => {
  const { t } = useI18n();
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<EntityPermissionFragment | null>(null);

  // Check if current user has admin permissions
  const { canAdmin, refetch, allPermissions, loading, bucket } =
    useGetBucketData(bucketId);

  const [shareBucket, { loading: sharingBucket }] = useShareBucketMutation({
    onCompleted: (data) => {
      setShowShareModal(false);
      setEditingPermission(null);
      // refetch?.();

      // // Update Apollo cache immediately for better UX
      // apolloClient.cache.modify({
      //   id: apolloClient.cache.identify({ __typename: "Bucket", id: bucketId }),
      //   fields: {
      //     permissions(existingPermissions = []) {
      //       return [...existingPermissions, data.shareBucket];
      //     },
      //   },
      // });

      // Alert.alert(t("common.success"), t("buckets.sharing.shareSuccess"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.message || t("buckets.sharing.shareError")
      );
    },
    refetchQueries: [
      {
        query: GetBucketDocument,
        variables: { id: bucketId },
      },
    ],
  });

  const [unshareBucket, { loading: unsharingBucket }] =
    useUnshareBucketMutation({
      onCompleted: () => {
        refetch?.();
        Alert.alert(t("common.success"), t("buckets.sharing.unshareSuccess"));
      },
      onError: (error: any) => {
        Alert.alert(
          t("common.error"),
          error.message || t("buckets.sharing.unshareError")
        );
      },
      refetchQueries: [
        {
          query: GetBucketDocument,
          variables: { id: bucketId },
        },
      ],
    });

  const handleShare = (identifier: string, permissions: Permission[]) => {
    // Determine if identifier is email, username, or userId
    const isEmail = identifier.includes("@");
    const isUserId = identifier.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    shareBucket({
      variables: {
        input: {
          resourceType: ResourceType.Bucket,
          resourceId: bucketId,
          permissions,
          userId: isUserId ? identifier : undefined,
          userEmail: isEmail && !isUserId ? identifier : undefined,
          username: !isEmail && !isUserId ? identifier : undefined,
        },
      },
    });
  };

  const handleEdit = (permission: EntityPermissionFragment) => {
    setEditingPermission(permission);
    setShowShareModal(true);
  };

  const handleUpdate = (permissions: Permission[]) => {
    if (!editingPermission) return;

    shareBucket({
      variables: {
        input: {
          resourceType: ResourceType.Bucket,
          resourceId: bucketId,
          permissions,
          userId: editingPermission.user?.id,
        },
      },
    });
  };

  const handleRevoke = (permission: EntityPermissionFragment) => {
    Alert.alert(
      t("buckets.sharing.confirmRevoke"),
      t("buckets.sharing.confirmRevokeMessage", {
        user:
          permission.user?.username ||
          permission.user?.email ||
          t("buckets.sharing.unknownUser"),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("buckets.sharing.revoke"),
          style: "destructive",
          onPress: () => {
            unshareBucket({
              variables: {
                input: {
                  resourceType: ResourceType.Bucket,
                  resourceId: bucketId,
                  userId: permission.user?.id,
                },
              },
            });
          },
        },
      ]
    );
  };

  const handleCloseModal = () => {
    setShowShareModal(false);
    setEditingPermission(null);
  };

  if (!canAdmin) {
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("buckets.sharing.title")}
        </ThemedText>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowShareModal(true)}
        >
          <Ionicons name="person-add" size={20} color="#007AFF" />
        </TouchableOpacity>
      </View>

      <ThemedText style={styles.description}>
        {t("buckets.sharing.description")}
      </ThemedText>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <ThemedText style={styles.loadingText}>
            {t("buckets.sharing.loading")}
          </ThemedText>
        </View>
      ) : allPermissions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ThemedText style={styles.emptyText}>
            {t("buckets.sharing.noShares")}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={allPermissions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PermissionItem
              bucket={bucket!}
              permission={item}
              onRevoke={handleRevoke}
              onEdit={handleEdit}
              loading={unsharingBucket || sharingBucket}
            />
          )}
          scrollEnabled={false}
        />
      )}

      <ShareModal
        visible={showShareModal}
        onClose={handleCloseModal}
        onShare={handleShare}
        onUpdate={handleUpdate}
        editingPermission={editingPermission || undefined}
        loading={sharingBucket}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    padding: 8,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
    lineHeight: 20,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginLeft: 8,
    opacity: 0.7,
  },
  emptyContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  emptyText: {
    opacity: 0.7,
    fontStyle: "italic",
  },
  permissionItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#f8f9fa",
    borderRadius: 8,
    marginBottom: 8,
  },
  permissionInfo: {
    flex: 1,
  },
  permissionUser: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  permissionDetails: {
    fontSize: 14,
    opacity: 0.7,
  },
  permissionExpiry: {
    fontSize: 12,
    opacity: 0.5,
    marginTop: 2,
  },
  permissionGrantedBy: {
    fontSize: 12,
    opacity: 0.6,
    marginTop: 2,
    fontStyle: "italic",
    color: "#6c757d",
  },
  permissionActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  editButton: {
    padding: 8,
  },
  revokeButton: {
    padding: 8,
  },
  editingUserInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    padding: 12,
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
  },
  editingUserLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  editingUserValue: {
    fontSize: 14,
    color: "#007AFF",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "90%",
    maxWidth: 400,
    borderRadius: 12,
    padding: 0,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e1e1",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalBody: {
    padding: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
    backgroundColor: "#fff",
  },
  permissionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  permissionChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    backgroundColor: "#fff",
  },
  permissionChipSelected: {
    backgroundColor: "#007AFF",
    borderColor: "#007AFF",
  },
  permissionText: {
    fontSize: 14,
    color: "#666",
  },
  permissionTextSelected: {
    color: "#fff",
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#e1e1e1",
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButton: {
    backgroundColor: "#f8f9fa",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  cancelButtonText: {
    color: "#666",
    fontWeight: "500",
  },
  shareButton: {
    backgroundColor: "#007AFF",
  },
  shareButtonText: {
    color: "#fff",
    fontWeight: "500",
  },
});

export default BucketSharingSection;
