import { mediaCache } from "@/services/media-cache-service";
import { saveMediaToGallery } from "@/services/media-gallery";
import { useEvent } from "expo";
import { useAudioPlayer } from "expo-audio";
import * as Clipboard from "expo-clipboard";
import {
  Image as ExpoImage,
  ImageContentFit,
  ImageProps,
  ImageStyle,
} from "expo-image";
import * as Sharing from "expo-sharing";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  PanResponder,
  Platform,
  StyleProp,
  StyleSheet,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { Pressable } from "react-native-gesture-handler";
import {
  Icon,
  List,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
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
  onPress?: () => void;
  isCompact?: boolean;
  showMediaIndicator?: boolean;
  useThumbnail?: boolean;
  autoPlay?: boolean;
  showControls?: boolean;
  cache?: boolean;
}

export const CachedMedia = React.memo(function CachedMedia({
  url,
  mediaType,
  style,
  originalFileName,
  notificationDate,
  onPress: onPressParent,
  isCompact,
  showMediaIndicator,
  useThumbnail,
  autoPlay,
  cache,
  showControls,
}: CachedMediaProps) {
  const { t } = useI18n();
  const theme = useTheme();
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
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  const {
    item: mediaSource,
    isLoading,
    isError,
    isDeleted,
    forceDownload,
    remove,
  } = useCachedItem(url, mediaType, {
    priority: useThumbnail ? 3 : 7, // Priorità più alta per media completi
    notificationDate,
  });

  const isVideoType = mediaType === MediaType.Video && !useThumbnail;
  const isAudioType = mediaType === MediaType.Audio && !useThumbnail;
  const localSource = mediaSource?.localPath;
  const videoSource = localSource && isVideoType ? localSource : null;

  const supportsThumbnail = mediaCache.isThumbnailSupported(mediaType);

  const videoPlayer = useVideoPlayer(videoSource || "", (player) => {
    if (videoSource) {
      player.loop = true;
      player.muted = true;

      if (autoPlay) {
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

  // Auto-generate thumbnail if using thumbnail mode but thumbnail doesn't exist
  useEffect(() => {
    if (useThumbnail && supportsThumbnail) {
      mediaCache
        .tryGenerateThumbnail({
          url,
          mediaType,
          notificationId: mediaSource?.notificationId,
        })
        .then((queued) => {
          if (queued) {
            console.log(
              "[CachedMedia] Auto-generating missing thumbnail for:",
              url
            );
          }
        })
        .catch((e) => {
          console.warn("[CachedMedia] Failed to auto-generate thumbnail:", e);
        });
    }
  }, [
    useThumbnail,
    supportsThumbnail,
    mediaSource?.localPath,
    mediaSource?.localThumbPath,
    mediaSource?.generatingThumbnail,
    mediaSource?.isPermanentFailure,
    mediaSource?.notificationId,
    url,
    mediaType,
  ]);

  const audioPlayer = useAudioPlayer(
    localSource && isAudioType ? localSource : ""
  );

  const handleForceDownload = useCallback(
    async (event?: any) => {
      event?.stopPropagation?.();
      await forceDownload(); // Usa forceDownload dal hook
    },
    [forceDownload]
  );

  const handleFrameClick = useCallback(
    async (event?: any) => {
      if (!isContextMenuOpen) {
        onPressParent?.();
      }
    },
    [onPressParent, isContextMenuOpen]
  );

  const handleLongPress = useCallback(() => {
    setIsContextMenuOpen(true);
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setIsContextMenuOpen(false);
  }, []);

  const handleCopyUrl = useCallback(async () => {
    try {
      await Clipboard.setStringAsync(url);
      handleCloseContextMenu();
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  }, [url, t, handleCloseContextMenu]);

  const handleShare = useCallback(async () => {
    try {
      if (Platform.OS === "web") {
        Alert.alert(t("common.error"), t("common.notAvailableOnWeb"));
        handleCloseContextMenu();
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t("common.error"), t("common.shareNotAvailable"));
        handleCloseContextMenu();
        return;
      }

      const localPath = mediaSource?.localPath;
      if (localPath) {
        await Sharing.shareAsync(localPath);
      } else {
        Alert.alert(t("common.error"), t("common.unableToShare"));
      }
      handleCloseContextMenu();
    } catch (error) {
      console.error("Failed to share:", error);
      Alert.alert(t("common.error"), t("common.unableToShare"));
      handleCloseContextMenu();
    }
  }, [mediaSource?.localPath, t, handleCloseContextMenu]);

  const handleSaveToGallery = useCallback(async () => {
    try {
      await saveMediaToGallery(url, mediaType, originalFileName);
      handleCloseContextMenu();
    } catch (error) {
      console.error("Failed to save to gallery:", error);
      handleCloseContextMenu();
    }
  }, [url, mediaType, originalFileName, t, handleCloseContextMenu]);

  const contextMenuItems = useMemo(() => {
    const items: Array<{
      id: string;
      label: string;
      icon: string;
      onPress: () => void;
    }> = [
      {
        id: "copy",
        label: t("common.copy"),
        icon: "content-copy",
        onPress: handleCopyUrl,
      },
    ];

    // Only add Share and Save for images, icons, gifs, and videos
    if (
      mediaType === MediaType.Image ||
      mediaType === MediaType.Icon ||
      mediaType === MediaType.Gif ||
      mediaType === MediaType.Video
    ) {
      if (Platform.OS !== "web" && mediaSource?.localPath) {
        items.push({
          id: "share",
          label: t("buckets.sharing.share"),
          icon: "share",
          onPress: handleShare,
        });
      }

      // items.push({
      //   id: "save",
      //   label: Platform.OS === "ios" ? "Salva nella galleria" : "Save to Gallery",
      //   icon: "download",
      //   onPress: handleSaveToGallery,
      // });
    }

    return items;
  }, [
    mediaType,
    mediaSource?.localPath,
    t,
    handleCopyUrl,
    handleShare,
    handleSaveToGallery,
  ]);

  const handleDeleteCachedMedia = useCallback(
    async (event?: any) => {
      event?.stopPropagation?.();
      await remove(); // Usa il metodo dal hook
    },
    [remove]
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
    if (videoSource && isVideoType && videoPlayer) {
      videoPlayer
        .replaceAsync(videoSource)
        .then(() => {
          if (autoPlay) {
            videoPlayer.play();
          }
        })
        .catch((error) => {
          console.error("Failed to update video player source:", error);
        });
    }
  }, [videoSource, isVideoType, videoPlayer, autoPlay]);

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

    if (!isCompact) {
      return [
        baseStyle,
        {
          backgroundColor: stateBackgrounds[stateType],
          borderColor: stateColors[stateType],
          borderStyle: "dashed",
        },
        style,
      ];
    }

    return [baseStyle, style];
  };

  const renderForceDownloadButton = (icon: string, withDelete?: boolean) => {
    const primaryColor = theme.colors.primary;
    const errorColor = theme.colors.error;
    const onPrimaryColor = theme.colors.onPrimary;
    const onErrorColor = theme.colors.onError;

    return (
      <View style={defaultStyles.buttonContainer}>
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
    // Loading states (ora usa isLoading dal hook)
    if (
      isLoading ||
      (mediaSource?.generatingThumbnail && useThumbnail) ||
      isVideoLoading
    ) {
      const stateType = isLoading ? "downloading" : "loading";
      return (
        <View style={getStateContainerStyle(stateType) as any}>
          <ActivityIndicator size="small" color={stateColors[stateType]} />
          {!isCompact && (
            <Text style={getStateTextStyle(stateType)}>
              {isLoading
                ? t("cachedMedia.downloadProgress")
                : t("cachedMedia.loadingProgress")}
            </Text>
          )}
        </View>
      );
    }

    // Permanent failure - click to retry (ora usa isError dal hook)
    if (isError || isVideoError) {
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

    // User deleted - click to redownload (ora usa isDeleted dal hook)
    if (isDeleted) {
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
          <TouchableOpacity
            onPress={handleFrameClick}
            onLongPress={handleLongPress}
            activeOpacity={0.9}
          >
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
              contentFit={"cover"}
              transition={150}
              cachePolicy={cache ? "memory" : "none"}
            />
          </TouchableOpacity>
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
            <TouchableOpacity
              onPress={handleFrameClick}
              onLongPress={handleLongPress}
              activeOpacity={0.9}
            >
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
                contentFit={"cover"}
                transition={150}
                cachePolicy={cache ? "memory" : "none"}
                onError={(event) => {
                  mediaCache.markAsPermanentFailure(
                    url,
                    mediaType,
                    event.error
                  );
                }}
              />
            </TouchableOpacity>
          );

        case MediaType.Video:
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
                  enable: !!showControls && !isCompact,
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
                  onLongPress={handleLongPress}
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
                {!!showControls && (
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

  const canShowContextMenu = useMemo(() => {
    // Only show context menu for images, icons, gifs, and videos that are loaded
    return (
      (mediaType === MediaType.Image ||
        mediaType === MediaType.Icon ||
        mediaType === MediaType.Gif ||
        mediaType === MediaType.Video) &&
      (mediaSource?.localPath || mediaSource?.localThumbPath)
    );
  }, [mediaType, mediaSource?.localPath, mediaSource?.localThumbPath]);

  return (
    <View style={style}>
      {renderMedia()}
      {showMediaIndicator &&
        (isCompact ? renderSmallTypeIndicator() : renderTypeIndicator())}
      {canShowContextMenu && (
        <Modal
          visible={isContextMenuOpen}
          transparent
          animationType="fade"
          onRequestClose={handleCloseContextMenu}
        >
          <View style={defaultStyles.modalContent}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={handleCloseContextMenu}
            />
            <Surface
              style={[
                defaultStyles.contextMenu,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outlineVariant,
                },
              ]}
              elevation={4}
            >
              <View style={defaultStyles.contextMenuInner}>
                {contextMenuItems.map((item) => (
                  <TouchableRipple
                    key={item.id}
                    onPress={() => {
                      item.onPress();
                    }}
                    style={defaultStyles.contextMenuItem}
                  >
                    <View style={defaultStyles.contextMenuItemContent}>
                      <List.Icon
                        icon={item.icon}
                        color={theme.colors.onSurface}
                      />
                      <Text
                        style={[
                          defaultStyles.contextMenuItemText,
                          { color: theme.colors.onSurface },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </Surface>
          </View>
        </Modal>
      )}
    </View>
  );
});

const defaultStyles = StyleSheet.create({
  // Base container riusabile per tutti gli stati
  stateContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f8f8f8",
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

  // Context menu styles
  modalContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  contextMenu: {
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 180,
  },
  contextMenuInner: {
    overflow: "hidden",
    borderRadius: 8,
  },
  contextMenuItem: {
    borderBottomWidth: 0,
  },
  contextMenuItemContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  contextMenuItemText: {
    marginLeft: 12,
    fontSize: 16,
  },
});
