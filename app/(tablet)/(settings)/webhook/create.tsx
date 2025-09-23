import CloseHeader from "@/components/CloseHeader";
import CreateWebhookForm from "@/components/CreateWebhookForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateWebhookScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateWebhookForm />
    </>
  );
}
