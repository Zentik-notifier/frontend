import CloseHeader from "@/components/CloseHeader";
import CreateAccessTokenForm from "@/components/CreateAccessTokenForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateAccessTokenScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateAccessTokenForm />
    </>
  );
}
