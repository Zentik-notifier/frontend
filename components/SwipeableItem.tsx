import React, { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  Dialog,
  Icon,
  List,
  Portal,
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
  onPress: () => void;
  type?: "normal" | "destructive";
}

interface SwipeableItemProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  containerStyle?: any;
  marginBottom?: number;
  marginHorizontal?: number;
  borderRadius?: number;
  menuItems?: MenuItem[];
  showMenu?: boolean;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftAction,
  rightAction,
  containerStyle,
  marginBottom = 12,
  marginHorizontal = 0,
  borderRadius = 12,
  menuItems = [],
  showMenu = true,
}) => {
  const swipeableRef = useRef<any>(null);
  const theme = useTheme();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<SwipeAction | null>(null);

  const hasMenu = showMenu && menuItems.length > 0;

  const closeSwipeable = () => {
    swipeableRef.current?.close();
  };

  const handleActionPress = async (action?: SwipeAction) => {
    if (!action) return;

    if (action.showAlert) {
      setPendingAction(action);
      setShowConfirmDialog(true);
    } else {
      try {
        await action.onPress();
        closeSwipeable();
      } catch (error) {
        console.error("Error during action:", error);
        closeSwipeable();
      }
    }
  };

  const executeAction = async () => {
    if (!pendingAction) return;

    setShowConfirmDialog(false);
    try {
      await pendingAction.onPress();
      closeSwipeable();
    } catch (error) {
      console.error("Error during action:", error);
      closeSwipeable();
    } finally {
      setPendingAction(null);
    }
  };

  const cancelAction = () => {
    setShowConfirmDialog(false);
    setPendingAction(null);
    closeSwipeable();
  };

  function LeftAction() {
    if (!leftAction) return null;

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
    if (!rightAction) return null;

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
        renderLeftActions={leftAction ? LeftAction : undefined}
        renderRightActions={rightAction ? RightAction : undefined}
      >
        <View style={styles.contentWrapper}>
          {children}
          {hasMenu && (
            <View style={styles.menuButton}>
              <Menu>
                <MenuTrigger>
                  <Surface
                    style={{
                      backgroundColor: theme.colors.surface,
                      borderColor: theme.colors.outlineVariant,
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
                      borderColor: theme.colors.outlineVariant,
                      padding: 4,
                      minWidth: 180,
                      marginLeft: -35,
                    },
                  }}
                >
                {menuItems.map((item) => (
                  <MenuOption key={item.id} onSelect={() => item.onPress()}>
                    <Surface style={styles.menuItem} elevation={0}>
                      <TouchableRipple
                        onPress={() => item.onPress()}
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
      </ReanimatedSwipeable>

      <Portal>
        <Dialog visible={showConfirmDialog} onDismiss={cancelAction}>
          <Dialog.Title>
            {pendingAction?.showAlert?.title || "Confirm Action"}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {pendingAction?.showAlert?.message ||
                "Are you sure you want to perform this action?"}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text
              onPress={cancelAction}
              style={{ color: theme.colors.primary, marginRight: 16 }}
            >
              {pendingAction?.showAlert?.cancelText || "Cancel"}
            </Text>
            <Text
              onPress={executeAction}
              style={{ color: theme.colors.error }}
            >
              {pendingAction?.showAlert?.confirmText || "Confirm"}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
};

const styles = StyleSheet.create({
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
