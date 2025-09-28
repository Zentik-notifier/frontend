import { useAppContext } from "@/contexts/AppContext";
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
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Surface,
  Text,
  useTheme
} from "react-native-paper";

export default function EventsReview() {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const [selectedType, setSelectedType] = useState<EventType | undefined>(
    undefined
  );
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [objectId, setObjectId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showUserModal, setShowUserModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const pageSize = 20;

  const disabledActions = isOfflineAuth || isBackendUnreachable;

  const { data: usersData, loading: loadingUsers } = useGetAllUsersQuery({});

  const queryVariables = useMemo(
    () => ({
      query: {
        page: 1,
        limit: pageSize,
        type: selectedType,
        userId,
        objectId: objectId || undefined,
        targetId: targetId || undefined,
      },
    }),
    [selectedType, userId, objectId, targetId, pageSize]
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
        if (!fetchMoreResult?.events) return prev as any;
        return {
          ...prev,
          events: {
            ...fetchMoreResult.events,
            events: [
              ...(prev.events?.events ?? []),
              ...fetchMoreResult.events.events,
            ],
          },
        } as any;
      },
    });
  }, [hasNextPage, isLoading, currentPage, queryVariables.query, fetchMore]);

  const handleClearFilters = useCallback(() => {
    setSelectedType(undefined);
    setUserId(undefined);
    setObjectId("");
    setTargetId("");
  }, []);

  const eventTypeOptions = useMemo(
    () =>
      Object.values(EventType).map((value) => ({
        label: value,
        value,
      })),
    []
  );

  const allEventTypeOptions = useMemo(
    () => [
      { label: t("common.all"), value: undefined as any },
      ...eventTypeOptions,
    ],
    [eventTypeOptions, t]
  );

  const userOptions = useMemo(() => {
    const options = (usersData?.users ?? []).map((u) => ({
      label: u.username || u.email || u.id,
      value: u.id as string,
      subtitle: u.email || undefined,
    }));
    return [{ label: t("common.all"), value: undefined as any }, ...options];
  }, [usersData, t]);

  const userIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of usersData?.users ?? []) {
      map[u.id] = u.username || u.email || u.id;
    }
    return map;
  }, [usersData]);

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
    <Surface style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Header with refresh button */}
      <Surface style={[styles.header, { backgroundColor: theme.colors.surface }]} elevation={1}>
        <Text variant="headlineSmall" style={styles.headerTitle}>
          {t("eventsReview.title")}
        </Text>
        <Button
          mode="outlined"
          onPress={handleRefresh}
          disabled={isRefreshing || isLoading || disabledActions}
          style={styles.refreshButton}
        >
          {isRefreshing || isLoading ? (
            <ActivityIndicator size="small" color={theme.colors.primary} />
          ) : (
            <Icon source="refresh" size={20} />
          )}
        </Button>
      </Surface>

      <Surface style={[styles.pageContent, { backgroundColor: theme.colors.background }]}>
        <Surface style={[styles.statsContainer, { backgroundColor: theme.colors.surface }]} elevation={0}>
          <Text variant="bodyMedium" style={styles.statsText}>
            {t("common.showing")} {events.length} {t("common.of")} {total}{" "}
            {t("common.results")}
          </Text>
        </Surface>

        <View style={styles.filtersContainer}>
          <Surface style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.searchIcon}>
              <Icon source="magnify" size={18} />
            </View>
            <TextInput
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
              placeholder={t("eventsReview.filters.objectId")}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={objectId}
              onChangeText={setObjectId}
              editable={!disabledActions}
            />
            {objectId.length > 0 && (
              <TouchableOpacity
                onPress={() => setObjectId("")}
                style={styles.clearButton}
                disabled={disabledActions}
              >
                <Icon source="close-circle" size={18} />
              </TouchableOpacity>
            )}
          </Surface>
        </View>

        <View style={styles.filtersContainer}>
          <Surface style={[styles.searchContainer, { backgroundColor: theme.colors.surface }]} elevation={1}>
            <View style={styles.searchIcon}>
              <Icon source="cellphone" size={18} />
            </View>
            <TextInput
              style={[styles.searchInput, { color: theme.colors.onSurface }]}
              placeholder={t("eventsReview.filters.targetId")}
              placeholderTextColor={theme.colors.onSurfaceVariant}
              value={targetId}
              onChangeText={setTargetId}
              editable={!disabledActions}
            />
            {targetId.length > 0 && (
              <TouchableOpacity
                onPress={() => setTargetId("")}
                style={styles.clearButton}
                disabled={disabledActions}
              >
                <Icon source="close-circle" size={18} />
              </TouchableOpacity>
            )}
          </Surface>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: theme.colors.outline,
              backgroundColor: selectedType
                ? theme.colors.primaryContainer
                : theme.colors.surface,
            },
          ]}
          onPress={() => setShowTypeModal(true)}
          activeOpacity={0.7}
          disabled={disabledActions}
        >
          <Icon
            source="filter"
            size={16}
            color={
              selectedType
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
          {selectedType && (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.filterBadgeText}>T</Text>
            </View>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.filterButton,
            {
              borderColor: theme.colors.outline,
              backgroundColor: userId
                ? theme.colors.primaryContainer
                : theme.colors.surface,
            },
          ]}
          onPress={() => setShowUserModal(true)}
          activeOpacity={0.7}
          disabled={loadingUsers || disabledActions}
        >
          <Icon
            source="account"
            size={16}
            color={
              userId
                ? theme.colors.primary
                : theme.colors.onSurfaceVariant
            }
          />
          {userId && (
            <View
              style={[
                styles.filterBadge,
                { backgroundColor: theme.colors.primary },
              ]}
            >
              <Text style={styles.filterBadgeText}>U</Text>
            </View>
          )}
        </TouchableOpacity>

        {(selectedType || userId || objectId || targetId) && (
          <TouchableOpacity
            style={[
              styles.clearFiltersButton,
              {
                borderColor: theme.colors.outline,
                backgroundColor: theme.colors.surface,
              },
            ]}
            onPress={handleClearFilters}
            activeOpacity={0.7}
            disabled={disabledActions}
          >
            <Icon
              source="refresh"
              size={16}
              color={theme.colors.onSurfaceVariant}
            />
          </TouchableOpacity>
        )}
        </View>

        {isLoading && events.length === 0 ? (
          <Surface style={[styles.loadingContainer, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text variant="bodyLarge" style={styles.loadingText}>
              {t("common.loading")}
            </Text>
          </Surface>
        ) : events.length === 0 ? (
          <Surface style={[styles.emptyState, { backgroundColor: theme.colors.surface }]} elevation={0}>
            <Icon source="magnify" size={64} color={theme.colors.onSurfaceVariant} />
            <Text variant="headlineSmall" style={styles.emptyTitle}>
              {t("eventsReview.empty.title")}
            </Text>
            <Text variant="bodyMedium" style={styles.emptyDescription}>
              {t("eventsReview.empty.description")}
            </Text>
          </Surface>
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

        <Portal>
          <Dialog
            visible={showTypeModal}
            onDismiss={() => setShowTypeModal(false)}
            style={styles.dialog}
          >
            <Dialog.Title>{t("eventsReview.filters.type")}</Dialog.Title>
            <Dialog.ScrollArea>
              <ScrollView contentContainerStyle={styles.dialogContent}>
                {allEventTypeOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value || "all"}
                    style={[
                      styles.modalOption,
                      {
                        backgroundColor:
                          selectedType === option.value
                            ? theme.colors.primaryContainer
                            : theme.colors.surface,
                      },
                    ]}
                    onPress={() => {
                      setSelectedType(option.value);
                      setShowTypeModal(false);
                    }}
                  >
                    <Text variant="bodyMedium" style={styles.modalOptionText}>
                      {option.label}
                    </Text>
                    {selectedType === option.value && (
                      <Icon
                        source="check"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => setShowTypeModal(false)}>
                {t("common.close")}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>

        <Portal>
          <Dialog
            visible={showUserModal}
            onDismiss={() => setShowUserModal(false)}
            style={styles.dialog}
          >
            <Dialog.Title>{t("eventsReview.filters.userId")}</Dialog.Title>
            <Dialog.ScrollArea>
              <ScrollView contentContainerStyle={styles.dialogContent}>
                {userOptions.map((option) => (
                  <TouchableOpacity
                    key={option.value || "all"}
                    style={[
                      styles.modalOption,
                      {
                        backgroundColor:
                          userId === option.value
                            ? theme.colors.primaryContainer
                            : theme.colors.surface,
                      },
                    ]}
                    onPress={() => {
                      setUserId(option.value);
                      setShowUserModal(false);
                    }}
                  >
                    <View style={styles.modalOptionContent}>
                      <Text variant="bodyMedium" style={styles.modalOptionText}>
                        {option.label}
                      </Text>
                      {"subtitle" in option && option.subtitle && (
                        <Text variant="bodySmall" style={styles.modalOptionSubtitle}>
                          {option.subtitle}
                        </Text>
                      )}
                    </View>
                    {userId === option.value && (
                      <Icon
                        source="check"
                        size={20}
                        color={theme.colors.primary}
                      />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </Dialog.ScrollArea>
            <Dialog.Actions>
              <Button onPress={() => setShowUserModal(false)}>
                {t("common.close")}
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </Surface>
    </Surface>
  );
}

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
  pageContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
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
  filtersContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 8,
  },
  searchContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 40,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    height: 40,
  },
  clearButton: {
    padding: 4,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  filterBadge: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "600",
    color: "white",
  },
  clearFiltersButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
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
  dialog: {
    maxHeight: "80%",
  },
  dialogContent: {
    padding: 16,
  },
  modalOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 8,
    justifyContent: "space-between",
  },
  modalOptionContent: {
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: "500",
  },
  modalOptionSubtitle: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 2,
  },
});
