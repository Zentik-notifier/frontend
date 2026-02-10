import { useAppState, useDeleteNotification } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useNotificationExportImport } from "@/hooks/useNotificationExportImport";
import { getAllNotificationsFromCache } from "@/services/notifications-repository";
import { deleteAllBuckets } from "@/db/repositories/buckets-repository";
import {
  AppLog,
  clearAllLogs,
  deleteLogEntry,
  deleteLogFile,
  getLogsDirectory,
  readLogs,
} from "@/services/logger";
import { CacheItem, mediaCache } from "@/services/media-cache-service";
import { settingsRepository } from "@/services/settings-repository";
import { Directory, File } from "@/utils/filesystem-wrapper";
import { getSharedMediaCacheDirectoryAsync } from "@/utils/shared-cache";
import { FlashList } from "@shopify/flash-list";
import { Paths } from "expo-file-system";
import { Image } from "expo-image";
import React, { useCallback, useEffect, useState } from "react";
import { Alert, Platform, ScrollView, StyleSheet, View } from "react-native";
import { Card, IconButton, Text, useTheme, SegmentedButtons, Button } from "react-native-paper";
import DetailCollapsibleSection from "./ui/DetailCollapsibleSection";
import DetailModal from "./ui/DetailModal";
import PaperScrollView from "./ui/PaperScrollView";
import { exportSQLiteDatabaseToFile, importSQLiteDatabaseFromFile, deleteSQLiteDatabase } from "@/services/db-setup";
import { getLatestAutoDbBackup, restoreLatestAutoDbBackup } from "@/services/db-auto-backup";
import { NotificationFragment } from "@/generated/gql-operations-generated";

const FlashListSeparator = () => <View style={{ height: 8 }} />;
const keyById = (item: any) => item.id;
const keyByPath = (item: any) => item.path;
const keyByFirst = (item: any) => item[0];
const keyByKey = (item: any) => item.key;

// Lazy-loaded heavy modules
const getSharing = () => import("expo-sharing");
const getDocumentPicker = () => import("expo-document-picker");

type DetailRecord = {
  type: "bucket" | "notification" | "log" | "setting" | "media";
  data: any;
};

type LogFile = {
  name: string;
  path: string;
  size?: number | null;
};

const MAX_JSON_DISPLAY_LENGTH = 100_000;

function stringifyForDisplay(obj: unknown): string {
  const s = JSON.stringify(obj, null, 2);
  if (s.length <= MAX_JSON_DISPLAY_LENGTH) return s;
  return s.slice(0, MAX_JSON_DISPLAY_LENGTH) + "\n… (truncated)";
}

