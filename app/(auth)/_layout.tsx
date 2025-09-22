import React from "react";
import { Stack } from "expo-router";
import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";

export default function AuthLayout() {
  const colorScheme = useColorScheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: {
          backgroundColor: Colors[colorScheme].background,
        },
      }}
    >
      <Stack.Screen
        name="login"
        options={{
          title: "Login",
        }}
      />
      <Stack.Screen
        name="register"
        options={{
          title: "Register",
        }}
      />
      <Stack.Screen
        name="forgot-password"
        options={{
          title: "Forgot Password",
        }}
      />
      <Stack.Screen
        name="confirm-email"
        options={{
          title: "Confirm Email",
        }}
      />
      <Stack.Screen
        name="email-confirmation"
        options={{
          title: "Email Confirmation",
        }}
      />
      <Stack.Screen
        name="oauth"
        options={{
          title: "OAuth",
        }}
      />
      <Stack.Screen
        name="+not-found"
        options={{
          title: "Not Found",
        }}
      />
    </Stack>
  );
}
