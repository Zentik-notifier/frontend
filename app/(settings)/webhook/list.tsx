import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedView } from "@/components/ThemedView";
import WebhooksSettings from "@/components/WebhooksSettings";
import React from "react";
import { StyleSheet } from "react-native";

export default function WebhooksSettingsScreen() {
  const handleRefresh = async () => {
    console.debug("Refreshing webhooks settings");
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView 
        style={styles.content}
        onRefresh={handleRefresh}
      >
        {(refreshing: boolean) => <WebhooksSettings refreshing={refreshing} />}
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
