import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import Icon from "@/components/ui/Icon";
import { Colors } from "@/constants/Colors";
import { IconName } from "@/constants/Icons";
import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { Slot, usePathname, useRouter, useSegments } from "expo-router";
import React, { useMemo } from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface AdminOption {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  route: string;
}

export default function TabletAdminLayout() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { isDesktop, isTablet } = useDeviceType();
  const segments = useSegments();
  const router = useRouter();
  const pathnameSrc = usePathname();

  const pathname = useMemo(() => {
    return `/${segments.join("/")}`;
  }, [pathnameSrc, segments]);

  const { data: userData } = useGetMeQuery({});
  const user = userData?.me;

  const sidebarWidth = isDesktop ? 320 : isTablet ? 280 : 250;

  // Check if user is admin - redirect if not
  if (!user || user.role !== UserRole.Admin) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.accessDeniedContainer}>
          <Icon
            name="warning"
            size="xl"
            color="secondary"
            style={styles.accessDeniedIcon}
          />
          <ThemedText style={styles.accessDeniedTitle}>
            {t("administration.accessDenied.title")}
          </ThemedText>
          <ThemedText style={styles.accessDeniedText}>
            {t("administration.accessDenied.message")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  const adminOptions: AdminOption[] = [
    {
      id: "user-management",
      title: t("administration.userManagement"),
      description: t("administration.userManagementDescription"),
      icon: "user",
      iconColor: "#4F46E5",
      route: "/(tablet)/private/(admin)/user-management",
    },
    {
      id: "oauth-providers",
      title: t("administration.oauthProviders"),
      description: t("administration.oauthProvidersDescription"),
      icon: "api",
      iconColor: "#0891B2",
      route: "/(tablet)/private/(admin)/oauth-providers",
    },
    {
      id: "system-access-tokens",
      title: t("administration.systemTokensTitle") || "System Access Tokens",
      description:
        t("administration.systemTokensDescription") ||
        "Manage system API tokens",
      icon: "key",
      iconColor: "#06b6d4",
      route: "/(tablet)/private/(admin)/system-access-tokens",
    },
    {
      id: "events-review",
      title: t("eventsReview.title"),
      description: t("eventsReview.description"),
      icon: "notebook",
      iconColor: "#ef4444",
      route: "/(tablet)/private/(admin)/events-review",
    },
  ];

  const renderSidebar = () => (
    <ThemedView style={[styles.sidebar, { width: sidebarWidth }]}>
      <ScrollView
        style={styles.sidebarScroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sidebarHeader}>
          <Icon name="shield" size="lg" color="#DC2626" />
          <ThemedText style={styles.sidebarTitle}>
            {t("administration.title")}
          </ThemedText>
        </View>

        <View style={styles.menuList}>
          {adminOptions.map((option) => {
            const isSelected = pathname === option.route;

            return (
              <TouchableOpacity
                key={option.id}
                style={[
                  styles.menuItem,
                  {
                    backgroundColor: isSelected
                      ? Colors[colorScheme].tint + "20"
                      : "transparent",
                    borderColor: isSelected
                      ? Colors[colorScheme].tint
                      : "transparent",
                  },
                ]}
                onPress={() => router.push(option.route as any)}
              >
                <View
                  style={[
                    styles.menuIconContainer,
                    { backgroundColor: `${option.iconColor}15` },
                  ]}
                >
                  <Icon name={option.icon} size="md" color={option.iconColor} />
                </View>
                <View style={styles.menuTextContainer}>
                  <ThemedText
                    style={[
                      styles.menuTitle,
                      isSelected && { color: Colors[colorScheme].tint },
                    ]}
                  >
                    {option.title}
                  </ThemedText>
                  <ThemedText style={styles.menuDescription}>
                    {option.description}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );

  const renderContent = () => (
    <ThemedView style={styles.content}>
      <Slot />
    </ThemedView>
  );

  return (
    <ThemedView style={styles.container}>
      <View style={styles.layout}>
        {renderSidebar()}
        {renderContent()}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  layout: {
    flex: 1,
    flexDirection: "row",
  },
  sidebar: {
    borderRightWidth: 1,
    borderRightColor: "#E5E5E5",
  },
  sidebarScroll: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 24,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  menuList: {
    padding: 16,
    gap: 8,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  menuTextContainer: {
    flex: 1,
  },
  menuTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  menuDescription: {
    fontSize: 12,
    opacity: 0.7,
    lineHeight: 16,
  },
  content: {
    flex: 1,
  },
  accessDeniedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  accessDeniedIcon: {
    marginBottom: 20,
  },
  accessDeniedTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
    textAlign: "center",
  },
  accessDeniedText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
  },
});
