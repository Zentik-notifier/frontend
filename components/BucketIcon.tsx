import {
  BucketFragment,
  MediaType,
} from "@/generated/gql-operations-generated";
import { useBucket } from "@/hooks/notifications";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, TouchableWithoutFeedback, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import { CachedMedia } from "./CachedMedia";

const sizeMap = {
  sm: { container: 32, icon: 28, text: 14 },
  md: { container: 40, icon: 36, text: 16 },
  lg: { container: 48, icon: 44, text: 20 },
  xl: { container: 64, icon: 60, text: 24 },
  xxl: { container: 80, icon: 76, text: 28 },
};

interface BucketIconProps {
  size?: "lg" | "xl" | "xxl";
  showBorder?: boolean;
  bucketId?: string;
  iconUrl?: string;
  noRouting?: boolean;
  bucket?: BucketFragment;
}

export default function BucketIcon({
  size = "lg",
  showBorder = true,
  bucketId: bucketIdParent,
  iconUrl,
  noRouting = false,
  bucket: bucketParent,
}: BucketIconProps) {
  const theme = useTheme();
  const { bucket: bucketData, error } = useBucket(bucketIdParent ?? bucketParent?.id);
  const bucket = bucketParent || bucketData;
  const { color, icon: iconBucket } = bucket || {};
  const { navigateToDanglingBucket, navigateToBucketDetail } =
    useNavigationUtils();
  const bucketId = bucket?.id || bucketIdParent;
  const icon = bucketData?.icon ?? iconBucket ?? iconUrl;

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
      {/* External border with bucket color */}
      {showBorder && (
        <View
          style={[
            styles.externalBorder,
            {
              width: currentSize.container,
              height: currentSize.container,
              borderRadius: currentSize.container / 2,
              borderColor: isOrphaned ? "#ff4444" : bucketColor,
              borderWidth: 2,
            },
          ]}
        />
      )}

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
                backgroundColor: bucketColor,
              },
            ]}
          >
            {icon && typeof icon === "string" && icon.startsWith("http") ? (
              <CachedMedia
                noBorder
                url={icon}
                mediaType={MediaType.Icon}
                style={[
                  {
                    width: currentSize.icon,
                    height: currentSize.icon,
                    borderRadius: currentSize.icon / 2,
                  },
                ]}
                isCompact
              />
            ) : icon &&
              typeof icon === "string" &&
              !icon.startsWith("sfsymbols:") &&
              icon.length <= 2 ? (
              <Text
                style={[
                  styles.bucketIconText,
                  {
                    fontSize: currentSize.text,
                    color: theme.colors.onPrimary,
                  },
                ]}
              >
                {icon}
              </Text>
            ) : (
              <Icon
                source={icon?.replace("sfsymbols:", "") || "folder"}
                size={currentSize.text}
                color={theme.colors.onPrimary}
              />
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
  externalBorder: {
    position: "absolute",
    top: 0,
    left: 0,
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
