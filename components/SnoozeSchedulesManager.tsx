import { Colors } from "@/constants/Colors";
import {
  SnoozeScheduleInput,
  useUpdateBucketSnoozesMutation,
} from "@/generated/gql-operations-generated";
import { useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { TranslationKeyPath } from "@/utils";
import { Ionicons } from "@expo/vector-icons";
import { Picker } from "@react-native-picker/picker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Button } from "./ui/Button";

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
  const colorScheme = useColorScheme();
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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {/* {t("recurringSnooze.title")} */}
        </ThemedText>
        <TouchableOpacity
          style={[
            styles.addButton,
            { backgroundColor: Colors[colorScheme].tint },
            disabled && styles.disabledButton,
          ]}
          onPress={openAddModal}
          disabled={disabled}
        >
          <Ionicons name="add" size={20} color="white" />
          <ThemedText style={styles.addButtonText}>
            {t("recurringSnooze.addSchedule")}
          </ThemedText>
        </TouchableOpacity>
      </View>

      {schedules.length === 0 ? (
        <ThemedView
          style={[
            styles.emptyState,
            { backgroundColor: Colors[colorScheme].backgroundSecondary },
          ]}
        >
          <Ionicons
            name="time-outline"
            size={48}
            color={Colors[colorScheme].textSecondary}
          />
          <ThemedText
            style={[
              styles.emptyStateText,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("recurringSnooze.noSchedules")}
          </ThemedText>
          <ThemedText
            style={[
              styles.emptyStateSubtext,
              { color: Colors[colorScheme].textSecondary },
            ]}
          >
            {t("recurringSnooze.noSchedulesDescription")}
          </ThemedText>
        </ThemedView>
      ) : (
        <ScrollView
          style={styles.schedulesList}
          showsVerticalScrollIndicator={false}
        >
          {schedules.map((schedule, index) => (
            <ThemedView
              key={index}
              style={[
                styles.scheduleCard,
                {
                  backgroundColor: Colors[colorScheme].backgroundCard,
                  borderColor: Colors[colorScheme].border,
                },
                !schedule.isEnabled && styles.disabledSchedule,
              ]}
            >
              <View style={styles.scheduleHeader}>
                <TouchableOpacity
                  style={styles.enableToggle}
                  onPress={() => toggleScheduleEnabled(index)}
                  disabled={disabled}
                >
                  <Ionicons
                    name={
                      schedule.isEnabled
                        ? "checkmark-circle"
                        : "ellipse-outline"
                    }
                    size={24}
                    color={
                      schedule.isEnabled
                        ? Colors[colorScheme].tint
                        : Colors[colorScheme].textSecondary
                    }
                  />
                </TouchableOpacity>
                <View style={styles.scheduleInfo}>
                  <ThemedText
                    style={[
                      styles.scheduleDays,
                      { color: Colors[colorScheme].text },
                    ]}
                  >
                    {formatDays(schedule.days)}
                  </ThemedText>
                  <ThemedText
                    style={[
                      styles.scheduleTime,
                      { color: Colors[colorScheme].textSecondary },
                    ]}
                  >
                    {schedule.timeFrom} - {schedule.timeTill}
                  </ThemedText>
                </View>
                <View style={styles.scheduleActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => openEditModal(index)}
                    disabled={disabled}
                  >
                    <Ionicons
                      name="create-outline"
                      size={20}
                      color={Colors[colorScheme].tint}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => deleteSchedule(index)}
                    disabled={disabled}
                  >
                    <Ionicons
                      name="trash-outline"
                      size={20}
                      color={Colors[colorScheme].error}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            </ThemedView>
          ))}
        </ScrollView>
      )}

      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={closeModal}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: Colors[colorScheme].background },
          ]}
        >
          <View
            style={[
              styles.modalHeader,
              { borderBottomColor: Colors[colorScheme].border },
            ]}
          >
            <ThemedText
              style={[styles.modalTitle, { color: Colors[colorScheme].text }]}
            >
              {editingIndex !== null
                ? t("recurringSnooze.editSchedule")
                : t("recurringSnooze.addScheduleTitle")}
            </ThemedText>
            <TouchableOpacity onPress={closeModal} style={styles.closeButton}>
              <Ionicons
                name="close"
                size={24}
                color={Colors[colorScheme].text}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("recurringSnooze.daysOfWeek")}
              </ThemedText>
              <View style={styles.daysGrid}>
                {DAYS_OF_WEEK.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.dayButton,
                      { borderColor: Colors[colorScheme].border },
                      currentSchedule.days.includes(value) && {
                        backgroundColor: Colors[colorScheme].tint,
                        borderColor: Colors[colorScheme].tint,
                      },
                    ]}
                    onPress={() => toggleDay(value)}
                  >
                    <ThemedText
                      style={[
                        styles.dayButtonText,
                        {
                          color: currentSchedule.days.includes(value)
                            ? "white"
                            : Colors[colorScheme].text,
                        },
                      ]}
                    >
                      {String(t(label)).slice(0, 3)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("recurringSnooze.timeRange")}
              </ThemedText>
              <View style={styles.timeRow}>
                <View style={styles.timePicker}>
                  <ThemedText
                    style={[
                      styles.timeLabel,
                      { color: Colors[colorScheme].textSecondary },
                    ]}
                  >
                    {t("recurringSnooze.from")}
                  </ThemedText>
                  <Picker
                    selectedValue={currentSchedule.timeFrom}
                    onValueChange={(value) =>
                      setCurrentSchedule((prev) => ({
                        ...prev,
                        timeFrom: value,
                      }))
                    }
                    style={[styles.picker, { color: Colors[colorScheme].text }]}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
                <View style={styles.timePicker}>
                  <ThemedText
                    style={[
                      styles.timeLabel,
                      { color: Colors[colorScheme].textSecondary },
                    ]}
                  >
                    {t("recurringSnooze.to")}
                  </ThemedText>
                  <Picker
                    selectedValue={currentSchedule.timeTill}
                    onValueChange={(value) =>
                      setCurrentSchedule((prev) => ({
                        ...prev,
                        timeTill: value,
                      }))
                    }
                    style={[styles.picker, { color: Colors[colorScheme].text }]}
                  >
                    {TIME_OPTIONS.map((time) => (
                      <Picker.Item key={time} label={time} value={time} />
                    ))}
                  </Picker>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.enableRow}>
                <ThemedText
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  {t("recurringSnooze.enableSchedule")}
                </ThemedText>
                <TouchableOpacity
                  style={[
                    styles.enableSwitch,
                    {
                      backgroundColor: currentSchedule.isEnabled
                        ? Colors[colorScheme].tint
                        : Colors[colorScheme].border,
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
              title={t("recurringSnooze.cancel")}
              onPress={closeModal}
              variant="secondary"
              style={styles.footerButton}
            />
            <Button
              title={
                editingIndex !== null
                  ? t("recurringSnooze.update")
                  : t("recurringSnooze.add")
              }
              onPress={saveSchedule}
              style={styles.footerButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  addButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
  emptyState: {
    alignItems: "center",
    padding: 32,
    borderRadius: 12,
    borderWidth: 1,
    borderStyle: "dashed",
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: "center",
    opacity: 0.7,
  },
  schedulesList: {
    maxHeight: 300,
  },
  scheduleCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 4,
  },
  scheduleTime: {
    fontSize: 14,
  },
  scheduleActions: {
    flexDirection: "row",
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    flex: 1,
    paddingHorizontal: 20,
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
  picker: {
    borderWidth: 1,
    borderColor: "#ccc",
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
