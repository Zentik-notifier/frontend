import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";
import React from "react";
import { Alert, StyleSheet, View, Pressable } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import SwipeableItem, { SwipeAction } from "./SwipeableItem";

interface BackupInfo {
  filename: string;
  path: string;
  size: string;
  sizeBytes: number;
  createdAt: string;
}

interface SwipeableBackupItemProps {
  backup: BackupInfo;
  onDelete: (filename: string) => void;
}

export const SwipeableBackupItem: React.FC<SwipeableBackupItemProps> = ({
  backup,
  onDelete,
}) => {
  const { t } = useI18n();
  const theme = useTheme();
  const { formatDate } = useDateFormat();

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  };

  const handleDeletePress = () => {
    onDelete(backup.filename);
  };

  const rightAction: SwipeAction = {
    icon: "delete",
    backgroundColor: theme.colors.error,
    label: t("common.delete") as string,
    onPress: handleDeletePress,
  };

  return (
    <SwipeableItem rightAction={rightAction}>
      <Pressable style={styles.container}>
        <View style={styles.contentContainer}>
          <Text variant="bodyLarge" style={styles.filename} numberOfLines={1}>
            {backup.filename}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon source="harddisk" size={16} color={theme.colors.secondary} />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatFileSize(backup.sizeBytes || 0)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Icon source="calendar" size={16} color={theme.colors.secondary} />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatDate(backup.createdAt, true)}
              </Text>
            </View>
          </View>
        </View>
      </Pressable>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
  swipeableContainer: {
    marginBottom: 8,
  },
  container: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    gap: 12,
  },
  contentContainer: {
    flex: 1,
    gap: 4,
  },
  filename: {
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 16,
  },
  detailItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailText: {
    opacity: 0.7,
  },
});
