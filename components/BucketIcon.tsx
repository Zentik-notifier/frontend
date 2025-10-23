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
  const { data: appConfig } = usePublicAppConfigQuery();
  const uploadEnabled = appConfig?.publicAppConfig?.uploadEnabled ?? true;

  const { bucket, isOrphan } = useBucket(bucketId, {
    userId: userId ?? undefined,
  });
  const { color, icon, iconAttachmentUuid, name: bucketName } = bucket || {};
  const { navigateToDanglingBucket, navigateToBucketDetail } =
    useNavigationUtils();

  const [sharedCacheIconUri, setSharedCacheIconUri] = useState<string | null>(
    null
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Load bucket icon and subscribe to updates
  // Subscribe FIRST to avoid race condition where icon downloads before subscription
  useEffect(() => {
    if (!bucketId || !bucketName) return;

    // If attachments are disabled, skip icon loading/generation
    if (!uploadEnabled) {
      console.log(
        `[BucketIcon] Attachments disabled, using fallback for ${bucketName}`
      );
      return;
    }

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
        // Determine icon URL: use attachment API if UUID exists, otherwise fallback to custom icon URL
        let iconUrlToUse: string | undefined = undefined;

        if (iconAttachmentUuid) {
          // Use attachment API (public endpoint)
          const apiUrl = await settingsService.getApiUrl();
          iconUrlToUse = `${apiUrl}/api/v1/attachments/${iconAttachmentUuid}/download/public`;
        } else if (
          icon &&
          typeof icon === "string" &&
          icon.startsWith("http")
        ) {
          // Use custom icon URL
          iconUrlToUse = icon;
        }

        // Get from cache or add to queue if not found
        // Pass iconAttachmentUuid for stable caching (instead of full URL that may change)
        const iconUri = await mediaCache.getBucketIcon(
          bucketId,
          bucketName,
          color ?? undefined,
          iconUrlToUse
        );

        // await mediaCache.invalidateBucketIcon(bucketId, bucketName, bucketColor);
        // if (bucket?.id === "a1f61182-afd4-4cd2-9077-ac0b42b64bce") {
        //   console.log("BUCKET", iconUrlToUse, iconUri);
        // }

        if (iconUri) {
          // Found in cache, use immediately
          // console.log(`[BucketIcon] Found in cache for ${bucketName}: ${iconUri}`);
          setSharedCacheIconUri(iconUri);
          setIsGenerating(false);
        } else {
          // Not in cache, added to queue - show loading state
          setIsGenerating(true);
        }
      } catch (error) {
        console.error("[BucketIcon] Error loading/generating icon:", error);
        setIsGenerating(false);
      }
    };

    // Subscribe to init ready event to retry if DB wasn't ready initially
    const initReadySubscription = mediaCache.initReady.subscribe(() => {
      loadOrGenerateIcon();
    });

    loadOrGenerateIcon();

    return () => {
      iconReadySubscription.unsubscribe();
      initReadySubscription.unsubscribe();
    };
  }, [bucketId, bucketName, color, iconAttachmentUuid, uploadEnabled]);

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
                backgroundColor: theme.colors.error,
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
                backgroundColor: !uploadEnabled ? bucketColor : undefined, // Show colored background when attachments disabled
              },
            ]}
          >
            {uploadEnabled && sharedCacheIconUri ? (
              // Attachments enabled: Downloaded icon from backend (PNG with color + optional initials embedded)
              <Image
                source={{ uri: sharedCacheIconUri }}
                style={{
                  width: currentSize.icon,
                  height: currentSize.icon,
                  borderRadius: currentSize.icon / 2,
                  overflow: "hidden",
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
                recyclingKey={sharedCacheIconUri}
              />
            ) : uploadEnabled && (isGenerating || !sharedCacheIconUri) ? (
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
            ) : !uploadEnabled &&
              icon &&
              typeof icon === "string" &&
              icon.startsWith("http") ? (
              // Attachments disabled: Show plain icon URL if available
              <Image
                source={{ uri: icon }}
                style={{
                  width: currentSize.icon,
                  height: currentSize.icon,
                  borderRadius: currentSize.icon / 2,
                  overflow: "hidden",
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
              />
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
