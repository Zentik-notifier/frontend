import CreateSystemAccessTokenForm from "@/components/CreateSystemAccessTokenForm";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function CreateSystemAccessTokenScreen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen
        options={{
          title: t("systemAccessTokens.form.title"),
        }}
      />
      <CreateSystemAccessTokenForm />
    </>
  );
}
