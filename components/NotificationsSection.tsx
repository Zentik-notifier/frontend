import { useAppContext } from "@/services/app-context";
import React, { useEffect, useState } from "react";
import NotificationsList from "./NotificationsList";
import { NotificationFragment } from "@/generated/gql-operations-generated";

export default function NotificationsSection() {
  const { notifications, setMainLoading, notificationsLoading } =
    useAppContext();

  useEffect(() => setMainLoading(notificationsLoading), [notificationsLoading]);

  // const [paginatedNotifications, setPaginatedNotifications] = useState<
  //   NotificationFragment[]
  // >([]);

  // useEffect(() => {
  //   const slicedNotifications = (notifications ?? []).slice(0, 10);

  //   setPaginatedNotifications(slicedNotifications);
  // }, [notifications]);

  // return <NotificationsList notifications={paginatedNotifications} />;
  return <NotificationsList notifications={notifications} />;
}
