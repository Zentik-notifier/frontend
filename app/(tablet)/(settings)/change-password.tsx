import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import CloseHeader from "@/components/CloseHeader";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function ChangePasswordPage() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <ChangePasswordForm />
    </>
  );
}
