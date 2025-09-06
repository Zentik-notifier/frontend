import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ThemeMode, useTheme } from '../hooks/useTheme';
import { useThemeColor } from '../hooks/useThemeColor';

interface ThemeToggleProps {
  showLabels?: boolean;
  style?: any;
}

export function ThemeToggle({ showLabels = true, style }: ThemeToggleProps) {
  const { themeMode, setThemeMode, isDark } = useTheme();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'backgroundCard');
  const text = useThemeColor({}, 'text');
  const secondaryText = useThemeColor({}, 'textSecondary');
  const primary = useThemeColor({}, 'primary');
  const border = useThemeColor({}, 'border');

  const themes: { mode: ThemeMode; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { mode: 'light', icon: 'sunny', label: 'Light' },
    { mode: 'dark', icon: 'moon', label: 'Dark' },
    { mode: 'system', icon: 'phone-portrait', label: 'System' },
  ];

  const handleThemeChange = (mode: ThemeMode) => {
    setThemeMode(mode);
  };

  return (
    <View style={[styles.container, { backgroundColor: cardBackground, borderColor: border }, style]}>
      {showLabels && (
        <Text style={[styles.title, { color: text }]}>Theme</Text>
      )}
      
      <View style={styles.optionsContainer}>
        {themes.map((theme) => {
          const isSelected = themeMode === theme.mode;
          
          return (
            <Pressable
              key={theme.mode}
              style={[
                styles.option,
                {
                  backgroundColor: isSelected ? primary : 'transparent',
                  borderColor: border,
                }
              ]}
              onPress={() => handleThemeChange(theme.mode)}
            >
              <Ionicons
                name={theme.icon}
                size={20}
                color={isSelected ? '#FFFFFF' : text}
              />
              {showLabels && (
                <Text
                  style={[
                    styles.optionText,
                    { color: isSelected ? '#FFFFFF' : secondaryText }
                  ]}
                >
                  {theme.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
