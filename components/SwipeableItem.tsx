import React, { useRef, useState } from "react";
import { Alert, Platform, StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Icon,
  List,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";
import {
  Menu,
  MenuTrigger,
  MenuOptions,
  MenuOption,
} from "react-native-popup-menu";
import * as Clipboard from "expo-clipboard";
import { useI18n } from "@/utils/i18n";

export interface SwipeAction {
  icon: string;
  label: string;
  backgroundColor: string;
  onPress: () => Promise<void> | void;
  showAlert?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

export interface MenuItem {
  id: string;
  label: string;
  icon: string;
  onPress: () => Promise<void> | void;
  type?: "normal" | "destructive";
  showAlert?: {
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
  };
}

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
  menuItems?: MenuItem[];
  showMenu?: boolean;
  copyId?: string;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftAction,
  rightAction,
  containerStyle,
  cardStyle,
  marginBottom = 4,
  marginHorizontal = 0,
  borderRadius = 12,
  borderColor,
  menuItems = [],
  showMenu = true,
  copyId,
}) => {
  const swipeableRef = useRef<any>(null);
  const theme = useTheme();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { t } = useI18n();

  const withActions = Platform.OS !== "web";

  const finalBorderColor = borderColor ?? theme.colors.outlineVariant;

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const closeMenu = () => {
    setIsMenuOpen(false);
  };

  const handleActionPress = async (action?: SwipeAction) => {
    if (!action) return;

    if (action.showAlert) {
      Alert.alert(
        action.showAlert.title,
        action.showAlert.message,
        [
          {
            text: action.showAlert.cancelText || "Cancel",
            style: "cancel",
            onPress: closeSwipeable,
          },
          {
            text: action.showAlert.confirmText || "Confirm",
            style: "destructive",
            onPress: async () => {
              try {
                action.onPress()?.catch(console.error);
                closeSwipeable();
              } catch (error) {
                console.error("Error during action:", error);
                closeSwipeable();
              }
            },
          },
        ],
        { cancelable: true, onDismiss: closeSwipeable }
      );
    } else {
      try {
        action.onPress()?.catch(console.error);
        closeSwipeable();
      } catch (error) {
        console.error("Error during action:", error);
        closeSwipeable();
      }
    }
  };

  const handleMenuItemPress = async (item: MenuItem) => {
    if (item.showAlert) {
      Alert.alert(
        item.showAlert.title,
        item.showAlert.message,
        [
          {
            text: item.showAlert.cancelText || "Cancel",
            style: "cancel",
            onPress: closeMenu,
          },
          {
            text: item.showAlert.confirmText || "Confirm",
            style: item.type === "destructive" ? "destructive" : "default",
            onPress: async () => {
              try {
                item.onPress()?.catch(console.error);
                closeMenu();
              } catch (error) {
                console.error("Error during menu action:", error);
                closeMenu();
              }
            },
          },
        ],
        { cancelable: true, onDismiss: closeMenu }
      );
    } else {
      try {
        item.onPress()?.catch(console.error);
        closeMenu();
      } catch (error) {
        console.error("Error during menu action:", error);
        closeMenu();
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

  function LeftAction() {
    if (!leftAction || !withActions) return null;

    return (
      <TouchableOpacity
        onPress={() => handleActionPress(leftAction)}
        style={[
          styles.actionContainer,
          {
            backgroundColor: leftAction.backgroundColor,
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
    if (!rightAction || !withActions) return null;

    return (
      <TouchableOpacity
        onPress={() => handleActionPress(rightAction)}
        style={[
          styles.actionContainer,
          {
            backgroundColor: rightAction.backgroundColor,
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
        renderLeftActions={leftAction && withActions ? LeftAction : undefined}
        renderRightActions={rightAction && withActions ? RightAction : undefined}

      >
        <Surface
          elevation={0}
          style={[
            styles.card,
            {
              borderRadius,
              borderColor: finalBorderColor,
            },
            {
              backgroundColor:
                theme.colors.elevation?.level1 || theme.colors.surface,
            },
            ...(cardStyle ?? []),
          ]}
        >
          <View style={styles.contentWrapper}>
            {children}
            {hasMenu && (
              <View style={styles.menuButton}>
                <Menu opened={isMenuOpen} onBackdropPress={closeMenu}>
                  <MenuTrigger
                    customStyles={{
                      TriggerTouchableComponent: TouchableOpacity,
                      triggerTouchable: {
                        activeOpacity: 0.7,
                      },
                    }}
                    onPress={() => setIsMenuOpen(!isMenuOpen)}
                  >
                    <Surface
                      style={{
                        backgroundColor: theme.colors.surface,
                        borderColor: finalBorderColor,
                        width: 32,
                        height: 32,
                        borderRadius: 16,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 1,
                      }}
                      elevation={1}
                    >
                      <Icon
                        source="dots-vertical"
                        size={18}
                        color={theme.colors.onSurface}
                      />
                    </Surface>
                  </MenuTrigger>
                  <MenuOptions
                    customStyles={{
                      optionsContainer: {
                        backgroundColor: theme.colors.surface,
                        borderRadius: 8,
                        borderWidth: 1,
                        borderColor: finalBorderColor,
                        padding: 4,
                        minWidth: 180,
                        marginLeft: -35,
                      },
                    }}
                  >
                    {allMenuItems.map((item) => (
                      <MenuOption
                        key={item.id}
                        onSelect={() => handleMenuItemPress(item)}
                      >
                        <Surface style={styles.menuItem} elevation={0}>
                          <TouchableRipple
                            onPress={() => handleMenuItemPress(item)}
                            style={styles.menuItemContent}
                          >
                            <View style={styles.menuItemInner}>
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
                            </View>
                          </TouchableRipple>
                        </Surface>
                      </MenuOption>
                    ))}
                  </MenuOptions>
                </Menu>
              </View>
            )}
          </View>
        </Surface>
      </ReanimatedSwipeable>
    </>
  );
};

const styles = StyleSheet.create({
  card: {
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
    borderWidth: 1,
    overflow: "hidden",
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
    borderWidth: 1,
    zIndex: 10,
  },
  menuItem: {
    backgroundColor: "transparent",
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemInner: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  menuItemText: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
  },
});

export default SwipeableItem;
