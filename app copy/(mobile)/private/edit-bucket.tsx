import EditBucket from "@/components/EditBucket";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

export default function EditBucketPage() {
  const { bucketId } = useLocalSearchParams<{ bucketId: string }>();
  const router = useRouter();

  if (!bucketId) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  return <EditBucket bucketId={bucketId} onBack={handleBack} />;
}