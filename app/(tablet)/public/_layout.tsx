import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function TabletPublicLayout() {
  const { t } = useI18n();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: "",
        headerBackTitle: t("common.back"),
        animation: "slide_from_right",
        gestureEnabled: true,
        gestureDirection: "horizontal",
      }}
    >
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="register" options={{ headerShown: false }} />
      <Stack.Screen name="forgot-password" options={{ headerShown: false }} />
      <Stack.Screen name="confirm-email" options={{ headerShown: false }} />
      <Stack.Screen name="email-confirmation" options={{ headerShown: false }} />
      <Stack.Screen name="oauth" options={{ headerShown: false }} />
      <Stack.Screen name="+not-found" options={{ title: "" }} />
    </Stack>
  );
}
