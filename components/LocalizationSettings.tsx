import { useI18n, useLanguageSync, useLocaleOptions } from "@/hooks";
import { useAppContext } from "@/contexts/AppContext";
import { DATE_FORMAT_STYLES, DateFormatPreferences, DateFormatStyle } from "@/services/date-format";
import { Locale } from "@/types/i18n";
import React, { useEffect, useMemo, useState } from "react";
import {
  FlatList,
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  List,
  Portal,
  Switch,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface LocalizationSettingsProps {
  style?: any;
}

export function LocalizationSettings({ style }: LocalizationSettingsProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { currentLocale, setLocale, availableLocales, getLocaleDisplayName } = useLanguageSync();
  const {
    userSettings: { getTimezone, setTimezone, getDateFormatPreferences, setDateFormatPreferences },
  } = useAppContext();

  // Language settings state
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  const [languageSearchQuery, setLanguageSearchQuery] = useState("");

  // Timezone settings state
  const [showTimezoneModal, setShowTimezoneModal] = useState(false);
  const [timezoneSearchQuery, setTimezoneSearchQuery] = useState("");
  const [allTimezones, setAllTimezones] = useState<string[]>([]);

  // Date format settings state
  const [showDateFormatModal, setShowDateFormatModal] = useState(false);
  const [dateFormatPreferences, setDateFormatPreferencesState] = useState<DateFormatPreferences>(
    getDateFormatPreferences()
  );

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
    const timezones = [
      "UTC",
      "Europe/London",
      "Europe/Paris",
      "Europe/Berlin",
      "Europe/Rome",
      "Europe/Madrid",
      "Europe/Amsterdam",
      "Europe/Zurich",
      "Europe/Vienna",
      "Europe/Prague",
      "Europe/Warsaw",
      "Europe/Stockholm",
      "Europe/Helsinki",
      "Europe/Oslo",
      "Europe/Copenhagen",
      "Europe/Moscow",
      "Europe/Kiev",
      "Europe/Istanbul",
      "Europe/Athens",
      "Europe/Bucharest",
      "Europe/Sofia",
      "Europe/Belgrade",
      "Europe/Zagreb",
      "Europe/Ljubljana",
      "Europe/Sarajevo",
      "Europe/Skopje",
      "Europe/Podgorica",
      "Europe/Tirana",
      "America/New_York",
      "America/Chicago",
      "America/Denver",
      "America/Los_Angeles",
      "America/Anchorage",
      "America/Honolulu",
      "America/Toronto",
      "America/Vancouver",
      "America/Montreal",
      "America/Edmonton",
      "America/Winnipeg",
      "America/Halifax",
      "America/St_Johns",
      "America/Mexico_City",
      "America/Guatemala",
      "America/Belize",
      "America/San_Salvador",
      "America/Tegucigalpa",
      "America/Managua",
      "America/Costa_Rica",
      "America/Panama",
      "America/Bogota",
      "America/Lima",
      "America/La_Paz",
      "America/Santiago",
      "America/Buenos_Aires",
      "America/Montevideo",
      "America/Asuncion",
      "America/Caracas",
      "America/Guyana",
      "America/Suriname",
      "America/Cayenne",
      "America/Sao_Paulo",
      "America/Fortaleza",
      "America/Recife",
      "America/Belem",
      "America/Manaus",
      "America/Cuiaba",
      "America/Porto_Velho",
      "America/Boa_Vista",
      "America/Rio_Branco",
      "Asia/Tokyo",
      "Asia/Seoul",
      "Asia/Shanghai",
      "Asia/Hong_Kong",
      "Asia/Singapore",
      "Asia/Kuala_Lumpur",
      "Asia/Jakarta",
      "Asia/Bangkok",
      "Asia/Ho_Chi_Minh",
      "Asia/Manila",
      "Asia/Taipei",
      "Asia/Macau",
      "Asia/Brunei",
      "Asia/Phnom_Penh",
      "Asia/Vientiane",
      "Asia/Yangon",
      "Asia/Dhaka",
      "Asia/Kolkata",
      "Asia/Colombo",
      "Asia/Kathmandu",
      "Asia/Thimphu",
      "Asia/Karachi",
      "Asia/Kabul",
      "Asia/Tashkent",
      "Asia/Samarkand",
      "Asia/Dushanbe",
      "Asia/Ashgabat",
      "Asia/Bishkek",
      "Asia/Almaty",
      "Asia/Qyzylorda",
      "Asia/Aqtobe",
      "Asia/Aqtau",
      "Asia/Oral",
      "Asia/Yekaterinburg",
      "Asia/Omsk",
      "Asia/Novosibirsk",
      "Asia/Krasnoyarsk",
      "Asia/Irkutsk",
      "Asia/Yakutsk",
      "Asia/Vladivostok",
      "Asia/Magadan",
      "Asia/Kamchatka",
      "Asia/Anadyr",
      "Asia/Tehran",
      "Asia/Dubai",
      "Asia/Muscat",
      "Asia/Baku",
      "Asia/Yerevan",
      "Asia/Tbilisi",
      "Asia/Baghdad",
      "Asia/Kuwait",
      "Asia/Riyadh",
      "Asia/Qatar",
      "Asia/Bahrain",
      "Asia/Jerusalem",
      "Asia/Beirut",
      "Asia/Damascus",
      "Asia/Amman",
      "Asia/Nicosia",
      "Africa/Cairo",
      "Africa/Tripoli",
      "Africa/Tunis",
      "Africa/Algiers",
      "Africa/Casablanca",
      "Africa/Lagos",
      "Africa/Accra",
      "Africa/Abidjan",
      "Africa/Dakar",
      "Africa/Bamako",
      "Africa/Conakry",
      "Africa/Bissau",
      "Africa/Monrovia",
      "Africa/Freetown",
      "Africa/Nouakchott",
      "Africa/El_Aaiun",
      "Africa/Kinshasa",
      "Africa/Luanda",
      "Africa/Brazzaville",
      "Africa/Bangui",
      "Africa/Douala",
      "Africa/Libreville",
      "Africa/Malabo",
      "Africa/Ndjamena",
      "Africa/Niamey",
      "Africa/Porto-Novo",
      "Africa/Lome",
      "Africa/Ouagadougou",
      "Africa/Khartoum",
      "Africa/Juba",
      "Africa/Addis_Ababa",
      "Africa/Asmara",
      "Africa/Djibouti",
      "Africa/Mogadishu",
      "Africa/Nairobi",
      "Africa/Kampala",
      "Africa/Kigali",
      "Africa/Bujumbura",
      "Africa/Dar_es_Salaam",
      "Africa/Lusaka",
      "Africa/Harare",
      "Africa/Maputo",
      "Africa/Mbabane",
      "Africa/Maseru",
      "Africa/Gaborone",
      "Africa/Blantyre",
      "Africa/Johannesburg",
      "Australia/Sydney",
      "Australia/Melbourne",
      "Australia/Brisbane",
      "Australia/Perth",
      "Australia/Adelaide",
      "Australia/Hobart",
      "Australia/Darwin",
      "Australia/Eucla",
      "Australia/Lord_Howe",
      "Pacific/Auckland",
      "Pacific/Chatham",
      "Pacific/Fiji",
      "Pacific/Tonga",
      "Pacific/Samoa",
      "Pacific/Tahiti",
      "Pacific/Marquesas",
      "Pacific/Gambier",
      "Pacific/Honolulu",
      "Pacific/Kiritimati",
      "Pacific/Enderbury",
      "Pacific/Kanton",
      "Pacific/Tarawa",
      "Pacific/Majuro",
      "Pacific/Kwajalein",
      "Pacific/Chuuk",
      "Pacific/Pohnpei",
      "Pacific/Kosrae",
      "Pacific/Palau",
      "Pacific/Guam",
      "Pacific/Saipan",
      "Pacific/Port_Moresby",
      "Pacific/Bougainville",
      "Pacific/Guadalcanal",
      "Pacific/Vanuatu",
      "Pacific/Noumea",
      "Pacific/Norfolk",
    ].sort();

    setAllTimezones(timezones);
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

  // Language handlers
  const handleLanguageSelect = async (locale: Locale) => {
    try {
      await setLocale(locale);
      setShowLanguageModal(false);
      setLanguageSearchQuery("");
    } catch (error) {
      console.error("Failed to change language:", error);
    }
  };

  const getCurrentLanguageDisplayName = (): string => {
    return getLocaleDisplayName(currentLocale);
  };

  // Timezone handlers
  const handleTimezoneSelect = async (timezone: string) => {
    await setTimezone(timezone);
    setShowTimezoneModal(false);
    setTimezoneSearchQuery("");
  };

  const getTimezoneDisplayName = (timezone: string): string => {
    if (timezone === getDeviceTimezone()) {
      return `${timezone} (${t("appSettings.timezone.deviceDefault")})`;
    }
    return timezone;
  };

  const getCurrentTimezoneDisplayName = (): string => {
    return getTimezoneDisplayName(currentTimezone);
  };

  // Date format handlers
  const handleDateFormatStyleChange = async (newStyle: DateFormatStyle) => {
    const newPreferences = { ...dateFormatPreferences, dateStyle: newStyle };
    setDateFormatPreferencesState(newPreferences);
    await setDateFormatPreferences(newPreferences);
    setShowDateFormatModal(false);
  };

  const handleTimeFormatChange = async (use24Hour: boolean) => {
    const newPreferences = { ...dateFormatPreferences, use24HourTime: use24Hour };
    setDateFormatPreferencesState(newPreferences);
    await setDateFormatPreferences(newPreferences);
  };

  // Render functions
  const renderLanguageItem = ({ item }: { item: Locale }) => (
    <List.Item
      title={getLocaleDisplayName(item)}
      right={(props) => 
        item === currentLocale ? (
          <List.Icon {...props} icon="check" color={theme.colors.primary} />
        ) : undefined
      }
      onPress={() => handleLanguageSelect(item)}
      style={{
        backgroundColor: item === currentLocale 
          ? theme.colors.primaryContainer 
          : theme.colors.surface,
        marginHorizontal: 16,
        marginVertical: 2,
        borderRadius: 8,
      }}
    />
  );

  const renderTimezoneItem = ({ item }: { item: string }) => (
    <List.Item
      title={getTimezoneDisplayName(item)}
      description={item === getDeviceTimezone() ? t("appSettings.timezone.deviceDefault") : undefined}
      right={(props) => 
        item === currentTimezone ? (
          <List.Icon {...props} icon="check" color={theme.colors.primary} />
        ) : undefined
      }
      onPress={() => handleTimezoneSelect(item)}
      style={{
        backgroundColor: item === currentTimezone 
          ? theme.colors.primaryContainer 
          : theme.colors.surface,
        marginHorizontal: 16,
        marginVertical: 2,
        borderRadius: 8,
      }}
    />
  );

  const renderDateFormatStyleItem = ({ item }: { item: DateFormatStyle }) => {
    const styleInfo = DATE_FORMAT_STYLES[item];
    const isSelected = dateFormatPreferences.dateStyle === item;

    return (
      <List.Item
        title={t(`appSettings.dateFormat.styles.${item}.name` as any)}
        description={`${styleInfo.example} - ${t(`appSettings.dateFormat.styles.${item}.description` as any)}`}
        right={(props) => 
          isSelected ? (
            <List.Icon {...props} icon="check" color={theme.colors.primary} />
          ) : undefined
        }
        onPress={() => handleDateFormatStyleChange(item)}
        style={{
          backgroundColor: isSelected 
            ? theme.colors.primaryContainer 
            : theme.colors.surface,
          marginHorizontal: 16,
          marginVertical: 2,
          borderRadius: 8,
        }}
      />
    );
  };

  return (
    <View style={style}>
      {/* Section Header */}
      <View style={styles.sectionHeader}>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          {t("appSettings.language.title")}
        </Text>
        <Text variant="bodyMedium" style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant }]}>
          {t("appSettings.language.description")}
        </Text>
      </View>

      {/* Language Settings */}
      <Card style={styles.settingCard} elevation={0}>
        <List.Item
          title={t("appSettings.language.title")}
          description={t("appSettings.language.description")}
          left={(props) => <List.Icon {...props} icon="translate" />}
          right={(props) => (
            <View style={styles.rightContent}>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginRight: 8 }}>
                {getCurrentLanguageDisplayName()}
              </Text>
              <List.Icon {...props} icon="chevron-right" />
            </View>
          )}
          onPress={() => setShowLanguageModal(true)}
        />
      </Card>

      {/* Timezone Settings */}
      <Card style={styles.settingCard} elevation={0}>
        <List.Item
          title={t("appSettings.timezone.title")}
          description={t("appSettings.timezone.description")}
          left={(props) => <List.Icon {...props} icon="clock-outline" />}
          right={(props) => (
            <View style={styles.rightContent}>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginRight: 8 }}>
                {currentTimezone}
              </Text>
              <List.Icon {...props} icon="chevron-right" />
            </View>
          )}
          onPress={() => setShowTimezoneModal(true)}
        />
      </Card>

      {/* Date Format Settings */}
      <Card style={styles.settingCard} elevation={0}>
        <List.Item
          title={t("appSettings.dateFormat.title")}
          description={t("appSettings.dateFormat.description")}
          left={(props) => <List.Icon {...props} icon="calendar" />}
          right={(props) => (
            <View style={styles.rightContent}>
              <Text variant="bodyMedium" style={{ color: theme.colors.primary, marginRight: 8 }}>
                {t(`appSettings.dateFormat.styles.${dateFormatPreferences.dateStyle}.name` as any)}
              </Text>
              <List.Icon {...props} icon="chevron-right" />
            </View>
          )}
          onPress={() => setShowDateFormatModal(true)}
        />
        
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

      {/* Language Selection Modal */}
      <Portal>
        <Dialog 
          visible={showLanguageModal} 
          onDismiss={() => setShowLanguageModal(false)}
          style={styles.modalDialog}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outline }]}>
            <View style={styles.headerLeft}>
              <Icon source="translate" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>{t("appSettings.language.selectLanguage")}</Text>
            </View>
            <TouchableRipple
              style={styles.closeButton}
              onPress={() => setShowLanguageModal(false)}
              borderless
            >
              <Icon source="close" size={20} color={theme.colors.onSurface} />
            </TouchableRipple>
          </View>
                 <Dialog.Content style={{ paddingTop: 16 }}>
                   <TextInput
                     mode="outlined"
                     placeholder={t("appSettings.language.searchLanguage")}
                     value={languageSearchQuery}
                     onChangeText={setLanguageSearchQuery}
                     left={<TextInput.Icon icon="magnify" />}
                     right={
                       languageSearchQuery.length > 0 ? (
                         <TextInput.Icon icon="close" onPress={() => setLanguageSearchQuery("")} />
                       ) : undefined
                     }
                     style={{ marginBottom: 16 }}
                   />
            <FlatList
              data={filteredLocales}
              renderItem={renderLanguageItem}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            />
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Timezone Selection Modal */}
      <Portal>
        <Dialog 
          visible={showTimezoneModal} 
          onDismiss={() => setShowTimezoneModal(false)}
          style={styles.modalDialog}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outline }]}>
            <View style={styles.headerLeft}>
              <Icon source="clock-outline" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>{t("appSettings.timezone.selectTimezone")}</Text>
            </View>
            <TouchableRipple
              style={styles.closeButton}
              onPress={() => setShowTimezoneModal(false)}
              borderless
            >
              <Icon source="close" size={20} color={theme.colors.onSurface} />
            </TouchableRipple>
          </View>
                 <Dialog.Content style={{ paddingTop: 16 }}>
                   <TextInput
                     mode="outlined"
                     placeholder={t("appSettings.timezone.searchTimezone")}
                     value={timezoneSearchQuery}
                     onChangeText={setTimezoneSearchQuery}
                     left={<TextInput.Icon icon="magnify" />}
                     right={
                       timezoneSearchQuery.length > 0 ? (
                         <TextInput.Icon icon="close" onPress={() => setTimezoneSearchQuery("")} />
                       ) : undefined
                     }
                     style={{ marginBottom: 16 }}
                   />
            <FlatList
              data={filteredTimezones}
              renderItem={renderTimezoneItem}
              keyExtractor={(item) => item}
              style={{ maxHeight: 300 }}
              showsVerticalScrollIndicator={false}
            />
          </Dialog.Content>
        </Dialog>
      </Portal>

      {/* Date Format Style Selection Modal */}
      <Portal>
        <Dialog 
          visible={showDateFormatModal} 
          onDismiss={() => setShowDateFormatModal(false)}
          style={styles.modalDialog}
        >
          <View style={[styles.modalHeader, { borderBottomColor: theme.colors.outline }]}>
            <View style={styles.headerLeft}>
              <Icon source="calendar" size={24} color={theme.colors.primary} />
              <Text style={styles.modalTitle}>{t("appSettings.dateFormat.selectStyle")}</Text>
            </View>
            <TouchableRipple
              style={styles.closeButton}
              onPress={() => setShowDateFormatModal(false)}
              borderless
            >
              <Icon source="close" size={20} color={theme.colors.onSurface} />
            </TouchableRipple>
          </View>
                 <Dialog.Content style={{ paddingTop: 16 }}>
                   <FlatList
                     data={Object.keys(DATE_FORMAT_STYLES) as DateFormatStyle[]}
                     renderItem={renderDateFormatStyleItem}
                     keyExtractor={(item) => item}
                     style={{ maxHeight: 300 }}
                     showsVerticalScrollIndicator={false}
                   />
                 </Dialog.Content>
        </Dialog>
      </Portal>
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
    marginBottom: 16,
    marginTop: 16,
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
  modalDialog: {
    maxHeight: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
});
