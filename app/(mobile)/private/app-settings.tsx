import { AppSettings } from "@/components/AppSettings";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import React from "react";
import { StyleSheet } from "react-native";

export default function AppSettingsScreen() {
  const colorScheme = useColorScheme();

  return (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <AppSettings />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
