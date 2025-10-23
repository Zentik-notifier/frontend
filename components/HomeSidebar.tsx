import BucketIcon from "@/components/BucketIcon";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useAppState } from "@/hooks/notifications";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useNavigationUtils } from "@/utils/navigation";
import { usePathname } from "expo-router";
import React from "react";
import { ActivityIndicator, ScrollView, StyleSheet, View } from "react-native";
import {
  Surface,
  Text,
  TouchableRipple,
  Icon,
  useTheme,
} from "react-native-paper";

export default function HomeSidebar() {
  const theme = useTheme();
  const { t } = useI18n();
  
  // Use React Query for stats
  const { data: appState, isLoading: isLoadingStats } = useAppState();
  const notificationStats = appState?.stats;
  const bucketsWithStats = appState?.buckets || [];
  const { cacheStats } = useGetCacheStats();
  const pathname = usePathname();
  const {
    navigateToCreateBucket,
    navigateToHome,
    navigateToGallery,
    navigateToBucketDetail,
    navigateToDanglingBucket,
  } = useNavigationUtils();
  const { isDesktop } = useDeviceType();

  // Get counts from React Query stats
  const notifCount = notificationStats?.totalCount ?? 0;
  const galleryCount = cacheStats?.totalItems ?? 0;

  const isSectionSelected = (route: string) => {
    return pathname === route;
  };

  const handleBucketPress = (bucketId: string) => {
    // If bucket exists in bucketsWithStats, it's valid (not dangling)
    navigateToBucketDetail(bucketId);
  };

  const isBucketSelected = (bucketId: string) => {
    return pathname.includes(bucketId);
  };

  const sidebarItems = [
    {
      id: "notifications",
      title: t("navigation.sections.all"),
      icon: "bell",
      count: notifCount,
      route: "/notifications",
      onPress: navigateToHome,
    },
  ];

  sidebarItems.push({
    id: "gallery",
    title: t("navigation.sections.gallery"),
    icon: "image",
    count: galleryCount,
    route: "/gallery",
    onPress: navigateToGallery,
  });

  const renderSidebar = () => {
    return (
      <Surface
        style={[
          {
            backgroundColor: theme.colors.background,
            width: isDesktop ? 350 : 300,
            borderWidth: 0,
          },
        ]}
        elevation={0}
      >
        <ScrollView style={styles.scrollView}>
          {sidebarItems.map((item) => {
            const isSelected = isSectionSelected(item.route);
            return (
              <TouchableRipple
                key={item.id}
                style={[
                  styles.sidebarItem,
                  {
                    backgroundColor: isSelected
                      ? theme.colors.primaryContainer
                      : "transparent",
                  },
                ]}
                onPress={item.onPress}
              >
                <View style={styles.sidebarItemContent}>
                  <Icon
                    source={item.icon as any}
                    size={20}
                    color={
                      isSelected
                        ? theme.colors.primary
                        : theme.colors.onSurfaceVariant
                    }
                  />
                  <Text
                    style={[
                      styles.sidebarItemText,
                      {
                        color: isSelected
                          ? theme.colors.primary
                          : theme.colors.onSurfaceVariant,
                        fontWeight: isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {item.title}
                  </Text>
                  {item.count > 0 && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: theme.colors.primary },
                      ]}
                    >
                      {item.id === "notifications" && isLoadingStats ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.onPrimary}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.badgeText,
                            { color: theme.colors.surface },
                          ]}
                        >
                          {item.count}
                        </Text>
                      )}
                    </View>
                  )}
                </View>
              </TouchableRipple>
            );
          })}

          {/* Always show buckets section, even if empty */}
          <View style={styles.bucketsSection}>
            <Text
              style={[
                styles.bucketsSectionTitle,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("navigation.sections.buckets")} ({bucketsWithStats.length})
            </Text>
            {bucketsWithStats.map((bucket) => {
              const isSelected = isBucketSelected(bucket.id);
              return (
                <TouchableRipple
                  key={bucket.id}
                  style={[
                    styles.bucketItem,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primaryContainer
                        : "transparent",
                    },
                  ]}
                  onPress={() => handleBucketPress(bucket.id)}
                >
                  <View style={styles.bucketItemContent}>
                    <BucketIcon
                      bucketId={bucket.id}
                      size="lg"
                      noRouting
                    />
                    <Text
                      style={[
                        styles.bucketItemText,
                        {
                          color: isSelected
                            ? theme.colors.primary
                            : theme.colors.onSurfaceVariant,
                          fontWeight:
                            bucket.unreadCount > 0 || isSelected
                              ? "600"
                              : "400",
                        },
                      ]}
                    >
                      {bucket.name}
                    </Text>
                    {bucket.unreadCount > 0 && (
                      <View
                        style={[
                          styles.badge,
                          { backgroundColor: theme.colors.primary },
                        ]}
                      >
                        <Text
                          style={[
                            styles.badgeText,
                            { color: theme.colors.surface },
                          ]}
                        >
                          {bucket.unreadCount > 99
                            ? "99+"
                            : bucket.unreadCount.toString()}
                        </Text>
                      </View>
                    )}
                  </View>
                </TouchableRipple>
              );
            })}

            {/* Add new bucket item */}
            <TouchableRipple
              style={[
                styles.bucketItem,
                {
                  backgroundColor: "transparent",
                  borderStyle: "dashed",
                  borderWidth: 1,
                  borderColor: theme.colors.outline,
                },
              ]}
              onPress={() => navigateToCreateBucket(true)}
            >
              <View style={styles.bucketItemContent}>
                <View
                  style={[
                    styles.addBucketIcon,
                    {
                      backgroundColor: theme.colors.surfaceVariant,
                      borderColor: theme.colors.outline,
                    },
                  ]}
                >
                  <Icon
                    source="plus"
                    size={16}
                    color={theme.colors.onSurfaceVariant}
                  />
                </View>
                <Text
                  style={[
                    styles.bucketItemText,
                    {
                      color: theme.colors.onSurfaceVariant,
                      fontWeight: "400",
                    },
                  ]}
                >
                  {t("buckets.form.createButton")}
                </Text>
              </View>
            </TouchableRipple>
          </View>
        </ScrollView>
      </Surface>
    );
  };

  return renderSidebar();
}

const styles = StyleSheet.create({
  scrollView: {
    paddingTop: 16,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 4,
    marginBottom: 4,
  },
  sidebarItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  sidebarItemText: {
    marginLeft: 12,
    fontSize: 16,
    flex: 1,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: "center",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "600",
  },
  bucketsSection: {
    marginTop: 20,
    paddingHorizontal: 4,
  },
  bucketsSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bucketItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    marginHorizontal: 8,
    borderRadius: 4,
  },
  bucketItemContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  bucketItemText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  addBucketIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
