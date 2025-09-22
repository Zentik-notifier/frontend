import DevicesSettings from "@/components/DevicesSettings";
import RefreshableScrollView from "@/components/RefreshableScrollView";
import { ThemedView } from "@/components/ThemedView";
import { useDeviceType } from "@/hooks/useDeviceType";
import React from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function DevicesSettingsScreen() {
  const { isMobile } = useDeviceType();

  const handleRefresh = async () => {
    console.debug("Refreshing devices settings");
  };

  const content = (
    <ThemedView style={styles.container}>
      <RefreshableScrollView 
        style={styles.content}
        onRefresh={handleRefresh}
      >
        {(refreshing: boolean) => <DevicesSettings refreshing={refreshing} />}
      </RefreshableScrollView>
    </ThemedView>
  );

  // Per mobile, mostra con header di Expo Router
  if (isMobile) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: "Devices Settings",
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