import GallerySection from "@/components/GallerySection";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function TabletGalleryScreen() {
  return (
    <ThemedView style={styles.container}>
      <GallerySection />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
