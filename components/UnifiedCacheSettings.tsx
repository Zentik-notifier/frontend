import { useAppContext } from "@/contexts/AppContext";
import { useGetNotificationsQuery } from "@/generated/gql-operations-generated";
import { useGraphQLCacheImportExport } from "@/hooks/useGraphQLCacheImportExport";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { openSharedCacheDb } from "@/services/media-cache-db";
import { MediaCacheRepository } from "@/services/media-cache-repository";
import { useUserSettings } from "@/services/user-settings";
import { formatFileSize, IS_FS_SUPPORTED } from "@/utils";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useEffect, useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Surface,
  Switch,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { CacheResetModal } from "./CacheResetModal";

export default function UnifiedCacheSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    settings,
    setUnencryptOnBigPayload,
    setMarkAsReadOnView,
    setShowAppIconOnBucketIconMissing,
  } = useUserSettings();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);

  // Dialog states
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [dialogMessage, setDialogMessage] = useState("");

  const [localMaxCacheSizeMB, setLocalMaxCacheSizeMB] = useState<string>(
    settings.mediaCache.retentionPolicies?.maxCacheSizeMB?.toString() || ""
  );
  const [localMaxCacheAgeDays, setLocalMaxCacheAgeDays] = useState<string>(
    settings.mediaCache.retentionPolicies?.maxCageAgeDays?.toString() || ""
  );
  const [localMaxNotifications, setLocalMaxNotifications] = useState<string>(
    settings.maxCachedNotifications !== undefined
      ? String(settings.maxCachedNotifications)
      : ""
  );
  const [localMaxNotificationsDays, setLocalMaxNotificationsDays] =
    useState<string>(
      settings.maxCachedNotificationsDay !== undefined
        ? String(settings.maxCachedNotificationsDay)
        : ""
    );
  const [isEditingMaxNotifications, setIsEditingMaxNotifications] =
    useState(false);
  const [isEditingMaxNotificationsDays, setIsEditingMaxNotificationsDays] =
    useState(false);

  // Sync when settings change externally
  useEffect(() => {
    setLocalMaxCacheSizeMB(
      settings.mediaCache.retentionPolicies?.maxCacheSizeMB?.toString() || ""
    );
    setLocalMaxCacheAgeDays(
      settings.mediaCache.retentionPolicies?.maxCageAgeDays?.toString() || ""
    );
    if (!isEditingMaxNotifications) {
      setLocalMaxNotifications(
        settings.maxCachedNotifications !== undefined
          ? String(settings.maxCachedNotifications)
          : ""
      );
    }
    if (!isEditingMaxNotificationsDays) {
      setLocalMaxNotificationsDays(
        settings.maxCachedNotificationsDay !== undefined
          ? String(settings.maxCachedNotificationsDay)
          : ""
      );
    }
  }, [
    settings.mediaCache.retentionPolicies?.maxCacheSizeMB,
    settings.mediaCache.retentionPolicies?.maxCageAgeDays,
    settings.maxCachedNotifications,
    settings.maxCachedNotificationsDay,
    isEditingMaxNotifications,
    isEditingMaxNotificationsDays,
  ]);

  const { cacheStats } = useGetCacheStats();
  const { exportNotifications, importNotifications } =
    useGraphQLCacheImportExport(async (count) => {
      console.log(
        `🎉 Import completed successfully with ${count} notifications`
      );
      // Force refetch of notifications query to update UI
      try {
        await refetch();
        console.log("✅ Notifications query refetched");
      } catch (error) {
        console.warn("⚠️ Failed to refetch notifications:", error);
      }
    });
  const {
    userSettings: {
      updateMediaCacheDownloadSettings,
      updateMediaCacheRetentionPolicies,
      setMaxCachedNotifications,
      setMaxCachedNotificationsDay,
      settings: {
        mediaCache: { downloadSettings },
        notificationsPreferences,
      },
    },
  } = useAppContext();

  // Reactive notifications count from Apollo cache
  const { data: notifData, refetch } = useGetNotificationsQuery({
    fetchPolicy: "cache-only",
  });
  const graphqlCacheInfo = useMemo(
    () => notifData?.notifications?.length ?? 0,
    [notifData?.notifications?.length]
  );

  // Calculate total cache size
  const totalCacheSize = useMemo(() => {
    if (!cacheStats) {
      return 0;
    }
    const mediaSize = cacheStats.totalSize;
    // Approximate GraphQL cache size: each notification is roughly 2KB
    const gqlSize = graphqlCacheInfo * 2048; // 2KB per notification
    return formatFileSize(mediaSize + gqlSize);
  }, [cacheStats, graphqlCacheInfo]);

  const handleOpenResetModal = () => {
    setShowResetModal(true);
  };

  const handleExportNotifications = async () => {
    setIsExporting(true);
    try {
      await exportNotifications();
    } catch (error) {
      console.error("Export failed:", error);
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportNotifications = async () => {
    setIsImporting(true);
    try {
      await importNotifications();
    } catch (error) {
      console.error("Import failed:", error);
    } finally {
      setIsImporting(false);
    }
  };

  const handleExportMetadata = async () => {
    setIsExportingMetadata(true);
    try {
      // Manteniamo per ora la restrizione iOS come in precedenza (può essere rimossa se serve cross-platform)
      if (Platform.OS !== "ios") {
        setDialogMessage(t("common.notAvailableOnWeb"));
        setShowErrorDialog(true);
        return;
      }

      const db = await openSharedCacheDb();
      const repo = new MediaCacheRepository(db);
      const items = await repo.listCacheItems();

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        itemCount: items.length,
        items,
      };

      const json = JSON.stringify(payload, null, 2);
      const fileName = `media-cache-metadata-${
        new Date().toISOString().split("T")[0]
      }.json`;
      const destPath = `${Paths.document.uri}${fileName}`;
      const file = new File(destPath);
      file.write(json, {});

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destPath, {
          mimeType: "application/json",
          dialogTitle: "Export Media Cache Metadata",
        });
      } else {
        setDialogMessage(
          t("appSettings.gqlCache.importExport.exportCompleteMessage", {
            path: destPath,
          })
        );
        setShowSuccessDialog(true);
      }

      try {
        file.delete();
      } catch (cleanupError) {
        console.log("File cleanup failed:", cleanupError);
      }
    } catch (error) {
      console.error("Error exporting media cache DB metadata:", error);
      setDialogMessage(
        t("appSettings.gqlCache.importExport.exportMetadataError")
      );
      setShowErrorDialog(true);
    } finally {
      setIsExportingMetadata(false);
    }
  };

  // Logs export and toggle removed

  return (
    <View style={styles.sectionContainer}>
      {/* Cache Overview Section */}
      {IS_FS_SUPPORTED && (
        <Surface style={styles.surfaceSection} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.cache.title")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("appSettings.cache.description")}
            </Text>
          </View>

          {/* Cache Summary */}
          <Card style={styles.summaryCard} elevation={0}>
            <Card.Content>
              <View style={styles.summaryHeader}>
                <Icon
                  source="chart-line"
                  size={24}
                  color={theme.colors.primary}
                />
                <Text variant="titleMedium" style={styles.summaryTitle}>
                  {t("appSettings.cache.summary")}
                </Text>
              </View>

              <View style={styles.summaryStats}>
                <View style={styles.summaryStat}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.summaryStatValue,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {cacheStats ? formatFileSize(cacheStats.totalSize) : "0"}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.summaryStatLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.cache.mediaSize")}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.summaryStatSubtext,
                      { color: theme.colors.outline },
                    ]}
                  >
                    {cacheStats ? cacheStats.totalItems : 0}{" "}
                    {t("appSettings.cache.items")}
                  </Text>
                </View>

                <View style={styles.summaryStat}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.summaryStatValue,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {graphqlCacheInfo}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.summaryStatLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.cache.notificationsCount")}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.summaryStatSubtext,
                      { color: theme.colors.outline },
                    ]}
                  >
                    {t("appSettings.cache.inCache")}
                  </Text>
                </View>

                <View style={styles.summaryStat}>
                  <Text
                    variant="headlineMedium"
                    style={[
                      styles.summaryStatValue,
                      { color: theme.colors.primary },
                    ]}
                  >
                    {totalCacheSize}
                  </Text>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.summaryStatLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.cache.totalSize")}
                  </Text>
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.summaryStatSubtext,
                      { color: theme.colors.outline },
                    ]}
                  >
                    {t("appSettings.cache.approximate")}
                  </Text>
                </View>
              </View>

              <Button
                mode="contained"
                buttonColor={theme.colors.error}
                textColor={theme.colors.onError}
                onPress={handleOpenResetModal}
                icon="delete"
                style={styles.resetButton}
              >
                {t("appSettings.cache.resetCache")}
              </Button>
            </Card.Content>
          </Card>
        </Surface>
      )}

      {/* Auto Download Settings */}
      {IS_FS_SUPPORTED && (
        <Surface style={styles.surfaceSection} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="headlineSmall" style={styles.sectionTitle}>
              {t("appSettings.autoDownload.title")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.sectionDescription,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("appSettings.autoDownload.description")}
            </Text>
          </View>

          <Card style={styles.settingCard} elevation={0}>
            <Card.Content>
              <View style={styles.settingRow}>
                <View style={styles.settingInfo}>
                  <View style={styles.settingIcon}>
                    <Icon
                      source="download"
                      size={20}
                      color={theme.colors.primary}
                    />
                  </View>
                  <View style={styles.settingTextContainer}>
                    <Text variant="titleMedium" style={styles.settingTitle}>
                      {t("appSettings.autoDownload.enableAutoDownload")}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.settingDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {t(
                        "appSettings.autoDownload.enableAutoDownloadDescription"
                      )}
                    </Text>
                  </View>
                </View>
                <Switch
                  value={downloadSettings.autoDownloadEnabled}
                  onValueChange={(v) =>
                    updateMediaCacheDownloadSettings({ autoDownloadEnabled: v })
                  }
                />
              </View>
            </Card.Content>
          </Card>

          {downloadSettings?.autoDownloadEnabled && (
            <Card style={styles.settingCard} elevation={0}>
              <Card.Content>
                <View style={styles.settingRow}>
                  <View style={styles.settingInfo}>
                    <View style={styles.settingIcon}>
                      <Icon
                        source="wifi"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </View>
                    <View style={styles.settingTextContainer}>
                      <Text variant="titleMedium" style={styles.settingTitle}>
                        {t("appSettings.autoDownload.downloadOnWiFiOnly")}
                      </Text>
                      <Text
                        variant="bodyMedium"
                        style={[
                          styles.settingDescription,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {t(
                          "appSettings.autoDownload.downloadOnWiFiOnlyDescription"
                        )}
                      </Text>
                    </View>
                  </View>
                  <Switch
                    value={downloadSettings.wifiOnlyDownload}
                    onValueChange={(v) =>
                      updateMediaCacheDownloadSettings({ wifiOnlyDownload: v })
                    }
                  />
                </View>
              </Card.Content>
            </Card>
          )}
        </Surface>
      )}

      {/* Retention Policies */}
      <Surface style={styles.surfaceSection} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.retentionPolicies.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.retentionPolicies.description")}
          </Text>
        </View>

        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.retentionPolicies.maxCacheSize")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.retentionPolicies.maxCacheSizeDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxCacheSizeMB}
                onChangeText={(text) => {
                  setLocalMaxCacheSizeMB(text);
                  if (text.trim() === "") {
                    updateMediaCacheRetentionPolicies({
                      maxCacheSizeMB: undefined,
                    });
                    return;
                  }
                  const value = parseInt(text, 10);
                  if (!Number.isNaN(value) && value >= 0 && value <= 10000) {
                    updateMediaCacheRetentionPolicies({
                      maxCacheSizeMB: value,
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={5}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>

        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.retentionPolicies.maxCacheAge")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.retentionPolicies.maxCacheAgeDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxCacheAgeDays}
                onChangeText={(text) => {
                  setLocalMaxCacheAgeDays(text);
                  if (text.trim() === "") {
                    updateMediaCacheRetentionPolicies({
                      maxCageAgeDays: undefined,
                    });
                    return;
                  }
                  const value = parseInt(text, 10);
                  if (!Number.isNaN(value) && value >= 0 && value <= 365) {
                    updateMediaCacheRetentionPolicies({
                      maxCageAgeDays: value,
                    });
                  }
                }}
                keyboardType="numeric"
                maxLength={3}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>

        {/* Max Stored Notifications */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.maxStoredTitle")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.notifications.maxStoredDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxNotifications}
                onFocus={() => setIsEditingMaxNotifications(true)}
                onBlur={async () => {
                  const text = localMaxNotifications;
                  if (text.trim() === "") {
                    await setMaxCachedNotifications(undefined);
                  } else {
                    const parsed = parseInt(text, 10);
                    if (
                      !Number.isNaN(parsed) &&
                      parsed >= 0 &&
                      parsed <= 100000
                    ) {
                      await setMaxCachedNotifications(parsed);
                    }
                  }
                  setIsEditingMaxNotifications(false);
                }}
                onChangeText={(text) => {
                  setLocalMaxNotifications(text);
                }}
                keyboardType="numeric"
                maxLength={6}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>

        {/* Max Stored Notifications Days */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.gqlCache.maxStoredDaysTitle")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.gqlCache.maxStoredDaysDescription")}
                  </Text>
                </View>
              </View>
              <TextInput
                mode="outlined"
                value={localMaxNotificationsDays}
                onFocus={() => setIsEditingMaxNotificationsDays(true)}
                onBlur={async () => {
                  const text = localMaxNotificationsDays;
                  if (text.trim() === "") {
                    await setMaxCachedNotificationsDay(undefined);
                  } else {
                    const parsed = parseInt(text, 10);
                    if (
                      !Number.isNaN(parsed) &&
                      parsed >= 0 &&
                      parsed <= 3650
                    ) {
                      await setMaxCachedNotificationsDay(parsed);
                    }
                  }
                  setIsEditingMaxNotificationsDays(false);
                }}
                onChangeText={(text) => {
                  setLocalMaxNotificationsDays(text);
                }}
                keyboardType="numeric"
                maxLength={4}
                style={styles.compactInput}
                dense
              />
            </View>
          </Card.Content>
        </Card>
      </Surface>

      {/* GraphQL Cache Settings */}
      <Surface style={styles.surfaceSection} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.notifications.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.notifications.description")}
          </Text>
        </View>

        {/* Mark as read on view setting */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.markAsReadOnView")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("appSettings.notifications.markAsReadOnViewDescription")}
                  </Text>
                </View>
              </View>
              <Switch
                value={!!settings.notificationsPreferences?.markAsReadOnView}
                onValueChange={setMarkAsReadOnView}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Notifications preferences */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t("appSettings.notifications.unencryptOnBigPayload")}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.unencryptOnBigPayloadDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  !!settings.notificationsPreferences?.unencryptOnBigPayload
                }
                onValueChange={setUnencryptOnBigPayload}
              />
            </View>
          </Card.Content>
        </Card>

        {/* Show app icon when bucket icon missing */}
        <Card style={styles.settingCard} elevation={0}>
          <Card.Content>
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <View style={styles.settingTextContainer}>
                  <Text variant="titleMedium" style={styles.settingTitle}>
                    {t(
                      "appSettings.notifications.showAppIconOnBucketIconMissing"
                    )}
                  </Text>
                  <Text
                    variant="bodyMedium"
                    style={[
                      styles.settingDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t(
                      "appSettings.notifications.showAppIconOnBucketIconMissingDescription"
                    )}
                  </Text>
                </View>
              </View>
              <Switch
                value={
                  !!notificationsPreferences?.showAppIconOnBucketIconMissing
                }
                onValueChange={setShowAppIconOnBucketIconMissing}
              />
            </View>
          </Card.Content>
        </Card>
      </Surface>

      {/* Advanced Section */}
      <Surface style={styles.surfaceSection} elevation={1}>
        <View style={styles.sectionHeader}>
          <Text variant="headlineSmall" style={styles.sectionTitle}>
            {t("appSettings.gqlCache.importExport.title")}
          </Text>
          <Text
            variant="bodyMedium"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {t("appSettings.gqlCache.importExport.description")}
          </Text>
        </View>

        <View style={styles.importExportContainer}>
          {/* Import Button */}
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            onPress={handleImportNotifications}
            disabled={isExporting || isImporting}
            loading={isImporting}
            icon="cloud-upload"
            style={styles.importExportButton}
          >
            {isImporting
              ? t("common.importing")
              : t("appSettings.gqlCache.importExport.importButton")}
          </Button>

          {/* Export Button */}
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            onPress={handleExportNotifications}
            disabled={isExporting || isImporting}
            loading={isExporting}
            icon="download"
            style={styles.importExportButton}
          >
            {isExporting
              ? t("common.exporting")
              : t("appSettings.gqlCache.importExport.exportButton")}
          </Button>

          {/* Export Metadata Button */}
          <Button
            mode="contained"
            buttonColor={theme.colors.primary}
            textColor={theme.colors.onPrimary}
            onPress={handleExportMetadata}
            disabled={isExportingMetadata || isExporting || isImporting}
            loading={isExportingMetadata}
            icon="file-document"
            style={styles.importExportButton}
          >
            {isExportingMetadata
              ? t("common.exporting")
              : t("appSettings.gqlCache.importExport.exportMetadataButton")}
          </Button>
        </View>
      </Surface>

      {/* Cache Reset Modal */}
      <CacheResetModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        totalCacheSize={totalCacheSize.toString()}
      />

      {/* Success Dialog */}
      <Portal>
        <Dialog
          visible={showSuccessDialog}
          onDismiss={() => setShowSuccessDialog(false)}
        >
          <Dialog.Title>
            {t("appSettings.gqlCache.importExport.exportComplete")}
          </Dialog.Title>
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
          <Dialog.Title>
            {t("appSettings.gqlCache.importExport.exportMetadataError")}
          </Dialog.Title>
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
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    paddingTop: 16,
  },
  surfaceSection: {
    marginBottom: 20,
    borderRadius: 12,
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
  summaryCard: {
    marginHorizontal: 0,
    marginBottom: 16,
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    marginLeft: 12,
  },
  summaryStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 8,
  },
  summaryStat: {
    alignItems: "center",
  },
  summaryStatValue: {
    marginBottom: 4,
  },
  summaryStatLabel: {
    textAlign: "center",
  },
  summaryStatSubtext: {
    textAlign: "center",
    marginTop: 2,
  },
  resetButton: {
    marginTop: 16,
  },
  settingCard: {
    marginHorizontal: 0,
    marginBottom: 16,
  },
  settingRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
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
    marginBottom: 4,
  },
  settingDescription: {
    lineHeight: 20,
    marginBottom: 8,
  },
  settingInput: {
    minWidth: 80,
  },
  compactInput: {
    minWidth: 60,
    height: 40,
  },
  importExportContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 12,
  },
  importExportButton: {
    marginBottom: 8,
  },
});
