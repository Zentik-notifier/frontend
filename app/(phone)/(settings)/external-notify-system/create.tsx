import CreateExternalNotifySystemForm from "@/components/CreateExternalNotifySystemForm";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";

export default function CreateExternalNotifySystemScreen() {
  const { navigateBack } = useNavigationUtils();
  return (
    <>
      <CreateExternalNotifySystemForm />
    </>
  );
}
