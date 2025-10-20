import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Chip,
  Dialog,
  IconButton,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
  Switch,
} from "react-native-paper";
import CopyButton from "./ui/CopyButton";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Permission } from "@/generated/gql-operations-generated";

interface BucketInviteCodesSectionProps {
  bucketId: string;
  bucketName: string;
}

interface InviteCode {
  id: string;
  code: string;
  permissions: string[];
  expiresAt?: string | null;
  usageCount: number;
  maxUses: number;
  createdAt: string;
  creator: {
    username?: string;
    email: string;
  };
}

export default function BucketInviteCodesSection({
  bucketId,
  bucketName,
}: BucketInviteCodesSectionProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [isCreating, setIsCreating] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  
  // Create form state
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>(["READ"]);
  const [hasExpiration, setHasExpiration] = useState(false);
  const [expirationDate, setExpirationDate] = useState(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)); // 7 days from now
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [maxUses, setMaxUses] = useState("1");
  
  // Mock data - will be replaced with GraphQL query
  const inviteCodes: InviteCode[] = [];
  const loading = false;

  const availablePermissions = [Permission.Read, Permission.Write, Permission.Admin];

  const togglePermission = (permission: Permission) => {
    if (selectedPermissions.includes(permission)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permission));
    } else {
      setSelectedPermissions([...selectedPermissions, permission]);
    }
  };

  const handleCreateCode = async () => {
    if (selectedPermissions.length === 0) {
      Alert.alert(
        t("common.error"),
        t("inviteCodes.selectAtLeastOnePermission" as any)
      );
      return;
    }

    const maxUsesNum = parseInt(maxUses, 10);
    if (isNaN(maxUsesNum) || maxUsesNum < 1) {
      Alert.alert(
        t("common.error"),
        t("inviteCodes.invalidMaxUses" as any)
      );
      return;
    }

    setIsCreating(true);
    try {
      // TODO: Call GraphQL mutation
      console.log("Creating invite code:", {
        resourceType: "BUCKET",
        resourceId: bucketId,
        permissions: selectedPermissions,
        expiresAt: hasExpiration ? expirationDate.toISOString() : undefined,
        maxUses: maxUsesNum,
      });
      
      setShowCreateDialog(false);
      resetCreateForm();
    } catch (error) {
      console.error("Error creating invite code:", error);
      Alert.alert(
        t("common.error"),
        t("inviteCodes.createError" as any)
      );
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    Alert.alert(
      t("inviteCodes.deleteTitle" as any),
      t("inviteCodes.deleteConfirm" as any),
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
              // TODO: Call GraphQL mutation
              console.log("Deleting invite code:", codeId);
            } catch (error) {
              console.error("Error deleting invite code:", error);
              Alert.alert(
                t("common.error"),
                t("inviteCodes.deleteError" as any)
              );
            }
          },
        },
      ]
    );
  };

  const resetCreateForm = () => {
    setSelectedPermissions(["READ"]);
    setHasExpiration(false);
    setExpirationDate(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000));
    setMaxUses("1");
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isCodeExpired = (expiresAt?: string | null) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const isCodeExhausted = (code: InviteCode) => {
    return code.usageCount >= code.maxUses;
  };

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={styles.title}>
            {t("inviteCodes.title" as any)}
          </Text>
          <Button
            mode="contained"
            icon="plus"
            onPress={() => setShowCreateDialog(true)}
            loading={isCreating}
            disabled={isCreating}
          >
            {t("inviteCodes.create" as any)}
          </Button>
        </View>

        <Text variant="bodySmall" style={styles.description}>
          {t("inviteCodes.description" as any)}
        </Text>

        {loading ? (
          <Surface style={styles.emptyState}>
            <Text>{t("common.loading")}</Text>
          </Surface>
        ) : inviteCodes.length === 0 ? (
          <Surface style={styles.emptyState}>
            <Text variant="bodyMedium" style={{ opacity: 0.6 }}>
              {t("inviteCodes.noCodesYet" as any)}
            </Text>
          </Surface>
        ) : (
          <ScrollView style={styles.codesList}>
            {inviteCodes.map((code) => {
              const expired = isCodeExpired(code.expiresAt);
              const exhausted = isCodeExhausted(code);
              const inactive = expired || exhausted;

              return (
                <Surface
                  key={code.id}
                  style={[
                    styles.codeCard,
                    { backgroundColor: theme.colors.surfaceVariant },
                    inactive && { opacity: 0.5 },
                  ]}
                  elevation={1}
                >
                  <View style={styles.codeHeader}>
                    <View style={styles.codeInfo}>
                      <Text variant="labelSmall" style={styles.codeLabel}>
                        {t("inviteCodes.code" as any)}:
                      </Text>
                      <View style={styles.codeValueRow}>
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.codeValue,
                            { fontFamily: "monospace" },
                          ]}
                        >
                          {code.code}
                        </Text>
                        <CopyButton text={code.code} size={20} />
                      </View>
                    </View>
                    <IconButton
                      icon="delete"
                      size={20}
                      onPress={() => handleDeleteCode(code.id)}
                      iconColor={theme.colors.error}
                    />
                  </View>

                  <View style={styles.codeDetails}>
                    <View style={styles.detailRow}>
                      <Text variant="bodySmall" style={styles.detailLabel}>
                        {t("inviteCodes.permissions" as any)}:
                      </Text>
                      <View style={styles.permissionsChips}>
                        {code.permissions.map((perm) => (
                          <Chip
                            key={perm}
                            mode="outlined"
                            compact
                            style={styles.permissionChip}
                          >
                            {perm}
                          </Chip>
                        ))}
                      </View>
                    </View>

                    <View style={styles.detailRow}>
                      <Text variant="bodySmall" style={styles.detailLabel}>
                        {t("inviteCodes.usage" as any)}:
                      </Text>
                      <Text variant="bodySmall">
                        {code.usageCount} / {code.maxUses}
                        {exhausted && (
                          <Text style={{ color: theme.colors.error }}>
                            {" "}
                            ({t("inviteCodes.exhausted" as any)})
                          </Text>
                        )}
                      </Text>
                    </View>

                    {code.expiresAt && (
                      <View style={styles.detailRow}>
                        <Text variant="bodySmall" style={styles.detailLabel}>
                          {t("inviteCodes.expiresAt" as any)}:
                        </Text>
                        <Text
                          variant="bodySmall"
                          style={
                            expired && { color: theme.colors.error }
                          }
                        >
                          {formatDate(code.expiresAt)}
                          {expired && ` (${t("inviteCodes.expired" as any)})`}
                        </Text>
                      </View>
                    )}

                    <View style={styles.detailRow}>
                      <Text variant="bodySmall" style={styles.detailLabel}>
                        {t("inviteCodes.createdBy" as any)}:
                      </Text>
                      <Text variant="bodySmall">
                        {code.creator.username || code.creator.email}
                      </Text>
                    </View>
                  </View>
                </Surface>
              );
            })}
          </ScrollView>
        )}
      </Card.Content>

      {/* Create Dialog */}
      <Portal>
        <Dialog
          visible={showCreateDialog}
          onDismiss={() => setShowCreateDialog(false)}
        >
          <Dialog.Title>{t("inviteCodes.createTitle" as any)}</Dialog.Title>
          <Dialog.ScrollArea>
            <ScrollView contentContainerStyle={styles.dialogContent}>
              <Text variant="labelMedium" style={styles.dialogLabel}>
                {t("inviteCodes.selectPermissions" as any)}:
              </Text>
              <View style={styles.permissionsSelector}>
                {availablePermissions.map((permission) => (
                  <Chip
                    key={permission}
                    mode={
                      selectedPermissions.includes(permission)
                        ? "flat"
                        : "outlined"
                    }
                    selected={selectedPermissions.includes(permission)}
                    onPress={() => togglePermission(permission)}
                    style={styles.permissionSelectorChip}
                  >
                    {permission}
                  </Chip>
                ))}
              </View>

              <View style={styles.expirationSection}>
                <View style={styles.switchRow}>
                  <Text variant="labelMedium">
                    {t("inviteCodes.setExpiration" as any)}
                  </Text>
                  <Switch
                    value={hasExpiration}
                    onValueChange={setHasExpiration}
                  />
                </View>

                {hasExpiration && (
                  <Button
                    mode="outlined"
                    onPress={() => setShowDatePicker(true)}
                    style={styles.dateButton}
                  >
                    {formatDate(expirationDate.toISOString())}
                  </Button>
                )}
              </View>

              <TextInput
                label={t("inviteCodes.maxUses" as any)}
                value={maxUses}
                onChangeText={setMaxUses}
                keyboardType="number-pad"
                mode="outlined"
                style={styles.input}
              />
            </ScrollView>
          </Dialog.ScrollArea>
          <Dialog.Actions>
            <Button onPress={() => setShowCreateDialog(false)}>
              {t("common.cancel" as any)}
            </Button>
            <Button
              onPress={handleCreateCode}
              loading={isCreating}
              disabled={isCreating || selectedPermissions.length === 0}
            >
              {t("common.create" as any)}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={expirationDate}
          mode="date"
          display="default"
          onChange={(event, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) {
              setExpirationDate(selectedDate);
            }
          }}
          minimumDate={new Date()}
        />
      )}
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginTop: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontWeight: "600",
  },
  description: {
    opacity: 0.7,
    marginBottom: 16,
  },
  emptyState: {
    padding: 24,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 8,
  },
  codesList: {
    maxHeight: 400,
  },
  codeCard: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  codeHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  codeInfo: {
    flex: 1,
  },
  codeLabel: {
    opacity: 0.7,
    marginBottom: 4,
  },
  codeValueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  codeValue: {
    fontWeight: "600",
  },
  codeDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    flexWrap: "wrap",
  },
  detailLabel: {
    opacity: 0.7,
    marginRight: 8,
  },
  permissionsChips: {
    flexDirection: "row",
    gap: 4,
    flexWrap: "wrap",
  },
  permissionChip: {
    height: 24,
  },
  dialogContent: {
    paddingHorizontal: 24,
    paddingVertical: 8,
  },
  dialogLabel: {
    marginBottom: 8,
  },
  permissionsSelector: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  permissionSelectorChip: {
    marginRight: 4,
  },
  expirationSection: {
    marginBottom: 16,
  },
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  dateButton: {
    marginTop: 8,
  },
  input: {
    marginBottom: 8,
  },
});

