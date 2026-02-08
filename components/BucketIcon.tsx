import { useBucket } from "@/hooks/notifications";
import { useBucketIcon } from "@/hooks/useBucketIcon";
import { useNavigationUtils } from "@/utils/navigation";
import { Image } from "expo-image";
import React from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Icon, useTheme } from "react-native-paper";

const EXTERNAL_SYSTEM_SUBICON_SIZE = { sm: 12, md: 14, lg: 16, xl: 20, xxl: 24 };

const EXTERNAL_SYSTEM_ICONS: Record<string, number> = {
  NTFY: require("@/assets/icons/ntfy.svg"),
  Gotify: require("@/assets/icons/gotify.png"),
};

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
  icon?: string | null;
}

export default function BucketIcon({
  size = "lg",
  bucketId,
  noRouting = false,
  userId = null,
  forceRefetch,
  icon,
}: BucketIconProps) {
  const theme = useTheme();

  const { bucket, isOrphan } = useBucket(bucketId, {
    userId: userId ?? undefined,
    autoFetch: forceRefetch,
  });

  // Use the new hook to manage bucket icon loading
  const { iconUri: iconUriFromBucket } = useBucketIcon(
    bucketId,
    bucket?.name || "",
    bucket?.iconUrl ?? undefined,
    {
      enabled: !!bucket, // Only load when bucket data is available
    }
  );
  const iconUri = iconUriFromBucket ?? icon;

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

  const externalSystemType = bucket?.externalNotifySystem?.type;
  const showExternalSystemSubicon =
    !isOrphan && externalSystemType && EXTERNAL_SYSTEM_ICONS[externalSystemType];
  const subiconSize = EXTERNAL_SYSTEM_SUBICON_SIZE[size];
  const subiconSource = externalSystemType ? EXTERNAL_SYSTEM_ICONS[externalSystemType] : null;

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
                key={`bucket-icon-${bucketId}-${iconUri}`}
                source={{ uri: iconUri }}
                style={{
                  width: currentSize.icon,
                  height: currentSize.icon,
                  borderRadius: currentSize.icon / 2,
                }}
                contentFit="cover"
                cachePolicy="memory-disk"
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
      {showExternalSystemSubicon && subiconSource && (
        <View
          style={[
            styles.subicon,
            {
              width: subiconSize,
              height: subiconSize,
              borderRadius: subiconSize / 2,
              backgroundColor: theme.colors.surface,
              bottom: 0,
              right: 0,
            },
          ]}
        >
          <Image
            source={subiconSource}
            style={{ width: subiconSize, height: subiconSize }}
            contentFit="cover"
          />
        </View>
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
  subicon: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.08)",
  },
  bucketIconText: {
    // Styles applied inline for dynamic sizing
    fontWeight: "600",
    textAlign: "center",
  },
});
