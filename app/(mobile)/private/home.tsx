import BucketsSection from "@/components/BucketsSection";
import GallerySection from "@/components/GallerySection";
import MinimalFooter, { HomeSection } from "@/components/MinimalFooter";
import NotificationsSection from "@/components/NotificationsSection";
import { ThemedView } from "@/components/ThemedView";
import { useOnboarding } from "@/hooks/useOnboarding";
import { useAppContext } from "@/services/app-context";
import React, {
  useEffect,
  useMemo,
  useState,
} from "react";
import { StyleSheet } from "react-native";

export default function OptimizedHomeScreen() {
  const {
    refetchNotifications,
    showOnboarding,
  } = useAppContext();
  const [currentSection, setCurrentSection] = useState<HomeSection>("all");
  const { hasCompletedOnboarding } = useOnboarding();

  useEffect(() => {
    refetchNotifications();
  }, [refetchNotifications]);

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => {
        showOnboarding();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, showOnboarding]);

  const renderCurrentSection = useMemo(() => {
    switch (currentSection) {
      case "all":
        return <NotificationsSection key="notifications-section" />;
      case "buckets":
        return <BucketsSection key="buckets-section" />;
      case "gallery":
        return <GallerySection key="gallery-section" />;
      default:
        return null;
    }
  }, [currentSection]);

  return (
    <ThemedView style={styles.container}>
      {/* Minimal Toolbar - moved above content, below header */}
      <MinimalFooter
        currentRoute="/"
        currentSection={currentSection}
        onSectionChange={setCurrentSection}
      />

      {renderCurrentSection}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
