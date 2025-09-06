import { useAppContext } from "@/services/app-context";
import { mediaCache } from "@/services/media-cache";
import { Ionicons } from "@expo/vector-icons";
import { useEvent } from "expo";
import { useAudioPlayer } from "expo-audio";
import { Image as ExpoImage, ImageContentFit, ImageStyle } from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import { MediaType } from "../generated/gql-operations-generated";
import { useI18n } from "../hooks/useI18n";
import { useCachedItem } from "../hooks/useMediaCache";
import { MediaTypeIcon } from "./MediaTypeIcon";

interface CachedMediaProps {
  url: string;
  mediaType: MediaType;
  style?: StyleProp<ImageStyle | ViewStyle>;
  originalFileName?: string;
  notificationDate?: number;
  contentFit?: ImageContentFit;
  onPress?: () => void;
  isCompact?: boolean;
  smallButtons?: boolean;
  noAutoDownload?: boolean;
  showMediaIndicator?: boolean;

  imageProps?: {
    transition?: number;
    placeholder?: any;
    blurRadius?: number;
    priority?: "low" | "normal" | "high";
    contentFit?: ImageContentFit;
  };

  videoProps?: {
    autoPlay?: boolean;
    isLooping?: boolean;
    isMuted?: boolean;
  };

  audioProps?: {
    shouldPlay?: boolean;
    isLooping?: boolean;
    showControls?: boolean;
  };
}

