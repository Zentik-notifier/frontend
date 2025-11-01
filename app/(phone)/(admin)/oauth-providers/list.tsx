import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";
import OAuthProvidersSettings from "@/components/OAuthProvidersSettings";

export default function OAuthProvidersSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("administration.oauthProviders") }} />
      <OAuthProvidersSettings />
    </>
  );
}
