import { settingsService } from "@/services/settings-service";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, Platform, Alert, NativeEventEmitter, NativeModules } from "react-native";
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
import iosBridgeService from "@/services/ios-bridge";

export function AppSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    settings: {
      hideHints,
      disableUserTracking,
    },
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
  const privacyPolicyDocument = LEGAL_DOCUMENTS.find(doc => doc.id === 'privacy-policy');
  
  // CloudKit sync state
  const [cloudKitSyncing, setCloudKitSyncing] = useState(false);
  const [cloudKitEnabled, setCloudKitEnabled] = useState(true);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  const [cloudKitLoading, setCloudKitLoading] = useState(false);
  const [cloudKitNotificationLimit, setCloudKitNotificationLimit] = useState<number | null>(null);
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitInput, setLimitInput] = useState('');
  
  // CloudKit sync progress state
  const [syncProgress, setSyncProgress] = useState<{
    step?: string;
    currentItem: number;
    totalItems: number;
    itemType: string;
    phase: string;
  } | null>(null);

  useEffect(() => {
    loadApiUrl();
    loadCloudKitStatus();
  }, []);

  // Listen to CloudKit sync progress events
  useEffect(() => {
    if (Platform.OS !== 'ios' || !NativeModules.CloudKitSyncBridge) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(NativeModules.CloudKitSyncBridge);

    const handleSyncProgress = (event: {
      step?: string;
      currentItem: number;
      totalItems: number;
      itemType: string;
      phase: string;
    }) => {
      setSyncProgress(event);
      
      // Clear progress when sync is completed
      if (event.phase === 'completed') {
        setTimeout(() => {
          setSyncProgress(null);
          loadCloudKitStatus();
        }, 2000);
      }
    };

    const subscription = eventEmitter.addListener('cloudKitSyncProgress', handleSyncProgress);

    return () => {
      subscription.remove();
    };
  }, []);

  const loadCloudKitStatus = async () => {
    if (Platform.OS !== 'ios') {
      return;
    }
    try {
      const [enabled, syncStatus, limitResult] = await Promise.all([
        iosBridgeService.isCloudKitEnabled(),
        iosBridgeService.isInitialSyncCompleted(),
        iosBridgeService.getCloudKitNotificationLimit(),
      ]);
      setCloudKitEnabled(enabled.enabled);
      setInitialSyncCompleted(syncStatus.completed);
      setCloudKitNotificationLimit(limitResult.limit);
    } catch (error) {
      console.error('Failed to load CloudKit status:', error);
    }
  };

  const getSyncProgressText = (progress: {
    step?: string;
    currentItem: number;
    totalItems: number;
    itemType: string;
    phase: string;
  }): string => {
    const stepKey = progress.step || 'unknown';
    const phase = progress.phase;
    
    if (phase === 'completed') {
      switch (stepKey) {
        case 'zone_creation':
          return t("appSettings.cloudKit.progress.zoneCreationCompleted");
        case 'schema_initialization':
          return t("appSettings.cloudKit.progress.schemaInitializationCompleted");
        case 'sync_notifications':
          return t("appSettings.cloudKit.progress.notificationsSyncCompleted");
        case 'sync_buckets':
          return t("appSettings.cloudKit.progress.bucketsSyncCompleted");
        default:
          return t("appSettings.cloudKit.progress.completed");
      }
    } else if (phase === 'starting') {
      switch (stepKey) {
        case 'zone_creation':
          return t("appSettings.cloudKit.progress.zoneCreationStarting");
        case 'schema_initialization':
          return t("appSettings.cloudKit.progress.schemaInitializationStarting");
        case 'sync_notifications':
          return t("appSettings.cloudKit.progress.notificationsSyncStarting");
        case 'sync_buckets':
          return t("appSettings.cloudKit.progress.bucketsSyncStarting");
        default:
          return t("appSettings.cloudKit.progress.starting");
      }
    } else {
      // syncing phase
      switch (stepKey) {
        case 'zone_creation':
          return t("appSettings.cloudKit.progress.zoneCreationSyncing");
        case 'schema_initialization':
          return t("appSettings.cloudKit.progress.schemaInitializationSyncing");
        case 'sync_notifications':
          return t("appSettings.cloudKit.progress.notificationsSyncSyncing");
        case 'sync_buckets':
          return t("appSettings.cloudKit.progress.bucketsSyncSyncing");
        default:
          return t("appSettings.cloudKit.progress.syncing");
      }
    }
  };

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

  const handleCloudKitSync = async () => {
    if (Platform.OS !== 'ios') {
      return;
    }
    
    setCloudKitSyncing(true);
    try {
      const result = await iosBridgeService.triggerCloudKitSync();
      if (result.success) {
        setDialogMessage(
          t("appSettings.cloudKit.syncSuccess", {
            notifications: result.notificationsSynced,
            buckets: result.bucketsSynced,
            updatedNotifications: result.notificationsUpdated,
            updatedBuckets: result.bucketsUpdated,
          })
        );
        setShowSuccessDialog(true);
        await loadCloudKitStatus();
      } else {
        setDialogMessage(t("appSettings.cloudKit.syncError"));
        setShowErrorDialog(true);
      }
    } catch (error) {
      console.error("Failed to sync CloudKit:", error);
      setDialogMessage(t("appSettings.cloudKit.syncError"));
      setShowErrorDialog(true);
    } finally {
      setCloudKitSyncing(false);
    }
  };

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
              <Switch
                value={!hideHints}
                onValueChange={handleToggleHints}
              />
            </View>
          </Card.Content>
        </Card>

        {/* CloudKit Sync Settings (iOS only) */}
        {Platform.OS === 'ios' && (
          <Card style={styles.apiUrlCard}>
            <Card.Content>
              <Text variant="headlineSmall" style={styles.sectionTitle}>
                {t("appSettings.cloudKit.title")}
              </Text>
              <Text
                variant="bodyMedium"
                style={[
                  styles.sectionDescription,
                  { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
                ]}
              >
                {t("appSettings.cloudKit.description")}
              </Text>

              {/* CloudKit Sync */}
              <View style={styles.hintsSettingRow}>
                <View style={styles.hintsSettingInfo}>
                  <Text variant="titleMedium" style={styles.hintsSettingTitle}>
                    {t("appSettings.cloudKit.enableTitle")}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.sectionDescription,
                        { 
                          color: cloudKitEnabled ? theme.colors.primary : theme.colors.error,
                          marginRight: 8,
                        },
                      ]}
                    >
                      {cloudKitEnabled 
                        ? t("appSettings.cloudKit.enabledStatus")
                        : t("appSettings.cloudKit.disabledStatus")}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={cloudKitEnabled}
                  onValueChange={async (value) => {
                    setCloudKitLoading(true);
                    try {
                      await iosBridgeService.setCloudKitEnabled(value);
                      setCloudKitEnabled(value);
                      setDialogMessage(
                        value
                          ? t("appSettings.cloudKit.enabledSuccess")
                          : t("appSettings.cloudKit.disabledSuccess")
                      );
                      setShowSuccessDialog(true);
                    } catch (error) {
                      console.error('Failed to toggle CloudKit:', error);
                      setDialogMessage(t("appSettings.cloudKit.toggleError"));
                      setShowErrorDialog(true);
                    } finally {
                      setCloudKitLoading(false);
                    }
                  }}
                  disabled={cloudKitLoading}
                />
              </View>

              {/* CloudKit Notification Limit */}
              {cloudKitEnabled && (
                <View style={styles.hintsSettingRow}>
                  <View style={styles.hintsSettingInfo}>
                    <Text variant="titleMedium" style={styles.hintsSettingTitle}>
                      {t("appSettings.cloudKit.notificationLimitTitle")}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={[
                        styles.sectionDescription,
                        { marginTop: 4 },
                      ]}
                    >
                      {cloudKitNotificationLimit !== null
                        ? t("appSettings.cloudKit.notificationLimitSet", { limit: cloudKitNotificationLimit })
                        : t("appSettings.cloudKit.notificationLimitUnlimited")}
                    </Text>
                  </View>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setLimitInput(cloudKitNotificationLimit?.toString() || '');
                      setShowLimitDialog(true);
                    }}
                    compact
                  >
                    {cloudKitNotificationLimit !== null ? String(cloudKitNotificationLimit) : t("appSettings.cloudKit.notificationLimitSetButton")}
                  </Button>
                </View>
              )}

              {/* Sync Progress / Status */}
              {cloudKitEnabled && (
                <View style={{ marginTop: 16, marginBottom: 8 }}>
                  {syncProgress ? (
                    <View>
                      <Text variant="bodySmall" style={{ color: theme.colors.primary, fontWeight: '600' }}>
                        {getSyncProgressText(syncProgress)}
                      </Text>
                      {syncProgress.totalItems > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <View style={{ 
                            height: 4, 
                            backgroundColor: theme.colors.surfaceVariant, 
                            borderRadius: 2,
                            overflow: 'hidden'
                          }}>
                            <View style={{ 
                              height: '100%', 
                              width: `${(syncProgress.currentItem / syncProgress.totalItems) * 100}%`,
                              backgroundColor: theme.colors.primary,
                              borderRadius: 2
                            }} />
                          </View>
                          <Text variant="bodySmall" style={{ 
                            color: theme.colors.onSurfaceVariant, 
                            marginTop: 4,
                            fontSize: 11
                          }}>
                            {syncProgress.currentItem} / {syncProgress.totalItems} {syncProgress.itemType}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }}>
                      {initialSyncCompleted
                        ? t("appSettings.cloudKit.initialSyncCompleted")
                        : t("appSettings.cloudKit.initialSyncPending")}
                    </Text>
                  )}
                </View>
              )}

              {/* Action Buttons */}
              {cloudKitEnabled && (
                <View style={{ marginTop: 16, gap: 8 }}>
                  {/* Sync Button - Commented out for now */}
                  {/* <Button
                    mode="contained"
                    icon="cloud-sync"
                    onPress={handleCloudKitSync}
                    disabled={cloudKitSyncing || cloudKitLoading}
                    loading={cloudKitSyncing}
                  >
                    {cloudKitSyncing
                      ? t("appSettings.cloudKit.syncing")
                      : t("appSettings.cloudKit.syncButton")}
                  </Button> */}

                  {/* Reset Sync Flag Button - Commented out for now */}
                  {/* <Button
                    mode="outlined"
                    icon="refresh"
                    onPress={async () => {
                      setCloudKitLoading(true);
                      try {
                        await iosBridgeService.resetInitialSyncFlag();
                        setInitialSyncCompleted(false);
                        setDialogMessage(t("appSettings.cloudKit.resetSyncFlagSuccess"));
                        setShowSuccessDialog(true);
                        // Trigger sync after resetting flag
                        await handleCloudKitSync();
                      } catch (error) {
                        console.error('Failed to reset sync flag:', error);
                        setDialogMessage(t("appSettings.cloudKit.resetSyncFlagError"));
                        setShowErrorDialog(true);
                      } finally {
                        setCloudKitLoading(false);
                      }
                    }}
                    disabled={cloudKitSyncing || cloudKitLoading}
                  >
                    {t("appSettings.cloudKit.resetSyncFlagButton")}
                  </Button> */}

                  {/* ReSync to CloudKit Button */}
                  <Button
                    mode="contained"
                    icon="cloud-upload"
                    onPress={async () => {
                      Alert.alert(
                        t("appSettings.cloudKit.resyncTitle"),
                        t("appSettings.cloudKit.resyncMessage"),
                        [
                          {
                            text: t("common.cancel"),
                            style: "cancel",
                          },
                          {
                            text: t("appSettings.cloudKit.resyncConfirm"),
                            style: "destructive",
                            onPress: async () => {
                              setCloudKitLoading(true);
                              setCloudKitSyncing(true);
                              try {
                                // Step 1: Reset zone (delete all data and re-initialize)
                                await iosBridgeService.resetCloudKitZone();
                                setInitialSyncCompleted(false);
                                
                                // Step 2: Wait a bit for zone reset to propagate
                                await new Promise(resolve => setTimeout(resolve, 2000));
                                
                                // Step 3: Sync all data from scratch
                                const result = await iosBridgeService.triggerCloudKitSync();
                                if (result.success) {
                                  setDialogMessage(
                                    t("appSettings.cloudKit.resyncSuccess", {
                                      notifications: result.notificationsSynced,
                                      buckets: result.bucketsSynced,
                                    })
                                  );
                                  setShowSuccessDialog(true);
                                  await loadCloudKitStatus();
                                } else {
                                  setDialogMessage(t("appSettings.cloudKit.resyncError"));
                                  setShowErrorDialog(true);
                                }
                              } catch (error) {
                                console.error('Failed to resync CloudKit:', error);
                                setDialogMessage(t("appSettings.cloudKit.resyncError"));
                                setShowErrorDialog(true);
                              } finally {
                                setCloudKitLoading(false);
                                setCloudKitSyncing(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={cloudKitSyncing || cloudKitLoading}
                    loading={cloudKitSyncing || cloudKitLoading}
                  >
                    {cloudKitSyncing || cloudKitLoading
                      ? t("appSettings.cloudKit.resyncing")
                      : t("appSettings.cloudKit.resyncButton")}
                  </Button>

                  {/* Delete Zone Button */}
                  <Button
                    mode="outlined"
                    icon="delete"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    onPress={() => {
                      Alert.alert(
                        t("appSettings.cloudKit.deleteZoneTitle"),
                        t("appSettings.cloudKit.deleteZoneMessage"),
                        [
                          {
                            text: t("common.cancel"),
                            style: "cancel",
                          },
                          {
                            text: t("appSettings.cloudKit.deleteZoneConfirm"),
                            style: "destructive",
                            onPress: async () => {
                              setCloudKitLoading(true);
                              try {
                                await iosBridgeService.deleteCloudKitZone();
                                setInitialSyncCompleted(false);
                                setDialogMessage(t("appSettings.cloudKit.deleteZoneSuccess"));
                                setShowSuccessDialog(true);
                                await loadCloudKitStatus();
                              } catch (error) {
                                console.error('Failed to delete CloudKit zone:', error);
                                setDialogMessage(t("appSettings.cloudKit.deleteZoneError"));
                                setShowErrorDialog(true);
                              } finally {
                                setCloudKitLoading(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={cloudKitSyncing || cloudKitLoading}
                  >
                    {t("appSettings.cloudKit.deleteZoneButton")}
                  </Button>

                  {/* Reset Zone Button - Commented out for now */}
                  {/* <Button
                    mode="outlined"
                    icon="restore"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    onPress={() => {
                      Alert.alert(
                        t("appSettings.cloudKit.resetZoneTitle"),
                        t("appSettings.cloudKit.resetZoneMessage"),
                        [
                          {
                            text: t("common.cancel"),
                            style: "cancel",
                          },
                          {
                            text: t("appSettings.cloudKit.resetZoneConfirm"),
                            style: "destructive",
                            onPress: async () => {
                              setCloudKitLoading(true);
                              try {
                                await iosBridgeService.resetCloudKitZone();
                                setInitialSyncCompleted(false);
                                setDialogMessage(t("appSettings.cloudKit.resetZoneSuccess"));
                                setShowSuccessDialog(true);
                                await loadCloudKitStatus();
                              } catch (error) {
                                console.error('Failed to reset CloudKit zone:', error);
                                setDialogMessage(t("appSettings.cloudKit.resetZoneError"));
                                setShowErrorDialog(true);
                              } finally {
                                setCloudKitLoading(false);
                              }
                            },
                          },
                        ]
                      );
                    }}
                    disabled={cloudKitSyncing || cloudKitLoading}
                  >
                    {t("appSettings.cloudKit.resetZoneButton")}
                  </Button> */}
                </View>
              )}
            </Card.Content>
          </Card>
        )}

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

      {/* Notification Limit Dialog */}
      <Portal>
        <Dialog
          visible={showLimitDialog}
          onDismiss={() => setShowLimitDialog(false)}
        >
          <Dialog.Title>{t("appSettings.cloudKit.notificationLimitTitle")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={{ marginBottom: 16 }}>
              {t("appSettings.cloudKit.notificationLimitDescription")}
            </Text>
            <TextInput
              label={t("appSettings.cloudKit.notificationLimitInputLabel")}
              value={limitInput}
              onChangeText={setLimitInput}
              keyboardType="numeric"
              mode="outlined"
            />
            <Text variant="bodySmall" style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}>
              {t("appSettings.cloudKit.notificationLimitHint")}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLimitDialog(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onPress={async () => {
                try {
                  const limit = limitInput.trim() === '' ? null : parseInt(limitInput.trim(), 10);
                  if (limit !== null && (isNaN(limit) || limit < 10 || limit > 10000)) {
                    setDialogMessage(t("appSettings.cloudKit.notificationLimitInvalid"));
                    setShowErrorDialog(true);
                    return;
                  }
                  
                  setCloudKitLoading(true);
                  await iosBridgeService.setCloudKitNotificationLimit(limit);
                  setCloudKitNotificationLimit(limit);
                  setShowLimitDialog(false);
                  setDialogMessage(
                    limit !== null
                      ? t("appSettings.cloudKit.notificationLimitSetSuccess", { limit })
                      : t("appSettings.cloudKit.notificationLimitRemovedSuccess")
                  );
                  setShowSuccessDialog(true);
                } catch (error) {
                  console.error('Failed to set CloudKit notification limit:', error);
                  setDialogMessage(t("appSettings.cloudKit.notificationLimitError"));
                  setShowErrorDialog(true);
                } finally {
                  setCloudKitLoading(false);
                }
              }}
            >
              {t("common.save")}
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
