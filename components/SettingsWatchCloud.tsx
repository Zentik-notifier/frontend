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
import {
  Button,
  Card,
  Dialog,
  Portal,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useSettings } from "@/hooks/useSettings";
import iosBridgeService from "@/services/ios-bridge";
import { authService } from "@/services/auth-service";
import { apolloClient } from "@/config/apollo-client";
import { GetUserAccessTokensDocument } from "@/generated/gql-operations-generated";

export function SettingsWatchCloud() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    settings: { cloudKitDebug },
    updateSettings,
  } = useSettings();

  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

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

  const [syncProgress, setSyncProgress] = useState<{
    step?: string;
    currentItem: number;
    totalItems: number;
    itemType: string;
    phase: string;
  } | null>(null);

  const [watchToken, setWatchToken] = useState<{
    id: string;
    name: string;
    token?: string;
  } | null>(null);
  const [watchTokenLoading, setWatchTokenLoading] = useState(false);
  const [isWatchSupported, setIsWatchSupported] = useState<boolean | null>(null);

  const hasWatchToken = !!watchToken?.id;

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    iosBridgeService.isWatchSupported().then((r) => setIsWatchSupported(r.supported));
  }, []);

  useEffect(() => {
    if (Platform.OS === "ios" && isWatchSupported === true) {
      loadCloudKitStatus();
      loadWatchToken();
    }
  }, [isWatchSupported]);

  // Sync progress no longer available (CKSyncEngine runs natively without RN bridge)

  const loadCloudKitStatus = async () => {
    if (Platform.OS !== "ios") return;
    try {
      const [enabled, syncStatus, limitResult, debugResult] = await Promise.all([
        iosBridgeService.isCloudKitEnabled(),
        iosBridgeService.isInitialSyncCompleted(),
        iosBridgeService.getCloudKitNotificationLimit(),
        iosBridgeService.isCloudKitDebugEnabled(),
      ]);
      setCloudKitEnabled(enabled.enabled);
      setInitialSyncCompleted(syncStatus.completed);
      setCloudKitNotificationLimit(limitResult.limit);
      setCloudKitDebugEnabled(debugResult.enabled);
    } catch (error) {
      console.error("Failed to load CloudKit status:", error);
    }
  };

  const getSyncProgressText = (progress: {
    step?: string;
    currentItem: number;
    totalItems: number;
    itemType: string;
    phase: string;
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
      switch (stepKey) {
        case "zone_creation":
          return t("appSettings.cloudKit.progress.zoneCreationSyncing");
        case "schema_initialization":
          return t(
            "appSettings.cloudKit.progress.schemaInitializationSyncing",
          );
        case "sync_notifications":
          return t("appSettings.cloudKit.progress.notificationsSyncSyncing");
        case "sync_buckets":
          return t("appSettings.cloudKit.progress.bucketsSyncSyncing");
        default:
          return t("appSettings.cloudKit.progress.syncing");
      }
    }
  };

  const handleCloudKitSync = async () => {
    if (Platform.OS !== "ios") return;
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

  const loadWatchToken = async () => {
    if (Platform.OS !== "ios") return;
    try {
      const authData = settingsService.getAuthData();
      if (!authData?.accessToken) return;
      if (!apolloClient) return;
      const result = await apolloClient.query({
        query: GetUserAccessTokensDocument,
        fetchPolicy: "network-only",
      });
      const tokens = result.data?.getUserAccessTokens ?? [];
      const watch =
        tokens.find((tkn: any) => tkn?.scopes?.includes?.("watch")) ??
        tokens.find(
          (tkn: any) =>
            typeof tkn?.name === "string" &&
            tkn.name.trim().toLowerCase() === "watch token",
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
        // ignore
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

  const createOrRegenerateWatchToken = async () => {
    if (Platform.OS !== "ios") return;
    setWatchTokenLoading(true);
    try {
      const token = await authService.ensureValidToken(true);
      if (!token) throw new Error("No authentication token");
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
      if (!token) throw new Error("No authentication token");
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

  const handleRefresh = async () => {
    if (Platform.OS === "ios") {
      await loadCloudKitStatus();
      await loadWatchToken();
    }
  };

  if (Platform.OS !== "ios") {
    return (
      <PaperScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("settingsWatchCloud.iosOnly")}
            </Text>
          </Card.Content>
        </Card>
      </PaperScrollView>
    );
  }

  if (isWatchSupported === false) {
    return (
      <PaperScrollView>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
              {t("settingsWatchCloud.watchRequired")}
            </Text>
          </Card.Content>
        </Card>
      </PaperScrollView>
    );
  }

  if (isWatchSupported === null) {
    return (
      <PaperScrollView>
        <View style={styles.topPadding} />
      </PaperScrollView>
    );
  }

  return (
    <>
      <PaperScrollView onRefresh={handleRefresh}>
        <View style={styles.topPadding} />

        {/* iCloud (CloudKit) */}
        <Card style={styles.card}>
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

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text variant="titleMedium" style={styles.settingTitle}>
                  {t("appSettings.cloudKit.enableTitle")}
                </Text>
                <Text
                  variant="bodySmall"
                  style={[
                    styles.sectionDescription,
                    {
                      color: cloudKitEnabled
                        ? theme.colors.primary
                        : theme.colors.error,
                      marginRight: 8,
                      marginTop: 4,
                    },
                  ]}
                >
                  {cloudKitEnabled
                    ? t("appSettings.cloudKit.enabledStatus")
                    : t("appSettings.cloudKit.disabledStatus")}
                </Text>
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

            {cloudKitEnabled && (
              <>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text variant="titleMedium" style={styles.settingTitle}>
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

                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <Text variant="titleMedium" style={styles.settingTitle}>
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

                {syncProgress && (
                  <View style={{ marginTop: 16, marginBottom: 8 }}>
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
                          {syncProgress.currentItem} / {syncProgress.totalItems}{" "}
                          {syncProgress.itemType}
                        </Text>
                      </View>
                    )}
                  </View>
                )}

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
                                console.error("Failed to resync CloudKit:", error);
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
              </>
            )}
          </Card.Content>
        </Card>

        {/* Watch */}
        <Card style={styles.card}>
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
              style={[styles.settingTitle, { marginBottom: 6 }]}
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
                  if (!hasWatchToken) return;
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
      </PaperScrollView>

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
  topPadding: {
    height: 16,
  },
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  settingInfo: {
    flex: 1,
    marginRight: 16,
  },
  settingTitle: {
    fontWeight: "500",
  },
});
