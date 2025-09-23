import BucketsSettings from "@/components/BucketsSettings";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function BucketsSettingsScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("buckets.title") }} />
      <BucketsSettings />
    </>
  );
}
