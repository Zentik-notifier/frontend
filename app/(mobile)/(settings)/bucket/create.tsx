import CreateBucketForm from "@/components/CreateBucketForm";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Stack } from "expo-router";

export default function CreateBucketScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ headerTitle: t("buckets.form.createTitle") }} />
      <CreateBucketForm withHeader={false} />
    </>
  );
}