export function CachedMedia({
  url,
  mediaType,
  style,
  originalFileName,
  notificationDate,
  contentFit = "cover",
  onPress,
  isCompact,
  smallButtons,
  noAutoDownload,
  showMediaIndicator,
  imageProps,
  videoProps,
  audioProps,
}: CachedMediaProps) {
  const { t } = useI18n();
  const {
    userSettings: {
      settings: {
        mediaCache: {
          downloadSettings: { autoDownloadEnabled },
        },
      },
    },
  } = useAppContext();
  const [audioState, setAudioState] = useState({
    isLoaded: false,
    duration: 0,
    currentTime: 0,
  });
  const { item: mediaSource } = useCachedItem(url, mediaType);
  const isVideoType = mediaType === MediaType.Video;

  const localSource = mediaSource?.localPath;
  const videoSource = localSource && isVideoType ? localSource : null;

  const videoPlayer = useVideoPlayer(videoSource || "", (player) => {
    if (videoSource) {
      player.loop = videoProps?.isLooping ?? true;
      player.muted = videoProps?.isMuted ?? true;

      if (videoProps?.autoPlay ?? true) {
        player.play();
      }
    }
  });
  const { status: videoStatus } = useEvent(videoPlayer, "statusChange", {
    status: videoPlayer.status,
  });
  const isVideoError = videoSource && videoStatus === "error";
  const isVideoLoading = videoSource && videoStatus === "loading";

  const handleForceDownload = useCallback(async () => {
    await mediaCache.forceMediaDownload({
      url,
      mediaType,
      notificationDate,
    });
  }, [url, mediaType, notificationDate]);

  const renderTypeIndicator = () => {
    return (
      <View style={[defaultStyles.typeIndicator]}>
        <MediaTypeIcon mediaType={mediaType} size={20} secondary />
      </View>
    );
  };

  const renderSmallTypeIndicator = () => {
    if (!smallButtons) return null;

    return (
      <View style={[defaultStyles.smallTypeIndicator]}>
        <MediaTypeIcon mediaType={mediaType} size={12} secondary />
      </View>
    );
  };

  const stateColors = {
    loading: "#666",
    downloading: "#007AFF",
    deleted: "#007AFF",
    failed: "#FF3B30",
    videoError: "#FF9500",
  };

  const stateBackgrounds = {
    loading: "#f5f5f5",
    downloading: "#f0f8ff",
    deleted: "#fafafa",
    failed: "#fff5f5",
    videoError: "#fffbf0",
  };

  const getStateContainerStyle = (stateType: keyof typeof stateColors) => {
    const baseStyle = isCompact
      ? defaultStyles.stateContainerCompact
      : defaultStyles.stateContainer;

    if (!isCompact) {
      return [
        baseStyle,
        {
          backgroundColor: stateBackgrounds[stateType],
          borderColor: stateColors[stateType],
        },
        style,
      ];
    }

    return [baseStyle, style];
  };

  const renderForceDownloadButton = (withDelete?: boolean) => {
    return !isCompact ? (
      <View style={defaultStyles.buttonContainer}>
        <Pressable
          onPress={handleForceDownload}
          style={
            smallButtons
              ? defaultStyles.smallDownloadButton
              : defaultStyles.forceDownloadButton
          }
        >
          {smallButtons ? (
            <Ionicons name="download" size={16} color="white" />
          ) : (
            <Text style={defaultStyles.forceDownloadButtonText}>
              {t("cachedMedia.forceDownload")}
            </Text>
          )}
        </Pressable>
        {withDelete && (
          <Pressable
            onPress={() => mediaCache.deleteCachedMedia(url, mediaType)}
            style={
              smallButtons
                ? defaultStyles.smallDeleteButton
                : defaultStyles.deleteButton
            }
          >
            {smallButtons ? (
              <Ionicons name="trash" size={16} color="white" />
            ) : (
              <Text style={defaultStyles.deleteButtonText}>
                {t("cachedMedia.delete")}
              </Text>
            )}
          </Pressable>
        )}
      </View>
    ) : null;
  };

  const getStateTextStyle = (stateType: keyof typeof stateColors) => {
    return [defaultStyles.stateText, { color: stateColors[stateType] }];
  };

  const getStateSecondaryTextStyle = (stateType: keyof typeof stateColors) => {
    return [
      defaultStyles.stateSecondaryText,
      { color: stateColors[stateType] },
    ];
  };

  const renderMedia = () => {
    // Loading states
    if (mediaSource?.isDownloading || isVideoLoading) {
      const stateType = mediaSource?.isDownloading ? "downloading" : "loading";
      return (
        <View style={getStateContainerStyle(stateType) as any}>
          <ActivityIndicator
            size="small"
            color={isCompact ? "#fff" : stateColors[stateType]}
          />
          {!isCompact && (
            <Text style={getStateTextStyle(stateType)}>
              {mediaSource?.isDownloading
                ? t("cachedMedia.downloadProgress")
                : t("cachedMedia.loadingProgress")}
            </Text>
          )}
        </View>
      );
    }

    // Video error state
    if (isVideoError) {
      return (
        <View style={getStateContainerStyle("videoError") as any}>
          <View style={defaultStyles.stateContent}>
            <Ionicons
              name="warning-outline"
              size={isCompact ? 20 : 24}
              color={isCompact ? "#fff" : stateColors.videoError}
              onPress={isCompact ? handleForceDownload : undefined}
            />
            {/* {!isCompact && (
              <Text style={getStateTextStyle("videoError")}>
                {t("cachedMedia.videoError")}
              </Text>
            )} */}
          </View>
          {renderForceDownloadButton(true)}
        </View>
      );
    }

    // No media source
    if (!mediaSource) {
      if (isCompact) {
        return (
          <View style={getStateContainerStyle("loading")}>
            <MediaTypeIcon mediaType={mediaType} size={20} />
          </View>
        );
      }
      return null;
    }

    // Permanent failure - click to retry
    if (mediaSource.isPermanentFailure) {
      return (
        <View style={getStateContainerStyle("failed") as any}>
          <View style={defaultStyles.stateContent}>
            {/* {!isCompact && mediaSource.errorCode && (
               <Text style={getStateSecondaryTextStyle("failed")}>
                 {mediaSource.errorCode}
               </Text>
             )} */}
            <Ionicons
              name="warning-outline"
              size={isCompact ? 20 : 24}
              color={isCompact ? "#fff" : stateColors.failed}
              onPress={isCompact ? handleForceDownload : undefined}
            />
          </View>
          {renderForceDownloadButton(true)}
        </View>
      );
    }

    // User deleted - click to redownload
    if (mediaSource.isUserDeleted || !mediaSource.localPath) {
      return (
        <View style={getStateContainerStyle("deleted") as any}>
          <View style={defaultStyles.stateContent}>
            <Ionicons
              name="download-outline"
              size={isCompact ? 20 : 24}
              color={isCompact ? "#fff" : stateColors.deleted}
              onPress={isCompact ? handleForceDownload : undefined}
            />
          </View>
          {renderForceDownloadButton(!mediaSource.isUserDeleted)}
        </View>
      );
    }

    // Media content rendering
    if (mediaSource.localPath) {
      switch (mediaType) {
        case MediaType.Image:
        case MediaType.Icon:
        case MediaType.Gif:
          return (
            <Pressable onPress={onPress}>
              <ExpoImage
                source={{ uri: mediaSource.localPath }}
                style={
                  isCompact
                    ? ([
                        defaultStyles.stateContainerCompact,
                        style,
                      ] as StyleProp<ImageStyle>)
                    : (style as StyleProp<ImageStyle>)
                }
                contentFit={imageProps?.contentFit ?? contentFit}
                transition={imageProps?.transition ?? 200}
                placeholder={imageProps?.placeholder}
                blurRadius={imageProps?.blurRadius}
                priority={imageProps?.priority}
                cachePolicy={"memory"}
              />
            </Pressable>
          );

        case MediaType.Video:
          const videoContent = (
            <VideoView
              style={
                isCompact ? [defaultStyles.stateContainerCompact, style] : style
              }
              player={videoPlayer}
              allowsFullscreen={!isCompact}
              allowsPictureInPicture={!isCompact}
              showsTimecodes={!isCompact}
            />
          );

          if (isCompact) {
            return (
              <Pressable onPress={onPress}>
                <View>{videoContent}</View>
              </Pressable>
            );
          }

          return (
            <Pressable onPress={onPress}>
              <View style={{ position: "relative" }}>{videoContent}</View>
            </Pressable>
          );

        case MediaType.Audio:
          if (isCompact) {
            return (
              <Pressable onPress={onPress}>
                <View style={getStateContainerStyle("loading") as any}>
                  <Pressable
                    onPress={() =>
                      audioPlayer?.playing
                        ? audioPlayer.pause()
                        : audioPlayer?.play()
                    }
                  >
                    <View style={defaultStyles.compactAudioButton}>
                      <Ionicons
                        name={audioPlayer?.playing ? "pause" : "play"}
                        size={16}
                        color="#007AFF"
                      />
                    </View>
                  </Pressable>
                </View>
              </Pressable>
            );
          }

          return (
            <Pressable onPress={onPress}>
              <View style={[defaultStyles.audioContainer, style]}>
                {audioProps?.showControls !== false && (
                  <Pressable
                    onPress={() =>
                      audioPlayer?.playing
                        ? audioPlayer.pause()
                        : audioPlayer?.play()
                    }
                  >
                    <View style={defaultStyles.playButton}>
                      <Ionicons
                        name={audioPlayer?.playing ? "pause" : "play"}
                        size={20}
                        color="white"
                      />
                    </View>
                  </Pressable>
                )}

                <View style={defaultStyles.audioInfo}>
                  <Text style={defaultStyles.audioTitle}>
                    {originalFileName || "Audio"}
                  </Text>
                  <Text style={defaultStyles.audioDuration}>
                    {audioState.isLoaded && audioState.duration > 0
                      ? `${Math.floor(
                          audioState.currentTime / 60
                        )}:${Math.floor(audioState.currentTime % 60)
                          .toString()
                          .padStart(2, "0")} / ${Math.floor(
                          audioState.duration / 60
                        )}:${Math.floor(audioState.duration % 60)
                          .toString()
                          .padStart(2, "0")}`
                      : audioState.isLoaded
                      ? "Pronto per la riproduzione"
                      : "Caricamento..."}
                  </Text>
                </View>
              </View>
            </Pressable>
          );

        default:
          return (
            <Pressable onPress={onPress}>
              <View style={getStateContainerStyle("loading") as any}>
                {isCompact ? (
                  <MediaTypeIcon mediaType={mediaType} size={20} />
                ) : (
                  <Text style={defaultStyles.genericText}>📄</Text>
                )}
              </View>
            </Pressable>
          );
      }
    }

    // Default fallback
    return (
      <Pressable onPress={onPress}>
        <View style={getStateContainerStyle("loading") as any}>
          <MediaTypeIcon mediaType={mediaType} size={isCompact ? 20 : 24} />
        </View>
      </Pressable>
    );
  };

  useEffect(() => {
    if (!noAutoDownload && autoDownloadEnabled && !mediaSource?.localPath) {
      mediaCache.downloadMedia({ url, mediaType, notificationDate });
    }
  }, [mediaSource, notificationDate]);

  useEffect(() => {
    if (videoSource && isVideoType && videoPlayer) {
      videoPlayer
        .replaceAsync(videoSource)
        .then(() => {
          if (videoProps?.autoPlay ?? true) {
            videoPlayer.play();
          }
        })
        .catch((error) => {
          console.error("Failed to update video player source:", error);
        });
    }
  }, [videoSource, isVideoType, videoPlayer, videoProps?.autoPlay]);

  const audioPlayer = useAudioPlayer(
    localSource && mediaType === MediaType.Audio ? localSource : ""
  );

  useEffect(() => {
    if (mediaType !== MediaType.Audio || !audioPlayer) return;

    audioPlayer.loop = audioProps?.isLooping ?? false;

    const updateAudioState = () => {
      setAudioState({
        isLoaded: !!audioPlayer.isLoaded,
        duration: audioPlayer.duration || 0,
        currentTime: audioPlayer.currentTime || 0,
      });
    };

    updateAudioState();
    const interval = setInterval(updateAudioState, 500);

    return () => clearInterval(interval);
  }, [mediaSource?.localPath, audioPlayer, audioProps, mediaType]);

  return (
    <View style={style}>
      {renderMedia()}
      {showMediaIndicator && !smallButtons && renderTypeIndicator()}
      {showMediaIndicator && smallButtons && renderSmallTypeIndicator()}
    </View>
  );
}

