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
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  View,
} from "react-native";
import { FAB, Icon, Portal, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import EventsReviewFiltersModal from "./EventsReviewFiltersModal";
import { uniqBy } from "lodash";

function mappedObjectIdPlaceholder(type: EventType): string {
  switch (type) {
    case EventType.PushPassthrough:
      return "systemTokenId";
    case EventType.Notification:
      return "notificationId";
    case EventType.NotificationAck:
      return "notificationId";
    case EventType.BucketSharing:
    case EventType.BucketUnsharing:
      return "bucketId";
    case EventType.DeviceRegister:
    case EventType.DeviceUnregister:
      return "-";
    // New system token request events
    case (EventType as any).SystemTokenRequestCreated:
    case (EventType as any).SystemTokenRequestDeclined:
      return "requestId";
    case (EventType as any).SystemTokenRequestApproved:
      return "requestId";
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
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any | null>(null);
  const [showEventDialog, setShowEventDialog] = useState(false);
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
  }, [hasNextPage, isLoadingMore, currentPage, queryVariables.query, fetchMore]);

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
      // Approved: target is token
      case (EventType as any).SystemTokenRequestApproved:
        return "token:";
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
      // System token request events
      case (EventType as any).SystemTokenRequestCreated:
      case (EventType as any).SystemTokenRequestDeclined:
      case (EventType as any).SystemTokenRequestApproved:
        return "request:";
      default:
        return "objectId:";
    }
  }, []);

  const handleShowEvent = useCallback((event: any) => {
    setSelectedEvent(event);
    setShowEventDialog(true);
  }, []);

  const handleCloseEventDialog = useCallback(() => {
    setShowEventDialog(false);
    setSelectedEvent(null);
  }, []);

  const renderItem = ({ item }: any) => {
    const userDisplay = item.userId
      ? userIdToName[item.userId] || item.userId
      : "-";

    return (
      <TouchableOpacity
        style={[
          styles.logRow,
          { borderBottomColor: theme.colors.surfaceVariant },
        ]}
        activeOpacity={0.7}
        onPress={() => handleShowEvent(item)}
      >
        <View style={styles.logRowHeader}>
          <Text
            style={[styles.logMainLine, { color: theme.colors.onSurface }]}
            numberOfLines={1}
          >
            <Text style={[styles.logEventType, { color: theme.colors.primary }]}>
              {item.type}
            </Text>
            {userDisplay !== "-" && (
              <Text>{` - ${userDisplay}`}</Text>
            )}
          </Text>
          <Text style={[styles.logDate, { color: theme.colors.onSurfaceVariant }]}>
            {new Date(item.createdAt).toLocaleString()}
          </Text>
        </View>
      </TouchableOpacity>
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
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            hasNextPage && isLoadingMore ? (
              <View style={styles.footerLoading}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null
          }
        />
      )}

      <Modal
        visible={showEventDialog}
        transparent
        animationType="fade"
        onRequestClose={handleCloseEventDialog}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.dialogContainer,
              { backgroundColor: theme.colors.surface },
            ]}
          >
            <View style={styles.dialogHeader}>
              <Text style={[styles.dialogTitle, { color: theme.colors.onSurface }]}>
                Event details
              </Text>
              <TouchableOpacity onPress={handleCloseEventDialog}>
                <Icon source="close" size={24} color={theme.colors.onSurface} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.dialogContent}>
              {selectedEvent && (
                <>
                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>Type:</Text>
                    <Text style={styles.dialogMetaValue}>{selectedEvent.type}</Text>
                  </View>

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>Created at:</Text>
                    <Text style={styles.dialogMetaValue}>
                      {new Date(selectedEvent.createdAt).toLocaleString()}
                    </Text>
                  </View>

                  {selectedEvent.userId && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>User:</Text>
                      <Text style={styles.dialogMetaValue}>
                        {userIdToName[selectedEvent.userId] || selectedEvent.userId}
                      </Text>
                    </View>
                  )}

                  {selectedEvent.objectId && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {getObjectIdLabel(selectedEvent.type)}
                      </Text>
                      <Text style={styles.dialogMetaValue}>
                        {formatObjectId(selectedEvent.objectId, selectedEvent.type)}
                      </Text>
                    </View>
                  )}

                  {selectedEvent.targetId && (
                    <View style={styles.dialogMetaRow}>
                      <Text style={styles.dialogMetaLabel}>
                        {getTargetIdLabel(selectedEvent.type)}
                      </Text>
                      <Text style={styles.dialogMetaValue}>
                        {formatTargetId(selectedEvent.targetId, selectedEvent.type)}
                      </Text>
                    </View>
                  )}

                  <View style={styles.dialogMetaRow}>
                    <Text style={styles.dialogMetaLabel}>Event id:</Text>
                    <TextInput
                      value={selectedEvent.id}
                      editable={false}
                      multiline
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
                </>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

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
  logRow: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
  },
  logRowHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
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
