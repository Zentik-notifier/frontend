import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  FlatList,
  Modal,
  Platform,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface TimezoneSettingsProps {
  style?: ViewStyle;
}

export function TimezoneSettings({ style }: TimezoneSettingsProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const {
    userSettings: { getTimezone, setTimezone },
  } = useAppContext();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredTimezones, setFilteredTimezones] = useState<string[]>([]);
  const [allTimezones, setAllTimezones] = useState<string[]>([]);

  const currentTimezone = getTimezone();

  // Get device default timezone
  const getDeviceTimezone = (): string => {
    try {
      return Intl.DateTimeFormat().resolvedOptions().timeZone;
    } catch {
      return "UTC";
    }
  };

  // Get all available timezones - using predefined list for compatibility
  useEffect(() => {
    // Common timezones supported by date-fns
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
    setFilteredTimezones(timezones);
  }, []);

  // Filter timezones based on search query
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredTimezones(allTimezones);
    } else {
      const filtered = allTimezones.filter((tz) =>
        tz.toLowerCase().includes(searchQuery.toLowerCase().trim())
      );
      setFilteredTimezones(filtered);
    }
  }, [searchQuery, allTimezones]);

  const handleTimezoneSelect = async (timezone: string) => {
    await setTimezone(timezone);
    setShowModal(false);
    setSearchQuery("");
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

  const renderTimezoneItem = ({ item }: { item: string }) => (
    <TouchableOpacity
      style={[
        styles.timezoneItem,
        { backgroundColor: Colors[colorScheme].backgroundCard },
        item === currentTimezone && {
          backgroundColor: Colors[colorScheme].tint + "20",
        },
      ]}
      onPress={() => handleTimezoneSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.timezoneInfo}>
        <ThemedText style={styles.timezoneText}>
          {getTimezoneDisplayName(item)}
        </ThemedText>
        {item === getDeviceTimezone() && (
          <ThemedText
            style={[styles.defaultBadge, { color: Colors[colorScheme].tint }]}
          >
            {t("appSettings.timezone.deviceDefault")}
          </ThemedText>
        )}
      </View>
      {item === currentTimezone && (
        <Ionicons name="checkmark" size={20} color={Colors[colorScheme].tint} />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={style}>
      <TouchableOpacity
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.settingInfo}>
          <Ionicons
            name="time-outline"
            size={20}
            color={Colors[colorScheme].textSecondary}
            style={styles.settingIcon}
          />
          <View style={styles.settingTextContainer}>
            <ThemedText style={styles.settingTitle}>
              {t("appSettings.timezone.title")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.timezone.description")}
            </ThemedText>
            <ThemedText
              style={[styles.settingValue, { color: Colors[colorScheme].tint }]}
            >
              {getCurrentTimezoneDisplayName()}
            </ThemedText>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={16}
          color={Colors[colorScheme].textSecondary}
        />
      </TouchableOpacity>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle={Platform.OS === "ios" ? "pageSheet" : "fullScreen"}
        onRequestClose={() => setShowModal(false)}
      >
        <ThemedView
          style={[
            styles.modalContainer,
            { backgroundColor: Colors[colorScheme].background },
          ]}
        >
          {/* Header */}
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: Colors[colorScheme].border },
            ]}
          >
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>
              {t("appSettings.timezone.selectTimezone")}
            </ThemedText>
            <View style={styles.closeButton} />
          </View>

          {/* Search */}
          <View
            style={[
              styles.searchContainer,
              { backgroundColor: Colors[colorScheme].backgroundCard },
            ]}
          >
            <Ionicons
              name="search"
              size={20}
              color={Colors[colorScheme].textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: Colors[colorScheme].text }]}
              placeholder={t("appSettings.timezone.searchTimezone")}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery("")}
                style={styles.clearButton}
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color={Colors[colorScheme].textSecondary}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Timezone List */}
          <FlatList
            data={filteredTimezones}
            renderItem={renderTimezoneItem}
            keyExtractor={(item) => item}
            style={styles.timezoneList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View
                style={[
                  styles.separator,
                  { backgroundColor: Colors[colorScheme].border },
                ]}
              />
            )}
          />
        </ThemedView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  settingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingInfo: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
    marginRight: 16,
  },
  settingIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  settingTextContainer: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  settingValue: {
    fontSize: 14,
    fontWeight: "500",
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginVertical: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 4,
  },
  clearButton: {
    padding: 4,
  },
  timezoneList: {
    flex: 1,
  },
  timezoneItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  timezoneInfo: {
    flex: 1,
  },
  timezoneText: {
    fontSize: 16,
    marginBottom: 2,
  },
  defaultBadge: {
    fontSize: 12,
    fontWeight: "500",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
