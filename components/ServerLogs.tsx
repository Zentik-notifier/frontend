import { useI18n } from "@/hooks/useI18n";
import { FlashList } from "@shopify/flash-list";
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
import {
  useGetServerLogsQuery,
  useTriggerLogCleanupMutation,
} from "@/generated/gql-operations-generated";

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
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState<string>("");
  const [selectedLog, setSelectedLog] = useState<ServerLog | null>(null);
  const [showLogDialog, setShowLogDialog] = useState<boolean>(false);
  const [fabOpen, setFabOpen] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [levelFilter, setLevelFilter] = useState<string | null>(null);

  // GraphQL queries
  const { data, loading, refetch, fetchMore, networkStatus } = useGetServerLogsQuery({
    variables: {
      input: {
        page: 1,
        limit: 50,
        search: query || undefined,
        level: levelFilter as any,
      },
    },
    fetchPolicy: "cache-and-network",
    notifyOnNetworkStatusChange: true,
  });

  const [triggerCleanup, { loading: cleanupLoading }] =
    useTriggerLogCleanupMutation();

  const isOperationInProgress = cleanupLoading;

  const logs = useMemo(() => {
    return (data?.logs?.logs as ServerLog[]) || [];
  }, [data]);

  const totalPages = useMemo(() => {
    return data?.logs?.totalPages || 1;
  }, [data]);

  const hasMore = useMemo(() => {
    return currentPage < totalPages;
  }, [currentPage, totalPages]);

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
    setFabOpen(false);
    Alert.alert(
      t("serverLogs.cleanupTitle"),
      t("serverLogs.cleanupMessage"),
      [
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
      ]
    );
  }, [t, triggerCleanup, refetch]);

  const handleLoadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || loading) return;
    
    setIsLoadingMore(true);
    const nextPage = currentPage + 1;
    
    try {
      await fetchMore({
        variables: {
          input: {
            page: nextPage,
            limit: 50,
            search: query || undefined,
            level: levelFilter as any,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult) return prev;
          
          return {
            logs: {
              ...fetchMoreResult.logs,
              logs: [
                ...(prev.logs?.logs || []),
                ...(fetchMoreResult.logs?.logs || []),
              ],
            },
          };
        },
      });
      
      setCurrentPage(nextPage);
    } catch (error) {
      console.error("Error loading more logs:", error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [hasMore, isLoadingMore, loading, currentPage, fetchMore, query, levelFilter]);

  const refreshFromDb = useCallback(async () => {
    setIsRefreshing(true);
    setCurrentPage(1);
    try {
      await refetch({
        input: {
          page: 1,
          limit: 50,
          search: query || undefined,
          level: levelFilter as any,
        },
      });
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch, query, levelFilter]);

  const renderItem = useCallback(
    ({ item }: { item: ServerLog }) => {
      const hasLongContent =
        item.message.length > 100 ||
        (item.metadata && JSON.stringify(item.metadata).length > 200);

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
                  { backgroundColor: levelToColor[item.level as keyof typeof levelToColor] || theme.colors.onSurfaceVariant },
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
          {!!item.context && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("serverLogs.fields.context")}:</Text>
              <Text style={styles.metaValue}>{item.context}</Text>
            </View>
          )}
          <View style={styles.metaRow}>
            <Text style={styles.metaLabel}>{t("serverLogs.fields.message")}:</Text>
            <Text style={styles.metaValue}>{truncate(item.message, 150)}</Text>
          </View>
          {!!item.metadata && (
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>{t("serverLogs.fields.meta")}:</Text>
              <Text style={styles.metaValue}>
                {truncate(JSON.stringify(item.metadata), 150)}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      );
    },
    [theme.colors, levelToColor, handleShowLog, t]
  );

  const renderFooter = useCallback(() => {
    if (!hasMore) return null;
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={theme.colors.primary} />
      </View>
    );
  }, [hasMore, theme.colors.primary]);

  return (
    <View style={[styles.safe, { backgroundColor: theme.colors.background }]}>
      <Surface style={styles.container}>
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

        {loading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>{t("serverLogs.loading")}</Text>
          </View>
        ) : (
          <FlashList
            data={logs}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.5}
            ListFooterComponent={renderFooter}
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
              <Text style={[styles.dialogTitle, { color: theme.colors.onSurface }]}>
                {t("serverLogs.logDetailsTitle")}
              </Text>
              <TouchableOpacity onPress={handleCloseLogDialog}>
                <Icon
                  source="close"
                  size={24}
                  color={theme.colors.onSurface}
                />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dialogContent}>
              {selectedLog && (
                <>
                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>{t("serverLogs.fields.level")}:</Text>
                    <Text
                      style={[
                        styles.dialogMetaValue,
                        {
                          color:
                            levelToColor[selectedLog.level as keyof typeof levelToColor] ||
                            theme.colors.onSurface,
                          fontWeight: "bold",
                        },
                      ]}
                    >
                      {selectedLog.level.toUpperCase()}
                    </Text>
                  </View>

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>{t("serverLogs.fields.timestamp")}:</Text>
                    <Text style={styles.dialogMetaValue}>
                      {new Date(selectedLog.timestamp).toLocaleString()}
                    </Text>
                  </View>

                  {selectedLog.context && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>{t("serverLogs.fields.context")}:</Text>
                      <Text style={styles.dialogMetaValue}>
                        {selectedLog.context}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>{t("serverLogs.fields.message")}:</Text>
                    <Text style={styles.dialogMetaValue}>
                      {selectedLog.message}
                    </Text>
                  </View>

                  {selectedLog.trace && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>{t("serverLogs.fields.trace")}:</Text>
                      <Text style={styles.dialogMetaValue}>
                        {selectedLog.trace}
                      </Text>
                    </View>
                  )}

                  {selectedLog.metadata && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>{t("serverLogs.fields.meta")}:</Text>
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

      {/* FAB Group */}
      <FAB.Group
        open={fabOpen}
        visible={!isOperationInProgress}
        icon={fabOpen ? "close" : "cog"}
        actions={[
          {
            icon: "delete-sweep",
            label: t("serverLogs.cleanupButton"),
            onPress: handleCleanupLogs,
            style: { backgroundColor: theme.colors.primaryContainer },
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
  return text.length > max ? text.substring(0, max) + "..." : text;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 8,
    borderRadius: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  footerLoader: {
    paddingVertical: 20,
    alignItems: "center",
  },
  logItem: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  levelBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelBadge: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  dateText: {
    fontSize: 11,
    opacity: 0.6,
  },
  metaRow: {
    flexDirection: "row",
    marginVertical: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginRight: 6,
    minWidth: 80,
    opacity: 0.7,
  },
  metaValue: {
    fontSize: 12,
    flex: 1,
    opacity: 0.85,
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
