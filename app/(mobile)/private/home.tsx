import BucketsSection from "@/components/BucketsSection";
import GallerySection from "@/components/GallerySection";
import MinimalFooter, { HomeSection } from "@/components/MinimalFooter";
import NotificationsSection from "@/components/NotificationsSection";
import { ThemedView } from "@/components/ThemedView";
import { useAppContext } from "@/services/app-context";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet } from "react-native";

export default function OptimizedHomeScreen() {
  const {
    refetchNotifications,
    userSettings: { settings, setIsCompactMode },
  } = useAppContext();
  const [currentSection, setCurrentSection] = useState<HomeSection>("all");

  const lastRefreshTime = useRef<number>(0);

  useEffect(() => {
    refetchNotifications();
  }, []);

  const handleRefresh = useCallback(async () => {
    try {
      lastRefreshTime.current = Date.now();
      await refetchNotifications();
    } catch (error) {
      console.error("🏠 Error refreshing homepage data:", error);
    }
  }, [refetchNotifications]);

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
  }, [
    currentSection,
    handleRefresh,
    settings.isCompactMode,
    settings.notificationFilters,
    setIsCompactMode,
  ]);

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
