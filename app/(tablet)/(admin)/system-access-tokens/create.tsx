import CloseHeader from "@/components/CloseHeader";
import SystemAccessTokenForm from "@/components/SystemAccessTokenForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateSystemAccessTokenScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <SystemAccessTokenForm isEdit={false} />
    </>
  );
}
