import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";
import React, { useMemo } from "react";
import { Alert, StyleSheet, View, Pressable, Platform } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import SwipeableItem, { SwipeAction, MenuItem } from "./SwipeableItem";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { ApiConfigService } from "@/services/api-config";
import { getAccessToken } from "@/services/auth-storage";
import { formatFileSize } from "@/utils/fileUtils";

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
  const [downloading, setDownloading] = React.useState(false);

  const handleDownload = async () => {
    try {
      setDownloading(true);
      const apiUrl = await ApiConfigService.getApiUrl();
      const token = await getAccessToken();

      if (!apiUrl || !token) {
        Alert.alert(
          t("common.error") as string,
          "Unable to download backup" as string
        );
        return;
      }

      const downloadUrl = `${apiUrl}/api/v1/server-manager/backups/${backup.filename}/download`;

      if (Platform.OS === "web") {
        // On web, open in new tab with auth header through fetch
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = backup.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);
        } else {
          throw new Error("Download failed");
        }
      } else {
        // On mobile, download and share
        const fileUri = `${Paths.document.uri}${backup.filename}`;
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const file = new File(fileUri);
          file.write(uint8Array, {});

          const canShare = await Sharing.isAvailableAsync();
          if (canShare) {
            await Sharing.shareAsync(fileUri);
          } else {
            Alert.alert(
              t("common.success"),
              "Backup downloaded successfully" as string
            );
          }

          // Cleanup
          try {
            file.delete();
          } catch (cleanupError) {
            console.log("File cleanup failed:", cleanupError);
          }
        } else {
          throw new Error("Download failed");
        }
      }
    } catch (error) {
      console.error("Error downloading backup:", error);
      Alert.alert(
        t("common.error") as string,
        "Failed to download backup" as string
      );
    } finally {
      setDownloading(false);
    }
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

  const menuItems = useMemo((): MenuItem[] => {
    return [
      {
        id: "download",
        label: t("common.download"),
        icon: "download",
        onPress: handleDownload,
      },
    ];
  }, [t, handleDownload]);

  return (
    <SwipeableItem rightAction={rightAction} menuItems={menuItems}>
      <Pressable style={styles.container}>
        <View style={styles.contentContainer}>
          <Text variant="bodyLarge" style={styles.filename} numberOfLines={1}>
            {backup.filename}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon
                source="harddisk"
                size={16}
                color={theme.colors.secondary}
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatFileSize(backup.sizeBytes || 0)}
              </Text>
            </View>

            <View style={styles.detailItem}>
              <Icon
                source="calendar"
                size={16}
                color={theme.colors.secondary}
              />
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
