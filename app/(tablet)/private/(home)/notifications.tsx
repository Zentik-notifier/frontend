import NotificationsSection from "@/components/NotificationsSection";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function TabletNotificationsScreen() {
  return (
    <ThemedView style={styles.container}>
      <NotificationsSection />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
