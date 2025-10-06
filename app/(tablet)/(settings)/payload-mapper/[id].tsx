import CreatePayloadMapperForm from "@/components/CreatePayloadMapperForm";
import CloseHeader from "@/components/CloseHeader";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditPayloadMapperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <CloseHeader />
      <CreatePayloadMapperForm payloadMapperId={id} />
    </>
  );
}
