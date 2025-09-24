import { Colors } from "@/constants/Colors";
import {
  GetNotificationsDocument,
  NotificationFragment,
  useSetBucketSnoozeMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useGetBucketData } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { Button } from "./ui/Button";
import { Icon } from "./ui";

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
}

const NotificationSnoozeButton: React.FC<NotificationSnoozeButtonProps> = ({
  bucketId,
  variant,
  showText = false,
  fullWidth = false,
  onPress,
}) => {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { formatDate } = useDateFormat();

  const { bucket, isSnoozed } = useGetBucketData(bucketId);

  const snoozeUntil = bucket?.userBucket?.snoozeUntil
    ? new Date(bucket.userBucket.snoozeUntil)
    : null;

  const shouldShow = variant === "detail" || isSnoozed;

  const [showModal, setShowModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [quickLoading, setQuickLoading] = useState<number | null>(null);
  const [removingSnooze, setRemovingSnooze] = useState(false);

  const [setBucketSnooze, { loading: settingSnooze }] =
    useSetBucketSnoozeMutation({
      // refetchQueries: [GetNotificationsDocument],
      // awaitRefetchQueries: true,
    });

  const quickSnoozeOptions: QuickSnoozeOption[] = useMemo(
    () => [
      { label: t("notificationDetail.snooze.quickTimes.15min"), value: 15 },
      { label: t("notificationDetail.snooze.quickTimes.1hour"), value: 60 },
      { label: t("notificationDetail.snooze.quickTimes.4hours"), value: 240 },
      { label: t("notificationDetail.snooze.quickTimes.12hours"), value: 720 },
      { label: t("notificationDetail.snooze.quickTimes.1day"), value: 1440 },
      { label: t("notificationDetail.snooze.quickTimes.3days"), value: 4320 },
      { label: t("notificationDetail.snooze.quickTimes.1week"), value: 10080 },
    ],
    [t]
  );

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

  const handleIOSDateTimeChange = (event: any, date?: Date) => {
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleAndroidDateChange = (event: any, date?: Date) => {
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

  const handleAndroidTimeChange = (event: any, time?: Date) => {
    if (time) {
      const newDate = new Date(selectedDate);
      newDate.setHours(time.getHours(), time.getMinutes(), 0, 0);
      setSelectedDate(newDate);
    }
  };

  const handleSetSnooze = async (date: Date) => {
    if (!bucketId) return;
    const snoozeUntilISO = date.toISOString();
    try {
      await setBucketSnooze({
        variables: { bucketId, snoozeUntil: snoozeUntilISO },
      });
      setShowModal(false);
      // refetch();
    } catch (error) {
      Alert.alert("Error", t("notificationDetail.snooze.errorSetting"));
    }
  };

  const handleRemoveSnooze = async () => {
    if (!bucketId) return;
    try {
      setRemovingSnooze(true);
      await setBucketSnooze({ variables: { bucketId, snoozeUntil: null } });
      setShowModal(false);
      // refetch();
    } catch (error) {
      Alert.alert("Error", t("notificationDetail.snooze.errorRemoving"));
    } finally {
      setRemovingSnooze(false);
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
      <TouchableOpacity
        style={
          variant === "inline"
            ? [
                styles.inlinePill,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundSecondary,
                },
              ]
            : [
                variant === "swipeable"
                  ? styles.swipeableButton
                  : styles.detailButton,
                fullWidth ? { width: "100%" } : null,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundSecondary,
                  borderColor: Colors[colorScheme ?? "light"].border,
                },
              ]
        }
        onPress={handlePress}
        disabled={settingSnooze}
      >
        <Icon name="snooze" size="xs" color="secondary" />
        {showText && (
          <ThemedText
            style={[
              variant === "swipeable"
                ? styles.swipeableText
                : variant === "inline"
                ? styles.inlineText
                : styles.detailText,
              { color: Colors[colorScheme ?? "light"].text },
            ]}
          >
            {buttonText}
          </ThemedText>
        )}
      </TouchableOpacity>

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
            { backgroundColor: Colors[colorScheme].background },
          ]}
        >
          <View
            style={[
              styles.header,
              { borderBottomColor: Colors[colorScheme].border },
            ]}
          >
            <View style={styles.headerLeft}>
              <Ionicons
                name="time"
                size={24}
                color={Colors[colorScheme].tint}
              />
              <ThemedText
                style={[
                  styles.headerTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("notificationDetail.snooze.title")}
              </ThemedText>
            </View>
            <View style={styles.headerRight}>
              {isSnoozed && (
                <TouchableOpacity
                  style={[
                    styles.clearAllButton,
                    {
                      backgroundColor: Colors[colorScheme].error,
                      opacity: removingSnooze ? 0.8 : 1,
                    },
                  ]}
                  onPress={handleRemoveSnooze}
                  activeOpacity={0.7}
                  disabled={removingSnooze}
                >
                  {removingSnooze ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Ionicons name="refresh" size={16} color="white" />
                      <ThemedText style={styles.clearAllText}>
                        {t("notificationDetail.snooze.removeSnooze")}
                      </ThemedText>
                    </>
                  )}
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.closeButton,
                  { backgroundColor: Colors[colorScheme].backgroundSecondary },
                ]}
                onPress={() => setShowModal(false)}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="close"
                  size={20}
                  color={Colors[colorScheme].text}
                />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView
            style={styles.content}
            showsVerticalScrollIndicator={false}
          >
            {isSnoozed && snoozeUntil && (
              <ThemedView style={styles.section}>
                <ThemedText
                  style={[
                    styles.sectionTitle,
                    { color: Colors[colorScheme].text },
                  ]}
                >
                  {t("notificationDetail.snooze.snoozedUntil")}
                </ThemedText>
                <ThemedView
                  style={[
                    styles.currentSnoozeCard,
                    {
                      borderColor: Colors[colorScheme].borderLight,
                      backgroundColor: Colors[colorScheme].backgroundSecondary,
                    },
                  ]}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={Colors[colorScheme].tint}
                  />
                  <View style={{ flex: 1 }}>
                    <ThemedText
                      style={[
                        styles.currentSnoozeTime,
                        { color: Colors[colorScheme].text },
                      ]}
                    >
                      {formatDate(snoozeUntil)}
                    </ThemedText>
                    <ThemedText
                      style={[
                        styles.currentSnoozeRemaining,
                        { color: Colors[colorScheme].textSecondary },
                      ]}
                    >
                      {getRemainingTime()}{" "}
                      {t("notificationDetail.snooze.remaining")}
                    </ThemedText>
                  </View>
                </ThemedView>
              </ThemedView>
            )}

            <ThemedView style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("notificationDetail.snooze.quickOptions")}
              </ThemedText>
              <ThemedView style={styles.sortButtons}>
                {quickSnoozeOptions.map(({ value, label }) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.sortButton,
                      {
                        borderColor: Colors[colorScheme].border,
                        backgroundColor: Colors[colorScheme].backgroundCard,
                        opacity:
                          settingSnooze ||
                          (quickLoading !== null && quickLoading !== value)
                            ? 0.6
                            : 1,
                      },
                    ]}
                    onPress={() => handleQuickSnooze(value)}
                    activeOpacity={0.7}
                    disabled={settingSnooze || quickLoading !== null}
                  >
                    {quickLoading === value ? (
                      <ActivityIndicator
                        color={Colors[colorScheme].textSecondary}
                        size="small"
                      />
                    ) : (
                      <Ionicons
                        name="time-outline"
                        size={18}
                        color={Colors[colorScheme].textSecondary}
                      />
                    )}
                    <ThemedText
                      style={[
                        styles.sortButtonText,
                        { color: Colors[colorScheme].text },
                      ]}
                    >
                      {label}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </ThemedView>
            </ThemedView>

            <ThemedView style={styles.section}>
              <ThemedText
                style={[
                  styles.sectionTitle,
                  { color: Colors[colorScheme].text },
                ]}
              >
                {t("notificationDetail.snooze.customDateTime")}
              </ThemedText>
              {Platform.OS === "ios" ? (
                <DateTimePicker
                  value={selectedDate}
                  mode="datetime"
                  display="spinner"
                  onChange={handleIOSDateTimeChange}
                  minimumDate={new Date()}
                  themeVariant={colorScheme === "dark" ? "dark" : "light"}
                />
              ) : (
                <>
                  <View
                    style={{
                      backgroundColor: Colors[colorScheme].background,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: Colors[colorScheme].borderLight,
                      paddingVertical: 4,
                    }}
                  >
                    <DateTimePicker
                      value={selectedDate}
                      mode="date"
                      display="spinner"
                      onChange={handleAndroidDateChange}
                      minimumDate={new Date()}
                      themeVariant={colorScheme === "dark" ? "dark" : "light"}
                    />
                  </View>
                  <View style={{ height: 8 }} />
                  <View
                    style={{
                      backgroundColor: Colors[colorScheme].background,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: Colors[colorScheme].borderLight,
                      paddingVertical: 4,
                    }}
                  >
                    <DateTimePicker
                      value={selectedDate}
                      mode="time"
                      display="spinner"
                      onChange={handleAndroidTimeChange}
                      themeVariant={colorScheme === "dark" ? "dark" : "light"}
                    />
                  </View>
                </>
              )}
              <Button
                title={t("notificationDetail.snooze.confirm")}
                onPress={() => handleSetSnooze(selectedDate)}
                style={styles.customButton}
                disabled={settingSnooze}
                loading={settingSnooze}
              />
            </ThemedView>
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
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
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
  },
  sortButtonText: {
    fontSize: 16,
    fontWeight: "500",
  },
  currentSnoozeCard: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 12,
  },
  currentSnoozeTime: {
    fontSize: 16,
    fontWeight: "700",
    marginBottom: 2,
  },
  currentSnoozeRemaining: {
    fontSize: 12,
  },
  customButton: {
    minWidth: "100%",
  },
});

export default NotificationSnoozeButton;
