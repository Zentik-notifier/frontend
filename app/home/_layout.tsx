import { useDeviceType } from "@/hooks/useDeviceType";
import { Colors } from "@/constants/Colors";
import { useGetBucketsQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useGetCacheStats } from "@/hooks/useMediaCache";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { Tabs, Slot } from "expo-router";
import React from "react";
import { Platform, View } from "react-native";
import Header from "@/components/Header";
import HomeDesktopLayout from "../../views/HomeDesktopLayout";

export default function HomeLayout() {
  const { isReady, isMobile } = useDeviceType();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { notifications } = useAppContext();
  const { data: bucketsData } = useGetBucketsQuery();
  const { cacheStats } = useGetCacheStats();

  if (!isReady) {
    return null;
  }

  if (isMobile) {
    const notifCount = notifications.length;
    const bucketsCount = bucketsData?.buckets?.length ?? 0;
    const galleryCount = cacheStats?.totalItems ?? 0;

    return (
      <View
        style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}
      >
        <Header />
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
          <Tabs.Screen
            name="bucket/[id]"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="edit-bucket/[id]"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="notification-detail/[id]"
            options={{
              href: null,
            }}
          />
          <Tabs.Screen
            name="index"
            options={{
              href: null,
            }}
          />
        </Tabs>
      </View>
    );
  } else {
    return (
      <View
        style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}
      >
        <Header />
        <View style={{ flex: 1, flexDirection: "row" }}>
          <View
            style={{
              borderRightWidth: 1,
              borderRightColor: Colors[colorScheme].border,
            }}
          >
            <HomeDesktopLayout />
          </View>
          <View
            style={{ flex: 1, backgroundColor: Colors[colorScheme].background }}
          >
            <Slot />
          </View>
        </View>
      </View>
    );
  }
}
