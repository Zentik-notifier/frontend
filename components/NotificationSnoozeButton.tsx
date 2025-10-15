import { useDateFormat } from "@/hooks/useDateFormat";
import { useBucket, useSetBucketSnooze } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";
import { DatePickerInput, TimePickerModal } from "react-native-paper-dates";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import {
  ActivityIndicator,
  Icon,
  Button as PaperButton,
  Portal,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";

interface QuickSnoozeOption {
  label: string;
  value: number; // minutes
}

interface NotificationSnoozeButtonProps {
  bucketId: string;
  variant: "swipeable" | "detail" | "inline";
  showText?: boolean;
  fullWidth?: boolean;
  onPress?: () => void;
  style?: any;
  // Optional: pass snooze data to avoid fetching bucket (optimization for lists)
  isSnoozed?: boolean;
  snoozeUntilDate?: string | null;
}

const NotificationSnoozeButton: React.FC<NotificationSnoozeButtonProps> = ({
  bucketId,
  variant,
  showText = false,
  fullWidth = false,
  onPress,
  style,
  isSnoozed: isSnoozedProp,
  snoozeUntilDate,
}) => {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate, datePickerLocale, use24HourTime } = useDateFormat();

  const { userId } = useAppContext();
  // Only fetch bucket if snooze data not provided (for BucketDetail page)
  const { bucket, isSnoozed: isSnoozedFetched } = useBucket(
    isSnoozedProp === undefined ? bucketId : undefined,
    { userId: userId ?? undefined }
  );
  
  const { setSnooze, isLoading: settingSnooze } = useSetBucketSnooze({
    onSuccess: () => {
      console.log('[NotificationSnoozeButton] Snooze updated successfully');
      setShowModal(false);
    },
    onError: (error) => {
      console.error('[NotificationSnoozeButton] Snooze update failed:', error);
      Alert.alert("Error", t("notificationDetail.snooze.errorSetting"));
    },
  });

  // Use prop if provided, otherwise use fetched data
  const isSnoozed = isSnoozedProp ?? isSnoozedFetched;
  const snoozeUntil = snoozeUntilDate
    ? new Date(snoozeUntilDate)
    : bucket?.userBucket?.snoozeUntil
    ? new Date(bucket.userBucket.snoozeUntil)
    : null;

  const shouldShow = variant === "detail" || isSnoozed;

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [quickLoading, setQuickLoading] = useState<number | null>(null);

  const quickSnoozeOptions: QuickSnoozeOption[] = useMemo(
    () => [
      { label: t("notificationDetail.snooze.quickTimes.15min"), value: 15 },
      { label: t("notificationDetail.snooze.quickTimes.1hour"), value: 60 },
      { label: t("notificationDetail.snooze.quickTimes.4hours"), value: 240 },
      { label: t("notificationDetail.snooze.quickTimes.12hours"), value: 720 },
      { label: t("notificationDetail.snooze.quickTimes.1day"), value: 1440 },
      { label: t("notificationDetail.snooze.quickTimes.3days"), value: 4320 },
      { label: t("notificationDetail.snooze.quickTimes.1week"), value: 10080 },
      { label: t("notificationDetail.snooze.quickTimes.2weeks"), value: 20160 },
    ],
    [t]
  );

  const extendedOptions = useMemo(() => {
    const arr = [...quickSnoozeOptions];
    if (arr.length % 2 === 1) {
      arr.push({ label: "", value: -1 });
    }
    return arr;
  }, [quickSnoozeOptions]);

  if (!shouldShow || !bucketId) {
    return null;
  }

  const handleQuickSnooze = async (minutes: number) => {
    try {
      setQuickLoading(minutes);
      const newSnoozeDate = new Date(Date.now() + minutes * 60 * 1000);
      await handleSetSnooze(newSnoozeDate);
    } finally {
      setQuickLoading(null);
    }
  };

  const openModal = () => {
    setSelectedDate(new Date(Date.now() + 60 * 60 * 1000));
    setShowModal(true);
  };

  const handleDateChange = (date: Date | undefined) => {
    if (date) {
      const newDate = new Date(date);
      newDate.setHours(
        selectedDate.getHours(),
        selectedDate.getMinutes(),
        0,
        0
      );
      setSelectedDate(newDate);
    }
  };

  const handleTimeChange = (
    time: { hours: number; minutes: number } | undefined
  ) => {
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.hours, time.minutes, 0, 0);
      setSelectedDate(newDate);
    }
  };

  const handleSetSnooze = async (date: Date) => {
    if (!bucketId) return;
    try {
      await setSnooze({ bucketId, snoozeUntil: date });
    } catch (error) {
      // Error già gestito in onError
    }
  };

  const handleRemoveSnooze = async () => {
    if (!bucketId) return;
    try {
      await setSnooze({ bucketId, snoozeUntil: null });
    } catch (error) {
      Alert.alert("Error", t("notificationDetail.snooze.errorRemoving"));
    }
  };

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      openModal();
    }
  };

  const getRemainingTime = () => {
    if (!snoozeUntil) return "";
    const now = new Date();
    const remaining = snoozeUntil.getTime() - now.getTime();
    if (remaining <= 0) return "";
    const minutes = Math.floor(remaining / (1000 * 60));
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    if (days > 0) {
      return `${days}g ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours}h ${minutes % 60}m`;
    } else {
      return `${minutes}m`;
    }
  };

  const buttonText = isSnoozed
    ? variant === "swipeable"
      ? getRemainingTime()
      : `${t("notificationDetail.snooze.snoozedFor")} ${getRemainingTime()}`
    : t("notificationDetail.snooze.setSnooze");

  return (
    <>
      <TouchableRipple
        style={[
          variant === "inline"
            ? [
                styles.inlinePill,
                {
                  backgroundColor:
                    theme.colors.elevation?.level1 || theme.colors.surface,
                },
              ]
            : [
                variant === "swipeable"
                  ? styles.swipeableButton
                  : styles.detailButton,
                fullWidth ? { width: "100%" } : null,
                {
                  backgroundColor: isSnoozed
                    ? theme.colors.primary
                    : theme.colors.surfaceVariant,
                },
              ],
          style,
        ]}
        onPress={handlePress}
        disabled={settingSnooze}
      >
        <View style={styles.buttonContent}>
          <Icon
            source="sleep"
            size={16}
            color={
              isSnoozed ? theme.colors.onPrimary : theme.colors.onSurfaceVariant
            }
          />
          {showText && (
            <Text
              style={[
                variant === "swipeable"
                  ? styles.swipeableText
                  : variant === "inline"
                  ? styles.inlineText
                  : styles.detailText,
                { color: theme.colors.onSurface },
              ]}
            >
              {buttonText}
            </Text>
          )}
        </View>
      </TouchableRipple>

      {/* Modal completo per lo snooze */}
      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <SafeAreaView
          style={[
            styles.modalContainer,
            { backgroundColor: theme.colors.background },
          ]}
        >
          <View
            style={[styles.header, { borderBottomColor: theme.colors.outline }]}
          >
            <View style={styles.headerLeft}>
              <Icon
                source="clock-outline"
                size={24}
                color={theme.colors.primary}
              />
              <Text
                style={[styles.headerTitle, { color: theme.colors.onSurface }]}
              >
                {t("notificationDetail.snooze.title")}
              </Text>
            </View>
            <View style={styles.headerRight}>
              {isSnoozed && (
                <TouchableRipple
                  style={[
                    styles.clearAllButton,
                    {
                      backgroundColor: theme.colors.error,
                      opacity: settingSnooze ? 0.8 : 1,
                    },
                  ]}
                  onPress={handleRemoveSnooze}
                  disabled={settingSnooze}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    {settingSnooze ? (
                      <ActivityIndicator
                        color={theme.colors.onPrimary}
                        size="small"
                      />
                    ) : (
                      <>
                        <Icon
                          source="refresh"
                          size={16}
                          color={theme.colors.onPrimary}
                        />
                        <Text style={styles.clearAllText}>
                          {t("notificationDetail.snooze.removeSnooze")}
                        </Text>
                      </>
                    )}
                  </View>
                </TouchableRipple>
              )}
              <TouchableRipple
                style={[
                  styles.closeButton,
                  {
                    backgroundColor:
                      theme.colors.elevation?.level1 || theme.colors.surface,
                  },
                ]}
                onPress={() => setShowModal(false)}
              >
                <Icon source="close" size={20} color={theme.colors.onSurface} />
              </TouchableRipple>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: 16, alignItems: "center" }}
          >
            {isSnoozed && snoozeUntil && (
              <View style={styles.section}>
                <Text
                  style={[
                    styles.sectionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("notificationDetail.snooze.snoozedUntil")}
                </Text>
                <View
                  style={[
                    styles.currentSnoozeCard,
                    {
                      width: "100%",
                      borderColor:
                        theme.colors.outlineVariant || theme.colors.outline,
                      backgroundColor:
                        theme.colors.elevation?.level1 || theme.colors.surface,
                    },
                  ]}
                >
                  <Icon
                    source="clock-outline"
                    size={18}
                    color={theme.colors.onSurfaceVariant}
                  />
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[
                        styles.currentSnoozeTime,
                        { color: theme.colors.onSurface },
                      ]}
                    >
                      {formatDate(snoozeUntil, true)}
                    </Text>
                    <Text
                      style={[
                        styles.currentSnoozeRemaining,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {getRemainingTime()} {""}
                      {t("notificationDetail.snooze.remaining")}
                    </Text>
                  </View>
                </View>
              </View>
            )}

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("notificationDetail.snooze.quickOptions")}
              </Text>
              <View style={styles.sortButtons}>
                {extendedOptions.map(({ value, label }) => (
                  <TouchableRipple
                    key={value}
                    style={[
                      styles.sortButton,
                      {
                        borderColor: theme.colors.outline,
                        backgroundColor:
                          theme.colors.elevation?.level1 ||
                          theme.colors.surface,
                        opacity:
                          value === -1 ||
                          settingSnooze ||
                          (quickLoading !== null && quickLoading !== value)
                            ? 0.6
                            : 1,
                      },
                    ]}
                    onPress={() => value !== -1 && handleQuickSnooze(value)}
                    disabled={
                      value === -1 || settingSnooze || quickLoading !== null
                    }
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 12,
                        justifyContent: "center",
                      }}
                    >
                      {value !== -1 && quickLoading === value ? (
                        <ActivityIndicator
                          color={theme.colors.onSurfaceVariant}
                          size="small"
                        />
                      ) : value !== -1 ? (
                        <Icon
                          source="clock-outline"
                          size={18}
                          color={theme.colors.onSurfaceVariant}
                        />
                      ) : (
                        <View />
                      )}
                      {value !== -1 && (
                        <Text
                          style={[
                            styles.sortButtonText,
                            { color: theme.colors.onSurface },
                          ]}
                        >
                          {label}
                        </Text>
                      )}
                    </View>
                  </TouchableRipple>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text
                style={[styles.sectionTitle, { color: theme.colors.onSurface }]}
              >
                {t("notificationDetail.snooze.customDateTime")}
              </Text>

              <View style={styles.dateTimePickerContainer}>
                <View style={styles.pickerRow}>
                  <DatePickerInput
                    locale={datePickerLocale}
                    label={String(
                      t("notificationDetail.snooze.selectDate" as any)
                    )}
                    value={selectedDate}
                    onChange={(date) => handleDateChange(date)}
                    inputMode="start"
                    mode="outlined"
                    validRange={{
                      startDate: new Date(),
                    }}
                    style={styles.dateInput}
                  />

                  <View style={styles.timeInputTouchable}>
                    <TouchableRipple
                      onPress={() => {
                        setShowTimePicker(true);
                      }}
                      style={{ borderRadius: 4 }}
                    >
                      <View pointerEvents="none">
                        <TextInput
                          label={String(
                            t("notificationDetail.snooze.selectTime" as any)
                          )}
                          value={selectedDate.toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                          mode="outlined"
                          editable={false}
                          right={<TextInput.Icon icon="clock-outline" />}
                          style={styles.timeInput}
                        />
                      </View>
                    </TouchableRipple>
                  </View>
                </View>
              </View>

              <PaperButton
                mode="contained"
                onPress={() => handleSetSnooze(selectedDate)}
                style={styles.customButton}
                disabled={settingSnooze}
                loading={settingSnooze}
              >
                {t("notificationDetail.snooze.confirm")}
              </PaperButton>

              <TimePickerModal
                use24HourClock={use24HourTime}
                locale={datePickerLocale}
                visible={showTimePicker}
                onDismiss={() => {
                  setShowTimePicker(false);
                }}
                onConfirm={(time) => {
                  console.log("Time confirmed:", time);
                  handleTimeChange(time);
                  setShowTimePicker(false);
                }}
                hours={selectedDate.getHours()}
                minutes={selectedDate.getMinutes()}
                label={String(t("notificationDetail.snooze.selectTime" as any))}
                cancelLabel={String(t("common.cancel"))}
                confirmLabel={String(t("notificationDetail.snooze.confirm"))}
              />
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  swipeableButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    gap: 2,
    justifyContent: "center",
  },
  detailButton: {
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  swipeableText: {
    fontSize: 12,
    fontWeight: "600",
  },
  detailText: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 4,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  inlinePill: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
    gap: 4,
    height: 24,
  },
  inlineText: {
    fontSize: 10,
    fontWeight: "500",
    marginLeft: 3,
  },
  modalContainer: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "600",
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  clearAllButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: "500",
    color: "white",
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  content: {
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
  sortButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 8,
  },
  sortButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
    width: "48%",
  },
  sortButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  currentSnoozeCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    gap: 16,
  },
  currentSnoozeTime: {
    fontSize: 18,
    fontWeight: "700",
    marginBottom: 4,
  },
  currentSnoozeRemaining: {
    fontSize: 14,
  },
  customButton: {
    minWidth: "100%",
  },
  dateTimePickerContainer: {
    marginBottom: 16,
  },
  pickerRow: {
    flexDirection: "row",
    gap: 12,
    alignItems: "flex-start",
  },
  dateInput: {
    flex: 1,
  },
  timeInputTouchable: {
    flex: 1,
  },
  timeInput: {
    flex: 1,
  },
});

export default NotificationSnoozeButton;
