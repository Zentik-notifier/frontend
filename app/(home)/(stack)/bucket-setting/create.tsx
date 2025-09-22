import CreateBucketForm from "@/components/CreateBucketForm";
import CloseHeader from "@/components/CloseHeader";
import React from "react";
import { useNavigationUtils } from "@/utils/navigation";
import { Stack } from "expo-router";
import { useI18n } from "@/hooks";

export default function CreateBucketScreen() {
  const { navigateToHome } = useNavigationUtils();
  const { t } = useI18n();

  const handleClose = () => {
    navigateToHome();
  };

  return (
    <>
      <Stack.Screen options={{ headerTitle: t("buckets.form.createTitle") }} />
      <CloseHeader onClose={handleClose} />
      <CreateBucketForm />
    </>
  );
}
