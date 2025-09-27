import EditBucket from "@/components/EditBucket";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditBucketPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { navigateToBucketsSettings } = useNavigationUtils();

  if (!id) {
    return null;
  }

  return <EditBucket bucketId={id} onBack={navigateToBucketsSettings} />;
}
