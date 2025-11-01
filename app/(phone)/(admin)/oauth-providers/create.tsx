import CreateOAuthProviderForm from "@/components/CreateOAuthProviderForm";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function CreateOAuthProviderScreen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen
        options={{ title: t("administration.oauthProviderForm.createTitle") }}
      />
      <CreateOAuthProviderForm />
    </>
  );
}
