import { useAppContext } from "@/contexts/AppContext";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import iosBridgeService from "@/services/ios-bridge";
import { useSegments } from "expo-router";
import React, { useEffect, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";
import { List, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";

const GUEST_ONLY_IDS = ["app-settings", "cached-data", "app-logs"];

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
  const { lastUserId } = useAppContext();
  const isLoggedIn = !!lastUserId;
  const [isWatchSupported, setIsWatchSupported] = useState<boolean>(false);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    iosBridgeService.isWatchSupported().then((r) => setIsWatchSupported(r.supported));
  }, []);

  const allSettingsOptions: SettingsOption[] = [
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
      onPress: () => nav.navigateToAppSettings(true),
      selectionSegment: "app-settings",
    },
    ...(Platform.OS === "ios" && isWatchSupported
      ? [
          {
            id: "watch-cloud",
            title: t("settingsWatchCloud.title"),
            description: t("settingsWatchCloud.description"),
            icon: "cloud",
            iconColor: "#6366F1", // Indigo
            onPress: nav.navigateToWatchCloudSettings,
            selectionSegment: "watch-cloud",
          },
        ]
      : []),
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
      id: "external-servers-settings",
      title: t("externalServers.title"),
      description: t("externalServers.description"),
      icon: "server",
      iconColor: "#0D9488", // Teal
      onPress: nav.navigateToExternalNotifySystemsSettings,
      selectionSegment: "external-notify-system",
    },
    {
      id: "user-attachments",
      title: t("userAttachments.title"),
      description: t("userAttachments.description"),
      icon: "paperclip",
      iconColor: "#EC4899", // Pink
      onPress: nav.navigateToUserAttachments,
      selectionSegment: "attachments",
    },
    {
      id: "payload-mappers-settings",
      title: t("payloadMappers.title"),
      description: t("payloadMappers.description"),
      icon: "function",
      iconColor: "#8B5CF6", // Purple
      onPress: nav.navigateToPayloadMappersSettings,
      selectionSegment: "payload-mapper",
    },
    {
      id: "user-templates-settings",
      title: t("userTemplates.title"),
      description: t("userTemplates.description"),
      icon: "file-document-edit",
      iconColor: "#A855F7", // Purple/Violet
      onPress: nav.navigateToUserTemplatesSettings,
      selectionSegment: "user-template",
    },
    // {
    //   id: "devices-settings",
    //   title: t("devices.title"),
    //   description: t("devices.description"),
    //   icon: "cellphone",
    //   iconColor: "#DC2626", // Red
    //   onPress: nav.navigateToDevicesSettings,
    //   selectionSegment: "devices",
    // },
    // {
    //   id: "user-sessions-settings",
    //   title: t("userSessions.title"),
    //   description: t("userSessions.description"),
    //   icon: "account-clock",
    //   iconColor: "#7C3AED", // Violet
    //   onPress: nav.navigateToUserSessionsSettings,
    //   selectionSegment: "user-sessions",
    // },
    {
      id: "app-logs",
      title: t("appLogs.title"),
      description: t("appLogs.description"),
      icon: "file-document",
      iconColor: "#0EA5E9", // Sky
      onPress: nav.navigateToLogs,
      selectionSegment: "logs",
    },
    {
      id: "downloads",
      title: t("downloads.title"),
      description: t("downloads.description"),
      icon: "download",
      iconColor: "#0EA5E9", // Sky
      onPress: nav.navigateToDownloads,
      selectionSegment: "downloads",
    },
    {
      id: "message-reminders",
      title: t("messageReminders.title"),
      description: t("messageReminders.description"),
      icon: "bell-ring",
      iconColor: "#F59E0B", // Amber
      onPress: nav.navigateToMessageReminders,
      selectionSegment: "message-reminders",
    },
    {
      id: "cached-data",
      title: t("cachedData.title"),
      description: t("cachedData.description"),
      icon: "database",
      iconColor: "#6366F1", // Indigo
      onPress: nav.navigateToCachedData,
      selectionSegment: "cached-data",
    },
  ];

  const settingsOptions = isLoggedIn
    ? allSettingsOptions
    : allSettingsOptions.filter((o) => GUEST_ONLY_IDS.includes(o.id));

  const renderListItem = (option: SettingsOption) => {
    const isSelected = segments.some(
      (segment) => segment === option.selectionSegment
    );
    return (
      <List.Item
        key={option.id}
        title={option.title}
        description={!isMobile ? option.description : undefined}
        titleNumberOfLines={1}
        descriptionNumberOfLines={isMobile ? 0 : 2}
        left={(props) => (
          <List.Icon
            {...props}
            icon={option.icon}
            color={isSelected ? theme.colors.primary : option.iconColor}
          />
        )}
        right={isMobile ? (props) => <List.Icon {...props} icon="chevron-right" /> : undefined}
        onPress={option.onPress}
        style={[
          styles.listItem,
          {
            backgroundColor: isSelected
              ? theme.colors.primaryContainer
              : "transparent",
            minHeight: isMobile ? 48 : 56,
          },
        ]}
        titleStyle={{
          color: isSelected
            ? theme.colors.onPrimaryContainer
            : theme.colors.onSurface,
          fontSize: isMobile ? 16 : 15,
        }}
        descriptionStyle={
          !isMobile
            ? {
                color: isSelected
                  ? theme.colors.onPrimaryContainer
                  : theme.colors.onSurfaceVariant,
              }
            : undefined
        }
      />
    );
  };

  return (
    <PaperScrollView
      style={isMobile ? styles.mobileContainer : undefined}
    >
      <View style={styles.listContainer}>
        {settingsOptions.map(renderListItem)}
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  listItem: {
    marginVertical: 0,
    borderRadius: 8,
  },
  listContainer: {
    paddingVertical: 2,
  },
  mobileContainer: {
    paddingHorizontal: 0,
    paddingVertical: 8,
  },
});
