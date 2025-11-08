import EventsReview from "@/components/EventsReview";
import { EventsReviewProvider } from "@/contexts/EventsReviewContext";
import React from "react";

export default function EventsReviewPage() {
  return (
    <>
      <EventsReviewProvider>
        <EventsReview />
      </EventsReviewProvider>
    </>
  );
}
