import { NotificationFragment } from "@/generated/gql-operations-generated";
import { useAppContext } from "@/services/app-context";
import React, { useEffect } from "react";
import NotificationsList from "./NotificationsList";

export default function NotificationsSection() {
  const { notifications, setLoading, notificationsLoading } = useAppContext();

  useEffect(() => setLoading(notificationsLoading), [notificationsLoading]);

  return <NotificationsList notifications={notifications} />;
}
