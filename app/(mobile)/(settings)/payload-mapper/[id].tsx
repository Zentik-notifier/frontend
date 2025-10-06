import CreatePayloadMapperForm from "@/components/CreatePayloadMapperForm";
import { Stack, useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditPayloadMapperScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <Stack.Screen options={{ title: "Edit Payload Mapper" }} />
      <CreatePayloadMapperForm payloadMapperId={id} />
    </>
  );
}
