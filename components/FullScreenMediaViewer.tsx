import { Colors } from "@/constants/Colors";
import { MediaType } from "@/generated/gql-operations-generated";
import { useColorScheme, useDateFormat } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { mediaCache } from "@/services/media-cache";
import { saveMediaToGallery } from "@/services/media-gallery";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { CachedMedia } from "./CachedMedia";

interface FullScreenMediaViewerProps {
  visible: boolean;
  url: string;
  mediaType: MediaType;
  originalFileName?: string;
  description?: string;
  notificationDate?: number;
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
  const colorScheme = useColorScheme();
  const [busy, setBusy] = useState(false);
  const { t } = useI18n();
  const { formatDate } = useDateFormat();

  const textColor = Colors[colorScheme].text;
  const bgSecondary = Colors[colorScheme].backgroundSecondary;
  const [mediaLayout, setMediaLayout] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
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

  // Pan gesture for moving, closing, and navigation
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      // If zoomed in, allow panning
      if (savedScale.value > 1) {
        translateX.value = e.translationX;
        translateY.value = e.translationY;
      } else {
        // If not zoomed, allow vertical swipe to close and horizontal swipe to navigate
        if (Math.abs(e.translationY) > Math.abs(e.translationX)) {
          // Vertical swipe - close gesture
          if (e.translationY > 0) {
            translateY.value = e.translationY;
            backdropOpacity.value = 1 - Math.min(e.translationY / 300, 0.5);
          }
        } else if (enableSwipeNavigation) {
          // Horizontal swipe - navigation gesture (only if enabled)
          translateX.value = e.translationX;
        }
      }
    })
    .onEnd((e) => {
      if (savedScale.value > 1) {
        // Save pan position when zoomed
        savedTranslateX.value += translateX.value;
        savedTranslateY.value += translateY.value;
        translateX.value = withSpring(0);
        translateY.value = withSpring(0);
      } else {
        // Handle gestures based on primary direction
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
        } else if (enableSwipeNavigation) {
          // Horizontal swipe - handle navigation (circolare)
          if (e.translationX > 100 && onSwipeRight) {
            // Swipe right - call onSwipeRight (navigazione circolare)
            translateX.value = withTiming(0, { duration: 200 }, () => {
              runOnJS(onSwipeRight)();
            });
          } else if (e.translationX < -100 && onSwipeLeft) {
            // Swipe left - call onSwipeLeft (navigazione circolare)
            translateX.value = withTiming(0, { duration: 200 }, () => {
              runOnJS(onSwipeLeft)();
            });
          } else {
            // Reset position
            translateX.value = withSpring(0);
          }
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
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={[styles.container]}>
        <View
          style={[
            styles.topBar,
            enableSwipeNavigation
              ? styles.topBarWithNavigation
              : styles.topBarActionsOnly,
          ]}
        >
          {enableSwipeNavigation && (
            <View style={styles.navigationSection}>
              <View style={[styles.navigationButtons, { backgroundColor: bgSecondary, borderRadius: 12 }]}>
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    styles.leftNavButton,
                    { backgroundColor: "rgba(255,255,255,0.1)" },
                  ]}
                  onPress={onSwipeRight}
                  accessibilityLabel="previous-media"
                >
                  <Ionicons name="chevron-back" size={18} color={textColor} />
                </TouchableOpacity>
                {currentPosition && (
                  <Text style={[styles.counterText, { color: textColor }]}>
                    {currentPosition}
                  </Text>
                )}
                <TouchableOpacity
                  style={[
                    styles.iconButton,
                    styles.rightNavButton,
                    { backgroundColor: "rgba(255,255,255,0.1)" },
                  ]}
                  onPress={onSwipeLeft}
                  accessibilityLabel="next-media"
                >
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={textColor}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: bgSecondary }]}
              onPress={handleCopyUrl}
              accessibilityLabel="copy-url"
            >
              <Ionicons name="copy-outline" size={18} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: bgSecondary }]}
              onPress={handleSave}
              accessibilityLabel="save-to-gallery"
            >
              <Ionicons name="download-outline" size={18} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: bgSecondary }]}
              onPress={handleShare}
              accessibilityLabel="share"
            >
              <Ionicons name="share-outline" size={18} color={textColor} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: bgSecondary }]}
              onPress={handleDelete}
              accessibilityLabel="delete"
            >
              <Ionicons
                name="trash"
                size={18}
                color={Colors[colorScheme].error}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.iconButton, { backgroundColor: bgSecondary }]}
              onPress={onClose}
              accessibilityLabel="close"
            >
              <Ionicons name="close" size={18} color={textColor} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Second row with cached date */}
        {notificationDate && (
          <View style={[styles.secondRow, { backgroundColor: bgSecondary }]}>
            <Text style={[styles.cachedDateText, { color: textColor }]}>
              {t("gallery.cachedOn")}: {formatDate(new Date(notificationDate))}
            </Text>
          </View>
        )}

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
                videoProps={{ isMuted: false }}
                imageProps={{ contentFit: "contain" }}
                notificationDate={notificationDate}
              />
            </Animated.View>
          </GestureDetector>
        </View>

        {/* Bottom description with title */}
        {(description || originalFileName) && (
          <View style={[styles.bottomBar, { backgroundColor: bgSecondary }]}>
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
          </View>
        )}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "rgba(0,0,0,0.9)" },
  topBar: {
    position: "absolute",
    top: 50,
    left: 16,
    right: 16,
    zIndex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  topBarWithNavigation: { justifyContent: "space-between" },
  topBarActionsOnly: { justifyContent: "flex-end" },
  navigationSection: { flexDirection: "row", alignItems: "center", gap: 12 },
  navigationButtons: { flexDirection: "row", alignItems: "center" },
  leftNavButton: { borderTopRightRadius: 0, borderBottomRightRadius: 0 },
  rightNavButton: { borderTopLeftRadius: 0, borderBottomLeftRadius: 0 },
  actionButtons: { flexDirection: "row", alignItems: "center", gap: 10 },
  secondRow: {
    position: "absolute",
    top: 100,
    left: 16,
    right: 16,
    zIndex: 1,
    padding: 8,
    borderRadius: 8,
  },
  cachedDateText: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
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
  media: { width: "95%", height: "85%" },
  bottomBar: {
    position: "absolute",
    left: 16,
    right: 16,
    bottom: 60,
    padding: 12,
    borderRadius: 12,
  },
  descTitle: { fontSize: 16, fontWeight: "600", marginBottom: 4 },
  descText: { fontSize: 13 },
  descDate: { fontSize: 12, opacity: 0.7, marginTop: 4 },
});
