import { QueryProviders } from "@/components/QueryProviders";
import { MediaType, MediaViewer } from "@/components/ui";
import { useI18n } from "@/hooks/useI18n";
import { ThemeProvider, useAppTheme } from "@/hooks/useTheme";
import { authService } from "@/services/auth-service";
import { settingsService } from "@/services/settings-service";
import { Image } from "expo-image";
import * as Linking from "expo-linking";
import {
  InitialProps,
  clearAppGroupContainer,
  close,
} from "expo-share-extension";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";
import { getCustomScheme } from "@/utils/universal-links";
import { NotificationDeliveryType } from "./generated/gql-operations-generated";

// Bucket type from REST
type Bucket = {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  iconUrl?: string;
  iconAttachmentUuid?: string;
};

const BUCKET_SIZE = 80;
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
  return (
    <View style={styles.mediaPreviewItem}>
      <MediaViewer
        url={media.url}
        mediaType={media.mediaType as MediaType}
        style={styles.mediaPreview}
        contentFit="cover"
        showVideoControls={false}
        isMuted
        autoPlay
        isLooping
      />
      <Text style={styles.mediaPreviewLabel} numberOfLines={1}>
        {media.mediaType === "IMAGE"
          ? `Image ${index + 1}`
          : `Video ${index + 1}`}
      </Text>
    </View>
  );
};

