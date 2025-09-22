import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { router, usePathname } from "expo-router";

interface SettingsOption {
  id: string;
  title: string;
  icon: string;
  route: string;
}

export default function SettingsDesktopLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { userId } = useAppContext();
  const pathname = usePathname();

  if (!userId) {
    return null;
  }

  const settingsOptions: SettingsOption[] = useMemo(() => [
    {
      id: "user-profile",
      title: t("userProfile.title"),
      icon: "person-outline",
      route: "/settings/user-profile",
    },
    {
      id: "app-settings",
      title: t("appSettings.title"),
      icon: "settings-outline",
      route: "/settings/app-settings",
    },
    {
      id: "buckets-settings",
      title: t("buckets.title"),
      icon: "folder-outline",
      route: "/settings/bucket/list",
    },
    {
      id: "access-tokens-settings",
      title: t("accessTokens.title"),
      icon: "key-outline",
      route: "/settings/access-token/list",
    },
    {
      id: "webhooks-settings",
      title: t("webhooks.title"),
      icon: "link-outline",
      route: "/settings/webhook/list",
    },
    {
      id: "devices-settings",
      title: t("devices.title"),
      icon: "phone-portrait-outline",
      route: "/settings/devices",
    },
    {
      id: "user-sessions-settings",
      title: t("userSessions.title"),
      icon: "time-outline",
      route: "/settings/user-sessions",
    },
    {
      id: "notifications-settings",
      title: t("notifications.title"),
      icon: "notifications-outline",
      route: "/settings/notifications",
    },
    {
      id: "app-logs",
      title: "Application Logs",
      icon: "document-text-outline",
      route: "/settings/logs",
    },
  ], [t]);

  // Helper function per determinare se un elemento è selezionato
  const isSelected = (route: string) => {
    return pathname === route;
  };

  const renderSidebar = () => (
    <View
      style={[
        styles.sidebar,
        { backgroundColor: Colors[colorScheme].background },
      ]}
    >
      <ScrollView style={styles.sidebarScroll}>
        <View style={styles.sidebarHeader}>
          <Text
            style={[styles.sidebarTitle, { color: Colors[colorScheme].text }]}
          >
            {t("common.settings")}
          </Text>
        </View>

        {settingsOptions.map((option) => {
          const selected = isSelected(option.route);
          return (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.sidebarItem,
                {
                  backgroundColor: selected
                    ? Colors[colorScheme].tint + "20"
                    : "transparent",
                  borderLeftColor: selected
                    ? Colors[colorScheme].tint
                    : "transparent",
                },
              ]}
              onPress={() => router.push(option.route as any)}
            >
              <Ionicons
                name={option.icon as any}
                size={20}
                color={
                  selected
                    ? Colors[colorScheme].tint
                    : Colors[colorScheme].textSecondary
                }
              />
              <Text
                style={[
                  styles.sidebarItemText,
                  {
                    color: selected
                      ? Colors[colorScheme].tint
                      : Colors[colorScheme].textSecondary,
                    fontWeight: selected ? "600" : "400",
                  },
                ]}
              >
                {option.title}
              </Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );

  return (
    <View
      style={[styles.container, { backgroundColor: Colors[colorScheme].background }]}
    >
      {renderSidebar()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    width: 280,
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarHeader: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  sidebarTitle: {
    fontSize: 18,
    fontWeight: "600",
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
});
