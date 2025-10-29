import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  IconButton,
  List,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAppContext } from "../contexts/AppContext";
import {
  GetMeDocument,
  useDeleteAccountMutation,
  useGetMeQuery,
  useGetUserSessionsQuery,
  usePublicAppConfigQuery,
  useUpdateProfileMutation,
  useUserNotificationStatsQuery,
} from "../generated/gql-operations-generated";
import AdminSubscriptions from "./AdminSubscriptions";
import IdWithCopyButton from "./IdWithCopyButton";
import NotificationStats from "./NotificationStats";
import OAuthConnections from "./OAuthConnections";
import PaperScrollView from "./ui/PaperScrollView";
import DetailSectionCard from "./ui/DetailSectionCard";
// import UserSystemAccessTokenRequests from "./UserSystemAccessTokenRequests";

export default function UserSection() {
  const { logout, refreshUserData } = useAppContext();
  const theme = useTheme();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState("");
  const { navigateToChangePassword } = useNavigationUtils();

  const [refreshing, setRefreshing] = useState(false);

  const [updateProfileMutation, { loading: savingProfile }] =
    useUpdateProfileMutation({
      refetchQueries: [GetMeDocument],
      onCompleted: async () => {
        setEditing(false);
        await refreshUserData();
      },
      onError: (error) => {
        console.error("Profile update error:", error);
        Alert.alert(
          t("common.error"),
          error.message || t("userProfile.profileUpdateError")
        );
      },
    });

  const [deleteAccountMutation, { loading: deletingAccount }] =
    useDeleteAccountMutation({
      onCompleted: () => {
        Alert.alert(
          t("userProfile.accountDeletedTitle"),
          t("userProfile.accountDeletedMessage"),
          [{ text: t("common.ok"), onPress: () => logout() }]
        );
      },
      onError: (error) => {
        console.error("Account deletion error:", error);
        Alert.alert(
          t("common.error"),
          error.message || t("userProfile.profileUpdateError")
        );
      },
    });

  const { data: userData, loading, error, refetch } = useGetMeQuery();
  const { data: providersData } = usePublicAppConfigQuery();

  const user = userData?.me;

  const { data: sessionsData } = useGetUserSessionsQuery();

  const { data: statsData, refetch: refetchStats } =
    useUserNotificationStatsQuery();

  const currentSession = sessionsData?.getUserSessions?.find(
    (session) => session.isCurrent
  );
  const providerIdLc = currentSession?.loginProvider
    ? String(currentSession.loginProvider).toLowerCase()
    : undefined;
  const provider = providerIdLc
    ? providersData?.publicAppConfig.oauthProviders.find(
        (el) => el.providerId.toLowerCase() === providerIdLc
      )
    : undefined;

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setAvatar(user.avatar || "");
    }
  }, [user?.firstName, user?.lastName, user?.avatar]);

  const handleSave = async () => {
    if (savingProfile) return;

    console.log("🔄 Saving profile:", { firstName, lastName, avatar });
    try {
      await updateProfileMutation({
        variables: {
          input: {
            firstName,
            lastName,
            avatar: avatar || null,
          },
        },
      });
    } catch (error) {
      console.error("Failed to save profile:", error);
    }
  };

  const handleDeleteAccount = () => {
    // First confirmation
    Alert.alert(
      t("userProfile.deleteAccountTitle"),
      t("userProfile.deleteAccountMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("userProfile.continue"),
          style: "destructive",
          onPress: () => showFinalConfirmation(),
        },
      ]
    );
  };

  const showFinalConfirmation = () => {
    Alert.alert(
      t("userProfile.deleteAccountFinalTitle"),
      t("userProfile.deleteAccountFinalMessage"),
      [
        {
          text: t("common.cancel"),
          style: "cancel",
        },
        {
          text: t("userProfile.deleteAccountConfirm"),
          style: "destructive",
          onPress: async () => {
            if (deletingAccount) return;

            try {
              await deleteAccountMutation();
            } catch (error) {
              console.error("Failed to delete account:", error);
            }
          },
        },
      ]
    );
  };

  const handleRefresh = async () => {
    await Promise.all([refetch(), refetchStats()]);
  };

  if (!user) {
    return (
      <View
        style={[styles.section, { backgroundColor: theme.colors.background }]}
      >
        <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
          {t("userProfile.noDataAvailable")}
        </Text>
      </View>
    );
  }

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!loading && !!error}
    >
      <View style={styles.section}>
        {/* Profile Section with Avatar and Form */}
        <DetailSectionCard
          title={t("userProfile.editProfile")}
          actionButton={{
            icon: "pencil",
            onPress: () => setEditing(!editing),
          }}
          items={[{ key: "profile" }]}
          renderItem={() => (
            <View>
              {editing ? (
                <List.Item
                  title={t("userProfile.avatar")}
                  description={
                    <TextInput
                      mode="outlined"
                      value={avatar}
                      onChangeText={setAvatar}
                      placeholder={t("userProfile.avatarPlaceholder")}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="url"
                      style={styles.inlineInput}
                      multiline
                    />
                  }
                  left={(props) => (
                    <View style={styles.avatarIconContainer}>
                      {user.avatar ? (
                        <Image
                          source={{ uri: user.avatar }}
                          style={styles.avatarIcon}
                          onError={() =>
                            console.warn("Failed to load avatar image")
                          }
                        />
                      ) : (
                        <List.Icon {...props} icon="account-circle" />
                      )}
                    </View>
                  )}
                />
              ) : (
                <View style={styles.avatarSection}>
                  <Text
                    variant="bodyMedium"
                    style={{ color: theme.colors.onSurface, marginBottom: 8 }}
                  >
                    {t("userProfile.avatar")}
                  </Text>

                  <View style={styles.avatarPreviewContainer}>
                    {user.avatar ? (
                      <View style={styles.avatarPreview}>
                        <Image
                          source={{ uri: user.avatar }}
                          style={styles.avatarPreviewImage}
                          onError={() =>
                            console.warn("Failed to load avatar image")
                          }
                        />
                        <Text
                          style={[
                            styles.avatarUrl,
                            { color: theme.colors.onSurfaceVariant },
                          ]}
                          numberOfLines={1}
                        >
                          {user.avatar}
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={[
                          styles.value,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {t("userProfile.notSet")}
                      </Text>
                    )}
                  </View>
                </View>
              )}

              <View style={styles.profileInfo}>
                <List.Item
                  title={t("userProfile.username")}
                  description={user.username || t("userProfile.notAvailable")}
                  left={(props) => <List.Icon {...props} icon="account" />}
                />
                <Divider />

                <List.Item
                  title={t("userProfile.email")}
                  description={user.email || t("userProfile.notAvailable")}
                  left={(props) => <List.Icon {...props} icon="email" />}
                />
                <Divider />

                <List.Item
                  title={t("userProfile.firstName")}
                  description={
                    editing ? (
                      <TextInput
                        mode="outlined"
                        value={firstName}
                        onChangeText={setFirstName}
                        placeholder={t("userProfile.firstNamePlaceholder")}
                        style={styles.inlineInput}
                      />
                    ) : (
                      user.firstName || t("userProfile.notAvailable")
                    )
                  }
                  left={(props) => (
                    <List.Icon {...props} icon="account-details" />
                  )}
                />
                <Divider />

                <List.Item
                  title={t("userProfile.lastName")}
                  description={
                    editing ? (
                      <TextInput
                        mode="outlined"
                        value={lastName}
                        onChangeText={setLastName}
                        placeholder={t("userProfile.lastNamePlaceholder")}
                        style={styles.inlineInput}
                      />
                    ) : (
                      user.lastName || t("userProfile.notAvailable")
                    )
                  }
                  left={(props) => (
                    <List.Icon {...props} icon="account-details" />
                  )}
                />
              </View>

              {editing && (
                <View style={styles.editActions}>
                  <Button
                    mode="outlined"
                    onPress={() => setEditing(false)}
                    style={styles.editButton}
                  >
                    {t("common.cancel")}
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSave}
                    disabled={savingProfile}
                    loading={savingProfile}
                    style={styles.editButton}
                  >
                    {savingProfile ? t("common.saving") : t("common.save")}
                  </Button>
                </View>
              )}
            </View>
          )}
        />

        {/* Session Provider Info */}
        {/* {currentSession?.loginProvider && (
          <DetailSectionCard
            title={t("userProfile.currentSessionProvider")}
            description={provider ? provider.name : t("userProfile.localUser")}
            items={[{ key: "provider" }]}
            renderItem={() => (
              <View>
                <List.Item
                  title={t("userProfile.currentSessionProvider")}
                  description={
                    provider ? provider.name : t("userProfile.localUser")
                  }
                  left={(props) => (
                    <List.Icon
                      {...props}
                      icon="account-network"
                      color={theme.colors.primary}
                    />
                  )}
                  right={() =>
                    provider && (
                      <Image
                        source={{ uri: provider?.iconUrl! }}
                        style={styles.providerIconImage}
                      />
                    )
                  }
                />
                <Divider style={{ marginVertical: 8 }} />
                <IdWithCopyButton
                  id={user.id}
                  label={t("userProfile.userId")}
                  copyMessage={t("userProfile.userIdCopied")}
                />
              </View>
            )}
          />
        )} */}

        {/* Action Buttons */}
        <View style={styles.section}>
          <DetailSectionCard
            items={[{ key: "actions" }]}
            renderItem={() => (
              <View style={styles.actionButtonsRow}>
                <Button
                  mode="outlined"
                  onPress={navigateToChangePassword}
                  icon="lock"
                  style={styles.halfWidthButton}
                >
                  {t("userProfile.changePassword")}
                </Button>
                <Button
                  mode="outlined"
                  onPress={logout}
                  icon="logout"
                  style={styles.halfWidthButton}
                  buttonColor={theme.colors.errorContainer}
                  textColor={theme.colors.onErrorContainer}
                >
                  {t("userProfile.logout")}
                </Button>
              </View>
            )}
          />
        </View>

        {/* OAuth Connections Section */}
        <View style={styles.section}>
          <OAuthConnections identities={user.identities} />
        </View>

        {/* User System Access Token Requests */}
        {/* <View style={styles.section}>
          <UserSystemAccessTokenRequests />
        </View> */}

        {/* Admin Subscriptions Section - Only for admins */}
        <View style={styles.section}>
          {user.role === "ADMIN" && <AdminSubscriptions />}
        </View>
        {/* Notification Statistics Section */}
        {statsData?.userNotificationStats && (
          <NotificationStats dateStats={statsData.userNotificationStats} />
        )}

        {/* Delete Account Section */}
        <DetailSectionCard
          title={t("userProfile.deleteAccount")}
          description={t("userProfile.deleteAccountWarning")}
          items={[{ key: "delete" }]}
          renderItem={() => (
            <View style={styles.deleteAccountContent}>
              <View style={styles.deleteAccountInfo}>
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onSurface }}
                >
                  {t("userProfile.deleteAccount")}
                </Text>
                <Text
                  variant="bodyMedium"
                  style={{ color: theme.colors.onSurfaceVariant, marginTop: 4 }}
                >
                  {t("userProfile.deleteAccountWarning")}
                </Text>
              </View>
              <Button
                mode="outlined"
                onPress={handleDeleteAccount}
                icon="delete"
                disabled={deletingAccount}
                loading={deletingAccount}
                buttonColor={theme.colors.errorContainer}
                textColor={theme.colors.onErrorContainer}
                style={styles.deleteButton}
              >
                {deletingAccount
                  ? t("userProfile.deletingAccount")
                  : t("userProfile.deleteAccount")}
              </Button>
            </View>
          )}
        />
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
  },
  section: {
    marginBottom: 16,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
    opacity: 0.7,
  },
  profileContainer: {
    marginBottom: 16,
  },
  avatarSection: {
    marginBottom: 20,
  },
  profileInfo: {
    marginBottom: 20,
  },
  inlineInput: {
    marginTop: 8,
    width: "100%",
  },
  avatarIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  providerContainer: {
    marginBottom: 16,
  },
  actionsContainer: {
    marginBottom: 16,
  },
  actionButtonsRow: {
    flexDirection: "row",
    gap: 12,
  },
  halfWidthButton: {
    flex: 1,
  },
  editActions: {
    flexDirection: "row",
    gap: 12,
  },
  editButton: {
    flex: 1,
  },
  deleteAccountContainer: {
    marginBottom: 16,
  },
  deleteAccountContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  deleteAccountInfo: {
    flex: 1,
    marginRight: 16,
  },
  deleteButton: {
    flexShrink: 0,
  },
  fullWidthInput: {
    width: "100%",
  },
  avatarPreviewContainer: {
    alignItems: "center",
  },
  avatarPreview: {
    alignItems: "center",
    gap: 8,
  },
  avatarPreviewImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  avatarUrl: {
    fontSize: 12,
    textAlign: "center",
    maxWidth: 200,
  },
  value: {
    fontSize: 14,
  },
  providerIconImage: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  actionButtons: {
    gap: 12,
  },
  actionButton: {
    marginBottom: 8,
  },
});
