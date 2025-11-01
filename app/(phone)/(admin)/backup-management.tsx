import { BackupManagement } from "@/components/BackupManagement";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function BackupManagementScreen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t("backupManagement.title") }} />
      <BackupManagement />
    </>
  );
}
