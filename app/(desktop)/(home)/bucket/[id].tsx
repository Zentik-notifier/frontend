import BucketDetail from "@/components/BucketDetail";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function BucketDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <BucketDetail bucketId={id} />;
}
