import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { List, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  onPress: () => void;
  selectionSegment: string;
}

export default function AdminSidebar() {
  const segments = useSegments();
  const theme = useTheme();
  const { t } = useI18n();
  const { isMobile } = useDeviceType();
  const nav = useNavigationUtils();

  const isSelfHosted = process.env.EXPO_PUBLIC_SELFHOSTED === "true";

  const adminOptions: AdminOption[] = [
    {
      id: "server-settings",
      title: t("administration.serverSettings"),
      description: t("administration.serverSettingsDescription"),
      icon: "server",
      iconColor: "#8b5cf6", // Purple
      onPress: nav.navigateToServerSettings,
      selectionSegment: "server-settings",
    },
    ...(isSelfHosted
      ? []
      : [
          {
            id: "changelogs",
            title: t("administration.changelogsTitle"),
            description: t("administration.changelogsDescription"),
            icon: "new-box",
            iconColor: "#22c55e", // Green
            onPress: (nav as any).navigateToChangelogs,
            selectionSegment: "changelogs",
          },
        ]),
    {
      id: "user-management",
      title: t("administration.userManagement"),
      description: t("administration.userManagementDescription"),
      icon: "account-supervisor",
      iconColor: "#4F46E5", // Indigo
      onPress: nav.navigateToUserManagement,
      selectionSegment: "user-management",
    },
    {
      id: "oauth-providers",
      title: t("administration.oauthProviders"),
      description: t("administration.oauthProvidersDescription"),
      icon: "api",
      iconColor: "#0891B2", // Cyan
      onPress: nav.navigateToOauthProviders,
      selectionSegment: "oauth-providers",
    },
    {
      id: "system-access-tokens",
      title: t("administration.systemTokensTitle"),
      description:
        t("administration.systemTokensDescription") ||
        "Manage system API tokens",
      icon: "key",
      iconColor: "#06b6d4", // Cyan
      onPress: nav.navigateToSystemAccessTokens,
      selectionSegment: "system-access-tokens",
    },
    {
      id: "events-review",
      title: t("eventsReview.title"),
      description: t("eventsReview.description"),
      icon: "notebook",
      iconColor: "#ef4444", // Red
      onPress: nav.navigateToEventsReview,
      selectionSegment: "events-review",
    },
    {
      id: "backup-management",
      title: t("administration.backupManagement"),
      description: t("administration.backupManagementDescription"),
      icon: "database",
      iconColor: "#10b981", // Green
      onPress: nav.navigateToBackupManagement,
      selectionSegment: "backup-management",
    },
    {
      id: "server-logs",
      title: t("serverLogs.title"),
      description: t("serverLogs.description"),
      icon: "file-document-outline",
      iconColor: "#f59e0b", // Amber
      onPress: nav.navigateToServerLogs,
      selectionSegment: "server-logs",
    },
    {
      id: "user-logs",
      title: t("administration.userLogsTitle"),
      description: t("administration.userLogsDescription"),
      icon: "account-eye",
      iconColor: "#0ea5e9", // Sky
      onPress: (nav as any).navigateToUserLogs,
      selectionSegment: "user-logs",
    },
    {
      id: "server-files",
      title: t("administration.serverFiles.title"),
      description: t("administration.serverFiles.description"),
      icon: "folder",
      iconColor: "#2563eb", // Blue
      onPress: (nav as any).navigateToServerFiles,
      selectionSegment: "server-files",
    },
  ];

  const renderListItem = (option: AdminOption) => {
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
        {adminOptions.filter(Boolean).map(renderListItem)}
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
