import { AppSettings } from "@/components/AppSettings";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function TabletAppSettingsScreen() {
  return (
    <ThemedView style={styles.container}>
      <AppSettings />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
