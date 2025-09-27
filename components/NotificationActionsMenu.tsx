import React, { useMemo } from "react";
import { StyleSheet, View } from "react-native";
import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
} from "react-native-popup-menu";
import {
  Icon,
  useTheme,
  Surface,
  Text,
  List,
  TouchableRipple,
} from "react-native-paper";
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
  const hasActions = actions.length > 0;

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

  return (
    <Menu>
      <MenuTrigger>
        {showTextAndIcon ? (
          <TouchableRipple
            style={[
              styles.detailButton,
              {
                backgroundColor: theme.colors.surfaceVariant,
                borderColor: theme.colors.outline,
                borderWidth: 1,
              },
            ]}
          >
            <View style={styles.inlineContent}>
              <Icon source="play" size={18} color={theme.colors.onSurface} />
              <Text
                style={[styles.detailText, { color: theme.colors.onSurface }]}
              >
                {menuItems.length === 1
                  ? t("notificationActions.actionCount", {
                      count: menuItems.length,
                    })
                  : t("notificationActions.actionCountPlural", {
                      count: menuItems.length,
                    })}
              </Text>
            </View>
          </TouchableRipple>
        ) : (
          <Surface
            style={[
              styles.actionsFab,
              { backgroundColor: theme.colors.surface },
            ]}
            elevation={1}
          >
            <Icon
              source="dots-vertical"
              size={18}
              color={theme.colors.onSurface}
            />
          </Surface>
        )}
      </MenuTrigger>
      <MenuOptions
        optionsContainerStyle={{
          marginTop: 50,
          backgroundColor: theme.colors.surface,
          borderRadius: 8,
          borderWidth: 1,
          borderColor: theme.colors.outlineVariant,
        }}
      >
        {menuItems.map((item) => (
          <MenuOption key={item.id} onSelect={() => item.onPress()}>
            <Surface style={styles.menuItem} elevation={0}>
              <TouchableRipple
                onPress={() => item.onPress()}
                style={styles.menuItemContent}
              >
                <Surface style={styles.menuItemInner} elevation={0}>
                  <List.Icon
                    icon={item.icon}
                    color={
                      item.type === "destructive"
                        ? theme.colors.error
                        : theme.colors.onSurface
                    }
                  />
                  <Text
                    style={[
                      styles.menuItemText,
                      {
                        color:
                          item.type === "destructive"
                            ? theme.colors.error
                            : theme.colors.onSurface,
                      },
                    ]}
                  >
                    {item.label}
                  </Text>
                </Surface>
              </TouchableRipple>
            </Surface>
          </MenuOption>
        ))}
      </MenuOptions>
    </Menu>
  );
};

const styles = StyleSheet.create({
  actionsFab: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  detailButton: {
    padding: 8,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  inlineContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  detailText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  menuItem: {
    borderBottomWidth: 0.5,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});
