import BucketsSection from "@/components/BucketsSection";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function BucketsScreen() {
  return (
    <ThemedView style={styles.container}>
      <BucketsSection />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
