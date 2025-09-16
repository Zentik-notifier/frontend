import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/ui";
import NotificationStats from "@/components/NotificationStats";
import { Colors } from "@/constants/Colors";
import {
  UpdateUserRoleInput,
  UserFragment,
  UserRole,
  useUpdateUserRoleMutation,
  useUserNotificationStatsByUserIdQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { router, useLocalSearchParams, Stack } from "expo-router";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import IconButton from "@/components/ui/IconButton";

export default function UserDetailsScreen() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);
  const { userId } = useLocalSearchParams<{ userId: string }>();

  const [updateUserRole] = useUpdateUserRoleMutation({
    onCompleted: () => {
      Alert.alert(
        t("common.success"),
        t("administration.userRoleUpdatedSuccessfully")
      );
    },
    onError: (error) => {
      Alert.alert(
        t("administration.error"),
        error.message || t("administration.failedToUpdateUserRole")
      );
    },
  });

  const { data: statsData, loading: statsLoading, refetch: refetchStats } = useUserNotificationStatsByUserIdQuery({
    variables: { userId: userId! },
    skip: !userId,
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetchStats();
    } finally {
      setRefreshing(false);
    }
  };

  const handleRoleChange = (newRole: UserRole) => {
    if (!userId) return;

    Alert.alert(
      t("administration.confirmRoleChange"),
      t("administration.confirmRoleChangeMessage", {
        user: "User", // We'll get this from props or query
        currentRole: getUserRoleDisplayName(UserRole.User), // We'll get this from props
        newRole: getUserRoleDisplayName(newRole),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("administration.confirm"),
          style: "destructive",
          onPress: () => {
            const input: UpdateUserRoleInput = {
              userId,
              role: newRole,
            };
            updateUserRole({ variables: { input } });
          },
        },
      ]
    );
  };

  const getUserRoleDisplayName = (role: UserRole): string => {
    switch (role) {
      case UserRole.User:
        return t("administration.roles.user");
      case UserRole.Moderator:
        return t("administration.roles.moderator");
      case UserRole.Admin:
        return t("administration.roles.admin");
      default:
        return role;
    }
  };

  const getRoleColor = (role: UserRole): string => {
    switch (role) {
      case UserRole.Admin:
        return "#DC2626"; // Red
      case UserRole.Moderator:
        return "#F59E0B"; // Amber/Orange
      case UserRole.User:
        return "#10B981"; // Green
      default:
        return "#6B7280"; // Gray
    }
  };

  if (!userId) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          {t("administration.userNotFound")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: t("administration.userDetails"),
        }}
      />
      <ThemedView style={styles.container}>
        <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[Colors[colorScheme ?? 'light'].tint]}
            tintColor={Colors[colorScheme ?? 'light'].tint}
          />
        }
      >
        {/* User Info Section */}
        <ThemedView style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].backgroundCard }]}>
          <ThemedText style={styles.sectionTitle}>{t("administration.userDetails")}</ThemedText>
          
          <View style={styles.userInfo}>
            <ThemedText style={styles.userIdLabel}>{t("administration.userId")}</ThemedText>
            <ThemedText style={styles.userId}>{userId}</ThemedText>
          </View>

          {/* Role Management */}
          <View style={styles.roleSection}>
            <ThemedText style={styles.roleLabel}>{t("administration.currentRole", { role: "" }).replace(": ", "")}</ThemedText>
            <View style={styles.roleButtons}>
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: getRoleColor(UserRole.User) }
                ]}
                onPress={() => handleRoleChange(UserRole.User)}
              >
                <ThemedText style={styles.roleButtonText}>
                  {getUserRoleDisplayName(UserRole.User)}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: getRoleColor(UserRole.Moderator) }
                ]}
                onPress={() => handleRoleChange(UserRole.Moderator)}
              >
                <ThemedText style={styles.roleButtonText}>
                  {getUserRoleDisplayName(UserRole.Moderator)}
                </ThemedText>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.roleButton,
                  { backgroundColor: getRoleColor(UserRole.Admin) }
                ]}
                onPress={() => handleRoleChange(UserRole.Admin)}
              >
                <ThemedText style={styles.roleButtonText}>
                  {getUserRoleDisplayName(UserRole.Admin)}
                </ThemedText>
              </TouchableOpacity>
            </View>
          </View>
        </ThemedView>

        {/* Notification Statistics Section */}
        <ThemedView style={[styles.section, { backgroundColor: Colors[colorScheme ?? 'light'].backgroundCard }]}>
          <ThemedText style={styles.sectionTitle}>{t("administration.userNotificationStats")}</ThemedText>
          
          {statsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={Colors[colorScheme ?? 'light'].tint}
              />
              <ThemedText style={styles.loadingText}>
                {t("administration.loadingStats")}
              </ThemedText>
            </View>
          ) : statsData?.userNotificationStats ? (
            <View style={styles.statsGrid}>
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.today}
                </ThemedText>
                <ThemedText style={styles.statLabel}>{t("userProfile.today")}</ThemedText>
              </View>
              
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.thisWeek}
                </ThemedText>
                <ThemedText style={styles.statLabel}>{t("userProfile.thisWeek")}</ThemedText>
              </View>
              
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.thisMonth}
                </ThemedText>
                <ThemedText style={styles.statLabel}>{t("userProfile.thisMonth")}</ThemedText>
              </View>
              
              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.total}
                </ThemedText>
                <ThemedText style={styles.statLabel}>{t("userProfile.total")}</ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText style={styles.noDataText}>
              {t("administration.noStatsAvailable")}
            </ThemedText>
          )}
        </ThemedView>

        {/* Back Button */}
        <View style={styles.buttonContainer}>
          <IconButton
            title={t("common.back")}
            iconName="arrow-left"
            onPress={() => router.back()}
            variant="secondary"
            size="md"
          />
        </View>
        </ScrollView>
      </ThemedView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  userInfo: {
    marginBottom: 16,
  },
  userIdLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  userId: {
    fontSize: 16,
    fontWeight: '500',
    fontFamily: 'monospace',
  },
  roleSection: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  roleButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  roleButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  roleButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },
  loadingContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.05)',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
  noDataText: {
    textAlign: 'center',
    opacity: 0.7,
    paddingVertical: 20,
  },
  errorText: {
    textAlign: 'center',
    color: '#ff6b6b',
    padding: 20,
  },
  buttonContainer: {
    marginTop: 16,
  },
});
