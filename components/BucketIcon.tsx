import {
  BucketFragment,
  MediaType,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import { useBucket } from "@/hooks/notifications";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Image } from "expo-image";
import { Icon, Text, useTheme } from "react-native-paper";
import { mediaCache } from "@/services/media-cache-service";

const sizeMap = {
  sm: { container: 32, icon: 28, text: 14 },
  md: { container: 40, icon: 36, text: 16 },
  lg: { container: 48, icon: 44, text: 20 },
  xl: { container: 64, icon: 60, text: 24 },
  xxl: { container: 80, icon: 76, text: 28 },
};

interface BucketIconProps {
  size?: "lg" | "xl" | "xxl";
  bucketId?: string;
  iconUrl?: string;
  noRouting?: boolean;
  bucket?: BucketFragment;
}

export default function BucketIcon({
  size = "lg",
  bucketId: bucketIdParent,
  iconUrl,
  noRouting = false,
  bucket: bucketParent,
}: BucketIconProps) {
  const theme = useTheme();
  const { userId } = useAppContext();
  const { data: appConfig } = usePublicAppConfigQuery();
  const uploadEnabled = appConfig?.publicAppConfig?.uploadEnabled ?? true;

  const { bucket: bucketData, error } = useBucket(
    bucketIdParent ?? bucketParent?.id,
    { userId: userId ?? undefined }
  );
  const bucket = bucketParent || bucketData;
  const { color, icon: iconBucket, name: bucketName } = bucket || {};
  const { navigateToDanglingBucket, navigateToBucketDetail } =
    useNavigationUtils();
  const bucketId = bucket?.id || bucketIdParent;
  const icon = bucketData?.icon ?? iconBucket ?? iconUrl;
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
          console.log(`[BucketIcon] Received icon for ${bucketName}: ${uri}`);
          setSharedCacheIconUri(uri);
          setIsGenerating(false);
        }
      }
    );

    // Helper function to load icon
    const loadOrGenerateIcon = async () => {
      try {
        // Determine icon URL if available
        const iconUrlToUse =
          icon && typeof icon === "string" && icon.startsWith("http")
            ? icon
            : undefined;

        // console.log(`[BucketIcon] Loading icon for ${bucketName}`, { iconUrlToUse });

        // Get from cache or add to queue if not found
        const iconUri = await mediaCache.getBucketIcon(
          bucketId,
          bucketName,
          color ?? undefined,
          iconUrlToUse
        );

        if (iconUri) {
          // Found in cache, use immediately
          // console.log(`[BucketIcon] Found in cache for ${bucketName}: ${iconUri}`);
          setSharedCacheIconUri(iconUri);
          setIsGenerating(false);
        } else {
          // Not in cache, added to queue - show loading state
          console.log(
            `[BucketIcon] Not in cache for ${bucketName}, waiting for queue...`
          );
          setIsGenerating(true);
        }
      } catch (error) {
        console.error("[BucketIcon] Error loading/generating icon:", error);
        setIsGenerating(false);
      }
    };

    // Subscribe to init ready event to retry if DB wasn't ready initially
    const initReadySubscription = mediaCache.initReady.subscribe(() => {
      // console.log(`[BucketIcon] MediaCache initialized, retrying for ${bucketName}`);
      loadOrGenerateIcon();
    });

    // Initial load attempt
    loadOrGenerateIcon();

    return () => {
      // console.log(`[BucketIcon] Cleaning up subscriptions for ${bucketName}`);
      iconReadySubscription.unsubscribe();
      initReadySubscription.unsubscribe();
    };
  }, [bucketId, bucketName, color, icon, uploadEnabled]);

  if (!bucketId && !iconUrl) {
    return null;
  }

  const isOrphaned = error && error.message.includes("Bucket not found");

  // Default color if none provided
  const bucketColor = color || theme.colors.primary;

  const currentSize = sizeMap[size];

  const handlePress = () => {
    if (bucketId) {
      if (isOrphaned) {
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
      {isOrphaned ? (
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
