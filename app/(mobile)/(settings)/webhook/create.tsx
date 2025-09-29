import CreateWebhook from "@/components/CreateWebhook";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function CreateWebhookScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("webhooks.create") }} />
      <CreateWebhook />
    </>
  );
}
