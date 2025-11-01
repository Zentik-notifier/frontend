import { ChangePasswordForm } from "@/components/ChangePasswordForm";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function ChangePasswordPage() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t("changePassword.title") }} />
      <ChangePasswordForm />
    </>
  );
}
