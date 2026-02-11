import {
  MediaType,
  NotificationAttachmentDto,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { mediaCache } from "@/services/media-cache-service";
import { saveMediaToGallery } from "@/services/media-gallery";
import * as Clipboard from "expo-clipboard";
import * as Sharing from "expo-sharing";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { IconButton, Text, useTheme } from "react-native-paper";
import {
  initialWindowMetrics,
  SafeAreaProvider,
  SafeAreaView,
} from "react-native-safe-area-context";
import AttachmentGalleryContent from "./AttachmentGalleryContent";

interface FullScreenMediaViewerProps {
  visible: boolean;
  // Lista completa di attachment (preferita)
  attachments?: NotificationAttachmentDto[];
  initialIndex?: number;
  onCurrentIndexChange?: (index: number) => void;
  // Fallback legacy a singolo media
  url?: string;
  mediaType?: MediaType;
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
  attachments,
  initialIndex,
  onCurrentIndexChange,
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

  const [currentIndex, setCurrentIndex] = useState(initialIndex ?? 0);

  const [cacheInfo, setCacheInfo] = useState<{
    localPath?: string;
    size?: number;
  } | null>(null);
  const [showInfo, setShowInfo] = useState(true);
  const [isFooterHovered, setIsFooterHovered] = useState(false);

  const hasAttachments = !!attachments && attachments.length > 0;
  const safeIndex = hasAttachments
    ? Math.min(Math.max(currentIndex, 0), attachments!.length - 1)
    : 0;
  const activeAttachment = hasAttachments ? attachments![safeIndex] : undefined;

  const effectiveUrl = hasAttachments
    ? activeAttachment?.url || ""
    : url || "";
  const effectiveMediaType = hasAttachments
    ? activeAttachment?.mediaType || MediaType.Image
    : mediaType || MediaType.Image;
  const effectiveOriginalFileName = hasAttachments
    ? activeAttachment?.name
    : originalFileName;

  const computedPosition = hasAttachments
    ? `${safeIndex + 1} / ${attachments!.length}`
    : currentPosition;

  // Sincronizza l'indice interno quando cambia initialIndex
  React.useEffect(() => {
    if (typeof initialIndex === "number") {
      setCurrentIndex(initialIndex);
    }
  }, [initialIndex]);

  // Load cache info when modal opens
  useEffect(() => {
    if (visible && effectiveUrl && effectiveMediaType) {
      const loadCacheInfo = async () => {
        try {
          const source = await mediaCache.getCachedItem(
            effectiveUrl,
            effectiveMediaType
          );
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
  }, [visible, effectiveUrl, effectiveMediaType]);

  const handleCopyUrl = async () => {
    try {
      await Clipboard.setStringAsync(effectiveUrl);
      Alert.alert(t("common.copied"), t("common.copiedToClipboard"));
    } catch {}
  };

  const handleDelete = () => {
    if (!effectiveUrl || !effectiveMediaType) return;

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
              await mediaCache.deleteCachedMedia(
                effectiveUrl,
                effectiveMediaType
              );
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
      const ok = await saveMediaToGallery(
        effectiveUrl,
        effectiveMediaType,
        effectiveOriginalFileName!
      );
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

      const source = await mediaCache.getCachedItem(
        effectiveUrl,
        effectiveMediaType
      );
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
      <SafeAreaProvider initialMetrics={initialWindowMetrics} style={styles.flex1}>
        <SafeAreaView
          style={[styles.flex1, styles.modalOverlay]}
          edges={["top", "bottom"]}
        >
          <View style={styles.modalInner}>
            <View
              style={[styles.topBar, styles.topBarPosition]}
            >
          {/* Navigation buttons (left) */}
          {(hasAttachments && attachments!.length > 1) || enableSwipeNavigation ? (
            <View style={styles.navigationSection}>
              <IconButton
                icon="chevron-left"
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={() => {
                  if (hasAttachments) {
                    const nextIndex =
                      safeIndex === 0
                        ? attachments!.length - 1
                        : safeIndex - 1;
                    setCurrentIndex(nextIndex);
                    onCurrentIndexChange?.(nextIndex);
                  } else {
                    onSwipeRight?.();
                  }
                }}
                accessibilityLabel="previous-media"
              />
              <Text style={styles.counterText}>{computedPosition}</Text>
              <IconButton
                icon="chevron-right"
                size={20}
                iconColor="white"
                style={styles.iconButton}
                onPress={() => {
                  if (hasAttachments) {
                    const nextIndex = (safeIndex + 1) % attachments!.length;
                    setCurrentIndex(nextIndex);
                    onCurrentIndexChange?.(nextIndex);
                  } else {
                    onSwipeLeft?.();
                  }
                }}
                accessibilityLabel="next-media"
              />
            </View>
          ) : null}

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

        <View style={styles.container}>
          <View style={styles.content}>
            <View style={styles.mediaCenter}>
              <AttachmentGalleryContent
              contentFit="contain"
              itemsToRender={3}
              onSwipeLeft={onSwipeLeft}
              onSwipeRight={onSwipeRight}
              attachments={
                hasAttachments
                  ? attachments!
                  : [
                      {
                        url: effectiveUrl,
                        mediaType: effectiveMediaType,
                        name: effectiveOriginalFileName,
                      } as NotificationAttachmentDto,
                    ]
              }
              notificationDate={notificationDate ?? Date.now()}
              zoomEnabled
              initialIndex={hasAttachments ? safeIndex : 0}
              onIndexChange={(index) => {
                if (hasAttachments) {
                  setCurrentIndex(index);
                  onCurrentIndexChange?.(index);
                }
              }}
              onSwipeToClose={onClose}
            />
            </View>
          </View>

          {/* Bottom description with title and cache info - now in flex layout */}
          {showInfo &&
            (description ||
              effectiveOriginalFileName ||
              cacheInfo ||
              notificationDate) && (
              <Pressable
                style={[
                  styles.bottomBar,
                  Platform.OS === "web" &&
                    isFooterHovered &&
                    styles.bottomBarHovered,
                ]}
                onHoverIn={() => setIsFooterHovered(true)}
                onHoverOut={() => setIsFooterHovered(false)}
              >
                {effectiveOriginalFileName && (
                  <Text style={styles.descTitle} numberOfLines={1}>
                    {effectiveOriginalFileName}
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
                  {effectiveUrl && (
                    <Text style={styles.cacheInfoText} numberOfLines={1}>
                      URL: {effectiveUrl}
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
        </SafeAreaView>
      </SafeAreaProvider>
    </Modal>
  );
}

const styles = StyleSheet.create({
  flex1: { flex: 1 },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
  },
  modalInner: {
    flex: 1,
  },
  container: {
    flex: 1,
    flexDirection: "column",
    paddingTop: 48,
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
  topBarPosition: {
    top: 8,
    backgroundColor: "rgba(0,0,0,0.7)",
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
    width: "100%",
    alignSelf: "stretch",
    alignItems: "stretch",
  },
  mediaCenter: {
    flex: 1,
    width: "100%",
    minHeight: 200,
  },
  media: { width: "95%", height: "80%" },
  bottomBar: {
    padding: 16,
    paddingBottom: 20,
    backgroundColor: "rgba(0,0,0,0.75)",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  bottomBarHovered: {
    backgroundColor: "rgba(0,0,0,0.95)",
    transform: [{ translateY: -4 }],
    shadowColor: "#000",
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
