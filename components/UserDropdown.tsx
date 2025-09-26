import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useTheme as useAppTheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useMemo, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import { Avatar, Icon, Text, useTheme } from "react-native-paper";
import InlineMenu, { InlineMenuItem } from "./ui/InlineMenu";

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

  const [isDarkMode, setIsDarkMode] = useState(theme.dark);

  // Update initials state when avatar changes
  useEffect(() => {
    setShowInitials(!user?.avatar);
    setShowInitialsSmall(!user?.avatar);
  }, [user?.avatar]);

  function renderMainAvatar() {
    if (user?.avatar && !showInitials) {
      return (
        <Image
          source={{ uri: user.avatar }}
          style={styles.avatarImage}
          onError={() => setShowInitials(true)}
        />
      );
    }

    return (
      <View style={styles.avatarContainer}>
        <Text style={styles.initialsText}>{getInitials()}</Text>
      </View>
    );
  }

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

  const userHeader = (
    <View style={styles.userInfo}>
      {renderSmallAvatar()}
      <View style={styles.userDetails}>
        <Text
          variant="titleMedium"
          style={styles.userDisplayName}
          numberOfLines={1}
        >
          {getUserDisplayName()}
        </Text>
        <Text variant="bodySmall" style={styles.userEmail} numberOfLines={1}>
          {user?.email || t("userDropdown.offlineMode")}
        </Text>
      </View>
    </View>
  );

  const menuItems: InlineMenuItem[] = useMemo(
    () => [
      {
        id: "gettingStarted",
        label: t("userDropdown.gettingStarted"),
        icon: "help-circle-outline",
        onPress: () => {
          showOnboarding();
        },
      },
      {
        id: "themeToggle",
        label: getThemeCycleLabel(),
        icon: getThemeCycleIcon(),
        onPress: () => setThemeMode(getNextThemeMode()),
        keepOpen: true,
      },
      {
        id: "settings",
        label: t("userDropdown.settings"),
        icon: "cog",
        onPress: () => {
          navigateToSettings();
        },
      },
      ...(user?.role === UserRole.Admin
        ? [
            {
              id: "administration",
              label: t("userDropdown.administration"),
              icon: "shield-outline",
              onPress: () => {
                navigateToAdmin();
              },
            },
          ]
        : []),
      {
        id: "logout",
        label: t("userDropdown.logout"),
        icon: "logout",
        onPress: () => {
          logout();
        },
        type: "destructive",
      },
    ],
    [
      t,
      getThemeCycleLabel,
      getThemeCycleIcon,
      setThemeMode,
      getNextThemeMode,
      navigateToSettings,
      user?.role,
      navigateToAdmin,
      logout,
      showOnboarding,
    ]
  );

  return (
    <InlineMenu
      position="vertically"
      anchor={
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
              color={theme.colors.onSurface}
            />
          </View>
        </View>
      }
      items={menuItems}
      anchorPosition="bottom"
      maxHeight={400}
      header={userHeader}
    />
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  avatarButton: {
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  avatarButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
  menuContent: {
    width: 200,
    borderRadius: 12,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
  },
  initialsSmallText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
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
  destructiveText: {
    color: "#ff3b30",
  },
  dropdownIcon: {
    marginLeft: 2,
  },
});
