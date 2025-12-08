import CreateUserTemplateForm from "@/components/CreateUserTemplateForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditUserTemplateScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <CreateUserTemplateForm userTemplateId={id} />
    </>
  );
}
