import { MediaType } from "@/generated/gql-operations-generated";
import { useNotificationUtils } from "@/hooks/useNotificationUtils";
import { useColorScheme } from "@/hooks/useTheme";
import React from "react";
import {
  StyleProp,
  StyleSheet,
  Text,
  TextStyle,
  View,
  ViewStyle,
} from "react-native";
import { Colors } from "../constants/Colors";
import Icon from "./ui/Icon";

interface MediaTypeIconProps {
  mediaType: MediaType;
  size?: number;
  showLabel?: boolean;
  label?: string | null;
  style?: ViewStyle;
  secondary?: boolean;
  base?: boolean;
  textStyle?: StyleProp<TextStyle> | undefined;
}

export const MediaTypeIcon: React.FC<MediaTypeIconProps> = ({
  mediaType,
  size = 16,
  showLabel = false,
  style,
  textStyle,
  secondary,
  base,
  label,
}) => {
  const colorScheme = useColorScheme();
  const { getMediaTypeIcon, getMediaTypeFriendlyName, getMediaTypeColor } =
    useNotificationUtils();

  const iconName = getMediaTypeIcon(mediaType);
  const friendlyName = label || getMediaTypeFriendlyName(mediaType);
  const mediaTypeColor = getMediaTypeColor(mediaType);

  // Determine colors based on props and theme
  const iconColor =
    base || secondary ? Colors[colorScheme].text : mediaTypeColor;
  const textColor = base ? Colors[colorScheme].text : mediaTypeColor;

  return (
    <View style={[styles.container, style]}>
      <View
        style={[
          secondary && styles.iconContainer,
          secondary && { backgroundColor: mediaTypeColor },
        ]}
      >
        <Icon name={iconName} size={size} color={iconColor} />
      </View>
      {showLabel && (
        <Text style={[styles.label, { color: textColor }, textStyle]}>
          {friendlyName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  iconContainer: {
    padding: 4,
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    fontSize: 12,
    fontWeight: "500",
  },
});
