import EditWebhook from "@/components/EditWebhook";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditWebhookScreen() {
  const { id } = useLocalSearchParams();
  if (!id) return null;
  return (
    <>
      <EditWebhook webhookId={id as string} />
    </>
  );
}
