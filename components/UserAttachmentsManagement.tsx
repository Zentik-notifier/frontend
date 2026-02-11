import { useI18n } from "@/hooks/useI18n";
import React, { useState } from "react";
import {
  Alert,
  StyleSheet,
  View,
  Dimensions,
  Platform,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import { Icon, IconButton, Text, useTheme } from "react-native-paper";
import { Image } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import { useAudioPlayer, useAudioPlayerStatus } from "expo-audio";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";
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

function PreviewVideoContent({ localPath }: { localPath: string }) {
  const player = useVideoPlayer(localPath, (p) => {
    p.loop = false;
    p.muted = false;
  });
  return (
    <View style={styles.videoContainer}>
      <VideoView
        player={player}
        style={styles.previewVideo}
        contentFit="contain"
        nativeControls={true}
      />
    </View>
  );
}

function PreviewAudioContent({ localPath }: { localPath: string }) {
  const player = useAudioPlayer(localPath);
  const status = useAudioPlayerStatus(player);
  const { t } = useI18n();
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = React.useState(false);

  React.useEffect(() => {
    if (status?.playing !== undefined) setIsPlaying(status.playing);
  }, [status?.playing]);

  const togglePlay = React.useCallback(() => {
    if (isPlaying) player.pause();
    else player.play();
  }, [player, isPlaying]);

  return (
    <View style={[styles.audioContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
      <Icon source="file-music" size={64} color={theme.colors.primary} />
      <Text variant="titleMedium" style={{ marginTop: 8 }}>
        {status?.isLoaded ? t("mediaTypes.AUDIO") : t("common.loading")}
      </Text>
      {status?.isLoaded && (
        <IconButton
          icon={isPlaying ? "pause" : "play"}
          size={48}
          iconColor={theme.colors.primary}
          onPress={togglePlay}
        />
      )}
    </View>
  );
}

function PreviewFileContent({
  localPath,
  fileName,
}: {
  localPath: string;
  fileName: string;
}) {
  const { t } = useI18n();
  const theme = useTheme();

  const handleOpen = React.useCallback(async () => {
    try {
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(localPath);
      } else {
        Alert.alert(t("common.error"), t("common.actionFailed"));
      }
    } catch (error) {
      console.error("Error opening file:", error);
      Alert.alert(t("common.error"), t("common.actionFailed"));
    }
  }, [localPath, t]);

  return (
    <TouchableOpacity
      style={[styles.filePreviewContainer, { backgroundColor: theme.colors.surfaceVariant }]}
      onPress={handleOpen}
      activeOpacity={0.8}
    >
      <Text
        variant="bodyLarge"
        numberOfLines={3}
        style={[styles.filePreviewFileName, { color: theme.colors.onSurfaceVariant }]}
      >
        {fileName}
      </Text>
    </TouchableOpacity>
  );
}

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
  const [previewMediaType, setPreviewMediaType] = useState<MediaType | null>(null);
  const [previewLocalPath, setPreviewLocalPath] = useState<string>("");
  const [previewDownloading, setPreviewDownloading] = useState(false);

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
      setPreviewAttachment(attachment);
      setPreviewMediaType(mediaType);

      if (mediaType === MediaType.Image || mediaType === MediaType.Gif) {
        setPreviewUrl(downloadUrl);
        setPreviewHeaders({ Authorization: `Bearer ${token}` });
        setPreviewLocalPath("");
        return;
      }

      if (mediaType === MediaType.Video || mediaType === MediaType.Audio || mediaType === MediaType.File) {
        if (Platform.OS === "web") {
          Alert.alert(t("common.error"), t("common.notAvailableOnWeb"));
          setPreviewAttachment(null);
          setPreviewMediaType(null);
          return;
        }
        setPreviewDownloading(true);
        setPreviewUrl("");
        setPreviewHeaders({});
        try {
          const response = await fetch(downloadUrl, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!response.ok) throw new Error("Download failed");
          const arrayBuffer = await response.arrayBuffer();
          const uint8Array = new Uint8Array(arrayBuffer);
          const fileUri = `${Paths.document.uri}preview_${attachment.id}_${attachment.filename}`;
          const file = new File(fileUri);
          file.write(uint8Array, {});
          setPreviewLocalPath(fileUri);
        } catch (err) {
          console.error("Error downloading attachment:", err);
          Alert.alert(t("common.error"), t("userAttachments.unableToDownload"));
          setPreviewAttachment(null);
          setPreviewMediaType(null);
        } finally {
          setPreviewDownloading(false);
        }
      }
    } catch (error) {
      console.error("Error opening attachment preview:", error);
      Alert.alert(
        t("common.error") as string,
        t("userAttachments.unableToDownload") as string
      );
      setPreviewAttachment(null);
      setPreviewMediaType(null);
    }
  };

  const handleClosePreview = () => {
    if (previewLocalPath && Platform.OS !== "web") {
      try {
        const file = new File(previewLocalPath);
        if (file.exists) file.delete();
      } catch {}
    }
    setPreviewAttachment(null);
    setPreviewUrl("");
    setPreviewHeaders({});
    setPreviewMediaType(null);
    setPreviewLocalPath("");
  };

  const getMediaType = (mediaType: string | null): MediaType => {
    if (!mediaType) return MediaType.File;
    if (mediaType.startsWith("image/")) return MediaType.Image;
    if (mediaType.startsWith("video/")) return MediaType.Video;
    if (mediaType.startsWith("audio/")) return MediaType.Audio;
    if (mediaType.includes("gif")) return MediaType.Gif;
    if (mediaType.startsWith("application/")) return MediaType.File;
    return MediaType.File;
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

      {/* Preview Modal */}
      {previewAttachment && (
        <DetailModal
          visible={!!previewAttachment}
          onDismiss={handleClosePreview}
          title={
            previewAttachment.originalFilename ||
            previewAttachment.filename ||
            (t("userAttachments.attachments") as string)
          }
          icon={
            previewMediaType === MediaType.Video
              ? "video"
              : previewMediaType === MediaType.Audio
                ? "music"
                : previewMediaType === MediaType.File
                  ? "file-document"
                  : "image"
          }
          actions={{
            cancel: {
              label: t("common.close") as string,
              onPress: handleClosePreview,
            },
          }}
        >
          {previewDownloading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={theme.colors.primary} />
              <Text variant="bodyMedium" style={{ marginTop: 16 }}>
                {t("common.loading")}
              </Text>
            </View>
          ) : previewMediaType === MediaType.Image ||
            previewMediaType === MediaType.Gif ? (
            previewUrl && (
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
            )
          ) : previewMediaType === MediaType.Video && previewLocalPath ? (
            <PreviewVideoContent localPath={previewLocalPath} />
          ) : previewMediaType === MediaType.Audio && previewLocalPath ? (
            <PreviewAudioContent localPath={previewLocalPath} />
          ) : previewMediaType === MediaType.File && previewLocalPath ? (
            <PreviewFileContent
              localPath={previewLocalPath}
              fileName={
                previewAttachment.originalFilename || previewAttachment.filename
              }
            />
          ) : null}
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
  videoContainer: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 16,
  },
  previewVideo: {
    width: Dimensions.get("window").width - 64,
    maxWidth: 600,
    height: Dimensions.get("window").height * 0.4,
    maxHeight: 400,
    borderRadius: 8,
  },
  audioContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 8,
  },
  fileContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 8,
    gap: 16,
  },
  filePreviewContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 32,
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  filePreviewFileName: {
    textAlign: "center",
  },
  fileName: {
    textAlign: "center",
  },
  loadingContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
  },
});
