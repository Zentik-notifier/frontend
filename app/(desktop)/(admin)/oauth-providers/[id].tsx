import { CreateOAuthProviderForm } from "@/components";
import CloseHeader from "@/components/CloseHeader";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditOAuthProviderScreen() {
  const { id } = useLocalSearchParams();
  const { navigateBack } = useNavigationUtils();

  if (!id) return null;

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <CreateOAuthProviderForm providerId={id as string} />
    </>
  );
}
