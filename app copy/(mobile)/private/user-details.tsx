import UserDetails from "@/components/UserDetails";
import { useI18n } from "@/hooks/useI18n";
import { useLocalSearchParams, Stack } from "expo-router";
import React from "react";

export default function UserDetailsScreen() {
  const { t } = useI18n();
  const { id } = useLocalSearchParams();

  return (
    <>
      <Stack.Screen
        options={{
          title: t("administration.userDetails"),
        }}
      />
      <UserDetails userId={id as string} showHeader />
    </>
  );
}
