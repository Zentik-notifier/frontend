import { Ionicons } from "@expo/vector-icons";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useState } from "react";
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    View,
    ViewStyle,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useColorScheme } from "../hooks/useTheme";

interface MinimalVideoPlayerProps {
  source: string;
  style?: ViewStyle;
  autoPlay?: boolean;
  isLooping?: boolean;
  isMuted?: boolean;
  showControls?: boolean;
  customButton?: {
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    color?: string;
    size?: number;
  };
  onPress?: () => void;
  onError?: (error: any) => void;
  onLoad?: () => void;
}

export const MinimalVideoPlayer: React.FC<MinimalVideoPlayerProps> = ({
  source,
  style,
  autoPlay = false,
  isLooping = false,
  isMuted = true,
  showControls = true,
  customButton,
  onPress,
  onError,
  onLoad,
}) => {
    const colorScheme = useColorScheme();
  const [showOverlay, setShowOverlay] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isSeeking, setIsSeeking] = useState(false);

  const videoPlayer = useVideoPlayer(source, (player) => {
    player.loop = isLooping;
    player.muted = isMuted;

    if (autoPlay) {
      player.play();
    }
  });

  const isPlaying = videoPlayer?.playing;
  const isLoading = videoPlayer?.status === "loading";

//   const { status: videoStatus } = useEvent(videoPlayer, "statusChange", {
//     status: videoPlayer.status,
//   });
//   const isVideoError = videoStatus === "";
//   const isVideoLoading = videoStatus === "loading";

  // Update time and duration
  useEffect(() => {
    if (!videoPlayer) return;

    const updateTime = () => {
      if (!isSeeking) {
        setCurrentTime(videoPlayer.currentTime || 0);
      }
      setDuration(videoPlayer.duration || 0);
    };

    updateTime();
    const interval = setInterval(updateTime, 100);

    return () => clearInterval(interval);
  }, [videoPlayer, isSeeking]);

  const handlePlayPause = useCallback(() => {
    if (videoPlayer) {
      if (isPlaying) {
        videoPlayer.pause();
      } else {
        videoPlayer.play();
      }
    //   setShowOverlay(false);
    }
  }, [videoPlayer, isPlaying]);

  const handleVideoPress = useCallback(() => {
    if (showControls) {
      setShowOverlay(!showOverlay);
    }
    onPress?.();
  }, [showControls, showOverlay, onPress]);

  const handleCustomButtonPress = useCallback(() => {
    customButton?.onPress();
  }, [customButton]);

  const handleSeek = useCallback((seekTime: number) => {
    if (videoPlayer && duration > 0) {
      const newTime = Math.max(0, Math.min(seekTime, duration));
      // TODO: Implement seek functionality when expo-video supports it
      setCurrentTime(newTime);
    }
  }, [videoPlayer, duration]);

  const handleSeekStart = useCallback(() => {
    setIsSeeking(true);
  }, []);

  const handleSeekEnd = useCallback(() => {
    setIsSeeking(false);
  }, []);

  const formatTime = useCallback((time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

//   useEffect(() => {
//     if (!videoPlayer) return;

//     const updatePlayingState = () => {
//       setIsPlaying(videoPlayer.playing);
//     };

//     const updateLoadingState = () => {
//       setIsLoading(videoPlayer.status === "loading");
//     };

//     updatePlayingState();
//     updateLoadingState();

//     const listener = videoPlayer.addListener("statusChange", () => {
//       updatePlayingState();
//       updateLoadingState();
//     });

//     return () => {
//       listener?.remove();
//     };
//   }, [videoPlayer]);

  useEffect(() => {
    if (!isLoading && onLoad) {
      onLoad();
    }
  }, [isLoading, onLoad]);

  return (
    <View style={[styles.container, style]}>
      <VideoView
        style={styles.video}
        player={videoPlayer}
        nativeControls={false}
      />

      <Pressable style={styles.videoOverlay} onPress={handleVideoPress}>
        {/* Loading indicator */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
          </View>
        )}

        {/* Controls overlay */}
        {showControls && showOverlay && !isLoading && (
          <View style={styles.controlsOverlay}>
            <View style={styles.controlsContainer}>
              {/* Play/Pause button */}
              <Pressable
                style={[styles.controlButton, styles.playButton]}
                onPress={handlePlayPause}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={24}
                  color="white"
                />
              </Pressable>

              {/* Custom button */}
              {customButton && (
                <Pressable
                  style={[styles.controlButton, styles.customButton]}
                  onPress={handleCustomButtonPress}
                >
                  <Ionicons
                    name={customButton.icon}
                    size={customButton.size || 20}
                    color={customButton.color || "white"}
                  />
                </Pressable>
              )}
            </View>
          </View>
        )}

        {/* Seek bar */}
        {showControls && duration > 0 && (
          <View style={styles.seekBarContainer}>
            <Text style={styles.timeText}>{formatTime(currentTime)}</Text>
            <View style={styles.seekBar}>
              <View style={styles.seekBarBackground}>
                <View 
                  style={[
                    styles.seekBarProgress, 
                    { width: `${(currentTime / duration) * 100}%` }
                  ]} 
                />
              </View>
            </View>
            <Text style={styles.timeText}>{formatTime(duration)}</Text>
          </View>
        )}
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "hidden",
    borderRadius: 8,
  },
  video: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  controlsOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  controlsContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    padding: 16,
    borderRadius: 12,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  controlButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    backgroundColor: "rgba(0, 122, 255, 0.8)",
  },
  customButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  playIndicator: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  playIndicatorButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(0, 0, 0, 0.6)",
    justifyContent: "center",
    alignItems: "center",
  },
  seekBarContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
  },
  timeText: {
    color: "white",
    fontSize: 12,
    fontWeight: "500",
    minWidth: 35,
  },
  seekBar: {
    flex: 1,
    marginHorizontal: 12,
    height: 4,
  },
  seekBarBackground: {
    width: "100%",
    height: "100%",
    backgroundColor: "rgba(255, 255, 255, 0.3)",
    borderRadius: 2,
    overflow: "hidden",
  },
  seekBarProgress: {
    height: "100%",
    backgroundColor: "white",
    borderRadius: 2,
  },
});
