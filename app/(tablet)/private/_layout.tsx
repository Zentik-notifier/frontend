import Header from "@/components/Header";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function TabletPrivateLayout() {
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
      {/* HOME */}
      <Stack.Screen
        name="(home)"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerBackVisible: false,
          header: () => <Header />,
          animationTypeForReplace: "push",
          gestureEnabled: false,
        }}
      />
      
      <Stack.Screen
        name="notification-detail"
        options={{
          headerShown: false,
          presentation: "modal",
          gestureEnabled: true,
          gestureDirection: "vertical",
          animationTypeForReplace: "push",
          animation: "slide_from_bottom",
        }}
      />
      
      {/* SETTINGS */}
      <Stack.Screen
        name="(settings)"
        options={{
          headerShown: true,
          headerShadowVisible: false,
          headerBackVisible: true,
          headerBackTitle: t("common.back"),
          animationTypeForReplace: "push",
          gestureEnabled: false,
        }}
      />
      
      {/* ADMIN */}
      <Stack.Screen name="admin" options={{ headerShown: true }} />

      {/* Pages not yet moved to submodules */}
      <Stack.Screen name="change-password" options={{ headerShown: true }} />
      <Stack.Screen name="user-management" options={{ headerShown: true }} />
      <Stack.Screen name="user-details" options={{ headerShown: true }} />
      <Stack.Screen name="system-access-tokens" options={{ headerShown: true }} />
      <Stack.Screen name="create-system-access-token" options={{ headerShown: true }} />
      <Stack.Screen name="edit-oauth-provider" options={{ headerShown: true }} />
      <Stack.Screen name="oauth-providers" options={{ headerShown: true }} />
      <Stack.Screen name="create-oauth-provider" options={{ headerShown: true }} />
      <Stack.Screen name="events-review" options={{ headerShown: true }} />
    </Stack>
  );
}
