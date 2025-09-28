import { useI18n } from "@/hooks";
import React, { ReactNode, useCallback, useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

const { height: screenHeight } = Dimensions.get("window");

export interface ThemedBottomSheetProps {
  title?: string;
  children: ReactNode;
  trigger: ReactNode;
  isVisible: boolean;
  onShown?: () => void;
  onHidden?: () => void;
  footer?: ReactNode;
}

export default function ThemedBottomSheet({
  title,
  children,
  trigger,
  isVisible,
  onShown,
  onHidden,
  footer,
}: ThemedBottomSheetProps) {
  const theme = useTheme();
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  const hideModal = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      onHidden?.();
    });
  }, [onHidden]);

  useEffect(() => {
    if (isVisible) {
      onShown?.();
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      hideModal();
    }
  }, [isVisible, hideModal, onShown]);

  const styles = StyleSheet.create({
    container: {
      marginVertical: 8,
    },
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight: screenHeight * 0.7,
      paddingTop: 20,
    },
    modalHeader: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.outlineVariant,
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "600",
      color: theme.colors.onSurface,
    },
    closeButton: {
      padding: 8,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
  });

  return (
    <View style={styles.container}>
      {trigger}

      <Modal
        visible={isVisible}
        transparent
        animationType="none"
        onRequestClose={hideModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={hideModal}
        >
          <Animated.View
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>{title}</Text>
                <TouchableOpacity
                  onPress={hideModal}
                  style={styles.closeButton}
                >
                  <Icon
                    source="close"
                    size={24}
                    color={theme.colors.onSurface}
                  />
                </TouchableOpacity>
              </View>

              {children}
              
              {footer && <View style={styles.footer}>{footer}</View>}
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}
