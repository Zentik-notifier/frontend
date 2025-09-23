import DevicesSettings from "@/components/DevicesSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function DevicesSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t("devices.title"),
        }} 
      />
      <DevicesSettings />
    </>
  );
}