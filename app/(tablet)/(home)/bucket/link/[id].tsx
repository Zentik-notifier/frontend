import CloseHeader from "@/components/CloseHeader";
import DanglingBucketResolver from "@/components/DanglingBucketResolver";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function DanglingBucketPage() {
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
      <DanglingBucketResolver bucketId={id} onBack={handleClose} />
    </>
  );
}
