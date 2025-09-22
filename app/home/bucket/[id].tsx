import React from "react";
import BucketDetail from "@/components/BucketDetail";
import { useLocalSearchParams } from "expo-router";

export default function BucketDetailPage() {
  const { id } = useLocalSearchParams<{ id: string }>();
  
  if (!id) {
    return null;
  }
  
  return <BucketDetail bucketId={id} />;
}
