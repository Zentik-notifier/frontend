import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";
import SystemAccessTokens from "@/components/SystemAccessTokens";

export default function SystemAccessTokensSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen
        options={{
          title: t("administration.systemTokensTitle"),
        }}
      />
      <SystemAccessTokens />
    </>
  );
}
