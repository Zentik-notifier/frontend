import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks';
import { useI18n } from '@/hooks/useI18n';
import React from 'react';
import {
  Modal,
  SafeAreaView,
  StyleSheet,
  View,
} from 'react-native';
import LoginForm from './LoginForm';

interface LoginModalProps {
  visible: boolean;
  onClose: () => void;
}

export function LoginModal({ visible, onClose }: LoginModalProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  const handleSuccess = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}>
        <View style={styles.form}>
          <LoginForm 
            onSuccess={handleSuccess}
            onCancel={onClose}
          />
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  form: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
});
