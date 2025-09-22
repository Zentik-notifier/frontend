import RefreshableScrollView from "@/components/RefreshableScrollView";
import SystemAccessTokens from "@/components/SystemAccessTokens";
import { ThemedView } from "@/components/ThemedView";
import React from "react";
import { StyleSheet } from "react-native";

export default function AccessTokensSettingsScreen() {
  const handleRefresh = async () => {
    console.debug("Refreshing access token settings");
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView style={styles.content} onRefresh={handleRefresh}>
        {(refreshing: boolean) => (
          <SystemAccessTokens refreshing={refreshing} />
        )}
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
