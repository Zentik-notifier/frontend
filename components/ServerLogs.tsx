import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Platform,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Icon,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import {
  useGetServerLogsQuery,
  useTriggerLogCleanupMutation,
} from "@/generated/gql-operations-generated";
import { settingsService } from "@/services/settings-service";
import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import PaperScrollView from "./ui/PaperScrollView";
import LogRowCollapsible from "./ui/LogRowCollapsible";
import {
  LogsListLayout,
  type LogsListItem,
  type LogsListItemLog,
} from "./ui/LogsListLayout";

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
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  // GraphQL queries
  const { data, refetch, fetchMore } = useGetServerLogsQuery({
    variables: {
      input: {
        page: 1,
        limit: 100,
        search: query || undefined,
      },
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [triggerCleanup] = useTriggerLogCleanupMutation();

  const logs = useMemo(() => {
    return (data?.logs?.logs as ServerLog[]) || [];
  }, [data]);

  const toggleLogExpand = useCallback((logId: string) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
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

  const handleDownloadLogs = useCallback(async () => {
    try {
      const apiBase = settingsService.getApiBaseWithPrefix();
      const url = `${apiBase}/server-manager/logs/download`;

      if (Platform.OS === "web") {
        const token = settingsService.getAuthData().accessToken;
        const resp = await fetch(url, {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (!resp.ok) throw new Error("Download failed");
        const blob = await resp.blob();
        const a = document.createElement("a");
        const href = URL.createObjectURL(blob);
        a.href = href;
        const contentDisposition = resp.headers.get("content-disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1]?.replace(/"/g, "") ||
            "logs.json"
          : `logs-${new Date().toISOString().split("T")[0]}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(href);
      } else {
        // On mobile, download and share
        const token = settingsService.getAuthData().accessToken;
        const response = await fetch(url, {
          headers: {
            Authorization: token ? `Bearer ${token}` : "",
          },
        });

        if (!response.ok) {
          throw new Error("Download failed");
        }

        const arrayBuffer = await response.arrayBuffer();
        const uint8Array = new Uint8Array(arrayBuffer);
        
        const contentDisposition = response.headers.get("content-disposition");
        const filename = contentDisposition
          ? contentDisposition.split("filename=")[1]?.replace(/"/g, "") ||
            "logs.json"
          : `logs-${new Date().toISOString().split("T")[0]}.json`;

        const fileUri = `${Paths.document.uri}${filename}`;
        const file = new File(fileUri);
        await file.write(uint8Array, {});

        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri);
        } else {
          Alert.alert(
            t("common.success"),
            t("serverLogs.downloadSuccess" as any) as string
          );
        }

        // Cleanup
        try {
          await file.delete();
        } catch (cleanupError) {
          console.log("File cleanup failed:", cleanupError);
        }
      }
    } catch (e) {
      console.error("Error downloading logs:", e);
      Alert.alert(t("common.error"), t("serverLogs.downloadError"));
    }
  }, [t]);

  const refreshFromDb = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch({
        input: {
          page: 1,
          limit: 100,
          search: query || undefined,
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, query]);

  const handleEndReached = useCallback(async () => {
    if (isLoadingMore || !data?.logs) {
      return;
    }

    const { page: currentPage, totalPages, limit } = data.logs;
    if (currentPage >= totalPages) {
      return;
    }

    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      await fetchMore({
        variables: {
          input: {
            page: nextPage,
            limit,
            search: query || undefined,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.logs) {
            return prev;
          }

          const existingIds = new Set(prev.logs.logs.map((log) => log.id));
          const newLogs = fetchMoreResult.logs.logs.filter(
            (log) => !existingIds.has(log.id)
          );

          return {
            ...prev,
            logs: {
              ...fetchMoreResult.logs,
              logs: [...prev.logs.logs, ...newLogs],
            },
          };
        },
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [data, fetchMore, isLoadingMore, query]);

  const filteredLogs = useMemo(() => {
    return logs.filter((l) => l.message && l.message.trim() !== "");
  }, [logs]);

  const flatListData = useMemo((): LogsListItem<ServerLog>[] => {
    const groupOrder: string[] = [];
    const groupMap = new Map<string, { timeLabel: string; logs: ServerLog[] }>();
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

    const flat: LogsListItem<ServerLog>[] = [];
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
    (item: LogsListItemLog<ServerLog>) => {
      const log = item.log;
      const isExpanded = expandedLogId === log.id;
      const levelKey = log.level?.toLowerCase() as keyof typeof levelToColor;
      const levelColor = levelToColor[levelKey] ?? theme.colors.onSurfaceVariant;
      const headerLine = `${new Date(log.timestamp).toLocaleString()} (${log.level.toUpperCase()})${log.context ? ` - [${log.context}]` : ""}`;

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
                  <View
                    style={[
                      styles.logPill,
                      { backgroundColor: theme.colors.surfaceVariant },
                    ]}
                  >
                    <Text
                      style={[
                        styles.logPillText,
                        { color: levelColor },
                      ]}
                      numberOfLines={1}
                    >
                      {log.level.toUpperCase()}
                    </Text>
                  </View>
                  {log.context ? (
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
                        {log.context}
                      </Text>
                    </View>
                  ) : null}
                </View>
                <View style={styles.logLine}>
                  <View
                    style={[
                      styles.levelIndicator,
                      { backgroundColor: levelColor },
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

  return (
    <PaperScrollView
      withScroll={false}
      onRefresh={refreshFromDb}
      loading={isRefreshing}
      customActions={[
        {
          icon: "download",
          label: t("serverLogs.downloadButton"),
          onPress: handleDownloadLogs,
          style: { backgroundColor: theme.colors.secondaryContainer },
        },
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

      <LogsListLayout<ServerLog>
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
        onEndReached={handleEndReached}
        ListFooterComponent={
          isLoadingMore ? (
            <View style={styles.footerLoading}>
              <ActivityIndicator
                size="small"
                animating
                color={theme.colors.primary}
              />
            </View>
          ) : null
        }
      />
    </PaperScrollView>
  );
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
  footerLoading: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
