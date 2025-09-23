import CloseHeader from "@/components/CloseHeader";
import EditBucket from "@/components/EditBucket";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditBucketPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { navigateBack } = useNavigationUtils();

  if (!id) {
    return null;
  }

  const handleClose = () => {
    navigateBack();
  };

  return (
    <>
      <CloseHeader onClose={handleClose} />
      <EditBucket bucketId={id} onBack={handleClose} />
    </>
  );
}
