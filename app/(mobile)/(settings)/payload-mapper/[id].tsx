import { CreatePayloadMapperForm } from "@/components";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditPayloadMapperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <CreatePayloadMapperForm payloadMapperId={id} />
    </>
  );
}
