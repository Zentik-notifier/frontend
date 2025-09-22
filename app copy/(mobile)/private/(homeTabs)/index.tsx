import NotificationsSection from "@/components/NotificationsSection";
import { ThemedView } from "@/components/ThemedView";
import { useUserSettings } from "@/services/user-settings";
import { useAppContext } from "@/services/app-context";
import React, { useEffect } from "react";
import { StyleSheet } from "react-native";

export default function AllNotificationsScreen() {
  const { showOnboarding } = useAppContext();
  const { getOnboardingSettings } = useUserSettings();
  const { hasCompletedOnboarding } = getOnboardingSettings();

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => {
        showOnboarding();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, showOnboarding]);

  return (
    <ThemedView style={styles.container}>
      <NotificationsSection />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