export default function CachedData() {
  const theme = useTheme();
  const { t } = useI18n();
  const { data: appState, isLoading, refetch } = useAppState();
  const deleteMutation = useDeleteNotification();

  const [selectedRecord, setSelectedRecord] = useState<DetailRecord | null>(
    null
  );
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [mediaViewMode, setMediaViewMode] = useState<"json" | "media" | "thumbnail">("thumbnail");
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [bucketsExpanded, setBucketsExpanded] = useState(false);
  const [logsExpanded, setLogsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [mediaExpanded, setMediaExpanded] = useState(false);
  const [metadataExpanded, setMetadataExpanded] = useState(false);
  const [logFiles, setLogFiles] = useState<LogFile[]>([]);
  const [logEntries, setLogEntries] = useState<AppLog[]>([]);
  const [selectedLogFile, setSelectedLogFile] = useState<string | null>(null);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [settings, setSettings] = useState<Map<string, string>>(new Map());
  const [loadingSettings, setLoadingSettings] = useState(false);
  const [mediaItems, setMediaItems] = useState<CacheItem[]>([]);
  const [mediaFiles, setMediaFiles] = useState<
    {
      name: string;
      path: string;
      size?: number | null;
      isDirectory?: boolean;
    }[]
  >([]);
  const [mediaFolderStack, setMediaFolderStack] = useState<
    { name: string; path: string }[]
  >([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [latestAutoBackupName, setLatestAutoBackupName] = useState<string | null>(null);
  const [cachedNotifications, setCachedNotifications] = useState<NotificationFragment[]>([]);
  const [loadingNotifications, setLoadingNotifications] = useState(false);

  const {
    handleExportNotifications,
    handleImportNotifications,
    isExporting,
    isImporting,
  } = useNotificationExportImport();

  const loadCachedNotifications = useCallback(async () => {
    setLoadingNotifications(true);
    try {
      const notifications = await getAllNotificationsFromCache();
      setCachedNotifications(notifications);
    } catch (error) {
      console.error('Failed to load cached notifications:', error);
    } finally {
      setLoadingNotifications(false);
    }
  }, []);

  // Load notifications when section is expanded
  useEffect(() => {
    if (notificationsExpanded) {
      loadCachedNotifications();
    }
  }, [notificationsExpanded, loadCachedNotifications]);

  const refreshData = useCallback(async () => {
    await refetch();
    if (notificationsExpanded) {
      await loadCachedNotifications();
    }
  }, [refetch, notificationsExpanded, loadCachedNotifications]);

  const refreshLatestAutoBackup = useCallback(async () => {
    if (Platform.OS === 'web') return;
    try {
      const latest = await getLatestAutoDbBackup();
      setLatestAutoBackupName(latest?.name ?? null);
    } catch {
      setLatestAutoBackupName(null);
    }
  }, []);

  useEffect(() => {
    refreshLatestAutoBackup();
  }, [refreshLatestAutoBackup]);

  // === NOTIFICATIONS SECTION ===

  const handleViewNotification = useCallback((notification: any) => {
    setSelectedRecord({ type: "notification", data: notification });
    setShowDetailModal(true);
  }, []);

  const handleDeleteNotification = useCallback(
    (notificationId: string) => {
      Alert.alert(
        t("cachedData.confirmDelete"),
        t("cachedData.confirmDeleteMessage"),
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteMutation.mutateAsync({ notificationId });
              } catch (error) {
                console.error("Failed to delete notification:", error);
                Alert.alert(t("common.error"), t("cachedData.deleteError"));
              }
            },
          },
        ]
      );
    },
    [t, deleteMutation]
  );

  const handleDeleteAllNotifications = useCallback(() => {
    Alert.alert(
      t("cachedData.confirmDelete"),
      t("cachedData.confirmDeleteMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const notifications = cachedNotifications;
              for (const notification of notifications) {
                await deleteMutation.mutateAsync({
                  notificationId: notification.id,
                });
              }
              setCachedNotifications([]);
              await refetch();
            } catch (error) {
              console.error("Failed to delete all notifications:", error);
              Alert.alert(t("common.error"), t("cachedData.deleteError"));
            }
          },
        },
      ]
    );
  }, [t, appState, deleteMutation, refetch]);

  // === BUCKETS SECTION ===

  const handleViewBucket = useCallback((bucket: any) => {
    setSelectedRecord({ type: "bucket", data: bucket });
    setShowDetailModal(true);
  }, []);

  const handleExportBuckets = useCallback(async () => {
    if (!appState?.buckets) return;

    try {
      const jsonData = JSON.stringify(appState.buckets, null, 2);
      const fileName = `buckets_${new Date().toISOString()}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        await file.write(jsonData);

        if (await (await getSharing()).isAvailableAsync()) {
          await (await getSharing()).shareAsync(fileUri, {
            mimeType: "application/json",
          });
        }
      }
    } catch (error) {
      console.error("Failed to export buckets:", error);
      Alert.alert(t("common.error"), t("cachedData.exportError"));
    }
  }, [appState, t]);

  const handleImportBuckets = useCallback(async () => {
    try {
      Alert.alert(t("common.info"), "Import buckets not yet implemented");
    } catch (error) {
      console.error("Failed to import buckets:", error);
      Alert.alert(t("common.error"), "Import error");
    }
  }, [t]);

  const handleDeleteAllBuckets = useCallback(() => {
    Alert.alert(
      t("cachedData.confirmDelete"),
      t("cachedData.confirmDeleteMessage"),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await deleteAllBuckets();
              await refetch();
            } catch (error) {
              console.error("Failed to delete all buckets:", error);
              Alert.alert(t("common.error"), t("cachedData.deleteError"));
            }
          },
        },
      ]
    );
  }, [t, refetch]);

  // === LOGS SECTION ===

  const loadLogFiles = useCallback(async () => {
    if (Platform.OS === "web") {
      // On web, load entries directly from localStorage
      try {
        const logs = await readLogs();
        setLogEntries(logs);
      } catch (error) {
        console.error("Failed to load web logs:", error);
      }
    } else {
      // On iOS, list log files
      try {
        const logsDir = await getLogsDirectory();
        const directory = new Directory(logsDir);

        if (directory.exists) {
          const files = await directory.list();
          const logFilesList: LogFile[] = files
            .filter(
              (f) => f.name.endsWith(".json") && !f.name.includes("_corrupted_")
            )
            .map((f) => ({
              name: f.name,
              path: `${logsDir}/${f.name}`,
              size: f.size,
            }));
          setLogFiles(logFilesList);
        }
      } catch (error) {
        console.error("Failed to load log files:", error);
      }
    }
  }, []);

  const loadLogEntriesFromFile = useCallback(
    async (fileName: string) => {
      setLoadingLogs(true);
      try {
        const source = fileName.replace(".json", "");
        const logs = await readLogs(0, source);
        setLogEntries(logs);
        setSelectedLogFile(fileName);
      } catch (error) {
        console.error("Failed to load log entries:", error);
        Alert.alert(t("common.error"), "Failed to load log entries");
      } finally {
        setLoadingLogs(false);
      }
    },
    [t]
  );

  const handleViewLogEntry = useCallback((log: AppLog) => {
    setSelectedRecord({ type: "log", data: log });
    setShowDetailModal(true);
  }, []);

  const handleDeleteLogEntry = useCallback(
    async (logId: string, source?: string) => {
      Alert.alert(
        "Delete Log Entry",
        "Are you sure you want to delete this log entry?",
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteLogEntry(logId, source);

                // Update local state
                setLogEntries((prev) => prev.filter((log) => log.id !== logId));
              } catch (error) {
                console.error("Failed to delete log entry:", error);
                Alert.alert(t("common.error"), "Failed to delete log entry");
              }
            },
          },
        ]
      );
    },
    [t]
  );

  const handleExportSingleLog = useCallback(
    async (log: AppLog) => {
      try {
        const jsonData = JSON.stringify(log, null, 2);
        const filename = `log_${log.id}_${new Date(
          log.timestamp
        ).toISOString()}.json`;

        if (Platform.OS === "web") {
          const blob = new Blob([jsonData], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const fileUri = `${Paths.document.uri}${filename}`;
          const file = new File(fileUri);
          await file.write(jsonData);

          if (await (await getSharing()).isAvailableAsync()) {
            await (await getSharing()).shareAsync(fileUri, {
              mimeType: "application/json",
            });
          }
        }
      } catch (error) {
        console.error("Failed to export log:", error);
        Alert.alert(t("common.error"), "Failed to export log");
      }
    },
    [t]
  );

  const handleDeleteLogFile = useCallback(
    async (fileName: string) => {
      Alert.alert(
        "Delete Log File",
        `Are you sure you want to delete the entire file "${fileName}"?`,
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await deleteLogFile(fileName);

                // Update local state
                setLogFiles((prev) =>
                  prev.filter((file) => file.name !== fileName)
                );

                // If this was the selected file, reset selection
                if (selectedLogFile === fileName) {
                  setSelectedLogFile(null);
                  setLogEntries([]);
                }
              } catch (error) {
                console.error("Failed to delete log file:", error);
                Alert.alert(t("common.error"), "Failed to delete log file");
              }
            },
          },
        ]
      );
    },
    [t, selectedLogFile]
  );

  const handleExportLogFile = useCallback(
    async (fileName: string) => {
      try {
        const source = fileName.replace(".json", "");
        const logs = await readLogs(0, source, 0);
        const jsonData = JSON.stringify(logs, null, 2);

        if (Platform.OS === "web") {
          // This shouldn't happen as we only show files on iOS, but handle it anyway
          const blob = new Blob([jsonData], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = fileName;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const fileUri = `${Paths.document.uri}${fileName}`;
          const file = new File(fileUri);
          await file.write(jsonData);

          if (await (await getSharing()).isAvailableAsync()) {
            await (await getSharing()).shareAsync(fileUri, {
              mimeType: "application/json",
            });
          }
        }
      } catch (error) {
        console.error("Failed to export log file:", error);
        Alert.alert(t("common.error"), "Failed to export log file");
      }
    },
    [t]
  );

  const handleExportLogs = useCallback(async () => {
    try {
      const logs = Platform.OS === "web" ? logEntries : await readLogs(0, undefined, 0);
      const jsonData = JSON.stringify(logs, null, 2);
      const fileName = `logs_${new Date().toISOString()}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        await file.write(jsonData);

        if (await (await getSharing()).isAvailableAsync()) {
          await (await getSharing()).shareAsync(fileUri, {
            mimeType: "application/json",
          });
        }
      }
    } catch (error) {
      console.error("Failed to export logs:", error);
      Alert.alert(t("common.error"), "Failed to export logs");
    }
  }, [logEntries, t]);

  const handleClearAllLogs = useCallback(() => {
    Alert.alert(
      "Clear All Logs",
      "Are you sure you want to delete all log entries?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await clearAllLogs();
              setLogEntries([]);
              setLogFiles([]);
              setSelectedLogFile(null);
            } catch (error) {
              console.error("Failed to clear logs:", error);
              Alert.alert(t("common.error"), "Failed to clear logs");
            }
          },
        },
      ]
    );
  }, [t]);

  useEffect(() => {
    if (logsExpanded) {
      loadLogFiles();
    }
  }, [logsExpanded, loadLogFiles]);

  // Load log count on component mount
  useEffect(() => {
    const loadInitialLogCount = async () => {
      if (Platform.OS === "web") {
        try {
          const logs = await readLogs();
          setLogEntries(logs);
        } catch (error) {
          console.error("Failed to load initial web log count:", error);
        }
      } else {
        try {
          const logsDir = await getLogsDirectory();
          const directory = new Directory(logsDir);

          if (directory.exists) {
            const files = await directory.list();
            const logFilesList: LogFile[] = files
              .filter(
                (f) =>
                  f.name.endsWith(".json") && !f.name.includes("_corrupted_")
              )
              .map((f) => ({
                name: f.name,
                path: `${logsDir}/${f.name}`,
                size: f.size,
              }));
            setLogFiles(logFilesList);
          }
        } catch (error) {
          console.error("Failed to load initial log file count:", error);
        }
      }
    };

    loadInitialLogCount();
  }, []);

  // === SETTINGS SECTION ===

  const loadSettings = useCallback(async () => {
    setLoadingSettings(true);
    try {
      const allSettings = await settingsRepository.getAllSettings();
      setSettings(allSettings);
    } catch (error) {
      console.error("Failed to load settings:", error);
    } finally {
      setLoadingSettings(false);
    }
  }, []);

  const handleViewSetting = useCallback((key: string, value: string) => {
    setSelectedRecord({ type: "setting", data: { key, value } });
    setShowDetailModal(true);
  }, []);

  const handleDeleteSetting = useCallback(
    async (key: string) => {
      Alert.alert(
        "Delete Setting",
        `Are you sure you want to delete the setting "${key}"?`,
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await settingsRepository.removeSetting(key);
                setSettings((prev) => {
                  const newSettings = new Map(prev);
                  newSettings.delete(key);
                  return newSettings;
                });
              } catch (error) {
                console.error("Failed to delete setting:", error);
                Alert.alert(t("common.error"), "Failed to delete setting");
              }
            },
          },
        ]
      );
    },
    [t]
  );

  const handleExportSingleSetting = useCallback(
    async (key: string, value: string) => {
      try {
        const data = { key, value };
        const jsonData = JSON.stringify(data, null, 2);
        const filename = `setting_${key}_${new Date().toISOString()}.json`;

        if (Platform.OS === "web") {
          const blob = new Blob([jsonData], { type: "application/json" });
          const url = URL.createObjectURL(blob);
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        } else {
          const fileUri = `${Paths.document.uri}${filename}`;
          const file = new File(fileUri);
          await file.write(jsonData);

          if (await (await getSharing()).isAvailableAsync()) {
            await (await getSharing()).shareAsync(fileUri, {
              mimeType: "application/json",
            });
          }
        }
      } catch (error) {
        console.error("Failed to export setting:", error);
        Alert.alert(t("common.error"), "Failed to export setting");
      }
    },
    [t]
  );

  const handleExportAllSettings = useCallback(async () => {
    try {
      const settingsObj = Object.fromEntries(settings);
      const jsonData = JSON.stringify(settingsObj, null, 2);
      const fileName = `app_settings_${new Date().toISOString()}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        await file.write(jsonData);

        if (await (await getSharing()).isAvailableAsync()) {
          await (await getSharing()).shareAsync(fileUri, {
            mimeType: "application/json",
          });
        }
      }
    } catch (error) {
      console.error("Failed to export settings:", error);
      Alert.alert(t("common.error"), "Failed to export settings");
    }
  }, [settings, t]);

  const handleClearAllSettings = useCallback(() => {
    Alert.alert(
      "Clear All Settings",
      "Are you sure you want to delete all app settings?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              await settingsRepository.clearAllSettings();
              setSettings(new Map());
            } catch (error) {
              console.error("Failed to clear settings:", error);
              Alert.alert(t("common.error"), "Failed to clear settings");
            }
          },
        },
      ]
    );
  }, [t]);

  useEffect(() => {
    if (settingsExpanded) {
      loadSettings();
    }
  }, [settingsExpanded, loadSettings]);

  // Load settings count on component mount
  useEffect(() => {
    const loadInitialSettingsCount = async () => {
      try {
        const allSettings = await settingsRepository.getAllSettings();
        setSettings(allSettings);
      } catch (error) {
        console.error("Failed to load initial settings count:", error);
      }
    };

    loadInitialSettingsCount();
  }, []);

  // === MEDIA SECTION ===

  const sortMediaFiles = useCallback(
    (
      files: {
        name: string;
        path: string;
        size?: number | null;
        isDirectory?: boolean;
      }[]
    ) => {
      return files.sort((a, b) => {
        // Folders first (isDirectory or size is null), then files
        const aIsFolder = a.isDirectory;
        const bIsFolder = b.isDirectory;

        if (aIsFolder && !bIsFolder) return -1;
        if (!aIsFolder && bIsFolder) return 1;

        // Then alphabetically by name
        return a.name.localeCompare(b.name);
      });
    },
    []
  );

  const loadMediaItems = useCallback(async () => {
    setLoadingMedia(true);
    try {
      if (Platform.OS === "web") {
        // Web: Load metadata from mediaCache
        const metadata = mediaCache.getMetadata();
        const items = Object.values(metadata) as CacheItem[];
        setMediaItems(items);
      } else {
        // iOS: List files in shared directory
        const sharedDir = await getSharedMediaCacheDirectoryAsync();
        const directory = new Directory(sharedDir);

        if (directory.exists) {
          const files = await directory.list();
          const mediaFilesList = await Promise.all(
            files
              .filter((f) => !f.name.startsWith(".") && f.name !== "logs")
              .map(async (f) => {
                const itemPath = `${sharedDir}${f.name}`;
                const dir = new Directory(itemPath);
                return {
                  name: f.name,
                  path: itemPath,
                  size: f.size,
                  isDirectory: dir.exists,
                };
              })
          );
          setMediaFiles(sortMediaFiles(mediaFilesList));
        }
      }
    } catch (error) {
      console.error("Failed to load media items:", error);
    } finally {
      setLoadingMedia(false);
    }
  }, []);

  const loadMediaFromFolder = useCallback(
    async (folderPath: string, folderName: string) => {
      setLoadingMedia(true);
      try {
        const directory = new Directory(folderPath);

        if (directory.exists) {
          const files = await directory.list();
          const filesList = await Promise.all(
            files
              .filter((f) => !f.name.startsWith("."))
              .map(async (f) => {
                const itemPath = `${folderPath}/${f.name}`;
                const dir = new Directory(itemPath);
                return {
                  name: f.name,
                  path: itemPath,
                  size: f.size,
                  isDirectory: dir.exists,
                };
              })
          );
          setMediaFiles(sortMediaFiles(filesList));
          setMediaFolderStack((prev) => [...prev, { name: folderName, path: folderPath }]);
        }
      } catch (error) {
        console.error("Failed to load media from folder:", error);
        Alert.alert(t("common.error"), "Failed to load media from folder");
      } finally {
        setLoadingMedia(false);
      }
    },
    [t]
  );

  const handleMediaGoBack = useCallback(async () => {
    setMediaFolderStack((prev) => {
      const newStack = [...prev];
      newStack.pop(); // Remove current folder
      return newStack;
    });

    // Reload the parent folder or root
    setLoadingMedia(true);
    try {
      const newStack = [...mediaFolderStack];
      newStack.pop();

      if (newStack.length === 0) {
        // Back to root
        await loadMediaItems();
      } else {
        // Load parent folder
        const parentFolder = newStack[newStack.length - 1];
        const directory = new Directory(parentFolder.path);
        if (directory.exists) {
          const files = await directory.list();
          const filesList = await Promise.all(
            files
              .filter((f) => !f.name.startsWith("."))
              .map(async (f) => {
                const itemPath = `${parentFolder.path}/${f.name}`;
                const dir = new Directory(itemPath);
                return {
                  name: f.name,
                  path: itemPath,
                  size: f.size,
                  isDirectory: dir.exists,
                };
              })
          );
          setMediaFiles(sortMediaFiles(filesList));
        }
      }
    } catch (error) {
      console.error("Failed to go back:", error);
    } finally {
      setLoadingMedia(false);
    }
  }, [mediaFolderStack, loadMediaItems]);

  const handleViewMedia = useCallback(
    (
      media: CacheItem | { name: string; path: string; size?: number | null }
    ) => {
      setSelectedRecord({ type: "media", data: media });
      setShowDetailModal(true);
    },
    []
  );

  const handleDeleteMedia = useCallback(
    async (item: CacheItem) => {
      Alert.alert(
        "Delete Media",
        `Are you sure you want to delete this media item?`,
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await mediaCache.deleteCachedMedia(
                  item.url,
                  item.mediaType,
                  true
                );
                setMediaItems((prev) => prev.filter((m) => m.key !== item.key));
              } catch (error) {
                console.error("Failed to delete media:", error);
                Alert.alert(t("common.error"), "Failed to delete media");
              }
            },
          },
        ]
      );
    },
    [t]
  );

  const handleDeleteMediaFile = useCallback(
    async (filePath: string) => {
      Alert.alert("Delete File", `Are you sure you want to delete this file?`, [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const file = new File(filePath);
              file.delete();
              setMediaFiles((prev) => prev.filter((f) => f.path !== filePath));
            } catch (error) {
              console.error("Failed to delete file:", error);
              Alert.alert(t("common.error"), "Failed to delete file");
            }
          },
        },
      ]);
    },
    [t]
  );

  const handleClearAllMedia = useCallback(async () => {
    Alert.alert(
      "Clear All Media",
      "Are you sure you want to delete all cached media?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              if (Platform.OS === "web") {
                // Clear all media from cache
                const metadata = mediaCache.getMetadata();
                for (const item of Object.values(metadata) as CacheItem[]) {
                  await mediaCache.deleteCachedMedia(
                    item.url,
                    item.mediaType,
                    true
                  );
                }
                setMediaItems([]);
              } else {
                // Delete all files in shared directory
                const sharedDir = await getSharedMediaCacheDirectoryAsync();
                const directory = new Directory(sharedDir);
                if (directory.exists) {
                  directory.delete();
                  directory.create();
                }
                setMediaFiles([]);
                setMediaFolderStack([]);
              }
            } catch (error) {
              console.error("Failed to clear media:", error);
              Alert.alert(t("common.error"), "Failed to clear media");
            }
          },
        },
      ]
    );
  }, [t]);

  const handleExportMediaMetadata = useCallback(async () => {
    try {
      const metadata = mediaCache.getMetadata();
      const jsonData = JSON.stringify(metadata, null, 2);
      const fileName = `media_metadata_${new Date().toISOString()}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        await file.write(jsonData);

        if (await (await getSharing()).isAvailableAsync()) {
          await (await getSharing()).shareAsync(fileUri, {
            mimeType: "application/json",
          });
        }
      }
    } catch (error) {
      console.error("Failed to export media metadata:", error);
      Alert.alert(t("common.error"), "Failed to export media metadata");
    }
  }, [t]);

  // === METADATA SECTION ===

  const loadMetadataItems = useCallback(async () => {
    setLoadingMetadata(true);
    try {
      const metadata = mediaCache.getMetadata();
      const items = Object.values(metadata) as CacheItem[];
      setMediaItems(items);
    } catch (error) {
      console.error("Failed to load metadata:", error);
    } finally {
      setLoadingMetadata(false);
    }
  }, []);

  const handleViewMetadata = useCallback((item: CacheItem) => {
    setSelectedRecord({ type: "media", data: item });
    setShowDetailModal(true);
  }, []);

  const handleDeleteMetadata = useCallback(
    async (item: CacheItem) => {
      Alert.alert(
        "Delete Metadata",
        `Are you sure you want to delete the cached media for ${item.originalFileName}?`,
        [
          { text: t("common.cancel"), style: "cancel" },
          {
            text: t("common.delete"),
            style: "destructive",
            onPress: async () => {
              try {
                await mediaCache.deleteCachedMedia(
                  item.url,
                  item.mediaType,
                  true
                );
                setMediaItems((prev) =>
                  prev.filter((i) => i.url !== item.url)
                );
              } catch (error) {
                console.error("Failed to delete metadata:", error);
                Alert.alert(t("common.error"), "Failed to delete metadata");
              }
            },
          },
        ]
      );
    },
    [t]
  );

  const handleClearAllMetadata = useCallback(async () => {
    Alert.alert(
      "Clear All Metadata",
      "Are you sure you want to delete all cached media metadata?",
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const metadata = mediaCache.getMetadata();
              for (const item of Object.values(metadata) as CacheItem[]) {
                await mediaCache.deleteCachedMedia(
                  item.url,
                  item.mediaType,
                  true
                );
              }
              setMediaItems([]);
            } catch (error) {
              console.error("Failed to clear metadata:", error);
              Alert.alert(t("common.error"), "Failed to clear metadata");
            }
          },
        },
      ]
    );
  }, [t]);

  const handleExportMetadata = useCallback(async () => {
    try {
      const metadata = mediaCache.getMetadata();
      const jsonData = JSON.stringify(metadata, null, 2);
      const fileName = `media_metadata_${new Date().toISOString()}.json`;

      if (Platform.OS === "web") {
        const blob = new Blob([jsonData], { type: "application/json" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const fileUri = `${Paths.document.uri}${fileName}`;
        const file = new File(fileUri);
        await file.write(jsonData);

        if (await (await getSharing()).isAvailableAsync()) {
          await (await getSharing()).shareAsync(fileUri, {
            mimeType: "application/json",
          });
        }
      }
    } catch (error) {
      console.error("Failed to export metadata:", error);
      Alert.alert(t("common.error"), "Failed to export metadata");
    }
  }, [t]);

  useEffect(() => {
    if (metadataExpanded) {
      loadMetadataItems();
    }
  }, [metadataExpanded, loadMetadataItems]);

  // Load metadata count on component mount
  useEffect(() => {
    const loadInitialMetadataCount = async () => {
      try {
        const metadata = mediaCache.getMetadata();
        const items = Object.values(metadata) as CacheItem[];
        setMediaItems(items);
      } catch (error) {
        console.error("Failed to load initial metadata count:", error);
      }
    };

    loadInitialMetadataCount();
  }, []);

  useEffect(() => {
    if (mediaExpanded) {
      loadMediaItems();
    }
  }, [mediaExpanded, loadMediaItems]);

  // Load media files count on component mount (iOS only)
  useEffect(() => {
    const loadInitialMediaCount = async () => {
      try {
        if (Platform.OS !== "web") {
          const sharedDir = await getSharedMediaCacheDirectoryAsync();
          const directory = new Directory(sharedDir);
          if (directory.exists) {
            const files = await directory.list();
            const mediaFilesList = await Promise.all(
              files
                .filter((f) => !f.name.startsWith(".") && f.name !== "logs")
                .map(async (f) => {
                  const itemPath = `${sharedDir}${f.name}`;
                  const dir = new Directory(itemPath);
                  return {
                    name: f.name,
                    path: itemPath,
                    size: f.size,
                    isDirectory: dir.exists,
                  };
                })
            );
            setMediaFiles(sortMediaFiles(mediaFilesList));
          }
        }
      } catch (error) {
        console.error("Failed to load initial media count:", error);
      }
    };

    loadInitialMediaCount();
  }, [sortMediaFiles]);

  const handleBackupSQLite = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        t("common.error"),
        t("cachedData.sqliteBackup.webNotSupported")
      );
      return;
    }

    setIsBackingUp(true);
    try {
      const fileUri = await exportSQLiteDatabaseToFile();

      if (await (await getSharing()).isAvailableAsync()) {
        await (await getSharing()).shareAsync(fileUri, {
          mimeType: 'application/sql',
          dialogTitle: t("cachedData.sqliteBackup.shareTitle"),
        });
      } else {
        Alert.alert(
          t("cachedData.sqliteBackup.success"),
          t("cachedData.sqliteBackup.successMessage", { path: fileUri })
        );
      }
    } catch (error: any) {
      console.error("SQLite backup failed:", error);
      Alert.alert(
        t("common.error"),
        t("cachedData.sqliteBackup.error", { error: error?.message || String(error) })
      );
    } finally {
      setIsBackingUp(false);
    }
  }, [t]);

  const handleResetSQLite = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        t("cachedData.sqliteReset.webNotSupported")
      );
      return;
    }

    Alert.alert(
      t("cachedData.sqliteReset.confirmTitle"),
      t("cachedData.sqliteReset.confirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("cachedData.sqliteReset.resetButton"),
          style: "destructive",
          onPress: async () => {
            try {
              setIsResetting(true);
              await deleteSQLiteDatabase();
              Alert.alert(
                t("cachedData.sqliteReset.success"),
                t("cachedData.sqliteReset.successMessage"),
                [
                  {
                    text: t("common.ok"),
                    onPress: () => {
                      // Refresh data after reset
                      refreshData();
                    },
                  },
                ]
              );
            } catch (error: any) {
              console.error("SQLite reset failed:", error);
              Alert.alert(
                t("cachedData.sqliteReset.error"),
                t("cachedData.sqliteReset.errorMessage", { error: error?.message || String(error) })
              );
            } finally {
              setIsResetting(false);
            }
          },
        },
      ]
    );
  }, [t, refreshData]);

  const handleRestoreSQLite = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(
        t("common.error"),
        t("cachedData.sqliteRestore.webNotSupported")
      );
      return;
    }

    Alert.alert(
      t("cachedData.sqliteRestore.confirmTitle"),
      t("cachedData.sqliteRestore.confirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("cachedData.sqliteRestore.restoreButton"),
          style: "destructive",
          onPress: async () => {
            setIsRestoring(true);
            try {
              const result = await (await getDocumentPicker()).getDocumentAsync({
                type: ['application/sql', 'text/plain'],
                copyToCacheDirectory: true,
              });

              if (result.canceled || !result.assets || result.assets.length === 0) {
                setIsRestoring(false);
                return;
              }

              const fileUri = result.assets[0].uri;
              await importSQLiteDatabaseFromFile(fileUri);

              Alert.alert(
                t("cachedData.sqliteRestore.success"),
                t("cachedData.sqliteRestore.successMessage")
              );

              // Refresh data after restore
              await refreshData();
            } catch (error: any) {
              console.error("SQLite restore failed:", error);
              Alert.alert(
                t("common.error"),
                t("cachedData.sqliteRestore.error", { error: error?.message || String(error) })
              );
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  }, [t, refreshData]);

  const handleRestoreLatestAutoBackup = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert(t("common.error"), t("cachedData.sqliteRestore.webNotSupported"));
      return;
    }

    if (!latestAutoBackupName) {
      Alert.alert(t("common.error"), t("cachedData.sqliteRestore.latestBackupNotFound"));
      return;
    }

    Alert.alert(
      t("cachedData.sqliteRestore.latestBackupConfirmTitle"),
      t("cachedData.sqliteRestore.latestBackupConfirmMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("cachedData.sqliteRestore.restoreButton"),
          style: "destructive",
          onPress: async () => {
            setIsRestoring(true);
            try {
              const restored = await restoreLatestAutoDbBackup();

              Alert.alert(
                t("cachedData.sqliteRestore.success"),
                t("cachedData.sqliteRestore.latestBackupSuccessMessage", { name: restored.name })
              );

              await refreshData();
              await refreshLatestAutoBackup();
            } catch (error: any) {
              console.error('SQLite latest-backup restore failed:', error);
              Alert.alert(
                t("common.error"),
                t("cachedData.sqliteRestore.error", { error: error?.message || String(error) })
              );
            } finally {
              setIsRestoring(false);
            }
          },
        },
      ]
    );
  }, [t, latestAutoBackupName, refreshData, refreshLatestAutoBackup]);

  // Stable renderItem callbacks for FlashLists
  const renderNotificationItem = useCallback(
    ({ item: notification }: { item: any }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {notification.message.title || "No title"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {notification.message.body?.substring(0, 100) || ""}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <IconButton
              icon="eye"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleViewNotification(notification)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteNotification(notification.id)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, handleViewNotification, handleDeleteNotification, styles]
  );

  const renderBucketItem = useCallback(
    ({ item: bucket }: { item: any }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {bucket.name || bucket.id}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {`${bucket.totalMessages || 0} notifications`}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <IconButton
              icon="eye"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleViewBucket(bucket)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, handleViewBucket, styles]
  );

  const renderLogEntryItem = useCallback(
    ({ item: log }: { item: any }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              [{log.level.toUpperCase()}] {log.tag || "General"}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {log.message.substring(0, 100)}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 10,
              }}
            >
              {new Date(log.timestamp).toLocaleString()}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <IconButton
              icon="eye"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleViewLogEntry(log)}
            />
            <IconButton
              icon="download"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleExportSingleLog(log)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteLogEntry(log.id, log.source)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, handleViewLogEntry, handleExportSingleLog, handleDeleteLogEntry, styles]
  );

  const renderLogFileItem = useCallback(
    ({ item: file }: { item: any }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {file.name}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {file.size
                ? `${(file.size / 1024).toFixed(2)} KB`
                : t("cachedData.unknownSize")}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <IconButton
              icon="folder-open"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => loadLogEntriesFromFile(file.name)}
              disabled={loadingLogs}
            />
            <IconButton
              icon="download"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleExportLogFile(file.name)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteLogFile(file.name)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, t, loadLogEntriesFromFile, loadingLogs, handleExportLogFile, handleDeleteLogFile, styles]
  );

  const renderSettingItem = useCallback(
    ({ item: [key, value] }: { item: [string, string] }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {key}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
              numberOfLines={2}
            >
              {value}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <IconButton
              icon="eye"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleViewSetting(key, value)}
            />
            <IconButton
              icon="download"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleExportSingleSetting(key, value)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteSetting(key)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, handleViewSetting, handleExportSingleSetting, handleDeleteSetting, styles]
  );

  const renderMediaFileItem = useCallback(
    ({ item: file }: { item: any }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {file.name}
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
              }}
            >
              {file.isDirectory
                ? t("cachedData.folder")
                : file.size
                  ? `${(file.size / 1024).toFixed(2)} KB`
                  : t("cachedData.unknown")}
            </Text>
          </View>
          <View style={styles.itemActions}>
            {file.isDirectory && (
              <IconButton
                icon="folder-open"
                size={20}
                iconColor={theme.colors.primary}
                onPress={() => loadMediaFromFolder(file.path, file.name)}
                disabled={loadingMedia}
              />
            )}
            <IconButton
              icon="eye"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleViewMedia(file)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteMediaFile(file.path)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, t, loadMediaFromFolder, loadingMedia, handleViewMedia, handleDeleteMediaFile, styles]
  );

  const renderMediaMetadataItem = useCallback(
    ({ item: media }: { item: any }) => (
      <Card style={styles.itemCard}>
        <Card.Content style={styles.itemCardContent}>
          <View style={styles.itemInfo}>
            <Text variant="titleSmall" numberOfLines={1}>
              {media.originalFileName || media.key}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {media.mediaType} - {(media.size / 1024).toFixed(2)} KB
            </Text>
            <Text
              variant="bodySmall"
              style={{
                color: theme.colors.onSurfaceVariant,
                fontSize: 10,
              }}
            >
              {media.downloadedAt
                ? new Date(media.downloadedAt).toLocaleString()
                : t("cachedData.notDownloaded")}
            </Text>
          </View>
          <View style={styles.itemActions}>
            <IconButton
              icon="code-json"
              size={20}
              iconColor={theme.colors.primary}
              onPress={() => handleViewMetadata(media)}
            />
            <IconButton
              icon="delete"
              size={20}
              iconColor={theme.colors.error}
              onPress={() => handleDeleteMetadata(media)}
            />
          </View>
        </Card.Content>
      </Card>
    ),
    [theme, t, handleViewMetadata, handleDeleteMetadata, styles]
  );

  return (
    <PaperScrollView onRefresh={refreshData} loading={isLoading}>
      <Text
        variant="bodyMedium"
        style={[styles.description, { color: theme.colors.onSurfaceVariant }]}
      >
        {t("cachedData.description")}
      </Text>

      {/* SQLite Backup/Restore Section */}
      {Platform.OS !== 'web' && (
        <Card style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text variant="titleMedium" style={{ marginBottom: 8 }}>
              {t("cachedData.sqlite.title")}
            </Text>
            <Text
              variant="bodySmall"
              style={{ color: theme.colors.onSurfaceVariant, marginBottom: 16 }}
            >
              {t("cachedData.sqlite.description")}
            </Text>
            <View style={{ flexDirection: 'column', gap: 12, alignItems: 'stretch' }}>
              <Button
                mode="contained"
                icon="database-export"
                onPress={handleBackupSQLite}
                loading={isBackingUp}
                disabled={isBackingUp || isRestoring || isResetting}
                style={{ width: '100%' }}
              >
                {t("cachedData.sqliteBackup.button")}
              </Button>
              <Button
                mode="outlined"
                icon="database-import"
                onPress={handleRestoreSQLite}
                loading={isRestoring}
                disabled={isBackingUp || isRestoring || isResetting}
                style={{ width: '100%' }}
              >
                {t("cachedData.sqliteRestore.button")}
              </Button>
              <Button
                mode="outlined"
                icon="history"
                onPress={handleRestoreLatestAutoBackup}
                disabled={isBackingUp || isRestoring || isResetting || !latestAutoBackupName}
                style={{ width: '100%' }}
              >
                {t("cachedData.sqliteRestore.latestBackupButton")}
              </Button>
              <Button
                mode="outlined"
                icon="database-remove"
                onPress={handleResetSQLite}
                loading={isResetting}
                disabled={isBackingUp || isRestoring || isResetting}
                buttonColor={theme.colors.error}
                textColor={theme.colors.onError}
                style={{ width: '100%' }}
              >
                {t("cachedData.sqliteReset.button")}
              </Button>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Notifications Section */}
      <DetailCollapsibleSection
        title={t("cachedData.notifications")}
        icon="bell"
        subtitle={`${appState?.stats.totalCount || 0} ${t("cachedData.notificationsInCache")}`}
        expanded={notificationsExpanded}
        onToggleExpanded={() =>
          setNotificationsExpanded(!notificationsExpanded)
        }
        actions={[
          {
            label: t("cachedData.deleteAll"),
            icon: "delete-sweep",
            onPress: handleDeleteAllNotifications,
            disabled: !cachedNotifications.length,
          },
          {
            label: t("cachedData.import"),
            icon: "upload",
            onPress: handleImportNotifications,
            disabled: isExporting || isImporting,
            loading: isImporting,
          },
          {
            label: t("cachedData.export"),
            icon: "download",
            onPress: handleExportNotifications,
            disabled:
              !cachedNotifications.length || isExporting || isImporting,
            loading: isExporting,
          },
        ]}
      >
        {cachedNotifications.length ? (
          <FlashList
            data={cachedNotifications}
            renderItem={renderNotificationItem}
            keyExtractor={keyById}
            ItemSeparatorComponent={FlashListSeparator}
            showsVerticalScrollIndicator={true}
            style={{ maxHeight: 400 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("cachedData.noNotifications")}
            </Text>
          </View>
        )}
      </DetailCollapsibleSection>

      {/* Buckets Section */}
      <DetailCollapsibleSection
        title={t("cachedData.buckets")}
        icon="folder"
        subtitle={`${appState?.buckets.length || 0} ${t("cachedData.bucketsInCache")}`}
        expanded={bucketsExpanded}
        onToggleExpanded={() => setBucketsExpanded(!bucketsExpanded)}
        actions={[
          {
            label: t("cachedData.deleteAll"),
            icon: "delete-sweep",
            onPress: handleDeleteAllBuckets,
            disabled: !appState?.buckets.length,
          },
          {
            label: t("cachedData.import"),
            icon: "upload",
            onPress: handleImportBuckets,
          },
          {
            label: t("cachedData.export"),
            icon: "download",
            onPress: handleExportBuckets,
            disabled: !appState?.buckets.length,
          },
        ]}
      >
        {appState?.buckets.length ? (
          <FlashList
            data={appState.buckets}
            renderItem={renderBucketItem}
            keyExtractor={keyById}
            ItemSeparatorComponent={FlashListSeparator}
            showsVerticalScrollIndicator={true}
            style={{ maxHeight: 400 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("cachedData.noBuckets")}
            </Text>
          </View>
        )}
      </DetailCollapsibleSection>

      {/* Logs Section */}
      <DetailCollapsibleSection
        title={t("cachedData.logs")}
        icon="file-document-outline"
        subtitle={
          Platform.OS === "web"
            ? `${logEntries.length} ${t("cachedData.entriesInLocalStorage")}`
            : `${logFiles.length} ${t("cachedData.logFiles")}`
        }
        expanded={logsExpanded}
        onToggleExpanded={() => setLogsExpanded(!logsExpanded)}
        actions={[
          {
            label: t("cachedData.clearAll"),
            icon: "delete-sweep",
            onPress: handleClearAllLogs,
            disabled:
              Platform.OS === "web" ? !logEntries.length : !logFiles.length,
          },
          {
            label: t("cachedData.export"),
            icon: "download",
            onPress: handleExportLogs,
            disabled:
              Platform.OS === "web" ? !logEntries.length : !logFiles.length,
          },
        ]}
      >
        {Platform.OS === "web" ? (
          // Web: Show log entries directly
          logEntries.length ? (
            <FlashList
              data={logEntries}
              renderItem={renderLogEntryItem}
              keyExtractor={keyById}
              ItemSeparatorComponent={FlashListSeparator}
              showsVerticalScrollIndicator={true}
              style={{ maxHeight: 400 }}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text
                variant="bodyLarge"
                style={{ color: theme.colors.onSurfaceVariant }}
              >
                {t("cachedData.noLogEntries")}
              </Text>
            </View>
          )
        ) : (
          // iOS: Show log files, then entries when file is selected
          <View>
            {!selectedLogFile ? (
              // Show file list
              logFiles.length ? (
                <FlashList
                  data={logFiles}
                  renderItem={renderLogFileItem}
                  keyExtractor={keyByPath}
                  ItemSeparatorComponent={FlashListSeparator}
                  showsVerticalScrollIndicator={true}
                  style={{ maxHeight: 400 }}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t("cachedData.noLogFiles")}
                  </Text>
                </View>
              )
            ) : (
              // Show entries from selected file
              <View>
                <View style={styles.logFileHeader}>
                  <IconButton
                    icon="arrow-left"
                    size={20}
                    onPress={() => {
                      setSelectedLogFile(null);
                      setLogEntries([]);
                    }}
                  />
                  <Text variant="titleSmall">
                    {selectedLogFile} ({logEntries.length} entries)
                  </Text>
                </View>
                {logEntries.length ? (
                  <FlashList
                    data={logEntries}
                    renderItem={renderLogEntryItem}
                    keyExtractor={keyById}
                    ItemSeparatorComponent={FlashListSeparator}
                    showsVerticalScrollIndicator={true}
                    style={{ maxHeight: 400 }}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text
                      variant="bodyLarge"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t("cachedData.noEntriesInFile")}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        )}
      </DetailCollapsibleSection>

      {/* Settings Section */}
      <DetailCollapsibleSection
        title={t("cachedData.appSettings")}
        icon="cog"
        subtitle={`${settings.size} ${t("cachedData.settingsInStorage")}`}
        expanded={settingsExpanded}
        onToggleExpanded={() => setSettingsExpanded(!settingsExpanded)}
        actions={[
          {
            label: t("cachedData.clearAll"),
            icon: "delete-sweep",
            onPress: handleClearAllSettings,
            disabled: settings.size === 0,
          },
          {
            label: t("cachedData.export"),
            icon: "export",
            onPress: handleExportAllSettings,
            disabled: settings.size === 0,
          },
        ]}
      >
        {loadingSettings ? (
          <View style={styles.emptyState}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("cachedData.loadingSettings")}
            </Text>
          </View>
        ) : settings.size > 0 ? (
          <FlashList
            data={Array.from(settings.entries())}
            renderItem={renderSettingItem}
            keyExtractor={keyByFirst}
            ItemSeparatorComponent={FlashListSeparator}
            showsVerticalScrollIndicator={true}
            style={{ maxHeight: 400 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("cachedData.noSettings")}
            </Text>
          </View>
        )}
      </DetailCollapsibleSection>

      {/* Media Files Section (iOS only) */}
      {Platform.OS !== "web" && (
        <DetailCollapsibleSection
          title={t("cachedData.mediaFiles")}
          icon="folder-multiple-image"
          subtitle={`${mediaFiles.length} ${t("cachedData.filesFolders")}`}
          expanded={mediaExpanded}
          onToggleExpanded={() => setMediaExpanded(!mediaExpanded)}
          actions={[
            {
              label: t("cachedData.clearAll"),
              icon: "delete-sweep",
              onPress: handleClearAllMedia,
              disabled: !mediaFiles.length,
            },
          ]}
        >
          <View>
            {mediaFolderStack.length === 0 ? (
              // Show root folder/file list
              mediaFiles.length ? (
                <FlashList
                  data={mediaFiles}
                  renderItem={renderMediaFileItem}
                  keyExtractor={keyByPath}
                  ItemSeparatorComponent={FlashListSeparator}
                  showsVerticalScrollIndicator={true}
                  style={{ maxHeight: 400 }}
                />
              ) : (
                <View style={styles.emptyState}>
                  <Text
                    variant="bodyLarge"
                    style={{ color: theme.colors.onSurfaceVariant }}
                  >
                    {t("cachedData.noMediaFiles")}
                  </Text>
                </View>
              )
            ) : (
              // Show files in current folder
              <View>
                <View style={styles.logFileHeader}>
                  <IconButton
                    icon="arrow-left"
                    size={20}
                    onPress={handleMediaGoBack}
                  />
                  <Text variant="titleSmall">
                    {mediaFolderStack[mediaFolderStack.length - 1]?.name} ({mediaFiles.length} files)
                  </Text>
                </View>
                {mediaFiles.length ? (
                  <FlashList
                    data={mediaFiles}
                    renderItem={renderMediaFileItem}
                    keyExtractor={keyByPath}
                    ItemSeparatorComponent={FlashListSeparator}
                    showsVerticalScrollIndicator={true}
                    style={{ maxHeight: 400 }}
                  />
                ) : (
                  <View style={styles.emptyState}>
                    <Text
                      variant="bodyLarge"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {t("cachedData.noFilesInFolder")}
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>
        </DetailCollapsibleSection>
      )}

      {/* Media Metadata Section */}
      <DetailCollapsibleSection
        title={t("cachedData.mediaMetadata")}
        icon="image-multiple-outline"
        subtitle={`${mediaItems.length} ${t("cachedData.cachedItems")}`}
        expanded={metadataExpanded}
        onToggleExpanded={() => setMetadataExpanded(!metadataExpanded)}
        actions={[
          {
            label: t("cachedData.clearAll"),
            icon: "delete-sweep",
            onPress: handleClearAllMetadata,
            disabled: !mediaItems.length,
          },
          {
            label: t("cachedData.export"),
            icon: "download",
            onPress: handleExportMetadata,
            disabled: !mediaItems.length,
          },
        ]}
      >
        {mediaItems.length ? (
          <FlashList
            data={mediaItems}
            renderItem={renderMediaMetadataItem}
            keyExtractor={keyByKey}
            ItemSeparatorComponent={FlashListSeparator}
            showsVerticalScrollIndicator={true}
            style={{ maxHeight: 400 }}
          />
        ) : (
          <View style={styles.emptyState}>
            <Text
              variant="bodyLarge"
              style={{ color: theme.colors.onSurfaceVariant }}
            >
              {t("cachedData.noMediaMetadata")}
            </Text>
          </View>
        )}
      </DetailCollapsibleSection>

      {/* Detail Modal */}
      <DetailModal
        visible={showDetailModal}
        onDismiss={() => setShowDetailModal(false)}
        title={
          selectedRecord?.type === "bucket"
            ? t("cachedData.bucketDetails")
            : selectedRecord?.type === "log"
              ? t("cachedData.logEntryDetails")
              : selectedRecord?.type === "setting"
                ? t("cachedData.settingDetails")
                : selectedRecord?.type === "media"
                  ? t("cachedData.mediaDetails")
                  : t("cachedData.notificationDetails")
        }
        icon={
          selectedRecord?.type === "bucket"
            ? "folder"
            : selectedRecord?.type === "log"
              ? "file-document-outline"
              : selectedRecord?.type === "setting"
                ? "cog"
                : selectedRecord?.type === "media"
                  ? "image"
                  : "bell"
        }
        actions={{
          cancel: {
            label: t("common.close"),
            onPress: () => setShowDetailModal(false),
          },
        }}
      >
        {selectedRecord && (
          <>
            {selectedRecord.type === "media" && (selectedRecord.data as CacheItem).url ? (
              <View>
                {/* View Mode Selector */}
                <SegmentedButtons
                  value={mediaViewMode}
                  onValueChange={(value) => setMediaViewMode(value as "json" | "media" | "thumbnail")}
                  buttons={[
                    {
                      value: "thumbnail",
                      label: t("cachedData.thumbnail"),
                      icon: "image-outline",
                    },
                    {
                      value: "media",
                      label: t("cachedData.full"),
                      icon: "image",
                    },
                    {
                      value: "json",
                      label: t("cachedData.json"),
                      icon: "code-json",
                    },
                  ]}
                  style={{ marginBottom: 16 }}
                />

                {/* Content based on view mode */}
                {mediaViewMode === "json" ? (
                  <ScrollView style={{ maxHeight: 500 }}>
                    <Text
                      variant="bodySmall"
                      style={{
                        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                        color: theme.colors.onSurface,
                      }}
                    >
                      {stringifyForDisplay(selectedRecord.data)}
                    </Text>
                  </ScrollView>
                ) : (
                  <View style={{ alignItems: "center" }}>
                    {(selectedRecord.data as CacheItem).localPath || (selectedRecord.data as CacheItem).localThumbPath ? (
                      <Image
                        source={{
                          uri: mediaViewMode === "thumbnail"
                            ? ((selectedRecord.data as CacheItem).localThumbPath || (selectedRecord.data as CacheItem).localPath)
                            : (selectedRecord.data as CacheItem).localPath
                        }}
                        style={{
                          width: mediaViewMode === "thumbnail" ? 200 : "100%",
                          height: mediaViewMode === "thumbnail" ? 200 : 400,
                          borderRadius: 8,
                        }}
                        contentFit={mediaViewMode === "thumbnail" ? "cover" : "contain"}
                        transition={200}
                        cachePolicy="none"
                        recyclingKey={`cached-data-${(selectedRecord.data as CacheItem).url}`}
                      />
                    ) : (
                      <View
                        style={{
                          width: mediaViewMode === "thumbnail" ? 200 : "100%",
                          height: mediaViewMode === "thumbnail" ? 200 : 400,
                          borderRadius: 8,
                          backgroundColor: theme.colors.surfaceVariant,
                          justifyContent: "center",
                          alignItems: "center",
                        }}
                      >
                        <Text
                          variant="bodyMedium"
                          style={{ color: theme.colors.onSurfaceVariant }}
                        >
                          {t("cachedData.mediaNotCached")}
                        </Text>
                      </View>
                    )}
                    <Text
                      variant="bodySmall"
                      style={{
                        marginTop: 12,
                        color: theme.colors.onSurfaceVariant,
                      }}
                    >
                      {(selectedRecord.data as CacheItem).originalFileName || t("cachedData.noFilename")}
                    </Text>
                    <Text
                      variant="bodySmall"
                      style={{
                        color: theme.colors.onSurfaceVariant,
                      }}
                    >
                      {(selectedRecord.data as CacheItem).mediaType} - {((selectedRecord.data as CacheItem).size / 1024).toFixed(2)} KB
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <ScrollView style={{ maxHeight: 500 }}>
                <Text
                  variant="bodySmall"
                  style={{
                    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                    color: theme.colors.onSurface,
                  }}
                >
                  {stringifyForDisplay(selectedRecord.data)}
                </Text>
              </ScrollView>
            )}
          </>
        )}
      </DetailModal>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  description: {
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  card: {
    marginBottom: 16,
  },
  itemCard: {
    borderRadius: 8,
  },
  itemCardContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 8,
  },
  itemInfo: {
    flex: 1,
    marginRight: 8,
  },
  itemActions: {
    flexDirection: "row",
    alignItems: "center",
  },
  logFileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    paddingLeft: 0,
  },
  emptyState: {
    paddingVertical: 32,
    alignItems: "center",
    justifyContent: "center",
  },
});