function ShareExtensionContent(props: InitialProps) {
  const { url, images = [], videos = [] } = props;
  const { t } = useI18n();
  const { themeMode, setThemeMode } = useAppTheme();
  const theme = useTheme();
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [title, setTitle] = useState("Upload from Zentik");
  const [message, setMessage] = useState(url || "");

  // Combine images and videos for preview
  const allMedia = [
    ...images.map((url) => ({ url, mediaType: "IMAGE" })),
    ...videos.map((url) => ({ url, mediaType: "VIDEO" })),
  ];

  const [token, setToken] = useState<string | null>(null);
  const [apiUrl, setApiUrl] = useState<string | null>(null);
  const [buckets, setBuckets] = useState<Bucket[] | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [needsLogin, setNeedsLogin] = useState(false);

  const loadBuckets = async () => {
    try {
      setError(null);
      const resp = await fetch(`${apiUrl}/api/v1/buckets`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error(`Failed to load buckets (${resp.status})`);
      const data = await resp.json();
      setBuckets(data);

      setSelectedBucket(data[0]);
    } catch (e: any) {
      console.log(e);
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

      // First, upload all attachments in parallel and get their UUIDs
      const uploadPromises = allMedia.map(async (media) => {
        try {
          // Use FormData with native file uri without reading file contents
          const formData = new FormData();
          const isImage = media.mediaType === "IMAGE";

          // Extract filename from the local path
          const pathParts = media.url.split("/");
          const originalFilename = pathParts[pathParts.length - 1];

          // Determine mime type based on file extension
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

          // Upload attachment
          const uploadResponse = await fetch(
            `${apiUrl}/api/v1/attachments/upload`,
            {
              method: "POST",
              headers: {
                Authorization: `Bearer ${token}`,
              },
              body: formData,
            }
          );

          if (uploadResponse.ok) {
            const attachment = await uploadResponse.json();
            return {
              success: true,
              uuid: attachment.id,
              mediaType: media.mediaType,
            };
          } else {
            console.error(
              `Failed to upload ${media.url}:`,
              uploadResponse.status
            );
            return { success: false, error: `HTTP ${uploadResponse.status}` };
          }
        } catch (error) {
          console.error(`Error uploading ${media.url}:`, error);
          return { success: false, error: (error as Error).message };
        }
      });

      // Wait for all uploads to complete
      const uploadResults = await Promise.all(uploadPromises);

      // Filter successful uploads for payload
      const successfulUploads = uploadResults.filter(
        (result) => result.success
      );
      const payload = {
        title: title.trim(),
        body: message.trim() || undefined,
        bucketId: selectedBucket.id,
        deliveryType: NotificationDeliveryType.Normal,
        attachmentUuids: successfulUploads.map((result) => result.uuid),
      };

      const response = await fetch(`${apiUrl}/message`, {
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
        [{ text: t("common.ok"), onPress: () => {} }]
      );

      setTitle("");
      setMessage("");
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

  const handleToggleTheme = () => {
    const nextMode =
      themeMode === "light"
        ? "dark"
        : themeMode === "dark"
        ? "system"
        : "light";
    setThemeMode(nextMode);
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

  const renderBucketIcon = (bucket: Bucket) => {
    const backgroundColor = bucket.color || theme.colors.primary;
    const initials = bucket.name.substring(0, 2).toUpperCase();

    // Priority: iconUrl (preferred) > iconAttachmentUuid > icon URL > color + initials
    if (bucket.iconUrl && bucket.iconUrl.startsWith("http")) {
      return (
        <Image
          source={{ uri: bucket.iconUrl }}
          style={styles.bucketIcon}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      );
    }

    // Fallback: colored circle with initials
    return (
      <View style={[styles.bucketIcon, { backgroundColor }]}>
        <Text style={styles.bucketInitial}>{initials}</Text>
      </View>
    );
  };

  const renderBucket = (bucket: Bucket, index: number) => {
    const isSelected = selectedBucket?.id === bucket.id;

    return (
      <TouchableOpacity
        key={bucket.id}
        style={[styles.bucketItem, isSelected && styles.bucketItemSelected]}
        onPress={() => setSelectedBucket(bucket)}
      >
        {renderBucketIcon(bucket)}
        <Text style={styles.bucketName} numberOfLines={1}>
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
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={styles.errorText}>
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
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={styles.errorText}>
          {t("shareExtension.errors.notAuthenticated")}
        </Text>
        <Text style={styles.helperText}>
          {t("shareExtension.loginRequired")}
        </Text>
        <View style={styles.loginButtonsContainer}>
          {/* <TouchableOpacity
              style={[
                styles.openAppButton,
                { backgroundColor: theme.colors.primary },
              ]}
              onPress={handleOpenApp}
            >
              <Text
                style={[
                  styles.openAppButtonText,
                  { color: theme.colors.onPrimary },
                ]}
              >
                {t("shareExtension.openApp")}
              </Text>
            </TouchableOpacity> */}
          <TouchableOpacity
            style={[styles.closeButton, { borderColor: theme.colors.outline }]}
            onPress={close}
          >
            <Text
              style={[
                styles.closeButtonText,
                { color: theme.colors.onSurface },
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
          { backgroundColor: theme.colors.background },
        ]}
      >
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={styles.loadingText}>{t("shareExtension.loading")}</Text>
      </View>
    );
  }

  if (!buckets || buckets.length === 0) {
    return (
      <View
        style={[
          styles.centerContainer,
          { backgroundColor: theme.colors.background },
        ]}
      >
        <Text style={styles.errorText}>{t("shareExtension.noBuckets")}</Text>
        <Text style={styles.helperText}>
          {t("shareExtension.noBucketsHelper")}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      {/* Header + Form inputs at the top */}
      <View style={[styles.topForm, { backgroundColor: theme.colors.surface }]}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Zentik</Text>
          <TouchableOpacity
            onPress={handleToggleTheme}
            style={styles.themeToggle}
          >
            <Text style={styles.themeToggleText}>
              {themeMode === "light"
                ? "☀️"
                : themeMode === "dark"
                ? "🌙"
                : "🌓"}
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>
            {t("shareExtension.titleRequired")}
          </Text>
          <TextInput
            style={[
              styles.input,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
              },
            ]}
            value={title}
            onChangeText={setTitle}
            placeholder={t("shareExtension.titlePlaceholder")}
            placeholderTextColor={theme.colors.onSurfaceVariant}
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>
            {t("shareExtension.messageLabel")}
          </Text>
          <TextInput
            style={[
              styles.input,
              styles.textArea,
              {
                borderColor: theme.colors.outline,
                color: theme.colors.onSurface,
              },
            ]}
            value={message}
            onChangeText={setMessage}
            placeholder={t("shareExtension.messagePlaceholder")}
            placeholderTextColor={theme.colors.onSurfaceVariant}
            multiline
            numberOfLines={3}
          />
        </View>
      </View>

      {/* Media preview section */}
      {allMedia.length > 0 && (
        <View
          style={[
            styles.mediaPreviewSection,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {allMedia.map((media, index: number) => (
              <MediaPreviewItem key={index} media={media} index={index} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Buckets selection */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <Text style={styles.sectionLabel}>
          {t("shareExtension.selectBucket")}
        </Text>

        <View style={styles.bucketsGrid}>
          {buckets.map((bucket, index) => renderBucket(bucket, index))}
        </View>
      </ScrollView>

      {/* Send button at bottom */}
      <View
        style={[styles.bottomButton, { backgroundColor: theme.colors.surface }]}
      >
        <TouchableOpacity
          onPress={sendMessage}
          disabled={sending}
          style={[
            styles.sendButton,
            { backgroundColor: theme.colors.primary },
            sending && styles.sendButtonDisabled,
          ]}
        >
          {sending ? (
            <ActivityIndicator color={theme.colors.onPrimary} />
          ) : (
            <Text
              style={[styles.sendButtonText, { color: theme.colors.onPrimary }]}
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
  themeToggle: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 16,
  },
  themeToggleText: {
    fontSize: 18,
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
    borderTopColor: "#e0e0e0",
  },
  mediaPreviewSection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  mediaPreviewItem: {
    marginRight: 12,
    alignItems: "center",
  },
  mediaPreview: {
    width: 80,
    height: 80,
    borderRadius: 8,
    backgroundColor: "#f5f5f5",
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
    backgroundColor: "#fff",
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
    borderColor: "#6200EE",
    backgroundColor: "#F3E5F5",
    shadowOpacity: 0.2,
    elevation: 5,
  },
  bucketIcon: {
    width: BUCKET_SIZE,
    height: BUCKET_SIZE,
    borderRadius: BUCKET_SIZE / 2,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
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
    <QueryProviders>
      <ThemeProvider>
        <ShareExtensionContent {...props} />
      </ThemeProvider>
    </QueryProviders>
  );
}
