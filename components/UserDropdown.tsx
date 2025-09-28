import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppTheme } from "@/hooks/useTheme";
import { useAppContext } from "@/contexts/AppContext";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Avatar, Icon, Text, useTheme } from "react-native-paper";
import {
  Menu,
  MenuOptions,
  MenuOption,
  MenuTrigger,
} from "react-native-popup-menu";

export default function UserDropdown() {
  const { logout, showOnboarding } = useAppContext();
  const [showInitials, setShowInitials] = useState(false);
  const [showInitialsSmall, setShowInitialsSmall] = useState(false);
  const theme = useTheme();
  const { themeMode, setThemeMode } = useAppTheme();
  const { t } = useI18n();
  const { navigateToSettings, navigateToAdmin } = useNavigationUtils();

  const { data: userData } = useGetMeQuery();
  const user = userData?.me;

  useEffect(() => {
    setShowInitials(!user?.avatar);
    setShowInitialsSmall(!user?.avatar);
  }, [user?.avatar]);

  function getInitials() {
    if (!user) return "?";
    if (user.firstName && user.lastName)
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    if (user.username) return user.username.slice(0, 2).toUpperCase();
    if (user.email) return user.email[0].toUpperCase();
    return "?";
  }

  function getNextThemeMode(): "system" | "light" | "dark" {
    // ciclo: System -> Light -> Dark -> System
    if (themeMode === "system") return "light";
    if (themeMode === "light") return "dark";
    return "system";
  }

  function getThemeCycleLabel() {
    const next = getNextThemeMode();
    if (next === "system") return t("userDropdown.themes.system");
    if (next === "light") return t("userDropdown.themes.light");
    return t("userDropdown.themes.dark");
  }

  function getThemeCycleIcon(): string {
    const next = getNextThemeMode();
    if (next === "system") return "theme-light-dark";
    if (next === "light") return "white-balance-sunny";
    return "weather-night";
  }

  function renderSmallAvatar() {
    if (user?.avatar && !showInitialsSmall) {
      return (
        <Image
          source={{ uri: user.avatar }}
          style={styles.avatarImage}
          onError={() => setShowInitialsSmall(true)}
        />
      );
    }

    return (
      <View style={styles.avatarContainer}>
        <Text style={styles.initialsSmallText}>{getInitials()}</Text>
      </View>
    );
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
    <Menu>
      <MenuTrigger>
        <View style={styles.avatarButton}>
          {user?.avatar && !showInitials ? (
            <Avatar.Image source={{ uri: user.avatar }} size={36} />
          ) : (
            <Avatar.Text label={getInitials()} size={36} />
          )}
          <View style={styles.dropdownIcon}>
            <Icon
              source="chevron-down"
              size={16}
              color={theme.colors.background}
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
          {renderSmallAvatar()}
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
        <MenuOption onSelect={() => showOnboarding()}>
          <View
            style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
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

        {/* Theme Toggle */}
        <MenuOption onSelect={() => setThemeMode(getNextThemeMode())}>
          <View
            style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          >
            <Icon
              source={getThemeCycleIcon()}
              size={20}
              color={theme.colors.onSurface}
            />
            <Text
              style={[styles.menuItemText, { color: theme.colors.onSurface }]}
            >
              {getThemeCycleLabel()}
            </Text>
          </View>
        </MenuOption>

        {/* Settings */}
        <MenuOption onSelect={() => navigateToSettings()}>
          <View
            style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          >
            <Icon source="cog" size={20} color={theme.colors.onSurface} />
            <Text
              style={[styles.menuItemText, { color: theme.colors.onSurface }]}
            >
              {t("userDropdown.settings")}
            </Text>
          </View>
        </MenuOption>

        {/* Administration (Admin only) */}
        {user?.role === UserRole.Admin && (
          <MenuOption onSelect={() => navigateToAdmin()}>
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
                style={[styles.menuItemText, { color: theme.colors.onSurface }]}
              >
                {t("userDropdown.administration")}
              </Text>
            </View>
          </MenuOption>
        )}

        {/* Logout */}
        <MenuOption onSelect={() => logout()}>
          <View
            style={[styles.menuItem, { backgroundColor: theme.colors.surface }]}
          >
            <Icon source="logout" size={20} color={theme.colors.error} />
            <Text style={[styles.menuItemText, { color: theme.colors.error }]}>
              {t("userDropdown.logout")}
            </Text>
          </View>
        </MenuOption>
      </MenuOptions>
    </Menu>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
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
    paddingVertical: 12,
  },
  menuItemText: {
    marginLeft: 12,
    fontSize: 16,
  },
});
