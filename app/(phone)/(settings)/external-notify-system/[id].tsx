import CloseHeader from "@/components/CloseHeader";
import CreateExternalNotifySystemForm from "@/components/CreateExternalNotifySystemForm";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditExternalNotifySystemScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { navigateBack } = useNavigationUtils();

  if (!id) return null;

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateExternalNotifySystemForm systemId={id} />
    </>
  );
}
