import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Href, useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

import Icon from "@/components/ui/Icon";
import { IconName } from "@/constants/Icons";
import { useAppContext } from "@/services/app-context";

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  route: Href;
}

export default function SettingsScreen() {
  const { userId, showOnboarding, setLoading, isLoading } = useAppContext();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  if (!userId) {
    return null;
  }

  const settingsOptions: SettingsOption[] = [
    {
      id: "app-settings",
      title: t("appSettings.title"),
      description: t("appSettings.description"),
      icon: "settings",
      iconColor: "#F59E0B", // Amber
      route: "/(mobile)/private/app-settings",
    },
    {
      id: "user-profile",
      title: t("userProfile.title"),
      description: t("userProfile.description"),
      icon: "user",
      iconColor: "#4F46E5", // Indigo
      route: "/(mobile)/private/user-profile",
    },
    {
      id: "buckets-settings",
      title: t("buckets.title"),
      description: t("buckets.description"),
      icon: "bucket",
      iconColor: "#059669", // Emerald
      route: "/(mobile)/private/buckets-settings",
    },
    {
      id: "devices-settings",
      title: t("devices.title"),
      description: t("devices.description"),
      icon: "device",
      iconColor: "#DC2626", // Red
      route: "/(mobile)/private/devices-settings",
    },
    {
      id: "access-tokens-settings",
      title: t("accessTokens.title"),
      description: t("accessTokens.description"),
      icon: "password",
      iconColor: "#0891B2", // Cyan
      route: "/(mobile)/private/access-tokens-settings",
    },
    {
      id: "user-sessions-settings",
      title: t("userSessions.title"),
      description: t("userSessions.description"),
      icon: "notebook",
      iconColor: "#2563EB", // Notebook blue
      route: "/(mobile)/private/user-sessions-settings",
    },
    {
      id: "notifications-settings",
      title: t("notifications.title"),
      description: t("notifications.description"),
      icon: "notification",
      iconColor: "#7C3AED", // Violet
      route: "/(mobile)/private/notifications-settings",
    },
    {
      id: "webhooks-settings",
      title: t("webhooks.title"),
      description: t("webhooks.description"),
      icon: "webhook",
      iconColor: "#10B981", // Green
      route: "/(mobile)/private/webhooks-settings",
    },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleContainer}>
          <Icon name="settings" size="lg" color="#F59E0B" />
          <ThemedText style={styles.title}>{t("common.settings")}</ThemedText>
        </View>

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
              onPress={() => router.push(option.route)}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIconContainer,
                  { backgroundColor: `${option.iconColor}15` }, // 15 = ~8% opacity
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
                <ThemedText style={styles.optionDescription}>
                  {option.description}
                </ThemedText>
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
