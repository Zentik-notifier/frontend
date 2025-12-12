import CloseHeader from "@/components/CloseHeader";
import ChangelogForm from "@/components/ChangelogForm";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditChangelogScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return (
    <>
      <CloseHeader />
      <ChangelogForm id={id} />
    </>
  );
}
