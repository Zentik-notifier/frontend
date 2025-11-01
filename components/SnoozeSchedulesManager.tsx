import {
  SnoozeScheduleInput,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks";
import { useBucket, useUpdateBucketSnoozes } from "@/hooks/notifications";
import { TranslationKeyPath, useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import React, { useMemo, useState } from "react";
import {
  Alert,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Icon,
  IconButton,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { TimePickerModal } from "react-native-paper-dates";
import DetailSectionCard from "./ui/DetailSectionCard";
import DetailItemCard from "./ui/DetailItemCard";
import DetailModal from "./ui/DetailModal";

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

export default function SnoozeSchedulesManager({
  bucketId,
  disabled = false,
}: SnoozeSchedulesManagerProps) {
  const { t } = useI18n();
  const theme = useTheme();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [showTimeFromPicker, setShowTimeFromPicker] = useState(false);
  const [showTimeTillPicker, setShowTimeTillPicker] = useState(false);
  const [currentSchedule, setCurrentSchedule] = useState<SnoozeScheduleInput>({
    days: [],
    timeFrom: "09:00",
    timeTill: "17:00",
    isEnabled: true,
  });
  const { use24HourTime, datePickerLocale } = useDateFormat();

  const { userId } = useAppContext();
  const { bucket } = useBucket(bucketId, { autoFetch: true, userId: userId ?? undefined });
  const { updateSnoozes, isLoading: isUpdating } = useUpdateBucketSnoozes({
    onSuccess: () => {
      console.log("✅ Snooze schedules updated successfully");
    },
    onError: (error: Error) => {
      console.error("Update snooze schedules error:", error);
      Alert.alert("Error", "Failed to update snooze schedules");
    },
  });

  const schedules = useMemo(
    () =>
      (bucket?.userBucket?.snoozes ?? []).map(
        ({ __typename, ...rest }: any) => rest
      ),
    [bucket]
  );

  const handleSchedulesChange = async (newSchedules: SnoozeScheduleInput[]) => {
    if (!bucket) return;

    try {
      await updateSnoozes({
        bucketId: bucket.id,
        snoozes: newSchedules,
      });
    } catch (error: any) {
      console.error("Immediate snooze update failed:", error);
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
    setShowTimeFromPicker(false);
    setShowTimeTillPicker(false);
    setCurrentSchedule({
      days: [],
      timeFrom: "09:00",
      timeTill: "17:00",
      isEnabled: true,
    });
  };

  const parseTime = (
    timeString: string
  ): { hours: number; minutes: number } => {
    const [hours, minutes] = timeString.split(":").map(Number);
    return { hours: hours || 0, minutes: minutes || 0 };
  };

  const formatTime = (hours: number, minutes: number): string => {
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}`;
  };

  const onTimeFromConfirm = ({
    hours,
    minutes,
  }: {
    hours: number;
    minutes: number;
  }) => {
    setCurrentSchedule((prev) => ({
      ...prev,
      timeFrom: formatTime(hours, minutes),
    }));
    setShowTimeFromPicker(false);
  };

  const onTimeTillConfirm = ({
    hours,
    minutes,
  }: {
    hours: number;
    minutes: number;
  }) => {
    setCurrentSchedule((prev) => ({
      ...prev,
      timeTill: formatTime(hours, minutes),
    }));
    setShowTimeTillPicker(false);
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
    <>
      <DetailSectionCard
        title={t("recurringSnooze.title")}
        description={t("recurringSnooze.description")}
        actionButton={{
          label: t("recurringSnooze.addSchedule"),
          icon: "plus",
          onPress: openAddModal,
          disabled,
        }}
        emptyState={{
          icon: "clock-outline",
          text: t("recurringSnooze.noSchedules"),
        }}
        items={schedules}
        renderItem={(schedule, index) => (
          <DetailItemCard
            icon={schedule.isEnabled ? "check-circle" : "circle-outline"}
            title={formatDays(schedule.days)}
            details={[`${schedule.timeFrom} - ${schedule.timeTill}`]}
            actions={[
              {
                icon: "pencil",
                onPress: () => openEditModal(index),
                disabled,
              },
              {
                icon: "delete",
                onPress: () => deleteSchedule(index),
                color: theme.colors.error,
                disabled,
              },
            ]}
            opacity={schedule.isEnabled ? 1 : 0.6}
          />
        )}
        maxHeight={300}
      />

      <DetailModal
        visible={showAddModal}
        onDismiss={closeModal}
        title={
          editingIndex !== null
            ? t("recurringSnooze.editSchedule")
            : t("recurringSnooze.addScheduleTitle")
        }
        icon="clock-outline"
        actions={{
          cancel: {
            label: t("recurringSnooze.cancel"),
            onPress: closeModal,
          },
          confirm: {
            label:
              editingIndex !== null
                ? t("recurringSnooze.update")
                : t("recurringSnooze.add"),
            onPress: saveSchedule,
          },
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
              <TouchableRipple
                onPress={() => setShowTimeFromPicker(true)}
                style={[
                  styles.timeButton,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <View style={styles.timeButtonContent}>
                  <Icon
                    source="clock-outline"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                  <Text style={styles.timeButtonText}>
                    {currentSchedule.timeFrom}
                  </Text>
                </View>
              </TouchableRipple>
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
              <TouchableRipple
                onPress={() => setShowTimeTillPicker(true)}
                style={[
                  styles.timeButton,
                  {
                    borderColor: theme.colors.outline,
                    backgroundColor: theme.colors.surface,
                  },
                ]}
              >
                <View style={styles.timeButtonContent}>
                  <Icon
                    source="clock-outline"
                    size={20}
                    color={theme.colors.onSurface}
                  />
                  <Text style={styles.timeButtonText}>
                    {currentSchedule.timeTill}
                  </Text>
                </View>
              </TouchableRipple>
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
      </DetailModal>

      <Portal>
        <TimePickerModal
          visible={showTimeFromPicker}
          onDismiss={() => setShowTimeFromPicker(false)}
          onConfirm={onTimeFromConfirm}
          hours={parseTime(currentSchedule.timeFrom).hours}
          minutes={parseTime(currentSchedule.timeFrom).minutes}
          label={t("recurringSnooze.from")}
          cancelLabel={t("recurringSnooze.cancel")}
          animationType="fade"
          use24HourClock={use24HourTime}
          locale={datePickerLocale}
        />

        <TimePickerModal
          visible={showTimeTillPicker}
          onDismiss={() => setShowTimeTillPicker(false)}
          onConfirm={onTimeTillConfirm}
          hours={parseTime(currentSchedule.timeTill).hours}
          minutes={parseTime(currentSchedule.timeTill).minutes}
          label={t("recurringSnooze.to")}
          cancelLabel={t("recurringSnooze.cancel")}
          animationType="fade"
          use24HourClock={use24HourTime}
          locale={datePickerLocale}
        />
      </Portal>
    </>
  );
}

const styles = StyleSheet.create({
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
  timeButton: {
    height: 48,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  timeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  timeButtonText: {
    fontSize: 16,
    fontWeight: "500",
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
});
