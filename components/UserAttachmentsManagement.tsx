import { useI18n } from "@/hooks/useI18n";
import { useDateFormat } from "@/hooks/useDateFormat";
import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme, Card, IconButton } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
// import { useUserAttachmentsQuery } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/contexts/AppContext";
import { ApiConfigService } from "@/services/api-config";
import { getAccessToken } from "@/services/auth-storage";
import { Platform } from "react-native";
import { formatFileSize } from "@/utils/fileUtils";

export function UserAttachmentsManagement() {
  const { t } = useI18n();
  const theme = useTheme();
  const { userId } = useAppContext();
  const { formatDate } = useDateFormat();

  // GraphQL query - TODO: uncomment after codegen
  // const { data, loading, refetch } = useUserAttachmentsQuery({
  //   variables: { userId: userId || "" },
  //   skip: !userId,
  //   fetchPolicy: "network-only",
  // });

  const attachments: any[] = []; // data?.userAttachments || [];
  const loading = false;
  const refetch = async () => {};

  const handleRefresh = async () => {
    await refetch();
  };

  const handleDownloadAttachment = async (
    attachmentId: string,
    filename: string
  ) => {
    try {
      const apiUrl = await ApiConfigService.getApiUrl();
      const token = await getAccessToken();

      if (!apiUrl || !token) {
        Alert.alert(t("common.error"), t("userAttachments.unableToDownload"));
        return;
      }

      const downloadUrl = `${apiUrl}/api/v1/attachments/${attachmentId}/download`;

      if (Platform.OS === "web") {
        // On web, open in new tab
        window.open(downloadUrl, "_blank");
      } else {
        // On mobile, use the authenticated download endpoint
        const response = await fetch(downloadUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          Alert.alert(
            t("common.success"),
            t("userAttachments.downloadStarted")
          );
        } else {
          throw new Error("Download failed");
        }
      }
    } catch (error) {
      console.error("Error downloading attachment:", error);
      Alert.alert(t("common.error"), t("userAttachments.downloadFailed"));
    }
  };

  const totalSize = attachments.reduce(
    (acc: number, a: any) => acc + (a.size || 0),
    0
  );

  return (
    <PaperScrollView onRefresh={handleRefresh} loading={loading}>
      {/* Stats Header */}
      <View style={styles.statsHeader}>
        <View style={styles.statItem}>
          <Icon source="paperclip" size={20} color={theme.colors.primary} />
          <Text variant="titleMedium" style={styles.statValue}>
            {attachments.length}
          </Text>
          <Text variant="bodySmall" style={styles.statLabel}>
            {t("userAttachments.attachments")}
          </Text>
        </View>

        {attachments.length > 0 && (
          <View style={styles.statItem}>
            <Icon source="harddisk" size={20} color={theme.colors.secondary} />
            <Text variant="titleMedium" style={styles.statValue}>
              {formatFileSize(totalSize)}
            </Text>
            <Text variant="bodySmall" style={styles.statLabel}>
              {t("userAttachments.totalSize")}
            </Text>
          </View>
        )}
      </View>

      {/* Attachments List */}
      {attachments.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon
            source="file-outline"
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
            {t("userAttachments.noAttachmentsFound")}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {attachments.map((attachment: any) => (
            <Card key={attachment.id} style={styles.card}>
              <Card.Content style={styles.cardContent}>
                <View style={styles.attachmentInfo}>
                  <Icon
                    source={getFileIcon(attachment.mediaType || "")}
                    size={24}
                    color={theme.colors.primary}
                  />
                  <View style={styles.textContainer}>
                    <Text
                      variant="bodyLarge"
                      style={styles.filename}
                      numberOfLines={1}
                    >
                      {attachment.filename}
                    </Text>
                    <View style={styles.detailsRow}>
                      <Text variant="bodySmall" style={styles.detailText}>
                        {formatFileSize(attachment.size || 0)}
                      </Text>
                      <Text variant="bodySmall" style={styles.detailText}>
                        •
                      </Text>
                      <Text variant="bodySmall" style={styles.detailText}>
                        {formatDate(attachment.createdAt, true)}
                      </Text>
                    </View>
                  </View>
                </View>
                <IconButton
                  icon="download"
                  size={20}
                  onPress={() =>
                    handleDownloadAttachment(attachment.id, attachment.filename)
                  }
                  iconColor={theme.colors.primary}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      )}
    </PaperScrollView>
  );
}

function getFileIcon(mediaType: string): string {
  if (mediaType.startsWith("image/")) return "file-image";
  if (mediaType.startsWith("video/")) return "file-video";
  if (mediaType.startsWith("audio/")) return "file-music";
  if (mediaType.includes("pdf")) return "file-pdf-box";
  if (mediaType.includes("text")) return "file-document";
  return "file";
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
  listContainer: {
    padding: 16,
    gap: 8,
  },
  card: {
    marginBottom: 4,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  attachmentInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  textContainer: {
    flex: 1,
    gap: 4,
  },
  filename: {
    fontWeight: "600",
  },
  detailsRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  detailText: {
    opacity: 0.7,
  },
});
