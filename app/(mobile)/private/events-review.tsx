import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon, Button, InlinePicker } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useMemo, useState } from "react";
import { ActivityIndicator, FlatList, StyleSheet, View, TextInput } from "react-native";
import {
  EventType,
  useGetEventsQuery,
  useGetEventsByObjectQuery,
  useGetEventsByTypeQuery,
  useGetEventsByUserQuery,
  useGetAllUsersQuery,
} from "@/generated/gql-operations-generated";

export default function EventsReviewScreen() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  const [selectedType, setSelectedType] = useState<EventType | undefined>(
    undefined
  );
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [objectId, setObjectId] = useState("");

  const { data: usersData, loading: loadingUsers } = useGetAllUsersQuery({});

  const {
    data: allData,
    loading: loadingAll,
    refetch: refetchAll,
  } = useGetEventsQuery({ skip: Boolean(selectedType || userId || objectId) });

  const {
    data: byTypeData,
    loading: loadingByType,
    refetch: refetchByType,
  } = useGetEventsByTypeQuery({
    variables: { type: selectedType as EventType },
    skip: !selectedType || Boolean(userId || objectId),
  });

  const {
    data: byUserData,
    loading: loadingByUser,
    refetch: refetchByUser,
  } = useGetEventsByUserQuery({
    variables: { userId: userId as string },
    skip: !userId || Boolean(selectedType || objectId),
  });

  const {
    data: byObjectData,
    loading: loadingByObject,
    refetch: refetchByObject,
  } = useGetEventsByObjectQuery({
    variables: { objectId },
    skip: !objectId || Boolean(selectedType || userId),
  });

  const isLoading =
    loadingAll || loadingByType || loadingByUser || loadingByObject;

  const events = useMemo(() => {
    if (selectedType && byTypeData?.eventsByType) return byTypeData.eventsByType;
    if (userId && byUserData?.eventsByUser) return byUserData.eventsByUser;
    if (objectId && byObjectData?.eventsByObject)
      return byObjectData.eventsByObject;
    return allData?.events ?? [];
  }, [selectedType, userId, objectId, allData, byTypeData, byUserData, byObjectData]);

  const handleRefresh = () => {
    if (selectedType) return refetchByType();
    if (userId) return refetchByUser();
    if (objectId) return refetchByObject();
    return refetchAll();
  };

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

  const userOptions = useMemo(
    () => {
      const options = (usersData?.users ?? []).map((u) => ({
        label: u.username || u.email || u.id,
        value: u.id as string,
        subtitle: u.email || undefined,
      }));
      return [{ label: t("common.all"), value: undefined as any }, ...options];
    },
    [usersData, t]
  );

  const userIdToName = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of usersData?.users ?? []) {
      map[u.id] = u.username || u.email || u.id;
    }
    return map;
  }, [usersData]);

  const renderItem = ({ item }: any) => {
    const userDisplay = item.userId ? (userIdToName[item.userId] || item.userId) : "-";
    return (
      <View
        style={[
          styles.eventItem,
          { borderColor: Colors[colorScheme ?? "light"].border },
        ]}
      >
        <View style={styles.eventHeader}>
          <ThemedText style={styles.eventType}>{item.type}</ThemedText>
          <ThemedText style={styles.eventDate}>
            {new Date(item.createdAt).toLocaleString()}
          </ThemedText>
        </View>
        <View style={styles.eventMeta}>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>user:</ThemedText>
            <ThemedText style={styles.metaValue}>{userDisplay}</ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>objectId:</ThemedText>
            <ThemedText style={styles.metaValue}>
              {item.objectId || mappedObjectIdPlaceholder(item.type)}
            </ThemedText>
          </View>
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>id:</ThemedText>
            <ThemedText style={styles.metaValue}>{item.id}</ThemedText>
          </View>
        </View>
      </View>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.filtersContainer}>
        <View style={styles.filterRow}>
          <InlinePicker
            placeholder={t("eventsReview.filters.type")}
            selectedValue={selectedType}
            onValueChange={(val: EventType | undefined) => setSelectedType(val)}
            options={allEventTypeOptions}
            searchable
          />

          <InlinePicker
            placeholder={t("eventsReview.filters.userId")}
            selectedValue={userId}
            onValueChange={(val: string | undefined) => setUserId(val)}
            options={userOptions}
            searchable
            disabled={loadingUsers}
          />

          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { color: Colors[colorScheme].text }]}
              placeholder={t("eventsReview.filters.objectId")}
              placeholderTextColor={Colors[colorScheme].inputPlaceholder}
              value={objectId}
              onChangeText={setObjectId}
            />
          </View>
          <Button
            title={t("common.clear")}
            onPress={() => {
              setSelectedType(undefined);
              setUserId(undefined);
              setObjectId("");
              refetchAll();
            }}
            variant="secondary"
          />
        </View>
      </View>

      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator />
        </View>
      ) : events.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon name="search" size="xl" color="secondary" />
          <ThemedText style={styles.emptyTitle}>
            {t("eventsReview.empty.title")}
          </ThemedText>
          <ThemedText style={styles.emptyDescription}>
            {t("eventsReview.empty.description")}
          </ThemedText>
        </View>
      ) : (
        <FlatList
          data={events}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          onRefresh={handleRefresh}
          refreshing={isLoading}
          contentContainerStyle={styles.listContent}
        />
      )}
    </ThemedView>
  );
}

function mappedObjectIdPlaceholder(type: EventType): string {
  // Placeholder: la mappatura reale può essere implementata in futuro
  switch (type) {
    case EventType.PushPassthrough:
      return "systemTokenId";
    case EventType.Notification:
      return "deviceId";
    case EventType.BucketSharing:
    case EventType.BucketUnsharing:
      return "bucketId";
    case EventType.DeviceRegister:
    case EventType.DeviceUnregister:
      return "deviceId";
    default:
      return "-";
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  filtersContainer: { marginBottom: 16 },
  filterRow: { flexDirection: "column", gap: 12 },
  inputContainer: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "transparent",
  },
  input: {
    fontSize: 16,
    minHeight: 20,
  },
  loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center" },
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
  listContent: { paddingVertical: 8, gap: 8 },
  eventItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    gap: 6,
  },
  eventHeader: { flexDirection: "row", justifyContent: "space-between" },
  eventType: { fontWeight: "700" },
  eventDate: { opacity: 0.7 },
  eventMeta: { gap: 4 },
  metaRow: { flexDirection: "row", gap: 6 },
  metaLabel: { fontWeight: "600", opacity: 0.8 },
  metaValue: { opacity: 0.9 },
});
