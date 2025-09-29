import UserSection from "@/components/UserSection";
import { useI18n } from "@/hooks";
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
      <UserSection />
    </>
  );
}
