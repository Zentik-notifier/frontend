import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/contexts/AppContext";
import { Tabs } from "expo-router";
import { Platform } from "react-native";
import { Icon, useTheme } from "react-native-paper";
import { IS_FS_SUPPORTED } from "@/utils";

export default function TabsLayout() {
  const theme = useTheme();
  const { t } = useI18n();
  const { notifications, isLoadingGqlData } = useAppContext();
  const { data: bucketsData } = useGetBucketsQuery();
  const { cacheStats } = useGetCacheStats();

  const notifCount = notifications.length;
  const bucketsCount = bucketsData?.buckets?.length ?? 0;
  const galleryCount = cacheStats?.totalItems ?? 0;

  return (
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
          tabBarBadge: isLoadingGqlData
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
          href: !IS_FS_SUPPORTED ? null : undefined,
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
}
