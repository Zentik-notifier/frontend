import { useAppContext } from "@/contexts/AppContext";
import { useI18n, useLanguageSync } from "@/hooks";
import {
  DATE_FORMAT_STYLES,
  DateFormatPreferences,
  DateFormatStyle,
} from "@/services/date-format";
import React, { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import Selector, { SelectorOption } from "./ui/Selector";
import { Card, Switch, Text, useTheme } from "react-native-paper";
import { Locale } from "@/hooks/useI18n";
import { AVAILABLE_TIMEZONES } from "@/constants/timezones";

export function LocalizationSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const { currentLocale, setLocale, availableLocales, getLocaleDisplayName } =
    useLanguageSync();
  const {
    userSettings: {
      getTimezone,
      setTimezone,
      getDateFormatPreferences,
      setDateFormatPreferences,
    },
  } = useAppContext();

  // Language settings state
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");

  // Timezone settings state
  const [timezoneSearchQuery, setTimezoneSearchQuery] = useState("");
  const [allTimezones, setAllTimezones] = useState<string[]>([]);

  // Date format settings state
  const [dateFormatPreferences, setDateFormatPreferencesState] =
    useState<DateFormatPreferences>(getDateFormatPreferences());

  const currentTimezone = getTimezone();

  // Get device default timezone
  const getDeviceTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  };

  // Initialize timezones
  useEffect(() => {
    setAllTimezones(AVAILABLE_TIMEZONES);
  }, []);

  // Filter languages based on search query
  const filteredLocales = useMemo(() => {
    if (!languageSearchQuery.trim()) {
      return availableLocales;
    }
    return availableLocales.filter((locale) =>
      getLocaleDisplayName(locale)
        .toLowerCase()
        .includes(languageSearchQuery.toLowerCase().trim())
    );
  }, [languageSearchQuery, availableLocales, getLocaleDisplayName]);

  // Filter timezones based on search query
  const filteredTimezones = useMemo(() => {
    if (!timezoneSearchQuery.trim()) {
      return allTimezones;
    }
    return allTimezones.filter((tz) =>
      tz.toLowerCase().includes(timezoneSearchQuery.toLowerCase().trim())
    );
  }, [timezoneSearchQuery, allTimezones]);

  // Prepare options for dropdowns
  const languageOptions = useMemo(() => {
    return filteredLocales.map((locale) => ({
      id: locale,
      name: getLocaleDisplayName(locale),
    }));
  }, [filteredLocales, getLocaleDisplayName]);

  const getTimezoneDisplayName = (timezone: string): string => {
    if (timezone === getDeviceTimezone()) {
      return `${timezone} (${t("appSettings.timezone.deviceDefault")})`;
    }
    return timezone;
  };

  const timezoneOptions = useMemo(() => {
    return filteredTimezones.map((timezone) => ({
      id: timezone,
      name: getTimezoneDisplayName(timezone),
    }));
  }, [filteredTimezones, getTimezoneDisplayName]);

  const dateFormatOptions: SelectorOption[] = useMemo(() => {
    return Object.keys(DATE_FORMAT_STYLES).map((style) => {
      const styleInfo = DATE_FORMAT_STYLES[style as DateFormatStyle];
      return {
        id: style,
        name: t(`appSettings.dateFormat.styles.${style}.name` as any),
        description: `${styleInfo.example} - ${t(
          `appSettings.dateFormat.styles.${style}.description` as any
        )}`,
      };
    });
  }, [t]);

  const selectedLanguage = languageOptions.find(
    (option) => option.id === currentLocale
  );
  const selectedTimezone = timezoneOptions.find(
    (option) => option.id === currentTimezone
  );
  const selectedDateFormat = dateFormatOptions.find(
    (option) => option.id === dateFormatPreferences.dateStyle
  );

  // Language handlers
  const handleLanguageSelect = async (locale: Locale) => {
    try {
      await setLocale(locale);
      setLanguageSearchQuery("");
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

  // Timezone handlers
  const handleTimezoneSelect = async (timezone: string) => {
    await setTimezone(timezone);
    setTimezoneSearchQuery("");
  };

  const getCurrentTimezoneDisplayName = (): string => {
    return getTimezoneDisplayName(currentTimezone);
  };

  // Date format handlers
  const handleDateFormatStyleChange = async (newStyle: DateFormatStyle) => {
    const newPreferences = { ...dateFormatPreferences, dateStyle: newStyle };
    setDateFormatPreferencesState(newPreferences);
    await setDateFormatPreferences(newPreferences);
  };

  const handleTimeFormatChange = async (use24Hour: boolean) => {
    const newPreferences = {
      ...dateFormatPreferences,
      use24HourTime: use24Hour,
    };
    setDateFormatPreferencesState(newPreferences);
    await setDateFormatPreferences(newPreferences);
  };

  return (
    <View>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          {t("appSettings.localization.title")}
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.sectionDescription,
            { color: theme.colors.onSurfaceVariant },
          ]}
        >
          {t("appSettings.localization.description")}
        </Text>
      </View>

      {/* Language Settings */}
      <Card style={styles.settingCard} elevation={0}>
        <View style={styles.dropdownContainer}>
          <Selector
            label={t("appSettings.localization.selectLanguage")}
            placeholder={t("appSettings.localization.selectPlaceholder")}
            options={languageOptions}
            selectedValue={selectedLanguage?.id}
            onValueChange={(value) => handleLanguageSelect(value as Locale)}
            isSearchable={true}
          />
        </View>
      </Card>

      {/* Timezone Settings */}
      <Card style={styles.settingCard} elevation={0}>
        <View style={styles.dropdownContainer}>
          <Selector
            label={t("appSettings.timezone.title")}
            placeholder={t("appSettings.timezone.selectPlaceholder")}
            options={timezoneOptions}
            selectedValue={selectedTimezone?.id}
            onValueChange={(value) => handleTimezoneSelect(value as string)}
            isSearchable={true}
          />
        </View>
      </Card>

      {/* Date Format Settings */}
      <Card style={styles.settingCard} elevation={0}>
        <View style={styles.dropdownContainer}>
          <Selector
            label={t("appSettings.dateFormat.title")}
            placeholder={t("appSettings.dateFormat.selectPlaceholder")}
            options={dateFormatOptions}
            selectedValue={selectedDateFormat?.id}
            onValueChange={(value) =>
              handleDateFormatStyleChange(value as DateFormatStyle)
            }
            isSearchable={false}
          />
        </View>

        <View style={styles.switchContainer}>
          <Text variant="bodyMedium" style={styles.switchLabel}>
            {t("appSettings.dateFormat.use24Hour")}
          </Text>
          <Switch
            value={dateFormatPreferences.use24HourTime}
            onValueChange={handleTimeFormatChange}
          />
        </View>
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  settingCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    marginTop: 8,
  },
  rightContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  switchLabel: {
    flex: 1,
    marginRight: 16,
  },
  dropdownContainer: {},
  dropdownLabel: {
    marginBottom: 4,
  },
  dropdownDescription: {
    marginBottom: 12,
    lineHeight: 20,
  },
  dropdownButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  dropdownButtonText: {
    flex: 1,
    marginLeft: 8,
    marginRight: 8,
    fontSize: 16,
  },
  dropdownItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  dropdownItemText: {
    fontSize: 16,
    fontWeight: "500",
  },
  dropdownItemDescription: {
    fontSize: 14,
    marginTop: 4,
    opacity: 0.7,
  },
});
