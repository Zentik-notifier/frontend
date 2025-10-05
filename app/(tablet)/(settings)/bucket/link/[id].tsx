import CloseHeader from "@/components/CloseHeader";
import DanglingBucketResolver from "@/components/DanglingBucketResolver";
import EditBucket from "@/components/EditBucket";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

export default function EditBucketPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { navigateBack } = useNavigationUtils();

  if (!id) {
    return null;
  }

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <DanglingBucketResolver bucketId={id} onBack={navigateBack} />
    </>
  );
}
