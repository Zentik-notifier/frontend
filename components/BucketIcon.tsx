import { Colors } from "@/constants/Colors";
import { AppIcons } from "@/constants/Icons";
import { MediaType } from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useColorScheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { CachedMedia } from "./CachedMedia";
import { ThemedText } from "./ThemedText";
import { Icon } from "./ui";

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
  const router = useRouter();
  const { bucket } = useGetBucketData(bucketId);
  const { color, icon } = bucket || {};

  // Default color if none provided
  const bucketColor = color || Colors[colorScheme].tint;

  // Size mapping
  const sizeMap = {
    sm: { container: 32, icon: 28, text: 14 },
    md: { container: 40, icon: 36, text: 16 },
    lg: { container: 48, icon: 44, text: 20 },
    xl: { container: 64, icon: 60, text: 24 },
    xxl: { container: 80, icon: 76, text: 28 },
  };

  const currentSize = sizeMap[size];

  const handlePress = () => {
    if (!noRouting) {
      router.push(`/(mobile)/private/bucket-detail?id=${bucketId}`);
    }
  };

  const content = (
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
              borderColor: bucketColor,
              borderWidth: 2,
            },
          ]}
        />
      )}

      {/* Icon container */}
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
    </View>
  );

  if (!noRouting) {
    return (
      <TouchableOpacity onPress={handlePress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
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
