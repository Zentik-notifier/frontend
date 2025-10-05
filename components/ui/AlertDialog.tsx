import React from "react";
import { Dialog, Portal, Text, Button } from "react-native-paper";

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
        style={{ maxWidth: "50%" }}
        visible={visible}
        onDismiss={onDismiss}
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
