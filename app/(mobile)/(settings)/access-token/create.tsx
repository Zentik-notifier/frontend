import CreateAccessTokenForm from "@/components/CreateAccessTokenForm";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function CreateAccessTokenScreen() {
  const { t } = useI18n();
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: t('accessTokens.form.title')
        }} 
      />
      <CreateAccessTokenForm showTitle={false} />
    </>
  );
}
