import CloseHeader from "@/components/CloseHeader";
import DanglingBucketResolver from "@/components/DanglingBucketResolver";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
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
      <DanglingBucketResolver id={id} />
    </>
  );
}
