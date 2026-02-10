import CloseHeader from "@/components/CloseHeader";
import NotificationDetail from "@/components/NotificationDetail";
import { useNavigationUtils } from "@/utils/navigation";
import { useLocalSearchParams } from "expo-router";
import React from "react";

export default function NotificationDetailPage() {
  const { id, attachmentIndex } = useLocalSearchParams<{
    id: string;
    attachmentIndex?: string;
  }>();
  const { navigateBack } = useNavigationUtils();

  if (!id) {
    return null;
  }

  const handleClose = () => {
    navigateBack();
  };

  const initialAttachmentIndex =
    attachmentIndex != null ? parseInt(attachmentIndex, 10) : undefined;

  return (
    <>
      <CloseHeader onClose={handleClose} />
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
