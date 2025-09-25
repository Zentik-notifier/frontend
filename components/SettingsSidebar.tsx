import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useRouter, useSegments } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";
import Icon from "@/components/ui/Icon";
import { IconName } from "@/constants/Icons";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useNavigationUtils } from "@/utils/navigation";

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  onPress: () => void;
  selectionSegment: string;
}

export default function SettingsSidebar() {
  const router = useRouter();
  const segments = useSegments();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { isMobile, isDesktop } = useDeviceType();
  const nav = useNavigationUtils();

  const settingsOptions: SettingsOption[] = [
    {
      id: "user-profile",
      title: t("userProfile.title"),
      description: t("userProfile.description"),
      icon: "user",
      iconColor: "#4F46E5", // Indigo
      onPress: nav.navigateToUserProfile,
      selectionSegment: "user-profile",
    },
    {
      id: "app-settings",
      title: t("appSettings.title"),
      description: t("appSettings.description"),
      icon: "settings",
      iconColor: "#F59E0B", // Amber
      onPress: nav.navigateToAppSettings,
      selectionSegment: "app-settings",
    },
    {
      id: "buckets-settings",
      title: t("buckets.title"),
      description: t("buckets.description"),
      icon: "folder",
      iconColor: "#059669", // Emerald
      onPress: () => nav.navigateToBucketsSettings(),
      selectionSegment: "bucket",
    },
    {
      id: "access-tokens-settings",
      title: t("accessTokens.title"),
      description: t("accessTokens.description"),
      icon: "key",
      iconColor: "#0891B2", // Cyan
      onPress: nav.navigateToAccessTokensSettings,
      selectionSegment: "access-token",
    },
    {
      id: "webhooks-settings",
      title: t("webhooks.title"),
      description: t("webhooks.description"),
      icon: "webhook",
      iconColor: "#10B981", // Green
      onPress: nav.navigateToWebhooksSettings,
      selectionSegment: "webhook",
    },
    {
      id: "devices-settings",
      title: t("devices.title"),
      description: t("devices.description"),
      icon: "device",
      iconColor: "#DC2626", // Red
      onPress: nav.navigateToDevicesSettings,
      selectionSegment: "devices",
    },
    {
      id: "user-sessions-settings",
      title: t("userSessions.title"),
      description: t("userSessions.description"),
      icon: "notebook",
      iconColor: "#2563EB", // Notebook blue
      onPress: nav.navigateToUserSessionsSettings,
      selectionSegment: "user-sessions",
    },
    {
      id: "notifications-settings",
      title: t("notifications.title"),
      description: t("notifications.description"),
      icon: "notification",
      iconColor: "#7C3AED", // Violet
      onPress: nav.navigateToNotificationsSettings,
      selectionSegment: "notifications",
    },
    {
      id: "app-logs",
      title: "Application Logs",
      description: "View and refresh local application logs stored on device.",
      icon: "notebook",
      iconColor: "#0EA5E9", // Sky
      onPress: nav.navigateToLogs,
      selectionSegment: "logs",
    },
  ];

  if (!isMobile) {
    return (
      <ScrollView
        style={{
          backgroundColor: Colors[colorScheme ?? "light"].background,
          flexGrow: 0,
          flexShrink: 0,
        }}
        showsVerticalScrollIndicator={false}
      >
        <View style={[{ width: isDesktop ? 300 : 250 }]}>
          {settingsOptions.map((option) => {
            const isSelected = segments.some(
              (segment) => segment === option.selectionSegment
            );
            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.sidebarItem,
                  {
                    borderLeftWidth: 0,
                    borderLeftColor: "transparent",
                    backgroundColor: isSelected
                      ? Colors[colorScheme ?? "light"].tint + "20"
                      : "transparent",
                  },
                ]}
                onPress={option.onPress}
              >
                <Icon
                  name={option.icon}
                  size="md"
                  color={
                    option.iconColor ||
                    Colors[colorScheme ?? "light"].textSecondary
                  }
                />
                <ThemedText
                  style={[
                    styles.sidebarItemText,
                    {
                      color: isSelected
                        ? Colors[colorScheme ?? "light"].tint
                        : Colors[colorScheme ?? "light"].textSecondary,
                      fontSize: isDesktop ? 20 : 18,
                      fontWeight: isSelected ? "600" : "400",
                    },
                  ]}
                >
                  {option.title}
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.optionsContainer}>
          {settingsOptions.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={[
                styles.optionCard,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].backgroundCard,
                  borderColor: Colors[colorScheme ?? "light"].border,
                },
              ]}
              onPress={option.onPress}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: `${option.iconColor}15` },
                ]}
              >
                <Icon
                  name={option.icon}
                  size="lg"
                  color={
                    option.iconColor || Colors[colorScheme ?? "light"].tint
                  }
                />
              </View>
              <View style={styles.optionTextContainer}>
                <ThemedText style={styles.optionTitle}>
                  {option.title}
                </ThemedText>
                {isMobile && (
                  <ThemedText style={styles.optionDescription}>
                    {option.description}
                  </ThemedText>
                )}
              </View>
              <Icon name="chevron" size="md" color="secondary" />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  sidebarScroll: {
    flex: 1,
  },
  sidebarItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginHorizontal: 8,
    borderLeftWidth: 3,
    borderRadius: 4,
    marginBottom: 4,
  },
  sidebarItemText: {
    marginLeft: 12,
    fontSize: 14,
    flex: 1,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 50,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 30,
    gap: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 0,
    lineHeight: 34,
  },
  optionsContainer: {
    gap: 15,
  },
  optionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: 15,
    justifyContent: "center",
    alignItems: "center",
  },
  optionTextContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    opacity: 0.7,
    lineHeight: 20,
  },
});
