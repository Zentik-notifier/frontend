import { useI18n } from "@/hooks/useI18n";
import { useUserSettings, DynamicThemeColors } from "@/services/user-settings";
import { generateDynamicTheme, isValidHexColor, DEFAULT_DYNAMIC_COLORS } from "@/services/theme-generator";
import { ThemePreset, getAllThemePresets, getThemePreset, isCustomPreset } from "@/services/theme-presets";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View, Alert } from "react-native";
import {
  Button,
  Card,
  Divider,
  Switch,
  Text,
  TextInput,
  useTheme
} from "react-native-paper";
import Selector from "./ui/Selector";

const THEME_PRESETS = getAllThemePresets();

export default function ThemeSettings() {
  const { t } = useI18n();
  const theme = useTheme();
  const { settings, setCustomThemeSettings } = useUserSettings();
  
  const [selectedPreset, setSelectedPreset] = useState<ThemePreset>(
    settings.themePreset || ThemePreset.Material3
  );
  const [dynamicColors, setDynamicColors] = useState<DynamicThemeColors>(
    settings.dynamicThemeColors || DEFAULT_DYNAMIC_COLORS
  );

  const handlePresetChange = useCallback((presetId: ThemePreset) => {
    const preset = getThemePreset(presetId);
    if (preset) {
      setSelectedPreset(presetId);

      if (presetId === ThemePreset.Custom) {
        // Custom preset means using dynamic theme
        setCustomThemeSettings({
          themePreset: presetId,
          useDynamicTheme: true,
          dynamicThemeColors: dynamicColors,
        });
      } else {
        // Regular preset
        setCustomThemeSettings({
          themePreset: presetId,
          useDynamicTheme: false,
        });
      }
    }
  }, [dynamicColors, setCustomThemeSettings]);


  const handleDynamicColorChange = useCallback((colorKey: keyof DynamicThemeColors, value: string) => {
    const newColors = { ...dynamicColors, [colorKey]: value };
    setDynamicColors(newColors);
    
    // Only update if we're using custom preset
    if (selectedPreset === ThemePreset.Custom) {
      setCustomThemeSettings({
        themePreset: ThemePreset.Custom,
        useDynamicTheme: true,
        dynamicThemeColors: newColors,
      });
    }
  }, [dynamicColors, selectedPreset, setCustomThemeSettings]);

  const handleGenerateDynamicTheme = useCallback(async () => {
    try {
      // Valida i colori
      if (!isValidHexColor(dynamicColors.primary) || 
          !isValidHexColor(dynamicColors.secondary) || 
          !isValidHexColor(dynamicColors.tertiary)) {
        Alert.alert(t("common.error"), "Please enter valid hex colors");
        return;
      }

      // Genera il tema dinamico
      const generatedTheme = generateDynamicTheme(dynamicColors);
      
      // Salva le impostazioni
      await setCustomThemeSettings({
        themePreset: ThemePreset.Custom,
        useDynamicTheme: true,
        dynamicThemeColors: dynamicColors,
      });

      Alert.alert(t("common.success"), t("appSettings.theme.dynamicThemeGenerated"));
    } catch (error) {
      console.error('Error generating dynamic theme:', error);
      Alert.alert(t("common.error"), "Failed to generate dynamic theme");
    }
  }, [dynamicColors, setCustomThemeSettings, t]);

  const getPresetName = useCallback((presetId: ThemePreset): string => {
    const translationKey = `appSettings.theme.presets.${presetId}` as any;
    return t(translationKey);
  }, [t]);

  // Prepare options for ThemedInputSelect
  const presetOptions = THEME_PRESETS.map(preset => ({
    id: preset.id,
    name: getPresetName(preset.id),
  }));

  const renderDynamicColorInput = (colorKey: keyof DynamicThemeColors, label: string) => (
    <View style={styles.colorPickerRow}>
      <Text variant="bodyMedium" style={styles.colorLabel}>
        {label}
      </Text>
      <View style={styles.colorPickerContainer}>
        <View
          style={[
            styles.colorPreview,
            { backgroundColor: dynamicColors[colorKey] }
          ]}
        />
        <TextInput
          mode="outlined"
          value={dynamicColors[colorKey]}
          onChangeText={(text) => handleDynamicColorChange(colorKey, text)}
          style={styles.colorInput}
          placeholder="#000000"
          autoCapitalize="characters"
          maxLength={7}
        />
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Card style={styles.card}>
        <Card.Title
          title={t("appSettings.theme.title")}
          subtitle={t("appSettings.theme.subtitle")}
          titleVariant="titleLarge"
        />
        <Card.Content>
          {/* Preset Selection */}
          <View style={styles.section}>
            <Selector
              label={t("appSettings.theme.selectPreset")}
              placeholder={t("appSettings.theme.selectPresetPlaceholder")}
              options={presetOptions}
              selectedValue={selectedPreset}
              onValueChange={(value) => handlePresetChange(value as ThemePreset)}
              isSearchable={false}
              disabled={false}
            />
          </View>

          <Divider style={styles.divider} />

          {/* Dynamic Color Inputs - Only show when Custom preset is selected */}
          {selectedPreset === ThemePreset.Custom && (
            <>
              <View style={styles.section}>
                <Text variant="titleSmall">
                  {t("appSettings.theme.dynamicColors")}
                </Text>
                {renderDynamicColorInput("primary", t("appSettings.theme.primaryColor"))}
                {renderDynamicColorInput("secondary", t("appSettings.theme.secondaryColor"))}
                {renderDynamicColorInput("tertiary", t("appSettings.theme.tertiaryColor"))}
                
                <Button
                  mode="contained"
                  onPress={handleGenerateDynamicTheme}
                  style={styles.generateButton}
                >
                  {t("appSettings.theme.generateTheme")}
                </Button>
              </View>
              <Divider style={styles.divider} />
            </>
          )}

          {/* Reset Button */}
          <View style={styles.section}>
            <Button
              mode="outlined"
              onPress={() => {
                setSelectedPreset(ThemePreset.Material3);
                setDynamicColors(DEFAULT_DYNAMIC_COLORS);
                setCustomThemeSettings({
                  themePreset: ThemePreset.Material3,
                  useDynamicTheme: false,
                  dynamicThemeColors: DEFAULT_DYNAMIC_COLORS,
                });
              }}
              style={styles.resetButton}
            >
              {t("appSettings.theme.resetToDefault")}
            </Button>
          </View>
        </Card.Content>
      </Card>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
  },
  card: {
    marginBottom: 16,
  },
  section: {
    marginBottom: 24,
  },
  divider: {
    marginVertical: 16,
  },
  colorPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  colorLabel: {
    flex: 1,
    fontWeight: "500",
  },
  colorPickerContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  colorPreview: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#E0E0E0",
  },
  colorValue: {
    fontFamily: "monospace",
    minWidth: 80,
  },
  colorInput: {
    minWidth: 100,
    fontFamily: "monospace",
  },
  generateButton: {
    marginTop: 16,
    alignSelf: "flex-start",
  },
  resetButton: {
    alignSelf: "flex-start",
  },
});
