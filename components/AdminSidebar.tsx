import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Card, Icon, List, Text, useTheme } from "react-native-paper";
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
  const { isMobile, isDesktop, isTablet } = useDeviceType();
  const nav = useNavigationUtils();

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

  if (!isMobile) {
    return (
      <PaperScrollView>
        <View>
          {adminOptions.map((option) => {
            const isSelected = segments.some(
              (segment) => segment === option.selectionSegment
            );
            return (
              <List.Item
                key={option.id}
                title={option.title}
                description={option.description}
                titleNumberOfLines={1}
                descriptionNumberOfLines={4}
                left={(props) => (
                  <List.Icon
                    {...props}
                    icon={option.icon}
                    color={isSelected ? theme.colors.primary : option.iconColor}
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
      </PaperScrollView>
    );
  }

  return (
    <PaperScrollView>
      <View style={styles.optionsContainer}>
        {adminOptions.map((option) => (
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
                <Icon source={option.icon} size={24} color={option.iconColor} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text
                  style={[
                    styles.optionTitle,
                    { color: theme.colors.onSurface },
                  ]}
                  numberOfLines={4}
                >
                  {option.title}
                </Text>
                {isMobile && (
                  <Text
                    style={[
                      styles.optionDescription,
                      { color: theme.colors.onSurfaceVariant },
                    ]}
                    numberOfLines={4}
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
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  listItem: {
    marginVertical: 1,
    borderRadius: 8,
  },
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
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
