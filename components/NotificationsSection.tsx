import { useAppContext } from "@/services/app-context";
import React, { useEffect, useState } from "react";
import NotificationsList from "./NotificationsList";
import { NotificationFragment } from "@/generated/gql-operations-generated";

interface NotificationsSectionProps {
  filteredNotifications?: NotificationFragment[];
  bucketId?: string;
}

export default function NotificationsSection({ 
  filteredNotifications, 
  bucketId 
}: NotificationsSectionProps) {
  const { notifications, setMainLoading, notificationsLoading } =
    useAppContext();

  useEffect(() => setMainLoading(notificationsLoading), [notificationsLoading]);

  // Usa le notifiche filtrate se fornite, altrimenti usa tutte le notifiche
  const notificationsToShow = filteredNotifications || notifications;

  // const [paginatedNotifications, setPaginatedNotifications] = useState<
  //   NotificationFragment[]
  // >([]);

  // useEffect(() => {
  //   const slicedNotifications = (notificationsToShow ?? []).slice(0, 10);

  //   setPaginatedNotifications(slicedNotifications);
  // }, [notificationsToShow]);

  // return <NotificationsList notifications={paginatedNotifications} />;
  return <NotificationsList notifications={notificationsToShow} />;
}
