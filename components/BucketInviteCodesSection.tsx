import { useI18n } from "@/hooks/useI18n";
import { usePermissions } from "@/hooks/usePermissions";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Platform,
  ScrollView,
  Share,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import * as Clipboard from 'expo-clipboard';
import { Text, TextInput, useTheme } from "react-native-paper";
import DetailItemCard from "./ui/DetailItemCard";
import DetailModal from "./ui/DetailModal";
import DetailSectionCard from "./ui/DetailSectionCard";
import {
  Permission,
  ResourceType,
  useCreateInviteCodeMutation,
  useUpdateInviteCodeMutation,
  useDeleteInviteCodeMutation,
  InviteCodeFragment,
  useInviteCodesForResourceQuery,
  InviteCodesForResourceDocument,
  InviteCodesForResourceQuery,
} from "@/generated/gql-operations-generated";

const availablePermissions = [Permission.Read, Permission.Write];

interface BucketInviteCodesSectionProps {
  bucketId: string;
  bucketName: string;
  refetchTrigger?: number;
}

export default function BucketInviteCodesSection({
  bucketId,
  bucketName,
  refetchTrigger,
}: BucketInviteCodesSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { getPermissionLabel } = usePermissions();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [editingInviteCode, setEditingInviteCode] = useState<InviteCodeFragment | null>(null);
  
  const isDev = process.env.EXPO_PUBLIC_APP_VARIANT === "development";

  // Form state
  const [selectedPermissions, setSelectedPermissions] = useState<Permission[]>([
    Permission.Read,
  ]);
  const [expirationDays, setExpirationDays] = useState("");
  const [maxUses, setMaxUses] = useState("");

  const isEditing = !!editingInviteCode;

  const { data, loading, refetch } = useInviteCodesForResourceQuery({
    variables: {
      resourceType: ResourceType.Bucket,
      resourceId: bucketId,
    },
    skip: !bucketId,
  });

  // Refetch when refetchTrigger changes
  useEffect(() => {
    if (refetchTrigger && bucketId) {
      refetch();
    }
  }, [refetchTrigger, bucketId, refetch]);

  const [createInviteCode, { loading: isCreating }] =
    useCreateInviteCodeMutation({
      update(cache, { data }) {
        if (!data?.createInviteCode) return;

        const existingData = cache.readQuery<InviteCodesForResourceQuery>({
          query: InviteCodesForResourceDocument,
          variables: {
            resourceType: ResourceType.Bucket,
            resourceId: bucketId,
          },
        });

        if (existingData) {
          cache.writeQuery<InviteCodesForResourceQuery>({
            query: InviteCodesForResourceDocument,
            variables: {
              resourceType: ResourceType.Bucket,
              resourceId: bucketId,
            },
            data: {
              inviteCodesForResource: [
                ...existingData.inviteCodesForResource,
                data.createInviteCode,
              ],
            },
          });
        }
      },
    });

  const [updateInviteCode, { loading: isUpdating }] =
    useUpdateInviteCodeMutation({
      update(cache, { data }) {
        if (!data?.updateInviteCode) return;

        const existingData = cache.readQuery<InviteCodesForResourceQuery>({
          query: InviteCodesForResourceDocument,
          variables: {
            resourceType: ResourceType.Bucket,
            resourceId: bucketId,
          },
        });

        if (existingData) {
          cache.writeQuery<InviteCodesForResourceQuery>({
            query: InviteCodesForResourceDocument,
            variables: {
              resourceType: ResourceType.Bucket,
              resourceId: bucketId,
            },
            data: {
              inviteCodesForResource: existingData.inviteCodesForResource.map(
                (code: InviteCodeFragment) =>
                  code.id === data.updateInviteCode.id
                    ? data.updateInviteCode
                    : code
              ),
            },
          });
        }
      }
    });

  const [deleteInviteCode] = useDeleteInviteCodeMutation({
    update(cache, { data }, { variables }) {
      if (!data?.deleteInviteCode || !variables?.id) return;

      const existingData = cache.readQuery<InviteCodesForResourceQuery>({
        query: InviteCodesForResourceDocument,
        variables: {
          resourceType: ResourceType.Bucket,
          resourceId: bucketId,
        },
      });

      if (existingData) {
        cache.writeQuery<InviteCodesForResourceQuery>({
          query: InviteCodesForResourceDocument,
          variables: {
            resourceType: ResourceType.Bucket,
            resourceId: bucketId,
          },
          data: {
            inviteCodesForResource: existingData.inviteCodesForResource.filter(
              (code: InviteCodeFragment) => code.id !== variables.id
            ),
          },
        });
      }
    },
  });

  const inviteCodes: InviteCodeFragment[] = data?.inviteCodesForResource || [];

  const togglePermission = (permission: Permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(
        selectedPermissions.filter((p) => p !== permission)
      );
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleSaveCode = async () => {
    if (selectedPermissions.length === 0) {
      Alert.alert(
        t("common.error"),
        t("buckets.inviteCodes.selectAtLeastOnePermission")
      );
      return;
    }

    try {
      // Calculate expiration date from days input
      let expiresAt: Date | undefined;
      if (expirationDays.trim()) {
        const days = parseInt(expirationDays, 10);
        if (isNaN(days) || days < 1) {
          Alert.alert(
            t("common.error"),
            t("buckets.inviteCodes.invalidExpirationDays")
          );
          return;
        }
        expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
      }

      // Parse max uses (empty = no limit)
      let maxUsesNum: number | undefined;
      if (maxUses.trim()) {
        maxUsesNum = parseInt(maxUses, 10);
        if (isNaN(maxUsesNum) || maxUsesNum < 1) {
          Alert.alert(
            t("common.error"),
            t("buckets.inviteCodes.invalidMaxUses")
          );
          return;
        }
      }

      if (isEditing) {
        await updateInviteCode({
          variables: {
            input: {
              id: editingInviteCode!.id,
              permissions: selectedPermissions,
              ...(expiresAt && { expiresAt: expiresAt.toISOString() }),
              ...(maxUsesNum !== undefined && { maxUses: maxUsesNum }),
            },
          },
        });
      } else {
        await createInviteCode({
          variables: {
            input: {
              resourceType: ResourceType.Bucket,
              resourceId: bucketId,
              permissions: selectedPermissions,
              ...(expiresAt && { expiresAt: expiresAt.toISOString() }),
              ...(maxUsesNum && { maxUses: maxUsesNum }),
            },
          },
        });
      }

      handleCloseModal();
    } catch (error) {
      console.error("Error saving invite code:", error);
      Alert.alert(t("common.error"), t("buckets.inviteCodes.createError"));
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    Alert.alert(
      t("buckets.inviteCodes.deleteTitle"),
      t("buckets.inviteCodes.deleteConfirm"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteInviteCode({
                variables: { id: codeId },
              });
            } catch (error) {
              console.error("Error deleting invite code:", error);
              Alert.alert(
                t("common.error"),
                t("buckets.inviteCodes.deleteError")
              );
            }
          },
        },
      ]
    );
  };

  const handleEditCode = (code: InviteCodeFragment) => {
    setEditingInviteCode(code);
    setShowCreateDialog(true);
  };

  const handleCloseModal = () => {
    setShowCreateDialog(false);
    setEditingInviteCode(null);
    resetForm();
  };

  const resetForm = () => {
    setSelectedPermissions([Permission.Read]);
    setExpirationDays("");
    setMaxUses("");
  };

  // Initialize form when editing
  useEffect(() => {
    if (isEditing && editingInviteCode) {
      setSelectedPermissions(editingInviteCode.permissions as Permission[]);
      
      if (editingInviteCode.expiresAt) {
        const now = Date.now();
        const expiresDate = new Date(editingInviteCode.expiresAt).getTime();
        const daysRemaining = Math.ceil((expiresDate - now) / (24 * 60 * 60 * 1000));
        setExpirationDays(daysRemaining > 0 ? daysRemaining.toString() : "");
      } else {
        setExpirationDays("");
      }

      setMaxUses(editingInviteCode.maxUses?.toString() || "");
    } else {
      resetForm();
    }
  }, [isEditing, editingInviteCode]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isCodeExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isCodeExhausted = (code: InviteCodeFragment) => {
    return code.maxUses !== null ? code.usageCount >= code.maxUses : false;
  };

  const handleShareCode = async (code: string) => {
    try {
      // Create universal link with env parameter for dev builds
      // - Prod app: https://notifier.zentik.app/invite/{code}
      // - Dev app: https://notifier.zentik.app/invite/{code}?env=dev
      const envParam = isDev ? '?env=dev' : '';
      const link = `https://notifier.zentik.app/invite/${code}${envParam}`;
      
      // Try native Share API (available on iOS and Android)
      if (Platform.OS !== 'web') {
        try {
          await Share.share({
            message: t("buckets.inviteCodes.shareMessageComplete", { 
              bucketName, 
              code,
              link 
            }),
            title: t("buckets.inviteCodes.shareTitle"),
            url: link,
          });
          return;
        } catch (shareError: any) {
          // If user cancels, error.code will be 'CANCELLED'
          if (shareError?.code === 'CANCELLED') {
            return;
          }
          // Otherwise fall through to clipboard
          console.log("Share not available, falling back to clipboard");
        }
      }
      
      // Fallback: Copy to clipboard (for web or if Share fails)
      await Clipboard.setStringAsync(link);
      Alert.alert(
        t("common.success"),
        t("buckets.inviteCodes.linkCopied")
      );
    } catch (error) {
      console.error("Error sharing code:", error);
      Alert.alert(
        t("common.error"),
        t("buckets.inviteCodes.shareError")
      );
    }
  };

  return (
    <>
      <DetailSectionCard
        title={t("buckets.inviteCodes.title")}
        description={t("buckets.inviteCodes.description")}
        actionButton={{
          label: t("buckets.inviteCodes.create"),
          icon: "plus",
          onPress: () => setShowCreateDialog(true),
          loading: isCreating,
        }}
        loading={loading}
        emptyState={{
          icon: "link-off",
          text: t("buckets.inviteCodes.noCodesYet"),
        }}
        items={inviteCodes}
        renderItem={(code) => {
          const expired = isCodeExpired(code.expiresAt);
          const exhausted = isCodeExhausted(code);
          const inactive = expired || exhausted;

          const details = [
            code.permissions
              .map((p) => getPermissionLabel(p as Permission))
              .join(", "),
            `${t("buckets.inviteCodes.usage")}: ${code.usageCount} / ${
              code.maxUses ?? '-'
            }${exhausted ? ` (${t("buckets.inviteCodes.exhausted")})` : ""}`,
          ];

          if (code.expiresAt) {
            details.push(
              `${formatDate(code.expiresAt)}${
                expired ? ` (${t("buckets.inviteCodes.expired")})` : ""
              }`
            );
          }

          details.push(code.creator.username || code.creator.email);

          return (
            <DetailItemCard
              icon="qrcode"
              title={code.code}
              details={details}
              actions={[
                {
                  icon: "share-variant",
                  onPress: () => handleShareCode(code.code),
                  color: theme.colors.primary,
                },
                {
                  icon: "pencil",
                  onPress: () => handleEditCode(code),
                  disabled: inactive,
                },
                {
                  icon: "delete",
                  onPress: () => handleDeleteCode(code.id),
                  color: theme.colors.error,
                },
              ]}
              opacity={inactive ? 0.5 : 1}
            />
          );
        }}
      />

      <DetailModal
        visible={showCreateDialog}
        onDismiss={handleCloseModal}
        title={isEditing ? t("buckets.inviteCodes.editTitle") : t("buckets.inviteCodes.createTitle")}
        icon="link-plus"
        actions={{
          cancel: {
            label: t("common.cancel"),
            onPress: handleCloseModal,
          },
          confirm: {
            label: isEditing ? t("common.save") : t("buckets.inviteCodes.create"),
            onPress: handleSaveCode,
            loading: isCreating || isUpdating,
            disabled: selectedPermissions.length === 0,
          },
        }}
      >
        <Text variant="titleSmall" style={styles.label}>
          {t("buckets.inviteCodes.selectPermissions")}:
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

        <TextInput
          label={t("buckets.inviteCodes.expirationDays")}
          placeholder={t("buckets.inviteCodes.expirationDaysPlaceholder")}
          value={expirationDays}
          onChangeText={setExpirationDays}
          keyboardType="number-pad"
          mode="outlined"
          style={styles.input}
          right={<TextInput.Affix text={t("buckets.inviteCodes.days")} />}
        />

        <TextInput
          label={t("buckets.inviteCodes.maxUses")}
          placeholder={t("buckets.inviteCodes.maxUsesPlaceholder")}
          value={maxUses}
          onChangeText={setMaxUses}
          keyboardType="number-pad"
          mode="outlined"
          style={styles.input}
        />
      </DetailModal>
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 8,
  },
  permissionsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
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
  input: {
    marginBottom: 12,
  },
});
