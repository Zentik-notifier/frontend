import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import React, { useEffect, useState } from "react";
import {
  Alert,
  Image,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GetMeDocument,
  useDeleteAccountMutation,
  useGetMeQuery,
  useGetUserSessionsQuery,
  usePublicAppConfigQuery,
  useUpdateProfileMutation,
} from "../generated/gql-operations-generated";
import { useAppContext } from "../services/app-context";
import IdWithCopyButton from "./IdWithCopyButton";
import NotificationStats from "./NotificationStats";
import OAuthConnections from "./OAuthConnections";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import IconButton from "./ui/IconButton";
import { useNavigationUtils } from "@/utils/navigation";

interface UserSectionProps {
  refreshing?: boolean;
}

export default function UserSection({
  refreshing: externalRefreshing,
}: UserSectionProps) {
  const {
    logout,
    setMainLoading,
    refreshUserData,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState("");
  const { navigateToChangePassword } =
    useNavigationUtils();

  const [updateProfileMutation, { loading: savingProfile }] =
    useUpdateProfileMutation({
      refetchQueries: [GetMeDocument],
      onCompleted: async () => {
        setEditing(false);
        // Refresh auth context to update avatar in UserDropdown
        await refreshUserData();
        Alert.alert(t("common.success"), t("userProfile.profileUpdateSuccess"));
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
  useEffect(() => setMainLoading(loading), [loading]);

  const user = userData?.me;

  const { data: sessionsData } = useGetUserSessionsQuery();

  const currentSession = sessionsData?.getUserSessions?.find(
    (session) => session.isCurrent
  );
  const provider = currentSession?.loginProvider
    ? providersData?.publicAppConfig.oauthProviders.find(
        (el) => el.providerId === currentSession.loginProvider
      )
    : undefined;

  useEffect(() => {
    if (externalRefreshing) {
      refetch();
    }
  }, [externalRefreshing, refetch]);

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

  const handleCancel = () => {
    if (user) {
      setFirstName(user.firstName || "");
      setLastName(user.lastName || "");
      setAvatar(user.avatar || "");
    }
    setEditing(false);
  };

  const handleChangePassword = () => {
    navigateToChangePassword();
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

  if (error && !user) {
    return (
      <View style={styles.section}>
        <ThemedText style={styles.loadingText}>
          {t("userProfile.errorLoadingData")}: {error.message}
        </ThemedText>
      </View>
    );
  }

  if (!user) {
    return (
      <View style={styles.section}>
        <ThemedText style={styles.loadingText}>
          {t("userProfile.noDataAvailable")}
        </ThemedText>
      </View>
    );
  }

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>{t("userProfile.title")}</ThemedText>
      </View>

      <ThemedView
        style={[
          styles.profileContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("userProfile.username")}:
          </ThemedText>
          <ThemedText style={styles.value}>
            {user.username || t("userProfile.notAvailable")}
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("userProfile.email")}:
          </ThemedText>
          <ThemedText style={styles.value}>
            {user.email || t("userProfile.notAvailable")}
          </ThemedText>
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("userProfile.firstName")}:
          </ThemedText>
          {editing ? (
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].inputBackground,
                  borderColor: Colors[colorScheme ?? "light"].inputBorder,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t("userProfile.firstNamePlaceholder")}
              placeholderTextColor={
                Colors[colorScheme ?? "light"].inputPlaceholder
              }
            />
          ) : (
            <ThemedText style={styles.value}>
              {user.firstName || t("userProfile.notSet")}
            </ThemedText>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("userProfile.lastName")}:
          </ThemedText>
          {editing ? (
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].inputBackground,
                  borderColor: Colors[colorScheme ?? "light"].inputBorder,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t("userProfile.lastNamePlaceholder")}
              placeholderTextColor={
                Colors[colorScheme ?? "light"].inputPlaceholder
              }
            />
          ) : (
            <ThemedText style={styles.value}>
              {user.lastName || t("userProfile.notSet")}
            </ThemedText>
          )}
        </View>

        <View style={styles.field}>
          <ThemedText style={styles.label}>
            {t("userProfile.avatar")}:
          </ThemedText>
          {editing ? (
            <TextInput
              style={[
                styles.textInput,
                {
                  backgroundColor:
                    Colors[colorScheme ?? "light"].inputBackground,
                  borderColor: Colors[colorScheme ?? "light"].inputBorder,
                  color: Colors[colorScheme ?? "light"].text,
                },
              ]}
              value={avatar}
              onChangeText={setAvatar}
              placeholder={t("userProfile.avatarPlaceholder")}
              placeholderTextColor={
                Colors[colorScheme ?? "light"].inputPlaceholder
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          ) : (
            <View style={styles.avatarPreviewContainer}>
              {user.avatar ? (
                <View style={styles.avatarPreview}>
                  <Image
                    source={{ uri: user.avatar }}
                    style={styles.avatarPreviewImage}
                    onError={() => console.warn("Failed to load avatar image")}
                  />
                  <ThemedText style={styles.avatarUrl} numberOfLines={1}>
                    {user.avatar}
                  </ThemedText>
                </View>
              ) : (
                <ThemedText style={styles.value}>
                  {t("userProfile.notSet")}
                </ThemedText>
              )}
            </View>
          )}
        </View>

        {/* Show current session provider */}
        {currentSession?.loginProvider && (
          <View style={styles.field}>
            <ThemedText style={styles.label}>
              {t("userProfile.currentSessionProvider")}:
            </ThemedText>
            <View style={styles.providerInfo}>
              {provider && (
                <Image
                  source={{ uri: provider?.iconUrl! }}
                  style={[styles.providerIconImage]}
                />
              )}
              <ThemedText style={styles.value}>
                {provider ? provider.name : t("userProfile.localUser")}
              </ThemedText>
            </View>
          </View>
        )}

        {/* Profile Action Buttons */}
        <View style={styles.profileActionButtons}>
          {editing ? (
            <View style={styles.editButtonsRow}>
              <TouchableOpacity
                style={[styles.button, styles.cancelButton]}
                onPress={handleCancel}
              >
                <Text style={styles.buttonText}>{t("common.cancel")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.saveButton,
                  (savingProfile || isOfflineAuth || isBackendUnreachable) &&
                    styles.buttonDisabled,
                ]}
                onPress={handleSave}
                disabled={
                  savingProfile || isOfflineAuth || isBackendUnreachable
                }
              >
                <Text style={styles.buttonText}>
                  {savingProfile
                    ? t("userProfile.saving")
                    : t("userProfile.save")}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <IconButton
              title={t("userProfile.editProfile")}
              iconName="edit"
              onPress={() => setEditing(true)}
              variant="secondary"
              size="md"
              disabled={isOfflineAuth || isBackendUnreachable}
            />
          )}
        </View>
      </ThemedView>

      {/* OAuth Connections Section */}
      <OAuthConnections identities={user.identities} />

      {/* Notification Statistics Section */}
      <NotificationStats refreshing={externalRefreshing} />

      {/* User ID Section */}
      <ThemedView
        style={[
          styles.userIdContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].backgroundCard },
        ]}
      >
        <IdWithCopyButton
          id={user.id}
          label={t("userProfile.userId")}
          copyMessage={t("userProfile.userIdCopied")}
        />
      </ThemedView>

      <View style={styles.buttonContainer}>
        <IconButton
          title={
            user.hasPassword
              ? t("userProfile.changePassword")
              : t("setPassword.title")
          }
          iconName="password"
          onPress={handleChangePassword}
          variant="secondary"
          size="md"
          disabled={isOfflineAuth || isBackendUnreachable}
        />

        <IconButton
          title={
            deletingAccount
              ? t("userProfile.deletingAccount")
              : t("userProfile.deleteAccount")
          }
          iconName="delete"
          onPress={handleDeleteAccount}
          variant="danger"
          size="md"
          disabled={deletingAccount || isOfflineAuth || isBackendUnreachable}
        />

        <IconButton
          title={t("userProfile.logout")}
          iconName="logout"
          onPress={logout}
          variant="danger"
          size="md"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginBottom: 30,
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    marginBottom: 20,
  },
  loadingText: {
    textAlign: "center",
    fontSize: 16,
    marginTop: 20,
    opacity: 0.7,
  },
  profileContainer: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  field: {
    marginBottom: 15,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    opacity: 0.7,
    marginBottom: 5,
  },
  value: {
    fontSize: 16,
  },
  idValue: {
    fontSize: 12,
    opacity: 0.7,
    fontFamily: "monospace",
    flex: 1,
  },
  textInput: {
    fontSize: 16,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
  },
  buttonContainer: {
    gap: 10,
  },
  button: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButton: {
    backgroundColor: "#28a745",
    flex: 1,
  },
  cancelButton: {
    backgroundColor: "#6c757d",
    flex: 1,
  },
  buttonDisabled: {
    backgroundColor: "#ccc",
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  editButtonsRow: {
    flexDirection: "row",
    gap: 10,
  },
  providerInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  avatarPreviewContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarPreview: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarPreviewImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  avatarUrl: {
    fontSize: 14,
    opacity: 0.7,
    flex: 1,
  },
  providerIconImage: {
    width: 24,
    height: 24,
    borderRadius: 2,
  },
  profileActionButtons: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(0,0,0,0.1)",
  },
  userIdContainer: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 20,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
