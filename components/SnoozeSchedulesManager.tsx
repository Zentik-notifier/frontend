import {
  SnoozeScheduleInput,
  useUpdateBucketSnoozesMutation,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { TranslationKeyPath } from "@/utils";
import React, { useMemo, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  Dimensions,
} from "react-native";
import {
  Button,
  Card,
  Icon,
  Modal,
  Portal,
  Surface,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";

interface SnoozeSchedulesManagerProps {
  bucketId: string;
  disabled?: boolean;
}

const DAYS_OF_WEEK: { value: string; label: TranslationKeyPath }[] = [
  { value: "monday", label: "recurringSnooze.days.monday" },
  { value: "tuesday", label: "recurringSnooze.days.tuesday" },
  { value: "wednesday", label: "recurringSnooze.days.wednesday" },
  { value: "thursday", label: "recurringSnooze.days.thursday" },
  { value: "friday", label: "recurringSnooze.days.friday" },
  { value: "saturday", label: "recurringSnooze.days.saturday" },
  { value: "sunday", label: "recurringSnooze.days.sunday" },
];

const TIME_OPTIONS = [
  "00:00",
  "00:30",
  "01:00",
  "01:30",
  "02:00",
  "02:30",
  "03:00",
  "03:30",
  "04:00",
  "04:30",
  "05:00",
  "05:30",
  "06:00",
  "06:30",
  "07:00",
  "07:30",
  "08:00",
  "08:30",
  "09:00",
  "09:30",
  "10:00",
  "10:30",
  "11:00",
  "11:30",
  "12:00",
  "12:30",
  "13:00",
  "13:30",
  "14:00",
  "14:30",
  "15:00",
  "15:30",
  "16:00",
  "16:30",
  "17:00",
  "17:30",
  "18:00",
  "18:30",
  "19:00",
  "19:30",
  "20:00",
  "20:30",
  "21:00",
  "21:30",
  "22:00",
  "22:30",
  "23:00",
  "23:30",
];

export default function SnoozeSchedulesManager({
  bucketId,
  disabled = false,
}: SnoozeSchedulesManagerProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [currentSchedule, setCurrentSchedule] = useState<SnoozeScheduleInput>({
    days: [],
    timeFrom: "09:00",
    timeTill: "17:00",
    isEnabled: true,
  });

  const { bucket, refetch } = useGetBucketData(bucketId);
  const schedules = useMemo(
    () =>
      (bucket?.userBucket?.snoozes ?? []).map(
        ({ __typename, ...rest }) => rest
      ),
    [bucket]
  );

  const [updateSnoozeSchedules] = useUpdateBucketSnoozesMutation({
    onCompleted: () => {
      refetch?.();
    },
    onError: (error: any) => {
      console.error("Update snooze schedules error:", error);
      refetch?.();
      Alert.alert("Error", "Failed to update snooze schedules");
    },
  });

  const handleSchedulesChange = async (newSchedules: SnoozeScheduleInput[]) => {
    if (!bucket) return;

    // // Optimistic cache update for immediate UI feedback
    // try {
    //   const bucketCacheId = apolloClient.cache.identify({
    //     __typename: "Bucket",
    //     id: bucket.id,
    //   });

    //   apolloClient.cache.modify({
    //     id: bucketCacheId,
    //     fields: {
    //       userBucket(existingRef, { readField }) {
    //         if (!existingRef) return existingRef;
    //         const userBucketId = readField<string>("id", existingRef);
    //         if (!userBucketId) return existingRef;

    //         // Write only the snoozes field on the existing UserBucket
    //         apolloClient.cache.writeFragment({
    //           id: apolloClient.cache.identify({
    //             __typename: "UserBucket",
    //             id: userBucketId,
    //           }),
    //           fragment: gql`
    //             fragment UserBucketSnoozes on UserBucket {
    //               snoozes {
    //                 days
    //                 timeFrom
    //                 timeTill
    //                 isEnabled
    //                 __typename
    //               }
    //             }
    //           `,
    //           data: {
    //             snoozes: newSchedules.map((s) => ({
    //               __typename: "SnoozeSchedule",
    //               days: s.days,
    //               timeFrom: s.timeFrom,
    //               timeTill: s.timeTill,
    //               isEnabled: s.isEnabled,
    //             })),
    //           },
    //         });

    //         return existingRef;
    //       },
    //     },
    //   });
    // } catch (e) {
    //   // If cache write fails, we still proceed with server update
    // }

    try {
      await updateSnoozeSchedules({
        variables: {
          bucketId: bucket.id,
          snoozes: newSchedules,
        },
      });
    } catch (error: any) {
      console.error("Immediate snooze update failed:", error);
      // Best-effort sync after failure
      try {
        await refetch();
      } catch {}
      Alert.alert(
        String(t("common.error")),
        String(t("buckets.form.updateErrorMessage"))
      );
    }
  };

  const openAddModal = () => {
    setCurrentSchedule({
      days: [],
      timeFrom: "09:00",
      timeTill: "17:00",
      isEnabled: true,
    });
    setEditingIndex(null);
    setShowAddModal(true);
  };

  const openEditModal = (index: number) => {
    setCurrentSchedule({ ...schedules[index] });
    setEditingIndex(index);
    setShowAddModal(true);
  };

  const closeModal = () => {
    setShowAddModal(false);
    setEditingIndex(null);
    setCurrentSchedule({
      days: [],
      timeFrom: "09:00",
      timeTill: "17:00",
      isEnabled: true,
    });
  };

  const toggleDay = (day: string) => {
    setCurrentSchedule((prev) => ({
      ...prev,
      days: prev.days.includes(day)
        ? prev.days.filter((d) => d !== day)
        : [...prev.days, day],
    }));
  };

  const saveSchedule = () => {
    if (currentSchedule.days.length === 0) {
      Alert.alert(
        t("common.error"),
        t("recurringSnooze.validation.selectDays")
      );
      return;
    }

    if (currentSchedule.timeFrom >= currentSchedule.timeTill) {
      Alert.alert(
        t("common.error"),
        t("recurringSnooze.validation.invalidTimeRange")
      );
      return;
    }

    const newSchedules = [...schedules];
    if (editingIndex !== null) {
      newSchedules[editingIndex] = currentSchedule;
    } else {
      newSchedules.push(currentSchedule);
    }
    handleSchedulesChange(newSchedules);
    closeModal();
  };

  const deleteSchedule = (index: number) => {
    const newSchedules = schedules.filter((_, i) => i !== index);
    handleSchedulesChange(newSchedules);
  };

  const toggleScheduleEnabled = (index: number) => {
    const newSchedules = [...schedules];
    newSchedules[index] = {
      ...newSchedules[index],
      isEnabled: !newSchedules[index].isEnabled,
    };
    handleSchedulesChange(newSchedules);
  };

  const formatDays = (days: string[]) => {
    if (days.length === 0) return t("recurringSnooze.formats.noDaysSelected");
    if (days.length === 7) return t("recurringSnooze.formats.everyDay");
    if (
      days.length === 5 &&
      days.every((d) =>
        ["monday", "tuesday", "wednesday", "thursday", "friday"].includes(d)
      )
    ) {
      return t("recurringSnooze.formats.weekdays");
    }
    if (
      days.length === 2 &&
      days.includes("saturday") &&
      days.includes("sunday")
    ) {
      return t("recurringSnooze.formats.weekends");
    }
    return days
      .map((day) => t(DAYS_OF_WEEK.find((d) => d.value === day)!.label))
      .join(", ");
  };

  const deviceHeight = Dimensions.get("window").height;
  const containerStyle = {
    backgroundColor: theme.colors.surface,
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 24,
    maxHeight: deviceHeight * 0.8,
  } as const;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Button
          mode="contained"
          onPress={openAddModal}
          disabled={disabled}
          icon="plus"
          style={styles.addButton}
        >
          {t("recurringSnooze.addSchedule")}
        </Button>
      </View>

      {schedules.length === 0 ? (
        <Card style={styles.emptyState}>
          <Card.Content style={styles.emptyStateContent}>
            <Icon
              source="clock-outline"
              size={48}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="titleMedium" style={styles.emptyStateText}>
              {t("recurringSnooze.noSchedules")}
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.emptyStateSubtext,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("recurringSnooze.noSchedulesDescription")}
            </Text>
          </Card.Content>
        </Card>
      ) : (
        <ScrollView
          style={styles.schedulesList}
          showsVerticalScrollIndicator={false}
        >
          {schedules.map((schedule, index) => (
            <Card
              key={index}
              style={[
                styles.scheduleCard,
                !schedule.isEnabled && styles.disabledSchedule,
              ]}
            >
              <Card.Content>
                <View style={styles.scheduleHeader}>
                  <TouchableOpacity
                    style={styles.enableToggle}
                    onPress={() => toggleScheduleEnabled(index)}
                    disabled={disabled}
                  >
                    <Icon
                      source={
                        schedule.isEnabled ? "check-circle" : "circle-outline"
                      }
                      size={24}
                      color={
                        schedule.isEnabled
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant
                      }
                    />
                  </TouchableOpacity>
                  <View style={styles.scheduleInfo}>
                    <Text variant="titleSmall" style={styles.scheduleDays}>
                      {formatDays(schedule.days)}
                    </Text>
                    <Text
                      variant="bodyMedium"
                      style={{ color: theme.colors.onSurfaceVariant }}
                    >
                      {schedule.timeFrom} - {schedule.timeTill}
                    </Text>
                  </View>
                  <View style={styles.scheduleActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => openEditModal(index)}
                      disabled={disabled}
                    >
                      <Icon
                        source="pencil"
                        size={20}
                        color={theme.colors.primary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => deleteSchedule(index)}
                      disabled={disabled}
                    >
                      <Icon
                        source="delete"
                        size={20}
                        color={theme.colors.error}
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </Card.Content>
            </Card>
          ))}
        </ScrollView>
      )}

      <Portal>
        <Modal
          visible={showAddModal}
          onDismiss={closeModal}
          contentContainerStyle={containerStyle}
          dismissableBackButton
        >
          <View
            style={[
              styles.modalHeader,
              {
                borderBottomColor: theme.colors.outline,
                backgroundColor: "transparent",
              },
            ]}
          >
            <View style={styles.headerLeft}>
              <Icon
                source="clock-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text style={styles.modalTitle}>
                {editingIndex !== null
                  ? t("recurringSnooze.editSchedule")
                  : t("recurringSnooze.addScheduleTitle")}
              </Text>
            </View>
            <TouchableRipple
              style={[styles.closeButton]}
              onPress={closeModal}
              borderless
            >
              <Icon source="close" size={20} color={theme.colors.onSurface} />
            </TouchableRipple>
          </View>

          <ScrollView
            contentContainerStyle={{
              padding: 20,
            }}
          >
            <View style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                {t("recurringSnooze.daysOfWeek")}
              </Text>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.dayButton,
                      { borderColor: theme.colors.outline },
                      currentSchedule.days.includes(value) && {
                        backgroundColor: theme.colors.primary,
                        borderColor: theme.colors.primary,
                      },
                    ]}
                    onPress={() => toggleDay(value)}
                  >
                    <Text
                      style={[
                        styles.dayButtonText,
                        {
                          color: currentSchedule.days.includes(value)
                            ? theme.colors.onPrimary
                            : theme.colors.onSurface,
                        },
                      ]}
                    >
                      {String(t(label)).slice(0, 3)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text variant="titleSmall" style={styles.sectionTitle}>
                {t("recurringSnooze.timeRange")}
              </Text>
              <View style={styles.timeRow}>
                <View style={styles.timePicker}>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.timeLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("recurringSnooze.from")}
                  </Text>
                  <TextInput
                    mode="outlined"
                    value={currentSchedule.timeFrom}
                    onChangeText={(value) =>
                      setCurrentSchedule((prev) => ({
                        ...prev,
                        timeFrom: value,
                      }))
                    }
                    placeholder="09:00"
                    keyboardType="numeric"
                    style={styles.timeInput}
                    contentStyle={styles.timeInputContent}
                    outlineStyle={styles.timeInputOutline}
                  />
                </View>
                <View style={styles.timePicker}>
                  <Text
                    variant="bodySmall"
                    style={[
                      styles.timeLabel,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                  >
                    {t("recurringSnooze.to")}
                  </Text>
                  <TextInput
                    mode="outlined"
                    value={currentSchedule.timeTill}
                    onChangeText={(value) =>
                      setCurrentSchedule((prev) => ({
                        ...prev,
                        timeTill: value,
                      }))
                    }
                    placeholder="17:00"
                    keyboardType="numeric"
                    style={styles.timeInput}
                    contentStyle={styles.timeInputContent}
                    outlineStyle={styles.timeInputOutline}
                  />
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.enableRow}>
                <Text variant="titleSmall" style={styles.sectionTitle}>
                  {t("recurringSnooze.enableSchedule")}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.enableSwitch,
                    {
                      backgroundColor: currentSchedule.isEnabled
                        ? theme.colors.primary
                        : theme.colors.outline,
                    },
                  ]}
                  onPress={() =>
                    setCurrentSchedule((prev) => ({
                      ...prev,
                      isEnabled: !prev.isEnabled,
                    }))
                  }
                >
                  <View
                    style={[
                      styles.enableThumb,
                      {
                        transform: [
                          { translateX: currentSchedule.isEnabled ? 20 : 0 },
                        ],
                      },
                    ]}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          <View style={styles.modalFooter}>
            <Button
              mode="outlined"
              onPress={closeModal}
              style={styles.footerButton}
            >
              {t("recurringSnooze.cancel")}
            </Button>
            <Button
              mode="contained"
              onPress={saveSchedule}
              style={styles.footerButton}
            >
              {editingIndex !== null
                ? t("recurringSnooze.update")
                : t("recurringSnooze.add")}
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
  },
  addButton: {
    margin: 0,
  },
  emptyState: {
    marginBottom: 16,
  },
  emptyStateContent: {
    alignItems: "center",
    padding: 32,
  },
  emptyStateText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  schedulesList: {
    maxHeight: 300,
  },
  scheduleCard: {
    marginBottom: 12,
  },
  disabledSchedule: {
    opacity: 0.6,
  },
  scheduleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  enableToggle: {
    padding: 4,
  },
  scheduleInfo: {
    flex: 1,
  },
  scheduleDays: {
    marginBottom: 4,
  },
  scheduleActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    height: 60,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  section: {
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  dayButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 60,
    alignItems: "center",
  },
  dayButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
  timeRow: {
    flexDirection: "row",
    gap: 16,
  },
  timePicker: {
    flex: 1,
  },
  timeLabel: {
    fontSize: 14,
    marginBottom: 8,
  },
  timeInput: {
    height: 48,
  },
  timeInputContent: {
    textAlign: "center",
    fontSize: 16,
  },
  timeInputOutline: {
    borderRadius: 8,
  },
  enableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  enableSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
  },
  enableThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "white",
  },
  modalFooter: {
    flexDirection: "row",
    gap: 12,
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: "#ccc",
  },
  footerButton: {
    flex: 1,
  },
});
