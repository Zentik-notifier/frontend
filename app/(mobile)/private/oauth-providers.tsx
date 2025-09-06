import OAuthProvidersSettings from "@/components/OAuthProvidersSettings";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function OAuthProvidersScreen() {
  const handleRefresh = async () => {
    console.debug("Refreshing OAuth providers settings");
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView 
        style={styles.content}
        onRefresh={handleRefresh}
      >
        {(refreshing: boolean) => <OAuthProvidersSettings refreshing={refreshing} />}
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
