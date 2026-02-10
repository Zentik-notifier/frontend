import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import { Alert, StyleSheet, View, Dimensions } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import PaperScrollView from "./ui/PaperScrollView";
import {
  useUserAttachmentsQuery,
  useDeleteAttachmentMutation,
  MediaType,
  AttachmentFragment,
  UserAttachmentsDocument,
} from "@/generated/gql-operations-generated";
import { useAppContext } from "@/contexts/AppContext";
import { SwipeableAttachmentItem } from "./SwipeableAttachmentItem";
import DetailModal from "./ui/DetailModal";
import { settingsService } from "@/services/settings-service";

export function UserAttachmentsManagement() {
  const { t } = useI18n();
  const theme = useTheme();
  const { userId } = useAppContext();
  const [previewAttachment, setPreviewAttachment] =
    useState<AttachmentFragment | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [previewHeaders, setPreviewHeaders] = useState<Record<string, string>>(
    {}
  );

  const { data, loading, refetch } = useUserAttachmentsQuery({
    variables: { userId: userId || "" },
    skip: !userId,
    fetchPolicy: "network-only",
  });

  const [deleteAttachmentMutation, { loading: deleting }] =
    useDeleteAttachmentMutation({
      refetchQueries: [
        { query: UserAttachmentsDocument, variables: { userId: userId || "" } },
      ],
    });

  const attachments = data?.userAttachments || [];
  const loadingState = loading;

  const handleRefresh = async () => {
    await refetch();
  };

  const handleDeleteAttachment = async (attachmentId: string) => {
    Alert.alert(
      t("common.delete") as string,
      t("userAttachments.confirmDelete") as string,
      [
        {
          text: t("common.cancel") as string,
          style: "cancel",
        },
        {
          text: t("common.delete") as string,
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAttachmentMutation({
                variables: { id: attachmentId },
              });
            } catch (error: any) {
              console.error("Error deleting attachment:", error);
              Alert.alert(
                t("common.error") as string,
                error?.message || (t("userAttachments.deleteFailed") as string)
              );
            }
          },
        },
      ]
    );
  };

  const handleAttachmentPress = async (attachment: AttachmentFragment) => {
    const mediaType = getMediaType(attachment.mediaType);

    // Mostra il modal solo per immagini e GIF
    if (mediaType !== MediaType.Image && mediaType !== MediaType.Gif) {
      return;
    }

    try {
      const apiUrl = await settingsService.getApiUrl();
      const token = settingsService.getAuthData().accessToken;

      if (!apiUrl || !token) {
        Alert.alert(
          t("common.error") as string,
          t("userAttachments.unableToDownload") as string
        );
        return;
      }

      const downloadUrl = `${apiUrl}/api/v1/attachments/${attachment.id}/download`;
      setPreviewUrl(downloadUrl);
      setPreviewHeaders({
        Authorization: `Bearer ${token}`,
      });
      setPreviewAttachment(attachment);
    } catch (error) {
      console.error("Error opening attachment preview:", error);
      Alert.alert(
        t("common.error") as string,
        t("userAttachments.unableToDownload") as string
      );
    }
  };

  const handleClosePreview = () => {
    setPreviewAttachment(null);
    setPreviewUrl("");
    setPreviewHeaders({});
  };

  const getMediaType = (mediaType: string | null): MediaType => {
    if (!mediaType) return MediaType.Image;
    if (mediaType.startsWith("image/")) return MediaType.Image;
    if (mediaType.startsWith("video/")) return MediaType.Video;
    if (mediaType.startsWith("audio/")) return MediaType.Audio;
    if (mediaType.includes("gif")) return MediaType.Gif;
    return MediaType.Image;
  };

  return (
    <PaperScrollView onRefresh={handleRefresh} loading={loadingState}>
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
        <View>
          {attachments.map((attachment) => (
            <SwipeableAttachmentItem
              key={attachment.id}
              attachment={attachment}
              onDelete={handleDeleteAttachment}
              onPress={handleAttachmentPress}
            />
          ))}
        </View>
      )}

      {/* Image Preview Modal */}
      {previewAttachment && previewUrl && (
        <DetailModal
          visible={!!previewAttachment}
          onDismiss={handleClosePreview}
          title={
            previewAttachment.originalFilename ||
            previewAttachment.filename ||
            (t("userAttachments.attachments") as string)
          }
          icon="image"
          actions={{
            cancel: {
              label: t("common.close") as string,
              onPress: handleClosePreview,
            },
          }}
        >
          <View style={styles.imageContainer}>
            <Image
              source={{
                uri: previewUrl,
                headers: previewHeaders,
              }}
              style={styles.previewImage}
              contentFit="contain"
              transition={200}
              cachePolicy="none"
              recyclingKey={`attachment-preview-${previewUrl}`}
            />
          </View>
        </DetailModal>
      )}
    </PaperScrollView>
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
  imageContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
  },
  previewImage: {
    width: Dimensions.get("window").width - 64,
    maxWidth: 600,
    height: Dimensions.get("window").height * 0.5,
    maxHeight: 600,
    borderRadius: 8,
  },
});
