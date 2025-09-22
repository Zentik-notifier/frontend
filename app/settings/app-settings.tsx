import { AppSettings } from "@/components/AppSettings";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import { useDeviceType } from "@/hooks/useDeviceType";
import React from "react";
import { StyleSheet } from "react-native";
import { Stack } from "expo-router";

export default function AppSettingsScreen() {
  const colorScheme = useColorScheme();
  const { isMobile } = useDeviceType();

  const content = (
    <ThemedView
      style={[
        styles.container,
        { backgroundColor: Colors[colorScheme ?? "light"].background },
      ]}
    >
      <AppSettings />
    </ThemedView>
  );

  // Per mobile, mostra con header di Expo Router
  if (isMobile) {
    return (
      <>
        <Stack.Screen 
          options={{ 
            title: "App Settings",
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
});