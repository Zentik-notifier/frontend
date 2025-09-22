import CreateBucketForm from "@/components/CreateBucketForm";
import { useI18n } from "@/hooks";
import { Stack } from "expo-router";
import React from "react";

export default function CreateBucketScreen() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ headerTitle: t("buckets.form.createTitle") }} />
      <CreateBucketForm />
    </>
  );
}
