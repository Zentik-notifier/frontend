import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import {
  UpdateUserRoleInput,
  useGetAllUsersQuery,
  useGetMeQuery,
  UserFragment,
  UserRole,
  useUpdateUserRoleMutation,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";

import React, { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

interface UserListItemProps {
  user: UserFragment;
  currentUserId: string;
  onUserRoleUpdate: (userId: string, newRole: UserRole) => void;
  colorScheme: "light" | "dark";
}

const UserListItem: React.FC<UserListItemProps> = ({
  user,
  currentUserId,
  onUserRoleUpdate,
  colorScheme,
}) => {
  const { t } = useI18n();
  const isCurrentUser = user.id === currentUserId;

  const handleRoleToggle = () => {
    if (isCurrentUser) {
      Alert.alert(
        t("administration.cannotModifyOwnRole"),
        t("administration.cannotModifyOwnRoleMessage")
      );
      return;
    }

    // Show role selection menu
    const roleOptions = [
      { title: getUserRoleDisplayName(UserRole.User), value: UserRole.User },
      {
        title: getUserRoleDisplayName(UserRole.Moderator),
        value: UserRole.Moderator,
      },
      { title: getUserRoleDisplayName(UserRole.Admin), value: UserRole.Admin },
    ];

    const currentRoleIndex = roleOptions.findIndex(
      (role) => role.value === user.role
    );
    const otherRoles = roleOptions.filter(
      (_, index) => index !== currentRoleIndex
    );

    const buttons = [
      ...otherRoles.map((role) => ({
        text: role.title,
        onPress: () => confirmRoleChange(user, role.value),
      })),
      { text: t("common.cancel"), style: "cancel" as const },
    ];

    Alert.alert(
      t("administration.changeUserRole"),
      `${t("administration.currentRole", { role: getUserRoleDisplayName(user.role) })}\n${t("administration.selectNewRole", { user: user.username || user.email })}`,
      buttons
    );
  };

  const confirmRoleChange = (user: UserFragment, newRole: UserRole) => {
    Alert.alert(
      t("administration.confirmRoleChange"),
      t("administration.confirmRoleChangeMessage", {
        user: user.username || user.email,
        currentRole: getUserRoleDisplayName(user.role),
        newRole: getUserRoleDisplayName(newRole),
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("administration.confirm"),
          style: "destructive",
          onPress: () => onUserRoleUpdate(user.id, newRole),
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

  return (
    <View
      style={[
        styles.userCard,
        {
          backgroundColor: Colors[colorScheme].backgroundCard,
          borderColor: Colors[colorScheme].border,
        },
      ]}
    >
      <View style={styles.userInfo}>
        <View style={styles.userAvatar}>
          {user.avatar ? (
            <ThemedText style={styles.avatarText}>
              {user.firstName?.charAt(0) || user.email.charAt(0)?.toUpperCase()}
            </ThemedText>
          ) : (
            <Icon name="user" size="md" color="primary" />
          )}
        </View>
        <View style={styles.userDetails}>
          <ThemedText style={styles.userName}>
            {user.firstName && user.lastName
              ? `${user.firstName} ${user.lastName}`
              : user.username || user.email}
            {isCurrentUser && (
              <ThemedText style={styles.currentUserBadge}>
                {" "}
                {t("administration.you")}
              </ThemedText>
            )}
          </ThemedText>
          <ThemedText style={styles.userEmail}>{user.email}</ThemedText>
          <ThemedText style={styles.userDate}>
            {t("administration.joined", {
              date: new Date(user.createdAt).toLocaleDateString(),
            })}
          </ThemedText>
        </View>
      </View>

      <View style={styles.userActions}>
        <View
          style={[
            styles.roleBadge,
            {
              backgroundColor: `${getRoleColor(user.role)}15`,
            },
          ]}
        >
          <ThemedText
            style={[
              styles.roleText,
              {
                color: getRoleColor(user.role),
              },
            ]}
          >
            {getUserRoleDisplayName(user.role)?.toUpperCase()}
          </ThemedText>
        </View>

        <TouchableOpacity
          style={[
            styles.roleButton,
            {
              backgroundColor: Colors[colorScheme].backgroundCard,
              borderColor: Colors[colorScheme].border,
              opacity: isCurrentUser ? 0.5 : 1,
            },
          ]}
          onPress={handleRoleToggle}
          disabled={isCurrentUser}
        >
          <Icon
            name="settings"
            size="sm"
            color={isCurrentUser ? "secondary" : "primary"}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default function UserManagementScreen() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [refreshing, setRefreshing] = useState(false);

  const { data: userData } = useGetMeQuery({
    fetchPolicy: "cache-and-network",
  });
  const currentUser = userData?.me;

  const { data, loading, error, refetch } = useGetAllUsersQuery();
  console.log(data);

  const [updateUserRole] = useUpdateUserRoleMutation({
    onCompleted: () => {},
    onError: (error) => {
      Alert.alert(
        t("administration.error"),
        error.message || t("administration.failedToUpdateUserRole")
      );
    },
  });

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const handleUserRoleUpdate = (userId: string, newRole: UserRole) => {
    const input: UpdateUserRoleInput = {
      userId,
      role: newRole,
    };
    updateUserRole({ variables: { input } });
  };

  const renderUserItem = ({ item }: { item: UserFragment }) => (
    <UserListItem
      user={item}
      currentUserId={currentUser?.id || ""}
      onUserRoleUpdate={handleUserRoleUpdate}
      colorScheme={colorScheme ?? "light"}
    />
  );

  if (loading) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator
            size="large"
            color={Colors[colorScheme ?? "light"].tint}
          />
          <ThemedText style={styles.loadingText}>
            {t("administration.loadingUsers")}
          </ThemedText>
        </View>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="warning" size="xl" color="secondary" />
          <ThemedText style={styles.errorTitle}>
            {t("administration.errorLoadingUsers")}
          </ThemedText>
          <ThemedText style={styles.errorText}>
            {error.message || t("administration.failedToLoadUsers")}
          </ThemedText>
          <TouchableOpacity
            style={[
              styles.retryButton,
              { backgroundColor: Colors[colorScheme ?? "light"].tint },
            ]}
            onPress={() => refetch()}
          >
            <ThemedText style={styles.retryButtonText}>
              {t("administration.retry")}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.titleContainer}>
        <Icon name="user" size="lg" color="#4F46E5" />
        <ThemedText style={styles.title}>
          {t("administration.userManagement")}
        </ThemedText>
      </View>

      <View style={styles.content}>
        <ThemedText style={styles.description}>
          {t("administration.userManagementDescription")}
        </ThemedText>

        {data?.users && (
          <View style={styles.statsContainer}>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {data.users.length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Total</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {data.users.filter((u) => u.role === UserRole.Admin).length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Admins</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {data.users.filter((u) => u.role === UserRole.Moderator).length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Moderators</ThemedText>
            </View>
            <View style={styles.statItem}>
              <ThemedText style={styles.statNumber}>
                {data.users.filter((u) => u.role === UserRole.User).length}
              </ThemedText>
              <ThemedText style={styles.statLabel}>Users</ThemedText>
            </View>
          </View>
        )}

        <FlatList
          data={data?.users || []}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.usersList}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={Colors[colorScheme ?? "light"].tint}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Icon name="user" size="xl" color="secondary" />
              <ThemedText style={styles.emptyTitle}>No Users Found</ThemedText>
              <ThemedText style={styles.emptyText}>
                No users are registered in the system.
              </ThemedText>
            </View>
          }
        />
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    opacity: 0.7,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
    marginBottom: 24,
  },
  retryButton: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  header: {
    padding: 20,
    paddingTop: 60,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.1)",
  },
  backButton: {
    position: "absolute",
    top: 60,
    left: 20,
    zIndex: 1,
    padding: 8,
  },
  backIcon: {
    transform: [{ rotate: "180deg" }],
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginTop: 40,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    lineHeight: 30,
  },
  content: {
    padding: 20,
    flex: 1,
  },
  description: {
    fontSize: 16,
    lineHeight: 22,
    opacity: 0.7,
    marginBottom: 24,
    textAlign: "center",
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: 24,
    paddingVertical: 16,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderRadius: 12,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  usersList: {
    paddingBottom: 20,
  },
  userCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  currentUserBadge: {
    fontSize: 12,
    fontWeight: "400",
    opacity: 0.7,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 2,
  },
  userDate: {
    fontSize: 12,
    opacity: 0.5,
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  roleText: {
    fontSize: 10,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  roleButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 40,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  emptyText: {
    fontSize: 16,
    opacity: 0.7,
    textAlign: "center",
  },
});
