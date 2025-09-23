import { UserSessionsSettings } from "@/components/UserSessionsSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function UserSessionsSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen
        options={{
          title: t("userSessions.title"),
        }}
      />
      <UserSessionsSettings />
    </>
  );
}
