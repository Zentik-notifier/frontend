import { AppSettings } from "@/components/AppSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function AppSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t("appSettings.title"),
        }} 
      />
      <AppSettings />
    </>
  );
}