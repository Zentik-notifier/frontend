import CloseHeader from "@/components/CloseHeader";
import CreateSystemAccessTokenForm from "@/components/CreateSystemAccessTokenForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateSystemAccessTokenScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateSystemAccessTokenForm />
    </>
  );
}
