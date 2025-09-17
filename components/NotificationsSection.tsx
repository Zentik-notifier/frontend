import { useAppContext } from "@/services/app-context";
import React, { useEffect } from "react";
import NotificationsList from "./NotificationsList";

export default function NotificationsSection() {
  const { notifications, setMainLoading, notificationsLoading } = useAppContext();

  useEffect(() => setMainLoading(notificationsLoading), [notificationsLoading]);

  return <NotificationsList notifications={notifications} />;
}
