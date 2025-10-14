import React, { memo, useCallback, useMemo, useState, useEffect } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks";
import { useOnboarding } from "./OnboardingContext";
import { ThemePreset } from "@/services/theme-presets";
import { DateFormatStyle, MarkAsReadMode, userSettings } from "@/services/user-settings";
import { DATE_FORMAT_STYLES } from "@/services/date-format";
import { Locale } from "@/hooks/useI18n";
import Selector, { SelectorOption } from "@/components/ui/Selector";
import { i18nService } from "@/services/i18n";
import { AVAILABLE_TIMEZONES } from "@/constants/timezones";

const Step2 = memo(() => {
  const theme = useTheme();
  const { t } = useI18n();
  
  // Local state for UI only - settings are managed directly via userSettings
  const [selectedLanguage, setSelectedLanguage] = useState<Locale>("en-EN");
  const [selectedThemePreset, setSelectedThemePreset] = useState<ThemePreset>(ThemePreset.Material3);
  const [selectedDateFormat, setSelectedDateFormat] = useState<DateFormatStyle>("medium");
  const [selectedTimezone, setSelectedTimezone] = useState<string>("UTC");
  const [selectedMarkAsReadMode, setSelectedMarkAsReadMode] = useState<MarkAsReadMode>("on-view");

  // Initialize from userSettings on mount
  useEffect(() => {
    const settings = userSettings.getSettings();
    setSelectedLanguage(settings.locale || "en-EN");
    setSelectedThemePreset(settings.themePreset || ThemePreset.Material3);
    setSelectedDateFormat(settings.dateFormat.dateStyle);
    setSelectedTimezone(settings.timezone);
    setSelectedMarkAsReadMode(settings.notificationsPreferences?.markAsReadMode || "on-view");
  }, [setSelectedLanguage, setSelectedThemePreset, setSelectedDateFormat, setSelectedTimezone, setSelectedMarkAsReadMode]);

  const handleLanguageSelect = useCallback(async (lang: Locale) => {
    setSelectedLanguage(lang);
    await userSettings.setLocale(lang);
    // Apply language immediately via i18nService
    await i18nService.setLocale(lang);
  }, []);

  const handleThemePresetSelect = useCallback((preset: ThemePreset) => {
    setSelectedThemePreset(preset);
    userSettings.setCustomThemeSettings({
      themePreset: preset,
      useDynamicTheme: false,
    });
  }, []);

  const handleDateFormatSelect = useCallback((format: DateFormatStyle) => {
    setSelectedDateFormat(format);
    userSettings.setDateFormatPreferences({ dateStyle: format });
  }, []);

  const handleTimezoneSelect = useCallback((timezone: string) => {
    setSelectedTimezone(timezone);
    userSettings.setTimezone(timezone);
  }, []);

  const handleMarkAsReadModeSelect = useCallback(async (mode: MarkAsReadMode) => {
    setSelectedMarkAsReadMode(mode);
    const settings = userSettings.getSettings();
    await userSettings.updateSettings({ 
      notificationsPreferences: { 
        ...(settings.notificationsPreferences!), 
        markAsReadMode: mode 
      } 
    });
  }, []);

  // Language options from i18n service
  const languageOptions = useMemo(() => 
    i18nService.getAvailableLocales().map((locale) => ({
      id: locale,
      name: i18nService.getLocaleDisplayName(locale),
      iconName: "translate" as const,
    }))
  , []);

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
