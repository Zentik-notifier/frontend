import { useI18n } from "@/hooks/useI18n";
import {
  AppLog,
  clearAllLogs,
  getLogsDirectory,
  readLogs,
} from "@/services/logger";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
  NativeEventEmitter,
  NativeModules,
} from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import Multiselect from "./ui/Multiselect";
import LogRowCollapsible from "./ui/LogRowCollapsible";
import {
  LogsListLayout,
  type LogsListItem,
  type LogsListItemLog,
} from "./ui/LogsListLayout";
import { Directory } from "@/utils/filesystem-wrapper";

export default function AppLogs() {
  const { t } = useI18n();
  const theme = useTheme();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [levelFilters, setLevelFilters] = useState<string[]>([]);
  const [sourceFilters, setSourceFilters] = useState<string[]>([]);
  // const [isExporting, setIsExporting] = useState<boolean>(false);
  // const [isClearing, setIsClearing] = useState<boolean>(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [sourceOptions, setSourceOptions] = useState<
    { id: string; name: string }[]
  >([]);
  const [watchLogsTransferProgress, setWatchLogsTransferProgress] = useState<{
    currentBatch: number;
    totalBatches: number;
    logsInBatch: number;
    phase: string;
  } | null>(null);
  const listRef = useRef<{ scrollToOffset: (params: { offset: number; animated?: boolean }) => void } | null>(null);

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [query, levelFilters, sourceFilters]);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load all logs (from all sources)
      const all = await readLogs(0);
      setLogs(all);
    } catch (e) {
      console.warn("Failed to load logs", e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);
  // console.log({ isLoading, logs });

  const loadSourceOptions = useCallback(async () => {
    try {
      const dirUrl = await getLogsDirectory();
      const dir = new Directory(dirUrl);
      const files = await dir.list();
      const sources: string[] = [];

      console.log('[AppLogs] Files in logs directory:', files.map(f => f.name));

      for (const file of files) {
        const fileName = file.name;
        // Skip directories and non-JSON files
        if (!fileName.endsWith(".json") || fileName.includes('_corrupted_')) {
          continue;
        }
        
        const source = fileName.replace('.json', '');
        if (source && !sources.includes(source)) {
          sources.push(source);
        }
      }

      console.log('[AppLogs] Found sources:', sources);

      const options = sources.map((source) => ({
        id: source,
        name: source,
      }));
      setSourceOptions(options);
    } catch (error) {
      console.error("Error loading source options:", error);
      setSourceOptions([]);
    }
  }, []);

  const refreshFromDb = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadLogs();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLogs]);

  const toggleLogExpand = useCallback((logId: string) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  }, []);

  useEffect(() => {
    loadLogs();
    loadSourceOptions();
  }, []);

  // Listen to watch logs transfer progress events
  useEffect(() => {
    if (Platform.OS !== 'ios' || !NativeModules.CloudKitSyncBridge) {
      return;
    }

    const eventEmitter = new NativeEventEmitter(NativeModules.CloudKitSyncBridge);

    const handleWatchLogsTransferProgress = (event: {
      currentBatch: number;
      totalBatches: number;
      logsInBatch: number;
      phase: string;
    }) => {
      setWatchLogsTransferProgress(event);
      
      // Clear progress when transfer is completed or error
      if (event.phase === 'completed' || event.phase === 'error') {
        setTimeout(() => {
          setWatchLogsTransferProgress(null);
          // Reload logs and source options to show the new Watch.json file
          loadLogs();
          loadSourceOptions();
        }, 2000);
      }
    };

    const subscription = eventEmitter.addListener('watchLogsTransferProgress', handleWatchLogsTransferProgress);

    return () => {
      subscription.remove();
    };
  }, []); // Empty deps - loadLogs and loadSourceOptions are stable callbacks

  const levelToColor = useMemo(
    () =>
      ({
        debug: theme.colors.onSurfaceVariant,
        info: theme.colors.primary,
        warn: theme.colors.error,
        error: theme.colors.error,
      } as const),
    [theme.colors]
  );

  const levelOptions = useMemo(
    () =>
      ["DEBUG", "INFO", "WARN", "ERROR"].map((level) => ({
        id: level,
        name: level,
      })),
    []
  );

  const filteredLogs = useMemo(() => {
    // Filter out logs with empty messages first
    let validLogs = logs.filter((l) => l.message && l.message.trim() !== "");

    if (levelFilters.length > 0) {
      validLogs = validLogs.filter((l) => 
        levelFilters.includes(l.level.trim().toUpperCase())
      );
    }

    if (sourceFilters.length > 0) {
      validLogs = validLogs.filter((l) => {
        const logSource = l.source ?? "";
        // Special handling for "Watch" source: include logs with source "Watch", "CloudKitWatch", or starting with "Watch"
        return sourceFilters.some(filterSource => {
          if (filterSource === "Watch") {
            return logSource === "Watch" || logSource === "CloudKitWatch" || logSource.startsWith("Watch");
          }
          return logSource === filterSource;
        });
      });
    }

    // Apply search query
    if (!query) return validLogs;

    const q = query.toLowerCase();
    return validLogs.filter((l) => {
      const parts = [
        l.level,
        l.tag ?? "",
        l.message,
        l.source ?? "",
        l.metadata ? JSON.stringify(l.metadata) : "",
      ];
      return parts.some((p) => (p ?? "").toString().toLowerCase().includes(q));
    });
  }, [logs, query, levelFilters, sourceFilters]);

  const flatListData = useMemo((): LogsListItem<AppLog>[] => {
    const groupOrder: string[] = [];
    const groupMap = new Map<string, { timeLabel: string; logs: AppLog[] }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < filteredLogs.length; i++) {
      const log = filteredLogs[i];
      const date = new Date(log.timestamp);
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      date.setMinutes(roundedMinutes, 0, 0);
      const timeKey = date.toISOString();

      if (!groupMap.has(timeKey)) {
        const logDate = new Date(log.timestamp);
        logDate.setHours(0, 0, 0, 0);
        const isToday = logDate.getTime() === today.getTime();
        let timeLabel = date.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
        if (!isToday) {
          const dateLabel = date.toLocaleDateString([], {
            month: "short",
            day: "numeric",
          });
          timeLabel = `${dateLabel}, ${timeLabel}`;
        }
        groupMap.set(timeKey, { timeLabel, logs: [] });
        groupOrder.push(timeKey);
      }
      groupMap.get(timeKey)!.logs.push(log);
    }

    const flat: LogsListItem<AppLog>[] = [];
    for (let i = 0; i < groupOrder.length; i++) {
      const timeKey = groupOrder[i];
      const g = groupMap.get(timeKey)!;
      flat.push({ type: "header", id: `h-${timeKey}`, timeLabel: g.timeLabel });
      for (let j = 0; j < g.logs.length; j++) {
        const log = g.logs[j];
        flat.push({ type: "log", id: log.id, log });
      }
    }
    return flat;
  }, [filteredLogs]);

  const renderLogRow = useCallback(
    (item: LogsListItemLog<AppLog>) => {
      const log = item.log;
      const isExpanded = expandedLogId === log.id;
      const headerLine = `${new Date(log.timestamp).toLocaleString()} (${log.level.toUpperCase()}) - [${log.source ?? ""}]${log.tag ? ` [${log.tag}]` : ""}`;
      return (
        <View style={styles.logItem}>
          <LogRowCollapsible
            id={log.id}
            isExpanded={isExpanded}
            onToggle={() => toggleLogExpand(log.id)}
            headerLine={headerLine}
            jsonObject={log}
            expandOpensDown
            summaryContent={
              <View style={styles.logSummary}>
                <View style={styles.logPillsRow}>
                  {log.source ? (
                    <View
                      style={[
                        styles.logPill,
                        { backgroundColor: theme.colors.surfaceVariant },
                      ]}
                    >
                      <Text
                        style={[
                          styles.logPillText,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                        numberOfLines={1}
                      >
                        {log.source}
                      </Text>
                    </View>
                  ) : null}
                  {log.tag ? (
                    <View
                      style={[
                        styles.logPill,
                        { backgroundColor: theme.colors.secondaryContainer },
                      ]}
                    >
                      <Text
                        style={[
                          styles.logPillText,
                          { color: theme.colors.onSecondaryContainer },
                        ]}
                        numberOfLines={1}
                      >
                        {log.tag}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.logLine}>
                  <View
                    style={[
                      styles.levelIndicator,
                      { backgroundColor: levelToColor[log.level] ?? theme.colors.onSurfaceVariant },
                    ]}
                  />
                  <Text
                    style={[
                      styles.logText,
                      {
                        fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
                        color: theme.colors.onSurface,
                      },
                    ]}
                    numberOfLines={isExpanded ? undefined : 2}
                  >
                    {log.message}
                  </Text>
                </View>
              </View>
            }
          />
        </View>
      );
    },
    [theme.colors, levelToColor, expandedLogId, toggleLogExpand]
  );

  const handleExportLogs = useCallback(async () => {
    try {
      // setIsExporting(true);
      const logs = await readLogs(0);

      const formattedLogs = logs.map((l: any) => ({
        ...l,
        timeLocal: new Date(Number(l.timestamp)).toLocaleString(),
      }));

      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          count: formattedLogs.length,
        },
        logs: formattedLogs,
      };

      const json = JSON.stringify(payload, null, 2);
      const fileName = `app-logs-${new Date()
        .toISOString()
        .replace(/[:]/g, "-")}.json`;
      const destPath = `${Paths.document.uri}${fileName}`;
      const file = new File(destPath);
      file.write(json, {});

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destPath, {
          mimeType: "application/json",
          dialogTitle: t("appSettings.logs.exportComplete"),
        });
      } else {
        Alert.alert(
          t("appSettings.logs.exportComplete"),
          t("appSettings.logs.exportCompleteMessage", { path: destPath })
        );
      }
      try {
        file.delete();
      } catch {}
    } catch (error) {
      console.error("Error exporting logs:", error);
      Alert.alert(t("appSettings.logs.exportError"));
    } finally {
      // setIsExporting(false);
    }
  }, [t]);

  const handleClearLogs = useCallback(async () => {
    Alert.alert(
      t("appSettings.logs.clearTitle"),
      t("appSettings.logs.clearMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("appSettings.logs.clearConfirm"),
          style: "destructive",
          onPress: async () => {
            try {
              // setIsClearing(true);
              await clearAllLogs();
              await loadLogs();
            } catch (error) {
              console.error("Error clearing logs:", error);
              Alert.alert(
                t("appSettings.logs.clearError"),
                t("appSettings.logs.clearErrorMessage")
              );
            } finally {
              // setIsClearing(false);
            }
          },
        },
      ]
    );
  }, [t, loadLogs]);

  return (
    <PaperScrollView
      onRefresh={refreshFromDb}
      withScroll={false}
      loading={isLoading}
      customActions={[
        {
          icon: "delete",
          label: t("appSettings.logs.clearButton"),
          onPress: handleClearLogs,
          style: { backgroundColor: theme.colors.errorContainer },
        },
        {
          icon: "share",
          label: t("appSettings.logs.exportButton"),
          onPress: handleExportLogs,
          style: { backgroundColor: theme.colors.primaryContainer },
        },
      ]}
    >
      <Surface style={[styles.searchContainer]}>
        <Icon source="magnify" size={20} color="#666" />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholder={t("appLogs.filterPlaceholder")}
          placeholderTextColor={theme.colors.onSurfaceVariant}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery("")}
            style={styles.clearBtn}
          >
            <Icon source="close" size={20} color="#666" />
          </TouchableOpacity>
        )}
      </Surface>

      {/* Filters row */}
      <View style={styles.filtersContainer}>
        <View style={styles.filterItem}>
          <Multiselect
            placeholder={t("appLogs.filters.allLevels")}
            options={levelOptions}
            selectedValues={levelFilters}
            onValuesChange={setLevelFilters}
            mode="inline"
            maxChipsToShow={2}
            showSelectAll={false}
          />
        </View>
        <View style={styles.filterItem}>
          <Multiselect
            placeholder={t("appLogs.filters.allSources")}
            options={sourceOptions}
            selectedValues={sourceFilters}
            onValuesChange={setSourceFilters}
            mode="inline"
            maxChipsToShow={2}
            showSelectAll={false}
          />
        </View>
      </View>

      {/* Watch Logs Transfer Progress */}
      {watchLogsTransferProgress && (
        <Surface
          style={[
            styles.infoBadge,
            { 
              backgroundColor: theme.colors.primaryContainer,
              marginBottom: 8,
            },
          ]}
        >
          <Icon
            source="cloud-upload"
            size={16}
            color={theme.colors.primary}
          />
          <View style={{ flex: 1, marginLeft: 8 }}>
            <Text
              style={[
                styles.infoBadgeText,
                { 
                  color: theme.colors.onPrimaryContainer,
                  fontWeight: '600',
                },
              ]}
            >
              {watchLogsTransferProgress.phase === 'starting' && t("appLogs.watchLogsTransfer.starting")}
              {watchLogsTransferProgress.phase === 'transferring' && t("appLogs.watchLogsTransfer.transferring", {
                current: watchLogsTransferProgress.currentBatch,
                total: watchLogsTransferProgress.totalBatches
              })}
              {watchLogsTransferProgress.phase === 'receiving' && t("appLogs.watchLogsTransfer.receiving", {
                current: watchLogsTransferProgress.currentBatch,
                total: watchLogsTransferProgress.totalBatches
              })}
              {watchLogsTransferProgress.phase === 'receiving_last' && t("appLogs.watchLogsTransfer.receivingLast")}
              {watchLogsTransferProgress.phase === 'completed' && t("appLogs.watchLogsTransfer.completed")}
              {watchLogsTransferProgress.phase === 'error' && t("appLogs.watchLogsTransfer.error")}
            </Text>
            {watchLogsTransferProgress.totalBatches > 0 && watchLogsTransferProgress.phase !== 'completed' && watchLogsTransferProgress.phase !== 'error' && (
              <View style={{ marginTop: 4 }}>
                <View style={{ 
                  height: 4, 
                  backgroundColor: theme.colors.surfaceVariant, 
                  borderRadius: 2,
                  overflow: 'hidden'
                }}>
                  <View style={{ 
                    height: '100%', 
                    width: `${(watchLogsTransferProgress.currentBatch / watchLogsTransferProgress.totalBatches) * 100}%`,
                    backgroundColor: theme.colors.primary,
                    borderRadius: 2
                  }} />
                </View>
                <Text style={{ 
                  fontSize: 11,
                  color: theme.colors.onPrimaryContainer,
                  marginTop: 2,
                  opacity: 0.8
                }}>
                  {t("appLogs.watchLogsTransfer.batches", {
                    current: watchLogsTransferProgress.currentBatch,
                    total: watchLogsTransferProgress.totalBatches
                  })}
                </Text>
              </View>
            )}
          </View>
        </Surface>
      )}

      {/* Info badge showing logs stats */}
      {sourceOptions.length > 0 && (
        <Surface
          style={[
            styles.infoBadge,
            { backgroundColor: theme.colors.surfaceVariant },
          ]}
        >
          <Icon
            source="information"
            size={16}
            color={theme.colors.onSurfaceVariant}
          />
          <Text
            style={[
              styles.infoBadgeText,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {sourceFilters.length > 0
              ? `${filteredLogs.length} logs from ${sourceFilters.length} source${sourceFilters.length !== 1 ? "s" : ""}`
              : `${filteredLogs.length} logs from ${
                  sourceOptions.length
                } source${sourceOptions.length !== 1 ? "s" : ""}`}
          </Text>
        </Surface>
      )}

      <LogsListLayout<AppLog>
        listRef={listRef}
        data={flatListData}
        renderLogRow={renderLogRow}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFromDb}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 40,
  },
  clearBtn: {
    padding: 4,
  },
  filtersContainer: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  filterItem: {
    flex: 1,
  },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  infoBadgeText: {
    fontSize: 12,
    fontWeight: "500",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  logItem: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  logSummary: {
    gap: 4,
  },
  logPillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 4,
  },
  logPill: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  logPillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  logLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  levelIndicator: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  logText: {
    flex: 1,
    fontSize: 11,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  expandIcon: {
    marginLeft: 4,
  },
  levelBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.85,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: "600",
    marginRight: 8,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.75,
    minWidth: 64,
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    opacity: 0.9,
  },
  dialogMetaRow: {
    marginBottom: 12,
  },
  dialogMetaLabel: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.7,
  },
  dialogMetaValue: {
    fontSize: 13,
    opacity: 0.9,
  },
  fieldInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 80,
    maxHeight: 200,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    textAlignVertical: "top",
  },
  metadataSection: {
    marginTop: 8,
  },
  metadataHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  metadataInput: {
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 300,
    minHeight: 100,
    fontFamily: "monospace",
    fontSize: 12,
    lineHeight: 18,
    padding: 12,
    textAlignVertical: "top",
  },
  loadingFab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
  logGroup: {
    marginBottom: 16,
  },
});
