import { BackupManagement } from "@/components/BackupManagement";
import CloseHeader from "@/components/CloseHeader";
import { useI18n } from "@/hooks/useI18n";
import React from "react";

export default function BackupManagementScreen() {
  const { t } = useI18n();

  return (
    <>
      <CloseHeader title={t("backupManagement.title")} />
      <BackupManagement />
    </>
  );
}
