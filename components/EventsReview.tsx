import { useAppContext } from "@/contexts/AppContext";
import { useEventsReviewContext } from "@/contexts/EventsReviewContext";
import {
  EventType,
  useGetAllUsersQuery,
  useGetEventsPaginatedQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { Card, FAB, Icon, Portal, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import EventsReviewFiltersModal from "./EventsReviewFiltersModal";
import { uniqBy } from "lodash";

function mappedObjectIdPlaceholder(type: EventType): string {
  switch (type) {
    case EventType.PushPassthrough:
      return "systemTokenId";
    case EventType.Notification:
      return "-";
    case EventType.BucketSharing:
    case EventType.BucketUnsharing:
      return "bucketId";
    case EventType.DeviceRegister:
    case EventType.DeviceUnregister:
      return "-";
    default:
      return "-";
  }
}

export default function EventsReview() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const {
    state: { filters, activeFiltersCount },
    handleShowFiltersModal,
    handleClearFilters,
  } = useEventsReviewContext();

  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 20;

  const disabledActions = isOfflineAuth || isBackendUnreachable;

  const queryVariables = useMemo(
    () => ({
      query: {
        page: 1,
        limit: pageSize,
        type: filters.selectedType,
        userId: filters.userId,
        objectId: filters.objectId || undefined,
        targetId: filters.targetId || undefined,
      },
    }),
    [filters.selectedType, filters.userId, filters.objectId, filters.targetId, pageSize]
  );

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

  const handleLoadMore = useCallback(() => {
    if (!hasNextPage || isLoading) return;

    const nextPage = currentPage + 1;

    fetchMore({
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
  }, [hasNextPage, isLoading, currentPage, queryVariables.query, fetchMore]);

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

  const formatTargetId = useCallback(
    (
      targetIdValue: string | null | undefined,
      eventType: EventType
    ): string => {
      if (!targetIdValue) return "-";
      if (
        eventType === EventType.BucketSharing ||
        eventType === EventType.BucketUnsharing
      ) {
        return userIdToName[targetIdValue] || targetIdValue;
      }
      return targetIdValue;
    },
    [userIdToName]
  );

  const formatObjectId = useCallback(
    (
      objectIdValue: string | null | undefined,
      eventType: EventType
    ): string => {
      if (!objectIdValue) return mappedObjectIdPlaceholder(eventType);
      return objectIdValue;
    },
    []
  );

  const getTargetIdLabel = useCallback((eventType: EventType): string => {
    switch (eventType) {
      case EventType.BucketSharing:
        return "shared with:";
      case EventType.BucketUnsharing:
        return "unshared from:";
      case EventType.Notification:
      case EventType.DeviceRegister:
      case EventType.DeviceUnregister:
        return "device:";
      default:
        return "targetId:";
    }
  }, []);

  const getObjectIdLabel = useCallback((eventType: EventType): string => {
    switch (eventType) {
      case EventType.BucketSharing:
      case EventType.BucketUnsharing:
        return "bucket:";
      case EventType.PushPassthrough:
        return "token:";
      default:
        return "objectId:";
    }
  }, []);

  const renderItem = ({ item }: any) => {
    const userDisplay = item.userId
      ? userIdToName[item.userId] || item.userId
      : "-";
    return (
      <Card style={styles.eventItem}>
        <Card.Content>
          <View style={styles.eventHeader}>
            <Text variant="titleMedium" style={styles.eventType}>
              {item.type}
            </Text>
            <Text variant="bodySmall" style={styles.eventDate}>
              {new Date(item.createdAt).toLocaleString()}
            </Text>
          </View>
          <View style={styles.eventMeta}>
            <View style={styles.metaRow}>
              <Text variant="bodySmall" style={styles.metaLabel}>
                user:
              </Text>
              <Text variant="bodySmall" style={styles.metaValue}>
                {userDisplay}
              </Text>
            </View>
            {item.objectId && (
              <View style={styles.metaRow}>
                <Text variant="bodySmall" style={styles.metaLabel}>
                  {getObjectIdLabel(item.type)}
                </Text>
                <Text variant="bodySmall" style={styles.metaValue}>
                  {formatObjectId(item.objectId, item.type)}
                </Text>
              </View>
            )}
            {item.targetId && (
              <View style={styles.metaRow}>
                <Text variant="bodySmall" style={styles.metaLabel}>
                  {getTargetIdLabel(item.type)}
                </Text>
                <Text variant="bodySmall" style={styles.metaValue}>
                  {formatTargetId(item.targetId, item.type)}
                </Text>
              </View>
            )}
            <View style={styles.metaRow}>
              <Text variant="bodySmall" style={styles.metaLabel}>
                id:
              </Text>
              <Text variant="bodySmall" style={styles.metaValue}>
                {item.id}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>
    );
  };

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
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onRefresh={handleRefresh}
          refreshing={isRefreshing}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.1}
          ListFooterComponent={() =>
            hasNextPage ? (
              <View style={styles.loadMoreContainer}>
                {isLoading ? (
                  <ActivityIndicator color={theme.colors.primary} />
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.loadMoreButton,
                      {
                        backgroundColor: theme.colors.surface,
                      },
                    ]}
                    onPress={handleLoadMore}
                    disabled={disabledActions}
                  >
                    <Text variant="bodyMedium" style={styles.loadMoreText}>
                      {t("common.loadMore")}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : events.length > 0 ? (
              <View style={styles.endOfListContainer}>
                <Text variant="bodySmall" style={styles.endOfListText}>
                  {t("common.endOfResults")}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* FAB for filters */}
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
  eventItem: {
    marginBottom: 12,
  },
  eventHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  eventType: {
    fontWeight: "700",
    fontSize: 16,
  },
  eventDate: {
    opacity: 0.7,
    fontSize: 14,
  },
  eventMeta: {
    gap: 6,
  },
  metaRow: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  metaLabel: {
    fontWeight: "600",
    opacity: 0.8,
    fontSize: 14,
    minWidth: 70,
  },
  metaValue: {
    opacity: 0.9,
    fontSize: 14,
    flex: 1,
  },
  loadMoreContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  loadMoreButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  loadMoreText: {
    fontSize: 16,
    fontWeight: "500",
  },
  endOfListContainer: {
    paddingVertical: 20,
    alignItems: "center",
  },
  endOfListText: {
    fontSize: 14,
    opacity: 0.6,
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    right: 16,
    bottom: 16,
    borderRadius: 16,
    elevation: 4,
  },
});
