import NotificationDetail from "@/components/NotificationDetail";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function NotificationDetailPage() {
  const { id, forceFetch } = useLocalSearchParams<{
    id: string;
    forceFetch: string;
  }>();
  const { navigateToHome } = useNavigationUtils();

  if (!id) {
    return null;
  }

  const handleClose = () => {
    navigateToHome();
  };

  return (
    <>
      <NotificationDetail
        notificationId={id}
        forceFetch={forceFetch === "true"}
        onBack={handleClose}
      />
    </>
  );
}
