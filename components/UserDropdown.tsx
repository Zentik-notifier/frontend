import { useAppContext } from "@/contexts/AppContext";
import { UserRole, useGetMeQuery, usePublicAppConfigQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppTheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { Image } from "expo-image";
import { Linking, StyleSheet, TouchableOpacity, View } from "react-native";
import { Avatar, Icon, Surface, Text, useTheme } from "react-native-paper";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { VersionInfo } from "./VersionInfo";
import {
  Menu,
  MenuOption,
  MenuOptions,
  MenuTrigger,
} from "react-native-popup-menu";

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

  function toggleMenu() {
    setIsMenuOpen(!isMenuOpen);
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
      <Menu opened={isMenuOpen} onBackdropPress={closeMenu}>
        <MenuTrigger
          customStyles={{
            TriggerTouchableComponent: TouchableOpacity,
            triggerTouchable: {
              activeOpacity: 0.7,
              style: { borderRadius: 18 },
            },
          }}
          onPress={toggleMenu}
        >
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
        </MenuTrigger>
        <MenuOptions
          optionsContainerStyle={{
            backgroundColor: theme.colors.surface,
            borderRadius: 12,
            borderWidth: 1,
            borderColor: theme.colors.outlineVariant,
            marginTop: 55,
          }}
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
          <MenuOption
            onSelect={() => {
              showOnboarding();
              closeMenu();
            }}
          >
            <View
              style={[
                styles.menuItem,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Icon
                source="help-circle-outline"
                size={20}
                color={theme.colors.onSurface}
              />
              <Text
                style={[styles.menuItemText, { color: theme.colors.onSurface }]}
              >
                {t("userDropdown.gettingStarted")}
              </Text>
            </View>
          </MenuOption>

          {/* Documentation */}
          <MenuOption
            onSelect={() => {
              Linking.openURL("https://notifier-docs.zentik.app");
              closeMenu();
            }}
          >
            <View
              style={[
                styles.menuItem,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Icon
                source="book-outline"
                size={20}
                color={theme.colors.onSurface}
              />
              <Text
                style={[styles.menuItemText, { color: theme.colors.onSurface }]}
              >
                {t("userDropdown.documentation")}
              </Text>
            </View>
          </MenuOption>

          {/* Theme Toggle */}
          <MenuOption
            onSelect={() => {
              const next = themeMode === "system" ? "light" : themeMode === "light" ? "dark" : "system";
              setThemeMode(next);
            }}
          >
            <View
              style={[
                styles.menuItem,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <ThemeSwitcher variant="inline" />
            </View>
          </MenuOption>

          {/* Settings */}
          <MenuOption
            onSelect={() => {
              navigateToSettings();
              closeMenu();
            }}
          >
            <View
              style={[
                styles.menuItem,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Icon source="cog" size={20} color={theme.colors.onSurface} />
              <Text
                style={[styles.menuItemText, { color: theme.colors.onSurface }]}
              >
                {t("userDropdown.settings")}
              </Text>
            </View>
          </MenuOption>

          {/* Self-service - Only show if enabled in server settings */}
          {providersData?.publicAppConfig?.systemTokenRequestsEnabled && (
            <MenuOption
              onSelect={() => {
                navigateToSelfService();
                closeMenu();
              }}
            >
              <View
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Icon source="tools" size={20} color={theme.colors.onSurface} />
                <Text
                  style={[styles.menuItemText, { color: theme.colors.onSurface }]}
                >
                  Self Service
                </Text>
              </View>
            </MenuOption>
          )}

          {/* Administration (Admin only) */}
          {user?.role === UserRole.Admin && (
            <MenuOption
              onSelect={() => {
                navigateToAdmin();
                closeMenu();
              }}
            >
              <View
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Icon
                  source="shield-outline"
                  size={20}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("userDropdown.administration")}
                </Text>
              </View>
            </MenuOption>
          )}

          {/* Changelogs (Admin only) */}
          {user?.role === UserRole.Admin && (
            <MenuOption
              onSelect={() => {
                openChangelogModal();
                closeMenu();
              }}
            >
              <View
                style={[
                  styles.menuItem,
                  { backgroundColor: theme.colors.surface },
                ]}
              >
                <Icon
                  source="new-box"
                  size={20}
                  color={theme.colors.onSurface}
                />
                <Text
                  style={[
                    styles.menuItemText,
                    { color: theme.colors.onSurface },
                  ]}
                >
                  {t("userDropdown.changelog")}
                </Text>
              </View>
            </MenuOption>
          )}

          {/* Logout */}
          <MenuOption
            onSelect={() => {
              logout();
              closeMenu();
            }}
          >
            <View
              style={[
                styles.menuItem,
                { backgroundColor: theme.colors.surface },
              ]}
            >
              <Icon source="logout" size={20} color={theme.colors.error} />
              <Text
                style={[styles.menuItemText, { color: theme.colors.error }]}
              >
                {t("userDropdown.logout")}
              </Text>
            </View>
          </MenuOption>

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
        </MenuOptions>
      </Menu>
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
});
