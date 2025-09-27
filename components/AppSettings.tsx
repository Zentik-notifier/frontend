import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  List,
  Portal,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { reinitializeApolloClient } from "../config/apollo-client";
import { ApiConfigService } from "../services/api-config";
import { clearTermsAcceptance } from "../services/auth-storage";
import { LegalDocumentsSettings } from "./LegalDocumentsSettings";
import { LocalizationSettings } from "./LocalizationSettings";
import UnifiedCacheSettings from "./UnifiedCacheSettings";
import { VersionInfo } from "./VersionInfo";

export function AppSettings() {
  const theme = useTheme();
  const { t } = useI18n();

  // API URL state
  const [apiUrl, setApiUrl] = useState("");
  const [originalApiUrl, setOriginalApiUrl] = useState("");
  const [loading, setLoading] = useState(false);

  // Dialog states
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showRevokeDialog, setShowRevokeDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

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

  const resetApiUrl = () => {
    setApiUrl(originalApiUrl);
  };

  const hasChanges = apiUrl !== originalApiUrl;

  const handleRevokeTerms = () => {
    setShowRevokeDialog(true);
  };

  const confirmRevokeTerms = async () => {
    setShowRevokeDialog(false);
    try {
      setLoading(true);
      await clearTermsAcceptance();
      setDialogMessage(t("appSettings.revokeTermsSuccess"));
      setShowSuccessDialog(true);
    } catch (error) {
      console.error("Failed to revoke terms:", error);
      setDialogMessage("Failed to revoke terms acceptance");
      setShowErrorDialog(true);
    } finally {
      setLoading(false);
    }
  };

  const renderActionSetting = (
    title: string,
    description: string,
    onPress: () => void,
    icon?: string,
    destructive?: boolean
  ) => (
    <List.Item
      title={title}
      description={description}
      left={(props) => 
        icon ? (
          <List.Icon 
            {...props} 
            icon={icon} 
            color={destructive ? theme.colors.error : theme.colors.primary}
          />
        ) : undefined
      }
      right={(props) => (
        <List.Icon {...props} icon="chevron-right" />
      )}
      onPress={onPress}
      titleStyle={{
        color: destructive ? theme.colors.error : theme.colors.onSurface,
      }}
      descriptionStyle={{
        color: theme.colors.onSurfaceVariant,
      }}
      style={{
        backgroundColor: theme.colors.surface,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
      }}
    />
  );

  const handleRefresh = async () => {
    // This screen mostly manages local settings; noop refresh hook
  };

  return (
    <>
      <PaperScrollView onRefresh={handleRefresh}>
        {/* API URL Section */}
        <View style={styles.topPadding} />
        <Card style={styles.apiUrlCard}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.apiUrl.serverUrl")}
            </Text>
            <Text variant="bodyMedium" style={[styles.sectionDescription, { color: theme.colors.onSurfaceVariant, marginBottom: 16 }]}>
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

        {/* Localization Settings Section */}
        <Surface style={styles.settingsSurface} elevation={1}>
          <LocalizationSettings />
        </Surface>

        {/* Unified Cache Settings */}
        <UnifiedCacheSettings />

        {/* Legal Documents */}
        <Surface style={styles.settingsSurface} elevation={1}>
          <LegalDocumentsSettings />
        </Surface>

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
        <Dialog visible={showSuccessDialog} onDismiss={() => setShowSuccessDialog(false)}>
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
        <Dialog visible={showErrorDialog} onDismiss={() => setShowErrorDialog(false)}>
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

      {/* Revoke Terms Dialog */}
      <Portal>
        <Dialog visible={showRevokeDialog} onDismiss={() => setShowRevokeDialog(false)}>
          <Dialog.Title>{t("appSettings.revokeTerms")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{t("appSettings.revokeTermsConfirm")}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowRevokeDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button 
              mode="contained" 
              buttonColor={theme.colors.error}
              onPress={confirmRevokeTerms}
            >
              {t("appSettings.revokeTerms")}
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
    marginHorizontal: 16,
    marginBottom: 20,
  },
  settingsSurface: {
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 12,
  },
  retentionSection: {
    marginBottom: 20,
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
});
