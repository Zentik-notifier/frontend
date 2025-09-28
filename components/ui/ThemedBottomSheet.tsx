import React, { useState, useRef, useEffect, ReactNode } from "react";
import {
  Modal,
  TouchableOpacity,
  View,
  Animated,
  Dimensions,
  StyleSheet,
  ScrollView,
} from "react-native";
import { useTheme, Icon, Text } from "react-native-paper";

const { height: screenHeight } = Dimensions.get("window");

export interface ThemedBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  maxHeight?: number;
  minHeight?: number;
  showCloseButton?: boolean;
  closeOnOverlayPress?: boolean;
  scrollable?: boolean;
  footer?: ReactNode;
  disableScrollView?: boolean; // Per evitare VirtualizedLists annidati
}

export default function ThemedBottomSheet({
  visible,
  onClose,
  title,
  children,
  maxHeight = screenHeight * 0.95,
  minHeight = screenHeight * 0.4,
  showCloseButton = true,
  closeOnOverlayPress = true,
  scrollable = true,
  footer,
  disableScrollView = false,
}: ThemedBottomSheetProps) {
  const theme = useTheme();
  const [slideAnim] = useState(new Animated.Value(screenHeight));

  useEffect(() => {
    if (visible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [visible, slideAnim]);

  const handleOverlayPress = () => {
    if (closeOnOverlayPress) {
      onClose();
    }
  };

  const styles = StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "flex-end",
    },
    modalContainer: {
      backgroundColor: theme.colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      maxHeight,
      minHeight,
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
    content: {
      flex: 1,
      paddingHorizontal: 20,
      paddingVertical: 16,
    },
    scrollContent: {
      paddingBottom: footer ? 0 : 16,
    },
    footer: {
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingBottom: 32,
      borderTopWidth: 1,
      borderTopColor: theme.colors.outlineVariant,
    },
  });

  const ContentWrapper = (scrollable && !disableScrollView) ? ScrollView : View;
  const contentProps = (scrollable && !disableScrollView)
    ? {
        style: styles.content,
        contentContainerStyle: styles.scrollContent,
        showsVerticalScrollIndicator: false,
        nestedScrollEnabled: true, // Permette scroll annidati
      }
    : { style: styles.content };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={handleOverlayPress}
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
            {/* Header */}
            {(title || showCloseButton) && (
              <View style={styles.modalHeader}>
                {title && <Text style={styles.modalTitle}>{title}</Text>}
                {showCloseButton && (
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Icon
                      source="close"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Content */}
            <ContentWrapper {...contentProps}>
              {children}
            </ContentWrapper>

            {/* Footer */}
            {footer && <View style={styles.footer}>{footer}</View>}
          </TouchableOpacity>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}