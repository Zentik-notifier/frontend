import WebhooksSettings from "@/components/WebhooksSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function WebhooksSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("webhooks.title") }} />
      <WebhooksSettings />
    </>
  );
}
