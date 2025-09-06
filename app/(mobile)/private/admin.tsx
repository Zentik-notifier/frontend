import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import { IconName } from "@/constants/Icons";
import { UserRole, useGetMeQuery } from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useRouter } from "expo-router";
import React from "react";
import { ScrollView, StyleSheet, TouchableOpacity, View } from "react-native";

interface AdminSection {
  id: string;
  title: string;
  description: string;
  icon: IconName;
  iconColor: string;
  onPress: () => void;
  enabled?: boolean;
}

export default function AdministrationScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const { t } = useI18n();

  const { data: userData } = useGetMeQuery({
    fetchPolicy: "cache-first",
  });
  const user = userData?.me;

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
      iconColor: "#4F46E5", // Indigo
      onPress: () => router.push("/(mobile)/private/user-management"),
      enabled: true,
    },
    {
      id: "oauth",
      title: t("administration.oauthProviders"),
      description: t("administration.oauthProvidersDescription"),
      icon: "api",
      iconColor: "#0891B2", // Cyan
      onPress: () => router.push("/(mobile)/private/oauth-providers"),
      enabled: true,
    },
    {
      id: "system-tokens",
      title: t("administration.systemTokensTitle") || "System Access Tokens",
      description: t("administration.systemTokensDescription") || "Manage system API tokens",
      icon: "key",
      iconColor: "#06b6d4",
      onPress: () => router.push("/(mobile)/private/system-access-tokens"),
      enabled: true,
    },
    // {
    //   id: "system",
    //   title: t("administration.systemSettings"),
    //   description: "Configure system-wide settings and preferences",
    //   icon: "settings",
    //   iconColor: "#F59E0B", // Amber
    //   onPress: () => showComingSoon("System Settings"),
    //   enabled: true,
    // },
    // {
    //   id: "status",
    //   title: t("administration.serverStatus"),
    //   description: "View server health and performance metrics",
    //   icon: "database",
    //   iconColor: "#10B981", // Green
    //   onPress: () => showComingSoon("Server Status"),
    //   enabled: true,
    // },
    // {
    //   id: "logs",
    //   title: t("administration.logs"),
    //   description: "View and manage system logs",
    //   icon: "backup",
    //   iconColor: "#7C3AED", // Violet
    //   onPress: () => showComingSoon("System Logs"),
    //   enabled: true,
    // },
  ];

  return (
    <ThemedView style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.titleContainer}>
          <Icon name="settings" size="lg" color="#DC2626" />
          <ThemedText style={styles.title}>
            {t("administration.title")}
          </ThemedText>
        </View>

        <View style={styles.optionsContainer}>
          {adminSections.map((section) => {
            const isEnabled = section.enabled !== false;

            return (
              <TouchableOpacity
                key={section.id}
                style={[
                  styles.optionCard,
                  {
                    backgroundColor:
                      Colors[colorScheme ?? "light"].backgroundCard,
                    borderColor: Colors[colorScheme ?? "light"].border,
                    opacity: isEnabled ? 1 : 0.6,
                  },
                ]}
                onPress={isEnabled ? section.onPress : undefined}
                activeOpacity={isEnabled ? 0.7 : 1}
                disabled={!isEnabled}
              >
                <View
                  style={[
                    styles.optionIconContainer,
                    { backgroundColor: `${section.iconColor}15` }, // 15 = ~8% opacity
                  ]}
                >
                  <Icon
                    name={section.icon}
                    size="lg"
                    color={
                      isEnabled
                        ? section.iconColor
                        : Colors[colorScheme ?? "light"].textSecondary
                    }
                  />
                </View>
                <View style={styles.optionTextContainer}>
                  <ThemedText style={styles.optionTitle}>
                    {section.title}
                  </ThemedText>
                  <ThemedText style={styles.optionDescription}>
                    {section.description}
                  </ThemedText>
                </View>
                {isEnabled && (
                  <Icon name="chevron" size="md" color="secondary" />
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingTop: 25,
    paddingBottom: 50,
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
    gap: 15,
  },
  optionCard: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
