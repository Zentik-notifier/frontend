import { useI18n } from "@/hooks/useI18n";
import React, {
  ReactNode,
  useCallback,
  useEffect,
  useState,
  forwardRef,
  useImperativeHandle,
} from "react";
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

export type ThemedBottomSheetTrigger = (show: () => void) => ReactNode;

export interface ThemedBottomSheetProps {
  title?: string;
  children: ReactNode;
  trigger: ThemedBottomSheetTrigger;
}

export interface ThemedBottomSheetRef {
  show: () => void;
  hide: () => void;
}

const ThemedBottomSheet = forwardRef<
  ThemedBottomSheetRef,
  ThemedBottomSheetProps
>(({ title, children, trigger }, ref) => {
  const theme = useTheme();
  const [slideAnim] = useState(new Animated.Value(screenHeight));
  const [isModalVisible, setIsModalVisible] = useState(false);

  const hideModal = useCallback(() => {
    Animated.timing(slideAnim, {
      toValue: screenHeight,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setIsModalVisible(false);
    });
  }, []);

  const showModal = useCallback(() => {
    setIsModalVisible(true);
    Animated.timing(slideAnim, {
      toValue: 0,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  useImperativeHandle(
    ref,
    () => ({
      show: showModal,
      hide: hideModal,
    }),
    [showModal, hideModal]
  );

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
  });

  const handleTriggerPress = useCallback(() => {
    showModal();
  }, [showModal]);

  return (
    <View>
      <TouchableOpacity onPress={handleTriggerPress}>
        {trigger(showModal)}
      </TouchableOpacity>

      <Modal
        visible={isModalVisible}
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
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

ThemedBottomSheet.displayName = "ThemedBottomSheet";

export default ThemedBottomSheet;
