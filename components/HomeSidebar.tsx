import BucketIcon from "@/components/BucketIcon";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useDeviceType } from "@/hooks/useDeviceType";
import { getBucketStats } from "@/hooks/useGetBucketData";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import { usePathname } from "expo-router";
import React, { useMemo } from "react";
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
  const { notifications, isLoadingGqlData } = useAppContext();
  const { data: bucketsData } = useGetBucketsQuery();
  const { cacheStats } = useGetCacheStats();
  const pathname = usePathname();
  const {
    navigateToCreateBucket,
    navigateToHome,
    navigateToGallery,
    navigateToBucketDetail,
  } = useNavigationUtils();
  const { isDesktop } = useDeviceType();

  const notifCount = notifications.length;
  const galleryCount = cacheStats?.totalItems ?? 0;

  const isSectionSelected = (route: string) => {
    return pathname === route;
  };

  const { bucketStats, notificationToBucketMap } = useMemo(() => {
    const result = getBucketStats(bucketsData?.buckets ?? [], notifications);
    return result;
  }, [bucketsData, notifications]);

  const isBucketSelected = (bucketId: string) => {
    if (pathname.includes("notification/")) {
      const notificationId = pathname.split("/").pop();
      if (notificationId) {
        const notificationBucketId =
          notificationToBucketMap.get(notificationId);
        if (notificationBucketId) {
          return notificationBucketId === bucketId;
        }
      }
    }
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
    {
      id: "gallery",
      title: t("navigation.sections.gallery"),
      icon: "image",
      count: galleryCount,
      route: "/gallery",
      onPress: navigateToGallery,
    },
  ];

  const renderSidebar = () => {
    return (
      <Surface
        style={[
          {
            backgroundColor: theme.colors.background,
            width: isDesktop ? 350 : 300,
          },
        ]}
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
                      {item.id === "notifications" && isLoadingGqlData ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.onPrimary}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.badgeText,
                            { color: theme.colors.onPrimary },
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
              {t("navigation.sections.buckets")} ({bucketStats.length})
            </Text>
            {bucketStats.map((bucket) => {
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
                  onPress={() => navigateToBucketDetail(bucket.id)}
                >
                  <View style={styles.bucketItemContent}>
                    <BucketIcon
                      bucketId={bucket.id}
                      size="lg"
                      noRouting
                      showBorder={false}
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
                            { color: theme.colors.onPrimary },
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
    color: "#ffffff",
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
