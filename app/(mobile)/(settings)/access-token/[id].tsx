import EditAccessToken from "@/components/EditAccessToken";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function EditAccessTokenPage() {
  const { id } = useLocalSearchParams<{ id: string }>();

  if (!id) {
    return null;
  }

  return <EditAccessToken tokenId={id} />;
}

