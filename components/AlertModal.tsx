import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useTheme';
import React from 'react';
import { Modal, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface AlertButton {
  text?: string;
  onPress?: () => void;
  style?: 'default' | 'cancel' | 'destructive';
}

interface AlertModalProps {
  visible: boolean;
  title?: string;
  message?: string;
  buttons?: AlertButton[];
  onClose: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  buttons = [{ text: 'OK' }],
  onClose,
}) => {
  const colorScheme = useColorScheme();

  if (Platform.OS !== 'web') return null;

  const handleButtonPress = (button: AlertButton) => {
    try {
      button.onPress?.();
    } finally {
      onClose();
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View
          style={[
            styles.modal,
            {
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].border,
            },
          ]}
        >
          {title ? (
            <ThemedText style={[styles.title, { color: Colors[colorScheme].text }]}>
              {title}
            </ThemedText>
          ) : null}

          {message ? (
            <ThemedText
              style={[styles.message, { color: Colors[colorScheme].textSecondary }]}
            >
              {message}
            </ThemedText>
          ) : null}

          <View style={styles.buttonContainer}>
            {(buttons.length ? buttons : [{ text: 'OK' }]).map((b, idx) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.button,
                  b.style === 'destructive' && styles.destructiveButton,
                  b.style === 'cancel' && styles.cancelButton,
                ]}
                onPress={() => handleButtonPress(b)}
              >
                <Text
                  style={[
                    styles.buttonText,
                    b.style === 'destructive' && styles.destructiveButtonText,
                    b.style === 'cancel' && styles.cancelButtonText,
                    { color: b.style === 'destructive' ? '#FF3B30' : Colors[colorScheme].tint },
                  ]}
                >
                  {b.text || 'OK'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modal: {
    borderRadius: 12,
    padding: 24,
    minWidth: 300,
    maxWidth: 420,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    textAlign: 'center',
  },
  message: {
    fontSize: 16,
    lineHeight: 22,
    marginBottom: 24,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
  destructiveButton: {
    backgroundColor: 'rgba(255, 59, 48, 0.1)',
  },
  destructiveButtonText: {
    color: '#FF3B30',
  },
  cancelButton: {
    backgroundColor: 'rgba(142, 142, 147, 0.1)',
  },
  cancelButtonText: {
    color: '#8E8E93',
  },
});
