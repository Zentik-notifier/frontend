import CloseHeader from "@/components/CloseHeader";
import EditWebhookSection from "@/components/EditWebhookSection";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditWebhookScreen() {
  const { id } = useLocalSearchParams();
  const { navigateBack } = useNavigationUtils();

  if (!id) return null;

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <EditWebhookSection webhookId={id as string} />
    </>
  );
}
