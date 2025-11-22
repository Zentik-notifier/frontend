import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState } from "react";
import { Alert, Image, StyleSheet, View } from "react-native";
import {
  Button,
  Divider,
  List,
  Text,
  TextInput,
  useTheme,
} from "react-native-paper";
import { useAppContext } from "../contexts/AppContext";
import {
  GetMeDocument,
  SessionInfoDto,
  useDeleteAccountMutation,
  useGetMeQuery,
  useGetUserSessionsQuery,
  usePublicAppConfigQuery,
  useRevokeAllOtherSessionsMutation,
  useRevokeSessionMutation,
  useUpdateProfileMutation,
} from "../generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import AdminSubscriptions from "./AdminSubscriptions";
import OAuthConnections from "./OAuthConnections";
import DetailSectionCard from "./ui/DetailSectionCard";
import PaperScrollView from "./ui/PaperScrollView";
import OAuthProviderIcon from "./OAuthProviderIcon";
import SwipeableItem from "./SwipeableItem";
import {
  Dialog,
  Icon,
  Portal,
} from "react-native-paper";

export default function UserProfile() {
  const { logout, refreshUserData } = useAppContext();
  const theme = useTheme();
  const { t } = useI18n();
  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [avatar, setAvatar] = useState("");
  const { navigateToChangePassword } = useNavigationUtils();

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
  const { formatDate: formatDateService } = useDateFormat();
  const {
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const user = userData?.me;

  const { data: sessionsData, loading: sessionsLoading, refetch: refetchSessions } = useGetUserSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeAllOtherSessions] = useRevokeAllOtherSessionsMutation();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const sessions = sessionsData?.getUserSessions || [];
  const sortedSessions = useEntitySorting(sessions, "desc");

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
    await Promise.all([refetch(), refetchSessions()]);
  };

  const deleteSession = async (sessionId: string) => {
    try {
      await revokeSession({
        variables: { sessionId },
      });
      refetchSessions();
    } catch (error) {
      console.error("Error deleting session:", error);
      setErrorMessage(t("userSessions.deleteError") as string);
      setShowErrorDialog(true);
    }
  };

  const revokeAllOtherSessionsHandler = async () => {
    try {
      await revokeAllOtherSessions();
      refetchSessions();
    } catch (error) {
      console.error("Error revoking all other sessions:", error);
      setErrorMessage(t("userSessions.deleteError") as string);
      setShowErrorDialog(true);
    }
  };

  const formatSessionDate = (dateString: string) => {
    return formatDateService(dateString);
  };

  const getDeviceIcon = (
    deviceName?: string | null,
    operatingSystem?: string | null
  ): string => {
    if (!deviceName && !operatingSystem) return "cellphone";

    const device = (deviceName || "").toLowerCase();
    const os = (operatingSystem || "").toLowerCase();

    if (
      os.includes("ios") ||
      device.includes("iphone") ||
      device.includes("ipad")
    ) {
      return "cellphone";
    }
    if (os.includes("android")) {
      return "cellphone";
    }
    if (os.includes("mac") || os.includes("darwin")) {
      return "laptop";
    }
    if (os.includes("windows")) {
      return "monitor";
    }
    if (os.includes("linux")) {
      return "console";
    }

    return "web";
  };

  const getLocationDisplay = (session: SessionInfoDto): string | null => {
    if (session.location) {
      return session.location;
    }

    if (session.ipAddress) {
      if (session.ipAddress === "127.0.0.1" || session.ipAddress === "::1") {
        return "Local Device";
      }
      return session.ipAddress;
    }

    return null;
  };

  const getDeviceDescription = (session: SessionInfoDto): string => {
    const parts = [];

    if (session.deviceName) {
      parts.push(session.deviceName);
    }

    if (session.operatingSystem) {
      parts.push(session.operatingSystem);
    }

    if (session.browser) {
      parts.push(session.browser);
    }

    return parts.length > 0
      ? parts.join(" • ")
      : t("userSessions.item.unknownDevice");
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

        {/* Active Sessions Section */}
        <DetailSectionCard
          title={t("userSessions.title")}
          description={t("userSessions.description")}
          actionButtons={
            sortedSessions.length > 1
              ? [
                  {
                    icon: "logout",
                    onPress: () => setShowConfirmDialog(true),
                    disabled: isOfflineAuth || isBackendUnreachable,
                  },
                ]
              : undefined
          }
          loading={sessionsLoading}
          emptyState={{
            icon: "web",
            text: t("userSessions.noSessionsTitle") as string,
          }}
          items={sortedSessions}
          renderItem={(session) => {
            const isExpired = session.expiresAt && new Date(session.expiresAt) < new Date();
            return (
              <SwipeableItem
                key={session.id}
                rightAction={
                  !(isOfflineAuth || isBackendUnreachable) && !session.isCurrent
                    ? {
                        icon: "logout",
                        label: t("userSessions.item.revoke") as string,
                        backgroundColor: "#ff6b6b",
                        onPress: () => deleteSession(session.id),
                        showAlert: {
                          title: t("userSessions.item.revokeSessionTitle") as string,
                          message: t("userSessions.item.revokeSessionMessage") as string,
                          confirmText: t("userSessions.item.revokeSessionConfirm") as string,
                          cancelText: t("common.cancel") as string,
                        },
                      }
                    : undefined
                }
              >
                <View
                  style={[
                    styles.sessionItem,
                    isExpired && styles.expiredSession,
                    session.isCurrent && styles.currentSession,
                  ]}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.deviceInfo}>
                      <Icon
                        source={getDeviceIcon(session.deviceName, session.operatingSystem)}
                        size={20}
                        color={theme.colors.onSurface}
                      />
                      <View style={styles.deviceTextInfo}>
                        <Text variant="titleMedium" style={styles.deviceName}>
                          {getDeviceDescription(session)}
                        </Text>
                        {getLocationDisplay(session) && (
                          <Text variant="bodySmall" style={styles.locationText}>
                            📍 {getLocationDisplay(session)}
                          </Text>
                        )}
                      </View>
                    </View>

                    <View style={styles.headerRight}>
                      {session.loginProvider && (
                        <View style={styles.providerInfo}>
                          <OAuthProviderIcon
                            providerType={session.loginProvider}
                            size={40}
                            iconSize={30}
                          />
                        </View>
                      )}

                      <View style={styles.badges}>
                        {session.isCurrent && (
                          <View style={[styles.badge, styles.currentBadge]}>
                            <Text variant="bodySmall" style={styles.currentText}>
                              {t("userSessions.item.current") as string}
                            </Text>
                          </View>
                        )}
                        {isExpired && (
                          <View style={[styles.badge, styles.expiredBadge]}>
                            <Text variant="bodySmall" style={styles.expiredText}>
                              {t("userSessions.item.expired") as string}
                            </Text>
                          </View>
                        )}
                      </View>
                    </View>
                  </View>

                  <View style={styles.sessionDetails}>
                    {session.ipAddress && (
                      <Text variant="bodySmall" style={styles.sessionDetail}>
                        {t("userSessions.item.ipAddress") as string}: {session.ipAddress}
                      </Text>
                    )}

                    <Text variant="bodySmall" style={styles.sessionDetail}>
                      {t("userSessions.item.created") as string}:{" "}
                      {formatSessionDate(session.createdAt)}
                    </Text>

                    {session.lastActivity && (
                      <Text variant="bodySmall" style={styles.sessionDetail}>
                        {t("userSessions.item.lastActivity") as string}:{" "}
                        {formatSessionDate(session.lastActivity)}
                      </Text>
                    )}

                    {session.expiresAt && (
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.sessionDetail,
                          isExpired && styles.expiredDetail,
                        ]}
                      >
                        {t("userSessions.item.expires") as string}:{" "}
                        {formatSessionDate(session.expiresAt)}
                      </Text>
                    )}
                  </View>
                </View>
              </SwipeableItem>
            );
          }}
          maxHeight={500}
        />

        {/* OAuth Connections Section */}
        <View style={styles.section}>
          <OAuthConnections />
        </View>

        {/* User System Access Token Requests */}
        {/* <View style={styles.section}>
          <UserSystemAccessTokenRequests />
        </View> */}

        {/* Admin Subscriptions Section - Only for admins */}
        <View style={styles.section}>
          {user.role === "ADMIN" && <AdminSubscriptions />}
        </View>

        {/* Delete Account Section */}
        <DetailSectionCard
          title={t("userProfile.deleteAccount")}
          description={t("userProfile.deleteAccountWarning")}
          items={[{ key: "delete" }]}
          renderItem={() => (
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
          )}
        />
      </View>

      {/* Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showConfirmDialog}
          onDismiss={() => setShowConfirmDialog(false)}
        >
          <Dialog.Title>
            {t("userSessions.revokeAllOthersTitle") as string}
          </Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              {t("userSessions.revokeAllOthersMessage") as string}
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowConfirmDialog(false)}>
              {t("common.cancel") as string}
            </Text>
            <Text
              onPress={() => {
                setShowConfirmDialog(false);
                revokeAllOtherSessionsHandler();
              }}
              style={{ color: theme.colors.error }}
            >
              {t("userSessions.revokeAllOthersConfirm") as string}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>

      {/* Error Dialog */}
      <Portal>
        <Dialog
          visible={showErrorDialog}
          onDismiss={() => setShowErrorDialog(false)}
        >
          <Dialog.Title>{t("common.error")}</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">{errorMessage}</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Text onPress={() => setShowErrorDialog(false)}>
              {t("common.ok")}
            </Text>
          </Dialog.Actions>
        </Dialog>
      </Portal>
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
  sessionItem: {
    padding: 16,
  },
  currentSession: {
    borderWidth: 2,
    borderColor: "#34d399",
  },
  expiredSession: {
    opacity: 0.6,
    borderColor: "#ff6b6b",
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  deviceInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  deviceTextInfo: {
    flex: 1,
    marginLeft: 8,
  },
  deviceName: {
    // Styles handled by Text variant
  },
  locationText: {
    marginTop: 2,
  },
  badges: {
    flexDirection: "row",
    gap: 8,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  currentBadge: {
    backgroundColor: "#34d399",
  },
  expiredBadge: {
    backgroundColor: "#ff6b6b",
  },
  currentText: {
    color: "white",
    fontWeight: "600",
  },
  expiredText: {
    color: "white",
    fontWeight: "600",
  },
  sessionDetails: {
    gap: 4,
  },
  sessionDetail: {
    opacity: 0.7,
  },
  expiredDetail: {
    color: "#ff6b6b",
    opacity: 1,
  },
  providerInfo: {
    alignItems: "center",
    justifyContent: "center",
  },
});
