import { Colors } from "@/constants/Colors";
import { useGetNotificationsQuery } from "@/generated/gql-operations-generated";
import { useGraphQLCacheImportExport } from "@/hooks/useGraphQLCacheImportExport";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { formatFileSize } from "@/utils";
import { getSharedMediaCacheDirectoryAsync } from "@/utils/shared-cache";
import { openSharedCacheDb } from "@/services/media-cache-db";
import { MediaCacheRepository } from "@/services/media-cache-repository";
import { Ionicons } from "@expo/vector-icons";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Platform,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { CacheResetModal } from "./CacheResetModal";
import { ThemedText } from "./ThemedText";
import { useUserSettings } from "@/services/user-settings";

export default function UnifiedCacheSettings() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { settings, setAddIconOnNoMedias, setUnencryptOnBigPayload } = useUserSettings();
  const [showResetModal, setShowResetModal] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isExportingMetadata, setIsExportingMetadata] = useState(false);

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
      settings: {
        maxCachedNotifications,
        mediaCache: { downloadSettings, retentionPolicies },
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
        Alert.alert(
          t("appSettings.gqlCache.importExport.exportMetadataError"),
          t("common.notAvailableOnWeb")
        );
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
      const destPath = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(destPath, json, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destPath, {
          mimeType: "application/json",
          dialogTitle: "Export Media Cache Metadata",
        });
      } else {
        Alert.alert(
          t("appSettings.gqlCache.importExport.exportComplete"),
          t("appSettings.gqlCache.importExport.exportCompleteMessage", {
            path: destPath,
          })
        );
      }
    } catch (error) {
      console.error("Error exporting media cache DB metadata:", error);
      Alert.alert(
        t("appSettings.gqlCache.importExport.exportMetadataError"),
        t("appSettings.gqlCache.importExport.exportMetadataError")
      );
    } finally {
      setIsExportingMetadata(false);
    }
  };

  return (
    <View style={styles.sectionContainer}>
      {/* Cache Overview Section */}
      <View style={styles.sectionHeader}>
        <ThemedText
          style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
        >
          {t("appSettings.cache.title")}
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("appSettings.cache.description")}
        </ThemedText>
      </View>

      {/* Cache Summary */}
      <View
        style={[
          styles.summaryCard,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.summaryHeader}>
          <Ionicons
            name="analytics"
            size={24}
            color={Colors[colorScheme].tint}
          />
          <ThemedText
            style={[styles.summaryTitle, { color: Colors[colorScheme].text }]}
          >
            {t("appSettings.cache.summary")}
          </ThemedText>
        </View>

        <View style={styles.summaryStats}>
          <View style={styles.summaryStat}>
            <ThemedText
              style={[
                styles.summaryStatValue,
                { color: Colors[colorScheme].tint },
              ]}
            >
              {cacheStats ? formatFileSize(cacheStats.totalSize) : "0"}
            </ThemedText>
            <ThemedText
              style={[
                styles.summaryStatLabel,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.cache.mediaSize")}
            </ThemedText>
            <ThemedText
              style={[
                styles.summaryStatSubtext,
                { color: Colors[colorScheme].textMuted },
              ]}
            >
              {cacheStats ? cacheStats.totalItems : 0}{" "}
              {t("appSettings.cache.items")}
            </ThemedText>
          </View>

          <View style={styles.summaryStat}>
            <ThemedText
              style={[
                styles.summaryStatValue,
                { color: Colors[colorScheme].tint },
              ]}
            >
              {graphqlCacheInfo}
            </ThemedText>
            <ThemedText
              style={[
                styles.summaryStatLabel,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.cache.notificationsCount")}
            </ThemedText>
            <ThemedText
              style={[
                styles.summaryStatSubtext,
                { color: Colors[colorScheme].textMuted },
              ]}
            >
              {t("appSettings.cache.inCache")}
            </ThemedText>
          </View>

          <View style={styles.summaryStat}>
            <ThemedText
              style={[
                styles.summaryStatValue,
                { color: Colors[colorScheme].tint },
              ]}
            >
              {totalCacheSize}
            </ThemedText>
            <ThemedText
              style={[
                styles.summaryStatLabel,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.cache.totalSize")}
            </ThemedText>
            <ThemedText
              style={[
                styles.summaryStatSubtext,
                { color: Colors[colorScheme].textMuted },
              ]}
            >
              {t("appSettings.cache.approximate")}
            </ThemedText>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.resetButton,
            { backgroundColor: Colors[colorScheme].error },
          ]}
          onPress={handleOpenResetModal}
          activeOpacity={0.8}
        >
          <Ionicons name="trash" size={20} color="#fff" />
          <ThemedText style={styles.resetButtonText}>
            {t("appSettings.cache.resetCache")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {/* Auto Download Settings */}
      <View style={styles.sectionHeader}>
        <ThemedText
          style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
        >
          {t("appSettings.autoDownload.title")}
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("appSettings.autoDownload.description")}
        </ThemedText>
      </View>

      <View
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.settingInfo}>
          <Ionicons
            name="download"
            size={20}
            color={Colors[colorScheme].tint}
            style={styles.settingIcon}
          />
          <View style={styles.settingTextContainer}>
            <ThemedText
              style={[styles.settingTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.autoDownload.enableAutoDownload")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.autoDownload.enableAutoDownloadDescription")}
            </ThemedText>
          </View>
        </View>
        <Switch
          value={downloadSettings.autoDownloadEnabled}
          onValueChange={(v) =>
            updateMediaCacheDownloadSettings({ autoDownloadEnabled: v })
          }
          thumbColor={
            downloadSettings.autoDownloadEnabled
              ? Colors[colorScheme].tint
              : Colors[colorScheme].textSecondary
          }
          trackColor={{
            false: Colors[colorScheme].border,
            true: Colors[colorScheme].tint + "40",
          }}
        />
      </View>

      {downloadSettings?.autoDownloadEnabled && (
        <View
          style={[
            styles.settingRow,
            { backgroundColor: Colors[colorScheme].backgroundCard },
          ]}
        >
          <View style={styles.settingInfo}>
            <Ionicons
              name="wifi"
              size={20}
              color={Colors[colorScheme].tint}
              style={styles.settingIcon}
            />
            <View style={styles.settingTextContainer}>
              <ThemedText
                style={[
                  styles.settingTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("appSettings.autoDownload.downloadOnWiFiOnly")}
              </ThemedText>
              <ThemedText
                style={[
                  styles.settingDescription,
                  { color: Colors[colorScheme].textSecondary },
                ]}
              >
                {t("appSettings.autoDownload.downloadOnWiFiOnlyDescription")}
              </ThemedText>
            </View>
          </View>
          <Switch
            value={downloadSettings.wifiOnlyDownload}
            onValueChange={(v) =>
              updateMediaCacheDownloadSettings({ wifiOnlyDownload: v })
            }
            thumbColor={
              downloadSettings.wifiOnlyDownload
                ? Colors[colorScheme].tint
                : Colors[colorScheme].textSecondary
            }
            trackColor={{
              false: Colors[colorScheme].border,
              true: Colors[colorScheme].tint + "40",
            }}
          />
        </View>
      )}

      {/* Retention Policies */}
      <View style={styles.sectionHeader}>
        <ThemedText
          style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
        >
          {t("appSettings.retentionPolicies.title")}
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("appSettings.retentionPolicies.description")}
        </ThemedText>
      </View>

      <View
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingTextContainer}>
            <ThemedText
              style={[styles.settingTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.retentionPolicies.maxCacheSize")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.retentionPolicies.maxCacheSizeDescription")}
            </ThemedText>
          </View>
        </View>
        <TextInput
          style={[
            styles.settingInput,
            {
              color: Colors[colorScheme].text,
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].border,
            },
          ]}
          value={retentionPolicies?.maxCacheSizeMB?.toString() || ""}
          onChangeText={(text) => {
            if (text.trim() === "") {
              updateMediaCacheRetentionPolicies({ maxCacheSizeMB: undefined });
            } else {
              const value = parseInt(text, 10);
              if (!Number.isNaN(value) && value >= 0 && value <= 10000) {
                updateMediaCacheRetentionPolicies({ maxCacheSizeMB: value });
              }
            }
          }}
          keyboardType="numeric"
          maxLength={5}
        />
      </View>

      <View
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingTextContainer}>
            <ThemedText
              style={[styles.settingTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.retentionPolicies.maxCacheAge")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.retentionPolicies.maxCacheAgeDescription")}
            </ThemedText>
          </View>
        </View>
        <TextInput
          style={[
            styles.settingInput,
            {
              color: Colors[colorScheme].text,
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].border,
            },
          ]}
          value={retentionPolicies?.maxCageAgeDays?.toString() || ""}
          onChangeText={(text) => {
            if (text.trim() === "") {
              updateMediaCacheRetentionPolicies({ maxCageAgeDays: undefined });
            } else {
              const value = parseInt(text, 10);
              if (!Number.isNaN(value) && value >= 0 && value <= 365) {
                updateMediaCacheRetentionPolicies({ maxCageAgeDays: value });
              }
            }
          }}
          keyboardType="numeric"
          maxLength={3}
        />
      </View>

      {/* GraphQL Cache Settings */}
      <View style={styles.sectionHeader}>
        <ThemedText
          style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
        >
          {t("appSettings.notifications.title")}
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("appSettings.notifications.description")}
        </ThemedText>
      </View>

      <View
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingTextContainer}>
            <ThemedText
              style={[styles.settingTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.notifications.maxStoredTitle")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.notifications.maxStoredDescription")}
            </ThemedText>
          </View>
        </View>
        <TextInput
          style={[
            styles.settingInput,
            {
              color: Colors[colorScheme].text,
              backgroundColor: Colors[colorScheme].background,
              borderColor: Colors[colorScheme].border,
            },
          ]}
          value={maxCachedNotifications?.toString() || "500"}
          onChangeText={async (text) => {
            if (text.trim() === "") {
              await setMaxCachedNotifications(undefined);
              return;
            }
            const parsed = parseInt(text, 10);
            if (!Number.isNaN(parsed) && parsed >= 0 && parsed <= 100000) {
              await setMaxCachedNotifications(parsed);
            }
          }}
          keyboardType="numeric"
          maxLength={6}
        />
      </View>

      {/* Notifications preferences */}
      <View
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingTextContainer}>
            <ThemedText
              style={[styles.settingTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.notifications.addIconOnNoMedias")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.notifications.addIconOnNoMediasDescription")}
            </ThemedText>
          </View>
        </View>
        <Switch
          value={!!settings.notificationsPreferences?.addIconOnNoMedias}
          onValueChange={setAddIconOnNoMedias}
          thumbColor={!!settings.notificationsPreferences?.addIconOnNoMedias ? Colors[colorScheme].tint : Colors[colorScheme].textSecondary}
          trackColor={{ false: Colors[colorScheme].border, true: Colors[colorScheme].tint + "40" }}
        />
      </View>

      <View
        style={[
          styles.settingRow,
          { backgroundColor: Colors[colorScheme].backgroundCard },
        ]}
      >
        <View style={styles.settingInfo}>
          <View style={styles.settingTextContainer}>
            <ThemedText
              style={[styles.settingTitle, { color: Colors[colorScheme].text }]}
            >
              {t("appSettings.notifications.unencryptOnBigPayload")}
            </ThemedText>
            <ThemedText
              style={[
                styles.settingDescription,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("appSettings.notifications.unencryptOnBigPayloadDescription")}
            </ThemedText>
          </View>
        </View>
        <Switch
          value={!!settings.notificationsPreferences?.unencryptOnBigPayload}
          onValueChange={setUnencryptOnBigPayload}
          thumbColor={!!settings.notificationsPreferences?.unencryptOnBigPayload ? Colors[colorScheme].tint : Colors[colorScheme].textSecondary}
          trackColor={{ false: Colors[colorScheme].border, true: Colors[colorScheme].tint + "40" }}
        />
      </View>

      {/* Import/Export Section */}
      <View style={styles.sectionHeader}>
        <ThemedText
          style={[styles.sectionTitle, { color: Colors[colorScheme].text }]}
        >
          {t("appSettings.gqlCache.importExport.title")}
        </ThemedText>
        <ThemedText
          style={[
            styles.sectionDescription,
            { color: Colors[colorScheme].textSecondary },
          ]}
        >
          {t("appSettings.gqlCache.importExport.description")}
        </ThemedText>
      </View>

      <View style={styles.importExportContainer}>
        {/* Export Button */}
        <TouchableOpacity
          style={[
            styles.importExportButton,
            { backgroundColor: Colors[colorScheme].tint },
            isExporting && styles.importExportButtonDisabled,
          ]}
          onPress={handleExportNotifications}
          disabled={isExporting || isImporting}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isExporting ? "hourglass" : "download"}
            size={20}
            color="#fff"
            style={styles.importExportButtonIcon}
          />
          <View style={styles.importExportButtonTextContainer}>
            <ThemedText style={styles.importExportButtonText}>
              {isExporting
                ? t("common.exporting")
                : t("appSettings.gqlCache.importExport.exportButton")}
            </ThemedText>
            <ThemedText style={styles.importExportButtonDescription}>
              {t("appSettings.gqlCache.importExport.exportDescription")}
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* Export Metadata Button */}
        <TouchableOpacity
          style={[
            styles.importExportButton,
            { backgroundColor: Colors[colorScheme].tint },
            isExportingMetadata && styles.importExportButtonDisabled,
          ]}
          onPress={handleExportMetadata}
          disabled={isExportingMetadata || isExporting || isImporting}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isExportingMetadata ? "hourglass" : "document-text"}
            size={20}
            color="#fff"
            style={styles.importExportButtonIcon}
          />
          <View style={styles.importExportButtonTextContainer}>
            <ThemedText style={styles.importExportButtonText}>
              {isExportingMetadata
                ? t("common.exporting")
                : t("appSettings.gqlCache.importExport.exportMetadataButton")}
            </ThemedText>
            <ThemedText style={styles.importExportButtonDescription}>
              {t("appSettings.gqlCache.importExport.exportMetadataDescription")}
            </ThemedText>
          </View>
        </TouchableOpacity>

        {/* Import Button */}
        <TouchableOpacity
          style={[
            styles.importExportButton,
            { backgroundColor: Colors[colorScheme].success },
            isImporting && styles.importExportButtonDisabled,
          ]}
          onPress={handleImportNotifications}
          disabled={isExporting || isImporting}
          activeOpacity={0.8}
        >
          <Ionicons
            name={isImporting ? "hourglass" : "cloud-upload"}
            size={20}
            color="#fff"
            style={styles.importExportButtonIcon}
          />
          <View style={styles.importExportButtonTextContainer}>
            <ThemedText style={styles.importExportButtonText}>
              {isImporting
                ? t("common.importing")
                : t("appSettings.gqlCache.importExport.importButton")}
            </ThemedText>
            <ThemedText style={styles.importExportButtonDescription}>
              {t("appSettings.gqlCache.importExport.importDescription")}
            </ThemedText>
          </View>
        </TouchableOpacity>
      </View>

      {/* Cache Reset Modal */}
      <CacheResetModal
        visible={showResetModal}
        onClose={() => setShowResetModal(false)}
        totalCacheSize={totalCacheSize.toString()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  sectionContainer: {
    marginBottom: 20,
    paddingHorizontal: 16,
  },
  sectionHeader: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginBottom: 4,
  },
  sectionDescription: {
    fontSize: 14,
    lineHeight: 20,
  },
  summaryCard: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 24,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(0,0,0,0.1)",
  },
  summaryHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: "600",
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
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  summaryStatLabel: {
    fontSize: 12,
    textAlign: "center",
  },
  summaryStatSubtext: {
    fontSize: 10,
    textAlign: "center",
    marginTop: 2,
  },
  resetButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  resetButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
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
  settingInput: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    minWidth: 80,
  },
  importExportContainer: {
    marginBottom: 24,
    gap: 12,
  },
  importExportButton: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  importExportButtonDisabled: {
    opacity: 0.6,
  },
  importExportButtonIcon: {
    marginRight: 12,
  },
  importExportButtonTextContainer: {
    flex: 1,
  },
  importExportButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  importExportButtonDescription: {
    color: "#fff",
    fontSize: 13,
    opacity: 0.9,
    lineHeight: 18,
  },
});
