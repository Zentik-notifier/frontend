import React, { useCallback, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { TextInput, Button, Text, TouchableRipple, useTheme } from 'react-native-paper';
import { useI18n } from '@/hooks/useI18n';

interface NumberListInputProps {
  /** Label for the input field */
  label: string;
  /** Current list of numbers */
  values: number[];
  /** Callback when the list changes */
  onValuesChange: (values: number[]) => void;
  /** Placeholder text for the input */
  placeholder?: string;
  /** Unit suffix to display (e.g., 'm' for minutes) */
  unit?: string;
  /** Minimum value allowed */
  min?: number;
  /** Maximum value allowed */
  max?: number;
  /** Whether the input is disabled */
  disabled?: boolean;
  /** Compact mode - smaller spacing and text */
  compact?: boolean;
}

export default function NumberListInput({
  label,
  values,
  onValuesChange,
  placeholder,
  unit = '',
  min = 1,
  max = 9999,
  disabled = false,
  compact = false,
}: NumberListInputProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [inputValue, setInputValue] = useState<string>('');

  const addValue = useCallback(() => {
    const newValue = parseInt(inputValue.trim(), 10);
    
    if (
      !isNaN(newValue) &&
      newValue >= min &&
      newValue <= max &&
      !values.includes(newValue)
    ) {
      const newValues = [...values, newValue].sort((a, b) => a - b);
      onValuesChange(newValues);
      setInputValue('');
    }
  }, [inputValue, values, min, max, onValuesChange]);

  const removeValue = useCallback((value: number) => {
    const newValues = values.filter((v) => v !== value);
    onValuesChange(newValues);
  }, [values, onValuesChange]);

  const handleInputSubmit = useCallback(() => {
    addValue();
  }, [addValue]);

  const styles = StyleSheet.create({
    container: {
      marginBottom: compact ? 8 : 12,
    },
    label: {
      fontSize: compact ? 14 : 16,
      fontWeight: '500',
      marginBottom: compact ? 4 : 8,
      color: theme.colors.onSurface,
    },
    inputRow: {
      flexDirection: 'row',
      gap: compact ? 6 : 8,
      alignItems: 'center',
    },
    textInput: {
      flex: 1,
    },
    addButton: {
      minWidth: compact ? 60 : 80,
    },
    valuesContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: compact ? 6 : 8,
      marginTop: compact ? 6 : 8,
    },
    valueChip: {
      paddingHorizontal: compact ? 8 : 12,
      paddingVertical: compact ? 4 : 6,
      borderRadius: 16,
      backgroundColor: theme.colors.secondaryContainer,
    },
    valueText: {
      color: theme.colors.onSecondaryContainer,
      fontSize: compact ? 12 : 14,
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.label}>{label}</Text>
      
      <View style={styles.inputRow}>
        <TextInput
          mode="outlined"
          value={inputValue}
          onChangeText={setInputValue}
          placeholder={placeholder || t('common.enterNumber')}
          keyboardType="numeric"
          style={styles.textInput}
          onSubmitEditing={handleInputSubmit}
          disabled={disabled}
          dense={compact}
        />
        <Button
          mode="contained"
          onPress={addValue}
          disabled={disabled || !inputValue.trim()}
          style={styles.addButton}
          compact={compact}
        >
          {t('common.add')}
        </Button>
      </View>

      {values.length > 0 && (
        <View style={styles.valuesContainer}>
          {values.map((value) => (
            <TouchableRipple
              key={value}
              onPress={() => removeValue(value)}
              borderless
              style={styles.valueChip}
              disabled={disabled}
            >
              <Text style={styles.valueText}>
                {value}{unit} ✕
              </Text>
            </TouchableRipple>
          ))}
        </View>
      )}
    </View>
  );
}
