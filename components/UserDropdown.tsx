import { useAppContext } from "@/contexts/AppContext";
import { UserRole, useGetMeQuery, usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppTheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, Icon, Menu, Surface, Text, TouchableRipple, useTheme } from "react-native-paper";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { VersionInfo } from "./VersionInfo";
import PaperMenu from "./ui/PaperMenu";

interface UserDropdownProps {
  isMenuOpen: boolean;
  setIsMenuOpen: (isMenuOpen: boolean) => void;
}

export default function UserDropdown({
  isMenuOpen,
  setIsMenuOpen,
}: UserDropdownProps) {
  const { logout, showOnboarding, openChangelogModal } = useAppContext();
  const [showInitials, setShowInitials] = useState(false);
  const theme = useTheme();
  const { themeMode, setThemeMode } = useAppTheme();
  const { t } = useI18n();
  const { navigateToSettings, navigateToAdmin, navigateToSelfService, navigateToChangelogs } = useNavigationUtils();

  const { data: userData } = useGetMeQuery();
  const { data: providersData } = usePublicAppConfigQuery();
  const user = userData?.me;

  useEffect(() => {
    setShowInitials(!user?.avatar);
  }, [user?.avatar]);

  function getInitials() {
    if (!user) return "?";
    if (user.firstName && user.lastName)
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
  }

  function closeMenu() {
    setIsMenuOpen(false);
  }

  function getUserDisplayName() {
    if (!user) return t("userDropdown.offlineMode");
    if (user.firstName && user.lastName)
      return `${user.firstName} ${user.lastName}`;
    if (user.username) return user.username;
    if (user.email) return user.email;
    return t("userDropdown.offlineMode");
  }

  return (
    <Surface style={styles.container} elevation={2}>
      <PaperMenu
        opened={isMenuOpen}
        onOpenChange={setIsMenuOpen}
        anchorPosition="bottom"
        menuStyle={{
          borderRadius: 12,
        }}
        renderTrigger={(openMenu) => (
          <TouchableOpacity activeOpacity={0.7} onPress={openMenu}>
            <View style={[styles.avatarButton, { borderRadius: 18 }]}>
              {user?.avatar && !showInitials ? (
                <Image
                  source={{ uri: user.avatar }}
                  style={styles.avatarImage}
                  cachePolicy="none"
                  recyclingKey={`user-avatar-${user.id}`}
                />
              ) : (
                <Avatar.Text label={getInitials()} size={36} />
              )}
              <View style={styles.dropdownIcon}>
                <Icon
                  source="chevron-down"
                  size={16}
                  color={theme.colors.onSurface}
                />
              </View>
            </View>
          </TouchableOpacity>
        )}
      >
        {/* User Header */}
        <View
          style={[
            styles.userInfo,
            {
              borderBottomColor: theme.colors.outlineVariant,
              backgroundColor: theme.colors.surfaceVariant,
            },
          ]}
        >
          <View style={styles.userDetails}>
            <Text
              variant="titleMedium"
              style={[
                styles.userDisplayName,
                { color: theme.colors.onSurface },
              ]}
              numberOfLines={1}
            >
              {getUserDisplayName()}
            </Text>
            <Text
              variant="bodySmall"
              style={[
                styles.userEmail,
                { color: theme.colors.onSurfaceVariant },
              ]}
              numberOfLines={1}
            >
              {user?.email || t("userDropdown.offlineMode")}
            </Text>
          </View>
        </View>

        {/* Getting Started */}
        <Menu.Item
          onPress={() => {
            showOnboarding();
            closeMenu();
          }}
          title={t("userDropdown.gettingStarted")}
          leadingIcon="help-circle-outline"
          titleStyle={{ color: theme.colors.onSurface }}
        />

        {/* Documentation */}
        <Menu.Item
          onPress={() => {
            Linking.openURL("https://notifier-docs.zentik.app");
            closeMenu();
          }}
          title={t("userDropdown.documentation")}
          leadingIcon="book-outline"
          titleStyle={{ color: theme.colors.onSurface }}
        />

        {/* Theme Toggle */}
        <TouchableRipple
          onPress={() => {
            const next = themeMode === "system" ? "light" : themeMode === "light" ? "dark" : "system";
            setThemeMode(next);
          }}
          style={styles.themeToggleRow}
        >
          <ThemeSwitcher variant="inline" />
        </TouchableRipple>

        {/* Settings */}
        <Menu.Item
          onPress={() => {
            navigateToSettings();
            closeMenu();
          }}
          title={t("userDropdown.settings")}
          leadingIcon="cog"
          titleStyle={{ color: theme.colors.onSurface }}
        />

        {/* Self-service - Only show if enabled in server settings */}
        {providersData?.publicAppConfig?.systemTokenRequestsEnabled && (
          <Menu.Item
            onPress={() => {
              navigateToSelfService();
              closeMenu();
            }}
            title="Self Service"
            leadingIcon="tools"
            titleStyle={{ color: theme.colors.onSurface }}
          />
        )}

        {/* Administration (Admin only) */}
        {user?.role === UserRole.Admin && (
          <Menu.Item
            onPress={() => {
              navigateToAdmin();
              closeMenu();
            }}
            title={t("userDropdown.administration")}
            leadingIcon="shield-outline"
            titleStyle={{ color: theme.colors.onSurface }}
          />
        )}

        {/* Changelogs (Admin only) */}
        {user?.role === UserRole.Admin && (
          <Menu.Item
            onPress={() => {
              openChangelogModal();
              closeMenu();
            }}
            title={t("userDropdown.changelog")}
            leadingIcon="new-box"
            titleStyle={{ color: theme.colors.onSurface }}
          />
        )}

        {/* Logout */}
        <Menu.Item
          onPress={() => {
            logout();
            closeMenu();
          }}
          title={t("userDropdown.logout")}
          leadingIcon="logout"
          titleStyle={{ color: theme.colors.error }}
        />

        {/* Version Info Footer */}
        <View
          style={[
            styles.versionInfoBox,
            {
              backgroundColor: theme.colors.surfaceVariant,
              borderTopColor: theme.colors.outlineVariant,
            },
          ]}
        >
          <VersionInfo compact />
        </View>
      </PaperMenu>
    </Surface>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
  },
  avatarButton: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 8,
  },
  avatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 8,
  },
  initialsText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 18,
  },
  initialsSmallText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  userDetails: {
    flex: 1,
  },
  userDisplayName: {
    fontWeight: "600",
    marginBottom: 2,
  },
  userEmail: {
    opacity: 0.7,
  },
  dropdownIcon: {
    marginLeft: 2,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
  },
  versionInfoBox: {
    borderTopWidth: 1,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  themeToggleRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
});
