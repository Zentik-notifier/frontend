import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Icon from "@/components/ui/Icon";
import { Colors } from "@/constants/Colors";
import { IconName } from "@/constants/Icons";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Href, useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  route: Href;
}

export default function TabletSettingsScreen() {
  const { userId } = useAppContext();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();

  const [selectedSetting, setSelectedSetting] = useState("app-settings");

  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
  const sidebarWidth = isDesktop ? 320 : isTablet ? 280 : 250;

  if (!userId) {
    return null;
  }

  const settingsOptions: SettingsOption[] = [
    {
      id: "app-settings",
      title: t("appSettings.title"),
      description: t("appSettings.description"),
      icon: "settings",
      iconColor: "#F59E0B",
      route: "/(tablet)/private/app-settings",
    },
    {
      id: "user-profile",
      title: t("userProfile.title"),
      description: t("userProfile.description"),
      icon: "user",
      iconColor: "#4F46E5",
      route: "/(tablet)/private/user-profile",
    },
    {
      id: "buckets-settings",
      title: t("buckets.title"),
      description: t("buckets.description"),
      icon: "bucket",
      iconColor: "#059669",
      route: "/(tablet)/private/buckets-settings",
    },
    {
      id: "access-tokens-settings",
      title: t("accessTokens.title"),
      description: t("accessTokens.description"),
      icon: "password",
      iconColor: "#0891B2",
      route: "/(tablet)/private/access-tokens-settings",
    },
    {
      id: "webhooks-settings",
      title: t("webhooks.title"),
      description: t("webhooks.description"),
      icon: "webhook",
      iconColor: "#10B981",
      route: "/(tablet)/private/webhooks-settings",
    },
    {
      id: "devices-settings",
      title: t("devices.title"),
      description: t("devices.description"),
      icon: "device",
      iconColor: "#DC2626",
      route: "/(tablet)/private/devices-settings",
    },
    {
      id: "user-sessions-settings",
      title: t("userSessions.title"),
      description: t("userSessions.description"),
      icon: "notebook",
      iconColor: "#2563EB",
      route: "/(tablet)/private/user-sessions-settings",
    },
    {
      id: "notifications-settings",
      title: t("notifications.title"),
      description: t("notifications.description"),
      icon: "notification",
      iconColor: "#7C3AED",
      route: "/(tablet)/private/notifications-settings",
    },
    {
      id: "app-logs",
      title: "Application Logs",
      description: "View and refresh local application logs stored on device.",
      icon: "notebook",
      iconColor: "#0EA5E9",
      route: "/(tablet)/private/logs",
    },
  ];

  const handleSettingPress = (option: SettingsOption) => {
    // Per il layout tablet, navighiamo alla pagina che reindirizza al mobile
    router.push(option.route);
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.layout}>
        {/* Sidebar */}
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
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sidebarHeader}>
              <Icon name="wrench" size="lg" color="#8B5CF6" />
              <ThemedText style={styles.sidebarTitle}>
                {t("common.settings")}
              </ThemedText>
            </View>

            <View style={styles.menuItems}>
              {settingsOptions.map((option) => (
                <TouchableOpacity
                  key={option.id}
                  style={[
                    styles.menuItem,
                    {
                      backgroundColor: Colors[colorScheme].backgroundCard,
                      borderColor: Colors[colorScheme].border,
                    },
                  ]}
                  onPress={() => handleSettingPress(option)}
                  activeOpacity={0.7}
                >
                  <View style={styles.menuItemContent}>
                    <View
                      style={[
                        styles.menuItemIcon,
                        { backgroundColor: `${option.iconColor}15` },
                      ]}
                    >
                      <Icon
                        name={option.icon}
                        size="md"
                        color={
                          option.iconColor || Colors[colorScheme].tint
                        }
                      />
                    </View>
                    <View style={styles.menuItemText}>
                      <ThemedText
                        style={[
                          styles.menuItemTitle,
                          { color: Colors[colorScheme].text },
                        ]}
                      >
                        {option.title}
                      </ThemedText>
                      <ThemedText
                        style={[
                          styles.menuItemDescription,
                          { color: Colors[colorScheme].textSecondary },
                        ]}
                        numberOfLines={2}
                      >
                        {option.description}
                      </ThemedText>
                    </View>
                  </View>
                  <Icon name="chevron" size="md" color="secondary" />
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Content - Placeholder per il layout tablet */}
        <View style={styles.content}>
          <ThemedView style={styles.contentPlaceholder}>
            <Icon name="wrench" size="xl" color="secondary" />
            <ThemedText style={styles.placeholderTitle}>
              {t("common.settings")}
            </ThemedText>
            <ThemedText style={styles.placeholderText}>
              Seleziona un'opzione dal menu per configurare le impostazioni
            </ThemedText>
          </ThemedView>
        </View>
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
    gap: 6,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  contentPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
  },
});
