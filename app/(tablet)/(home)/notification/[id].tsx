import CloseHeader from "@/components/CloseHeader";
import NotificationDetail from "@/components/NotificationDetail";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function NotificationDetailPage() {
  const { id } = useLocalSearchParams<{ id: string; bucketId: string }>();
  const { navigateBack } = useNavigationUtils();

  if (!id) {
    return null;
  }

  const handleClose = () => {
    navigateBack();
  };

  return (
    <>
      <CloseHeader onClose={handleClose} />
      <NotificationDetail notificationId={id} onBack={handleClose} />
    </>
  );
}
