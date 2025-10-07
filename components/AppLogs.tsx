import { useI18n } from "@/hooks/useI18n";
import { AppLog, clearAllLogs, readLogs } from "@/services/logger";
import { FlashList } from "@shopify/flash-list";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  FAB,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function AppLogs() {
  const { t } = useI18n();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [isClearing, setIsClearing] = useState<boolean>(false);
  const [selectedLog, setSelectedLog] = useState<AppLog | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [fabOpen, setFabOpen] = useState<boolean>(false);
  
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

  const renderItem = useCallback(
    ({ item }: { item: AppLog }) => {
      let meta: any = null;
      try {
        meta = item.metaJson ? JSON.parse(item.metaJson) : null;
      } catch {}

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
    if (!query) return logs;
    const q = query.toLowerCase();
    return logs.filter((l) => {
      const parts = [l.level, l.tag ?? "", l.message, l.metaJson ?? ""];
      return parts.some((p) => (p ?? "").toString().toLowerCase().includes(q));
    });
  }, [logs, query]);

  const handleExportLogs = useCallback(async () => {
    try {
      setIsExporting(true);
      setFabOpen(false);
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
    setFabOpen(false);
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
    <View style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.container}>
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

        {isLoading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t("appLogs.loading")}</Text>
          </View>
        ) : (
          <FlashList
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
        )}
      </Surface>

      {/* Log Detail Modal */}
      <Modal
        visible={showLogDialog}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseLogDialog}
      >
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.modalContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            {/* Header */}
            <View
              style={[
                styles.modalHeader,
                { borderBottomColor: theme.colors.outline },
              ]}
            >
              {/* Level badge a sinistra */}
              <View style={styles.levelBadgeContainer}>
                <View
                  style={[
                    styles.levelBadge,
                    {
                      backgroundColor: selectedLog
                        ? levelToColor[selectedLog.level]
                        : theme.colors.primary,
                    },
                  ]}
                />
                <Text style={styles.levelText}>
                  {selectedLog?.level.toUpperCase()}
                </Text>
              </View>

              {/* Data in mezzo */}
              <View style={styles.dateContainer}>
                <Text style={styles.dialogDate}>
                  {selectedLog
                    ? new Date(selectedLog.timestamp).toLocaleString()
                    : ""}
                </Text>
              </View>

              {/* Close button a destra */}
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseLogDialog}
                accessibilityLabel={t("common.close")}
              >
                <Icon source="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            {/* Content */}
            <ScrollView
              style={styles.modalContent}
              showsVerticalScrollIndicator={true}
              indicatorStyle="default"
            >
              {selectedLog && (
                <>
                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>Message:</Text>
                    <Text style={styles.dialogMetaValue}>
                      {selectedLog.message}
                    </Text>
                  </View>

                  {selectedLog.metaJson && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>Meta:</Text>
                      <Text style={styles.dialogMetaValue}>
                        {JSON.stringify(
                          JSON.parse(selectedLog.metaJson),
                          null,
                          2
                        )}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* FAB Group */}
      <FAB.Group
        open={fabOpen}
        visible={!isOperationInProgress}
        icon={fabOpen ? "close" : "cog"}
        actions={[
          {
            icon: "share",
            label: t("appSettings.logs.exportButton"),
            onPress: handleExportLogs,
            style: { backgroundColor: theme.colors.primaryContainer },
          },
          {
            icon: "delete",
            label: t("appSettings.logs.clearButton"),
            onPress: handleClearLogs,
            style: { backgroundColor: theme.colors.errorContainer },
          },
        ]}
        onStateChange={({ open }) => setFabOpen(open)}
        fabStyle={{
          backgroundColor: theme.colors.primaryContainer,
        }}
      />

      {/* Loading FAB */}
      {isOperationInProgress && (
        <FAB
          icon={() => <ActivityIndicator size="small" color={theme.colors.onPrimaryContainer} />}
          style={[
            styles.loadingFab,
            { backgroundColor: theme.colors.primaryContainer }
          ]}
          disabled
        />
      )}
    </View>
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
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    minHeight: "30%",
    maxHeight: "30%",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    minHeight: 80,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
  },
  closeButton: {
    padding: 8,
  },
  dateContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  dialogDate: {
    fontSize: 14,
    opacity: 0.7,
  },
  dialogContent: {
    maxHeight: 400,
    paddingHorizontal: 16,
  },
  dialogMetaRow: {
    marginBottom: 16,
  },
  dialogMetaLabel: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 4,
    opacity: 0.8,
  },
  dialogMetaValue: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: "monospace",
    backgroundColor: "rgba(0,0,0,0.05)",
    padding: 8,
    borderRadius: 4,
  },
  loadingFab: {
    position: "absolute",
    right: 16,
    bottom: 16,
  },
});
