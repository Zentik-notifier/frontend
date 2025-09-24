import { useAppContext } from "@/services/app-context";
import React, { useEffect, useState } from "react";
import NotificationsList from "./NotificationsList";
import { NotificationFragment } from "@/generated/gql-operations-generated";

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

  return <NotificationsList notifications={notificationsToShow} />;
}
