import NotificationDetail from "@/components/NotificationDetail";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function NotificationDetailPage() {
  const { id, attachmentIndex } = useLocalSearchParams<{
    id: string;
    attachmentIndex?: string;
  }>();
  const { navigateToHome } = useNavigationUtils();

  if (!id) {
    return null;
  }

  const handleClose = () => {
    navigateToHome();
  };

  const initialAttachmentIndex =
    attachmentIndex != null ? parseInt(attachmentIndex, 10) : undefined;

  return (
    <>
      <NotificationDetail
        notificationId={id}
        onBack={handleClose}
        initialAttachmentIndex={
          !Number.isNaN(initialAttachmentIndex) ? initialAttachmentIndex : undefined
        }
      />
    </>
  );
}
