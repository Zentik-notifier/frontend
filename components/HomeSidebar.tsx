import BucketIcon from "@/components/BucketIcon";
import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, usePathname, useSegments } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

export default function HomeSidebar() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { notifications } = useAppContext();
  const { data: bucketsData } = useGetBucketsQuery();
  const { cacheStats } = useGetCacheStats();
  const pathname = usePathname();
  const { navigateToHome, navigateToGallery, navigateToBucketDetail } =
    useNavigationUtils();
  const { isDesktop } = useDeviceType();

  const notifCount = notifications.length;
  const galleryCount = cacheStats?.totalItems ?? 0;

  // Helper functions per determinare se un elemento è selezionato
  const isSectionSelected = (route: string) => {
    return pathname === route;
  };

  const { bucketStats, notificationToBucketMap } = useMemo(() => {
    const notificationToBucketMap = new Map<string, string>();
    if (!bucketsData?.buckets)
      return { bucketStats: [], notificationToBucketMap };

    const bucketStats = bucketsData.buckets
      .map((bucket) => {
        const bucketNotifications = notifications.filter(
          (notification) => notification.message?.bucket?.id === bucket.id
        );

        bucketNotifications.forEach((notification) => {
          notificationToBucketMap.set(notification.id, bucket.id);
        });

        const unreadCount = bucketNotifications.filter(
          (notification) => !notification.readAt
        ).length;

        const lastNotification = bucketNotifications.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0];

        return {
          ...bucket,
          unreadCount,
          lastNotificationAt: lastNotification?.createdAt || null,
        };
      })
      .sort((a, b) => {
        // Prima i bucket con notifiche non lette, poi per data ultima notifica
        if (a.unreadCount > 0 && b.unreadCount === 0) return -1;
        if (a.unreadCount === 0 && b.unreadCount > 0) return 1;

        // Se entrambi hanno o non hanno notifiche non lette, ordina per data
        if (!a.lastNotificationAt && !b.lastNotificationAt) return 0;
        if (!a.lastNotificationAt) return 1;
        if (!b.lastNotificationAt) return -1;

        return (
          new Date(b.lastNotificationAt).getTime() -
          new Date(a.lastNotificationAt).getTime()
        );
      });

    return { bucketStats, notificationToBucketMap };
  }, [bucketsData?.buckets, notifications]);

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
      icon: "notifications-outline",
      count: notifCount,
      route: "/notifications",
      onPress: () => navigateToHome(),
    },
    {
      id: "gallery",
      title: t("navigation.sections.gallery"),
      icon: "images-outline",
      count: galleryCount,
      route: "/gallery",
      onPress: () => navigateToGallery(),
    },
  ];

  const renderSidebar = () => (
    <View
      style={[
        {
          backgroundColor: Colors[colorScheme].background,
          width: isDesktop ? 450 : 300,
        },
      ]}
    >
      <ScrollView style={styles.sidebarScroll}>
        {sidebarItems.map((item) => {
          const isSelected = isSectionSelected(item.route);
          return (
            <TouchableOpacity
              key={item.id}
              style={[
                styles.sidebarItem,
                {
                  backgroundColor: isSelected
                    ? Colors[colorScheme].tint + "20"
                    : "transparent",
                  borderLeftColor: isSelected
                    ? Colors[colorScheme].tint
                    : "transparent",
                },
              ]}
              onPress={item.onPress}
            >
              <Ionicons
                name={item.icon as any}
                size={20}
                color={
                  isSelected
                    ? Colors[colorScheme].tint
                    : Colors[colorScheme].textSecondary
                }
              />
              <Text
                style={[
                  styles.sidebarItemText,
                  {
                    color: isSelected
                      ? Colors[colorScheme].tint
                      : Colors[colorScheme].textSecondary,
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
                    { backgroundColor: Colors[colorScheme].tint },
                  ]}
                >
                  <Text style={styles.badgeText}>{item.count}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}

        {bucketStats.length > 0 && (
          <View style={styles.bucketsSection}>
            <Text
              style={[
                styles.bucketsSectionTitle,
                { color: Colors[colorScheme].textSecondary },
              ]}
            >
              {t("navigation.sections.buckets")}
            </Text>
            {bucketStats.map((bucket) => {
              const isSelected = isBucketSelected(bucket.id);
              return (
                <TouchableOpacity
                  key={bucket.id}
                  style={[
                    styles.bucketItem,
                    {
                      backgroundColor: isSelected
                        ? Colors[colorScheme].tint + "20"
                        : "transparent",
                      borderLeftColor: isSelected
                        ? Colors[colorScheme].tint
                        : "transparent",
                    },
                  ]}
                  onPress={() => navigateToBucketDetail(bucket.id)}
                >
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
                          ? Colors[colorScheme].tint
                          : Colors[colorScheme].textSecondary,
                        fontWeight:
                          bucket.unreadCount > 0 || isSelected ? "600" : "400",
                      },
                    ]}
                  >
                    {bucket.name}
                  </Text>
                  {bucket.unreadCount > 0 && (
                    <View
                      style={[
                        styles.badge,
                        { backgroundColor: Colors[colorScheme].tint },
                      ]}
                    >
                      <Text style={styles.badgeText}>
                        {bucket.unreadCount > 99
                          ? "99+"
                          : bucket.unreadCount.toString()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );

  return renderSidebar();
}

const styles = StyleSheet.create({
  sidebarScroll: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 4,
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
    borderLeftWidth: 3,
    borderRadius: 4,
  },
  bucketItemText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
});
