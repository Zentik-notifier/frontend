import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  Image,
  StyleSheet,
  View
} from "react-native";
import {
  Button,
  Divider,
  Menu,
  Surface,
  Text,
  useTheme
} from "react-native-paper";

interface DropdownItem {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  type?: "normal" | "destructive";
}

export default function UserDropdown() {
  const { logout, showOnboarding } = useAppContext();
  const [isVisible, setIsVisible] = useState(false);
  const [showInitials, setShowInitials] = useState(false);
  const [showInitialsSmall, setShowInitialsSmall] = useState(false);
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToSettings, navigateToAdmin } = useNavigationUtils();

  const { data: userData } = useGetMeQuery();
  const user = userData?.me;

  // Theme management using react-native-paper
  const [isDarkMode, setIsDarkMode] = useState(theme.dark);
  
  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
  };

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

  function renderSmallAvatar() {
    if (user?.avatar && !showInitialsSmall) {
      return (
        <Image
          source={{ uri: user.avatar }}
          style={styles.avatarSmallImage}
          onError={() => setShowInitialsSmall(true)}
        />
      );
    }

    return (
      <View style={styles.avatarSmall}>
        <Text style={styles.initialsSmallText}>{getInitials()}</Text>
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

  function getUserDisplayName() {
    if (!user) return t("userDropdown.unknownUser");
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.username) return user.username;
    if (user.email) return user.email;
    return t("userDropdown.unknownUser");
  }

  function getThemeLabel() {
    return isDarkMode ? t("userDropdown.themes.dark") : t("userDropdown.themes.light");
  }

  function getThemeIcon(): keyof typeof Ionicons.glyphMap {
    return isDarkMode ? "moon" : "sunny";
  }

  function showDropdown() {
    setIsVisible(true);
  }

  function hideDropdown() {
    setIsVisible(false);
  }

  const dropdownItems: DropdownItem[] = [
    {
      id: "gettingStarted",
      label: t("userDropdown.gettingStarted"),
      icon: "help-circle",
      onPress: () => {
        showOnboarding();
        hideDropdown();
      },
    },
    {
      id: "theme",
      label: getThemeLabel(),
      icon: getThemeIcon(),
      onPress: () => {
        toggleTheme();
      },
    },
    {
      id: "settings",
      label: t("userDropdown.settings"),
      icon: "settings",
      onPress: () => {
        navigateToSettings();
        hideDropdown();
      },
    },
    ...(user?.role === UserRole.Admin
      ? [
          {
            id: "administration",
            label: t("userDropdown.administration"),
            icon: "shield" as keyof typeof Ionicons.glyphMap,
            onPress: () => {
              navigateToAdmin();
              hideDropdown();
            },
          },
        ]
      : []),
    {
      id: "logout",
      label: t("userDropdown.logout"),
      icon: "log-out",
      onPress: () => {
        logout();
        hideDropdown();
      },
      type: "destructive",
    },
  ];

  return (
    <Menu
      visible={isVisible}
      onDismiss={hideDropdown}
      anchor={
        <Button
          mode="contained"
          onPress={showDropdown}
          style={styles.avatarButton}
          contentStyle={styles.avatarButtonContent}
        >
          {renderMainAvatar()}
          <Ionicons
            name="chevron-down"
            size={14}
            color={theme.colors.onSurface}
            style={styles.dropdownIcon}
          />
        </Button>
      }
      contentStyle={styles.menuContent}
    >
      {/* User Info Header */}
      <Surface style={styles.userInfo}>
        {renderSmallAvatar()}
        <View style={styles.userDetails}>
          <Text variant="titleMedium" style={styles.userDisplayName} numberOfLines={1}>
            {getUserDisplayName()}
          </Text>
          <Text variant="bodySmall" style={styles.userEmail} numberOfLines={1}>
            {user?.email || t("userDropdown.offlineMode")}
          </Text>
        </View>
      </Surface>
      
      <Divider />

      {/* Dropdown Items */}
      {dropdownItems.map((item, index) => (
        <Menu.Item
          key={item.id}
          onPress={() => {
            item.onPress();
            if (item.id !== "theme") {
              hideDropdown();
            }
          }}
          title={item.label}
          leadingIcon={item.icon}
          titleStyle={item.type === "destructive" ? styles.destructiveText : undefined}
        />
      ))}
    </Menu>
  );
}

const styles = StyleSheet.create({
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
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  avatarSmallImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
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
