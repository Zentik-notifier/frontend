import { MediaType } from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { mediaCache } from "@/services/media-cache";
import { saveMediaToGallery } from "@/services/media-gallery";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import { Alert, Modal, Platform, StyleSheet, View } from "react-native";
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
  const bgSecondary = theme.colors.surfaceVariant;
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

  // Pan gesture for moving and closing (no horizontal navigation)
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
        // Handle gestures based on primary direction (no horizontal navigation)
        if (Math.abs(e.translationY) > Math.abs(e.translationX)) {
          // Vertical swipe - handle close
          if (e.translationY > 120 || e.velocityY > 800) {
            translateY.value = withTiming(600, { duration: 150 }, () => {
              runOnJS(onClose)();
            });
          } else {
            translateY.value = withSpring(0);
            backdropOpacity.value = withSpring(1);
          }
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
    })
    .onEnd(() => {
      if (scale.value < 1) {
        // Reset to normal size if zoomed out too much
        scale.value = withSpring(1);
        savedScale.value = 1;
        savedTranslateX.value = withSpring(0);
        savedTranslateY.value = withSpring(0);
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
      } else {
        // Zoom in
        savedScale.value = withSpring(2);
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
    } else {
      // ensure next open starts fresh
      translateY.value = 0;
      backdropOpacity.value = 1;
      scale.value = 1;
      savedScale.value = 1;
      translateX.value = 0;
      savedTranslateX.value = 0;
      savedTranslateY.value = 0;
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
      "Elimina Media",
      "Vuoi eliminare questo media dalla cache? Potrai riscaricarlo manualmente in seguito se ancora disponibile.",
      [
        { text: "Annulla", style: "cancel" },
        {
          text: "Elimina",
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

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View style={[styles.container]}>
        <View
          style={[
            styles.topBar,
            { top: insets.top + 16 },
            enableSwipeNavigation
              ? styles.topBarWithNavigation
              : styles.topBarActionsOnly,
          ]}
        >
          {enableSwipeNavigation && (
            <ButtonGroup style={styles.navigationSection}>
              <IconButton
                icon="chevron-left"
                size={18}
                iconColor={textColor}
                style={styles.iconButton}
                onPress={onSwipeRight}
                accessibilityLabel="previous-media"
              />
              {currentPosition && (
                <Text style={[styles.counterText, { color: textColor }]}>
                  {currentPosition}
                </Text>
              )}
              <IconButton
                icon="chevron-right"
                size={18}
                iconColor={textColor}
                style={styles.iconButton}
                onPress={onSwipeLeft}
                accessibilityLabel="next-media"
              />
            </ButtonGroup>
          )}

          {/* Action buttons (grouped) */}
          <ButtonGroup>
            <IconButton
              icon="content-copy"
              size={18}
              iconColor={textColor}
              style={styles.iconButton}
              onPress={handleCopyUrl}
              accessibilityLabel="copy-url"
            />
            <IconButton
              icon="download"
              size={18}
              iconColor={textColor}
              style={styles.iconButton}
              onPress={handleSave}
              accessibilityLabel="save-to-gallery"
            />
            <IconButton
              icon="share"
              size={18}
              iconColor={textColor}
              style={styles.iconButton}
              onPress={handleShare}
              accessibilityLabel="share"
            />
            <IconButton
              icon="delete"
              size={18}
              iconColor={theme.colors.error}
              style={styles.iconButton}
              onPress={handleDelete}
              accessibilityLabel="delete"
            />
            <IconButton
              icon="close"
              size={18}
              iconColor={textColor}
              style={styles.iconButton}
              onPress={onClose}
              accessibilityLabel="close"
            />
          </ButtonGroup>
        </View>


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
                style={{ width: "100%", height: "100%" }}
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

        {/* Bottom description with title and cache info */}
        {(description || originalFileName || cacheInfo || notificationDate) && (
          <View style={[styles.bottomBar, { bottom: insets.bottom + 16 }]}>
            {originalFileName ? (
              <Text
                style={[styles.descTitle, { color: textColor }]}
                numberOfLines={1}
              >
                {originalFileName}
              </Text>
            ) : null}
            {description ? (
              <Text
                style={[styles.descText, { color: textColor }]}
                numberOfLines={3}
              >
                {description}
              </Text>
            ) : null}
            
            {/* Cache info section */}
            <View style={styles.cacheInfoSection}>
              {notificationDate && (
                <Text style={[styles.cacheInfoText, { color: textColor }]}>
                  {t("gallery.cachedOn")}: {formatDate(new Date(notificationDate))}
                </Text>
              )}
              {cacheInfo?.localPath && (
                <Text style={[styles.cacheInfoText, { color: textColor }]}>
                  Local: {cacheInfo.localPath.split('/').pop()}
                </Text>
              )}
              {url && (
                <Text style={[styles.cacheInfoText, { color: textColor }]} numberOfLines={1}>
                  URL: {url}
                </Text>
              )}
              {cacheInfo?.size && (
                <Text style={[styles.cacheInfoText, { color: textColor }]}>
                  Size: {(cacheInfo.size / 1024 / 1024).toFixed(2)} MB
                </Text>
              )}
            </View>
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
  },
  topBar: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  topBarWithNavigation: { justifyContent: "space-between" },
  topBarActionsOnly: { justifyContent: "flex-end" },
  navigationSection: { flexDirection: "row", alignItems: "center" },
  iconButton: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  counterText: {
    fontSize: 14,
    fontWeight: "500",
    minWidth: 60,
    textAlign: "center",
    height: 34,
    lineHeight: 34,
  },
  content: { flex: 1, alignItems: "center", justifyContent: "center" },
  media: { width: "95%", height: "80%" },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    padding: 12,
    borderRadius: 12,
  },
  cacheInfoSection: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  cacheInfoText: {
    fontSize: 13,
    opacity: 0.6,
    marginBottom: 2,
  },
  descTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  descText: { fontSize: 13 },
  descDate: { fontSize: 12, opacity: 0.7, marginTop: 4 },
});
