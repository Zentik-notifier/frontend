import { Ionicons } from "@expo/vector-icons";
import * as ScreenOrientation from 'expo-screen-orientation';
import { VideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    PanResponder,
    PanResponderInstance,
    StyleProp,
    Text,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { Colors } from "../constants/Colors";
import { useColorScheme } from "../hooks/useTheme";

interface CustomVideoControlsProps {
  player: VideoPlayer;
  style?: StyleProp<ViewStyle>;
  showControls?: boolean;
  autoHideControls?: boolean;
  autoHideDelay?: number;
  allowsFullscreen?: boolean;
  onFullscreenRequest?: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

export function CustomVideoControls({
  player,
  style,
  showControls = true,
  autoHideControls = true,
  autoHideDelay = 3000,
  allowsFullscreen = true,
  onFullscreenRequest,
}: CustomVideoControlsProps) {
  const colorScheme = useColorScheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [showControlsOverlay, setShowControlsOverlay] = useState(true);
  const [isSeeking, setIsSeeking] = useState(false);
  const [seekTime, setSeekTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [scrubPosition, setScrubPosition] = useState(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [seekBarWidth, setSeekBarWidth] = useState(0);

  const controlsTimeoutRef = useRef<NodeJS.Timeout>();
  const seekingTimeoutRef = useRef<NodeJS.Timeout>();
  const seekBarRef = useRef<View>(null);

  // Gestione auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }

    if (autoHideControls && isPlaying && !isFullscreen) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControlsOverlay(false);
      }, autoHideDelay);
    }
  }, [autoHideControls, isPlaying, autoHideDelay, isFullscreen]);

  // Mostra controlli temporaneamente
  const showControlsTemporarily = useCallback(() => {
    setShowControlsOverlay(true);
    resetControlsTimeout();
  }, [resetControlsTimeout]);

  // Toggle play/pause
  const togglePlayPause = useCallback(async () => {
    try {
      if (isPlaying) {
        await player.pause();
      } else {
        await player.play();
      }
      showControlsTemporarily();
    } catch (error) {
      console.error("Error toggling play/pause:", error);
    }
  }, [isPlaying, player, showControlsTemporarily]);

  // Toggle mute
  const toggleMute = useCallback(async () => {
    try {
      const newMuted = !isMuted;
      setIsMuted(newMuted);
      await player.setMuted(newMuted);
      showControlsTemporarily();
    } catch (error) {
      console.error("Error toggling mute:", error);
    }
  }, [isMuted, player, showControlsTemporarily]);

  // Controllo volume
  const setPlayerVolume = useCallback(async (newVolume: number) => {
    try {
      setVolume(newVolume);
      await player.setVolume(newVolume);
      if (newVolume > 0 && isMuted) {
        setIsMuted(false);
        await player.setMuted(false);
      }
      showControlsTemporarily();
    } catch (error) {
      console.error("Error setting volume:", error);
    }
  }, [player, isMuted, showControlsTemporarily]);

  // Seek to position
  const seekTo = useCallback(async (time: number) => {
    try {
      setIsSeeking(true);
      setSeekTime(time);

      // Clear existing timeout
      if (seekingTimeoutRef.current) {
        clearTimeout(seekingTimeoutRef.current);
      }

      // Debounce seek operation
      seekingTimeoutRef.current = setTimeout(async () => {
        await player.seekTo(time);
        setIsSeeking(false);
      }, 100);

      showControlsTemporarily();
    } catch (error) {
      console.error("Error seeking:", error);
      setIsSeeking(false);
    }
  }, [player, showControlsTemporarily]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(async () => {
    try {
      if (isFullscreen) {
        // Exit fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP);
        setIsFullscreen(false);
      } else {
        // Enter fullscreen
        await ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
        setIsFullscreen(true);
        setShowControlsOverlay(true);
      }
      onFullscreenRequest?.();
      showControlsTemporarily();
    } catch (error) {
      console.error("Error toggling fullscreen:", error);
      Alert.alert("Errore", "Impossibile cambiare orientamento schermo");
    }
  }, [isFullscreen, onFullscreenRequest, showControlsTemporarily]);

  // Pan responder per scrubbing
  const panResponder = useRef<PanResponderInstance>(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        setIsScrubbing(true);
        const { locationX } = evt.nativeEvent;
        const percentage = Math.max(0, Math.min(1, locationX / seekBarWidth));
        const newTime = percentage * duration;
        setScrubPosition(percentage * 100);
        setSeekTime(newTime);
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const percentage = Math.max(0, Math.min(1, locationX / seekBarWidth));
        const newTime = percentage * duration;
        setScrubPosition(percentage * 100);
        setSeekTime(newTime);
      },
      onPanResponderRelease: async () => {
        setIsScrubbing(false);
        await seekTo(seekTime);
      },
      onPanResponderTerminate: () => {
        setIsScrubbing(false);
      },
    })
  );

  // Formatta tempo in mm:ss
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Calcola progresso per la seek bar
  const getProgressPercentage = (): number => {
    if (duration === 0) return 0;
    return (currentTime / duration) * 100;
  };

  // Gestione eventi del player
  useEffect(() => {
    const subscriptions = [
      player.addListener("statusChange", ({ status }) => {
        console.log("Video status changed:", status);
        setIsLoading(status === "loading");
        if (status === "readyToPlay") {
          setIsLoading(false);
        }
      }),

      player.addListener("playingChange", ({ isPlaying: playing }) => {
        console.log("Video playing changed:", playing);
        setIsPlaying(playing);
        if (playing) {
          resetControlsTimeout();
        }
      }),

      player.addListener("timeChange", ({ currentTime: time }) => {
        if (!isSeeking && !isScrubbing) {
          setCurrentTime(time);
          // Update scrub position during playback
          if (duration > 0) {
            setScrubPosition((time / duration) * 100);
          }
        }
      }),

      player.addListener("durationChange", ({ duration: dur }) => {
        console.log("Video duration changed:", dur);
        setDuration(dur);
      }),

      player.addListener("mutedChange", ({ muted }) => {
        setIsMuted(muted);
      }),

      player.addListener("volumeChange", ({ volume: vol }) => {
        setVolume(vol);
      }),
    ];

    return () => {
      subscriptions.forEach((sub) => sub.remove());
      if (controlsTimeoutRef.current) {
        clearTimeout(controlsTimeoutRef.current);
      }
      if (seekingTimeoutRef.current) {
        clearTimeout(seekingTimeoutRef.current);
      }
    };
  }, [player, isSeeking, isScrubbing, duration, resetControlsTimeout]);

  // Inizializza controlli
  useEffect(() => {
    const initializePlayer = async () => {
      try {
        const [currentStatus, currentMuted, currentVolume] = await Promise.all([
          player.status,
          player.muted,
          player.volume,
        ]);

        setIsPlaying(currentStatus === "playing");
        setIsLoading(currentStatus === "loading");
        setIsMuted(currentMuted);
        setVolume(currentVolume);
        setCurrentTime(player.currentTime);
        setDuration(player.duration);

        // Update scrub position
        if (player.duration > 0) {
          setScrubPosition((player.currentTime / player.duration) * 100);
        }

        // Mostra controlli inizialmente
        showControlsTemporarily();
      } catch (error) {
        console.error("Error initializing player:", error);
      }
    };

    initializePlayer();
  }, [player, showControlsTemporarily]);

  // Gestione orientation changes
  useEffect(() => {
    const subscription = ScreenOrientation.addOrientationChangeListener(({ orientationInfo }) => {
      const orientation = orientationInfo.orientation;
      console.log("Orientation changed to:", orientation);

      if (orientation === ScreenOrientation.Orientation.LANDSCAPE_LEFT ||
          orientation === ScreenOrientation.Orientation.LANDSCAPE_RIGHT) {
        if (!isFullscreen) {
          setIsFullscreen(true);
          setShowControlsOverlay(true);
        }
      } else if (orientation === ScreenOrientation.Orientation.PORTRAIT_UP ||
                 orientation === ScreenOrientation.Orientation.PORTRAIT_DOWN) {
        if (isFullscreen) {
          setIsFullscreen(false);
          setShowControlsOverlay(true);
        }
      }
    });

    return () => {
      ScreenOrientation.removeOrientationChangeListener(subscription);
    };
  }, [isFullscreen]);

  if (!showControls) {
    return null;
  }

  return (
    <View style={[{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }, style]}>
      {/* Touch overlay per mostrare/nascondere controlli */}
      <TouchableOpacity
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
        }}
        activeOpacity={1}
        onPress={showControlsTemporarily}
      />

      {/* Controlli principali */}
      {showControlsOverlay && (
        <>
          {/* Centro - Play/Pause & Loading */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {isLoading ? (
              <View
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  borderRadius: 40,
                  padding: 20,
                }}
              >
                <ActivityIndicator size="large" color="white" />
              </View>
            ) : (
              <TouchableOpacity
                onPress={togglePlayPause}
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.7)",
                  borderRadius: 40,
                  padding: 20,
                }}
              >
                <Ionicons
                  name={isPlaying ? "pause" : "play"}
                  size={32}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Barra di progresso - Bottom */}
          <View
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              paddingHorizontal: 16,
              paddingVertical: 16,
            }}
          >
            {/* Seek Bar con PanResponder per scrubbing */}
            <View
              style={{ marginBottom: 12 }}
              onLayout={(event) => {
                setSeekBarWidth(event.nativeEvent.layout.width);
              }}
            >
              <View
                ref={seekBarRef}
                style={{
                  height: 6,
                  backgroundColor: "rgba(255, 255, 255, 0.3)",
                  borderRadius: 3,
                  position: "relative",
                }}
                {...panResponder.current.panHandlers}
              >
                <View
                  style={{
                    height: 6,
                    backgroundColor: Colors[colorScheme].tint || "#007AFF",
                    borderRadius: 3,
                    width: `${Math.max(0, Math.min(100, isScrubbing ? scrubPosition : getProgressPercentage()))}%`,
                  }}
                />
                {/* Thumb della seek bar */}
                <View
                  style={{
                    position: "absolute",
                    left: `${Math.max(0, Math.min(100, isScrubbing ? scrubPosition : getProgressPercentage()))}%`,
                    top: -3,
                    width: 12,
                    height: 12,
                    borderRadius: 6,
                    backgroundColor: Colors[colorScheme].tint || "#007AFF",
                    borderWidth: 2,
                    borderColor: "white",
                    transform: [{ translateX: -6 }],
                  }}
                />
              </View>
            </View>

            {/* Controlli inferiori */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                {/* Play/Pause */}
                <TouchableOpacity onPress={togglePlayPause} style={{ marginRight: 16 }}>
                  <Ionicons
                    name={isPlaying ? "pause" : "play"}
                    size={22}
                    color="white"
                  />
                </TouchableOpacity>

                {/* Volume Control */}
                <TouchableOpacity onPress={toggleMute} style={{ marginRight: 8 }}>
                  <Ionicons
                    name={isMuted ? "volume-mute" : volume > 0.5 ? "volume-high" : volume > 0 ? "volume-low" : "volume-mute"}
                    size={20}
                    color="white"
                  />
                </TouchableOpacity>

                {/* Volume Slider */}
                <View style={{ flexDirection: "row", alignItems: "center", marginRight: 16 }}>
                  <TouchableOpacity
                    onPress={() => setPlayerVolume(Math.max(0, volume - 0.1))}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="remove" size={16} color="white" />
                  </TouchableOpacity>
                  <Text style={{ color: "white", fontSize: 12, marginHorizontal: 8, minWidth: 30, textAlign: "center" }}>
                    {Math.round(volume * 100)}%
                  </Text>
                  <TouchableOpacity
                    onPress={() => setPlayerVolume(Math.min(1, volume + 0.1))}
                    style={{ padding: 4 }}
                  >
                    <Ionicons name="add" size={16} color="white" />
                  </TouchableOpacity>
                </View>

                {/* Tempo */}
                <Text style={{ color: "white", fontSize: 12, fontWeight: "500" }}>
                  {formatTime(isScrubbing ? seekTime : currentTime)} / {formatTime(duration)}
                </Text>
              </View>

              {/* Fullscreen */}
              {allowsFullscreen && (
                <TouchableOpacity onPress={toggleFullscreen} style={{ padding: 4 }}>
                  <Ionicons
                    name={isFullscreen ? "contract" : "expand"}
                    size={22}
                    color="white"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Controlli superiori */}
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              backgroundColor: "rgba(0, 0, 0, 0.8)",
              paddingHorizontal: 16,
              paddingVertical: 12,
              flexDirection: "row",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <Text style={{ color: "white", fontSize: 14, fontWeight: "500", marginRight: 8 }}>
                Video Player
              </Text>
              {isFullscreen && (
                <Text style={{ color: "white", fontSize: 12, opacity: 0.8 }}>
                  Fullscreen
                </Text>
              )}
            </View>

            <TouchableOpacity onPress={() => setShowControlsOverlay(false)} style={{ padding: 4 }}>
              <Ionicons name="close" size={20} color="white" />
            </TouchableOpacity>
          </View>

          {/* Indicatore scrubbing */}
          {isScrubbing && (
            <View
              style={{
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: [{ translateX: -50 }, { translateY: -50 }],
                backgroundColor: "rgba(0, 0, 0, 0.8)",
                paddingHorizontal: 16,
                paddingVertical: 8,
                borderRadius: 20,
              }}
            >
              <Text style={{ color: "white", fontSize: 14, fontWeight: "600" }}>
                {formatTime(seekTime)}
              </Text>
            </View>
          )}
        </>
      )}
    </View>
  );
}
