import CloseHeader from "@/components/CloseHeader";
import CreateOAuthProviderForm from "@/components/CreateOAuthProviderForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateOAuthProviderScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateOAuthProviderForm />
    </>
  );
}
