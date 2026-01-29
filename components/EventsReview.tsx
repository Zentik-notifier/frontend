import { useEventsReviewContext } from "@/contexts/EventsReviewContext";
import {
  EventType,
  useGetAllUsersQuery,
  useGetEventsPaginatedQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { uniqBy } from "lodash";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { FAB, Icon, Portal, Text, useTheme } from "react-native-paper";
import EventsReviewFiltersModal from "./EventsReviewFiltersModal";
import PaperScrollView from "./ui/PaperScrollView";
import LogRowCollapsible from "./ui/LogRowCollapsible";
import {
  LogsListLayout,
  type LogsListItem,
  type LogsListItemLog,
} from "./ui/LogsListLayout";

interface EventsReviewProps {
  hideFilter?: boolean;
}

export default function EventsReview({ hideFilter }: EventsReviewProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const {
    state: { filters, activeFiltersCount, fixedObjectIds },
    handleShowFiltersModal,
    handleClearFilters,
  } = useEventsReviewContext();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const pageSize = 20;

  const queryVariables = useMemo(() => {
    const hasExplicitObjectId = !!filters.objectId;
    const objectIdsForQuery =
      !hasExplicitObjectId && fixedObjectIds && fixedObjectIds.length > 0
        ? fixedObjectIds
        : undefined;

    return {
      query: {
        page: 1,
        limit: pageSize,
        type: filters.selectedType,
        userId: filters.userId,
        objectId: hasExplicitObjectId ? filters.objectId : undefined,
        objectIds: objectIdsForQuery,
        targetId: filters.targetId || undefined,
      },
    };
  }, [
    filters.selectedType,
    filters.userId,
    filters.objectId,
    filters.targetId,
    fixedObjectIds,
    pageSize,
  ]);

  const {
    data: paginatedData,
    loading: isLoading,
    refetch,
    fetchMore,
  } = useGetEventsPaginatedQuery({
    variables: queryVariables,
    notifyOnNetworkStatusChange: true,
    fetchPolicy: "network-only",
  });

  const events = paginatedData?.events?.events ?? [];
  const hasNextPage = paginatedData?.events?.hasNextPage ?? false;
  const currentPage = paginatedData?.events?.page ?? 1;
  const total = paginatedData?.events?.total ?? 0;

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refetch();
    } catch (error) {
      console.error("Error refreshing events:", error);
    } finally {
      setIsRefreshing(false);
    }
  }, [refetch]);

  const handleLoadMore = useCallback(async () => {
    if (!hasNextPage || isLoadingMore) return;

    const nextPage = currentPage + 1;

    try {
      setIsLoadingMore(true);
      await fetchMore({
        variables: {
          query: {
            ...queryVariables.query,
            page: nextPage,
          },
        },
        updateQuery: (prev, { fetchMoreResult }) => {
          if (!fetchMoreResult?.events) return prev;
          const allEvents = uniqBy(
            [...prev.events.events, ...fetchMoreResult.events.events],
            "id"
          );
          return {
            ...prev,
            events: {
              ...fetchMoreResult.events,
              events: allEvents,
            },
          } as any;
        },
      });
    } finally {
      setIsLoadingMore(false);
    }
  }, [
    hasNextPage,
    isLoadingMore,
    currentPage,
    queryVariables.query,
    fetchMore,
  ]);

  const { data: usersData } = useGetAllUsersQuery({});

  const userIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of usersData?.users ?? []) {
      map[u.id] = u.username || u.email || u.id;
    }
    return map;
  }, [usersData]);

  const handleClearAllFilters = useCallback(() => {
    handleClearFilters();
  }, [handleClearFilters]);

  const toggleEventExpand = useCallback((eventId: string) => {
    setExpandedEventId((prev) => (prev === eventId ? null : eventId));
  }, []);

  const flatListData = useMemo((): LogsListItem<any>[] => {
    const groupOrder: string[] = [];
    const groupMap = new Map<string, { timeLabel: string; events: any[] }>();
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < events.length; i++) {
      const ev = events[i];
      const date = new Date(ev.createdAt);
      const minutes = date.getMinutes();
      const roundedMinutes = Math.floor(minutes / 5) * 5;
      date.setMinutes(roundedMinutes, 0, 0);
      const timeKey = date.toISOString();

      if (!groupMap.has(timeKey)) {
        const logDate = new Date(ev.createdAt);
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
        groupMap.set(timeKey, { timeLabel, events: [] });
        groupOrder.push(timeKey);
      }
      groupMap.get(timeKey)!.events.push(ev);
    }

    const flat: LogsListItem<any>[] = [];
    for (let i = 0; i < groupOrder.length; i++) {
      const timeKey = groupOrder[i];
      const g = groupMap.get(timeKey)!;
      flat.push({ type: "header", id: `h-${timeKey}`, timeLabel: g.timeLabel });
      for (let j = 0; j < g.events.length; j++) {
        const ev = g.events[j];
        flat.push({ type: "log", id: ev.id, log: ev });
      }
    }
    return flat;
  }, [events]);

  const renderLogRow = useCallback(
    (item: LogsListItemLog<any>) => {
      const ev = item.log;
      const isExpanded = expandedEventId === ev.id;
      const userDisplay = ev.userId
        ? userIdToName[ev.userId] || ev.userId
        : "-";
      const additionalInfo = ev.additionalInfo || {};
      const platform = additionalInfo.platform as string | undefined;
      const sentWith = additionalInfo.sentWith as string | undefined;
      const availableMethods = additionalInfo.availableMethods as
        | string[]
        | undefined;
      let sentWithLabel: string | undefined;
      if (sentWith) {
        if (sentWith === "SELF_DOWNLOAD") sentWithLabel = "selfDownload";
        else if (sentWith === "UNENCRYPTED") sentWithLabel = "unencrypted";
        else if (sentWith === "ENCRYPTED") sentWithLabel = "encrypted";
        else sentWithLabel = sentWith.toString();
      }
      const unencryptedEnabled =
        Array.isArray(availableMethods) &&
        availableMethods.includes("UNENCRYPTED");
      const isNotification = ev.type === EventType.Notification;
      const isPassthroughEvent =
        ev.type === EventType.PushPassthrough ||
        (ev.type as EventType | string) ===
          (EventType as any).PushPassthroughFailed;
      const showKpiBadges = isNotification || isPassthroughEvent;
      const headerLine = `${new Date(ev.createdAt).toLocaleString()} - ${ev.type} - ${userDisplay}`;

      return (
        <View style={styles.logRow}>
          <LogRowCollapsible
            id={ev.id}
            isExpanded={isExpanded}
            onToggle={() => toggleEventExpand(ev.id)}
            headerLine={headerLine}
            jsonObject={ev}
            expandOpensDown
            summaryContent={
              <View style={styles.logRowHeader}>
                <View style={styles.logRowHeaderLeft}>
                  <Text
                    style={[{ color: theme.colors.onSurface }]}
                    numberOfLines={1}
                  >
                    <Text
                      style={[
                        styles.logEventType,
                        { color: theme.colors.primary },
                      ]}
                    >
                      {ev.type}
                    </Text>
                    {userDisplay !== "-" && (
                      <Text>{` - ${userDisplay}`}</Text>
                    )}
                  </Text>
                  {showKpiBadges && (
                    <View style={styles.logBadgesRow}>
                      {platform && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: theme.colors.surfaceVariant,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: theme.colors.onSurfaceVariant,
                              },
                            ]}
                          >
                            {platform}
                          </Text>
                        </View>
                      )}
                      {sentWithLabel && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor: theme.colors.tertiaryContainer,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: theme.colors.onTertiaryContainer,
                              },
                            ]}
                          >
                            sentWith: {sentWithLabel}
                          </Text>
                        </View>
                      )}
                      {unencryptedEnabled && (
                        <View
                          style={[
                            styles.badge,
                            {
                              backgroundColor:
                                theme.colors.secondaryContainer,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.badgeText,
                              {
                                color: theme.colors.onSecondaryContainer,
                              },
                            ]}
                          >
                            unencrypted enabled
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
                <Text
                  style={[
                    styles.logDate,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {new Date(ev.createdAt).toLocaleString()}
                </Text>
              </View>
            }
          />
        </View>
      );
    },
    [
      theme.colors,
      userIdToName,
      expandedEventId,
      toggleEventExpand,
    ]
  );

  return (
    <PaperScrollView
      withScroll={false}
      onRefresh={handleRefresh}
      loading={isRefreshing}
    >
      <View
        style={[
          styles.statsContainer,
          { backgroundColor: theme.colors.surface },
        ]}
      >
        <Text variant="bodyMedium" style={styles.statsText}>
          {t("common.showing")} {events.length} {t("common.of")} {total}{" "}
          {t("common.results")}
        </Text>
      </View>

      <EventsReviewFiltersModal />

      {isLoading && events.length === 0 ? (
        <View
          style={[
            styles.loadingContainer,
            { backgroundColor: theme.colors.surface },
          ]}
        >
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text variant="bodyLarge" style={styles.loadingText}>
            {t("common.loading")}
          </Text>
        </View>
      ) : events.length === 0 ? (
        <View
          style={[styles.emptyState, { backgroundColor: theme.colors.surface }]}
        >
          <Icon
            source="magnify"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="headlineSmall" style={styles.emptyTitle}>
            {t("eventsReview.empty.title")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyDescription}>
            {t("eventsReview.empty.description")}
          </Text>
        </View>
      ) : (
        <LogsListLayout<any>
          data={flatListData}
          renderLogRow={renderLogRow}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
          onEndReached={handleLoadMore}
          ListFooterComponent={
            hasNextPage && isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      {/* FAB for filters */}
      {!hideFilter && (
        <Portal>
          <FAB
            icon={activeFiltersCount > 0 ? "filter-check" : "filter"}
            label={activeFiltersCount > 0 ? `${activeFiltersCount}` : undefined}
            onPress={handleShowFiltersModal}
            style={[
              styles.fab,
              {
                backgroundColor:
                  activeFiltersCount > 0
                    ? theme.colors.primaryContainer
                    : theme.colors.surface,
              },
            ]}
            color={
              activeFiltersCount > 0
                ? theme.colors.primary
                : theme.colors.onSurface
            }
          />
        </Portal>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  headerTitle: {
    flex: 1,
    fontWeight: "600",
  },
  refreshButton: {
    minWidth: 48,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  statsContainer: {
    marginTop: 4,
  },
  statsText: {
    fontSize: 14,
    opacity: 0.7,
  },
  selectorsContainer: {
    gap: 16,
    marginBottom: 16,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
    opacity: 0.7,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: 16,
    textAlign: "center",
    opacity: 0.7,
    lineHeight: 22,
  },
  listContent: {
    paddingVertical: 8,
  },
  logRow: {
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
  logBadgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 4,
  },
  logRowBody: {
    gap: 2,
  },
  logEventType: {
    fontWeight: "600",
  },
  logLine: {
    fontSize: 12,
  },
  logLineId: {
    fontSize: 11,
  },
  footerLoading: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
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
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  fieldInput: {
    borderRadius: 8,
    borderWidth: 1,
    minHeight: 40,
    maxHeight: 120,
    fontSize: 12,
    lineHeight: 18,
    padding: 10,
    textAlignVertical: "top",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    borderRadius: 16,
    elevation: 4,
  },
});
