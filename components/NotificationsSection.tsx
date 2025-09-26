import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/services/app-context";
import React, { useEffect } from "react";
import { NotificationsListWithContext } from "./NotificationsList";

interface NotificationsSectionProps {
  filteredNotifications?: NotificationFragment[];
}

export default function NotificationsSection({
  filteredNotifications,
}: NotificationsSectionProps) {
  const { notifications, setMainLoading, notificationsLoading } =
    useAppContext();

  useEffect(() => setMainLoading(notificationsLoading), [notificationsLoading]);

  const notificationsToShow = filteredNotifications || notifications;

  return <NotificationsListWithContext notifications={notificationsToShow} />;
}
