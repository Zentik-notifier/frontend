import NotificationsSettings from "@/components/NotificationsSettings";
import { ThemedView } from "@/components/ThemedView";
import { useDeviceType } from "@/hooks/useDeviceType";
import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function NotificationsSettingsScreen() {
  const { isMobile } = useDeviceType();

  const content = (
    <ThemedView style={styles.container}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <NotificationsSettings />
      </ScrollView>
    </ThemedView>
  );

  // Per mobile, mostra con header di Expo Router
  if (isMobile) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: "Notifications Settings",
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