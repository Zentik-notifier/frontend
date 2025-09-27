import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Card, Icon, List, Text, useTheme } from "react-native-paper";

interface SettingsOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  onPress: () => void;
  selectionSegment: string;
}

export default function SettingsSidebar() {
  const segments = useSegments();
  const theme = useTheme();
  const { t } = useI18n();
  const { isMobile, isDesktop, isTablet } = useDeviceType();
  const nav = useNavigationUtils();

  const settingsOptions: SettingsOption[] = [
    {
      id: "user-profile",
      title: t("userProfile.title"),
      description: t("userProfile.description"),
      icon: "account",
      iconColor: "#4F46E5", // Indigo
      onPress: nav.navigateToUserProfile,
      selectionSegment: "user",
    },
    {
      id: "app-settings",
      title: t("appSettings.title"),
      description: t("appSettings.description"),
      icon: "cog",
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
      icon: "cellphone",
      iconColor: "#DC2626", // Red
      onPress: nav.navigateToDevicesSettings,
      selectionSegment: "devices",
    },
    {
      id: "user-sessions-settings",
      title: t("userSessions.title"),
      description: t("userSessions.description"),
      icon: "account-clock",
      iconColor: "#7C3AED", // Violet
      onPress: nav.navigateToUserSessionsSettings,
      selectionSegment: "user-sessions",
    },
    {
      id: "notifications-settings",
      title: t("notifications.title"),
      description: t("notifications.description"),
      icon: "bell",
      iconColor: "#EA580C", // Orange
      onPress: nav.navigateToNotificationsSettings,
      selectionSegment: "notifications",
    },
    {
      id: "app-logs",
      title: "Application Logs",
      description: "View and refresh local application logs stored on device.",
      icon: "file-document",
      iconColor: "#0EA5E9", // Sky
      onPress: nav.navigateToLogs,
      selectionSegment: "logs",
    },
  ];

  if (!isMobile) {
    return (
      <View
        style={[
          styles.sidebar,
          {
            backgroundColor: theme.colors.surface,
            borderRightColor: theme.colors.outline,
            width: isDesktop ? 400 : isTablet ? 300 : 250,
          },
        ]}
      >
        <ScrollView showsVerticalScrollIndicator={false}>
          <View>
            {settingsOptions.map((option) => {
              const isSelected = segments.some(
                (segment) => segment === option.selectionSegment
              );
              return (
                <List.Item
                  key={option.id}
                  title={option.title}
                  description={option.description}
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon={option.icon}
                      color={
                        isSelected ? theme.colors.primary : option.iconColor
                      }
                    />
                  )}
                  onPress={option.onPress}
                  style={[
                    styles.listItem,
                    {
                      backgroundColor: isSelected
                        ? theme.colors.primaryContainer
                        : "transparent",
                    },
                  ]}
                  titleStyle={{
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurface,
                  }}
                  descriptionStyle={{
                    color: isSelected
                      ? theme.colors.onPrimaryContainer
                      : theme.colors.onSurfaceVariant,
                  }}
                />
              );
            })}
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.optionsContainer}>
          {settingsOptions.map((option) => (
            <Card
              key={option.id}
              style={[
                styles.optionCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.outline,
                },
              ]}
              onPress={option.onPress}
            >
              <Card.Content style={styles.cardContent}>
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: `${option.iconColor}15` },
                  ]}
                >
                  <Icon
                    source={option.icon}
                    size={24}
                    color={option.iconColor}
                  />
                </View>
                <View style={styles.optionTextContainer}>
                  <Text
                    style={[
                      styles.optionTitle,
                      { color: theme.colors.onSurface },
                    ]}
                  >
                    {option.title}
                  </Text>
                  {isMobile && (
                    <Text
                      style={[
                        styles.optionDescription,
                        { color: theme.colors.onSurfaceVariant },
                      ]}
                    >
                      {option.description}
                    </Text>
                  )}
                </View>
                <Icon
                  source="chevron-right"
                  size={20}
                  color={theme.colors.onSurfaceVariant}
                />
              </Card.Content>
            </Card>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    borderRightWidth: 1,
  },
  listItem: {
    marginHorizontal: 4,
    marginVertical: 1,
    borderRadius: 8,
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
    gap: 8,
  },
  optionCard: {
    marginBottom: 4,
    borderRadius: 12,
    borderWidth: 1,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
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
