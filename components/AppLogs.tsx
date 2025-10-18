import { useI18n } from "@/hooks/useI18n";
import { AppLog, clearAllLogs, readLogs } from "@/services/logger";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { Icon, Surface, Text, useTheme } from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import PaperScrollView from "./ui/PaperScrollView";
import Selector, { SelectorOption } from "./ui/Selector";

export default function AppLogs() {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [levelFilter, setLevelFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);

  const isOperationInProgress = isExporting || isClearing;

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
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
  }, [loadLogs]);

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

  // Extract unique levels and sources from logs in a single pass
  const { levelOptions, sourceOptions } = useMemo(() => {
    const uniqueLevels = new Set<string>();
    const uniqueSources = new Set<string>();

    logs.forEach((log) => {
      uniqueLevels.add(log.level);
      if (log.source && log.source.trim() !== "") {
        uniqueSources.add(log.source);
      }
    });

    return {
      levelOptions: Array.from(uniqueLevels).map((level) => ({
        id: level,
        name: level.toUpperCase(),
      })),
      sourceOptions: Array.from(uniqueSources).map((source) => ({
        id: source,
        name: source,
      })),
    };
  }, [logs]);

  const renderItem = useCallback(
    ({ item }: { item: AppLog }) => {
      const meta = item.metadata;

      const hasLongContent =
        item.message.length > 100 ||
        (meta && JSON.stringify(meta).length > 200);

      return (
        <TouchableOpacity
          style={[
            styles.logItem,
            {
              borderColor: theme.colors.outline,
              backgroundColor: theme.colors.surface,
            },
          ]}
          onPress={() => handleShowLog(item)}
          activeOpacity={0.7}
        >
          <View style={styles.logHeader}>
            <View style={styles.levelBadgeContainer}>
              <View
                style={[
                  styles.levelBadge,
                  { backgroundColor: levelToColor[item.level] },
                ]}
              />
              <Text style={styles.levelText}>{item.level.toUpperCase()}</Text>
            </View>
            <View style={styles.headerRight}>
              <Text style={styles.dateText}>
                {new Date(item.timestamp).toLocaleString()}
              </Text>
              {!!item.source && (
                <Text
                  style={[styles.sourceText, { color: theme.colors.primary }]}
                >
                  [{item.source}]
                </Text>
              )}
              {hasLongContent && (
                <Icon
                  source="open-in-new"
                  size={16}
                  color={theme.colors.primary}
                />
              )}
            </View>
          </View>
          {!!item.tag && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>tag:</Text>
              <Text style={styles.metaValue}>{item.tag}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>message:</Text>
            <Text style={styles.metaValue}>{truncate(item.message, 150)}</Text>
          </View>
          {!!meta && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>meta:</Text>
              <Text style={styles.metaValue}>
                {truncate(JSON.stringify(meta), 150)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [theme.colors, levelToColor, handleShowLog]
  );

  const filteredLogs = useMemo(() => {
    // Filter out logs with empty messages first
    let validLogs = logs.filter((l) => l.message && l.message.trim() !== "");

    // Apply level filter
    if (levelFilter) {
      validLogs = validLogs.filter((l) => l.level === levelFilter);
    }

    // Apply source filter
    if (sourceFilter) {
      validLogs = validLogs.filter((l) => l.source === sourceFilter);
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
  }, [logs, query, levelFilter, sourceFilter]);

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
              Alert.alert(
                t("appSettings.logs.clearSuccess"),
                t("appSettings.logs.clearSuccessMessage")
              );
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
          <Selector
            placeholder={t("appLogs.filters.allLevels")}
            options={levelOptions}
            selectedValue={levelFilter}
            onValueChange={setLevelFilter}
            mode="inline"
          />
        </View>
        <View style={styles.filterItem}>
          <Selector
            placeholder={t("appLogs.filters.allSources")}
            options={sourceOptions}
            selectedValue={sourceFilter}
            onValueChange={setSourceFilter}
            mode="inline"
          />
        </View>
      </View>

      <FlatList
        data={filteredLogs}
        keyExtractor={(item) => String(item.id ?? item.timestamp)}
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
                    <Text style={styles.dialogMetaValue}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </Text>
                  </View>

                  {selectedLog.tag && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {t("appLogs.fields.tag")}:
                      </Text>
                      <Text style={styles.dialogMetaValue}>
                        {selectedLog.tag}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("appLogs.fields.message")}:
                    </Text>
                    <Text style={styles.dialogMetaValue}>
                      {selectedLog.message}
                    </Text>
                  </View>

                  {selectedLog.source && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>Source:</Text>
                      <Text style={styles.dialogMetaValue}>
                        {selectedLog.source}
                      </Text>
                    </View>
                  )}

                  {selectedLog.metadata && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {t("appLogs.fields.meta")}:
                      </Text>
                      <Text style={styles.dialogMetaValue}>
                        {JSON.stringify(selectedLog.metadata, null, 2)}
                      </Text>
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
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
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
    overflow: "hidden",
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
  loadingFab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
