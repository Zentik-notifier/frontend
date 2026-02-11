import { useShareI18n } from "@/share-extension/ShareExtensionI18n";
import { ShareThemeProvider, useShareTheme } from "@/ShareThemeContext";
import { authService } from "@/services/auth-service";
import { mediaCache } from "@/services/media-cache-service";
import { settingsService } from "@/services/settings-service";
import { getCustomScheme } from "@/utils/universal-links";
import * as Linking from "expo-linking";
import {
  InitialProps,
  clearAppGroupContainer,
  close,
} from "expo-share-extension";
import * as DocumentPicker from "expo-document-picker";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";

const DeliveryType = {
  Normal: "NORMAL",
  Silent: "SILENT",
  Critical: "CRITICAL",
} as const;
type DeliveryTypeValue = (typeof DeliveryType)[keyof typeof DeliveryType];

// Bucket type from REST (GET /api/v1/buckets)
type Bucket = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  iconUrl?: string;
  iconAttachmentUuid?: string;
  externalNotifySystem?: { id?: string; type?: string };
};

const EXTERNAL_SYSTEM_ICONS: Record<string, number> = {
  NTFY: require("@/assets/icons/ntfy.svg"),
  Gotify: require("@/assets/icons/gotify.png"),
};

const BUCKET_SIZE = 80;
const EXTERNAL_SUBICON_SIZE = 30;
const BUCKETS_PER_ROW = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;

interface MediaPreviewItemProps {
  media: { url: string; mediaType: string };
  index: number;
}

const MediaPreviewItem: React.FC<MediaPreviewItemProps> = ({
  media,
  index,
}) => {
  const { colors } = useShareTheme();
  const isImage = media.mediaType === "IMAGE";
  return (
    <View style={styles.mediaPreviewItem}>
      {isImage ? (
        <Image
          source={{ uri: media.url }}
          style={[
            styles.mediaPreview,
            { backgroundColor: colors.surfaceVariant },
          ]}
          resizeMode="cover"
        />
      ) : (
        <View
          style={[
            styles.mediaPreview,
            {
              backgroundColor: colors.surfaceVariant,
              justifyContent: "center",
              alignItems: "center",
            },
          ]}
        >
          <Text style={{ color: colors.onSurfaceVariant }}>Video</Text>
        </View>
      )}
      <Text
        style={[
          styles.mediaPreviewLabel,
          { color: colors.onSurfaceVariant },
        ]}
        numberOfLines={1}
      >
        {isImage ? `Image ${index + 1}` : `Video ${index + 1}`}
      </Text>
    </View>
  );
};

