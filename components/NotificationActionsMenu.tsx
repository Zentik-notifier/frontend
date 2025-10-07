import {
  NotificationActionFragment,
  NotificationActionType,
  NotificationFragment,
} from "@/generated/gql-operations-generated";
import { useI18n, useNotificationActions, useNotificationUtils } from "@/hooks";
import {
  useDeleteNotification,
  useMarkNotificationRead,
  useMarkNotificationUnread,
} from "@/hooks/useNotifications";
import React, { useMemo, useState } from "react";
import {
  FAB,
  useTheme
} from "react-native-paper";

export const filteredActions = (notification: NotificationFragment) => {
  const message = notification.message;
  return ([...(message?.actions || []), message?.tapAction]?.filter(
    (action) =>
      action &&
      [
        NotificationActionType.BackgroundCall,
        NotificationActionType.Webhook,
        NotificationActionType.Snooze,
        NotificationActionType.Navigate,
      ].includes(action.type)
  ) || []) as NotificationActionFragment[];
};

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => void;
  type?: "normal" | "destructive";
}

interface NotificationActionsMenuProps {
  notification: NotificationFragment;
  onlyActions?: boolean;
  showTextAndIcon?: boolean;
}

export const NotificationActionsMenu: React.FC<
  NotificationActionsMenuProps
> = ({ notification, onlyActions, showTextAndIcon = false }) => {
  const theme = useTheme();
  const { t } = useI18n();

  const actions = filteredActions(notification);
  const hasActions = onlyActions ? actions.length > 0 : true;

  const { executeAction } = useNotificationActions();
  const { getActionTypeIcon } = useNotificationUtils();
  const markAsRead = useMarkNotificationRead();
  const markAsUnread = useMarkNotificationUnread();
  const isRead = !!notification.readAt;
  const deleteNotification = useDeleteNotification();

  const menuItems = useMemo((): MenuItem[] => {
    const items: MenuItem[] = onlyActions
      ? []
      : [
          {
            id: "toggleRead",
            label: isRead
              ? t("swipeActions.markAsUnread.label")
              : t("swipeActions.markAsRead.label"),
            icon: isRead ? "eye-off" : "eye",
            onPress: () => {
              isRead
                ? markAsUnread(notification.id)
                : markAsRead(notification.id);
            },
          },
          {
            id: "delete",
            label: t("swipeActions.delete.label"),
            icon: "delete",
            onPress: () => {
              deleteNotification(notification.id);
            },
            type: "destructive" as const,
          },
        ];

    if (hasActions) {
      actions.forEach((action, index) => {
        items.push({
          id: `action-${index}`,
          label: action.title || action.value?.slice(0, 50) || "Action",
          icon: getActionTypeIcon(action.type) as string,
          onPress: () => {
            executeAction(notification.id!, action);
          },
          type: action.destructive ? "destructive" : ("normal" as const),
        });
      });
    }

    return items;
  }, [
    isRead,
    t,
    hasActions,
    actions,
    getActionTypeIcon,
    executeAction,
    notification.id,
  ]);

  const [fabOpen, setFabOpen] = useState(false);

  if (!hasActions) {
    return null;
  }

  // Convert menu items to FAB.Group actions format
  const fabActions = menuItems.map((item) => ({
    icon: item.icon,
    label: item.label,
    onPress: () => {
      item.onPress();
      setFabOpen(false);
    },
    color: item.type === "destructive" ? theme.colors.error : undefined,
    labelTextColor: item.type === "destructive" ? theme.colors.error : undefined,
  }));

  return (
    <FAB.Group
      open={fabOpen}
      visible
      icon={fabOpen ? "close" : "play"}
      actions={fabActions}
      onStateChange={({ open }) => setFabOpen(open)}
      fabStyle={{
        backgroundColor: theme.colors.primary,
      }}
    />
  );
};
