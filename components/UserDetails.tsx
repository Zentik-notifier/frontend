import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import ThemedInputSelect from "@/components/ui/ThemedInputSelect";
import { Colors } from "@/constants/Colors";
import {
  UpdateUserRoleInput,
  UserFragment,
  UserRole,
  useGetUserByIdQuery,
  useUpdateUserRoleMutation,
  useUserNotificationStatsByUserIdQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  View,
} from "react-native";
import SettingsScrollView from "./SettingsScrollView";

interface UserDetailsProps {
  userId: string;
}

export default function UserDetails({ userId }: UserDetailsProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const {
    data: userData,
    loading: userLoading,
    refetch: refetchUser,
  } = useGetUserByIdQuery({
    variables: { id: userId! },
    skip: !userId,
  });
  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useUserNotificationStatsByUserIdQuery({
    variables: { userId: userId! },
    skip: !userId,
  });

  const [updateUserRole] = useUpdateUserRoleMutation({
    onCompleted: () => {
      Alert.alert(
        t("common.success"),
        t("administration.userRoleUpdatedSuccessfully")
      );
      refetchUser(); // Refresh user data after role update
    },
    onError: (error) => {
      Alert.alert(
        t("administration.error"),
        error.message || t("administration.failedToUpdateUserRole")
      );
    },
  });

  const user = userData?.user;

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([refetchUser(), refetchStats()]);
    } finally {
      setRefreshing(false);
    }
  };

  const handleRoleChange = (newRole: string) => {
    if (!userId || !user) return;

    const roleEnum = newRole as UserRole;

    // Se il ruolo è lo stesso, non fare nulla
    if (user.role === roleEnum) return;

    Alert.alert(
      t("administration.confirmRoleChange"),
      t("administration.confirmRoleChangeMessage", {
        user: user.username || user.email || user.id,
        currentRole: getUserRoleDisplayName(user.role),
        newRole: getUserRoleDisplayName(roleEnum),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("administration.confirm"),
          style: "destructive",
          onPress: () => {
            const input: UpdateUserRoleInput = {
              userId,
              role: roleEnum,
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

  const roleOptions = [
    {
      id: UserRole.User,
      name: getUserRoleDisplayName(UserRole.User),
    },
    {
      id: UserRole.Moderator,
      name: getUserRoleDisplayName(UserRole.Moderator),
    },
    {
      id: UserRole.Admin,
      name: getUserRoleDisplayName(UserRole.Admin),
    },
  ];

  if (!userId) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          {t("administration.userNotFound")}
        </ThemedText>
      </ThemedView>
    );
  }

  if (userLoading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors[colorScheme ?? "light"].tint}
          />
          <ThemedText style={styles.loadingText}>
            {t("common.loading")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (!user) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.errorText}>
          {t("administration.userNotFound")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <SettingsScrollView
        showsVerticalScrollIndicator={false}
        onRefresh={onRefresh}
      >
        {/* User Info Section */}
        <ThemedView
          style={[
            styles.section,
            { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
          ]}
        >
          {/* User Details */}
          <View style={styles.userDetails}>
            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>
                {t("administration.userId")}
              </ThemedText>
              <ThemedText style={styles.detailValue}>{user.id}</ThemedText>
            </View>

            {user.username && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>
                  {t("administration.username")}
                </ThemedText>
                <ThemedText style={styles.detailValue}>
                  {user.username}
                </ThemedText>
              </View>
            )}

            {user.email && (
              <View style={styles.detailRow}>
                <ThemedText style={styles.detailLabel}>
                  {t("administration.email")}
                </ThemedText>
                <ThemedText style={styles.detailValue}>{user.email}</ThemedText>
              </View>
            )}

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>
                {t("administration.createdAt")}
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {new Date(user.createdAt).toLocaleDateString()}
              </ThemedText>
            </View>

            <View style={styles.detailRow}>
              <ThemedText style={styles.detailLabel}>
                {t("administration.lastUpdated")}
              </ThemedText>
              <ThemedText style={styles.detailValue}>
                {new Date(user.updatedAt).toLocaleDateString()}
              </ThemedText>
            </View>
          </View>

          {/* Role Management */}
          <View style={styles.roleSection}>
            <ThemedText style={styles.roleLabel}>
              {t("administration.currentRole", { role: "" }).replace(": ", "")}
            </ThemedText>
            <ThemedInputSelect
              selectedValue={user.role}
              placeholder={t("administration.selectNewRole")}
              options={roleOptions}
              optionLabel="name"
              optionValue="id"
              onValueChange={handleRoleChange}
              isSearchable={false}
            />
          </View>
        </ThemedView>

        {/* User Buckets Section */}
        <ThemedView
          style={[
            styles.section,
            { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("administration.userBuckets")}
          </ThemedText>

          {user.buckets && user.buckets.length > 0 ? (
            <View style={styles.bucketsList}>
              {user.buckets.map((bucket) => (
                <View key={bucket.id} style={styles.bucketItem}>
                  <View style={styles.bucketInfo}>
                    <View style={styles.bucketHeader}>
                      {/* {bucket.icon && (
                      <ThemedText style={styles.bucketIcon}>{bucket.icon}</ThemedText>
                    )} */}
                      <ThemedText style={styles.bucketName}>
                        {bucket.name}
                      </ThemedText>
                    </View>
                    <ThemedText style={styles.bucketId}>
                      ID: {bucket.id}
                    </ThemedText>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <ThemedText style={styles.noDataText}>
              {t("administration.noBucketsFound")}
            </ThemedText>
          )}
        </ThemedView>

        {/* Notification Statistics Section */}
        <ThemedView
          style={[
            styles.section,
            { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
          ]}
        >
          <ThemedText style={styles.sectionTitle}>
            {t("administration.userNotificationStats")}
          </ThemedText>

          {statsLoading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator
                size="large"
                color={Colors[colorScheme ?? "light"].tint}
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
                <ThemedText style={styles.statLabel}>
                  {t("userProfile.today")}
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.thisWeek}
                </ThemedText>
                <ThemedText style={styles.statLabel}>
                  {t("userProfile.thisWeek")}
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.thisMonth}
                </ThemedText>
                <ThemedText style={styles.statLabel}>
                  {t("userProfile.thisMonth")}
                </ThemedText>
              </View>

              <View style={styles.statItem}>
                <ThemedText style={styles.statValue}>
                  {statsData.userNotificationStats.total}
                </ThemedText>
                <ThemedText style={styles.statLabel}>
                  {t("userProfile.total")}
                </ThemedText>
              </View>
            </View>
          ) : (
            <ThemedText style={styles.noDataText}>
              {t("administration.noStatsAvailable")}
            </ThemedText>
          )}
        </ThemedView>
      </SettingsScrollView>
    </ThemedView>
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
    shadowColor: "#000",
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
    fontWeight: "600",
    marginBottom: 16,
  },
  userDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  detailLabel: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: "500",
    flex: 2,
    textAlign: "right",
    fontFamily: "monospace",
  },
  roleSection: {
    marginBottom: 16,
  },
  roleLabel: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 8,
  },
  bucketsList: {
    gap: 12,
  },
  bucketItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 12,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  bucketInfo: {
    flex: 1,
  },
  bucketHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  bucketIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  bucketName: {
    fontSize: 16,
    fontWeight: "600",
  },
  bucketDescription: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 4,
  },
  bucketId: {
    fontSize: 12,
    opacity: 0.6,
    fontFamily: "monospace",
  },
  bucketColorIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginLeft: 8,
  },
  loadingContainer: {
    alignItems: "center",
    paddingVertical: 20,
  },
  loadingText: {
    marginTop: 8,
    opacity: 0.7,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  statItem: {
    width: "48%",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: "center",
  },
  noDataText: {
    textAlign: "center",
    opacity: 0.7,
    paddingVertical: 20,
  },
  errorText: {
    textAlign: "center",
    color: "#ff6b6b",
    padding: 20,
  },
});
