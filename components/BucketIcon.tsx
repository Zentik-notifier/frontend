import { settingsService } from "@/services/settings-service";
import { usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useBucket } from "@/hooks/notifications";
import { mediaCache } from "@/services/media-cache-service";
import { useNavigationUtils } from "@/utils/navigation";
import { Image } from "expo-image";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Icon, useTheme } from "react-native-paper";

const sizeMap = {
  sm: { container: 32, icon: 28, text: 14 },
  md: { container: 40, icon: 36, text: 16 },
  lg: { container: 48, icon: 44, text: 20 },
  xl: { container: 64, icon: 60, text: 24 },
  xxl: { container: 80, icon: 76, text: 28 },
};

interface BucketIconProps {
  size?: "sm" | "md" | "lg" | "xl" | "xxl";
  bucketId?: string;
  noRouting?: boolean;
  userId?: string | null;
}

export default function BucketIcon({
  size = "lg",
  bucketId,
  noRouting = false,
  userId = null,
}: BucketIconProps) {
  const theme = useTheme();

  const { bucket, isOrphan } = useBucket(bucketId, {
    userId: userId ?? undefined,
    autoFetch: false,
  });
  const {
    color,
    icon,
    iconAttachmentUuid,
    iconUrl,
    name: bucketName,
  } = bucket || {};
  const { navigateToDanglingBucket, navigateToBucketDetail } =
    useNavigationUtils();

  const [sharedCacheIconUri, setSharedCacheIconUri] = useState<string | null>(
    () => {
      // Initialize with cached value if available (instant access, no async delay)
      if (bucketId) {
        return mediaCache.getCachedBucketIconUri(bucketId);
      }
      return null;
    }
  );
  const [isGenerating, setIsGenerating] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Load bucket icon and subscribe to updates
  // Subscribe FIRST to avoid race condition where icon downloads before subscription
  useEffect(() => {
    if (!bucketId || !bucketName) return;

    // Subscribe to bucket icon ready events (reactive updates)
    const iconReadySubscription = mediaCache.bucketIconReady.subscribe(
      ({ bucketId: readyBucketId, uri }) => {
        if (readyBucketId === bucketId) {
          setSharedCacheIconUri(uri);
          setIsGenerating(false);
        }
      }
    );

    // Helper function to load icon
    const loadOrGenerateIcon = async () => {
      try {
        // Get from cache or add to queue if not found
        const iconUri = await mediaCache.getBucketIcon(
          bucketId,
          bucketName,
          iconUrl ?? undefined
        );

        if (iconUri) {
          // Found in cache, use immediately
          setSharedCacheIconUri(iconUri);
          setIsGenerating(false);
        } else {
          // Not in cache, added to queue - show loading state
          setIsGenerating(true);
        }

        // Mark initial load as complete
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error("[BucketIcon] Error loading/generating icon:", error);
        setIsGenerating(false);
        if (isInitialLoad) {
          setIsInitialLoad(false);
        }
      }
    };

    // Subscribe to init ready event to retry if DB wasn't ready initially
    const initReadySubscription = mediaCache.initReady.subscribe(() => {
      loadOrGenerateIcon();
    });

    // Call immediately without delay
    loadOrGenerateIcon();

    return () => {
      iconReadySubscription.unsubscribe();
      initReadySubscription.unsubscribe();
    };
  }, [bucketId, bucketName, color, iconUrl, iconAttachmentUuid]);

  if (!bucketId) {
    return null;
  }

  // Default color if none provided
  const bucketColor = color || theme.colors.primary;

  const currentSize = sizeMap[size];

  const handlePress = () => {
    if (bucketId) {
      if (isOrphan) {
        navigateToDanglingBucket(bucketId, true);
      } else if (!noRouting) {
        navigateToBucketDetail(bucketId);
      }
    }
  };

  const iconContent = (
    <View
      style={[
        styles.container,
        {
          width: currentSize.container,
          height: currentSize.container,
          borderRadius: currentSize.container / 2,
        },
      ]}
    >
      {/* Icon container */}
      {isOrphan ? (
        // TouchableWithoutFeedback per bucket orfani
        <TouchableWithoutFeedback onPress={handlePress}>
          <View
            style={[
              styles.iconContainer,
              {
                width: currentSize.icon,
                height: currentSize.icon,
                borderRadius: currentSize.icon / 2,
                backgroundColor: color ?? theme.colors.error,
              },
            ]}
          >
            <Icon
              source="link"
              size={currentSize.text}
              color={theme.colors.onError}
            />
          </View>
        </TouchableWithoutFeedback>
      ) : (
        <TouchableWithoutFeedback onPress={handlePress}>
          <View
            style={[
              styles.iconContainer,
              {
                width: currentSize.icon,
                height: currentSize.icon,
                borderRadius: currentSize.icon / 2,
                backgroundColor: bucketColor,
              },
            ]}
          >
            {sharedCacheIconUri ? (
              // Attachments enabled: Downloaded icon from backend (PNG with color + optional initials embedded)
              <Image
                source={{ uri: sharedCacheIconUri }}
                style={{
                  width: currentSize.icon,
                  height: currentSize.icon,
                  borderRadius: currentSize.icon / 2,
                }}
                contentFit="cover"
                cachePolicy="memory"
                recyclingKey={sharedCacheIconUri}
              />
            ) : isGenerating || !sharedCacheIconUri ? (
              // Loading state: show colored placeholder
              <View
                style={{
                  width: currentSize.icon,
                  height: currentSize.icon,
                  borderRadius: currentSize.icon / 2,
                  backgroundColor: bucketColor,
                  justifyContent: "center",
                  alignItems: "center",
                }}
              >
                <Icon
                  source="image"
                  size={currentSize.text}
                  color={theme.colors.surface}
                />
              </View>
            ) : null}
          </View>
        </TouchableWithoutFeedback>
      )}
    </View>
  );

  // Se noRouting è true, wrappa il contenuto per bloccare la propagazione degli eventi
  if (noRouting) {
    return (
      <View
        onStartShouldSetResponder={() => true}
        onTouchEnd={(e) => e.stopPropagation()}
      >
        {iconContent}
      </View>
    );
  }

  return iconContent;
}

const styles = StyleSheet.create({
  container: {
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  bucketIconText: {
    // Styles applied inline for dynamic sizing
    fontWeight: "600",
    textAlign: "center",
  },
});
