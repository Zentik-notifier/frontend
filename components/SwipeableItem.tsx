import React, { useRef, useState } from "react";
import { StyleSheet, TouchableOpacity } from "react-native";
import { Dialog, Icon, Portal, Text, useTheme } from "react-native-paper";
import ReanimatedSwipeable from "react-native-gesture-handler/ReanimatedSwipeable";

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

interface SwipeableItemProps {
  children: React.ReactNode;
  leftAction?: SwipeAction;
  rightAction?: SwipeAction;
  containerStyle?: any;
  marginBottom?: number;
  marginHorizontal?: number;
  borderRadius?: number;
}

const SwipeableItem: React.FC<SwipeableItemProps> = ({
  children,
  leftAction,
  rightAction,
  containerStyle,
  marginBottom = 12,
  marginHorizontal = 0,
  borderRadius = 12,
}) => {
  const swipeableRef = useRef<any>(null);
  const theme = useTheme();
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [pendingAction, setPendingAction] = useState<SwipeAction | null>(null);

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
        {children}
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
});

export default SwipeableItem;
