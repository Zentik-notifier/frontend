import CloseHeader from "@/components/CloseHeader";
import CreateWebhook from "@/components/CreateWebhook";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateWebhookScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateWebhook />
    </>
  );
}
