import {
  GetBucketDocument,
  SnoozeScheduleInput,
  UserRole,
  useUpdateBucketSnoozesMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat, useGetBucketData } from "@/hooks";
import { useI18n } from "@/hooks/useI18n";
import { useUserSettings } from "@/services/user-settings";
import { TranslationKeyPath } from "@/utils";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Dimensions,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Button,
  Card,
  Icon,
  Modal,
  Portal,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { TimePickerModal } from "react-native-paper-dates";

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

  const { bucket } = useGetBucketData(bucketId);
  const schedules = useMemo(
    () =>
      (bucket?.userBucket?.snoozes ?? []).map(
        ({ __typename, ...rest }) => rest
      ),
    [bucket]
  );

  const [updateSnoozeSchedules] = useUpdateBucketSnoozesMutation({
    optimisticResponse: (vars) => {
      const snoozesArray = Array.isArray(vars.snoozes)
        ? vars.snoozes
        : [vars.snoozes];

      return {
        __typename: "Mutation" as const,
        updateBucketSnoozes: {
          __typename: "UserBucket" as const,
          id: bucket?.userBucket?.id || `userBucket-${bucketId}`,
          userId: bucket?.userBucket?.userId || "",
          bucketId: bucketId,
          snoozeUntil: bucket?.userBucket?.snoozeUntil || null,
          createdAt: bucket?.userBucket?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          snoozes: snoozesArray.map((schedule) => ({
            __typename: "SnoozeSchedule" as const,
            ...schedule,
          })),
          user: bucket?.userBucket?.user || {
            __typename: "User" as const,
            id: "",
            email: "",
            username: "",
            firstName: null,
            lastName: null,
            avatar: null,
            hasPassword: false,
            role: UserRole.User,
            createdAt: "",
            updatedAt: "",
            identities: [],
            buckets: null,
          },
          bucket: bucket || {
            __typename: "Bucket" as const,
            id: bucketId,
            name: "",
            description: null,
            color: null,
            icon: null,
            createdAt: "",
            updatedAt: "",
            isProtected: null,
            isPublic: null,
            user: {
              __typename: "User" as const,
              id: "",
              email: "",
              username: "",
              firstName: null,
              lastName: null,
              avatar: null,
              hasPassword: false,
              role: UserRole.User,
              createdAt: "",
              updatedAt: "",
              identities: [],
              buckets: null,
            },
          },
        },
      };
    },
    update: (cache, { data }) => {
      if (!data?.updateBucketSnoozes) return;

      try {
        // Update the bucket query cache
        const existingData = cache.readQuery<any>({
          query: GetBucketDocument,
          variables: { bucketId },
        });

        if (existingData?.bucket) {
          cache.writeQuery({
            query: GetBucketDocument,
            variables: { bucketId },
            data: {
              bucket: {
                ...existingData.bucket,
                userBucket: {
                  ...existingData.bucket.userBucket,
                  ...data.updateBucketSnoozes,
                  snoozes: data.updateBucketSnoozes.snoozes || [],
                },
              },
            },
          });
        }
      } catch (error) {
        console.error("Failed to update cache after snooze update:", error);
      }
    },
    onError: (error: any) => {
      console.error("Update snooze schedules error:", error);
      Alert.alert("Error", "Failed to update snooze schedules");
    },
  });

  const handleSchedulesChange = async (newSchedules: SnoozeScheduleInput[]) => {
    if (!bucket) return;

    try {
      await updateSnoozeSchedules({
        variables: {
          bucketId: bucket.id,
          snoozes: newSchedules,
        },
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
            <View style={styles.headerActions}>
              <TouchableRipple
                style={styles.headerButton}
                onPress={closeModal}
                borderless
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
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
  headerActions: {
    flexDirection: "row",
    gap: 8,
  },
  headerButton: {
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
