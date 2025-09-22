import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useTheme } from "@/hooks/useTheme";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useNavigationUtils } from "@/utils/navigation";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import {
  Dimensions,
  Image,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";

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
  const [dropdownPosition, setDropdownPosition] = useState({ x: 0, y: 0 });
  const [showInitials, setShowInitials] = useState(false);
  const [showInitialsSmall, setShowInitialsSmall] = useState(false);
  const buttonRef = useRef<View>(null);
  const { themeMode, setThemeMode, isDark } = useTheme();
  const { t } = useI18n();
  const { navigateToSettings, navigateToAdmin } = useNavigationUtils();

  const { data: userData } = useGetMeQuery();
  const user = userData?.me;

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
    switch (themeMode) {
      case "light":
        return t("userDropdown.themes.light");
      case "dark":
        return t("userDropdown.themes.dark");
      case "system":
        return t("userDropdown.themes.system");
      default:
        return t("userDropdown.themes.theme");
    }
  }

  function getThemeIcon(): keyof typeof Ionicons.glyphMap {
    switch (themeMode) {
      case "light":
        return "sunny";
      case "dark":
        return "moon";
      case "system":
        // When system theme is selected, show the icon of the actual current theme
        return isDark ? "moon" : "sunny";
      default:
        return "sunny";
    }
  }

  function cycleTheme() {
    const themes: ("light" | "dark" | "system")[] = ["light", "dark", "system"];
    const currentIndex = themes.indexOf(themeMode);
    const nextIndex = (currentIndex + 1) % themes.length;
    setThemeMode(themes[nextIndex]);
  }

  function showDropdown() {
    buttonRef.current?.measure(
      (
        x: number,
        y: number,
        width: number,
        height: number,
        pageX: number,
        pageY: number
      ) => {
        const screenHeight = Dimensions.get("window").height;
        const dropdownHeight = 240; // Approximate height of dropdown

        // Position dropdown below button, but check if it fits on screen
        let dropdownY = pageY + height + 5;
        if (dropdownY + dropdownHeight > screenHeight) {
          // Position above button if doesn't fit below
          dropdownY = pageY - dropdownHeight - 5;
        }

        setDropdownPosition({
          x: pageX + width - 200, // Align to right edge of button
          y: dropdownY,
        });
        setIsVisible(true);
      }
    );
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
        cycleTheme();
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

  const dynamicStyles = {
    dropdown: [
      styles.dropdown,
      {
        backgroundColor: isDark ? "#2c2c2e" : "#ffffff",
        borderColor: isDark ? "#3c3c3e" : "#e5e5e7",
      },
    ],
    userInfo: [
      styles.userInfo,
      {
        borderBottomColor: isDark ? "#3c3c3e" : "#e5e5e7",
      },
    ],
    userDisplayName: [
      styles.userDisplayName,
      { color: isDark ? "#ffffff" : "#000000" },
    ],
    userEmail: [styles.userEmail, { color: isDark ? "#a0a0a0" : "#666666" }],
    item: [
      styles.item,
      {
        borderBottomColor: isDark ? "#3c3c3e" : "#e5e5e7",
      },
    ],
    itemText: [styles.itemText, { color: isDark ? "#ffffff" : "#000000" }],
    destructiveText: [styles.itemText, { color: "#ff3b30" }],
    overlay: [
      styles.overlay,
      { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "rgba(0,0,0,0.3)" },
    ],
  };

  return (
    <>
      <TouchableOpacity
        ref={buttonRef}
        onPress={showDropdown}
        activeOpacity={0.7}
        style={[styles.avatarButton]}
      >
        {renderMainAvatar()}
        <Ionicons
          name="chevron-down"
          size={14}
          color={isDark ? "#ffffff" : "#666666"}
          style={styles.dropdownIcon}
        />
      </TouchableOpacity>

      <Modal visible={isVisible} transparent animationType="fade">
        <TouchableWithoutFeedback onPress={hideDropdown}>
          <View style={dynamicStyles.overlay}>
            <View
              style={[
                dynamicStyles.dropdown,
                {
                  position: "absolute",
                  top: dropdownPosition.y,
                  left: dropdownPosition.x,
                },
              ]}
            >
              {/* User Info Header */}
              <View style={dynamicStyles.userInfo}>
                {renderSmallAvatar()}
                <View style={styles.userDetails}>
                  <Text style={dynamicStyles.userDisplayName} numberOfLines={1}>
                    {getUserDisplayName()}
                  </Text>
                  <Text style={dynamicStyles.userEmail} numberOfLines={1}>
                    {user?.email || t("userDropdown.offlineMode")}
                  </Text>
                </View>
              </View>

              {/* Dropdown Items */}
              {dropdownItems.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    dynamicStyles.item,
                    index === dropdownItems.length - 1 && {
                      borderBottomWidth: 0,
                    },
                  ]}
                  onPress={item.onPress}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={
                      item.type === "destructive"
                        ? "#ff3b30"
                        : isDark
                        ? "#ffffff"
                        : "#000000"
                    }
                    style={styles.itemIcon}
                  />
                  <Text
                    style={
                      item.type === "destructive"
                        ? dynamicStyles.destructiveText
                        : dynamicStyles.itemText
                    }
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  avatarButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0a7ea4",
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
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dropdown: {
    width: 200,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  avatarSmall: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0a7ea4",
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
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 12,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
  },
  itemIcon: {
    marginRight: 12,
  },
  itemText: {
    fontSize: 16,
    flex: 1,
  },
  dropdownIcon: {
    marginLeft: 2,
  },
});
