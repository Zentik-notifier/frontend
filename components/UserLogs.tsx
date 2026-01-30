import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useMemo, useState } from "react";
import {
  Platform,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ActivityIndicator, Icon, Surface, Text, useTheme } from "react-native-paper";
import {
  useGetAllUsersQuery,
  useGetUserLogsQuery,
  UserLogType,
} from "@/generated/gql-operations-generated";
import PaperScrollView from "./ui/PaperScrollView";
import LogRowCollapsible from "./ui/LogRowCollapsible";
import {
  LogsListLayout,
  type LogsListItem,
  type LogsListItemLog,
} from "./ui/LogsListLayout";

interface UserLogEntry {
  id: string;
  type: UserLogType;
  userId?: string | null;
  payload: any;
  createdAt: string;
}

interface UserLogsProps {
  userId?: string;
  type?: UserLogType;
}

export default function UserLogs({ userId, type }: UserLogsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [query, setQuery] = useState<string>("");
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

  const { data: usersData } = useGetAllUsersQuery({});
  const userIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of usersData?.users ?? []) {
      map[u.id] = u.username || u.email || u.id;
    }
    return map;
  }, [usersData]);

  const { data, refetch, fetchMore } = useGetUserLogsQuery({
    variables: {
      input: {
        page: 1,
        limit: 100,
        search: query || undefined,
        userId: userId || undefined,
        type: type || undefined,
      },
    },
    fetchPolicy: "no-cache",
    notifyOnNetworkStatusChange: true,
  });

  const logs = useMemo(() => {
    return (data?.userLogs?.logs as UserLogEntry[]) || [];
  }, [data]);

  const toggleLogExpand = useCallback((logId: string) => {
    setExpandedLogId((prev) => (prev === logId ? null : logId));
  }, []);

  const refreshFromDb = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch({
        input: {
          page: 1,
          limit: 100,
          search: query || undefined,
          userId: userId || undefined,
          type: type || undefined,
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, query, userId, type]);

  const handleEndReached = useCallback(async () => {
    if (isLoadingMore || !data?.userLogs) return;
    const { page: currentPage, totalPages, limit } = data.userLogs;
    if (currentPage >= totalPages) return;
    try {
      setIsLoadingMore(true);
      const nextPage = currentPage + 1;
      await fetchMore({
        variables: {
          input: {
            page: nextPage,
            limit,
            search: query || undefined,
            userId: userId || undefined,
            type: type || undefined,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.userLogs) return prev;
          const existingIds = new Set(prev.userLogs.logs.map((log) => log.id));
          const newLogs = fetchMoreResult.userLogs.logs.filter(
            (log) => !existingIds.has(log.id)
          );
          return {
            ...prev,
            userLogs: {
              ...fetchMoreResult.userLogs,
              logs: [...prev.userLogs.logs, ...newLogs],
            },
          };
        },
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [data, fetchMore, isLoadingMore, query, userId, type]);

  const flatListData = useMemo((): LogsListItem<UserLogEntry>[] => {
    const groupOrder: string[] = [];
    const groupMap = new Map<string, { timeLabel: string; logs: UserLogEntry[] }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < logs.length; i++) {
      const log = logs[i];
      const date = new Date(log.createdAt);
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      date.setMinutes(roundedMinutes, 0, 0);
      const timeKey = date.toISOString();

      if (!groupMap.has(timeKey)) {
        const logDate = new Date(log.createdAt);
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

    const flat: LogsListItem<UserLogEntry>[] = [];
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
  }, [logs]);

  const renderLogRow = useCallback(
    (item: LogsListItemLog<UserLogEntry>) => {
      const log = item.log;
      const isExpanded = expandedLogId === log.id;
      const displayName = log.userId
        ? userIdToName[log.userId] || log.userId
        : t("serverLogs.anonymous");
      const isFeedback = log.type === UserLogType.Feedback;
      const typePillBg = isFeedback
        ? theme.colors.primaryContainer
        : theme.colors.secondaryContainer;
      const typePillColor = isFeedback
        ? theme.colors.onPrimaryContainer
        : theme.colors.onSecondaryContainer;
      const userPillBg = isFeedback
        ? theme.colors.primaryContainer
        : theme.colors.surfaceVariant;
      const userPillColor = isFeedback
        ? theme.colors.onPrimaryContainer
        : theme.colors.onSurfaceVariant;
      const eventLabel =
        typeof log.payload === "object" && log.payload !== null && "event" in log.payload
          ? String(log.payload.event)
          : "-";
      const headerLine = `${new Date(log.createdAt).toLocaleString()} (${log.type}) - ${displayName}`;
      const fullLog = { ...log, displayName };

      return (
        <View style={styles.logItem}>
          <LogRowCollapsible
            id={log.id}
            isExpanded={isExpanded}
            onToggle={() => toggleLogExpand(log.id)}
            headerLine={headerLine}
            jsonObject={fullLog}
            expandOpensDown
            summaryContent={
              <View style={styles.logRowHeader}>
                <View style={styles.logRowHeaderLeft}>
                  <View
                    style={[
                      styles.typePill,
                      { backgroundColor: typePillBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        { color: typePillColor },
                      ]}
                      numberOfLines={1}
                    >
                      {log.type}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.typePill,
                      { backgroundColor: userPillBg },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        { color: userPillColor },
                      ]}
                      numberOfLines={1}
                    >
                      {displayName}
                    </Text>
                  </View>
                  <View
                    style={[
                      styles.typePill,
                      { backgroundColor: theme.colors.tertiaryContainer },
                    ]}
                  >
                    <Text
                      style={[
                        styles.typePillText,
                        { color: theme.colors.onTertiaryContainer },
                      ]}
                      numberOfLines={1}
                    >
                      {eventLabel}
                    </Text>
                  </View>
                </View>
                <Text
                  style={[
                    styles.logDate,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {new Date(log.createdAt).toLocaleString()}
                </Text>
              </View>
            }
          />
        </View>
      );
    },
    [
      theme.colors,
      expandedLogId,
      toggleLogExpand,
      userIdToName,
      t,
    ]
  );

  return (
    <PaperScrollView withScroll={false}>
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

      <LogsListLayout<UserLogEntry>
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
  logRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },
  logRowHeaderLeft: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    flexShrink: 1,
  },
  typePill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  typePillText: {
    fontSize: 11,
    fontWeight: "600",
  },
  logDate: {
    fontSize: 11,
    opacity: 0.7,
  },
  footerLoading: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});
