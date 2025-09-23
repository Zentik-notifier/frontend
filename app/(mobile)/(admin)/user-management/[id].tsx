import { CreateOAuthProviderForm } from "@/components";
import UserDetails from "@/components/UserDetails";
import { useI18n } from "@/hooks/useI18n";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

export default function UserManagementDetailScreen() {
  const { id } = useLocalSearchParams();
  const { t } = useI18n();

  if (!id) return null;

  return (
    <>
      <Stack.Screen options={{ title: t("administration.userDetails") }} />
      <UserDetails userId={id as string} />
    </>
  );
}