const defaultStyles = StyleSheet.create({
  // Base container riusabile per tutti gli stati
  stateContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    borderWidth: 1,
    borderStyle: "dashed",
    height: "100%",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Container compatto riusabile
  stateContainerCompact: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 40,
    minWidth: 40,
  },

  // Contenuto centralizzato per gli stati
  stateContent: {
    alignItems: "center",
    justifyContent: "center",
  },

  // Button per azioni specifiche (testi + icone)
  actionButton: {
    alignItems: "center",
    justifyContent: "center",
    padding: 10,
    borderRadius: 4,
  },

  // Testo base riusabile
  stateText: {
    marginTop: 8,
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },

  // Testo secondario per codici errore
  stateSecondaryText: {
    marginTop: 4,
    fontSize: 10,
    fontWeight: "500",
    textAlign: "center",
  },

  // Audio container specifico (non riusabile per altri stati)
  audioContainer: {
    backgroundColor: "#f0f0f0",
    borderRadius: 8,
    padding: 16,
    minHeight: 80,
  },
  audioContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  playButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 4,
  },
  audioDuration: {
    fontSize: 12,
    color: "#666",
  },

  // Stili per contenuti specifici
  genericText: {
    fontSize: 24,
  },
  typeIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    minWidth: 32,
    alignItems: "center",
  },
  smallTypeIndicator: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 20,
    height: 20,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  typeIndicatorText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },

  // Audio button per modalità compatta
  compactAudioButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#007AFF",
  },

  // Container per i pulsanti
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },

  // Pulsante per forzare il download
  forceDownloadButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#007AFF",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // Testo del pulsante di download forzato
  forceDownloadButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },

  // Pulsante per eliminare
  deleteButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "#FF3B30",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },

  // Testo del pulsante di eliminazione
  deleteButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "white",
  },

  // Pulsante piccolo download
  smallDownloadButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#007AFF",
    alignItems: "center",
    justifyContent: "center",
  },

  // Pulsante piccolo elimina
  smallDeleteButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FF3B30",
    alignItems: "center",
    justifyContent: "center",
  },
});
