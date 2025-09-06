import { Stack } from "expo-router";
import React from "react";

export default function PublicLayout() {
  return (
    <Stack>
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="oauth"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="email-confirmation"
        options={{
          headerShown: false,
        }}
      />
    </Stack>
  );
}
