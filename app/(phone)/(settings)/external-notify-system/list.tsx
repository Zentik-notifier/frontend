import ExternalNotifySystemsSettings from "@/components/ExternalNotifySystemsSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function ExternalNotifySystemsListScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("externalServers.title") }} />
      <ExternalNotifySystemsSettings />
    </>
  );
}
