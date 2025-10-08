import DanglingBucketResolver from "@/components/DanglingBucketResolver";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditBucketPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <DanglingBucketResolver id={id} />
    </>
  );
}
