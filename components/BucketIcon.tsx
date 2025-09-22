import { Colors } from "@/constants/Colors";
import { AppIcons } from "@/constants/Icons";
import { MediaType } from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useColorScheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { CachedMedia } from "./CachedMedia";
import { ThemedText } from "./ThemedText";
import { Icon } from "./ui";

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
  bucketId: string;
  noRouting?: boolean;
}

export default function BucketIcon({
  size = "lg",
  showBorder = true,
  bucketId,
  noRouting = false,
}: BucketIconProps) {
  const colorScheme = useColorScheme();
  const { bucket, error } = useGetBucketData(bucketId);
  const { color, icon } = bucket || {};
  const { navigateToBucketsSettings, navigateToBucketDetail } =
    useNavigationUtils();

  const isOrphaned = error && error.message.includes("Bucket not found");

  // Default color if none provided
  const bucketColor = color || Colors[colorScheme].tint;

  const currentSize = sizeMap[size];

  const handlePress = () => {
    if (isOrphaned) {
      navigateToBucketsSettings(bucketId);
    } else if (!noRouting) {
      navigateToBucketDetail(bucketId);
    }
  };

  return (
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
        // TouchableOpacity per bucket orfani
        <TouchableOpacity
          style={[
            styles.iconContainer,
            {
              width: currentSize.icon,
              height: currentSize.icon,
              borderRadius: currentSize.icon / 2,
              backgroundColor: "#ff4444",
            },
          ]}
          onPress={handlePress}
        >
          <Ionicons name="link" size={currentSize.text} color="#fff" />
        </TouchableOpacity>
      ) : (
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
              onPress={handlePress}
            />
          ) : icon &&
            typeof icon === "string" &&
            !icon.startsWith("sfsymbols:") &&
            icon.length <= 2 ? (
            <ThemedText
              style={[
                styles.bucketIconText,
                {
                  fontSize: currentSize.text,
                  color: "#fff",
                },
              ]}
            >
              {icon}
            </ThemedText>
          ) : (
            <Icon
              name={
                (icon?.replace("sfsymbols:", "") as keyof typeof AppIcons) ||
                "bucket"
              }
              size={size}
              color="#fff"
            />
          )}
        </View>
      )}
    </View>
  );
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
