import EditWebhookSection from "@/components/EditWebhookSection";
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
      <EditWebhookSection webhookId={id as string} />
    </>
  );
}
