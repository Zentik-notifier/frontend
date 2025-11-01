import { useI18n } from "@/hooks/useI18n";
import { Stack } from "expo-router";
import React from "react";
import EventsReview from "@/components/EventsReview";
import { EventsReviewProvider } from "@/contexts/EventsReviewContext";

export default function EventsReviewPage() {
  const { t } = useI18n();

  return (
    <>
      <Stack.Screen options={{ title: t("eventsReview.title") }} />
      <EventsReviewProvider>
        <EventsReview />
      </EventsReviewProvider>
    </>
  );
}
