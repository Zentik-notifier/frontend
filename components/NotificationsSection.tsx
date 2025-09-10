import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/services/app-context";
import React, { useEffect } from "react";
import NotificationsList from "./NotificationsList";

interface NotificationsSectionProps {
  notifications?: NotificationFragment[];
}

export default function NotificationsSection({
  notifications: notificationsParent,
}: NotificationsSectionProps) {
  const {
    notifications: notificationsFromContext,
    setLoading,
    notificationsLoading,
  } = useAppContext();

  useEffect(() => setLoading(notificationsLoading), [notificationsLoading]);

  const notifications = notificationsParent ?? notificationsFromContext;

  return <NotificationsList notifications={notifications} />;
}
