import React, { useRef, forwardRef, useImperativeHandle } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import * as Clipboard from "expo-clipboard";
import { useI18n } from "@/utils/i18n";
import { useAppLog } from "@/hooks/useAppLog";
import PaperMenu, { PaperMenuItem } from "./ui/PaperMenu";

export interface SwipeableItemRef {
  close: () => void;
}

export interface SwipeAction {
  icon: string;
  label: string;
  backgroundColor?: string;
  destructive?: boolean;
  onPress: () => Promise<void> | void;
  showAlert?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

export interface MenuItem extends PaperMenuItem {}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  containerStyle?: any;
  cardStyle?: any[];
  marginBottom?: number;
  marginHorizontal?: number;
  borderRadius?: number;
  borderColor?: string;
  borderWidth?: number;
  menuItems?: MenuItem[];
  showMenu?: boolean;
  copyId?: string;
  menuSize?: "small" | "medium" | "large";
}

const SwipeableItem = forwardRef<SwipeableItemRef, SwipeableItemProps>(
  (
    {
      children,
      leftAction,
      rightAction,
      containerStyle,
      cardStyle,
      marginBottom = 4,
      marginHorizontal = 0,
      borderRadius = 12,
      borderColor,
      borderWidth = 1,
      menuItems = [],
      showMenu = true,
      copyId,
      menuSize = "small",
    },
    ref
  ) => {
    const swipeableRef = useRef<any>(null);
    const theme = useTheme();
    const { t } = useI18n();
    const { logAppEvent } = useAppLog();

    useImperativeHandle(ref, () => ({
      close: () => {
        swipeableRef.current?.close();
      },
    }));

    // Enable swipe actions only on touch devices
    // On web, detect touch capability using media queries
    const withActions = React.useMemo(() => {
      if (Platform.OS === "macos") {
        return false; // Never enable on macOS
      }
      if (Platform.OS === "ios" || Platform.OS === "android") {
        return true; // Always enable on native mobile platforms
      }
      if (Platform.OS === "web" && typeof window !== "undefined") {
        // Check if device has touch capability
        return (
          window.matchMedia("(pointer: coarse)").matches ||
          "ontouchstart" in window ||
          navigator.maxTouchPoints > 0
        );
      }
      return false;
    }, []);

    const finalBorderColor = borderColor ?? theme.colors.outlineVariant;

    const closeSwipeable = () => {
      swipeableRef.current?.close();
    };

    const handleActionPress = async (action?: SwipeAction) => {
      if (!action) return;

      const logSwipeAction = async (confirmed: boolean) => {
        await logAppEvent({
          event: "ui_swipe_action",
          level: "info",
          message: `User triggered swipeable action: ${action.label}`,
          context: "SwipeableItem.handleActionPress",
          data: {
            actionLabel: action.label,
            actionIcon: action.icon,
            isDestructive: action.destructive || false,
            confirmed,
          },
        }).catch(() => {});
      };

      if (action.showAlert) {
        Alert.alert(
          action.showAlert.title,
          action.showAlert.message,
          [
            {
              text: action.showAlert.cancelText || "Cancel",
              style: "cancel",
              onPress: () => {
                logSwipeAction(false).catch(() => {});
                closeSwipeable();
              },
            },
            {
              text: action.showAlert.confirmText || "Confirm",
              style: "destructive",
              onPress: async () => {
                try {
                  await logSwipeAction(true);
                  action.onPress()?.catch(console.error);
                  closeSwipeable();
                } catch (error) {
                  console.error("Error during action:", error);
                  closeSwipeable();
                }
              },
            },
          ],
          {
            cancelable: true,
            onDismiss: () => {
              logSwipeAction(false).catch(() => {});
              closeSwipeable();
            },
          }
        );
      } else {
        try {
          await logSwipeAction(true);
          action.onPress()?.catch(console.error);
          closeSwipeable();
        } catch (error) {
          console.error("Error during action:", error);
          closeSwipeable();
        }
      }
    };

    const handleMenuItemPress = async (item: MenuItem) => {
      const logMenuAction = async (confirmed: boolean) => {
        await logAppEvent({
          event: "ui_menu_action",
          level: "info",
          message: `User triggered menu action: ${item.label}`,
          context: "SwipeableItem.handleMenuItemPress",
          data: {
            actionLabel: item.label,
            actionId: item.id,
            actionType: item.type || "normal",
            confirmed,
          },
        }).catch(() => {});
      };

      if (item.showAlert) {
        Alert.alert(
          item.showAlert.title,
          item.showAlert.message,
          [
            {
              text: item.showAlert.cancelText || "Cancel",
              style: "cancel",
              onPress: () => {
                logMenuAction(false).catch(() => {});
              },
            },
            {
              text: item.showAlert.confirmText || "Confirm",
              style: item.type === "destructive" ? "destructive" : "default",
              onPress: async () => {
                try {
                  await logMenuAction(true);
                  item.onPress()?.catch(console.error);
                } catch (error) {
                  console.error("Error during menu action:", error);
                }
              },
            },
          ],
          {
            cancelable: true,
            onDismiss: () => {
              logMenuAction(false).catch(() => {});
            },
          }
        );
      } else {
        try {
          await logMenuAction(true);
          item.onPress()?.catch(console.error);
        } catch (error) {
          console.error("Error during menu action:", error);
        }
      }
    };

    const handleCopy = async () => {
      if (copyId) {
        await Clipboard.setStringAsync(copyId);
      }
    };

    // Generate menu items from left and right actions
    const allMenuItems = React.useMemo(() => {
      const items: MenuItem[] = [];

      // Add left action to menu
      if (leftAction) {
        items.push({
          id: "left-action",
          label: leftAction.label,
          icon: leftAction.icon,
          onPress: leftAction.onPress,
          type: "normal",
          showAlert: leftAction.showAlert,
        });
      }

      // Add right action to menu
      if (rightAction) {
        items.push({
          id: "right-action",
          label: rightAction.label,
          icon: rightAction.icon,
          onPress: rightAction.onPress,
          type: "destructive",
          showAlert: rightAction.showAlert,
        });
      }

      if (copyId) {
        items.push({
          id: "copy-id",
          label: t("common.copyToClipboard"),
          icon: "content-copy",
          onPress: () => handleCopy(),
        });
      }

      // Add custom menu items
      return [...items, ...menuItems];
    }, [leftAction, rightAction, menuItems]);

    const hasMenu = showMenu && allMenuItems.length > 0;

    const card = (
      <Surface
        elevation={0}
        style={[
          styles.card,
          {
            borderRadius,
            borderColor: finalBorderColor,
            borderWidth,
          },
          {
            backgroundColor:
              theme.colors.elevation?.level1 || theme.colors.surface,
          },
          ...(cardStyle ?? []),
        ]}
      >
        <View style={styles.contentWrapper}>{children}</View>
        {hasMenu && (
          <View style={styles.menuButton}>
            <PaperMenu
              items={allMenuItems}
              size={menuSize}
              width={200}
              menuOffset={50}
              onMenuItemPress={handleMenuItemPress}
            />
          </View>
        )}
      </Surface>
    );

    if (!withActions) {
      return (
        <View style={[{ marginBottom, marginHorizontal }, containerStyle]}>
          {card}
        </View>
      );
    }

    function LeftAction() {
      if (!leftAction) return null;

      const backgroundColor =
        leftAction.backgroundColor ||
        (leftAction.destructive ? theme.colors.error : theme.colors.primary);

      return (
        <TouchableOpacity
          onPress={() => handleActionPress(leftAction)}
          style={[
            styles.actionContainer,
            {
              backgroundColor,
              borderTopLeftRadius: borderRadius,
              borderBottomLeftRadius: borderRadius,
            },
          ]}
        >
          <Icon source={leftAction.icon} size={24} color="white" />
          <Text style={styles.actionLabel}>{leftAction.label}</Text>
        </TouchableOpacity>
      );
    }

    function RightAction() {
      if (!rightAction) return null;

      const backgroundColor =
        rightAction.backgroundColor ||
        (rightAction.destructive ? theme.colors.error : theme.colors.primary);

      return (
        <TouchableOpacity
          onPress={() => handleActionPress(rightAction)}
          style={[
            styles.actionContainer,
            {
              backgroundColor,
              borderTopRightRadius: borderRadius,
              borderBottomRightRadius: borderRadius,
            },
          ]}
        >
          <Icon source={rightAction.icon} size={24} color="white" />
          <Text style={styles.actionLabel}>{rightAction.label}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <>
        <ReanimatedSwipeable
          ref={swipeableRef}
          containerStyle={[{ marginBottom, marginHorizontal }, containerStyle]}
          friction={2}
          enableTrackpadTwoFingerGesture
          rightThreshold={40}
          leftThreshold={40}
          enableContextMenu
          overshootLeft={false}
          overshootRight={false}
          renderLeftActions={leftAction ? LeftAction : undefined}
          renderRightActions={rightAction ? RightAction : undefined}
        >
          {card}
        </ReanimatedSwipeable>
      </>
    );
  }
);

SwipeableItem.displayName = "SwipeableItem";

const styles = StyleSheet.create({
  card: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  contentWrapper: {
    position: "relative",
  },
  actionContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    minWidth: 80,
    height: "100%",
  },
  actionLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
  menuButton: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
});

export default SwipeableItem;
