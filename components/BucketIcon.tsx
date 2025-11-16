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
  bucketId: string;
  noRouting?: boolean;
  forceRefetch?: boolean;
  userId?: string | null;
}

export default function BucketIcon({
  size = "lg",
  bucketId,
  noRouting = false,
  userId = null,
  forceRefetch,
}: BucketIconProps) {
  const theme = useTheme();

  const { bucket, isOrphan } = useBucket(bucketId, {
    userId: userId ?? undefined,
    autoFetch: forceRefetch,
  });

  const [iconUri, setIconUri] = useState<string | null>(null);

  const { color } = bucket || {};

  const { navigateToDanglingBucket, navigateToBucketDetail } =
    useNavigationUtils();

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

  // Load bucket icon when bucket data is available
  useEffect(() => {
    if (!bucket) return;

    let cancelled = false;

    // Try to get cached icon synchronously first
    const cachedUri = mediaCache.getCachedBucketIconUri(bucketId);
    if (cachedUri && !cancelled) {
      setIconUri(cachedUri);
    }

    // Start async loading
    const loadIcon = async () => {
      const uri = await mediaCache.getBucketIcon(
        bucketId,
        bucket.name,
        bucket.iconUrl ?? ""
      );
      if (!cancelled && uri) {
        setIconUri(uri);
      }
    };

    loadIcon();

    // Subscribe to bucket icon ready events
    const subscription = mediaCache.bucketIconReady.subscribe(
      ({ bucketId: readyBucketId, uri }) => {
        if (readyBucketId === bucketId && !cancelled) {
          setIconUri(uri);
        }
      }
    );

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, [bucketId, bucket?.name, bucket?.iconUrl]);

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
            {iconUri ? (
              <Image
                source={{ uri: iconUri }}
                style={{
                  width: currentSize.icon,
                  height: currentSize.icon,
                  borderRadius: currentSize.icon / 2,
                }}
                contentFit="cover"
                cachePolicy="memory"
                recyclingKey={`${bucketId}-${iconUri}`}
                priority="high"
              />
            ) : (
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
            )}
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
