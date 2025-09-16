import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ThemedText } from './ThemedText';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useTheme';

export interface InlinePickerOption {
  label: string;
  value: string;
  color?: string;
}

interface InlinePickerProps {
  selectedValue: string;
  options: InlinePickerOption[];
  onValueChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
}

export default function InlinePicker({
  selectedValue,
  options,
  onValueChange,
  placeholder = "Seleziona...",
  disabled = false,
}: InlinePickerProps) {
  const colorScheme = useColorScheme();
  const [modalVisible, setModalVisible] = useState(false);

  const selectedOption = options.find(option => option.value === selectedValue);

  const handleSelect = (value: string) => {
    setModalVisible(false);
    onValueChange(value);
  };

  const renderOption = ({ item }: { item: InlinePickerOption }) => (
    <TouchableOpacity
      style={[
        styles.optionItem,
        { 
          backgroundColor: Colors[colorScheme ?? 'light'].backgroundCard,
          borderBottomColor: Colors[colorScheme ?? 'light'].border,
        }
      ]}
      onPress={() => handleSelect(item.value)}
    >
      <View style={styles.optionContent}>
        {item.color && (
          <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
        )}
        <ThemedText style={styles.optionText}>{item.label}</ThemedText>
        {item.value === selectedValue && (
          <ThemedText style={styles.selectedIndicator}>✓</ThemedText>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <>
      <TouchableOpacity
        style={[
          styles.pickerButton,
          { 
            backgroundColor: Colors[colorScheme ?? 'light'].backgroundCard,
            borderColor: Colors[colorScheme ?? 'light'].border,
            opacity: disabled ? 0.5 : 1,
          }
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        disabled={disabled}
      >
        <View style={styles.pickerContent}>
          {selectedOption?.color && (
            <View style={[styles.colorIndicator, { backgroundColor: selectedOption.color }]} />
          )}
          <ThemedText style={styles.pickerText}>
            {selectedOption?.label || placeholder}
          </ThemedText>
          <ThemedText style={styles.arrow}>▼</ThemedText>
        </View>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <ThemedText style={styles.modalTitle}>Seleziona Ruolo</ThemedText>
            <FlatList
              data={options}
              renderItem={renderOption}
              keyExtractor={(item) => item.value}
              style={styles.optionsList}
            />
            <TouchableOpacity
              style={[
                styles.cancelButton,
                { backgroundColor: Colors[colorScheme ?? 'light'].backgroundCard }
              ]}
              onPress={() => setModalVisible(false)}
            >
              <ThemedText style={styles.cancelButtonText}>Annulla</ThemedText>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  pickerText: {
    flex: 1,
    fontSize: 16,
  },
  arrow: {
    fontSize: 12,
    opacity: 0.6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    borderRadius: 12,
    padding: 20,
    maxHeight: '70%',
    width: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  optionsList: {
    maxHeight: 200,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  optionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionText: {
    flex: 1,
    fontSize: 16,
  },
  selectedIndicator: {
    fontSize: 16,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  cancelButton: {
    marginTop: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
});
