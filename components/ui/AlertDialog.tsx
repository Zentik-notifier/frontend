import React from "react";
import { Dialog, Portal, Text, Button, useTheme } from "react-native-paper";
import { StyleSheet, Dimensions } from "react-native";

interface AlertDialogProps {
  visible: boolean;
  title: string;
  message: string;
  onDismiss: () => void;
  confirmText?: string;
  onConfirm?: () => void;
  cancelText?: string;
  onCancel?: () => void;
  type?: "info" | "error" | "success" | "warning";
}

export function AlertDialog({
  visible,
  title,
  message,
  onDismiss,
  confirmText = "OK",
  onConfirm,
  cancelText,
  onCancel,
  type = "info",
}: AlertDialogProps) {
  const theme = useTheme();
  const screenWidth = Dimensions.get('window').width;
  const maxWidth = screenWidth * 0.5; // 50% dello schermo
  const minWidth = 300;
  const handleConfirm = () => {
    onConfirm?.();
    onDismiss();
  };

  const handleCancel = () => {
    onCancel?.();
    onDismiss();
  };

  const getIcon = () => {
    switch (type) {
      case "error":
        return "alert-circle";
      case "success":
        return "check-circle";
      case "warning":
        return "alert";
      default:
        return "information";
    }
  };

  return (
    <Portal>
      <Dialog
        visible={visible}
        onDismiss={onDismiss}
        style={[
          styles.dialog,
          {
            maxWidth: Math.max(maxWidth, minWidth),
            minWidth: minWidth,
            alignSelf: 'center',
          },
        ]}
      >
        <Dialog.Icon icon={getIcon()} />
        <Dialog.Title>{title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          {cancelText && <Button onPress={handleCancel}>{cancelText}</Button>}
          <Button mode="contained" onPress={handleConfirm}>
            {confirmText}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    margin: 'auto',
    maxWidth: '90%', // Fallback per sicurezza
  },
});
