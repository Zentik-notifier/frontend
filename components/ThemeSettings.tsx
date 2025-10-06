import { useI18n } from "@/hooks/useI18n";
import { useUserSettings, DynamicThemeColors, LayoutMode } from "@/services/user-settings";
import {
  generateDynamicTheme,
  isValidHexColor,
  DEFAULT_DYNAMIC_COLORS,
} from "@/services/theme-generator";
import {
  ThemePreset,
  getAllThemePresets,
  getThemePreset,
  isCustomPreset,
} from "@/services/theme-presets";
import React, { useCallback, useState } from "react";
import { ScrollView, StyleSheet, View, Alert, useWindowDimensions } from "react-native";
import {
  Button,
  Divider,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import Selector, { SelectorOption } from "./ui/Selector";

const THEME_PRESETS = getAllThemePresets();

export default function ThemeSettings() {
  const { t } = useI18n();
  const theme = useTheme();
  const { width } = useWindowDimensions();
  const { settings, setCustomThemeSettings, getLayoutMode, setLayoutMode } = useUserSettings();

  const [selectedPreset, setSelectedPreset] = useState<ThemePreset>(
    settings.themePreset || ThemePreset.Material3
  );
  const [dynamicColors, setDynamicColors] = useState<DynamicThemeColors>(
    settings.dynamicThemeColors || DEFAULT_DYNAMIC_COLORS
  );

  const handlePresetChange = useCallback(
    (presetId: ThemePreset) => {
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
    },
    [dynamicColors, setCustomThemeSettings]
  );

  const handleDynamicColorChange = useCallback(
    (colorKey: keyof DynamicThemeColors, value: string) => {
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
    },
    [dynamicColors, selectedPreset, setCustomThemeSettings]
  );

  const handleGenerateDynamicTheme = useCallback(async () => {
    try {
      // Valida i colori
      if (
        !isValidHexColor(dynamicColors.primary) ||
        !isValidHexColor(dynamicColors.secondary) ||
        !isValidHexColor(dynamicColors.tertiary)
      ) {
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

      Alert.alert(
        t("common.success"),
        t("appSettings.theme.dynamicThemeGenerated")
      );
    } catch (error) {
      console.error("Error generating dynamic theme:", error);
      Alert.alert(t("common.error"), "Failed to generate dynamic theme");
    }
  }, [dynamicColors, setCustomThemeSettings, t]);

  const getPresetName = useCallback(
    (presetId: ThemePreset): string => {
      const translationKey = `appSettings.theme.presets.${presetId}` as any;
      return t(translationKey);
    },
    [t]
  );

  const presetOptions: SelectorOption[] = THEME_PRESETS.map((preset) => ({
    id: preset.id,
    name: getPresetName(preset.id),
  }));

  const layoutModeOptions: SelectorOption[] = [
    { id: 'auto', name: t('appSettings.theme.layoutModes.auto') },
    { id: 'desktop', name: t('appSettings.theme.layoutModes.desktop') },
    { id: 'tablet', name: t('appSettings.theme.layoutModes.tablet') },
    { id: 'mobile', name: t('appSettings.theme.layoutModes.mobile') },
  ];

  const renderDynamicColorInput = (
    colorKey: keyof DynamicThemeColors,
    label: string
  ) => (
    <View style={styles.colorPickerRow}>
      <Text variant="bodyMedium" style={styles.colorLabel}>
        {label}
      </Text>
      <View style={styles.colorPickerContainer}>
        <View
          style={[
            styles.colorPreview,
            { backgroundColor: dynamicColors[colorKey] },
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

  const showDynamic = selectedPreset === ThemePreset.Custom;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text variant="titleLarge" style={{ marginBottom: 4 }}>
        {t("appSettings.theme.title")}
      </Text>
      <Text variant="bodyMedium" style={{ opacity: 0.8, marginBottom: 16 }}>
        {t("appSettings.theme.subtitle")}
      </Text>

      <View style={styles.section}>
        <Selector
          label={t("appSettings.theme.selectPreset")}
          placeholder={t("appSettings.theme.selectPresetPlaceholder")}
          options={presetOptions}
          selectedValue={selectedPreset}
          onValueChange={(value) => handlePresetChange(value as ThemePreset)}
          isSearchable={false}
          disabled={false}
          mode="inline"
        />
      </View>

      <Divider style={styles.divider} />

      <View style={styles.section}>
        <View style={styles.layoutModeContainer}>
          <Selector
            label={t("appSettings.theme.layoutMode")}
            placeholder={t("appSettings.theme.layoutModePlaceholder")}
            options={layoutModeOptions}
            selectedValue={getLayoutMode()}
            onValueChange={(value) => setLayoutMode(value as LayoutMode)}
            isSearchable={false}
            disabled={false}
            mode="inline"
          />
          <Text variant="bodyMedium" style={styles.currentWidthText}>
            {t("appSettings.theme.currentWidth")}: {Math.round(width)}px
          </Text>
        </View>
      </View>

      {showDynamic && <Divider style={styles.divider} />}

      {showDynamic && (
        <View style={styles.section}>
          <Text variant="titleSmall">
            {t("appSettings.theme.dynamicColors")}
          </Text>
          {renderDynamicColorInput(
            "primary",
            t("appSettings.theme.primaryColor")
          )}
          {renderDynamicColorInput(
            "secondary",
            t("appSettings.theme.secondaryColor")
          )}
          {renderDynamicColorInput(
            "tertiary",
            t("appSettings.theme.tertiaryColor")
          )}

          <Button
            mode="contained"
            onPress={handleGenerateDynamicTheme}
            style={styles.generateButton}
          >
            {t("appSettings.theme.generateTheme")}
          </Button>
        </View>
      )}

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
  layoutModeContainer: {
    gap: 12,
  },
  currentWidthText: {
    marginTop: 8,
    opacity: 0.7,
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
