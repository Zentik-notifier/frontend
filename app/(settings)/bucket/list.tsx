import BucketsSettings from "@/components/BucketsSettings";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function BucketsSettingsScreen() {
  const handleRefresh = async () => {
    console.debug("Refreshing buckets settings");
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView 
        style={styles.content}
        onRefresh={handleRefresh}
      >
        {(refreshing: boolean) => <BucketsSettings refreshing={refreshing} />}
      </RefreshableScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
});
