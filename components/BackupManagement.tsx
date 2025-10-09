import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { FAB, Icon, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import {
  useDeleteBackupMutation,
  useListBackupsQuery,
  useTriggerBackupMutation,
} from "@/generated/gql-operations-generated";
import { SwipeableBackupItem } from "./SwipeableBackupItem";

export function BackupManagement() {
  const { t } = useI18n();
  const theme = useTheme();
  const [triggeringBackup, setTriggeringBackup] = useState(false);

  // GraphQL queries and mutations
  const { data, loading, refetch } = useListBackupsQuery({
    fetchPolicy: "network-only",
  });

  const [triggerBackupMutation] = useTriggerBackupMutation();
  const [deleteBackupMutation] = useDeleteBackupMutation();

  const backups = data?.listBackups || [];

  const handleRefresh = async () => {
    await refetch();
  };

  const handleTriggerBackup = () => {
    Alert.alert(
      t("backupManagement.createBackupTitle") as string,
      t("backupManagement.createBackupDescription") as string,
      [
        {
          text: t("common.cancel") as string,
          style: "cancel",
        },
        {
          text: t("backupManagement.triggerBackup") as string,
          onPress: async () => {
            try {
              setTriggeringBackup(true);
              const result = await triggerBackupMutation();

              if (result.data?.triggerBackup) {
                await handleRefresh();
              }
            } catch (error) {
              console.error("Error triggering backup:", error);
              Alert.alert(
                t("common.error") as string,
                t("backupManagement.triggerError") as string
              );
            } finally {
              setTriggeringBackup(false);
            }
          },
        },
      ]
    );
  };

  const handleDeleteBackup = (filename: string) => {
    Alert.alert(
      t("backupManagement.deleteConfirmTitle"),
      t("backupManagement.deleteConfirmMessage").replace(
        "{{filename}}",
        filename
      ),
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
              await deleteBackupMutation({
                variables: { filename },
              });
              Alert.alert(
                t("backupManagement.success"),
                t("backupManagement.deleteSuccess")
              );
              await handleRefresh();
            } catch (error) {
              console.error("Error deleting backup:", error);
              Alert.alert(t("common.error"), t("backupManagement.deleteError"));
            }
          },
        },
      ]
    );
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const totalSize = backups.reduce((acc, b) => acc + (b.sizeBytes || 0), 0);

  return (
    <>
      <PaperScrollView
        onRefresh={handleRefresh}
        loading={loading}
        onAdd={handleTriggerBackup}
      >
        {/* Stats Header */}
        <View style={styles.statsHeader}>
          <View style={styles.statItem}>
            <Icon
              source="file-document-multiple"
              size={20}
              color={theme.colors.primary}
            />
            <Text variant="titleMedium" style={styles.statValue}>
              {backups.length}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t("backupManagement.totalBackups")}
            </Text>
          </View>

          {backups.length > 0 && (
            <View style={styles.statItem}>
              <Icon
                source="harddisk"
                size={20}
                color={theme.colors.secondary}
              />
              <Text variant="titleMedium" style={styles.statValue}>
                {formatFileSize(totalSize)}
              </Text>
              <Text variant="bodySmall" style={styles.statLabel}>
                {t("backupManagement.totalSize")}
              </Text>
            </View>
          )}
        </View>

        {/* Backups List */}
        {backups.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="database-off"
              size={64}
              color={theme.colors.onSurfaceDisabled}
            />
            <Text
              variant="titleMedium"
              style={[
                styles.emptyText,
                { color: theme.colors.onSurfaceDisabled },
              ]}
            >
              {t("backupManagement.noBackups")}
            </Text>
          </View>
        ) : (
          <View>
            {backups.map((backup) => (
              <SwipeableBackupItem
                key={backup.filename}
                backup={backup}
                onDelete={handleDeleteBackup}
              />
            ))}
          </View>
        )}
      </PaperScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  statsHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 16,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  statValue: {
    fontWeight: "700",
  },
  statLabel: {
    opacity: 0.7,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    gap: 16,
  },
  emptyText: {
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
