import CloseHeader from "@/components/CloseHeader";
import CreateAccessToken from "@/components/CreateAccessToken";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateAccessTokenPage() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateAccessToken />
    </>
  );
}
