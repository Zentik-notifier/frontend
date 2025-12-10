import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useMemo, useState } from "react";
import {
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
import { ActivityIndicator, Icon, Surface, Text, useTheme } from "react-native-paper";
import { useGetUserLogsQuery, UserLogType } from "@/generated/gql-operations-generated";
import PaperScrollView from "./ui/PaperScrollView";
import CopyButton from "./ui/CopyButton";

interface UserLogEntry {
  id: string;
  type: UserLogType;
  userId?: string | null;
  payload: any;
  createdAt: string;
}

const MAX_GROUP_SIZE_PER_BUCKET = 50;

interface UserLogsProps {
  userId?: string;
  type?: UserLogType;
}

export default function UserLogs({ userId, type }: UserLogsProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [query, setQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<UserLogEntry | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);

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
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const logs = useMemo(() => {
    return (data?.userLogs?.logs as UserLogEntry[]) || [];
  }, [data]);

  const handleShowLog = useCallback((log: UserLogEntry) => {
    setSelectedLog(log);
    setShowLogDialog(true);
  }, []);

  const handleCloseLogDialog = useCallback(() => {
    setShowLogDialog(false);
    setSelectedLog(null);
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
    if (isLoadingMore || !data?.userLogs) {
      return;
    }

    const { page: currentPage, totalPages, limit } = data.userLogs;
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
            userId: userId || undefined,
            type: type || undefined,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.userLogs) {
            return prev;
          }

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
  }, [data, fetchMore, isLoadingMore, query]);

  const filteredLogs = useMemo(() => {
    return logs;
  }, [logs]);

  const groupedLogs = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const buildGroups = (bucketMinutes: number) => {
      const groups: { id: string; timeLabel: string; logs: UserLogEntry[] }[] = [];
      const groupMap = new Map<string, UserLogEntry[]>();
      let maxGroupSize = 0;

      filteredLogs.forEach((log) => {
        const date = new Date(log.createdAt);
        const minutes = date.getMinutes();
        const roundedMinutes =
          Math.floor(minutes / bucketMinutes) * bucketMinutes;
        date.setMinutes(roundedMinutes, 0, 0);

        const timeKey = date.toISOString();

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

        if (!groupMap.has(timeKey)) {
          groupMap.set(timeKey, []);
          groups.push({
            id: timeKey,
            timeLabel,
            logs: groupMap.get(timeKey)!,
          });
        }
        const arr = groupMap.get(timeKey)!;
        arr.push(log);
        if (arr.length > maxGroupSize) {
          maxGroupSize = arr.length;
        }
      });

      return { groups, maxGroupSize };
    };

    let bucketMinutes = 5;
    let result = buildGroups(bucketMinutes);

    while (
      result.maxGroupSize > MAX_GROUP_SIZE_PER_BUCKET &&
      bucketMinutes > 1
    ) {
      bucketMinutes = Math.max(1, Math.floor(bucketMinutes / 2));
      result = buildGroups(bucketMinutes);
    }

    return result.groups;
  }, [filteredLogs]);

  const renderLogItem = useCallback(
    (log: UserLogEntry) => {
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
                styles.typePill,
                {
                  backgroundColor:
                    log.type === UserLogType.Feedback
                      ? theme.colors.primaryContainer
                      : theme.colors.secondaryContainer,
                },
              ]}
            >
              <Text
                style={[
                  styles.typePillText,
                  { color: theme.colors.onPrimaryContainer },
                ]}
              >
                {log.type}
              </Text>
            </View>
            {log.type === UserLogType.AppLog && log.payload?.event && (
              <View
                style={[
                  styles.eventPill,
                  {
                    backgroundColor: theme.colors.tertiaryContainer,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.eventPillText,
                    { color: theme.colors.onTertiaryContainer },
                  ]}
                >
                  {log.payload.event}
                </Text>
              </View>
            )}
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
              {log.userId ? `[${log.userId}] ` : ""}
              {truncate(JSON.stringify(log.payload), 180)}
            </Text>
          </View>
        </TouchableOpacity>
      );
    },
    [theme.colors, handleShowLog]
  );

  const renderItem = useCallback(
    ({
      item,
    }: {
      item: { id: string; timeLabel: string; logs: UserLogEntry[] };
    }) => {
      return (
        <View style={styles.logGroup}>
          <Text
            style={[
              styles.timeGroupLabel,
              { color: theme.colors.onSurfaceVariant },
            ]}
          >
            {item.timeLabel}
          </Text>
          {item.logs.map((log) => renderLogItem(log))}
        </View>
      );
    },
    [theme.colors, renderLogItem]
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

      <FlatList
        data={groupedLogs}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.5}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={refreshFromDb}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
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
                          color: theme.colors.primary,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {selectedLog.type}
                    </Text>
                  </View>

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>
                      {t("serverLogs.fields.timestamp")}:
                    </Text>
                    <Text selectable style={styles.dialogMetaValue}>
                      {new Date(selectedLog.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  {selectedLog.userId && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        User ID:
                      </Text>
                      <Text selectable style={styles.dialogMetaValue}>
                        {selectedLog.userId}
                      </Text>
                    </View>
                  )}

                  {selectedLog.type === UserLogType.AppLog && selectedLog.payload?.event && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        Event:
                      </Text>
                      <Text
                        selectable
                        style={[
                          styles.dialogMetaValue,
                          {
                            color: theme.colors.tertiary,
                            fontWeight: "600",
                          },
                        ]}
                      >
                        {selectedLog.payload.event}
                      </Text>
                    </View>
                  )}

                  <View style={styles.metadataSection}>
                    <View style={styles.metadataHeader}>
                      <Text style={styles.dialogMetaLabel}>
                        Payload:
                      </Text>
                      <CopyButton
                        text={JSON.stringify(selectedLog.payload, null, 2)}
                        size={18}
                      />
                    </View>
                    <TextInput
                      value={JSON.stringify(selectedLog.payload, null, 2)}
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
  typePill: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  typePillText: {
    fontSize: 10,
    fontWeight: "600",
  },
  eventPill: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  eventPillText: {
    fontSize: 9,
    fontWeight: "500",
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
  footerLoading: {
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
  },
});


