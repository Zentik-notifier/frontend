import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useMemo, useState } from "react";
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
import {
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import {
  useGetServerLogsQuery,
  useTriggerLogCleanupMutation,
} from "@/generated/gql-operations-generated";
import PaperScrollView from "./ui/PaperScrollView";
import CopyButton from "./ui/CopyButton";

interface ServerLog {
  id: string;
  level: string;
  message: string;
  context?: string;
  trace?: string;
  metadata?: any;
  timestamp: string;
  createdAt: string;
}

export default function ServerLogs() {
  const { t } = useI18n();
  const theme = useTheme();
  const [query, setQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ServerLog | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  // GraphQL queries
  const { data, loading, refetch } =
    useGetServerLogsQuery({
      variables: {
        input: {
          page: 1,
          limit: 500,
          search: query || undefined,
          level: levelFilter as any,
        },
      },
      fetchPolicy: "cache-and-network",
      notifyOnNetworkStatusChange: true,
    });

  const [triggerCleanup] = useTriggerLogCleanupMutation();

  const logs = useMemo(() => {
    return (data?.logs?.logs as ServerLog[]) || [];
  }, [data]);

  const handleShowLog = useCallback((log: ServerLog) => {
    setSelectedLog(log);
    setShowLogDialog(true);
  }, []);

  const handleCloseLogDialog = useCallback(() => {
    setShowLogDialog(false);
    setSelectedLog(null);
  }, []);

  const levelToColor = useMemo(
    () =>
      ({
        debug: theme.colors.onSurfaceVariant,
        info: theme.colors.primary,
        warn: theme.colors.error,
        error: theme.colors.error,
        http: theme.colors.primary,
        verbose: theme.colors.onSurfaceVariant,
        silly: theme.colors.onSurfaceVariant,
      } as const),
    [theme.colors]
  );

  const handleCleanupLogs = useCallback(async () => {
    Alert.alert(t("serverLogs.cleanupTitle"), t("serverLogs.cleanupMessage"), [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("serverLogs.cleanupConfirm"),
        style: "destructive",
        onPress: async () => {
          try {
            await triggerCleanup();
            await refetch();
            Alert.alert(
              t("serverLogs.cleanupSuccess"),
              t("serverLogs.cleanupSuccessMessage")
            );
          } catch (error) {
            console.error("Error cleaning up logs:", error);
            Alert.alert(
              t("serverLogs.cleanupError"),
              t("serverLogs.cleanupErrorMessage")
            );
          }
        },
      },
    ]);
  }, [t, triggerCleanup, refetch]);

  const refreshFromDb = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch({
        input: {
          page: 1,
          limit: 500,
          search: query || undefined,
          level: levelFilter as any,
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, query, levelFilter]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => l.message && l.message.trim() !== "");
  }, [logs]);

  // Group logs by 5-minute intervals (same as AppLogs)
  const groupedLogs = useMemo(() => {
    const groups: { id: string; timeLabel: string; logs: ServerLog[] }[] = [];
    const groupMap = new Map<string, ServerLog[]>();
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
        groups.push({ id: timeKey, timeLabel, logs: groupMap.get(timeKey)! });
      }
      groupMap.get(timeKey)!.push(log);
    });

    return groups;
  }, [filteredLogs]);

  const renderLogItem = useCallback(
    (log: ServerLog) => {
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
                { backgroundColor: levelToColor[log.level as keyof typeof levelToColor] || theme.colors.onSurfaceVariant },
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
              {log.context ? `[${log.context}] ` : ""}
              {log.message}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme.colors, levelToColor, handleShowLog]
  );

  const renderItem = useCallback(
    ({ item }: { item: { id: string; timeLabel: string; logs: ServerLog[] } }) => {
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

  return (
    <PaperScrollView
      withScroll={false}
      onRefresh={refreshFromDb}
      loading={isRefreshing}
      customActions={[
        {
          icon: "delete-sweep",
          label: t("serverLogs.cleanupButton"),
          onPress: handleCleanupLogs,
          style: { backgroundColor: theme.colors.primaryContainer },
        },
      ]}
    >
      <Surface style={[styles.searchContainer]}>
        <Icon source="magnify" size={20} color="#666" />
        <TextInput
          style={[styles.searchInput, { color: theme.colors.onSurface }]}
          placeholder={t("serverLogs.filterPlaceholder")}
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

      <FlatList
        data={groupedLogs}
        keyExtractor={(item) => item.id}
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
                {t("serverLogs.logDetailsTitle")}
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
                      {t("serverLogs.fields.level")}:
                    </Text>
                    <Text
                      selectable
                      style={[
                        styles.dialogMetaValue,
                        {
                          color:
                            levelToColor[
                              selectedLog.level as keyof typeof levelToColor
                            ] || theme.colors.onSurface,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {selectedLog.level.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("serverLogs.fields.timestamp")}:
                    </Text>
                    <Text selectable style={styles.dialogMetaValue}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </Text>
                  </View>

                  {selectedLog.context && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {t("serverLogs.fields.context")}:
                      </Text>
                      <Text selectable style={styles.dialogMetaValue}>
                        {selectedLog.context}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("serverLogs.fields.message")}:
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

                  {selectedLog.trace && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {t("serverLogs.fields.trace")}:
                      </Text>
                      <TextInput
                        value={selectedLog.trace}
                        multiline
                        editable={false}
                        scrollEnabled
                        style={[
                          styles.fieldInput,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                            color: theme.colors.onSurface,
                            maxHeight: 200,
                          },
                        ]}
                      />
                    </View>
                  )}

                  {selectedLog.metadata && (
                    <View style={styles.metadataSection}>
                      <View style={styles.metadataHeader}>
                        <Text style={styles.dialogMetaLabel}>
                          {t("serverLogs.fields.meta")}:
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
  return text.length > max ? text.substring(0, max) + "..." : text;
}

const styles = StyleSheet.create({
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
});
