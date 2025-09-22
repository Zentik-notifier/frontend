import { Stack } from "expo-router";
import React from "react";

export default function MobileLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerTitle: "",
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="private"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="public"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
