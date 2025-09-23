import RefreshableScrollView from "@/components/RefreshableScrollView";
import { UserSessionsSettings } from "@/components/UserSessionsSettings";
import { ThemedView } from "@/components/ThemedView";
import React, { useState } from "react";
import { StyleSheet } from "react-native";

export default function UserSessionsSettingsScreen() {
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // The refreshing state is passed down to components which handle their own refresh
    setTimeout(() => setRefreshing(false), 500); // Small delay to ensure smooth animation
  };

  return (
    <ThemedView style={styles.container}>
      <RefreshableScrollView style={styles.content} onRefresh={handleRefresh}>
        {(isRefreshing) => <UserSessionsSettings />}
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
