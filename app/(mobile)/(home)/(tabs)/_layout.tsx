import { useI18n } from "@/hooks/useI18n";
import { useNotificationStats, useBucketsStats } from "@/hooks/notifications";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Icon, useTheme } from "react-native-paper";

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const { data: notificationStats, isLoading: isLoadingStats } = useNotificationStats();
  const { data: bucketsWithStats = [] } = useBucketsStats();
  const { cacheStats } = useGetCacheStats();

  const notifCount = notificationStats?.totalCount || 0;
  const bucketsCount = bucketsWithStats.length;
  const galleryCount = cacheStats?.totalItems ?? 0;

  const content = (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.onSurfaceVariant,
        tabBarStyle: {
          backgroundColor: theme.colors.surface,
          borderTopColor: theme.colors.outline,
          borderTopWidth: 1,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: -2,
          },
          shadowOpacity: 0.1,
          shadowRadius: 3.84,
          elevation: 5,
          ...Platform.select({
            ios: {
              paddingBottom: 20,
              height: 80,
            },
            android: {
              paddingBottom: 8,
              height: 70,
            },
            web: {
              paddingBottom: 0,
              height:60,
            },
          }),
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: "500",
          marginTop: 1,
        },
        headerShown: false,
      }}
    >
      <Tabs.Screen
        name="notifications"
        options={{
          title: t("navigation.sections.all"),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              source={focused ? "bell" : "bell-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: isLoadingStats
            ? "..."
            : notifCount > 0
            ? notifCount
            : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primary,
            color: theme.colors.onPrimary,
            fontSize: notifCount > 999 ? 8 : notifCount > 99 ? 9 : 10,
            left: 20,
            minWidth: 30,
            height: 18,
          },
        }}
      />
      <Tabs.Screen
        name="buckets"
        options={{
          title: t("navigation.sections.buckets"),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              source={focused ? "folder" : "folder-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: bucketsCount > 0 ? bucketsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primary,
            color: theme.colors.onPrimary,
            fontSize: 10,
            left: 20,
            minWidth: 30,
            height: 18,
          },
        }}
      />
      <Tabs.Screen
        name="gallery"
        options={{
          title: t("navigation.sections.gallery"),
          tabBarIcon: ({ color, focused }) => (
            <Icon
              source={focused ? "image" : "image-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: galleryCount > 0 ? galleryCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: theme.colors.primary,
            color: theme.colors.onPrimary,
            fontSize: 10,
            left: 20,
            minWidth: 30,
            height: 18,
          },
        }}
      />
    </Tabs>
  );

  return content;
}
