import {
  BucketFullFragment,
  EntityPermissionFragment,
  GetBucketDocument,
  Permission,
  ResourceType,
  useShareBucketMutation,
  useUnshareBucketMutation,
  UserRole,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import {
  Button,
  Card,
  Icon,
  IconButton,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import IdWithCopyButton from "./IdWithCopyButton";

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
  const theme = useTheme();
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

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  } as const;

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onClose}
        contentContainerStyle={containerStyle}
        dismissableBackButton
      >
        <View
          style={[
            styles.modalHeader,
            {
              borderBottomColor: theme.colors.outline,
              backgroundColor: "transparent",
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Icon source="share" size={24} color={theme.colors.primary} />
            <Text style={styles.modalTitle}>
              {isEditing
                ? t("buckets.sharing.editTitle")
                : t("buckets.sharing.shareTitle")}
            </Text>
          </View>
          <TouchableRipple
            style={[styles.closeButton]}
            onPress={onClose}
            borderless
          >
            <Icon source="close" size={20} color={theme.colors.onSurface} />
          </TouchableRipple>
        </View>

        <View
          style={{
            padding: 20,
          }}
        >
          {!isEditing && (
            <>
              <Text variant="titleSmall" style={styles.label}>
                {t("buckets.sharing.userIdentifier")}
              </Text>
              <TextInput
                style={styles.input}
                value={identifier}
                onChangeText={setIdentifier}
                placeholder={t("buckets.sharing.identifierPlaceholder")}
                autoCapitalize="none"
                keyboardType="email-address"
                mode="outlined"
              />
            </>
          )}

          {isEditing && (
            <>
              <View
                style={[
                  styles.editingUserInfo,
                  { backgroundColor: theme.colors.surfaceVariant },
                ]}
              >
                <Text variant="titleSmall" style={styles.editingUserLabel}>
                  {t("buckets.sharing.userIdentifier")}:
                </Text>
                <Text
                  style={[
                    styles.editingUserValue,
                    { color: theme.colors.primary },
                  ]}
                >
                  {identifier}
                </Text>
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

          <Text variant="titleSmall" style={styles.label}>
            {t("buckets.sharing.permissions")}
          </Text>
          <View style={styles.permissionsContainer}>
            {PERMISSION_LEVELS.map((level) => (
              <TouchableOpacity
                key={level.value}
                style={[
                  styles.permissionChip,
                  { borderColor: theme.colors.outline },
                  selectedPermissionLevel === level.value && [
                    {
                      backgroundColor: theme.colors.primary,
                      borderColor: theme.colors.primary,
                    },
                  ],
                ]}
                onPress={() => setSelectedPermissionLevel(level.value)}
              >
                <Text
                  style={[
                    styles.permissionText,
                    { color: theme.colors.onSurfaceVariant },
                    selectedPermissionLevel === level.value && {
                      color: theme.colors.onPrimary,
                    },
                  ]}
                >
                  {t(level.label as any)}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.modalFooter}>
          <Button
            mode="outlined"
            onPress={() => {
              reset();
              onClose();
            }}
            style={styles.footerButton}
          >
            {t("common.cancel")}
          </Button>
          <Button
            mode="contained"
            onPress={handleShare}
            disabled={loading}
            loading={loading}
            style={styles.footerButton}
          >
            {isEditing
              ? t("buckets.sharing.update")
              : t("buckets.sharing.share")}
          </Button>
        </View>
      </Modal>
    </Portal>
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
  const theme = useTheme();

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
    <Card style={styles.permissionItem}>
      <Card.Content>
        <View style={styles.permissionInfo}>
          <Text variant="titleSmall" style={styles.permissionUser}>
            {getUserDisplayName()}
          </Text>
          <Text variant="bodyMedium" style={styles.permissionDetails}>
            {getPermissionsText()}
          </Text>
          {getExpirationText() && (
            <Text variant="bodySmall" style={styles.permissionExpiry}>
              {getExpirationText()}
            </Text>
          )}
          {getGrantedByText() && (
            <Text
              variant="bodySmall"
              style={[
                styles.permissionGrantedBy,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {getGrantedByText()}
            </Text>
          )}
        </View>
        <View style={styles.permissionActions}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => onEdit(permission)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Icon source="pencil" size={18} color={theme.colors.primary} />
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.revokeButton}
            onPress={() => onRevoke(permission)}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={theme.colors.error} />
            ) : (
              <Icon
                source="account-remove"
                size={20}
                color={theme.colors.error}
              />
            )}
          </TouchableOpacity>
        </View>
      </Card.Content>
    </Card>
  );
};

const BucketSharingSection: React.FC<BucketSharingSectionProps> = ({
  bucketId,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<EntityPermissionFragment | null>(null);

  const { canAdmin, refetch, allPermissions, loading, bucket } =
    useGetBucketData(bucketId);

  const [shareBucket, { loading: sharingBucket }] = useShareBucketMutation({
    optimisticResponse: (vars) => {
      const now = new Date().toISOString();
      const permissionId = `temp-permission-${Date.now()}`;

      // Trova il permesso esistente se stiamo aggiornando
      const existingPermission = editingPermission;

      return {
        __typename: "Mutation" as const,
        shareBucket: {
          __typename: "EntityPermission" as const,
          id: existingPermission?.id || permissionId,
          resourceType: ResourceType.Bucket,
          resourceId: bucketId,
          permissions: vars.input.permissions,
          expiresAt: vars.input.expiresAt || null,
          createdAt: existingPermission?.createdAt || now,
          updatedAt: now,
          grantedBy: bucket?.user
            ? {
                __typename: "User" as const,
                id: bucket.user.id,
                email: bucket.user.email,
                username: bucket.user.username,
                firstName: bucket.user.firstName || null,
                lastName: bucket.user.lastName || null,
                avatar: bucket.user.avatar || null,
                hasPassword: bucket.user.hasPassword || false,
                role: bucket.user.role || UserRole.User,
                createdAt: bucket.user.createdAt,
                updatedAt: bucket.user.updatedAt || now,
                identities: null,
                buckets: null,
              }
            : null,
          user: existingPermission?.user || {
            __typename: "User" as const,
            id: vars.input.userId || "",
            email: vars.input.userEmail || "",
            username: vars.input.username || "",
            firstName: null,
            lastName: null,
            avatar: null,
            hasPassword: false,
            role: UserRole.User,
            createdAt: now,
            updatedAt: now,
            identities: null,
            buckets: null,
          },
        },
      };
    },
    update: (cache, { data }) => {
      if (!data?.shareBucket) return;

      try {
        const existingData = cache.readQuery<any>({
          query: GetBucketDocument,
          variables: { id: bucketId },
        });

        if (existingData?.bucket) {
          const existingPermissions = existingData.bucket.permissions || [];

          // Controlla se stiamo aggiornando un permesso esistente
          const existingIndex = existingPermissions.findIndex(
            (p: EntityPermissionFragment) =>
              p.user?.id === data.shareBucket.user?.id
          );

          let updatedPermissions;
          if (existingIndex !== -1) {
            // Aggiorna il permesso esistente
            updatedPermissions = [...existingPermissions];
            updatedPermissions[existingIndex] = data.shareBucket;
          } else {
            // Aggiungi nuovo permesso
            updatedPermissions = [...existingPermissions, data.shareBucket];
          }

          cache.writeQuery({
            query: GetBucketDocument,
            variables: { id: bucketId },
            data: {
              bucket: {
                ...existingData.bucket,
                permissions: updatedPermissions,
              },
            },
          });
        }
      } catch (error) {
        console.error("Failed to update cache after sharing bucket:", error);
      }
    },
    onCompleted: (data) => {
      setShowShareModal(false);
      setEditingPermission(null);
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.message || t("buckets.sharing.shareError")
      );
      refetch?.();
    },
  });

  const [unshareBucket, { loading: unsharingBucket }] =
    useUnshareBucketMutation({
      optimisticResponse: (vars) => ({
        __typename: "Mutation" as const,
        unshareBucket: true,
      }),
      update: (cache, { data }, { variables }) => {
        if (!data?.unshareBucket || !variables?.input.userId) return;

        try {
          const existingData = cache.readQuery<any>({
            query: GetBucketDocument,
            variables: { id: bucketId },
          });

          if (existingData?.bucket) {
            const updatedPermissions = (
              existingData.bucket.permissions || []
            ).filter(
              (p: EntityPermissionFragment) =>
                p.user?.id !== variables.input.userId
            );

            cache.writeQuery({
              query: GetBucketDocument,
              variables: { id: bucketId },
              data: {
                bucket: {
                  ...existingData.bucket,
                  permissions: updatedPermissions,
                },
              },
            });
          }
        } catch (error) {
          console.error(
            "Failed to update cache after unsharing bucket:",
            error
          );
        }
      },
      onError: (error: any) => {
        Alert.alert(
          t("common.error"),
          error.message || t("buckets.sharing.unshareError")
        );
        refetch?.();
      },
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
    <>
      <View style={styles.header}>
        <Text style={styles.title}>{t("buckets.sharing.title")}</Text>
        <IconButton
          mode="contained"
          onPress={() => setShowShareModal(true)}
          icon="plus"
          style={styles.addButton}
        />
      </View>

      <Text style={styles.description}>{t("buckets.sharing.description")}</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" />
          <Text style={styles.loadingText}>{t("buckets.sharing.loading")}</Text>
        </View>
      ) : allPermissions.length === 0 ? (
        <Card style={styles.emptyContainer}>
          <Card.Content>
            <Icon
              source="account-group"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleMedium" style={styles.emptyText}>
              {t("buckets.sharing.noShares")}
            </Text>
          </Card.Content>
        </Card>
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
    </>
  );
};

const styles = StyleSheet.create({
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
    borderRadius: 8,
  },
  editingUserLabel: {
    fontSize: 14,
    fontWeight: "500",
    marginRight: 8,
  },
  editingUserValue: {
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
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
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 20,
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
  },
  permissionChipSelected: {
    // Selected state will be handled by theme colors
  },
  permissionText: {
    fontSize: 14,
  },
  permissionTextSelected: {
    // Selected text color will be handled by theme colors
  },
  modalFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginHorizontal: 4,
  },
  cancelButton: {
    borderWidth: 1,
  },
  cancelButtonText: {
    fontWeight: "500",
  },
  shareButton: {
    // Background color will be handled by theme
  },
  shareButtonText: {
    fontWeight: "500",
  },
});

export default BucketSharingSection;
