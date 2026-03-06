import React, { ReactNode, useEffect, useState } from "react";
import { Dimensions, Keyboard, Platform, ScrollView, StyleSheet, View } from "react-native";
import {
  Button,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface DetailModalProps {
  visible: boolean;
  onDismiss: () => void;
  title: string;
  icon: string;
  children: ReactNode;
  actions: {
    cancel: {
      label: string;
      onPress: () => void;
    };
    confirm?: {
      label: string;
      onPress: () => void;
      loading?: boolean;
      disabled?: boolean;
    };
  };
}

export default function DetailModal({
  visible,
  onDismiss,
  title,
  icon,
  children,
  actions,
}: DetailModalProps) {
  const theme = useTheme();
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow";
    const hideEvent = Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide";
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);

  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 24 + keyboardHeight,
    maxHeight: Dimensions.get("window").height * 0.8,
  };

  return (
    <Portal>
      <Modal
        visible={visible}
        onDismiss={onDismiss}
        contentContainerStyle={containerStyle}
        dismissableBackButton
      >
        <View
          style={[
            styles.header,
            {
              borderBottomColor: theme.colors.outline,
              backgroundColor: "transparent",
            },
          ]}
        >
          <View style={styles.headerLeft}>
            <Icon source={icon} size={24} color={theme.colors.primary} />
            <Text style={styles.title}>{title}</Text>
          </View>
          <TouchableRipple
            style={styles.closeButton}
            onPress={onDismiss}
            borderless
          >
            <Icon source="close" size={20} color={theme.colors.onSurface} />
          </TouchableRipple>
        </View>

        <ScrollView style={styles.body}>{children}</ScrollView>

        <View style={[styles.footer, { borderTopColor: theme.colors.outline }]}>
          <Button
            mode="outlined"
            onPress={actions.cancel.onPress}
            style={styles.footerButton}
          >
            {actions.cancel.label}
          </Button>
          {actions.confirm && (
            <Button
              mode="contained"
              onPress={actions.confirm.onPress}
              loading={actions.confirm.loading}
              disabled={actions.confirm.disabled || actions.confirm.loading}
              style={styles.footerButton}
            >
              {actions.confirm.label}
            </Button>
          )}
        </View>
      </Modal>
    </Portal>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  body: {
    padding: 20,
  },
  footer: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    gap: 12,
  },
  footerButton: {
    flex: 1,
  },
});
