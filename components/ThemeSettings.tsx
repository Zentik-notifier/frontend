import { useTheme } from '@/hooks/useTheme';
import { useThemeColor } from '@/hooks/useThemeColor';
import React from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';

interface ThemeSettingsProps {
  style?: any;
}

export function ThemeSettings({ style }: ThemeSettingsProps) {
  const { colorScheme, setThemeMode, themeMode, isDark } = useTheme();
  
  const backgroundColor = useThemeColor({}, 'background');
  const cardBackground = useThemeColor({}, 'backgroundCard');
  const text = useThemeColor({}, 'text');
  const textSecondary = useThemeColor({}, 'textSecondary');
  const border = useThemeColor({}, 'border');
  const primary = useThemeColor({}, 'primary');

  // Simulate color examples
  const colorExamples = [
    { name: 'Primary', color: useThemeColor({}, 'primary') },
    { name: 'Secondary', color: useThemeColor({}, 'secondary') },
    { name: 'Success', color: useThemeColor({}, 'success') },
    { name: 'Warning', color: useThemeColor({}, 'warning') },
    { name: 'Error', color: useThemeColor({}, 'error') },
    { name: 'Tint', color: useThemeColor({}, 'tint') },
  ];

  const handleThemeToggle = (value: boolean) => {
    setThemeMode(value ? 'dark' : 'light');
  };

  return (
    <ScrollView 
      style={[styles.container, { backgroundColor }, style]}
      contentContainerStyle={styles.content}
    >
      <Text style={[styles.title, { color: text }]}>Theme Settings</Text>
      
      {/* Theme Toggle */}
      <View style={[styles.section, { backgroundColor: cardBackground, borderColor: border }]}>
        <View style={styles.settingRow}>
          <View style={styles.settingInfo}>
            <Text style={[styles.settingTitle, { color: text }]}>Dark Mode</Text>
            <Text style={[styles.settingDescription, { color: textSecondary }]}>
              Enable dark mode for better visibility in low light
            </Text>
          </View>
          <Switch
            value={isDark}
            onValueChange={handleThemeToggle}
            trackColor={{ false: '#767577', true: primary }}
            thumbColor={isDark ? '#f4f3f4' : '#f4f3f4'}
          />
        </View>
      </View>

      {/* Current Scheme Info */}
      <View style={[styles.section, { backgroundColor: cardBackground, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>Current Theme</Text>
        <View style={styles.themeInfo}>
          <Text style={[styles.themeText, { color: textSecondary }]}>
            Active scheme: <Text style={{ color: primary, fontWeight: '600' }}>{colorScheme}</Text>
          </Text>
        </View>
      </View>

      {/* Color Examples */}
      <View style={[styles.section, { backgroundColor: cardBackground, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>Color Palette</Text>
        <View style={styles.colorGrid}>
          {colorExamples.map((example) => (
            <View key={example.name} style={styles.colorItem}>
              <View 
                style={[
                  styles.colorSwatch, 
                  { backgroundColor: example.color, borderColor: border }
                ]} 
              />
              <Text style={[styles.colorName, { color: textSecondary }]}>
                {example.name}
              </Text>
            </View>
          ))}
        </View>
      </View>

      {/* Theme Information */}
      <View style={[styles.section, { backgroundColor: cardBackground, borderColor: border }]}>
        <Text style={[styles.sectionTitle, { color: text }]}>About Themes</Text>
        <Text style={[styles.infoText, { color: textSecondary }]}>
          This app supports both light and dark themes. The theme can be set to follow your system preference 
          or manually controlled. Colors automatically adapt to provide optimal contrast and readability.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  section: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  themeInfo: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  themeText: {
    fontSize: 14,
  },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  colorItem: {
    alignItems: 'center',
    minWidth: 80,
  },
  colorSwatch: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 8,
  },
  colorName: {
    fontSize: 12,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 20,
  },
});
