import { useAppContext } from "@/contexts/AppContext";
import {
  useGetAllUsersQuery,
  UserFragment,
  UserRole,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import {
  Card,
  Chip,
  Icon,
  Surface,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";

interface UserListItemProps {
  user: UserFragment;
}

const UserListItem: React.FC<UserListItemProps> = ({ user }) => {
  const { t } = useI18n();
  const { navigateToUserDetails } = useNavigationUtils();

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
    const theme = useTheme();
    switch (role) {
      case UserRole.User:
        return theme.colors.primary;
      case UserRole.Moderator:
        return theme.colors.secondary;
      case UserRole.Admin:
        return theme.colors.error;
      default:
        return theme.colors.outline;
    }
  };

  const theme = useTheme();

  return (
    <Card
      style={styles.userCard}
      onPress={() => navigateToUserDetails(user.id)}
      mode="outlined"
    >
      <Card.Content style={styles.userInfo}>
        <View style={styles.userDetails}>
          <Text variant="titleMedium" style={styles.userName}>
            {user.username || user.email || user.id}
          </Text>
          <Text variant="bodyMedium" style={styles.userEmail}>
            {user.email}
          </Text>
        </View>

        <View style={styles.userActions}>
          <Chip
            mode="flat"
            textStyle={{ color: "white", fontWeight: "600" }}
            style={{ backgroundColor: getRoleColor(user.role) }}
          >
            {getUserRoleDisplayName(user.role)?.toUpperCase()}
          </Chip>
        </View>
      </Card.Content>
    </Card>
  );
};

export default function UserManagement() {
  const theme = useTheme();
  const { t } = useI18n();
  const [searchQuery, setSearchQuery] = useState("");

  const { data, loading, error, refetch } = useGetAllUsersQuery();

  const users = data?.users || [];

  const handleRefresh = async () => {
    await refetch();
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

  const renderUserItem = ({ item }: { item: UserFragment }) => (
    <UserListItem user={item} />
  );

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!loading && !!error}
    >
      <View style={styles.headerRow}>
        <Text variant="bodyMedium" style={styles.statsText}>
          {t("administration.totalUsers")}: {users.length}
        </Text>
      </View>

      {/* Search Filter */}
      <TextInput
        mode="outlined"
        style={styles.searchInput}
        placeholder={t("administration.searchUsers")}
        value={searchQuery}
        onChangeText={setSearchQuery}
        left={<TextInput.Icon icon="magnify" />}
        right={
          searchQuery.length > 0 ? (
            <TextInput.Icon
              icon="close-circle"
              onPress={() => setSearchQuery("")}
            />
          ) : null
        }
      />

      {filteredUsers.length === 0 ? (
        <Surface style={styles.emptyState} elevation={0}>
          <Icon
            source="account-group"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="titleLarge" style={styles.emptyText}>
            {searchQuery
              ? t("administration.noUsersFound")
              : t("administration.noUsers")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            {searchQuery
              ? t("administration.tryDifferentSearch")
              : t("administration.noUsersSubtext")}
          </Text>
        </Surface>
      ) : (
        <FlatList
          data={filteredUsers}
          renderItem={renderUserItem}
          keyExtractor={(item) => item.id}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.usersList}
          scrollEnabled={false}
        />
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 40,
  },
  loadingText: {
    marginTop: 16,
    opacity: 0.7,
  },
  statsText: {
    opacity: 0.7,
  },
  searchInput: {
    marginBottom: 16,
  },
  usersList: {
    paddingBottom: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    marginBottom: 8,
  },
  userCard: {
    marginBottom: 8,
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
    marginBottom: 2,
  },
  userEmail: {
    opacity: 0.7,
  },
  userActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
    paddingVertical: 40,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
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
    marginTop: 16,
    marginBottom: 8,
    textAlign: "center",
  },
  errorText: {
    opacity: 0.7,
    textAlign: "center",
  },
});
