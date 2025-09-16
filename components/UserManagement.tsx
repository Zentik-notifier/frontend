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
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { AppLoader } from "./ui/AppLoader";

interface UserManagementProps {
  refreshing?: boolean;
}

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
  const router = useRouter();
  const isCurrentUser = user.id === currentUserId;

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
      case UserRole.User:
        return "#4F46E5";
      case UserRole.Moderator:
        return "#F59E0B";
      case UserRole.Admin:
        return "#EF4444";
      default:
        return "#6B7280";
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.userCard,
        {
          backgroundColor: Colors[colorScheme].backgroundCard,
          borderColor: Colors[colorScheme].border,
        },
      ]}
      onPress={() => router.push(`/(mobile)/private/user-details?userId=${user.id}`)}
    >
      <View style={styles.userInfo}>
        <View style={styles.userDetails}>
          <ThemedText style={styles.userName}>
            {user.username || user.email || user.id}
          </ThemedText>
          <ThemedText style={styles.userEmail}>
            {user.email}
          </ThemedText>
        </View>
        
        <View style={styles.userActions}>
          <View
            style={[
              styles.roleBadge,
              { backgroundColor: getRoleColor(user.role) },
            ]}
          >
            <ThemedText style={styles.roleText}>
              {getUserRoleDisplayName(user.role)?.toUpperCase()}
            </ThemedText>
          </View>

          <TouchableOpacity
            style={[
              styles.viewButton,
              {
                backgroundColor: Colors[colorScheme].backgroundCard,
                borderColor: Colors[colorScheme].border,
              },
            ]}
            onPress={() => router.push(`/(mobile)/private/user-details?userId=${user.id}`)}
          >
            <Ionicons
              name="eye-outline"
              size={20}
              color={Colors[colorScheme].tint}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

export default function UserManagement({
  refreshing: externalRefreshing,
}: UserManagementProps) {
  const colorScheme = useColorScheme();
  const router = useRouter();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
    setLoading,
  } = useAppContext();

  const disabledActions = isOfflineAuth || isBackendUnreachable;

  const { data, loading, error, refetch } = useGetAllUsersQuery();
  const { data: meData } = useGetMeQuery();
  const [updateUserRole] = useUpdateUserRoleMutation();

  useEffect(() => setLoading(loading), [loading]);

  const users = data?.users || [];
  const currentUserId = meData?.me?.id || "";

  useEffect(() => {
    if (externalRefreshing) {
      refetch();
    }
  }, [externalRefreshing, refetch]);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refetch();
    } finally {
      setRefreshing(false);
    }
  };

  const filteredUsers = users.filter((user) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      user.username?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.id.toLowerCase().includes(query)
    );
  });

  const handleUserRoleUpdate = async (userId: string, newRole: UserRole) => {
    try {
      await updateUserRole({
        variables: {
          input: {
            userId,
            role: newRole,
          } as UpdateUserRoleInput,
        },
      });
      Alert.alert(
        t("common.success"),
        t("administration.userRoleUpdatedSuccessfully")
      );
      refetch();
    } catch (error: any) {
      Alert.alert(
        t("administration.error"),
        error.message || t("administration.failedToUpdateUserRole")
      );
    }
  };

  const renderUserItem = ({ item }: { item: UserFragment }) => (
    <UserListItem
      user={item}
      currentUserId={currentUserId}
      onUserRoleUpdate={handleUserRoleUpdate}
      colorScheme={colorScheme ?? "light"}
    />
  );

  if (loading) {
    return <AppLoader />;
  }

  if (error) {
    return (
      <ThemedView style={styles.errorContainer}>
        <Ionicons name="alert-circle" size={64} color={Colors[colorScheme ?? "light"].icon} />
        <ThemedText style={styles.errorTitle}>
          {t("administration.errorLoadingUsers")}
        </ThemedText>
        <ThemedText style={styles.errorText}>
          {error.message || t("administration.failedToLoadUsers")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("administration.userManagement")}
        </ThemedText>
        <View style={styles.statsContainer}>
          <ThemedText style={styles.statsText}>
            {t("administration.totalUsers")}: {users.length}
          </ThemedText>
        </View>
      </View>

      {/* Search Filter */}
      <ThemedView
        style={[
          styles.searchContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].inputBackground },
        ]}
      >
        <Ionicons
          name="search"
          size={18}
          color={Colors[colorScheme ?? "light"].textSecondary}
          style={styles.searchIcon}
        />
        <TextInput
          style={[styles.searchInput, { color: Colors[colorScheme ?? "light"].text }]}
          placeholder={t("administration.searchUsers")}
          placeholderTextColor={Colors[colorScheme ?? "light"].inputPlaceholder}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity
            onPress={() => setSearchQuery("")}
            style={styles.clearButton}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={Colors[colorScheme ?? "light"].textSecondary}
            />
          </TouchableOpacity>
        )}
      </ThemedView>

      {filteredUsers.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons
            name="people-outline"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {searchQuery ? t("administration.noUsersFound") : t("administration.noUsers")}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {searchQuery ? t("administration.tryDifferentSearch") : t("administration.noUsersSubtext")}
          </ThemedText>
        </ThemedView>
      ) : (
        <FlatList
          data={filteredUsers}
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
        />
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
  },
  statsContainer: {
    alignItems: "flex-end",
  },
  statsText: {
    fontSize: 14,
    opacity: 0.7,
  },
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 24,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 44,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 1,
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    paddingVertical: 0,
  },
  clearButton: {
    marginLeft: 8,
    padding: 4,
  },
  usersList: {
    paddingBottom: 20,
  },
  userCard: {
    padding: 16,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 14,
    opacity: 0.7,
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  roleText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  viewButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    fontSize: 14,
    opacity: 0.7,
    marginTop: 8,
    textAlign: "center",
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
  },
});
