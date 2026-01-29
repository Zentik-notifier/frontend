import { settingsService } from "@/services/settings-service";
import PaperScrollView from "@/components/ui/PaperScrollView";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  View,
  Platform,
  Alert,
  NativeEventEmitter,
  NativeModules,
} from "react-native";
import type { CloudKitSyncProgressEvent, CloudKitSyncStep, CloudKitSyncPhase } from "@/types/cloudkit-sync-events";
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
import { authService } from "@/services/auth-service";
import { apolloClient } from "@/config/apollo-client";
import { GetUserAccessTokensDocument } from "@/generated/gql-operations-generated";

export function AppSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    settings: { hideHints, disableUserTracking, cloudKitDebug },
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

  // CloudKit sync state
  const [cloudKitSyncing, setCloudKitSyncing] = useState(false);
  const [cloudKitEnabled, setCloudKitEnabled] = useState(true);
  const [initialSyncCompleted, setInitialSyncCompleted] = useState(false);
  const [cloudKitLoading, setCloudKitLoading] = useState(false);
  const [cloudKitNotificationLimit, setCloudKitNotificationLimit] = useState<
    number | null
  >(null);
  const [cloudKitDebugEnabled, setCloudKitDebugEnabled] = useState<boolean>(
    cloudKitDebug ?? false,
  );
  const [showLimitDialog, setShowLimitDialog] = useState(false);
  const [limitInput, setLimitInput] = useState("");

  // CloudKit sync progress state
  const [syncProgress, setSyncProgress] = useState<{
    step?: string;
    currentItem: number;
    totalItems: number;
    itemType: string;
    phase: string;
  } | null>(null);

  // Watch Token state
  const [watchToken, setWatchToken] = useState<{
    id: string;
    name: string;
    token?: string;
  } | null>(null);
  const [watchTokenLoading, setWatchTokenLoading] = useState(false);
  const [showWatchTokenModal, setShowWatchTokenModal] = useState(false);

  const hasWatchToken = !!watchToken?.id;

  useEffect(() => {
    loadApiUrl();
    if (Platform.OS === "ios") {
      loadCloudKitStatus();
      loadWatchToken();
    }
  }, []);

  // Listen to CloudKit sync progress events
  useEffect(() => {
    if (Platform.OS !== "ios" || !NativeModules.CloudKitSyncBridge) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(
      NativeModules.CloudKitSyncBridge,
    );

    const handleSyncProgress = (event: CloudKitSyncProgressEvent) => {
      setSyncProgress(event);

      // Clear progress when full sync is completed or failed
      if (event.step === 'full_sync' && (event.phase === 'completed' || event.phase === 'failed')) {
        setTimeout(() => {
          setSyncProgress(null);
          loadCloudKitStatus();
        }, 2000);
      }
    };

    const subscription = eventEmitter.addListener(
      "cloudKitSyncProgress",
      handleSyncProgress,
    );

    return () => {
      subscription.remove();
    };
  }, []);

  const loadCloudKitStatus = async () => {
    if (Platform.OS !== "ios") {
      return;
    }
    try {
      const [enabled, syncStatus, limitResult, debugResult] = await Promise.all(
        [
          iosBridgeService.isCloudKitEnabled(),
          iosBridgeService.isInitialSyncCompleted(),
          iosBridgeService.getCloudKitNotificationLimit(),
          iosBridgeService.isCloudKitDebugEnabled(),
        ],
      );
      setCloudKitEnabled(enabled.enabled);
      setInitialSyncCompleted(syncStatus.completed);
      setCloudKitNotificationLimit(limitResult.limit);
      setCloudKitDebugEnabled(debugResult.enabled);
    } catch (error) {
      console.error("Failed to load CloudKit status:", error);
    }
  };

  const getSyncProgressText = (progress: {
    step?: CloudKitSyncStep | string; // Allow legacy steps like "zone_creation", "schema_initialization"
    currentItem: number;
    totalItems: number;
    itemType: string;
    phase: CloudKitSyncPhase | string; // Allow legacy phases
  }): string => {
    const stepKey = progress.step || "unknown";
    const phase = progress.phase;

    if (phase === "completed") {
      switch (stepKey) {
        case "zone_creation":
          return t("appSettings.cloudKit.progress.zoneCreationCompleted");
        case "schema_initialization":
          return t(
            "appSettings.cloudKit.progress.schemaInitializationCompleted",
          );
        case "sync_notifications":
          return t("appSettings.cloudKit.progress.notificationsSyncCompleted");
        case "sync_buckets":
          return t("appSettings.cloudKit.progress.bucketsSyncCompleted");
        default:
          return t("appSettings.cloudKit.progress.completed");
      }
    } else if (phase === "starting") {
      switch (stepKey) {
        case "zone_creation":
          return t("appSettings.cloudKit.progress.zoneCreationStarting");
        case "schema_initialization":
          return t(
            "appSettings.cloudKit.progress.schemaInitializationStarting",
          );
        case "sync_notifications":
          return t("appSettings.cloudKit.progress.notificationsSyncStarting");
        case "sync_buckets":
          return t("appSettings.cloudKit.progress.bucketsSyncStarting");
        default:
          return t("appSettings.cloudKit.progress.starting");
      }
    } else {
      // syncing phase
      switch (stepKey) {
        case "zone_creation":
          return t("appSettings.cloudKit.progress.zoneCreationSyncing");
        case "schema_initialization":
          return t("appSettings.cloudKit.progress.schemaInitializationSyncing");
        case "sync_notifications":
          return t("appSettings.cloudKit.progress.notificationsSyncSyncing");
        case "sync_buckets":
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
    if (Platform.OS !== "ios") {
      return;
    }

    setCloudKitSyncing(true);
    try {
      const result = await iosBridgeService.triggerCloudKitSync();
      console.log(result);
      if (result.success) {
        setDialogMessage(
          t("appSettings.cloudKit.syncSuccess", {
            notifications: result.notificationsSynced,
            buckets: result.bucketsSynced,
            updatedNotifications: result.notificationsUpdated,
            updatedBuckets: result.bucketsUpdated,
          }),
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
    await loadWatchToken();
  };

  const updateWatchData = async () => {
    if (Platform.OS !== "ios") return;

    setWatchTokenLoading(true);
    try {
      const token = await authService.ensureValidToken(true);
      if (!token) {
        setDialogMessage(t("appSettings.watchToken.sendError"));
        setShowErrorDialog(true);
        return;
      }

      const apiBase = settingsService.getApiBaseWithPrefix();

      // Try to fetch an existing token first.
      // If the backend does not return the token value on GET, fallback to create/regenerate.
      let tokenToSend: string | undefined;
      try {
        const getRes = await fetch(`${apiBase}/access-tokens/watch`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });

        if (getRes.ok) {
          const data = await getRes.json();
          setWatchToken(data);
          tokenToSend = data?.token;
        }
      } catch {
        // ignore and fallback to POST
      }

      if (!tokenToSend) {
        const postRes = await fetch(`${apiBase}/access-tokens/watch`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        if (!postRes.ok) {
          throw new Error(
            `Failed to create/regenerate Watch token: ${postRes.statusText}`,
          );
        }
        const data = await postRes.json();
        setWatchToken(data);
        tokenToSend = data?.token;
      }

      if (!tokenToSend) {
        throw new Error("No token value available to send to Watch");
      }

      const serverAddress = settingsService.getApiUrl();
      await iosBridgeService.sendWatchTokenSettings(tokenToSend, serverAddress);
      setDialogMessage(t("appSettings.watchToken.sendSuccess"));
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Failed to update Watch data:", error);
      if (
        error.message?.includes("not reachable") ||
        error.message?.includes("not activated")
      ) {
        setDialogMessage(t("appSettings.watchToken.sendErrorWatchNotOpen"));
      } else {
        setDialogMessage(t("appSettings.watchToken.sendError"));
      }
      setShowErrorDialog(true);
    } finally {
      setWatchTokenLoading(false);
    }
  };

  const loadWatchToken = async () => {
    if (Platform.OS !== "ios") return;

    try {
      const authData = settingsService.getAuthData();
      if (!authData?.accessToken) return;

      // Fetch via GraphQL and identify Watch token by scopes or by name.
      // This avoids relying on the /access-tokens/watch GET endpoint for existence checks.
      if (!apolloClient) {
        return;
      }

      const result = await apolloClient.query({
        query: GetUserAccessTokensDocument,
        fetchPolicy: "network-only",
      });

      const tokens = result.data?.getUserAccessTokens ?? [];
      const watch =
        tokens.find((t: any) => t?.scopes?.includes?.("watch")) ??
        tokens.find(
          (t: any) =>
            typeof t?.name === "string" &&
            t.name.trim().toLowerCase() === "watch token",
        );

      if (watch) {
        setWatchToken({
          id: watch.id,
          name: watch.name,
          token: watch.token ?? undefined,
        });
      } else {
        setWatchToken(null);
      }
    } catch (error) {
      console.error("Failed to load Watch token:", error);
    }
  };

  const createOrRegenerateWatchToken = async () => {
    if (Platform.OS !== "ios") return;

    setWatchTokenLoading(true);
    try {
      const token = await authService.ensureValidToken(true);
      if (!token) {
        throw new Error("No authentication token");
      }

      const apiUrl = settingsService.getApiBaseWithPrefix();
      const response = await fetch(`${apiUrl}/access-tokens/watch`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to create token: ${response.statusText}`);
      }

      const data = await response.json();
      setWatchToken(data);
      setDialogMessage(t("appSettings.watchToken.generateSuccess"));
      setShowSuccessDialog(true);

      // Automatically send settings to Watch after generating token
      await sendWatchTokenSettings(data.token);
    } catch (error: any) {
      console.error("Failed to create/regenerate Watch token:", error);
      setDialogMessage(t("appSettings.watchToken.generateError"));
      setShowErrorDialog(true);
    } finally {
      setWatchTokenLoading(false);
    }
  };

  const deleteWatchToken = async () => {
    if (Platform.OS !== "ios") return;

    setWatchTokenLoading(true);
    try {
      const token = await authService.ensureValidToken(true);
      if (!token) {
        throw new Error("No authentication token");
      }

      const apiUrl = settingsService.getApiBaseWithPrefix();
      const response = await fetch(`${apiUrl}/access-tokens/watch`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to delete token: ${response.statusText}`);
      }

      setWatchToken(null);
      setDialogMessage(t("appSettings.watchToken.deleteSuccess"));
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Failed to delete Watch token:", error);
      setDialogMessage(t("appSettings.watchToken.deleteError"));
      setShowErrorDialog(true);
    } finally {
      setWatchTokenLoading(false);
    }
  };

  const sendWatchTokenSettings = async (tokenValue?: string) => {
    if (Platform.OS !== "ios") return;

    const tokenToSend = tokenValue || watchToken?.token;
    if (!tokenToSend) {
      setDialogMessage(t("appSettings.watchToken.sendError"));
      setShowErrorDialog(true);
      return;
    }

    setWatchTokenLoading(true);
    try {
      const serverAddress = settingsService.getApiUrl();
      await iosBridgeService.sendWatchTokenSettings(tokenToSend, serverAddress);
      setDialogMessage(t("appSettings.watchToken.sendSuccess"));
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Failed to send Watch token settings:", error);
      if (
        error.message?.includes("not reachable") ||
        error.message?.includes("not activated")
      ) {
        setDialogMessage(t("appSettings.watchToken.sendErrorWatchNotOpen"));
      } else {
        setDialogMessage(t("appSettings.watchToken.sendError"));
      }
      setShowErrorDialog(true);
    } finally {
      setWatchTokenLoading(false);
    }
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
              <Switch value={!hideHints} onValueChange={handleToggleHints} />
            </View>
          </Card.Content>
        </Card>

        {Platform.OS === "ios" && (
          <>
            {/* iCloud (CloudKit) */}
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

                {/* CloudKit Enabled */}
                <View style={styles.hintsSettingRow}>
                  <View style={styles.hintsSettingInfo}>
                    <Text
                      variant="titleMedium"
                      style={styles.hintsSettingTitle}
                    >
                      {t("appSettings.cloudKit.enableTitle")}
                    </Text>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginTop: 4,
                      }}
                    >
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.sectionDescription,
                          {
                            color: cloudKitEnabled
                              ? theme.colors.primary
                              : theme.colors.error,
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
                            : t("appSettings.cloudKit.disabledSuccess"),
                        );
                        setShowSuccessDialog(true);
                      } catch (error) {
                        console.error("Failed to toggle CloudKit:", error);
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
                      <Text
                        variant="titleMedium"
                        style={styles.hintsSettingTitle}
                      >
                        {t("appSettings.cloudKit.notificationLimitTitle")}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={[styles.sectionDescription, { marginTop: 4 }]}
                      >
                        {cloudKitNotificationLimit !== null
                          ? t("appSettings.cloudKit.notificationLimitSet", {
                              limit: cloudKitNotificationLimit,
                            })
                          : t(
                              "appSettings.cloudKit.notificationLimitUnlimited",
                            )}
                      </Text>
                    </View>
                    <Button
                      mode="outlined"
                      onPress={() => {
                        setLimitInput(
                          cloudKitNotificationLimit?.toString() || "",
                        );
                        setShowLimitDialog(true);
                      }}
                      compact
                    >
                      {cloudKitNotificationLimit !== null
                        ? String(cloudKitNotificationLimit)
                        : t("appSettings.cloudKit.notificationLimitSetButton")}
                    </Button>
                  </View>
                )}

                {/* CloudKit Debug Logs */}
                {cloudKitEnabled && (
                  <View style={styles.hintsSettingRow}>
                    <View style={styles.hintsSettingInfo}>
                      <Text
                        variant="titleMedium"
                        style={styles.hintsSettingTitle}
                      >
                        {t("appSettings.cloudKit.debugLogsTitle")}
                      </Text>
                      <Text
                        variant="bodySmall"
                        style={[styles.sectionDescription, { marginTop: 4 }]}
                      >
                        {t("appSettings.cloudKit.debugLogsDescription")}
                      </Text>
                    </View>
                    <Switch
                      value={cloudKitDebugEnabled}
                      onValueChange={async (value) => {
                        setCloudKitLoading(true);
                        try {
                          await iosBridgeService.setCloudKitDebugEnabled(value);
                          setCloudKitDebugEnabled(value);
                          await updateSettings({ cloudKitDebug: value });
                        } catch (error) {
                          console.error(
                            "Failed to toggle CloudKit debug logs:",
                            error,
                          );
                          setDialogMessage(
                            t("appSettings.cloudKit.toggleError"),
                          );
                          setShowErrorDialog(true);
                        } finally {
                          setCloudKitLoading(false);
                        }
                      }}
                      disabled={cloudKitLoading}
                    />
                  </View>
                )}

                {/* Sync Progress */}
                {cloudKitEnabled && syncProgress && (
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
                    <View>
                      <Text
                        variant="bodySmall"
                        style={{
                          color: theme.colors.primary,
                          fontWeight: "600",
                        }}
                      >
                        {getSyncProgressText(syncProgress)}
                      </Text>
                      {syncProgress.totalItems > 0 && (
                        <View style={{ marginTop: 8 }}>
                          <View
                            style={{
                              height: 4,
                              backgroundColor: theme.colors.surfaceVariant,
                              borderRadius: 2,
                              overflow: "hidden",
                            }}
                          >
                            <View
                              style={{
                                height: "100%",
                                width: `${(syncProgress.currentItem / syncProgress.totalItems) * 100}%`,
                                backgroundColor: theme.colors.primary,
                                borderRadius: 2,
                              }}
                            />
                          </View>
                          <Text
                            variant="bodySmall"
                            style={{
                              color: theme.colors.onSurfaceVariant,
                              marginTop: 4,
                              fontSize: 11,
                            }}
                          >
                            {syncProgress.currentItem} /{" "}
                            {syncProgress.totalItems} {syncProgress.itemType}
                          </Text>
                        </View>
                      )}
                    </View>
                  </View>
                )}

                {/* Actions */}
                {cloudKitEnabled && (
                  <View style={{ marginTop: 16, gap: 8 }}>
                    <Button
                      mode="contained"
                      icon="cloud-upload"
                      onPress={async () => {
                        Alert.alert(
                          t("appSettings.cloudKit.resyncTitle"),
                          t("appSettings.cloudKit.resyncMessage"),
                          [
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("appSettings.cloudKit.resyncConfirm"),
                              style: "destructive",
                              onPress: async () => {
                                setCloudKitLoading(true);
                                setCloudKitSyncing(true);
                                try {
                                  setInitialSyncCompleted(false);
                                  const result =
                                    await iosBridgeService.triggerFullSyncWithVerification();
                                  if (result.success) {
                                    setDialogMessage(
                                      t("appSettings.cloudKit.resyncSuccess", {
                                        notifications: result.cloudKitNotifications,
                                        buckets: result.cloudKitBuckets,
                                      }),
                                    );
                                    setShowSuccessDialog(true);
                                    await loadCloudKitStatus();
                                  } else {
                                    setDialogMessage(
                                      t("appSettings.cloudKit.resyncError"),
                                    );
                                    setShowErrorDialog(true);
                                  }
                                } catch (error) {
                                  console.error(
                                    "Failed to resync CloudKit:",
                                    error,
                                  );
                                  setDialogMessage(
                                    t("appSettings.cloudKit.resyncError"),
                                  );
                                  setShowErrorDialog(true);
                                } finally {
                                  setCloudKitLoading(false);
                                  setCloudKitSyncing(false);
                                }
                              },
                            },
                          ],
                        );
                      }}
                      disabled={cloudKitSyncing || cloudKitLoading}
                      loading={cloudKitSyncing || cloudKitLoading}
                    >
                      {cloudKitSyncing || cloudKitLoading
                        ? t("appSettings.cloudKit.resyncing")
                        : t("appSettings.cloudKit.resyncButton")}
                    </Button>

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
                            { text: t("common.cancel"), style: "cancel" },
                            {
                              text: t("appSettings.cloudKit.deleteZoneConfirm"),
                              style: "destructive",
                              onPress: async () => {
                                setCloudKitLoading(true);
                                try {
                                  await iosBridgeService.deleteCloudKitZone();
                                  setInitialSyncCompleted(false);
                                  setDialogMessage(
                                    t("appSettings.cloudKit.deleteZoneSuccess"),
                                  );
                                  setShowSuccessDialog(true);
                                  await loadCloudKitStatus();
                                } catch (error) {
                                  console.error(
                                    "Failed to delete CloudKit zone:",
                                    error,
                                  );
                                  setDialogMessage(
                                    t("appSettings.cloudKit.deleteZoneError"),
                                  );
                                  setShowErrorDialog(true);
                                } finally {
                                  setCloudKitLoading(false);
                                }
                              },
                            },
                          ],
                        );
                      }}
                      disabled={cloudKitSyncing || cloudKitLoading}
                    >
                      {t("appSettings.cloudKit.deleteZoneButton")}
                    </Button>
                  </View>
                )}
              </Card.Content>
            </Card>

            {/* Watch */}
            <Card style={styles.apiUrlCard}>
              <Card.Content>
                <Text variant="headlineSmall" style={styles.sectionTitle}>
                  {t("appSettings.watch.title")}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={[
                    styles.sectionDescription,
                    { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
                  ]}
                >
                  {t("appSettings.watch.description")}
                </Text>

                <Text
                  variant="titleMedium"
                  style={[styles.hintsSettingTitle, { marginBottom: 6 }]}
                >
                  {t("appSettings.watchToken.title")}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.sectionDescription,
                    { color: theme.colors.onSurfaceVariant, marginBottom: 16 },
                  ]}
                >
                  {t("appSettings.watchToken.description")}
                </Text>

                <View style={{ marginTop: 8, gap: 8 }}>
                  <Button
                    mode="contained"
                    icon="send"
                    onPress={updateWatchData}
                    disabled={watchTokenLoading}
                    loading={watchTokenLoading}
                  >
                    {watchTokenLoading
                      ? t("appSettings.watchToken.sending")
                      : t("appSettings.watchToken.sendSettingsButton")}
                  </Button>

                  <Button
                    mode="outlined"
                    icon="refresh"
                    onPress={() => {
                      Alert.alert(
                        t("appSettings.watchToken.regenerateConfirmTitle"),
                        t("appSettings.watchToken.regenerateConfirmMessage"),
                        [
                          { text: t("common.cancel"), style: "cancel" },
                          {
                            text: t("appSettings.watchToken.regenerateButton"),
                            style: "destructive",
                            onPress: createOrRegenerateWatchToken,
                          },
                        ],
                      );
                    }}
                    disabled={watchTokenLoading}
                    loading={watchTokenLoading}
                  >
                    {watchTokenLoading
                      ? t("appSettings.watchToken.generating")
                      : t("appSettings.watchToken.regenerateButton")}
                  </Button>

                  <Button
                    mode="outlined"
                    icon="delete"
                    buttonColor={theme.colors.error}
                    textColor={theme.colors.onError}
                    onPress={() => {
                      if (!hasWatchToken) {
                        return;
                      }
                      Alert.alert(
                        t("appSettings.watchToken.deleteConfirmTitle"),
                        t("appSettings.watchToken.deleteConfirmMessage"),
                        [
                          { text: t("common.cancel"), style: "cancel" },
                          {
                            text: t("appSettings.watchToken.deleteButton"),
                            style: "destructive",
                            onPress: deleteWatchToken,
                          },
                        ],
                      );
                    }}
                    disabled={watchTokenLoading || !hasWatchToken}
                  >
                    {t("appSettings.watchToken.deleteButton")}
                  </Button>
                </View>

                <Text
                  variant="bodySmall"
                  style={[
                    styles.sectionDescription,
                    { color: theme.colors.onSurfaceVariant, marginTop: 16 },
                  ]}
                >
                  {t("appSettings.watchToken.watchAppRequired")}
                </Text>
              </Card.Content>
            </Card>
          </>
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
          <Dialog.Title>
            {t("appSettings.cloudKit.notificationLimitTitle")}
          </Dialog.Title>
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
            <Text
              variant="bodySmall"
              style={{ marginTop: 8, color: theme.colors.onSurfaceVariant }}
            >
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
                  const limit =
                    limitInput.trim() === ""
                      ? null
                      : parseInt(limitInput.trim(), 10);
                  if (
                    limit !== null &&
                    (isNaN(limit) || limit < 10 || limit > 10000)
                  ) {
                    setDialogMessage(
                      t("appSettings.cloudKit.notificationLimitInvalid"),
                    );
                    setShowErrorDialog(true);
                    return;
                  }

                  setCloudKitLoading(true);
                  await iosBridgeService.setCloudKitNotificationLimit(limit);
                  setCloudKitNotificationLimit(limit);
                  setShowLimitDialog(false);
                  setDialogMessage(
                    limit !== null
                      ? t("appSettings.cloudKit.notificationLimitSetSuccess", {
                          limit,
                        })
                      : t(
                          "appSettings.cloudKit.notificationLimitRemovedSuccess",
                        ),
                  );
                  setShowSuccessDialog(true);
                } catch (error) {
                  console.error(
                    "Failed to set CloudKit notification limit:",
                    error,
                  );
                  setDialogMessage(
                    t("appSettings.cloudKit.notificationLimitError"),
                  );
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
