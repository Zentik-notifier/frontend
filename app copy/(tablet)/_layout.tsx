import { Stack } from "expo-router";
import React from "react";

export default function TabletLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="private" options={{ headerShown: false }} />
      <Stack.Screen name="public" options={{ headerShown: false }} />
    </Stack>
  );
}
