import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { DATE_FORMAT_STYLES, DateFormatPreferences, DateFormatStyle } from "@/services/date-format";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    Switch,
    TouchableOpacity,
    View,
    ViewStyle,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface DateFormatSettingsProps {
  style?: ViewStyle;
}

export function DateFormatSettings({ style }: DateFormatSettingsProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const {
    userSettings: { getDateFormatPreferences, setDateFormatPreferences },
  } = useAppContext();

  const [showStyleModal, setShowStyleModal] = useState(false);
  const [preferences, setPreferences] = useState<DateFormatPreferences>(
    getDateFormatPreferences()
  );

  const handleStyleChange = async (newStyle: DateFormatStyle) => {
    const newPreferences = { ...preferences, dateStyle: newStyle };
    setPreferences(newPreferences);
    await setDateFormatPreferences(newPreferences);
    setShowStyleModal(false);
  };

  const handleTimeFormatChange = async (use24Hour: boolean) => {
    const newPreferences = { ...preferences, use24HourTime: use24Hour };
    setPreferences(newPreferences);
    await setDateFormatPreferences(newPreferences);
  };

  const renderStyleOption = ({ item }: { item: DateFormatStyle }) => {
    const styleInfo = DATE_FORMAT_STYLES[item];
    const isSelected = preferences.dateStyle === item;

    return (
      <TouchableOpacity
        style={[
          styles.modalOption,
          {
            backgroundColor: isSelected
              ? Colors[colorScheme].tint + "20"
              : "transparent",
          },
        ]}
        onPress={() => handleStyleChange(item)}
      >
        <View style={styles.modalOptionContent}>
          <ThemedText style={styles.modalOptionTitle}>
            {t(`appSettings.dateFormat.styles.${item}.name`)}
          </ThemedText>
          <ThemedText style={styles.modalOptionExample}>
            {styleInfo.example}
          </ThemedText>
          <ThemedText style={styles.modalOptionDescription}>
            {t(`appSettings.dateFormat.styles.${item}.description`)}
          </ThemedText>
        </View>
        {isSelected && (
          <Ionicons
            name="checkmark"
            size={20}
            color={Colors[colorScheme].tint}
          />
        )}
      </TouchableOpacity>
    );
  };

  return (
    <ThemedView style={[styles.container, style]}>
      {/* Header */}
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("appSettings.dateFormat.title")}
        </ThemedText>
        <ThemedText style={styles.description}>
          {t("appSettings.dateFormat.description")}

        </ThemedText>
      </View>

      {/* Date Style Setting */}
      <TouchableOpacity
        style={styles.settingRow}
        onPress={() => setShowStyleModal(true)}
      >
        <View style={styles.settingContent}>
          <ThemedText style={styles.settingTitle}>
          {t("appSettings.dateFormat.selectStyle")}
          </ThemedText>
          <ThemedText style={styles.settingValue}>
            {t(`appSettings.dateFormat.styles.${preferences.dateStyle}.name`)}
          </ThemedText>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={Colors[colorScheme].text + "60"}
        />
      </TouchableOpacity>

      {/* 24-Hour Format Setting */}
      <View style={styles.settingRow}>
        <View style={styles.settingContent}>
          <ThemedText style={styles.settingTitle}>
            {t("appSettings.dateFormat.use24Hour")}
          </ThemedText>
          <ThemedText style={styles.settingDescription}>
            {t("appSettings.dateFormat.use24HourDescription")}
          </ThemedText>
        </View>
        <Switch
          value={preferences.use24HourTime}
          onValueChange={handleTimeFormatChange}
          trackColor={{
            false: Colors[colorScheme].text + "30",
            true: Colors[colorScheme].tint + "80",
          }}
          thumbColor={
            preferences.use24HourTime
              ? Colors[colorScheme].tint
              : Colors[colorScheme].background
          }
        />
      </View>

      {/* Style Selection Modal */}
      <Modal
        visible={showStyleModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowStyleModal(false)}
      >
        <ThemedView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowStyleModal(false)}
            >
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>
              {t("appSettings.dateFormat.selectStyle")}
            </ThemedText>
            <View style={styles.modalCloseButton} />
          </View>

          <FlatList
            data={Object.keys(DATE_FORMAT_STYLES) as DateFormatStyle[]}
            renderItem={renderStyleOption}
            keyExtractor={(item) => item}
            style={styles.modalList}
            showsVerticalScrollIndicator={false}
          />
        </ThemedView>
      </Modal>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  settingContent: {
    flex: 1,
    marginRight: 12,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 18,
  },
  settingValue: {
    fontSize: 14,
    opacity: 0.8,
  },
  modalContainer: {
    flex: 1,
    paddingTop: Platform.OS === "ios" ? 50 : 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  modalCloseButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  modalList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginVertical: 4,
    borderRadius: 12,
  },
  modalOptionContent: {
    flex: 1,
    marginRight: 12,
  },
  modalOptionTitle: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 4,
  },
  modalOptionExample: {
    fontSize: 14,
    opacity: 0.8,
    marginBottom: 2,
  },
  modalOptionDescription: {
    fontSize: 12,
    opacity: 0.6,
    lineHeight: 16,
  },
});