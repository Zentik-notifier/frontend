import React from "react";
import { View, StyleSheet, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { Icon } from "react-native-paper";

type Props = {
  iconUrl?: string | null;
  backgroundColor?: string;
  size?: number; // container size (square)
  iconSize?: number; // inner icon/image size
  style?: ViewStyle;
};

export function OAuthProviderIcon({
  iconUrl,
  backgroundColor,
  size = 40,
  iconSize = 30,
  style,
}: Props) {
  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: backgroundColor,
        },
        style,
      ]}
    >
      {iconUrl ? (
        <Image
          source={{ uri: iconUrl }}
          style={{ width: iconSize, height: iconSize }}
          contentFit="cover"
          cachePolicy="memory-disk"
        />
      ) : (
        <Icon source="link" size={iconSize * 0.66} color={backgroundColor} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
  },
});

export default OAuthProviderIcon;
