import { useI18n } from "@/hooks/useI18n";
import {
  AppLog,
  clearAllLogs,
  getLogsDirectory,
  readLogs,
} from "@/services/logger";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import CopyButton from "./ui/CopyButton";
import PaperScrollView from "./ui/PaperScrollView";
import Multiselect from "./ui/Multiselect";
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
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [sourceOptions, setSourceOptions] = useState<
    { id: string; name: string }[]
  >([]);

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

      for (const file of files) {
        const fileName = file.name;
        // Su web, accetta tutti i file JSON
        // Su native, cerca solo nella cartella logs
        if (Platform.OS === 'web') {
          if (fileName.endsWith(".json")) {
            const source = fileName.split(".")[0];
            sources.push(source);
          }
        } else {
          // Su native, i file sono già in logs/ quindi filtra solo .json
          if (fileName.endsWith(".json")) {
            const source = fileName.split(".")[0];
            sources.push(source);
          }
        }
      }

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

  const handleShowLog = useCallback((log: AppLog) => {
    setSelectedLog(log);
    setShowLogDialog(true);
  }, []);

  const handleCloseLogDialog = useCallback(() => {
    setShowLogDialog(false);
    setSelectedLog(null);
  }, []);

  useEffect(() => {
    loadLogs();
    loadSourceOptions();
  }, []);

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

  const { levelOptions } = useMemo(() => {
    const uniqueLevels = new Set<string>();

    logs.forEach((log) => {
      uniqueLevels.add(log.level.trim().toUpperCase());
    });

    return {
      levelOptions: Array.from(uniqueLevels).map((level) => ({
        id: level,
        name: level,
      })),
    };
  }, [logs]);

  const filteredLogs = useMemo(() => {
    // Filter out logs with empty messages first
    let validLogs = logs.filter((l) => l.message && l.message.trim() !== "");

    if (levelFilters.length > 0) {
      validLogs = validLogs.filter((l) => 
        levelFilters.includes(l.level.trim().toUpperCase())
      );
    }

    if (sourceFilters.length > 0) {
      validLogs = validLogs.filter((l) => 
        sourceFilters.includes(l.source ?? "")
      );
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

  // Group logs by 5-minute intervals
  const groupedLogs = useMemo(() => {
    const groups: { timeLabel: string; logs: AppLog[] }[] = [];
    const groupMap = new Map<string, AppLog[]>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    filteredLogs.forEach((log) => {
      const date = new Date(log.timestamp);
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      date.setMinutes(roundedMinutes, 0, 0);
      
      const timeKey = date.toISOString();
      
      // Check if the log is from today
      const logDate = new Date(log.timestamp);
      logDate.setHours(0, 0, 0, 0);
      const isToday = logDate.getTime() === today.getTime();
      
      // Format time label with date if not today
      let timeLabel = date.toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
      
      if (!isToday) {
        const dateLabel = date.toLocaleDateString([], {
          month: 'short',
          day: 'numeric'
        });
        timeLabel = `${dateLabel}, ${timeLabel}`;
      }

      if (!groupMap.has(timeKey)) {
        groupMap.set(timeKey, []);
        groups.push({ timeLabel, logs: groupMap.get(timeKey)! });
      }
      groupMap.get(timeKey)!.push(log);
    });

    return groups;
  }, [filteredLogs]);

  const renderLogItem = useCallback(
    (log: AppLog) => {
      return (
        <TouchableOpacity
          key={log.id}
          style={[
            styles.logItem,
            {
              borderBottomColor: theme.colors.surfaceVariant,
            },
          ]}
          onPress={() => handleShowLog(log)}
          activeOpacity={0.7}
        >
          <View style={styles.logLine}>
            <View
              style={[
                styles.levelIndicator,
                { backgroundColor: levelToColor[log.level] },
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
              numberOfLines={2}
            >
              {log.source ? `[${log.source}] ` : ""}
              {log.message}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme.colors, levelToColor, handleShowLog]
  );

  const renderItem = useCallback(
    ({ item }: { item: { timeLabel: string; logs: AppLog[] } }) => {
      return (
        <View style={styles.logGroup}>
          <Text style={[styles.timeGroupLabel, { color: theme.colors.onSurfaceVariant }]}>
            {item.timeLabel}
          </Text>
          {item.logs.map((log) => renderLogItem(log))}
        </View>
      );
    },
    [theme.colors, renderLogItem]
  );

  const handleExportLogs = useCallback(async () => {
    try {
      setIsExporting(true);
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
      setIsExporting(false);
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
              setIsClearing(true);
              await clearAllLogs();
              await loadLogs();
            } catch (error) {
              console.error("Error clearing logs:", error);
              Alert.alert(
                t("appSettings.logs.clearError"),
                t("appSettings.logs.clearErrorMessage")
              );
            } finally {
              setIsClearing(false);
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

      <FlatList
        data={groupedLogs}
        keyExtractor={(item) => item.timeLabel}
        renderItem={renderItem}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFromDb}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
      />

      {/* Log Detail Modal */}
      <Modal
        visible={showLogDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCloseLogDialog}
      >
        <View style={[styles.modalBackdrop]}>
          <View
            style={[
              styles.dialogContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.dialogHeader}>
              <Text
                style={[styles.dialogTitle, { color: theme.colors.onSurface }]}
              >
                {t("appLogs.logDetailsTitle")}
              </Text>
              <TouchableOpacity onPress={handleCloseLogDialog}>
                <Icon source="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dialogContent}>
              {selectedLog && (
                <>
                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("appLogs.fields.level")}:
                    </Text>
                    <Text
                      selectable
                      style={[
                        styles.dialogMetaValue,
                        {
                          color: levelToColor[selectedLog.level],
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {selectedLog.level.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("appLogs.fields.timestamp")}:
                    </Text>
                    <Text selectable style={styles.dialogMetaValue}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </Text>
                  </View>

                  {selectedLog.source && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>Source:</Text>
                      <Text selectable style={styles.dialogMetaValue}>
                        {selectedLog.source}
                      </Text>
                    </View>
                  )}

                  {selectedLog.tag && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {t("appLogs.fields.tag")}:
                      </Text>
                      <Text selectable style={styles.dialogMetaValue}>
                        {selectedLog.tag}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("appLogs.fields.message")}:
                    </Text>
                    <TextInput
                      value={selectedLog.message}
                      multiline
                      editable={false}
                      style={[
                        styles.fieldInput,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline,
                          color: theme.colors.onSurface,
                        },
                      ]}
                    />
                  </View>

                  {selectedLog.metadata && (
                    <View style={styles.metadataSection}>
                      <View style={styles.metadataHeader}>
                        <Text style={styles.dialogMetaLabel}>
                          {t("appLogs.fields.meta")}:
                        </Text>
                        <CopyButton
                          text={JSON.stringify(selectedLog.metadata, null, 2)}
                          size={18}
                        />
                      </View>
                      <TextInput
                        value={JSON.stringify(selectedLog.metadata, null, 2)}
                        multiline
                        editable={false}
                        scrollEnabled
                        style={[
                          styles.metadataInput,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                            color: theme.colors.onSurface,
                          },
                        ]}
                      />
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </PaperScrollView>
  );
}

function truncate(text: string, max: number = 300): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
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
  listContent: {
    paddingVertical: 8,
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
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  logLine: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelIndicator: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  dialogContainer: {
    width: "100%",
    maxWidth: 600,
    maxHeight: "80%",
    borderRadius: 16,
  },
  dialogHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  dialogTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  dialogContent: {
    padding: 16,
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
  timeGroupLabel: {
    fontSize: 11,
    fontWeight: "600",
    paddingHorizontal: 12,
    paddingVertical: 6,
    opacity: 0.7,
  },
});
