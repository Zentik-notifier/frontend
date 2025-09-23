import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useColorScheme, useI18n } from "@/hooks";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router";
import { Platform } from "react-native";

export default function TabsLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { notifications } = useAppContext();
  const { data: bucketsData } = useGetBucketsQuery();
  const { cacheStats } = useGetCacheStats();

  const notifCount = notifications.length;
  const bucketsCount = bucketsData?.buckets?.length ?? 0;
  const galleryCount = cacheStats?.totalItems ?? 0;

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme].tint,
        tabBarInactiveTintColor: Colors[colorScheme].textSecondary,
        tabBarStyle: {
          backgroundColor: Colors[colorScheme].background,
          borderTopColor: Colors[colorScheme].border,
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
            <Ionicons
              name={focused ? "notifications" : "notifications-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: notifCount > 0 ? notifCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors[colorScheme].tint,
            color: "#ffffff",
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
            <Ionicons
              name={focused ? "folder" : "folder-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: bucketsCount > 0 ? bucketsCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors[colorScheme].tint,
            color: "#ffffff",
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
            <Ionicons
              name={focused ? "images" : "images-outline"}
              size={24}
              color={color}
            />
          ),
          tabBarBadge: galleryCount > 0 ? galleryCount : undefined,
          tabBarBadgeStyle: {
            backgroundColor: Colors[colorScheme].tint,
            color: "#ffffff",
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
