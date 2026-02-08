import { settingsService } from "@/services/settings-service";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Platform } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { reinitializeApolloClient } from "../config/apollo-client";
import { LocalizationSettings } from "./LocalizationSettings";
import { LegalDocumentViewer } from "./LegalDocumentViewer";
import { LEGAL_DOCUMENTS } from "../services/legal-documents";
import ThemeSettings from "./ThemeSettings";
import UnifiedCacheSettings from "./UnifiedCacheSettings";
import { VersionInfo } from "./VersionInfo";
import { useSettings } from "@/hooks/useSettings";
import { ServerDiscoveryCard } from "./ServerDiscoveryCard";

export function AppSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    settings: { hideHints, disableUserTracking },
    updateSettings,
    setDisableUserTracking,
  } = useSettings();

  // API URL state
  const [apiUrl, setApiUrl] = useState("");
  const [originalApiUrl, setOriginalApiUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  // Privacy policy viewer state
  const [privacyPolicyVisible, setPrivacyPolicyVisible] = useState(false);
  const privacyPolicyDocument = LEGAL_DOCUMENTS.find(
    (doc) => doc.id === "privacy-policy",
  );

  useEffect(() => {
    loadApiUrl();
  }, []);


  const loadApiUrl = async () => {
    try {
      const customUrl = await settingsService.getCustomApiUrl();
      setApiUrl(customUrl);
      setOriginalApiUrl(customUrl);
    } catch (error) {
      console.error("Failed to load API URL:", error);
    }
  };

  const saveApiUrl = async () => {
    setLoading(true);
    try {
      await settingsService.saveApiEndpoint(apiUrl);
      setOriginalApiUrl(apiUrl);

      // Reinitialize Apollo Client with new URL
      await reinitializeApolloClient();

      // Show success dialog
      setDialogMessage(t("appSettings.apiUrl.successMessage"));
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Failed to save API URL:", error);
      setDialogMessage(t("appSettings.apiUrl.saveError"));
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const resetApiUrl = async () => {
    setLoading(true);
    try {
      // Reset to default API URL
      await settingsService.resetApiEndpoint();

      // Reload the value
      const defaultUrl = settingsService.getCustomApiUrl();
      setApiUrl(defaultUrl);
      setOriginalApiUrl(defaultUrl);

      // Reinitialize Apollo Client with default URL
      await reinitializeApolloClient();

      // Show success dialog
      setDialogMessage(t("appSettings.apiUrl.successMessage"));
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Failed to reset API URL:", error);
      setDialogMessage(t("appSettings.apiUrl.saveError"));
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const hasChanges = apiUrl !== originalApiUrl;

  const handleToggleHints = async (value: boolean) => {
    await updateSettings({ hideHints: !value });
  };

  const handleToggleUserTracking = async (value: boolean) => {
    await setDisableUserTracking(!value);
  };


  return (
    <>
      <PaperScrollView>
        {/* API URL Section */}
        <View style={styles.topPadding} />
        <Card style={styles.apiUrlCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.apiUrl.serverUrl")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionDescription,
                { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
              ]}
            >
              {t("appSettings.apiUrl.serverUrlDescription")}
            </Text>
            <TextInput
              mode="outlined"
              value={apiUrl}
              onChangeText={setApiUrl}
              placeholder={t("appSettings.apiUrl.placeholder")}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              style={{ marginBottom: 16 }}
            />
            {hasChanges && (
              <View style={styles.apiUrlActions}>
                <Button
                  mode="contained"
                  onPress={saveApiUrl}
                  disabled={loading}
                  loading={loading}
                  style={styles.actionButton}
                >
                  {loading ? t("common.saving") : t("common.save")}
                </Button>
                <Button
                  mode="outlined"
                  onPress={resetApiUrl}
                  disabled={loading}
                  style={styles.actionButton}
                >
                  {t("appSettings.apiUrl.reset")}
                </Button>
              </View>
            )}
          </Card.Content>
        </Card>

        <ServerDiscoveryCard
          currentServerUrl={apiUrl || settingsService.getApiUrl()}
          onSelectServer={(url) => setApiUrl(url)}
        />

        {/* Localization Settings Section */}
        <Surface style={styles.settingsSurface} elevation={1}>
          <LocalizationSettings />
        </Surface>

        {/* Theme Settings Section */}
        <Surface style={styles.settingsSurface} elevation={1}>
          <ThemeSettings />
        </Surface>

        {/* Unified Cache Settings */}
        <UnifiedCacheSettings />

        {/* Hints Settings */}
        <Card style={styles.apiUrlCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.hints.title")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionDescription,
                { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
              ]}
            >
              {t("appSettings.hints.description")}
            </Text>
            <View style={styles.hintsSettingRow}>
              <View style={styles.hintsSettingInfo}>
                <Text variant="titleMedium" style={styles.hintsSettingTitle}>
                  {t("appSettings.hints.showHintsTitle")}
                </Text>
              </View>
              <Switch value={!hideHints} onValueChange={handleToggleHints} />
            </View>
          </Card.Content>
        </Card>

        {/* Privacy Settings */}
        <Card style={styles.apiUrlCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.privacy.title")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionDescription,
                { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
              ]}
            >
              {t("appSettings.privacy.description")}
            </Text>
            <View style={styles.hintsSettingRow}>
              <View style={styles.hintsSettingInfo}>
                <Text variant="titleMedium" style={styles.hintsSettingTitle}>
                  {t("appSettings.privacy.enableTrackingTitle")}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.sectionDescription,
                    { color: theme.colors.onSurfaceVariant, marginTop: 4 },
                  ]}
                >
                  {t("appSettings.privacy.enableTrackingDescription")}
                </Text>
              </View>
              <Switch
                value={!disableUserTracking}
                onValueChange={handleToggleUserTracking}
              />
            </View>
            {privacyPolicyDocument && (
              <Button
                mode="outlined"
                icon="shield-check"
                onPress={() => setPrivacyPolicyVisible(true)}
                style={{ marginTop: 16 }}
              >
                {t("appSettings.privacy.viewPrivacyPolicy")}
              </Button>
            )}
          </Card.Content>
        </Card>

        {privacyPolicyDocument && (
          <LegalDocumentViewer
            document={privacyPolicyDocument}
            visible={privacyPolicyVisible}
            onClose={() => setPrivacyPolicyVisible(false)}
          />
        )}

        {/* Version Information */}
        <Surface style={styles.settingsSurface} elevation={1}>
          <VersionInfo />
        </Surface>

        <View style={styles.footer}>
          <Text
            variant="bodySmall"
            style={[
              styles.footerText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.autoSaveDescription")}
          </Text>
        </View>
      </PaperScrollView>

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
        >
          <Dialog.Title>{t("appSettings.apiUrl.success")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowSuccessDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{dialogMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topPadding: {
    height: 16,
  },
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
  apiUrlCard: {
    marginBottom: 20,
  },
  settingsSurface: {
    marginBottom: 20,
    borderRadius: 12,
  },
  apiUrlActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    flex: 1,
  },
  footer: {
    padding: 24,
    alignItems: "center",
  },
  footerText: {
    textAlign: "center",
    lineHeight: 18,
    fontStyle: "italic",
  },
  hintsSettingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  hintsSettingInfo: {
    flex: 1,
    marginRight: 16,
  },
  hintsSettingTitle: {
    fontWeight: "500",
  },
});

