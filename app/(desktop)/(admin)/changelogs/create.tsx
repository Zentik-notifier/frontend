import CloseHeader from "@/components/CloseHeader";
import ChangelogForm from "@/components/ChangelogForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateChangelogScreen() {
  const { navigateBack } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <ChangelogForm />
    </>
  );
}
