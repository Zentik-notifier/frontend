import { Colors } from "@/constants/Colors";
import { useColorScheme } from "@/hooks/useTheme";
import React from "react";
import {
    Modal,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { AppSettings } from "./AppSettings";
import { Icon } from "./ui/Icon";

interface AppSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ visible, onClose }: AppSettingsModalProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme];

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.header, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon name="cancel" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>
        <AppSettings />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    height: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    padding: 8,
  },
});
