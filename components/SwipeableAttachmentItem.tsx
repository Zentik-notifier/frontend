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
import { AttachmentFragment } from "@/generated/gql-operations-generated";
import { formatFileSize } from "@/utils/fileUtils";

interface SwipeableAttachmentItemProps {
  attachment: AttachmentFragment;
  onDelete: (attachmentId: string) => void;
  onPress?: (attachment: AttachmentFragment) => void;
}

export const SwipeableAttachmentItem: React.FC<
  SwipeableAttachmentItemProps
> = ({ attachment, onDelete, onPress }) => {
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
          t("userAttachments.unableToDownload") as string
        );
        return;
      }

      const downloadUrl = `${apiUrl}/api/v1/attachments/${attachment.id}/download`;

      if (Platform.OS === "web") {
        // On web, download via fetch and create download link
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
          a.download = attachment.filename;
          document.body.appendChild(a);
          a.click();
          window.URL.revokeObjectURL(url);
          document.body.removeChild(a);

          Alert.alert(
            t("common.success"),
            t("userAttachments.downloadStarted") as string
          );
        } else {
          throw new Error("Download failed");
        }
      } else {
        // On mobile, download and share
        const fileUri = `${Paths.document.uri}${attachment.filename}`;
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
              t("userAttachments.downloadStarted") as string
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
      console.error("Error downloading attachment:", error);
      Alert.alert(
        t("common.error") as string,
        t("userAttachments.downloadFailed") as string
      );
    } finally {
      setDownloading(false);
    }
  };

  const handleDeletePress = () => {
    onDelete(attachment.id);
  };

  const handlePress = () => {
    if (onPress) {
      onPress(attachment);
    }
  };

  const rightAction: SwipeAction = {
    icon: "delete",
    destructive: true,
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

  const getFileIcon = (mediaType: string | null): string => {
    if (!mediaType) return "file";
    if (mediaType.startsWith("image/")) return "file-image";
    if (mediaType.startsWith("video/")) return "file-video";
    if (mediaType.startsWith("audio/")) return "file-music";
    if (mediaType.includes("pdf")) return "file-pdf-box";
    if (mediaType.includes("text")) return "file-document";
    return "file";
  };

  return (
    <SwipeableItem rightAction={rightAction} menuItems={menuItems}>
      <Pressable style={styles.container} onPress={handlePress}>
        <Icon
          source={getFileIcon(attachment.mediaType)}
          size={40}
          color={theme.colors.primary}
        />

        <View style={styles.contentContainer}>
          <Text variant="bodyLarge" style={styles.filename} numberOfLines={1}>
            {attachment.originalFilename || attachment.filename}
          </Text>

          <View style={styles.detailsRow}>
            <View style={styles.detailItem}>
              <Icon
                source="calendar"
                size={16}
                color={theme.colors.secondary}
              />
              <Text variant="bodySmall" style={styles.detailText}>
                {formatDate(attachment.createdAt, true)}
              </Text>
            </View>

            {attachment.size && (
              <View style={styles.detailItem}>
                <Icon
                  source="file"
                  size={16}
                  color={theme.colors.secondary}
                />
                <Text variant="bodySmall" style={styles.detailText}>
                  {formatFileSize(attachment.size)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>
    </SwipeableItem>
  );
};

const styles = StyleSheet.create({
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
