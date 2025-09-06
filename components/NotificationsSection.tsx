import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/services/app-context";
import React from "react";
import NotificationsList from "./NotificationsList";

interface NotificationsSectionProps {
  notifications?: NotificationFragment[];
}

export default function NotificationsSection({
  notifications: notificationsParent,
}: NotificationsSectionProps) {
  const { notifications: notificationsFromContext } = useAppContext();

  const notifications = notificationsParent ?? notificationsFromContext;

  return (
    <NotificationsList
      notifications={notifications}
      hideBucketSelector={false}
      hideBucketInfo={false}
      showRefreshControl
    />
  );
}
