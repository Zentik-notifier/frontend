import { Colors } from "@/constants/Colors";
import SettingsScrollView from "@/components/SettingsScrollView";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { reinitializeApolloClient } from "../config/apollo-client";
import { ApiConfigService } from "../services/api-config";
import { clearTermsAcceptance } from "../services/auth-storage";
import { DateFormatSettings } from "./DateFormatSettings";
import { LanguageSettings } from "./LanguageSettings";
import { LegalDocumentsSettings } from "./LegalDocumentsSettings";
import { ThemedText } from "./ThemedText";
import { TimezoneSettings } from "./TimezoneSettings";
import UnifiedCacheSettings from "./UnifiedCacheSettings";
import { VersionInfo } from "./VersionInfo";

export function AppSettings() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  // API URL state
  const [apiUrl, setApiUrl] = useState("");
  const [originalApiUrl, setOriginalApiUrl] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadApiUrl();
  }, []);

  const loadApiUrl = async () => {
    try {
      const customUrl = await ApiConfigService.getCustomApiUrl();
      setApiUrl(customUrl);
      setOriginalApiUrl(customUrl);
    } catch (error) {
      console.error("Failed to load API URL:", error);
    }
  };

  const saveApiUrl = async () => {
    setLoading(true);
    try {
      await ApiConfigService.setCustomApiUrl(apiUrl);
      setOriginalApiUrl(apiUrl);

      // Reinitialize Apollo Client with new URL
      await reinitializeApolloClient();

      // Show success alert
      Alert.alert(
        t("appSettings.apiUrl.success"),
        t("appSettings.apiUrl.successMessage"),
        [{ text: t("common.ok") }]
      );
    } catch (error) {
      console.error("Failed to save API URL:", error);
      Alert.alert(t("common.error"), t("appSettings.apiUrl.saveError"), [
        { text: t("common.ok") },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const resetApiUrl = () => {
    setApiUrl(originalApiUrl);
  };

  const hasChanges = apiUrl !== originalApiUrl;

  const handleRevokeTerms = () => {
    Alert.alert(
      t("appSettings.revokeTerms"),
      t("appSettings.revokeTermsConfirm"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("appSettings.revokeTerms"),
          style: "destructive",
          onPress: async () => {
            try {
              setLoading(true);
              await clearTermsAcceptance();
              Alert.alert(
                t("common.success"),
                t("appSettings.revokeTermsSuccess"),
                [{ text: t("common.ok") }]
              );
            } catch (error) {
              console.error("Failed to revoke terms:", error);
              Alert.alert(
                t("common.error"),
                "Failed to revoke terms acceptance"
              );
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const renderActionSetting = (
    title: string,
    description: string,
    onPress: () => void,
    icon?: string,
    destructive?: boolean
  ) => (
    <TouchableOpacity
      style={[
        styles.settingRow,
        { backgroundColor: Colors[colorScheme].backgroundCard },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.settingInfo}>
        {icon && (
          <Ionicons
            name={icon as any}
            size={20}
            color={
              destructive ? Colors[colorScheme].error : Colors[colorScheme].tint
            }
            style={styles.settingIcon}
          />
        )}
        <View style={styles.settingTextContainer}>
          <ThemedText
            style={[
              styles.settingTitle,
              {
                color: destructive
                  ? Colors[colorScheme].error
                  : Colors[colorScheme].text,
              },
            ]}
          >
            {title}
          </ThemedText>
          <ThemedText
            style={[
              styles.settingDescription,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {description}
          </ThemedText>
        </View>
      </View>
      <Ionicons
        name="chevron-forward"
        size={16}
        color={Colors[colorScheme].textSecondary}
      />
    </TouchableOpacity>
  );

  const handleRefresh = async () => {
    // This screen mostly manages local settings; noop refresh hook
  };

  return (
    <SettingsScrollView onRefresh={handleRefresh}>
      {/* Removed internal title to delegate to Stack header */}

      {/* API URL Section */}
      <View style={styles.apiUrlSection}>
        <View
          style={[
            styles.settingRow,
            {
              backgroundColor: Colors[colorScheme].backgroundCard,
              borderColor: Colors[colorScheme].border,
            },
          ]}
        >
          <View style={styles.settingInfo}>
            <View style={styles.settingTextContainer}>
              <ThemedText
                style={[
                  styles.settingTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("appSettings.apiUrl.serverUrl")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.settingDescription,
                  { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {t("appSettings.apiUrl.serverUrlDescription")}
              </ThemedText>
              <TextInput
                style={[
                  styles.settingInput,
                  {
                    borderColor: Colors[colorScheme].border,
                    backgroundColor: Colors[colorScheme].background,
                    color: Colors[colorScheme].text,
                  },
                ]}
                value={apiUrl}
                onChangeText={setApiUrl}
                placeholder={t("appSettings.apiUrl.placeholder")}
                placeholderTextColor={Colors[colorScheme].textSecondary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              {hasChanges && (
                <View style={styles.apiUrlActions}>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: Colors[colorScheme].tint },
                    ]}
                    onPress={saveApiUrl}
                    disabled={loading}
                  >
                    <ThemedText style={styles.actionButtonText}>
                      {loading ? t("common.saving") : t("common.save")}
                    </ThemedText>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.actionButton,
                      { backgroundColor: Colors[colorScheme].textSecondary },
                    ]}
                    onPress={resetApiUrl}
                    disabled={loading}
                  >
                    <ThemedText style={styles.actionButtonText}>
                      {t("appSettings.apiUrl.reset")}
                    </ThemedText>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </View>

      {/* Language Settings Section */}
      <LanguageSettings style={styles.languageSection} />

      {/* Timezone Settings Section */}
      <TimezoneSettings style={styles.timezoneSection} />

      {/* Date Format Settings Section */}
      <DateFormatSettings style={styles.dateFormatSection} />

      {/* Unified Cache Settings */}
      <UnifiedCacheSettings />

      {/* Legal Documents */}
      <LegalDocumentsSettings />

      {/* Version Information */}
      <VersionInfo />

      {/* Terms Actions Section */}
      <View style={styles.retentionSection}>
        {/* Revoke Terms */}
        {renderActionSetting(
          t("appSettings.revokeTerms"),
          t("appSettings.revokeTermsDescription"),
          handleRevokeTerms,
          "document-text",
          true
        )}
      </View>

      <View style={styles.footer}>
        <ThemedText
          style={[
            styles.footerText,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("appSettings.autoSaveDescription")}
        </ThemedText>
      </View>
    </SettingsScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  
  languageSection: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 16,
  },
  timezoneSection: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 16,
  },
  dateFormatSection: {
    marginBottom: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(0,0,0,0.1)",
    paddingHorizontal: 16,
  },
  apiUrlSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  retentionSection: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderWidth: 1,
    borderRadius: 12,
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
  settingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    marginTop: 8,
    minWidth: 80,
  },
  apiUrlActions: {
    flexDirection: "row",
    gap: 8,
    marginTop: 8,
  },
  actionButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    minWidth: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  actionButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
    fontStyle: "italic",
  },
});
