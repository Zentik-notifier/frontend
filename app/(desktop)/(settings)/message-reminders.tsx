import MessageRemindersList from "@/components/MessageRemindersList";
import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";

export default function MessageRemindersScreen() {
  const { t } = useI18n();
  return (
    <>
      <Stack.Screen options={{ title: t("messageReminders.title") }} />
      <MessageRemindersList />
    </>
  );
}
