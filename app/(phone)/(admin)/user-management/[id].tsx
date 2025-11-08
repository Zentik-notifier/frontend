import UserDetails from "@/components/UserDetails";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function UserManagementDetailScreen() {
  const { id } = useLocalSearchParams();

  if (!id) return null;

  return (
    <>
      <UserDetails userId={id as string} />
    </>
  );
}
