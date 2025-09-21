import BucketDetail from "@/components/BucketDetail";
import BucketIcon from "@/components/BucketIcon";
import GallerySection from "@/components/GallerySection";
import NotificationsSection from "@/components/NotificationsSection";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Icon from "@/components/ui/Icon";
import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useUserSettings } from "@/services/user-settings";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

type TabletHomeSection = "notifications" | "gallery";

export default function TabletHomeScreen() {
  const { t } = useI18n();
  const colorScheme = useColorScheme();
  const { notifications, showOnboarding } = useAppContext();

  const { getOnboardingSettings } = useUserSettings();
  const { hasCompletedOnboarding } = getOnboardingSettings();
  const { data: bucketsData } = useGetBucketsQuery();
  const { cacheStats } = useGetCacheStats();
  const { width } = useWindowDimensions();

  const [selectedSection, setSelectedSection] =
    useState<string>("notifications");

  const notifCount = notifications.length;
  const galleryCount = cacheStats?.totalItems ?? 0;

  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;

  useEffect(() => {
    if (!hasCompletedOnboarding) {
      const timer = setTimeout(() => {
        showOnboarding();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [hasCompletedOnboarding, showOnboarding]);

  const sidebarWidth = isDesktop ? 320 : isTablet ? 280 : 250;

  const buckets = bucketsData?.buckets ?? [];

  const menuItems = [
    {
      id: "notifications" as TabletHomeSection | string,
      title: t("navigation.sections.all"),
      icon: "notifications",
      count: notifCount,
      color: "#4F46E5",
      type: "section" as const,
    },
    {
      id: "gallery" as TabletHomeSection | string,
      title: t("navigation.sections.gallery"),
      icon: "images",
      count: galleryCount,
      color: "#7C3AED",
      type: "section" as const,
    },
    ...buckets.map((bucket) => ({
      id: `bucket-${bucket.id}`,
      title: bucket.name,
      icon: "bucket",
      count: notifications.filter((n) => n.message?.bucket?.id === bucket.id)
        .length,
      color: bucket.color || "#059669",
      type: "bucket" as const,
      bucketId: bucket.id,
      description: bucket.description,
    })),
  ];

  const renderContent = () => {
    if (selectedSection === "notifications") {
      return <NotificationsSection />;
    }
    if (selectedSection === "gallery") {
      return <GallerySection />;
    }

    if (selectedSection.startsWith("bucket-")) {
      const bucketId = selectedSection.replace("bucket-", "");
      return <BucketDetail bucketId={bucketId} />;
    }

    return <NotificationsSection />;
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.layout}>
        <View
          style={[
            styles.sidebar,
            {
              width: sidebarWidth,
              backgroundColor: Colors[colorScheme].backgroundCard,
              borderRightColor: Colors[colorScheme].border,
            },
          ]}
        >
          <ScrollView
            style={styles.sidebarContent}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.menuItems}>
              {menuItems.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor:
                        selectedSection === item.id
                          ? Colors[colorScheme].tint + "15"
                          : "transparent",
                      borderColor:
                        selectedSection === item.id
                          ? Colors[colorScheme].tint
                          : "transparent",
                    },
                  ]}
                  onPress={() => setSelectedSection(item.id)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemLeft}>
                    <View
                      style={[
                        item.type === "bucket"
                          ? styles.menuItemBucketIcon
                          : styles.menuItemIcon,
                        { backgroundColor: `${item.color}15` },
                      ]}
                    >
                      {item.type === "bucket" && "bucketId" in item ? (
                        <BucketIcon
                          bucketId={item.bucketId}
                          size="lg"
                          noRouting
                        />
                      ) : (
                        <Icon
                          name={item.icon as any}
                          size="md"
                          color={item.color}
                        />
                      )}
                    </View>
                    <View style={styles.menuItemTextContainer}>
                      <ThemedText
                        style={[
                          styles.menuItemText,
                          {
                            color:
                              selectedSection === item.id
                                ? Colors[colorScheme].tint
                                : Colors[colorScheme].text,
                            fontWeight:
                              selectedSection === item.id ? "600" : "500",
                          },
                        ]}
                      >
                        {item.title}
                      </ThemedText>
                      {"description" in item && item.description && (
                        <ThemedText
                          style={[
                            styles.menuItemDescription,
                            { color: Colors[colorScheme].textSecondary },
                          ]}
                          numberOfLines={1}
                        >
                          {item.description}
                        </ThemedText>
                      )}
                    </View>
                  </View>

                  {item.count > 0 && (
                    <View
                      style={[
                        styles.countBadge,
                        {
                          backgroundColor:
                            selectedSection === item.id
                              ? Colors[colorScheme].tint
                              : Colors[colorScheme].textSecondary,
                        },
                      ]}
                    >
                      <ThemedText style={styles.countText}>
                        {item.count > 999 ? "999+" : item.count}
                      </ThemedText>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        <View style={styles.content}>{renderContent()}</View>
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    borderRightWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  menuItems: {
    paddingHorizontal: 12,
    gap: 4,
  },
  menuItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuItemLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginRight: 8,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemBucketIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  menuItemTextContainer: {
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    marginBottom: 2,
  },
  menuItemDescription: {
    fontSize: 12,
    opacity: 0.8,
  },
  countBadge: {
    minWidth: 24,
    maxWidth: 50,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    flexShrink: 0,
  },
  countText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
  },
});
