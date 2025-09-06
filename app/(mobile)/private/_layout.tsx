import Header from "@/components/Header";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function PrivateLayout() {
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: "",
        headerBackTitle: t("common.back"),
        // Ottimizzazioni per performance
        animation: 'slide_from_right', // Animazione più fluida
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      {/* HOME */}
      <Stack.Screen
        name="home"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerBackVisible: false,
          headerRight: () => <Header />,
          // Ottimizzazioni specifiche per homepage
          animationTypeForReplace: 'push', // Mantiene la schermata in memoria
          gestureEnabled: false, // Previene swipe accidentali sulla home
        }}
      />
      <Stack.Screen
        name="notification-detail"
        options={{
          headerShown: false, // Il componente gestisce il proprio header
          presentation: 'modal',
          gestureEnabled: true,
          gestureDirection: 'vertical',
          animationTypeForReplace: 'push',
          animation: 'slide_from_bottom',
        }}
      />
      {/* SETTINGS */}
      <Stack.Screen name="settings" options={{ headerShown: true }} />
      <Stack.Screen name="app-settings" options={{ headerShown: true }} />
      <Stack.Screen name="user-profile" options={{ headerShown: true }} />
      <Stack.Screen name="change-password" options={{ headerShown: true }} />
      <Stack.Screen name="buckets-settings" options={{ headerShown: true }} />
      <Stack.Screen name="create-bucket" options={{ headerShown: true }} />
      <Stack.Screen name="edit-bucket" options={{ headerShown: true }} />
      <Stack.Screen
        name="access-tokens-settings"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="create-access-token"
        options={{ headerShown: true }}
      />
      <Stack.Screen name="devices-settings" options={{ headerShown: true }} />
      <Stack.Screen
        name="notifications-settings"
        options={{ headerShown: true }}
      />
      <Stack.Screen
        name="user-sessions-settings"
        options={{ headerShown: true }}
      />
      <Stack.Screen name="webhooks-settings" options={{ headerShown: true }} />
      <Stack.Screen name="create-webhook" options={{ headerShown: true }} />
      <Stack.Screen name="edit-webhook" options={{ headerShown: true }} />
      {/* ADMIN */}
      <Stack.Screen name="admin" options={{ headerShown: true }} />
      <Stack.Screen name="user-management" options={{ headerShown: true }} />
      <Stack.Screen name="system-access-tokens" options={{ headerShown: true }} />
      <Stack.Screen name="create-system-access-token" options={{ headerShown: true }} />
      <Stack.Screen
        name="edit-oauth-provider"
        options={{ headerShown: true }}
      />
      <Stack.Screen name="oauth-providers" options={{ headerShown: true }} />
      <Stack.Screen
        name="create-oauth-provider"
        options={{ headerShown: true }}
      />
    </Stack>
  );
}
