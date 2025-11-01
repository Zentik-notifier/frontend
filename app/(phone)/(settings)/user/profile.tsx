import UserProfile from "@/components/UserProfile";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function UserProfileScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen
        options={{
          title: t("userProfile.title"),
        }}
      />
      <UserProfile />
    </>
  );
}
