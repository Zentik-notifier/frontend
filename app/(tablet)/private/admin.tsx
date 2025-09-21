import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import { IconName } from "@/constants/Icons";
import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";

// Per il layout tablet, renderizziamo direttamente i componenti mobile come contenuto
// Questo evita problemi di routing doppio e mantiene la logica esistente

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  route: string;
  enabled?: boolean;
}

export default function TabletAdministrationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { width } = useWindowDimensions();

  const [selectedSection, setSelectedSection] = useState("users");

  const { data: userData } = useGetMeQuery({});
  const user = userData?.me;

  const isTablet = width >= 768 && width < 1024;
  const isDesktop = width >= 1024;
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

  const adminSections: AdminSection[] = [
    {
      id: "users",
      title: t("administration.userManagement"),
      description: t("administration.userManagementDescription"),
      icon: "user",
      iconColor: "#4F46E5",
      route: "/(tablet)/private/user-management",
      enabled: true,
    },
    {
      id: "oauth",
      title: t("administration.oauthProviders"),
      description: t("administration.oauthProvidersDescription"),
      icon: "api",
      iconColor: "#0891B2",
      route: "/(tablet)/private/oauth-providers",
      enabled: true,
    },
    {
      id: "system-tokens",
      title: t("administration.systemTokensTitle") || "System Access Tokens",
      description:
        t("administration.systemTokensDescription") ||
        "Manage system API tokens",
      icon: "key",
      iconColor: "#06b6d4",
      route: "/(tablet)/private/system-access-tokens",
      enabled: true,
    },
    {
      id: "events-review",
      title: t("eventsReview.title"),
      description: t("eventsReview.description"),
      icon: "notebook",
      iconColor: "#ef4444",
      route: "/(tablet)/private/events-review",
      enabled: true,
    },
  ];

  const handleSectionPress = (section: AdminSection) => {
    if (section.enabled) {
      // Per il layout tablet, navighiamo alla pagina che reindirizza al mobile
      router.push(section.route as any);
    }
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.layout}>
        {/* Sidebar */}
        <View
          style={[
            styles.sidebar,
            {
              width: sidebarWidth,
              backgroundColor: Colors[colorScheme].backgroundCard,
              borderRightColor: Colors[colorScheme].border,
            },
          ]}
        >
          <ScrollView style={styles.sidebarContent} showsVerticalScrollIndicator={false}>
            <View style={styles.sidebarHeader}>
              <Icon name="shield" size="lg" color="#DC2626" />
              <ThemedText style={styles.sidebarTitle}>
                {t("administration.title")}
              </ThemedText>
            </View>

            <View style={styles.menuItems}>
              {adminSections.map((section) => {
                const isEnabled = section.enabled !== false;

                return (
                  <TouchableOpacity
                    key={section.id}
                    style={[
                      styles.menuItem,
                      {
                        backgroundColor: Colors[colorScheme].backgroundCard,
                        borderColor: Colors[colorScheme].border,
                        opacity: isEnabled ? 1 : 0.6,
                      },
                    ]}
                    onPress={() => handleSectionPress(section)}
                    activeOpacity={isEnabled ? 0.7 : 1}
                    disabled={!isEnabled}
                  >
                    <View style={styles.menuItemContent}>
                      <View
                        style={[
                          styles.menuItemIcon,
                          { backgroundColor: `${section.iconColor}15` },
                        ]}
                      >
                        <Icon
                          name={section.icon}
                          size="md"
                          color={
                            isEnabled
                              ? section.iconColor
                              : Colors[colorScheme].textSecondary
                          }
                        />
                      </View>
                      <View style={styles.menuItemText}>
                        <ThemedText
                          style={[
                            styles.menuItemTitle,
                            { color: Colors[colorScheme].text },
                          ]}
                        >
                          {section.title}
                        </ThemedText>
                        <ThemedText
                          style={[
                            styles.menuItemDescription,
                            { color: Colors[colorScheme].textSecondary },
                          ]}
                          numberOfLines={2}
                        >
                          {section.description}
                        </ThemedText>
                      </View>
                    </View>
                    {isEnabled && (
                      <Icon name="chevron" size="md" color="secondary" />
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Content - Placeholder per il layout tablet */}
        <View style={styles.content}>
          <ThemedView style={styles.contentPlaceholder}>
            <Icon name="shield" size="xl" color="secondary" />
            <ThemedText style={styles.placeholderTitle}>
              {t("administration.title")}
            </ThemedText>
            <ThemedText style={styles.placeholderText}>
              Seleziona una sezione dal menu per gestire l'amministrazione
            </ThemedText>
          </ThemedView>
        </View>
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
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  sidebarContent: {
    flex: 1,
  },
  sidebarHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    gap: 12,
  },
  sidebarTitle: {
    fontSize: 20,
    fontWeight: "700",
  },
  menuItems: {
    paddingHorizontal: 12,
    gap: 6,
  },
  menuItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
  },
  menuItemContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  menuItemIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    marginBottom: 4,
  },
  menuItemDescription: {
    fontSize: 13,
    lineHeight: 18,
  },
  content: {
    flex: 1,
  },
  contentPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  placeholderTitle: {
    fontSize: 24,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textAlign: "center",
  },
  placeholderText: {
    fontSize: 16,
    textAlign: "center",
    lineHeight: 22,
    opacity: 0.7,
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
