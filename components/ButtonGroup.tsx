import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { ThemedText } from './ThemedText';
import { useThemeColor } from '@/hooks/useThemeColor';

interface ButtonGroupOption {
  key: string;
  label: string;
}

interface ButtonGroupProps {
  options: ButtonGroupOption[];
  selectedKey: string;
  onSelect: (key: string) => void;
  style?: any;
}

export default function ButtonGroup({ options, selectedKey, onSelect, style }: ButtonGroupProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const textColor = useThemeColor({}, 'text');
  const tintColor = useThemeColor({}, 'tint');

  return (
    <View style={[styles.container, { backgroundColor, borderColor: tintColor }, style]}>
      {options.map((option, index) => {
        const isSelected = option.key === selectedKey;
        const isFirst = index === 0;
        const isLast = index === options.length - 1;

        return (
          <TouchableOpacity
            key={option.key}
            style={[
              styles.button,
              isFirst && styles.firstButton,
              isLast && styles.lastButton,
              isSelected && { backgroundColor: tintColor },
            ]}
            onPress={() => onSelect(option.key)}
          >
            <ThemedText
              style={[
                styles.buttonText,
                { color: isSelected ? backgroundColor : textColor },
              ]}
            >
              {option.label}
            </ThemedText>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 1,
  },
  firstButton: {
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  lastButton: {
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderRightWidth: 0,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});
