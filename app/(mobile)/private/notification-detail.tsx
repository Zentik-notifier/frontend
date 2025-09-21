import NotificationDetail from "@/components/NotificationDetail";
import { useLocalSearchParams, useRouter } from "expo-router";
import React from "react";

export default function NotificationDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  if (!id) {
    return null;
  }

  const handleBack = () => {
    router.back();
  };

  return <NotificationDetail notificationId={id} onBack={handleBack} />;
}