import { useI18n } from "@/hooks/useI18n";
import { useBucketsStats, useInitializeBucketsStats } from "@/hooks/notifications/useNotificationQueries";
import { settingsService } from "@/services/settings-service";
import { QueryProviders } from "@/components/QueryProviders";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
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

// Use the bucket type from the hooks
type Bucket = NonNullable<ReturnType<typeof useBucketsStats>['data']>[number];

const BUCKET_SIZE = 80;
const BUCKETS_PER_ROW = 3;
const SCREEN_WIDTH = Dimensions.get("window").width;

// Helper function to get access token from Keychain
interface ShareExtensionProps {
  url: string;
}

function ShareExtensionContent({ url }: ShareExtensionProps) {
  const { t } = useI18n();
  const [sending, setSending] = useState(false);
  const [selectedBucket, setSelectedBucket] = useState<Bucket | null>(null);
  const [title, setTitle] = useState("");
  const [message, setMessage] = useState(url || "");
  
  // Use buckets stats hook that handles cache + GraphQL automatically
  const { data: buckets, isLoading: loading, error, refreshBucketsStats } = useBucketsStats();
  
  // Hook to manually initialize buckets from API (for initial load)
  const { initializeBucketsStats } = useInitializeBucketsStats();
  
  // Initialize buckets on mount if not already loaded
  useEffect(() => {
    if ((!buckets || buckets.length === 0) && !loading) {
      console.log("[ShareExtension] No buckets in cache, initializing...");
      initializeBucketsStats().catch(console.error);
    }
  }, [buckets, loading, initializeBucketsStats]);
  
  // Set initial selected bucket when buckets are loaded
  useEffect(() => {
    if (buckets && buckets.length > 0 && !selectedBucket) {
      setSelectedBucket(buckets[0]);
    }
  }, [buckets, selectedBucket]);

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

      const token = await settingsService.getAccessTokenFromStorage();
      const apiUrl = settingsService.getApiUrl();

      if (!token || !apiUrl) {
        Alert.alert(
          t("common.error"),
          t("shareExtension.errors.notAuthenticated")
        );
        return;
      }

      const payload = {
        title: title.trim(),
        body: message.trim() || undefined,
        bucketId: selectedBucket.id,
        deliveryType: "normal",
      };

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
    }
  };

  const renderBucketIcon = (bucket: Bucket) => {
    const backgroundColor = bucket.color || "#6200EE";
    const initials = bucket.name.substring(0, 2).toUpperCase();

    // Priority: iconAttachmentUuid > icon URL > color + initials
    if (bucket.iconAttachmentUuid) {
      const apiUrl = settingsService.getApiUrl();
      if (apiUrl) {
        const iconUrl = `${apiUrl}/api/v1/attachments/${bucket.iconAttachmentUuid}/download/public`;
        return (
          <Image
            source={{ uri: iconUrl }}
            style={styles.bucketIcon}
            contentFit="cover"
            cachePolicy="memory-disk"
          />
        );
      }
    }
    
    if (bucket.icon && bucket.icon.startsWith("http")) {
      return (
        <Image
          source={{ uri: bucket.icon }}
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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6200EE" />
        <Text style={styles.loadingText}>{t("shareExtension.loading")}</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error.message || "Failed to load buckets"}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={refreshBucketsStats}>
          <Text style={styles.retryButtonText}>
            {t("shareExtension.retry")}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!buckets || buckets.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{t("shareExtension.noBuckets")}</Text>
        <Text style={styles.helperText}>
          {t("shareExtension.noBucketsHelper")}
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
      >
        <View style={styles.headerContainer}>
          <Text style={styles.header}>{t("shareExtension.header")}</Text>
        </View>

        <Text style={styles.sectionLabel}>
          {t("shareExtension.selectBucket")}
        </Text>

        <View style={styles.bucketsGrid}>
          {buckets.map((bucket, index) => renderBucket(bucket, index))}
        </View>
      </ScrollView>

      <View style={styles.stickyForm}>
        <View style={styles.formSection}>
          <Text style={styles.formLabel}>
            {t("shareExtension.titleRequired")}
          </Text>
          <TextInput
            style={styles.input}
            value={title}
            onChangeText={setTitle}
            placeholder={t("shareExtension.titlePlaceholder")}
            placeholderTextColor="#999"
          />
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formLabel}>
            {t("shareExtension.messageLabel")}
          </Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            value={message}
            onChangeText={setMessage}
            placeholder={t("shareExtension.messagePlaceholder")}
            placeholderTextColor="#999"
            multiline
            numberOfLines={3}
          />
        </View>

        <TouchableOpacity
          style={[styles.sendButton, sending && styles.sendButtonDisabled]}
          onPress={sendMessage}
          disabled={sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.sendButtonText}>
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
    backgroundColor: "#f5f5f5",
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 16,
    paddingBottom: 320,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
    backgroundColor: "#fff",
  },
  headerContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  header: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#000",
    flex: 1,
  },
  refreshIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3E5F5",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  refreshText: {
    marginLeft: 6,
    fontSize: 12,
    color: "#6200EE",
    fontWeight: "500",
  },
  sectionLabel: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 16,
    color: "#000",
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
    color: "#000",
    textAlign: "center",
  },
  stickyForm: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 10,
  },
  formSection: {
    marginBottom: 12,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#000",
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: "#fff",
    color: "#000",
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  sendButton: {
    backgroundColor: "#6200EE",
    padding: 14,
    borderRadius: 8,
    alignItems: "center",
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
    color: "#666",
  },
  errorText: {
    fontSize: 16,
    color: "#d32f2f",
    textAlign: "center",
    marginBottom: 16,
  },
  helperText: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  retryButton: {
    marginTop: 16,
    paddingVertical: 12,
    paddingHorizontal: 24,
    backgroundColor: "#6200EE",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default function ShareExtension({ url }: ShareExtensionProps) {
  return (
    <QueryProviders>
      <ShareExtensionContent url={url} />
    </QueryProviders>
  );
}
