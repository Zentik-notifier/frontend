import { useAppContext } from "@/contexts/AppContext";
import {
  useScheduledMessagesForCurrentUserQuery,
  useMessageRemindersForCurrentUserQuery,
  usePendingPostponesQuery,
  useUpdateMessageMutation,
  useDeleteMessageMutation,
  useCancelMessageRemindersMutation,
  useCancelPostponeMutation,
  ScheduledMessagesForCurrentUserDocument,
  MessageRemindersForCurrentUserDocument,
  PendingPostponesDocument,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useI18n, TranslationKeyPath } from "@/hooks/useI18n";
import React, { useCallback, useMemo, useState } from "react";
import { Alert, Pressable, StyleSheet, View } from "react-native";
import { DatePickerInput, TimePickerModal } from "react-native-paper-dates";
import {
  Button,
  Dialog,
  Icon,
  List,
  Portal,
  SegmentedButtons,
  Text,
  TextInput,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";
import DetailModal from "./ui/DetailModal";
import SwipeableItem, { MenuItem, SwipeAction } from "./SwipeableItem";

function formatScheduleTime(
  isoString: string,
  inMinutesLabel: (count: number) => string
): { primary: string; secondary: string } {
  const d = new Date(isoString);
  const now = Date.now();
  const ms = d.getTime() - now;
  const oneHour = 60 * 60 * 1000;
  if (ms > 0 && ms <= oneHour) {
    const minutes = Math.ceil(ms / 60000);
    return {
      primary: inMinutesLabel(minutes),
      secondary: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    };
  }
  return {
    primary: d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" }),
    secondary: d.toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" }),
  };
}

const refetchQueries = [
  { query: ScheduledMessagesForCurrentUserDocument },
  { query: MessageRemindersForCurrentUserDocument },
  { query: PendingPostponesDocument },
];

export default function MessageRemindersList() {
  const theme = useTheme();
  const { t } = useI18n();
  const { lastUserId } = useAppContext();
  const { datePickerLocale, use24HourTime } = useDateFormat();
  const [rescheduleMessageId, setRescheduleMessageId] = useState<string | null>(null);
  const [rescheduleMode, setRescheduleMode] = useState<"delay" | "datetime">("delay");
  const [rescheduleDelayAmount, setRescheduleDelayAmount] = useState("");
  const [rescheduleDelayUnit, setRescheduleDelayUnit] = useState<"minutes" | "hours" | "days">("minutes");
  const [rescheduleDate, setRescheduleDate] = useState<Date>(() => {
    const d = new Date();
    d.setHours(d.getHours() + 1, 0, 0, 0);
    return d;
  });
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [messageDetailPayload, setMessageDetailPayload] = useState<object | null>(null);

  const inMinutesLabel = useCallback(
    (count: number) => String(t("messageReminders.inMinutes" as TranslationKeyPath, { count })),
    [t]
  );

  const {
    data: scheduledData,
    loading: scheduledLoading,
    refetch: refetchScheduled,
  } = useScheduledMessagesForCurrentUserQuery({
    fetchPolicy: "network-only",
    skip: !lastUserId,
  });
  const {
    data: remindersData,
    loading: remindersLoading,
    refetch: refetchReminders,
  } = useMessageRemindersForCurrentUserQuery({
    fetchPolicy: "network-only",
    skip: !lastUserId,
  });
  const {
    data: postponesData,
    loading: postponesLoading,
    refetch: refetchPostpones,
  } = usePendingPostponesQuery({
    fetchPolicy: "network-only",
    skip: !lastUserId,
  });

  const [updateMessage, { loading: updating }] = useUpdateMessageMutation({
    refetchQueries,
  });
  const [deleteMessage, { loading: deleting }] = useDeleteMessageMutation({
    refetchQueries,
  });
  const [cancelReminders, { loading: cancelling }] = useCancelMessageRemindersMutation({
    refetchQueries,
  });
  const [cancelPostpone, { loading: cancellingPostpone }] = useCancelPostponeMutation({
    refetchQueries,
  });

  const scheduled = scheduledData?.scheduledMessagesForCurrentUser ?? [];
  const reminders = remindersData?.messageRemindersForCurrentUser ?? [];
  const postpones = postponesData?.pendingPostpones ?? [];
  const loading = scheduledLoading || remindersLoading || postponesLoading;
  const hasAny = scheduled.length > 0 || reminders.length > 0 || postpones.length > 0;

  const handleRefresh = useCallback(async () => {
    await Promise.all([
      refetchScheduled(),
      refetchReminders(),
      refetchPostpones(),
    ]);
  }, [refetchScheduled, refetchReminders, refetchPostpones]);

  const delayUnitMs = useMemo(
    () =>
      ({
        minutes: 60 * 1000,
        hours: 60 * 60 * 1000,
        days: 24 * 60 * 60 * 1000,
      }) as const,
    []
  );

  const handleReschedule = useCallback(() => {
    if (!rescheduleMessageId) return;
    let scheduledSendAt: string;
    if (rescheduleMode === "delay") {
      const amount = parseInt(rescheduleDelayAmount, 10);
      if (!rescheduleDelayAmount.trim() || isNaN(amount) || amount < 1) return;
      const ms = amount * delayUnitMs[rescheduleDelayUnit];
      scheduledSendAt = new Date(Date.now() + ms).toISOString();
    } else {
      if (rescheduleDate.getTime() <= Date.now()) {
        Alert.alert(
          String(t("messageReminders.reschedulePastError" as TranslationKeyPath)),
          "",
          [{ text: t("common.ok") }]
        );
        return;
      }
      scheduledSendAt = rescheduleDate.toISOString();
    }
    updateMessage({
      variables: { id: rescheduleMessageId, input: { scheduledSendAt } },
    }).then(() => {
      setRescheduleMessageId(null);
      setRescheduleMode("delay");
      setRescheduleDelayAmount("");
      setRescheduleDelayUnit("minutes");
      const next = new Date();
      next.setHours(next.getHours() + 1, 0, 0, 0);
      setRescheduleDate(next);
    });
  }, [rescheduleMessageId, rescheduleMode, rescheduleDelayAmount, rescheduleDelayUnit, rescheduleDate, delayUnitMs, t, updateMessage]);

  const openReschedule = useCallback((messageId: string) => {
    setRescheduleMessageId(messageId);
    setRescheduleMode("delay");
    setRescheduleDelayAmount("");
    setRescheduleDelayUnit("minutes");
    const next = new Date();
    next.setHours(next.getHours() + 1, 0, 0, 0);
    setRescheduleDate(next);
  }, []);

  const canSubmitReschedule =
    rescheduleMessageId &&
    (rescheduleMode === "delay"
      ? rescheduleDelayAmount.trim() !== "" &&
        !isNaN(parseInt(rescheduleDelayAmount, 10)) &&
        parseInt(rescheduleDelayAmount, 10) >= 1
      : rescheduleDate.getTime() > Date.now());

  if (!lastUserId) {
    return (
      <View style={styles.container}>
        <PaperScrollView loading={false}>
          <View style={styles.emptyState}>
            <Icon
              source="bell-off-outline"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {String(t("messageReminders.noPending" as TranslationKeyPath))}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {String(t("messageReminders.noPending" as TranslationKeyPath))}
            </Text>
          </View>
        </PaperScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <PaperScrollView
        loading={loading}
        onRefresh={handleRefresh}
        error={false}
      >
        {!hasAny ? (
          <View style={styles.emptyState}>
            <Icon
              source="calendar-check-outline"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {String(t("messageReminders.noPending" as TranslationKeyPath))}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {String(t("messageReminders.description" as TranslationKeyPath))}
            </Text>
          </View>
        ) : (
          <View style={styles.listContainer}>
            {scheduled.length > 0 && (
              <List.Section
                title={String(t("messageReminders.sectionScheduled" as TranslationKeyPath))}
              >
                {scheduled.map((message) => {
                  const timeInfo = message.scheduledSendAt
                    ? formatScheduleTime(message.scheduledSendAt, inMinutesLabel)
                    : null;
                  const leftAction: SwipeAction = {
                    icon: "clock-edit-outline",
                    label: String(t("messageReminders.reschedule" as TranslationKeyPath)),
                    onPress: () => openReschedule(message.id),
                  };
                  const rightAction: SwipeAction = {
                    icon: "delete-outline",
                    label: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                    destructive: true,
                    onPress: () => void deleteMessage({ variables: { id: message.id } }),
                    showAlert: {
                      title: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                      message: String(t("messageReminders.deleteMessageConfirm" as TranslationKeyPath)),
                      confirmText: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                      cancelText: t("common.cancel"),
                    },
                  };
                  return (
                    <SwipeableItem
                      key={message.id}
                      leftAction={leftAction}
                      rightAction={rightAction}
                    >
                      <Pressable onPress={() => setMessageDetailPayload(message)}>
                        <View style={styles.row}>
                          <List.Icon icon="clock-outline" style={styles.rowIcon} />
                          <View style={styles.rowContent}>
                            <Text variant="titleMedium" numberOfLines={1}>
                              {message.title}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                              {message.bucket.name}
                            </Text>
                            {timeInfo && (
                              <Text variant="titleSmall" style={[styles.timePrimary, { color: theme.colors.primary }]}>
                                {timeInfo.primary}
                                {timeInfo.secondary ? ` · ${timeInfo.secondary}` : ""}
                              </Text>
                            )}
                          </View>
                        </View>
                      </Pressable>
                    </SwipeableItem>
                  );
                })}
              </List.Section>
            )}

            {reminders.length > 0 && (
              <List.Section
                title={String(t("messageReminders.sectionReminders" as TranslationKeyPath))}
              >
                {reminders.map((reminder) => {
                  const timeInfo = formatScheduleTime(reminder.nextReminderAt, inMinutesLabel);
                  const leftAction: SwipeAction = {
                    icon: "clock-edit-outline",
                    label: String(t("messageReminders.reschedule" as TranslationKeyPath)),
                    onPress: () => openReschedule(reminder.messageId),
                  };
                  const rightAction: SwipeAction = {
                    icon: "delete-outline",
                    label: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                    destructive: true,
                    onPress: () => void deleteMessage({ variables: { id: reminder.messageId } }),
                    showAlert: {
                      title: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                      message: String(t("messageReminders.deleteMessageConfirm" as TranslationKeyPath)),
                      confirmText: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                      cancelText: t("common.cancel"),
                    },
                  };
                  const menuItems: MenuItem[] = [
                    {
                      id: "cancelReminders",
                      label: t("messageReminders.cancelReminders"),
                      icon: "bell-off",
                      onPress: () => void cancelReminders({ variables: { messageId: reminder.messageId } }),
                    },
                  ];
                  const payload = { ...reminder.message, reminder: { id: reminder.id, remindersSent: reminder.remindersSent, maxReminders: reminder.maxReminders } };
                  return (
                    <SwipeableItem
                      key={reminder.id}
                      leftAction={leftAction}
                      rightAction={rightAction}
                      menuItems={menuItems}
                    >
                      <Pressable onPress={() => setMessageDetailPayload(payload)}>
                        <View style={styles.row}>
                          <List.Icon icon="bell-ring-outline" style={styles.rowIcon} />
                          <View style={styles.rowContent}>
                            <Text variant="titleMedium" numberOfLines={1}>
                              {reminder.message.title}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                              {reminder.message.bucket.name} · {reminder.remindersSent}/{reminder.maxReminders}
                            </Text>
                            <Text variant="titleSmall" style={[styles.timePrimary, { color: theme.colors.primary }]}>
                              {timeInfo.primary}
                              {timeInfo.secondary ? ` · ${timeInfo.secondary}` : ""}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </SwipeableItem>
                  );
                })}
              </List.Section>
            )}

            {postpones.length > 0 && (
              <List.Section
                title={String(t("messageReminders.sectionPostponed" as TranslationKeyPath))}
              >
                {postpones.map((postpone) => {
                  const timeInfo = formatScheduleTime(postpone.sendAt, inMinutesLabel);
                  const leftAction: SwipeAction = {
                    icon: "clock-edit-outline",
                    label: String(t("messageReminders.reschedule" as TranslationKeyPath)),
                    onPress: () => openReschedule(postpone.message.id),
                  };
                  const rightAction: SwipeAction = {
                    icon: "delete-outline",
                    label: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                    destructive: true,
                    onPress: () => void deleteMessage({ variables: { id: postpone.message.id } }),
                    showAlert: {
                      title: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                      message: String(t("messageReminders.deleteMessageConfirm" as TranslationKeyPath)),
                      confirmText: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                      cancelText: t("common.cancel"),
                    },
                  };
                  const menuItems: MenuItem[] = [
                    {
                      id: "cancelPostpone",
                      label: String(t("messageReminders.cancelPostpone" as TranslationKeyPath)),
                      icon: "close",
                      onPress: () => void cancelPostpone({ variables: { id: postpone.id } }),
                    },
                  ];
                  const payload = { ...postpone.message, sendAt: postpone.sendAt, postponeId: postpone.id };
                  return (
                    <SwipeableItem
                      key={postpone.id}
                      leftAction={leftAction}
                      rightAction={rightAction}
                      menuItems={menuItems}
                    >
                      <Pressable onPress={() => setMessageDetailPayload(payload)}>
                        <View style={styles.row}>
                          <List.Icon icon="timer-sand" style={styles.rowIcon} />
                          <View style={styles.rowContent}>
                            <Text variant="titleMedium" numberOfLines={1}>
                              {postpone.message.title}
                            </Text>
                            <Text variant="bodySmall" style={{ color: theme.colors.onSurfaceVariant }} numberOfLines={1}>
                              {postpone.message.bucket.name}
                            </Text>
                            <Text variant="titleSmall" style={[styles.timePrimary, { color: theme.colors.primary }]}>
                              {timeInfo.primary}
                              {timeInfo.secondary ? ` · ${timeInfo.secondary}` : ""}
                            </Text>
                          </View>
                        </View>
                      </Pressable>
                    </SwipeableItem>
                  );
                })}
              </List.Section>
            )}
          </View>
        )}
      </PaperScrollView>

      <Portal>
        <Dialog
          visible={rescheduleMessageId != null}
          onDismiss={() => {
            setRescheduleMessageId(null);
            setRescheduleMode("delay");
            setRescheduleDelayAmount("");
            setRescheduleDelayUnit("minutes");
            const next = new Date();
            next.setHours(next.getHours() + 1, 0, 0, 0);
            setRescheduleDate(next);
            setShowTimePicker(false);
          }}
        >
          <Dialog.Title>
            {String(t("messageReminders.reschedule" as TranslationKeyPath))}
          </Dialog.Title>
          <Dialog.Content style={styles.rescheduleContent}>
            <SegmentedButtons
              value={rescheduleMode}
              onValueChange={(v) => setRescheduleMode(v as "delay" | "datetime")}
              buttons={[
                {
                  value: "delay",
                  label: String(t("messageReminders.rescheduleModeDelay" as TranslationKeyPath)),
                  icon: "clock-outline",
                },
                {
                  value: "datetime",
                  label: String(t("messageReminders.rescheduleModeDateTime" as TranslationKeyPath)),
                  icon: "calendar",
                },
              ]}
            />
            {rescheduleMode === "delay" ? (
              <View style={styles.rescheduleDelayRow}>
                <TextInput
                  mode="outlined"
                  value={rescheduleDelayAmount}
                  onChangeText={setRescheduleDelayAmount}
                  placeholder={String(t("messageReminders.rescheduleDelayAmountPlaceholder" as TranslationKeyPath))}
                  keyboardType="number-pad"
                  style={styles.rescheduleDelayAmount}
                />
                <SegmentedButtons
                  value={rescheduleDelayUnit}
                  onValueChange={(v) => setRescheduleDelayUnit(v as "minutes" | "hours" | "days")}
                  buttons={[
                    {
                      value: "minutes",
                      label: String(t("messageReminders.rescheduleUnitMinutes" as TranslationKeyPath)),
                    },
                    {
                      value: "hours",
                      label: String(t("messageReminders.rescheduleUnitHours" as TranslationKeyPath)),
                    },
                    {
                      value: "days",
                      label: String(t("messageReminders.rescheduleUnitDays" as TranslationKeyPath)),
                    },
                  ]}
                  style={styles.rescheduleUnitButtons}
                />
              </View>
            ) : (
              <View style={styles.rescheduleDateTimeRow}>
                <View style={styles.rescheduleDateTimeCellDate}>
                  <DatePickerInput
                    locale={datePickerLocale}
                    label=""
                    value={rescheduleDate}
                    onChange={(d) => d && setRescheduleDate(d)}
                    inputMode="start"
                    mode="outlined"
                    validRange={{ startDate: new Date() }}
                    style={styles.rescheduleDateInput}
                  />
                </View>
                <View style={styles.rescheduleDateTimeCellTime}>
                  <TouchableRipple onPress={() => setShowTimePicker(true)} style={styles.rescheduleTimeTouchable}>
                    <View pointerEvents="none">
                      <TextInput
                        label=""
                        value={rescheduleDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        mode="outlined"
                        editable={false}
                        right={<TextInput.Icon icon="clock-outline" />}
                        style={styles.rescheduleTimeInput}
                      />
                    </View>
                  </TouchableRipple>
                </View>
              </View>
            )}
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setRescheduleMessageId(null);
                setRescheduleMode("delay");
                setRescheduleDelayAmount("");
                setRescheduleDelayUnit("minutes");
                const next = new Date();
                next.setHours(next.getHours() + 1, 0, 0, 0);
                setRescheduleDate(next);
                setShowTimePicker(false);
              }}
            >
              {t("common.cancel")}
            </Button>
            <Button onPress={handleReschedule} disabled={!canSubmitReschedule || updating}>
              {t("common.save")}
            </Button>
          </Dialog.Actions>
        </Dialog>

        <TimePickerModal
          use24HourClock={use24HourTime}
          locale={datePickerLocale}
          visible={showTimePicker}
          onDismiss={() => setShowTimePicker(false)}
          onConfirm={({ hours, minutes }) => {
            const d = new Date(rescheduleDate);
            d.setHours(hours, minutes, 0, 0);
            setRescheduleDate(d);
            setShowTimePicker(false);
          }}
          hours={rescheduleDate.getHours()}
          minutes={rescheduleDate.getMinutes()}
          label={String(t("messageReminders.rescheduleSelectTime" as TranslationKeyPath))}
          cancelLabel={t("common.cancel")}
          confirmLabel={t("common.save")}
        />

        <DetailModal
          visible={messageDetailPayload != null}
          onDismiss={() => setMessageDetailPayload(null)}
          title={String(t("messageReminders.messageContent" as TranslationKeyPath))}
          icon="code-braces"
          actions={{
            cancel: {
              label: t("common.close"),
              onPress: () => setMessageDetailPayload(null),
            },
          }}
        >
          {messageDetailPayload != null && "id" in messageDetailPayload && (
            <View style={styles.detailModalActions}>
              <Button
                mode="outlined"
                icon="clock-edit-outline"
                onPress={() => {
                  const messageId = (messageDetailPayload as { id: string }).id;
                  setMessageDetailPayload(null);
                  openReschedule(messageId);
                }}
                disabled={updating}
                style={styles.detailModalButton}
              >
                {String(t("messageReminders.reschedule" as TranslationKeyPath))}
              </Button>
              <Button
                mode="outlined"
                icon="delete-outline"
                textColor={theme.colors.error}
                onPress={() => {
                  const messageId = (messageDetailPayload as { id: string }).id;
                  Alert.alert(
                    String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                    String(t("messageReminders.deleteMessageConfirm" as TranslationKeyPath)),
                    [
                      { text: t("common.cancel"), style: "cancel" },
                      {
                        text: String(t("messageReminders.deleteMessage" as TranslationKeyPath)),
                        style: "destructive",
                        onPress: () => {
                          void deleteMessage({ variables: { id: messageId } });
                          setMessageDetailPayload(null);
                        },
                      },
                    ]
                  );
                }}
                disabled={deleting}
                style={styles.detailModalButton}
              >
                {String(t("messageReminders.deleteMessage" as TranslationKeyPath))}
              </Button>
            </View>
          )}
          <Text variant="bodySmall" style={styles.jsonText} selectable>
            {messageDetailPayload != null
              ? JSON.stringify(messageDetailPayload, null, 2)
              : ""}
          </Text>
        </DetailModal>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  listContainer: {
    flex: 1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rowIcon: {
    marginRight: 16,
  },
  rowContent: {
    flex: 1,
    minWidth: 0,
  },
  timePrimary: {
    marginTop: 4,
  },
  rescheduleContent: {
    minWidth: 280,
  },
  rescheduleDelayRow: {
    marginTop: 12,
    gap: 12,
  },
  rescheduleDelayAmount: {
    marginBottom: 4,
  },
  rescheduleUnitButtons: {
    marginTop: 4,
  },
  rescheduleDateTimeRow: {
    flexDirection: "row",
    marginTop: 12,
    gap: 12,
  },
  rescheduleDateTimeCellDate: {
    flex: 6,
    flexBasis: 0,
    minWidth: 0,
  },
  rescheduleDateTimeCellTime: {
    flex: 4,
    flexBasis: 0,
    minWidth: 0,
  },
  rescheduleDateInput: {
    marginBottom: 0,
  },
  rescheduleTimeTouchable: {
    borderRadius: 4,
  },
  rescheduleTimeInput: {
    fontSize: 16,
  },
  detailModalActions: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  detailModalButton: {
    flex: 1,
  },
  jsonText: {
    fontFamily: "monospace",
    fontSize: 12,
  },
});
