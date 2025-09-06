import { Colors } from "@/constants/Colors";
import { useI18n, useLanguageSync, useLocaleOptions } from "@/hooks";
import { useColorScheme } from "@/hooks/useTheme";
import { Locale } from '@/types/i18n';
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import {
    FlatList,
    Modal,
    Platform,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    ViewStyle
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface LanguageSettingsProps {
  style?: ViewStyle;
}

export function LanguageSettings({ style }: LanguageSettingsProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { currentLocale, setLocale, availableLocales, getLocaleDisplayName } = useLanguageSync();
  // Note: useLocaleOptions() hook provides the same locale data for consistency
  const localeOptions = useLocaleOptions();
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Use useMemo to avoid re-filtering on every render
  const filteredLocales = useMemo(() => {
    if (!searchQuery.trim()) {
      return availableLocales;
    }
    return availableLocales.filter(locale =>
      getLocaleDisplayName(locale).toLowerCase().includes(searchQuery.toLowerCase().trim())
    );
  }, [searchQuery, availableLocales, getLocaleDisplayName]);

  const handleLanguageSelect = async (locale: Locale) => {
    try {
      await setLocale(locale);
      setShowModal(false);
      setSearchQuery('');
    } catch (error) {
      console.error('Failed to change language:', error);
    }
  };

  const getCurrentLanguageDisplayName = (): string => {
    return getLocaleDisplayName(currentLocale);
  };

  const renderLanguageItem = ({ item }: { item: Locale }) => (
    <TouchableOpacity
      style={[
        styles.languageItem,
        { backgroundColor: Colors[colorScheme].backgroundCard },
        item === currentLocale && {
          backgroundColor: Colors[colorScheme].tint + '20'
        }
      ]}
      onPress={() => handleLanguageSelect(item)}
      activeOpacity={0.7}
    >
      <View style={styles.languageInfo}>
        <ThemedText style={styles.languageText}>
          {getLocaleDisplayName(item)}
        </ThemedText>
      </View>
      {item === currentLocale && (
        <Ionicons 
          name="checkmark" 
          size={20} 
          color={Colors[colorScheme].tint} 
        />
      )}
    </TouchableOpacity>
  );

  return (
    <View style={style}>
      <TouchableOpacity
        style={[styles.settingRow, { backgroundColor: Colors[colorScheme].backgroundCard }]}
        onPress={() => setShowModal(true)}
        activeOpacity={0.7}
      >
        <View style={styles.settingInfo}>
          <Ionicons 
            name="language-outline" 
            size={20} 
            color={Colors[colorScheme].textSecondary} 
            style={styles.settingIcon}
          />
          <View style={styles.settingTextContainer}>
            <ThemedText style={styles.settingTitle}>
              {t('appSettings.language.title')}
            </ThemedText>
            <ThemedText style={[styles.settingDescription, { color: Colors[colorScheme].textSecondary }]}>
              {t('appSettings.language.description')}
            </ThemedText>
            <ThemedText style={[styles.settingValue, { color: Colors[colorScheme].tint }]}>
              {getCurrentLanguageDisplayName()}
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
        presentationStyle={Platform.OS === 'ios' ? 'pageSheet' : 'fullScreen'}
        onRequestClose={() => setShowModal(false)}
      >
        <ThemedView style={[styles.modalContainer, { backgroundColor: Colors[colorScheme].background }]}>
          {/* Header */}
          <View style={[styles.modalHeader, { borderBottomColor: Colors[colorScheme].border }]}>
            <TouchableOpacity
              onPress={() => setShowModal(false)}
              style={styles.closeButton}
            >
              <Ionicons name="close" size={24} color={Colors[colorScheme].text} />
            </TouchableOpacity>
            <ThemedText style={styles.modalTitle}>
              {t('appSettings.language.selectLanguage')}
            </ThemedText>
            <View style={styles.closeButton} />
          </View>

          {/* Search */}
          <View style={[styles.searchContainer, { backgroundColor: Colors[colorScheme].backgroundCard }]}>
            <Ionicons 
              name="search" 
              size={20} 
              color={Colors[colorScheme].textSecondary} 
              style={styles.searchIcon}
            />
            <TextInput
              style={[styles.searchInput, { color: Colors[colorScheme].text }]}
              placeholder={t('appSettings.language.searchLanguage')}
              placeholderTextColor={Colors[colorScheme].textSecondary}
              value={searchQuery}
              onChangeText={setSearchQuery}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity
                onPress={() => setSearchQuery('')}
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

          {/* Language List */}
          <FlatList
            data={filteredLocales}
            renderItem={renderLanguageItem}
            keyExtractor={item => item}
            style={styles.languageList}
            showsVerticalScrollIndicator={false}
            ItemSeparatorComponent={() => (
              <View style={[styles.separator, { backgroundColor: Colors[colorScheme].border }]} />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  languageList: {
    flex: 1,
  },
  languageItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  languageInfo: {
    flex: 1,
  },
  languageText: {
    fontSize: 16,
    marginBottom: 2,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 16,
  },
});
