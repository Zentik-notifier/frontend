import { CreateOAuthProviderForm } from "@/components";
import { useI18n } from "@/hooks/useI18n";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditOAuthProviderScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useI18n();

  if (!id) return null;

  return (
    <>
      <Stack.Screen
        options={{ title: t("administration.oauthProviderForm.editTitle") }}
      />
      <CreateOAuthProviderForm providerId={id as string} />
    </>
  );
}
