import { MediaType } from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { mediaCache } from "@/services/media-cache-service";
import { saveMediaToGallery } from "@/services/media-gallery";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, StyleSheet, View } from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { IconButton, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { CachedMedia } from "./CachedMedia";
import ButtonGroup from "./ui/ButtonGroup";

interface FullScreenMediaViewerProps {
  visible: boolean;
  url: string;
  mediaType: MediaType;
  originalFileName?: string;
  description?: string;
  notificationDate?: number;
  useThumbnail?: boolean;
  onClose: () => void;
  onDeleted?: () => void;
  // Navigation props
  enableSwipeNavigation?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  currentPosition?: string; // e.g., "1 / 5"
}

export default function FullScreenMediaViewer({
  visible,
  url,
  mediaType,
  originalFileName,
  description,
  notificationDate,
  onClose,
  onDeleted,
  enableSwipeNavigation,
  onSwipeLeft,
  onSwipeRight,
  currentPosition,
}: FullScreenMediaViewerProps) {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const { formatDate } = useDateFormat();
  const insets = useSafeAreaInsets();

  const textColor = theme.colors.onSurface;
  const [mediaLayout, setMediaLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [cacheInfo, setCacheInfo] = useState<{
    localPath?: string;
    size?: number;
  } | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [isFooterHovered, setIsFooterHovered] = useState(false);

  // Swipe down to close: animate media container
  const translateY = useSharedValue(0);
  const backdropOpacity = useSharedValue(1);

  // Zoom/pinch gesture values
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);

  const animatedMediaStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: translateY.value + savedTranslateY.value },
      { translateX: translateX.value + savedTranslateX.value },
      { scale: scale.value * savedScale.value },
    ],
    opacity: backdropOpacity.value,
  }));

  // Pan gesture for moving, closing (vertical) and navigating (horizontal)
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // If zoomed in, allow panning
      if (savedScale.value > 1) {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      } else {
        // If not zoomed, allow vertical swipe to close
        if (Math.abs(e.translationY) > Math.abs(e.translationX)) {
          // Vertical swipe - close gesture
          if (e.translationY > 0) {
            translateY.value = e.translationY;
            backdropOpacity.value = 1 - Math.min(e.translationY / 300, 0.5);
          }
        } else if (enableSwipeNavigation) {
          // Provide a small horizontal translation feedback when navigating
          translateX.value = e.translationX * 0.3;
        }
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        // Save pan position when zoomed
        savedTranslateX.value += translateX.value;
        savedTranslateY.value += translateY.value;
        // Reset immediately to avoid bounce effect
        translateX.value = 0;
        translateY.value = 0;
      } else {
        const absX = Math.abs(e.translationX);
        const absY = Math.abs(e.translationY);

        // Handle gestures based on primary direction
        if (absY > absX) {
          // Vertical swipe - handle close
          if (e.translationY > 120 || e.velocityY > 800) {
            translateY.value = withTiming(600, { duration: 150 }, () => {
              runOnJS(onClose)();
            });
          } else {
            translateY.value = withSpring(0);
            backdropOpacity.value = withSpring(1);
          }
        } else if (enableSwipeNavigation && absX > 40) {
          // Horizontal swipe - navigate between media items
          if (e.translationX < 0 && onSwipeLeft) {
            runOnJS(onSwipeLeft)();
          } else if (e.translationX > 0 && onSwipeRight) {
            runOnJS(onSwipeRight)();
          }
          translateX.value = withSpring(0);
        } else {
          // Reset horizontal position if minor horizontal movement occurred
          translateX.value = withSpring(0);
        }
      }
    });

  // Pinch gesture for zooming
  const pinchGesture = Gesture.Pinch()
    .onUpdate((e) => {
      scale.value = Math.max(0.5, Math.min(e.scale, 3)); // Limit zoom between 0.5x and 3x
      // Nascondi le info quando si zooma
      if (scale.value > 1.1) {
        runOnJS(setShowInfo)(false);
      }
    })
    .onEnd(() => {
      if (scale.value < 1) {
        // Reset to normal size if zoomed out too much
        scale.value = withSpring(1);
        savedScale.value = 1;
        savedTranslateX.value = withSpring(0);
        savedTranslateY.value = withSpring(0);
        runOnJS(setShowInfo)(true);
      } else {
        // Save zoom level
        savedScale.value *= scale.value;
        scale.value = 1;
      }
    });

  // Double tap to zoom
  const doubleTapGesture = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (savedScale.value > 1) {
        // Reset zoom
        savedScale.value = withSpring(1);
        savedTranslateX.value = withSpring(0);
        savedTranslateY.value = withSpring(0);
        runOnJS(setShowInfo)(true);
      } else {
        // Zoom in
        savedScale.value = withSpring(2);
        runOnJS(setShowInfo)(false);
      }
    });

  // Combine gestures
  const composedGesture = Gesture.Simultaneous(
    panGesture,
    pinchGesture,
    doubleTapGesture
  );

  // Reset animation state when modal visibility changes
  useEffect(() => {
    if (visible) {
      translateY.value = 0;
      backdropOpacity.value = 1;
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setShowInfo(true);
    } else {
      // ensure next open starts fresh
      translateY.value = 0;
      backdropOpacity.value = 1;
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
      setShowInfo(true);
    }
  }, [visible]);

  // Load cache info when modal opens
  useEffect(() => {
    if (visible && url && mediaType) {
      const loadCacheInfo = async () => {
        try {
          const source = await mediaCache.getCachedItem(url, mediaType);
          setCacheInfo({
            localPath: source?.localPath,
            size: source?.size,
          });
        } catch {
          setCacheInfo(null);
        }
      };
      loadCacheInfo();
    }
  }, [visible, url, mediaType]);

  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(url);
      Alert.alert(t("common.copied"), t("common.copiedToClipboard"));
    } catch {}
  };

  const handleDelete = () => {
    if (!url || !mediaType) return;

    Alert.alert(
      t("cachedMedia.deleteItem.title"),
      t("cachedMedia.deleteItem.message"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await mediaCache.deleteCachedMedia(url, mediaType);
              onDeleted?.();
              onClose();
            } finally {
              setBusy(false);
            }
          },
        },
      ]
    );
  };

  const handleSave = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const ok = await saveMediaToGallery(url, mediaType, originalFileName);
      if (ok) {
        Alert.alert(t("common.saved"), t("common.savedToGallery"));
      }
    } finally {
      setBusy(false);
    }
  };

  const handleShare = async () => {
    if (busy) return;
    setBusy(true);
    try {
      if (Platform.OS === "web") {
        Alert.alert(t("common.error"), t("common.notAvailableOnWeb"));
        return;
      }

      const available = await Sharing.isAvailableAsync();
      if (!available) {
        Alert.alert(t("common.error"), t("common.shareNotAvailable"));
        return;
      }

      const source = await mediaCache.getCachedItem(url, mediaType);
      const localPath = source?.localPath;

      if (localPath) {
        await Sharing.shareAsync(localPath);
      } else {
        Alert.alert(t("common.error"), t("common.unableToShare"));
      }
    } catch (e) {
      Alert.alert(t("common.error"), t("common.unableToShare"));
    } finally {
      setBusy(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        {/* Top bar with absolute positioning over content */}
        <View
          style={[
            styles.topBar,
            {
              top: insets.top + 8,
              backgroundColor: "rgba(0,0,0,0.7)",
            },
          ]}
        >
            {/* Navigation buttons (left) */}
            {enableSwipeNavigation && (
              <View style={styles.navigationSection}>
                <IconButton
                  icon="chevron-left"
                  size={20}
                  iconColor="white"
                  style={styles.iconButton}
                  onPress={onSwipeRight}
                  accessibilityLabel="previous-media"
                />
                <Text style={styles.counterText}>{currentPosition}</Text>
                <IconButton
                  icon="chevron-right"
                  size={20}
                  iconColor="white"
                  style={styles.iconButton}
                  onPress={onSwipeLeft}
                  accessibilityLabel="next-media"
                />
              </View>
            )}

            {/* Spacer */}
            <View style={{ flex: 1 }} />

            {/* Action buttons (right) */}
            <View style={styles.actionsSection}>
              <IconButton
                icon={showInfo ? "information" : "information-outline"}
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={() => setShowInfo(!showInfo)}
                accessibilityLabel="toggle-info"
              />
              <IconButton
                icon="content-copy"
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={handleCopyUrl}
                accessibilityLabel="copy-url"
              />
              <IconButton
                icon="download"
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={handleSave}
                accessibilityLabel="save-to-gallery"
              />
              <IconButton
                icon="share"
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={handleShare}
                accessibilityLabel="share"
              />
              <IconButton
                icon="delete"
                size={20}
                iconColor={theme.colors.error}
                style={styles.iconButton}
                onPress={handleDelete}
                accessibilityLabel="delete"
              />
              <IconButton
                icon="close"
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={onClose}
                accessibilityLabel="close"
              />
          </View>
        </View>

        {/* Main content area with flex layout */}
        <View style={styles.container}>
          {/* Content with tap-to-close only outside media and gesture support on media */}
          <View
            style={styles.content}
            onStartShouldSetResponderCapture={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              if (!mediaLayout) return true; // if unknown, allow close
              const inside =
                locationX >= mediaLayout.x &&
                locationX <= mediaLayout.x + mediaLayout.width &&
                locationY >= mediaLayout.y &&
                locationY <= mediaLayout.y + mediaLayout.height;
              return !inside;
            }}
            onResponderRelease={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              if (!mediaLayout) {
                onClose();
                return;
              }
              const inside =
                locationX >= mediaLayout.x &&
                locationX <= mediaLayout.x + mediaLayout.width &&
                locationY >= mediaLayout.y &&
                locationY <= mediaLayout.y + mediaLayout.height;
              if (!inside) onClose();
            }}
          >
            <GestureDetector gesture={composedGesture}>
              <Animated.View
                style={[styles.media, animatedMediaStyle]}
                onLayout={(e) => setMediaLayout(e.nativeEvent.layout)}
              >
                <CachedMedia
                  key={url}
                  mediaType={mediaType}
                  url={url}
                  style={{ width: "100%", height: mediaLayout?.height }}
                  originalFileName={originalFileName}
                  videoProps={{
                    isMuted: false,
                    showControls: true,
                    autoPlay: true,
                    isLooping: true,
                  }}
                  imageProps={{ contentFit: "contain" }}
                  notificationDate={notificationDate}
                />
              </Animated.View>
            </GestureDetector>
          </View>

          {/* Bottom description with title and cache info - now in flex layout */}
          {showInfo &&
            (description ||
              originalFileName ||
              cacheInfo ||
              notificationDate) && (
              <Pressable 
                style={[
                  styles.bottomBar,
                  { paddingBottom: insets.bottom + 20 },
                  Platform.OS === 'web' && isFooterHovered && styles.bottomBarHovered
                ]}
                onHoverIn={() => setIsFooterHovered(true)}
                onHoverOut={() => setIsFooterHovered(false)}
              >
                {originalFileName && (
                  <Text style={styles.descTitle} numberOfLines={1}>
                    {originalFileName}
                  </Text>
                )}
                {description && (
                  <Text style={styles.descText} numberOfLines={2}>
                    {description}
                  </Text>
                )}

                {/* Cache info section */}
                <View style={styles.cacheInfoSection}>
                  {notificationDate && (
                    <Text style={styles.cacheInfoText}>
                      {t("gallery.cachedOn")}:{" "}
                      {formatDate(new Date(notificationDate), true) || ""}
                    </Text>
                  )}
                  {cacheInfo?.localPath && (
                    <Text style={styles.cacheInfoText}>
                      Local: {cacheInfo.localPath.split("/").pop()}
                    </Text>
                  )}
                  {url && (
                    <Text style={styles.cacheInfoText} numberOfLines={1}>
                      URL: {url}
                    </Text>
                  )}
                  {cacheInfo?.size && (
                    <Text style={styles.cacheInfoText}>
                      Size: {(cacheInfo.size / 1024 / 1024).toFixed(2)} MB
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  container: {
    flex: 1,
    flexDirection: 'column',
  },
  topBar: {
    position: "absolute",
    left: 12,
    right: 12,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  navigationSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  actionsSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconButton: {
    margin: 0,
  },
  counterText: {
    fontSize: 14,
    fontWeight: "500",
    color: "white",
    minWidth: 50,
    textAlign: "center",
    paddingHorizontal: 8,
  },
  content: { 
    flex: 1, 
    alignItems: "center", 
    justifyContent: "center",
  },
  media: { width: "95%", height: "80%" },
  bottomBar: {
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomBarHovered: {
    backgroundColor: "rgba(0,0,0,0.95)",
    transform: [{ translateY: -4 }],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -4,
    },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 12,
  },
  cacheInfoSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
  },
  cacheInfoText: {
    fontSize: 13,
    color: "white",
    opacity: 0.6,
    marginBottom: 2,
  },
  descTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
    color: "white",
  },
  descText: {
    fontSize: 13,
    color: "white",
  },
  descDate: {
    fontSize: 12,
    opacity: 0.7,
    marginTop: 4,
    color: "white",
  },
});
