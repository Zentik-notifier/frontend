import React from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useTheme } from "react-native-paper";
import { Image } from "expo-image";
import { BUCKET_PRESETS } from "@/config/bucketPresets";

export type BucketPreset = {
  id: string;
  name: string;
  color?: string;
  iconUrl?: string;
  docsUrl?: string;
};

interface BucketPresetSelectorProps {
  selectedId?: string | null;
  onSelect: (preset: BucketPreset) => void;
}

export const BucketPresetSelector: React.FC<BucketPresetSelectorProps> = ({
  selectedId,
  onSelect,
}) => {
  const theme = useTheme();

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.container}
    >
      {BUCKET_PRESETS.map((preset) => {
        const isSelected = preset.id === selectedId;
        const backgroundColor =
          preset.color ??
          theme.colors.secondaryContainer ??
          theme.colors.primary;

        return (
          <TouchableOpacity
            key={preset.id}
            style={[
              styles.item,
              {
                borderColor: isSelected ? theme.colors.primary : "transparent",
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={() => onSelect(preset)}
          >
            <View style={[styles.iconWrapper]}>
              {preset.iconUrl ? (
                <Image
                  source={{ uri: preset.iconUrl }}
                  style={[styles.icon, { backgroundColor }]}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.icon,
                    {
                      backgroundColor,
                      justifyContent: "center",
                      alignItems: "center",
                    },
                  ]}
                >
                  <Text style={styles.iconInitials}>
                    {preset.name.substring(0, 2).toUpperCase()}
                  </Text>
                </View>
              )}
            </View>
            <Text 
              style={[
                styles.name,
                { color: theme.colors.onSurface }
              ]} 
              numberOfLines={1}
            >
              {preset.name}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
};

const ITEM_SIZE = 72;

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  item: {
    width: ITEM_SIZE + 16,
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 6,
    borderRadius: 16,
    borderWidth: 2,
    marginRight: 12,
  },
  iconWrapper: {
    marginBottom: 6,
  },
  icon: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: ITEM_SIZE / 2,
  },
  iconInitials: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 18,
  },
  name: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
  },
});
