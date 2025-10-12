import { useAppContext } from "@/contexts/AppContext";
import { mediaCache } from "@/services/media-cache-service";
import { Icon } from "react-native-paper";
import { useEvent } from "expo";
import { useAudioPlayer } from "expo-audio";
import {
  Image as ExpoImage,
  ImageContentFit,
  ImageProps,
  ImageStyle,
} from "expo-image";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  PanResponder,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Text, useTheme } from "react-native-paper";
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
  noAutoDownload?: boolean;
  showMediaIndicator?: boolean;
  useThumbnail?: boolean;
  noBorder?: boolean;

  imageProps?: {
    transition?: number;
    placeholder?: any;
    blurRadius?: number;
    priority?: "low" | "normal" | "high";
    cachePolicy?: ImageProps["cachePolicy"];
    contentFit?: ImageContentFit;
  };

  videoProps?: {
    autoPlay?: boolean;
    isLooping?: boolean;
    isMuted?: boolean;
    showControls?: boolean;
  };

  audioProps?: {
    shouldPlay?: boolean;
    isLooping?: boolean;
    showControls?: boolean;
  };
}

export const CachedMedia = React.memo(function CachedMedia({
  url,
  mediaType,
  style,
  originalFileName,
  notificationDate,
  contentFit = "cover",
  onPress: onPressParent,
  isCompact,
  noAutoDownload,
  showMediaIndicator,
  useThumbnail,
  imageProps,
  videoProps,
  audioProps,
  noBorder,
}: CachedMediaProps) {
  const { t } = useI18n();
  const theme = useTheme();
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
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [videoSize, setVideoSize] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const { item: mediaSource } = useCachedItem(url, mediaType);
  const isVideoType = mediaType === MediaType.Video && !useThumbnail;
  const isAudioType = mediaType === MediaType.Audio && !useThumbnail;
  const localSource = mediaSource?.localPath;
  const videoSource = localSource && isVideoType ? localSource : null;

  const supportsThumbnail = mediaCache.isThumbnailSupported(mediaType);

  const videoPlayer = useVideoPlayer(videoSource || "", (player) => {
    if (videoSource) {
      player.loop = videoProps?.isLooping ?? true;
      player.muted = videoProps?.isMuted ?? true;

      if (videoProps?.autoPlay ?? false) {
        player.play();
      }
    }
  });

  // Get video dimensions when video track changes
  const { videoTrack } = useEvent(videoPlayer, "videoTrackChange", {
    videoTrack: videoPlayer.videoTrack,
  });

  // Update video size when track changes
  useEffect(() => {
    if (videoTrack?.size) {
      setVideoSize({
        width: videoTrack.size.width,
        height: videoTrack.size.height,
      });
    }
  }, [videoTrack]);

  const { status: videoStatus, error: videoError } = useEvent(
    videoPlayer,
    "statusChange",
    {
      status: videoPlayer.status,
    }
  );
  const isVideoError = videoSource && videoStatus === "error";
  const isVideoLoading = videoSource && videoStatus === "loading";

  useEffect(() => {
    if (isVideoError && videoError) {
      // mediaCache.markAsPermanentFailure(url, mediaType, videoError.message);
    }
  }, [videoSource, videoError]);

  const audioPlayer = useAudioPlayer(
    localSource && isAudioType ? localSource : ""
  );

  const handleForceDownload = useCallback(
    async (event?: any) => {
      event?.stopPropagation?.();
      await mediaCache.forceMediaDownload({
        url,
        mediaType,
        notificationDate,
      });
    },
    [url, mediaType, notificationDate]
  );

  const handleFrameClick = useCallback(
    async (event?: any) => {
      onPressParent?.();
    },
    [onPressParent]
  );

  const handleDeleteCachedMedia = useCallback(
    async (event?: any) => {
      event?.stopPropagation?.();
      await mediaCache.deleteCachedMedia(url, mediaType);
    },
    [url, mediaType]
  );

  const handleSeek = useCallback(
    (seekTime: number) => {
      if (audioPlayer && audioState.duration > 0) {
        audioPlayer.seekTo(seekTime);
        setSeekTime(seekTime);
      }
    },
    [audioPlayer, audioState.duration]
  );

  useEffect(() => {
    if (
      !noAutoDownload &&
      autoDownloadEnabled &&
      !mediaSource?.localPath &&
      !mediaSource?.isUserDeleted &&
      !mediaSource?.isDownloading &&
      !mediaSource?.isPermanentFailure
    ) {
      // console.log("downloadMedia", mediaSource);
      mediaCache.downloadMedia({ url, mediaType, notificationDate });
    }
  }, [mediaSource, notificationDate]);

  useEffect(() => {
    if (
      useThumbnail &&
      supportsThumbnail &&
      !mediaSource?.localThumbPath &&
      !mediaSource?.isPermanentFailure
    ) {
      // console.log("generateThumbnail", mediaSource);
      mediaCache.generateThumbnail({ url, mediaType });
    }
  }, [mediaSource, notificationDate]);

  useEffect(() => {
    if (videoSource && isVideoType && videoPlayer) {
      videoPlayer
        .replaceAsync(videoSource)
        .then(() => {
          if (videoProps?.autoPlay ?? false) {
            videoPlayer.play();
          }
        })
        .catch((error) => {
          console.error("Failed to update video player source:", error);
        });
    }
  }, [videoSource, isVideoType, videoPlayer, videoProps?.autoPlay]);

  // useEffect(() => {
  //   if (isAudioType || !audioPlayer) return;

  //   audioPlayer.loop = audioProps?.isLooping ?? false;

  //   const updateAudioState = () => {
  //     setAudioState({
  //       isLoaded: !!audioPlayer.isLoaded,
  //       duration: audioPlayer.duration || 0,
  //       currentTime: audioPlayer.currentTime || 0,
  //     });
  //   };

  //   updateAudioState();
  //   const interval = setInterval(updateAudioState, 500);

  //   return () => clearInterval(interval);
  // }, [mediaSource?.localPath, audioPlayer, audioProps, mediaType]);

  const renderSeekBar = () => {
    if (!audioState.isLoaded || audioState.duration <= 0) return null;

    const progress = isSeeking
      ? (seekTime / audioState.duration) * 100
      : (audioState.currentTime / audioState.duration) * 100;

    const panResponder = PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsSeeking(true);
        const { locationX } = evt.nativeEvent;
        const seekBarWidth = 200; // Larghezza fissa della seek bar
        const newSeekTime = (locationX / seekBarWidth) * audioState.duration;
        setSeekTime(Math.max(0, Math.min(audioState.duration, newSeekTime)));
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const seekBarWidth = 200; // Larghezza fissa della seek bar
        const newSeekTime = (locationX / seekBarWidth) * audioState.duration;
        setSeekTime(Math.max(0, Math.min(audioState.duration, newSeekTime)));
      },
      onPanResponderRelease: () => {
        handleSeek(seekTime);
        setIsSeeking(false);
      },
    });

    return (
      <View style={defaultStyles.seekBarContainer}>
        <View style={defaultStyles.seekBar} {...panResponder.panHandlers}>
          <View style={defaultStyles.seekBarTrack}>
            <View
              style={[defaultStyles.seekBarProgress, { width: `${progress}%` }]}
            />
          </View>
          <View
            style={[defaultStyles.seekBarThumb, { left: `${progress}%` }]}
          />
        </View>
      </View>
    );
  };

  const renderTypeIndicator = () => {
    return (
      <View style={[defaultStyles.typeIndicator]}>
        <MediaTypeIcon mediaType={mediaType} size={20} secondary />
      </View>
    );
  };

  const renderSmallTypeIndicator = () => {
    return (
      <View style={[defaultStyles.smallTypeIndicator]}>
        <MediaTypeIcon mediaType={mediaType} size={12} secondary />
      </View>
    );
  };

  const stateColors = {
    loading: theme.colors.onSurfaceVariant,
    downloading: theme.colors.primary,
    deleted: theme.colors.primary,
    failed: theme.colors.error,
    videoError: theme.colors.tertiary,
  };

  const stateBackgrounds = {
    loading: theme.colors.surfaceVariant,
    downloading: theme.colors.primaryContainer,
    deleted: theme.colors.surface,
    failed: theme.colors.errorContainer,
    videoError: theme.colors.tertiaryContainer,
  };

  const getStateContainerStyle = (stateType: keyof typeof stateColors) => {
    const baseStyle = isCompact
      ? defaultStyles.stateContainerCompact
      : defaultStyles.stateContainer;

    const dashed = { borderStyle: noBorder ? "solid" : "dashed" };

    if (!isCompact) {
      return [
        baseStyle,
        {
          backgroundColor: stateBackgrounds[stateType],
          borderColor: stateColors[stateType],
        },
        dashed,
        style,
      ];
    }

    return [baseStyle, dashed, style];
  };

  const renderForceDownloadButton = (icon: string, withDelete?: boolean) => {
    const primaryColor = theme.colors.primary;
    const errorColor = theme.colors.error;
    const onPrimaryColor = theme.colors.onPrimary;
    const onErrorColor = theme.colors.onError;

    return (
      <View style={defaultStyles.buttonContainer}>
        {/* Pulsante sinistro (download/refresh) */}
        <Pressable
          onPress={handleForceDownload}
          style={[
            defaultStyles.actionButton,
            isCompact
              ? {
                  backgroundColor: "transparent",
                }
              : {
                  backgroundColor: primaryColor,
                },
            isCompact
              ? defaultStyles.compactButton
              : defaultStyles.rectangularButton,
          ]}
        >
          <Icon
            source={icon}
            size={isCompact ? 25 : 20}
            color={isCompact ? primaryColor : onPrimaryColor}
          />
          {!isCompact && (
            <Text style={[defaultStyles.buttonText, { color: onPrimaryColor }]}>
              {t("cachedMedia.forceDownload")}
            </Text>
          )}
        </Pressable>

        {/* Pulsante destro (delete) */}
        {withDelete && !isCompact && (
          <Pressable
            onPress={handleDeleteCachedMedia}
            style={[
              defaultStyles.actionButton,
              defaultStyles.rectangularButton,
              { backgroundColor: errorColor },
            ]}
          >
            <Icon source="delete" size={20} color={onErrorColor} />
            <Text style={[defaultStyles.buttonText, { color: onErrorColor }]}>
              {t("cachedMedia.delete")}
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  const getStateTextStyle = (stateType: keyof typeof stateColors) => {
    return [defaultStyles.stateText, { color: stateColors[stateType] }];
  };

  const renderMedia = () => {
    // Loading states
    if (
      (mediaSource?.generatingThumbnail && useThumbnail) ||
      mediaSource?.isDownloading ||
      isVideoLoading
    ) {
      const stateType = mediaSource?.isDownloading ? "downloading" : "loading";
      return (
        <View style={getStateContainerStyle(stateType) as any}>
          <ActivityIndicator size="small" color={stateColors[stateType]} />
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

    // Permanent failure - click to retry
    if (mediaSource?.isPermanentFailure || isVideoError) {
      return (
        <View
          style={[
            getStateContainerStyle("failed") as any,
            defaultStyles.stateContent,
            { borderColor: stateColors.failed },
          ]}
        >
          {renderForceDownloadButton("alert-circle-outline", true)}
        </View>
      );
    }

    // User deleted - click to redownload
    if (mediaSource?.isUserDeleted) {
      return (
        <View
          style={[
            getStateContainerStyle("deleted") as any,
            defaultStyles.stateContent,
            { borderColor: stateColors.failed },
          ]}
        >
          {renderForceDownloadButton("refresh", false)}
        </View>
      );
    }

    // LocalPath not present ??
    if (!mediaSource?.localPath) {
      return (
        <View
          style={[
            getStateContainerStyle("deleted") as any,
            defaultStyles.stateContent,
            { color: stateColors.failed },
          ]}
        >
          {renderForceDownloadButton("download", false)}
        </View>
      );
    }

    if (useThumbnail && supportsThumbnail) {
      const thumbPath = mediaSource?.localThumbPath;
      if (thumbPath) {
        return (
          <Pressable onPress={handleFrameClick}>
            <ExpoImage
              source={{ uri: thumbPath }}
              style={
                isCompact
                  ? ([
                      defaultStyles.stateContainerCompact,
                      style,
                    ] as StyleProp<ImageStyle>)
                  : (style as StyleProp<ImageStyle>)
              }
              contentFit={
                isCompact ? "cover" : imageProps?.contentFit ?? contentFit
              }
              transition={imageProps?.transition ?? 150}
              cachePolicy={imageProps?.cachePolicy || "memory"}
            />
          </Pressable>
        );
      }

      return (
        <View
          style={[
            getStateContainerStyle("videoError") as any,
            defaultStyles.stateContent,
            { borderColor: stateColors.failed },
          ]}
        >
          {renderForceDownloadButton("image-outline", true)}
        </View>
      );
    }

    // Media content rendering (full media when not using thumbnails)
    if (mediaSource.localPath) {
      switch (mediaType) {
        case MediaType.Image:
        case MediaType.Icon:
        case MediaType.Gif:
          return (
            <Pressable onPress={handleFrameClick}>
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
                contentFit={
                  isCompact ? "cover" : imageProps?.contentFit ?? contentFit
                }
                transition={imageProps?.transition ?? 200}
                placeholder={imageProps?.placeholder}
                blurRadius={imageProps?.blurRadius}
                priority={imageProps?.priority}
                cachePolicy={imageProps?.cachePolicy || "memory"}
                onError={(event) => {
                  mediaCache.markAsPermanentFailure(
                    url,
                    mediaType,
                    event.error
                  );
                }}
              />
            </Pressable>
          );

        case MediaType.Video:
          const showControls = videoProps?.showControls ?? true;
          return (
            <View
              style={{
                position: "relative",
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <VideoView
                style={
                  isCompact
                    ? [defaultStyles.stateContainerCompact, style]
                    : [
                        style,
                        {
                          position: "relative",
                          maxWidth: "100%",
                          maxHeight: "100%",
                          // Use actual video dimensions if available, otherwise fallback to 16:9
                          aspectRatio: videoSize
                            ? videoSize.width / videoSize.height
                            : 16 / 9,
                          // Set specific dimensions based on video size when available
                          ...(videoSize &&
                            !isCompact && {
                              width: Math.min(videoSize.width, 400), // Max width constraint
                              height: Math.min(videoSize.height, 300), // Max height constraint
                            }),
                        },
                      ]
                }
                player={videoPlayer}
                nativeControls={showControls && !isCompact}
                allowsPictureInPicture={showControls}
                fullscreenOptions={{
                  enable: showControls && !isCompact,
                  orientation: "default", // Allow device orientation changes
                  autoExitOnRotate: false, // Don't exit fullscreen on rotation
                }}
              />
              {!showControls && (
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: "transparent",
                  }}
                  onPress={handleFrameClick}
                  activeOpacity={1}
                />
              )}
            </View>
          );

        case MediaType.Audio:
          if (isCompact) {
            return (
              <Pressable onPress={handleFrameClick}>
                <View style={[defaultStyles.stateContainerCompact, style]}>
                  <Pressable
                    onPress={() => {
                      audioPlayer?.playing
                        ? audioPlayer.pause()
                        : audioPlayer?.play();
                    }}
                  >
                    <View style={defaultStyles.compactAudioButton}>
                      <Icon
                        source={audioPlayer?.playing ? "pause" : "play"}
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
            <View style={[defaultStyles.audioContainer, style]}>
              <View style={defaultStyles.audioContent}>
                {audioProps?.showControls !== false && (
                  <Pressable
                    onPress={() => {
                      audioPlayer?.playing
                        ? audioPlayer.pause()
                        : audioPlayer?.play();
                    }}
                  >
                    <View style={defaultStyles.playButton}>
                      <Icon
                        source={audioPlayer?.playing ? "pause" : "play"}
                        size={24}
                        color="white"
                      />
                    </View>
                  </Pressable>
                )}

                <Pressable
                  onPress={handleFrameClick}
                  style={defaultStyles.audioInfoPressable}
                >
                  <View style={defaultStyles.audioInfo}>
                    <Text style={defaultStyles.audioTitle}>
                      {originalFileName || "Audio"}
                    </Text>
                    {!isCompact && (
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
                    )}
                  </View>
                </Pressable>
              </View>

              {renderSeekBar()}
            </View>
          );
      }
    }
  };

  return (
    <View style={style}>
      {renderMedia()}
      {showMediaIndicator &&
        (isCompact ? renderSmallTypeIndicator() : renderTypeIndicator())}
    </View>
  );
});

const defaultStyles = StyleSheet.create({
  // Base container riusabile per tutti gli stati
  stateContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
    borderRadius: 6,
    borderWidth: 1,
    height: "100%",
    width: "100%",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // Container compatto riusabile
  stateContainerCompact: {
    justifyContent: "center",
    alignItems: "center",
    height: "100%",
    width: "100%",
    aspectRatio: 1,
    borderWidth: 1,
    backgroundColor: "#f8f8f8",
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
    backgroundColor: "#ffffff",
    padding: 20,
    minHeight: 120,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  audioInfoPressable: {
    flex: 1,
    alignItems: "center",
  },
  audioContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
    width: "100%",
    marginBottom: 16,
  },
  playButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#007AFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#007AFF",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  audioInfo: {
    flex: 1,
    alignItems: "center",
  },
  audioTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
    textAlign: "center",
  },
  audioDuration: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
  },

  // Seek bar styles
  seekBarContainer: {
    width: "100%",
    alignItems: "center",
  },
  seekBar: {
    width: 200,
    height: 20,
    justifyContent: "center",
  },
  seekBarTrack: {
    height: 4,
    backgroundColor: "#e0e0e0",
    borderRadius: 2,
    position: "relative",
  },
  seekBarProgress: {
    height: 4,
    backgroundColor: "#007AFF",
    borderRadius: 2,
    position: "absolute",
    left: 0,
    top: 0,
  },
  seekBarThumb: {
    width: 16,
    height: 16,
    backgroundColor: "#007AFF",
    borderRadius: 8,
    position: "absolute",
    top: 2,
    marginLeft: -8,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
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

  // Container per i pulsanti di azione
  buttonContainer: {
    flexDirection: "row",
    gap: 8,
  },

  // Pulsante circolare per modalità compatta
  compactButton: {
    flexDirection: "row",
    alignItems: "center",
  },

  // Pulsante rettangolare per modalità normale
  rectangularButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  // Testo del pulsante
  buttonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
