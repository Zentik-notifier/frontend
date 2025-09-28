import React from "react";
import {
    Modal,
    StatusBar,
    StyleSheet,
    TouchableOpacity,
    View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTheme, Icon } from "react-native-paper";
import { AppSettings } from "./AppSettings";

interface AppSettingsModalProps {
  visible: boolean;
  onClose: () => void;
}

export function AppSettingsModal({ visible, onClose }: AppSettingsModalProps) {
  const theme = useTheme();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <StatusBar barStyle={theme.dark ? 'light-content' : 'dark-content'} />
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={[styles.header, { backgroundColor: theme.colors.background, borderBottomColor: theme.colors.outline }]}>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <Icon source="close" size={24} color={theme.colors.onSurface} />
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
