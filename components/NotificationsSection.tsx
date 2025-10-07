import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/contexts/AppContext";
import React, { useEffect } from "react";
import { NotificationsListWithContext } from "./NotificationsList";

interface NotificationsSectionProps {
  filteredNotifications?: NotificationFragment[];
}

export default function NotificationsSection({
  filteredNotifications,
}: NotificationsSectionProps) {
  const { notifications } = useAppContext();

  const notificationsToShow = filteredNotifications || notifications;

  return <NotificationsListWithContext notifications={notificationsToShow} />;
}