function ShareExtensionContent(props: InitialProps) {
  const { url, images = [], videos = [] } = props;
  const { t } = useShareI18n();
  const { colors } = useShareTheme();
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [title, setTitle] = useState("Upload from Zentik");
  const [message, setMessage] = useState(url || "");
  const [subtitle, setSubtitle] = useState("");
  const [deliveryType, setDeliveryType] = useState<DeliveryTypeValue>(
    DeliveryType.Normal
  );
  const [optionsExpanded, setOptionsExpanded] = useState(false);
  const [snoozeInput, setSnoozeInput] = useState("");
  const [postponeInput, setPostponeInput] = useState("");
  const [extraMedia, setExtraMedia] = useState<{ url: string; mediaType: string }[]>([]);

  const sharedMedia = [
    ...images.map((u) => ({ url: u, mediaType: "IMAGE" })),
    ...videos.map((u) => ({ url: u, mediaType: "VIDEO" })),
  ];
  const allMedia = [...sharedMedia, ...extraMedia];

  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [cachedIconUris, setCachedIconUris] = useState<Record<string, string>>({});

  const loadBuckets = async () => {
    try {
      setError(null);
      const resp = await fetch(`${apiUrl}/api/v1/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Failed to load buckets (${resp.status})`);
      const data = await resp.json();
      setBuckets(Array.isArray(data) ? data : []);
      setSelectedBucket(
        Array.isArray(data) && data.length > 0 ? data[0] : null
      );
    } catch (e: any) {
      setError(e);
      setBuckets([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const sub = settingsService.isInitialized$.subscribe(
      async (initialized) => {
        if (!initialized) return;
        try {
          const apiUrl = settingsService.getApiUrl();
          if (!apiUrl) throw new Error("API URL not configured");

          const authData = settingsService.getAuthData();
          if (!authData.accessToken || !authData.refreshToken) {
            setNeedsLogin(true);
            setLoading(false);
            return;
          }

          const token = await authService.ensureValidToken(true);
          if (!token) {
            setNeedsLogin(true);
            setLoading(false);
            return;
          }

          setToken(token);
          setApiUrl(apiUrl);
        } catch (e: any) {
          setError(e);
          setLoading(false);
        }
      }
    );

    return () => sub.unsubscribe();
  }, []);

  useEffect(() => {
    if (apiUrl && token) {
      loadBuckets();
    }
  }, [apiUrl, token]);

  useEffect(() => {
    if (!buckets?.length) {
      setCachedIconUris({});
      return;
    }
    let cancelled = false;
    const loadCachedIcons = async () => {
      const next: Record<string, string> = {};
      for (const bucket of buckets) {
        if (cancelled) return;
        try {
          const uri = await mediaCache.getBucketIconFromCacheOnly(bucket.id, bucket.name);
          if (uri && !cancelled) next[bucket.id] = uri;
        } catch {
          // ignore
        }
      }
      if (!cancelled) setCachedIconUris((prev) => ({ ...prev, ...next }));
    };
    loadCachedIcons();
    return () => {
      cancelled = true;
    };
  }, [buckets]);

  const handleAddMoreMedia = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ["image/*", "video/*"],
        copyToCacheDirectory: true,
        multiple: true,
      } as any);
      if ((result as any).canceled) return;
      const files = (result as any).assets ?? [(result as any)];
      const newItems = files.map((f: { uri: string; mimeType?: string }) => {
        const mt = (f.mimeType || "").toLowerCase();
        const mediaType = mt.startsWith("video/") ? "VIDEO" : "IMAGE";
        return { url: f.uri, mediaType };
      });
      setExtraMedia((prev) => [...prev, ...newItems]);
    } catch (e) {
      console.warn("[ShareExtension] Document picker not available or failed:", e);
    }
  };

  const removeExtraMedia = (index: number) => {
    setExtraMedia((prev) => prev.filter((_, i) => i !== index));
  };

  const sendMessage = async () => {
    if (!title.trim()) {
      Alert.alert(t("common.error"), t("shareExtension.errors.titleRequired"));
      return;
    }

    if (!selectedBucket) {
      Alert.alert(t("common.error"), t("shareExtension.errors.bucketRequired"));
      return;
    }

    try {
      setSending(true);

      if (!token || !apiUrl) {
        Alert.alert(
          t("common.error"),
          t("shareExtension.errors.notAuthenticated")
        );
        return;
      }

      const successfulUploads: { uuid: string; mediaType: string }[] = [];
      for (const media of allMedia) {
        try {
          const formData = new FormData();
          const isImage = media.mediaType === "IMAGE";
          const pathParts = media.url.split("/");
          const originalFilename = pathParts[pathParts.length - 1];
          const fileExtension = originalFilename
            .split(".")
            .pop()
            ?.toLowerCase();
          let mimeType = isImage ? "image/jpeg" : "video/mp4";

          if (fileExtension) {
            if (isImage) {
              switch (fileExtension) {
                case "png":
                  mimeType = "image/png";
                  break;
                case "gif":
                  mimeType = "image/gif";
                  break;
                case "webp":
                  mimeType = "image/webp";
                  break;
                case "heic":
                  mimeType = "image/heic";
                  break;
                default:
                  mimeType = "image/jpeg";
                  break;
              }
            } else {
              switch (fileExtension) {
                case "mov":
                  mimeType = "video/quicktime";
                  break;
                case "avi":
                  mimeType = "video/x-msvideo";
                  break;
                case "webm":
                  mimeType = "video/webm";
                  break;
                default:
                  mimeType = "video/mp4";
                  break;
              }
            }
          }

          const filePart: any = {
            uri: media.url,
            name: originalFilename,
            type: mimeType,
          };
          formData.append("file", filePart);
          formData.append("filename", originalFilename);
          formData.append("mediaType", media.mediaType);

          const uploadResponse = await fetch(
            `${apiUrl}/api/v1/attachments/upload`,
            {
              method: "POST",
              headers: { Authorization: `Bearer ${token}` },
              body: formData,
            }
          );

          if (uploadResponse.ok) {
            const attachment = await uploadResponse.json();
            successfulUploads.push({
              uuid: attachment.id,
              mediaType: media.mediaType,
            });
          } else {
            console.error(`Failed to upload ${media.url}:`, uploadResponse.status);
          }
        } catch (error) {
          console.error(`Error uploading ${media.url}:`, error);
        }
      }
      const snoozes = snoozeInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 1);
      const postpones = postponeInput
        .split(",")
        .map((s) => parseInt(s.trim(), 10))
        .filter((n) => !Number.isNaN(n) && n >= 1);

      const payload: Record<string, unknown> = {
        title: title.trim(),
        body: message.trim() || undefined,
        subtitle: subtitle.trim() || undefined,
        bucketId: selectedBucket.id,
        deliveryType,
        attachmentUuids: successfulUploads.map((result) => result.uuid),
      };
      if (snoozes.length > 0) payload.snoozes = snoozes;
      if (postpones.length > 0) payload.postpones = postpones;

      const response = await fetch(`${apiUrl}/api/v1/messages`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `Failed to send message: ${response.status}`
        );
      }

      Alert.alert(
        t("shareExtension.success.title"),
        t("shareExtension.success.message"),
        [{ text: t("common.ok"), onPress: () => { } }]
      );

      setTitle("");
      setMessage("");
      setSubtitle("");
      setExtraMedia([]);
      setSnoozeInput("");
      setPostponeInput("");
    } catch (err: any) {
      console.error("[ShareExtension] Error sending message:", err);
      Alert.alert(
        t("common.error"),
        err.message || t("shareExtension.errors.sendFailed")
      );
    } finally {
      setSending(false);
      await clearAppGroupContainer();
      close();
    }
  };

  const handleOpenApp = async () => {
    try {
      const scheme = getCustomScheme();
      const url = `${scheme}://`;
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        Alert.alert(
          t("common.error") || "Errore",
          "Impossibile aprire l'app Zentik. Assicurati che sia installata."
        );
        return;
      }
      await Linking.openURL(url);
    } catch (error) {
      console.error("[ShareExtension] Error opening app:", error);
      Alert.alert(
        t("common.error") || "Errore",
        "Impossibile aprire l'app Zentik."
      );
    }
  };

  const resolveIconUri = (bucket: Bucket): string | null => {
    const raw = bucket.iconUrl;
    if (!raw || !raw.trim()) return null;
    if (raw.startsWith("http")) return raw;
    if (apiUrl && (raw.startsWith("/") || !raw.startsWith("http"))) {
      const base = apiUrl.replace(/\/$/, "");
      return raw.startsWith("/") ? `${base}${raw}` : `${base}/${raw}`;
    }
    return null;
  };

  const renderBucketIcon = (bucket: Bucket) => {
    const backgroundColor = bucket.color || colors.primary;
    const initials = bucket.name.substring(0, 2).toUpperCase();
    const iconUri = cachedIconUris[bucket.id] ?? resolveIconUri(bucket);
    const externalType = bucket.externalNotifySystem?.type;
    const externalIcon = externalType ? EXTERNAL_SYSTEM_ICONS[externalType] : null;

    return (
      <View style={styles.bucketIconWrapper}>
        <View style={[styles.bucketIcon, { backgroundColor }]}>
          {iconUri ? (
            <Image
              source={{ uri: iconUri }}
              style={[styles.bucketIconImage, { borderRadius: BUCKET_SIZE / 2 }]}
              resizeMode="cover"
            />
          ) : (
            <Text style={styles.bucketInitial}>{initials}</Text>
          )}
        </View>
        {externalIcon && (
          <View
            style={[styles.externalSubicon, { width: EXTERNAL_SUBICON_SIZE, height: EXTERNAL_SUBICON_SIZE }]}
            pointerEvents="none"
          >
            <Image
              source={externalIcon}
              style={{ width: EXTERNAL_SUBICON_SIZE, height: EXTERNAL_SUBICON_SIZE }}
              resizeMode="contain"
            />
          </View>
        )}
      </View>
    );
  };

  const renderBucket = (bucket: Bucket, index: number) => {
    const isSelected = selectedBucket?.id === bucket.id;

    return (
      <TouchableOpacity
        key={bucket.id}
        style={[
          styles.bucketItem,
          {
            backgroundColor: colors.surface,
          },
          isSelected && [
            styles.bucketItemSelected,
            {
              borderColor: colors.primary,
              backgroundColor: colors.primaryContainer,
            },
          ],
        ]}
        onPress={() => setSelectedBucket(bucket)}
      >
        {renderBucketIcon(bucket)}
        <Text
          style={[styles.bucketName, { color: colors.onSurface }]}
          numberOfLines={1}
        >
          {bucket.name}
        </Text>
      </TouchableOpacity>
    );
  };

  if (error) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.error }]}>
          {error.message || "Failed to load buckets"}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadBuckets}>
          {t("shareExtension.retry")}
        </TouchableOpacity>
      </View>
    );
  }

  if (needsLogin) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("shareExtension.errors.notAuthenticated")}
        </Text>
        <Text
          style={[styles.helperText, { color: colors.onSurfaceVariant }]}
        >
          {t("shareExtension.loginRequired")}
        </Text>
        <View style={styles.loginButtonsContainer}>
          {/* <TouchableOpacity
              style={[
                styles.openAppButton,
                { backgroundColor: colors.primary },
              ]}
              onPress={handleOpenApp}
            >
              <Text
                style={[
                  styles.openAppButtonText,
                  { color: colors.onPrimary },
                ]}
              >
                {t("shareExtension.openApp")}
              </Text>
            </TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: colors.outline }]}
            onPress={close}
          >
            <Text
              style={[
                styles.closeButtonText,
                { color: colors.onSurface },
              ]}
            >
              {"Chiudi"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  if (loading) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.onSurface }]}>
          {t("shareExtension.loading")}
        </Text>
      </View>
    );
  }

  if (!buckets || buckets.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: colors.background },
        ]}
      >
        <Text style={[styles.errorText, { color: colors.error }]}>
          {t("shareExtension.noBuckets")}
        </Text>
        <Text
          style={[styles.helperText, { color: colors.onSurfaceVariant }]}
        >
          {t("shareExtension.noBucketsHelper")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background }]}
    >
      {/* Header + Form inputs at the top */}
      <View style={[styles.topForm, { backgroundColor: colors.surface }]}>
        <View style={styles.headerRow}>
          {/* <Text style={[styles.headerTitle, { color: colors.onSurface }]}>
            Zentik
          </Text>
          <ThemeSwitcher variant="button" /> */}
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.onSurface }]}>
            {t("shareExtension.titleRequired")}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.inputCompact,
              {
                borderColor: colors.outline,
                color: colors.onSurface,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={t("shareExtension.titlePlaceholder")}
            placeholderTextColor={colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={[styles.formLabel, { color: colors.onSurface }]}>
            {t("shareExtension.messageLabel")}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                borderColor: colors.outline,
                color: colors.onSurface,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={t("shareExtension.messagePlaceholder")}
            placeholderTextColor={colors.onSurfaceVariant}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Media preview section */}
      <View
        style={[
          styles.mediaPreviewSection,
          {
            backgroundColor: colors.surface,
            borderBottomColor: colors.outline,
          },
        ]}
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {allMedia.map((media, index: number) => (
            <View key={index} style={styles.mediaPreviewWrapper}>
              <MediaPreviewItem media={media} index={index} />
              {index >= sharedMedia.length && (
                <TouchableOpacity
                  style={[styles.removeMediaBtn, { backgroundColor: colors.error }]}
                  onPress={() => removeExtraMedia(index - sharedMedia.length)}
                >
                  <Text style={[styles.iconChar, { color: colors.onError, fontSize: 16 }]}>×</Text>
                </TouchableOpacity>
              )}
            </View>
          ))}
          <TouchableOpacity
            style={[styles.addMediaSlot, { borderColor: colors.primary }]}
            onPress={handleAddMoreMedia}
          >
            <Text style={[styles.iconChar, { color: colors.primary, fontSize: 28 }]}>+</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* More options */}
      <View style={[styles.moreOptionsSection, { backgroundColor: colors.surface }]}>
        <TouchableOpacity
          style={[styles.moreOptionsRow, { borderBottomColor: colors.outline }]}
          onPress={() => setOptionsExpanded((e) => !e)}
        >
          <Text style={[styles.iconChar, { color: colors.primary, fontSize: 20 }]}>⋯</Text>
          <Text style={[styles.moreOptionsRowText, { color: colors.onSurface }]}>
            {t("compose.messageBuilder.more" as any)}
          </Text>
          <Text style={[styles.iconChar, { color: colors.onSurfaceVariant, fontSize: 18 }]}>
            {optionsExpanded ? "▲" : "▼"}
          </Text>
        </TouchableOpacity>
        {optionsExpanded && (
          <View style={styles.moreOptionsContent}>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.onSurface }]}>
                {t("notifications.settings.deliveryType" as any)}
              </Text>
              <View style={styles.deliveryTypeRow}>
                {[
                  DeliveryType.Normal,
                  DeliveryType.Critical,
                  DeliveryType.Silent,
                ].map((type) => (
                  <TouchableOpacity
                    key={type}
                    onPress={() => setDeliveryType(type)}
                    style={[
                      styles.deliveryChip,
                      {
                        borderColor: colors.outline,
                        backgroundColor:
                          deliveryType === type
                            ? colors.primaryContainer
                            : colors.surfaceVariant,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.deliveryChipText,
                        {
                          color:
                            deliveryType === type
                              ? colors.onPrimaryContainer
                              : colors.onSurfaceVariant,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {type === DeliveryType.Normal
                        ? t("compose.messageBuilder.deliveryType.normal" as any)
                        : type === DeliveryType.Critical
                          ? t("compose.messageBuilder.deliveryType.critical" as any)
                          : t("compose.messageBuilder.deliveryType.silent" as any)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.onSurface }]}>
                {t("compose.messageBuilder.subtitle" as any)}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.outline, color: colors.onSurface },
                ]}
                value={subtitle}
                onChangeText={setSubtitle}
                placeholder={t("compose.messageBuilder.subtitlePlaceholder" as any)}
                placeholderTextColor={colors.onSurfaceVariant}
              />
            </View>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.onSurface }]}>
                {t("notifications.automaticActions.snoozeTimes" as any)}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.outline, color: colors.onSurface },
                ]}
                value={snoozeInput}
                onChangeText={setSnoozeInput}
                placeholder={t("notifications.automaticActions.snoozeTimePlaceholder" as any)}
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="numbers-and-punctuation"
              />
            </View>
            <View style={styles.formSection}>
              <Text style={[styles.formLabel, { color: colors.onSurface }]}>
                {t("notifications.automaticActions.postponeTimes" as any)}
              </Text>
              <TextInput
                style={[
                  styles.input,
                  { borderColor: colors.outline, color: colors.onSurface },
                ]}
                value={postponeInput}
                onChangeText={setPostponeInput}
                placeholder={t("notifications.automaticActions.postponeTimePlaceholder" as any)}
                placeholderTextColor={colors.onSurfaceVariant}
                keyboardType="numbers-and-punctuation"
              />
            </View>
          </View>
        )}
      </View>

      {/* Buckets selection */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Text style={[styles.sectionLabel, { color: colors.onSurface }]}>
          {t("shareExtension.selectBucket")}
        </Text>

        <View style={styles.bucketsGrid}>
          {buckets.map((bucket, index) => renderBucket(bucket, index))}
        </View>
      </ScrollView>

      {/* Send button at bottom */}
      <View
        style={[
          styles.bottomButton,
          {
            backgroundColor: colors.surface,
            borderTopColor: colors.outline,
          },
        ]}
      >
        <TouchableOpacity
          onPress={sendMessage}
          disabled={sending}
          style={[
            styles.sendButton,
            { backgroundColor: colors.primary },
            sending && styles.sendButtonDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={colors.onPrimary} />
          ) : (
            <Text
              style={[styles.sendButtonText, { color: colors.onPrimary }]}
            >
              {t("shareExtension.sendButton")}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topForm: {
    padding: 16,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 80, // Space for bottom button
  },
  bottomButton: {
    padding: 16,
    borderTopWidth: 1,
  },
  mediaPreviewSection: {
    padding: 16,
    borderBottomWidth: 1,
  },
  mediaPreviewWrapper: {
    marginRight: 12,
    position: "relative",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  addMediaSlot: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 2,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  deliveryTypeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 4,
  },
  deliveryChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    minWidth: 80,
    alignItems: "center",
  },
  deliveryChipText: {
    fontSize: 13,
    fontWeight: "500",
  },
  moreOptionsSection: {
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.08)",
  },
  moreOptionsRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
    borderBottomWidth: 1,
  },
  moreOptionsRowText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "500",
  },
  moreOptionsContent: {
    padding: 16,
    paddingTop: 8,
  },
  mediaPreviewItem: {
    marginRight: 12,
    alignItems: "center",
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
  },
  mediaPreviewLabel: {
    fontSize: 12,
    marginTop: 4,
    textAlign: "center",
    maxWidth: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
  },
  bucketsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 16,
  },
  bucketItem: {
    width: (SCREEN_WIDTH - 64) / BUCKETS_PER_ROW,
    alignItems: "center",
    padding: 12,
    borderRadius: 16,
    borderWidth: 3,
    borderColor: "transparent",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  bucketItemSelected: {
    shadowOpacity: 0.2,
    elevation: 5,
  },
  bucketIconWrapper: {
    position: "relative",
    marginBottom: 8,
  },
  bucketIcon: {
    width: BUCKET_SIZE,
    height: BUCKET_SIZE,
    borderRadius: BUCKET_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  bucketIconImage: {
    position: "absolute",
    width: BUCKET_SIZE,
    height: BUCKET_SIZE,
  },
  externalSubicon: {
    position: "absolute",
    bottom: 0,
    right: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  bucketInitial: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "bold",
  },
  bucketName: {
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  iconChar: {
    fontWeight: "600",
    lineHeight: 22,
  },
  formSection: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    marginTop: 4,
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    backgroundColor: "transparent",
  },
  inputCompact: {
    paddingVertical: 8,
    minHeight: 44,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  sendButton: {
    marginTop: 4,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  sendButtonDisabled: {
    opacity: 0.6,
  },
  sendButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  loginButtonsContainer: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
    width: "100%",
    paddingHorizontal: 16,
  },
  openAppButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  openAppButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
  closeButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    backgroundColor: "transparent",
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
});

export default function ShareExtension(props: InitialProps) {
  return (
    <ShareThemeProvider>
      <ShareExtensionContent {...props} />
    </ShareThemeProvider>
  );
}
