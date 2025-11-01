import EditBucket from "@/components/EditBucket";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

export default function EditBucketPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  return <EditBucket bucketId={id} onBack={handleBack} />;
}
