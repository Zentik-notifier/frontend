import { AccessTokensSettings } from "@/components/AccessTokensSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function AccessTokensSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("accessTokens.title") }} />
      <AccessTokensSettings />
    </>
  );
}
