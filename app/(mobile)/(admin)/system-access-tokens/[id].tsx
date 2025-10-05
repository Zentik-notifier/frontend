import SystemAccessTokenForm from "@/components/SystemAccessTokenForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditSystemAccessTokenScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <SystemAccessTokenForm id={id} />
    </>
  );
}
