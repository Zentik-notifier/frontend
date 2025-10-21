import Selector from "@/components/ui/Selector";
import { AVAILABLE_TIMEZONES } from "@/constants/timezones";
import { Locale, useI18n } from "@/hooks/useI18n";
import { DATE_FORMAT_STYLES } from "@/services/date-format";
import { ThemePreset } from "@/services/theme-presets";
import { DateFormatStyle, MarkAsReadMode } from "@/services/settings-service";
import { useSettings } from "@/hooks/useSettings";
import React, { memo, useCallback, useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";

const Step2 = memo(() => {
  const theme = useTheme();
  const { t, locale: currentLocale, availableLocales, getLocaleDisplayName } = useI18n();
  const { settings, setLocale, setCustomThemeSettings, setDateFormatPreferences, setTimezone, updateSettings } = useSettings();
  
  // Local state for UI only - settings are managed directly via userSettings
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>("en-EN");
  const [selectedThemePreset, setSelectedThemePreset] = useState<ThemePreset>(ThemePreset.Material3);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatStyle>("medium");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [selectedMarkAsReadMode, setSelectedMarkAsReadMode] = useState<MarkAsReadMode>("on-view");

  // Initialize from settings on mount
  useEffect(() => {
    setSelectedLanguage(settings.locale || "en-EN");
    setSelectedThemePreset(settings.theme.themePreset || ThemePreset.Material3);
    setSelectedDateFormat(settings.dateFormat.dateStyle);
    setSelectedTimezone(settings.timezone);
    setSelectedMarkAsReadMode(settings.notificationsPreferences?.markAsReadMode || "on-view");
  }, [settings]);

  const handleLanguageSelect = useCallback(async (lang: Locale) => {
    setSelectedLanguage(lang);
    await setLocale(lang);
  }, [setLocale]);

  const handleThemePresetSelect = useCallback((preset: ThemePreset) => {
    setSelectedThemePreset(preset);
    setCustomThemeSettings({
      themePreset: preset,
      useDynamicTheme: false,
    });
  }, [setCustomThemeSettings]);

  const handleDateFormatSelect = useCallback((format: DateFormatStyle) => {
    setSelectedDateFormat(format);
    setDateFormatPreferences({ dateStyle: format });
  }, [setDateFormatPreferences]);

  const handleTimezoneSelect = useCallback((timezone: string) => {
    setSelectedTimezone(timezone);
    setTimezone(timezone);
  }, [setTimezone]);

  const handleMarkAsReadModeSelect = useCallback(async (mode: MarkAsReadMode) => {
    setSelectedMarkAsReadMode(mode);
    await updateSettings({ 
      notificationsPreferences: { 
        ...(settings.notificationsPreferences!), 
        markAsReadMode: mode 
      } 
    });
  }, [updateSettings, settings.notificationsPreferences]);

  // Language options
  const languageOptions = useMemo(() => 
    availableLocales.map((locale) => ({
      id: locale,
      name: getLocaleDisplayName(locale),
      iconName: "translate" as const,
    }))
  , [availableLocales, getLocaleDisplayName]);

  // Material theme presets (excluding Custom)
  const themePresets = useMemo(() => [
    { id: ThemePreset.Material3, icon: "material-design" },
    { id: ThemePreset.Blue, icon: "palette" },
    { id: ThemePreset.Red, icon: "palette" },
    { id: ThemePreset.Yellow, icon: "palette" },
    { id: ThemePreset.Green, icon: "palette" },
    { id: ThemePreset.Terra, icon: "palette" },
    { id: ThemePreset.HighTech, icon: "palette" },
    { id: ThemePreset.Pastel, icon: "palette" },
    { id: ThemePreset.Minimal, icon: "palette" },
  ], []);

  // Date format options with examples
  const dateFormatOptions = useMemo(() => [
    { id: "short" as DateFormatStyle, example: DATE_FORMAT_STYLES.short.example },
    { id: "medium" as DateFormatStyle, example: DATE_FORMAT_STYLES.medium.example },
    { id: "long" as DateFormatStyle, example: DATE_FORMAT_STYLES.long.example },
  ], []);

  // Use the same timezones as LocalizationSettings
  const timezoneOptions = useMemo(() => 
    AVAILABLE_TIMEZONES.map((tz) => ({
      id: tz,
      name: tz,
      iconName: "earth" as const,
    }))
  , []);

  return (
    <ScrollView style={styles.stepContainer}>
      <View style={styles.stepContent}>
        <Icon source="palette" size={64} color={theme.colors.primary} />
        <Text variant="headlineMedium" style={styles.stepTitle}>
          {t("onboardingV2.step2.title")}
        </Text>
        <Text variant="bodyLarge" style={styles.stepDescription}>
          {t("onboardingV2.step2.description")}
        </Text>

        {/* Language Section */}
        <View style={styles.section}>
          <Selector
            mode="inline"
            label={t("onboardingV2.step2.language")}
            placeholder={t("common.selectOption")}
            options={languageOptions}
            selectedValue={selectedLanguage}
            onValueChange={handleLanguageSelect}
          />
        </View>

        {/* Theme Preset Section */}
        <View style={styles.section}>
          <Selector
            mode="inline"
            label={t("onboardingV2.step2.themePreset")}
            placeholder={t("common.selectOption")}
            options={themePresets.map((preset) => ({
              id: preset.id,
              name: t(`appSettings.theme.presets.${preset.id}`),
              iconName: preset.icon,
            }))}
            selectedValue={selectedThemePreset}
            onValueChange={handleThemePresetSelect}
          />
        </View>

        {/* Date Format Section */}
        <View style={styles.section}>
          <Selector
            mode="inline"
            label={t("onboardingV2.step2.dateFormat")}
            placeholder={t("common.selectOption")}
            options={dateFormatOptions.map((format) => ({
              id: format.id,
              name: `${t(`appSettings.dateFormat.styles.${format.id}.name`)} (${format.example})`,
              iconName: "calendar",
            }))}
            selectedValue={selectedDateFormat}
            onValueChange={handleDateFormatSelect}
          />
        </View>

        {/* Timezone Section */}
        <View style={styles.section}>
          <Selector
            mode="inline"
            label={t("onboardingV2.step2.timezone")}
            placeholder={t("common.selectOption")}
            options={timezoneOptions}
            selectedValue={selectedTimezone}
            onValueChange={handleTimezoneSelect}
            isSearchable
          />
        </View>

        {/* Mark as Read Mode Section */}
        <View style={styles.section}>
          <Selector
            mode="inline"
            label={t("onboardingV2.step2.markAsReadMode")}
            placeholder={t("common.selectOption")}
            helperText={t("onboardingV2.step2.markAsReadModeDescription")}
            options={[
              {
                id: "on-tap",
                name: t("onboardingV2.step2.markAsReadModes.onTap"),
                iconName: "hand-pointing-right",
              },
              {
                id: "on-view",
                name: t("onboardingV2.step2.markAsReadModes.onView"),
                iconName: "eye",
              },
              {
                id: "on-app-close",
                name: t("onboardingV2.step2.markAsReadModes.onAppClose"),
                iconName: "exit-to-app",
              },
            ]}
            selectedValue={selectedMarkAsReadMode}
            onValueChange={handleMarkAsReadModeSelect}
          />
        </View>

        {/* Disclaimer */}
        <View style={styles.disclaimer}>
          <Icon source="information-outline" size={20} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodySmall" style={[styles.disclaimerText, { color: theme.colors.onSurfaceVariant }]}>
            {t("onboardingV2.step2.disclaimer")}
          </Text>
        </View>
      </View>
    </ScrollView>
  );
});

Step2.displayName = "Step2";

const styles = StyleSheet.create({
  stepContainer: {
    flex: 1,
  },
  stepContent: {
    padding: 24,
    alignItems: "center",
  },
  stepTitle: {
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  stepDescription: {
    marginBottom: 24,
    textAlign: "center",
    opacity: 0.8,
  },
  section: {
    width: "100%",
    marginBottom: 16,
  },
  disclaimer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 24,
    padding: 16,
    borderRadius: 8,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
  },
  disclaimerText: {
    flex: 1,
    lineHeight: 20,
  },
});

export default Step2;
