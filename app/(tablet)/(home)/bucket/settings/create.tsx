import CloseHeader from "@/components/CloseHeader";
import CreateBucket from "@/components/CreateBucket";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack } from "expo-router";
import React from "react";

export default function CreateBucketScreen() {
  const { t } = useI18n();
  const { navigateToHome } = useNavigationUtils();

  return (
    <>
      <CloseHeader onClose={navigateToHome} />
      <Stack.Screen options={{ headerTitle: t("buckets.form.createTitle") }} />
      <CreateBucket />
    </>
  );
}
