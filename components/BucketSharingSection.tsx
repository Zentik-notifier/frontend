import { useAppContext } from "@/contexts/AppContext";
import {
  BucketFullFragment,
  EntityPermissionFragment,
  Permission,
  ResourceType,
} from "@/generated/gql-operations-generated";
import {
  useBucket,
  useRefreshBucket,
  useShareBucket,
  useUnshareBucket,
} from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";
import React, { useEffect, useState } from "react";
import DetailItemCard from "./ui/DetailItemCard";
import DetailSectionCard from "./ui/DetailSectionCard";
import {
  Alert,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import IdWithCopyButton from "./IdWithCopyButton";

const availablePermissions = [
  Permission.Read,
  Permission.Write,
  Permission.Delete,
  Permission.Admin,
];

interface BucketSharingSectionProps {
  bucketId: string;
  refetchTrigger?: number;
}

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
  const { getPermissionLabel } = usePermissions();
  const [identifier, setIdentifier] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([
    Permission.Read,
  ]);

  const isEditing = !!editingPermission;

  const togglePermission = (permission: Permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(
        selectedPermissions.filter((p) => p !== permission)
      );
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleShare = () => {
    if (selectedPermissions.length === 0) {
      Alert.alert(
        t("common.error"),
        t("buckets.inviteCodes.selectAtLeastOnePermission")
      );
      return;
    }

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
    setSelectedPermissions([Permission.Read]);
  };

  // Initialize form with editing data
  useEffect(() => {
    if (isEditing && editingPermission) {
      setSelectedPermissions(editingPermission.permissions as Permission[]);

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
            {availablePermissions.map((permission) => (
              <TouchableOpacity
                key={permission}
                style={[
                  styles.permissionChip,
                  { borderColor: theme.colors.outline },
                  selectedPermissions.includes(permission) && {
                    backgroundColor: theme.colors.primary,
                    borderColor: theme.colors.primary,
                  },
                ]}
                onPress={() => togglePermission(permission)}
              >
                <Text
                  style={[
                    styles.permissionText,
                    { color: theme.colors.onSurfaceVariant },
                    selectedPermissions.includes(permission) && {
                      color: theme.colors.onPrimary,
                    },
                  ]}
                >
                  {getPermissionLabel(permission)}
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

const BucketSharingSection: React.FC<BucketSharingSectionProps> = ({
  bucketId,
  refetchTrigger,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const { getPermissionsText } = usePermissions();
  const [showShareModal, setShowShareModal] = useState(false);
  const [editingPermission, setEditingPermission] =
    useState<EntityPermissionFragment | null>(null);

  const { userId } = useAppContext();
  const { canAdmin, allPermissions, loading, bucket } = useBucket(bucketId, {
    autoFetch: true,
    userId: userId ?? undefined,
  });
  const refreshBucket = useRefreshBucket();

  // Refetch when refetchTrigger changes
  useEffect(() => {
    if (refetchTrigger && bucketId) {
      refreshBucket(bucketId).catch(console.error);
    }
  }, [refetchTrigger, bucketId, refreshBucket]);

  const { shareBucket, isLoading: sharingBucket } = useShareBucket({
    onSuccess: () => {
      setShowShareModal(false);
      setEditingPermission(null);
      console.log("✅ Bucket shared successfully");
    },
    onError: (error: Error) => {
      Alert.alert(
        t("common.error"),
        error.message || t("buckets.sharing.shareError")
      );
    },
  });

  const { unshareBucket, isLoading: unsharingBucket } = useUnshareBucket({
    onSuccess: () => {
      console.log("✅ Bucket unshared successfully");
    },
    onError: (error: Error) => {
      Alert.alert(
        t("common.error"),
        error.message || t("buckets.sharing.unshareError")
      );
    },
  });

  const handleShare = (identifier: string, permissions: Permission[]) => {
    // Determine if identifier is email, username, or userId
    const isEmail = identifier.includes("@");
    const isUserId = identifier.match(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    );

    shareBucket({
      input: {
        resourceType: ResourceType.Bucket,
        resourceId: bucketId,
        permissions,
        userId: isUserId ? identifier : undefined,
        userEmail: isEmail && !isUserId ? identifier : undefined,
        username: !isEmail && !isUserId ? identifier : undefined,
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
      input: {
        resourceType: ResourceType.Bucket,
        resourceId: bucketId,
        permissions,
        userId: editingPermission.user?.id,
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
              input: {
                resourceType: ResourceType.Bucket,
                resourceId: bucketId,
                userId: permission.user?.id,
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
      <DetailSectionCard
        title={t("buckets.sharing.title")}
        description={t("buckets.sharing.description")}
        actionButton={{
          label: t("buckets.sharing.share"),
          icon: "plus",
          onPress: () => setShowShareModal(true),
          loading: sharingBucket,
        }}
        loading={loading}
        emptyState={{
          icon: "account-group",
          text: t("buckets.sharing.noShares"),
        }}
        items={allPermissions}
        renderItem={(permission) => {
          const getUserDisplayName = () => {
            if (permission.user?.username) return `@${permission.user.username}`;
            if (permission.user?.email) return permission.user.email;
            return t("buckets.sharing.unknownUser");
          };

          const details: string[] = [getPermissionsText(permission.permissions)];

          if (permission.expiresAt) {
            const date = new Date(permission.expiresAt);
            details.push(t("buckets.sharing.expiresAt", { date: date.toLocaleDateString() }));
          }

          // Show if permission was granted via invite code
          if (permission.inviteCodeId) {
            details.push(t("buckets.sharing.viaInviteCode"));
          }

          const getGrantedByText = (): string | null => {
            if (!permission.grantedBy) {
              const bucketOwner = bucket?.user;
              if (bucketOwner) {
                let ownerDisplayName = "";
                if (bucketOwner.username) {
                  ownerDisplayName = `@${bucketOwner.username}`;
                } else if (bucketOwner.email) {
                  ownerDisplayName = bucketOwner.email;
                } else {
                  return t("buckets.sharing.grantedByOwner");
                }
                return t("buckets.sharing.grantedByWithOwner", { user: ownerDisplayName });
              }
              return t("buckets.sharing.grantedByOwner");
            }

            let displayName = "";
            if (permission.grantedBy.username) {
              displayName = `@${permission.grantedBy.username}`;
            } else if (permission.grantedBy.email) {
              displayName = permission.grantedBy.email;
            } else {
              return null;
            }

            const isOwner = bucket?.user?.id === permission.grantedBy.id;
            return isOwner 
              ? t("buckets.sharing.grantedByWithOwner", { user: displayName })
              : t("buckets.sharing.grantedBy", { user: displayName });
          };

          const grantedBy = getGrantedByText();
          if (grantedBy) {
            details.push(grantedBy);
          }

          return (
            <DetailItemCard
              icon="account"
              title={getUserDisplayName()}
              details={details}
              actions={[
                {
                  icon: "pencil",
                  onPress: () => handleEdit(permission),
                  disabled: unsharingBucket || sharingBucket,
                },
                {
                  icon: "delete",
                  onPress: () => handleRevoke(permission),
                  color: theme.colors.error,
                  disabled: unsharingBucket || sharingBucket,
                },
              ]}
            />
          );
        }}
      />

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
  permissionText: {
    fontSize: 14,
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
});

export default BucketSharingSection;
