import RefreshableScrollView from "@/components/RefreshableScrollView";
import { UserSessionsSettings } from "@/components/UserSessionsSettings";
import { ThemedView } from "@/components/ThemedView";
import { useDeviceType } from "@/hooks/useDeviceType";
import React, { useState } from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function UserSessionsSettingsScreen() {
  const { isMobile } = useDeviceType();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 500); // Small delay to ensure smooth animation
  };

  const content = (
    <ThemedView style={styles.container}>
      <RefreshableScrollView style={styles.content} onRefresh={handleRefresh}>
        {(isRefreshing) => (
          <UserSessionsSettings refreshing={isRefreshing || refreshing} />
        )}
      </RefreshableScrollView>
    </ThemedView>
  );

  // Per mobile, mostra con header di Expo Router
  if (isMobile) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: "User Sessions",
            headerShown: true,
          }} 
        />
        {content}
      </>
    );
  }

  // Per desktop, mostra solo il contenuto
  return content;
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