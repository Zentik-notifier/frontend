import AppLogs from "@/components/AppLogs";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function AppLogsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t("appLogs.title"),
        }} 
      />
      <AppLogs />
    </>
  );
}