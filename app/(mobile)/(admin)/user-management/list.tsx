import UserManagement from "@/components/UserManagement";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function UserManagementPage() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t("administration.userManagement") }} />
      <UserManagement />
    </>
  );
}
