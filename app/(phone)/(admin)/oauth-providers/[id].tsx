import { CreateOAuthProviderForm } from "@/components";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditOAuthProviderScreen() {
  const { id } = useLocalSearchParams();

  if (!id) return null;

  return (
    <>
      <CreateOAuthProviderForm providerId={id as string} />
    </>
  );
}
