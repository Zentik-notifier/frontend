import EditWebhook from "@/components/EditWebhook";
import { useI18n } from "@/hooks/useI18n";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditWebhookScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useI18n();
  if (!id) return null;
  return (
    <>
      <Stack.Screen options={{ title: t("webhooks.edit") }} />
      <EditWebhook webhookId={id as string} />
    </>
  );
}
