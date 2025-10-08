import React, { useEffect, useRef, useState } from "react";
import { Dialog, Portal, Text, Button, useTheme } from "react-native-paper";
import { StyleSheet, Dimensions, Alert, Platform } from "react-native";
import { useDeviceType } from "@/hooks/useDeviceType";

type AlertButton = {
  text?: string;
  onPress?: () => void;
  style?: "default" | "cancel" | "destructive";
};

type WebAlertState = {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  type?: "info" | "error" | "success" | "warning";
};

export function AlertDialog() {
  const [webAlert, setWebAlert] = useState<WebAlertState>({ visible: false });
  const originalAlertRef = useRef<typeof Alert.alert>(null);
  const screenWidth = Dimensions.get("window").width;
  const maxWidth = screenWidth * 0.5; // 50% dello schermo
  const minWidth = 300;
  const handleConfirm = () => {
    webAlert.buttons?.[webAlert.buttons.length - 1]?.onPress?.();
    handleCloseAlert();
  };

  const handleCancel = () => {
    webAlert.buttons?.[0]?.onPress?.();
    handleCloseAlert();
  };

  const getIcon = () => {
    switch (webAlert.type) {
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

  useEffect(() => {
    if (Platform.OS !== "web") return;

    if (!originalAlertRef.current) {
      originalAlertRef.current = Alert.alert;
    }

    const getDialogType = (
      title?: string
    ): "info" | "error" | "success" | "warning" => {
      if (!title) return "info";
      const titleLower = title.toLowerCase();
      if (/(error|errore|failed|fail|unable|impossibile)/i.test(titleLower))
        return "error";
      if (/(success|successo|completed|completato)/i.test(titleLower))
        return "success";
      if (/(warning|avviso|attenzione)/i.test(titleLower)) return "warning";
      return "info";
    };

    Alert.alert = (
      title?: string,
      message?: string,
      buttons?: AlertButton[]
    ) => {
      const dialogType = getDialogType(title);

      let normalizedButtons: AlertButton[];
      if (buttons && buttons.length > 0) {
        normalizedButtons = [...buttons];
      } else {
        normalizedButtons = [{ text: "OK" }];
      }

      setWebAlert({
        visible: true,
        title,
        message,
        buttons: normalizedButtons,
        type: dialogType,
      });
    };

    return () => {
      if (originalAlertRef.current) {
        Alert.alert = originalAlertRef.current;
      }
    };
  }, []);

  const handleCloseAlert = () => setWebAlert((s) => ({ ...s, visible: false }));

  const handleButtonPress = (button: AlertButton) => {
    button.onPress?.();
    handleCloseAlert();
  };

  return (
    <Portal>
      <Dialog
        visible={webAlert.visible}
        onDismiss={handleCloseAlert}
        style={[
          styles.dialog,
          {
            maxWidth: Math.max(maxWidth, minWidth),
            minWidth: minWidth,
            alignSelf: "center",
          },
        ]}
      >
        <Dialog.Icon icon={getIcon()} />
        <Dialog.Title>{webAlert.title}</Dialog.Title>
        <Dialog.Content>
          <Text variant="bodyMedium">{webAlert.message}</Text>
        </Dialog.Content>
        <Dialog.Actions>
          {webAlert.buttons?.length === 2 && (
            <Button onPress={handleCancel}>
              {webAlert.buttons[0]?.text}
            </Button>
          )}
          <Button mode="contained" onPress={handleConfirm}>
            {webAlert.buttons?.[webAlert.buttons.length - 1]?.text || "OK"}
          </Button>
        </Dialog.Actions>
      </Dialog>
    </Portal>
  );
}

const styles = StyleSheet.create({
  dialog: {
    margin: "auto",
    maxWidth: "90%", // Fallback per sicurezza
  },
});
