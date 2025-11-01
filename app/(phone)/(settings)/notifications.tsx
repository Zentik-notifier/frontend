import NotificationsSettings from "@/components/NotificationsSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function NotificationsSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t("notifications.title"),
        }} 
      />
      <NotificationsSettings />
    </>
  );
}