import CloseHeader from "@/components/CloseHeader";
import UserDetails from "@/components/UserDetails";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function UserManagementDetailScreen() {
  const { id } = useLocalSearchParams();
  const { navigateBack } = useNavigationUtils();

  if (!id) return null;

  return (
    <>
      <CloseHeader onClose={navigateBack} />
      <UserDetails userId={id as string} />
    </>
  );
}
