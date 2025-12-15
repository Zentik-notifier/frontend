import {
  UpdateUserRoleInput,
  UserRole,
  useGetUserByIdQuery,
  useUpdateUserRoleMutation,
  useUserNotificationStatsByUserIdQuery,
  UserLogType,
  useGetSystemAccessTokensQuery,
  EventType,
  useGetEventsQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React, { useMemo } from "react";
import {
  Alert,
  StyleSheet,
  View,
  TextInput,
  Platform,
  ScrollView,
} from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Divider,
  Surface,
  Text,
  useTheme,
  SegmentedButtons,
} from "react-native-paper";
import OAuthProviderIcon from "./OAuthProviderIcon";
import PaperScrollView from "./ui/PaperScrollView";
import Selector from "./ui/Selector";
import NotificationStats from "./NotificationStats";
import { EventsReviewProvider } from "@/contexts/EventsReviewContext";
import EventsReview from "./EventsReview";
import UserLogs from "./UserLogs";
import { VersionInfo } from "./VersionInfo";

interface UserDetailsProps {
  userId: string;
}

export default function UserDetails({ userId }: UserDetailsProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const [activeTab, setActiveTab] = React.useState("info");

  const showTabLabels = false;

  const {
    data: userData,
    loading: userLoading,
    refetch: refetchUser,
    error: userError,
  } = useGetUserByIdQuery({
    variables: { id: userId! },
    skip: !userId,
    fetchPolicy: "cache-first",
  });
  const {
    data: statsData,
    loading: statsLoading,
    refetch: refetchStats,
  } = useUserNotificationStatsByUserIdQuery({
    variables: { userId: userId! },
    skip: !userId,
    fetchPolicy: "cache-first",
  });

  const {
    data: satData,
    loading: satLoading,
    refetch: refetchSat,
  } = useGetSystemAccessTokensQuery({
    fetchPolicy: "cache-first",
  });

  const userSystemTokens = useMemo(() => {
    const all = satData?.listSystemTokens || [];
    return all.filter((t) => t.requester && t.requester.id === userId);
  }, [satData, userId]);

  // Eventi dei System Access Tokens dell'utente
  const {
    data: satEventsData,
    loading: satEventsLoading,
    refetch: refetchSatEvents,
  } = useGetEventsQuery({
    variables: {
      query: {
        // Nessun filtro lato server su userId/type:
        // recuperiamo gli ultimi eventi e filtriamo lato client
        page: 1,
        limit: 100,
      },
    },
    fetchPolicy: "cache-first",
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

  const handleRefresh = async () => {
    await Promise.all([
      refetchUser(),
      refetchStats(),
      refetchSat(),
      refetchSatEvents(),
    ]);
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.background }]}
    >
      <View style={styles.headerContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            {
              value: "info",
              label: showTabLabels ? t("administration.tabs.info") : undefined,
              icon: "account",
            },
            {
              value: "stats",
              label: showTabLabels ? t("administration.tabs.stats") : undefined,
              icon: "chart-bar",
            },
            {
              value: "logs",
              label: showTabLabels ? t("administration.tabs.logs") : undefined,
              icon: "text-box",
            },
            {
              value: "events",
              label: showTabLabels
                ? t("administration.tabs.events")
                : undefined,
              icon: "history",
            },
            {
              value: "system-token-events",
              label: showTabLabels
                ? (t("administration.tabs.systemTokenEvents" as any) as string)
                : undefined,
              icon: "api",
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {activeTab === "events" ? (
        <EventsReviewProvider key="user-events" fixedUserId={userId}>
          <EventsReview hideFilter />
        </EventsReviewProvider>
      ) : activeTab === "system-token-events" ? (
        <EventsReviewProvider
          key="system-token-events"
          fixedObjectIds={userSystemTokens.map((token) => token.id)}
        >
          <EventsReview hideFilter />
        </EventsReviewProvider>
      ) : activeTab === "logs" ? (
        <UserLogs userId={userId} type={UserLogType.AppLog} />
      ) : (
        <PaperScrollView
          onRefresh={handleRefresh}
          loading={userLoading || statsLoading}
          onRetry={handleRefresh}
          error={!!userError}
        >
          {activeTab === "stats" && (
            <>
              {statsData?.userNotificationStats && (
                <NotificationStats
                  dateStats={statsData.userNotificationStats}
                  showAcked
                  showTitle={false}
                />
              )}

              {/* System Access Tokens stats per questo utente */}
              <Card style={styles.section} mode="outlined">
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("administration.systemTokensStatsTitle")}
                  </Text>

                  {satLoading ? (
                    <View style={styles.loadingContainer}>
                      <ActivityIndicator />
                      <Text style={styles.loadingText}>
                        {t("common.loading")}
                      </Text>
                    </View>
                  ) : userSystemTokens.length === 0 ? (
                    <Text style={styles.noDataText}>
                      {t("administration.systemTokensStatsEmpty")}
                    </Text>
                  ) : (
                    <View style={styles.statsGrid}>
                      {userSystemTokens.map((token) => (
                        <Surface
                          key={token.id}
                          style={styles.statItem}
                          elevation={1}
                        >
                          <Text variant="titleMedium" style={styles.statValue}>
                            {token.calls}/{token.maxCalls || "-"}
                          </Text>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            {t("systemAccessTokens.item.calls")}
                          </Text>

                          <Text variant="bodyMedium" style={styles.statValue}>
                            {token.totalCalls}
                          </Text>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            {t("systemAccessTokens.item.totalCalls")}
                          </Text>

                          <Text
                            variant="bodyMedium"
                            style={[styles.statValue, { color: "#ff6b6b" }]}
                          >
                            {token.failedCalls} / {token.totalFailedCalls}
                          </Text>
                          <Text variant="bodySmall" style={styles.statLabel}>
                            {t("systemAccessTokens.item.failedCalls")}
                          </Text>
                        </Surface>
                      ))}
                    </View>
                  )}
                </Card.Content>
              </Card>
            </>
          )}

          {/* User Info Section */}
          {user && activeTab === "info" && (
            <>
              <Card style={styles.section} mode="outlined">
                <Card.Content>
                  {/* User Details */}
                  <View style={styles.userDetails}>
                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.detailLabel}>
                        {t("administration.userId")}
                      </Text>
                      <Text variant="bodyMedium" style={styles.detailValue}>
                        {user.id}
                      </Text>
                    </View>

                    {user.username && (
                      <>
                        <Divider style={styles.divider} />
                        <View style={styles.detailRow}>
                          <Text variant="bodyMedium" style={styles.detailLabel}>
                            {t("administration.username")}
                          </Text>
                          <Text variant="bodyMedium" style={styles.detailValue}>
                            {user.username}
                          </Text>
                        </View>
                      </>
                    )}

                    {user.email && (
                      <>
                        <Divider style={styles.divider} />
                        <View style={styles.detailRow}>
                          <Text variant="bodyMedium" style={styles.detailLabel}>
                            {t("administration.email")}
                          </Text>
                          <Text variant="bodyMedium" style={styles.detailValue}>
                            {user.email}
                          </Text>
                        </View>
                      </>
                    )}

                    <Divider style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.detailLabel}>
                        {t("administration.createdAt")}
                      </Text>
                      <Text variant="bodyMedium" style={styles.detailValue}>
                        {new Date(user.createdAt).toLocaleDateString()}
                      </Text>
                    </View>

                    <Divider style={styles.divider} />
                    <View style={styles.detailRow}>
                      <Text variant="bodyMedium" style={styles.detailLabel}>
                        {t("administration.lastUpdated")}
                      </Text>
                      <Text variant="bodyMedium" style={styles.detailValue}>
                        {new Date(user.updatedAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>

                  <Divider style={styles.sectionDivider} />

                  {/* Role Management */}
                  <View style={styles.roleSection}>
                    <Text variant="titleMedium" style={styles.roleLabel}>
                      {t("administration.currentRole", { role: "" }).replace(
                        ": ",
                        ""
                      )}
                    </Text>
                    <Selector
                      selectedValue={user.role}
                      placeholder={t("administration.selectNewRole")}
                      options={roleOptions}
                      onValueChange={handleRoleChange}
                      isSearchable={false}
                    />
                  </View>
                </Card.Content>
              </Card>

              {/* User Buckets Section */}
              <Card style={styles.section} mode="outlined">
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("administration.userBuckets")}
                  </Text>

                  {user.buckets && user.buckets.length > 0 ? (
                    <View style={styles.bucketsList}>
                      {user.buckets.map((bucket) => (
                        <Card
                          key={bucket.id}
                          style={styles.bucketItem}
                          mode="outlined"
                        >
                          <Card.Content>
                            <View style={styles.bucketInfo}>
                              <Text
                                variant="titleSmall"
                                style={styles.bucketName}
                              >
                                {bucket.name}
                              </Text>
                              <Text variant="bodySmall" style={styles.bucketId}>
                                ID: {bucket.id}
                              </Text>
                            </View>
                          </Card.Content>
                        </Card>
                      ))}
                    </View>
                  ) : (
                    <Text variant="bodyMedium" style={styles.noDataText}>
                      {t("administration.noBucketsFound")}
                    </Text>
                  )}
                </Card.Content>
              </Card>

              {/* User Identities Section */}
              <Card style={styles.section} mode="outlined">
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("administration.userIdentities")}
                  </Text>

                  {user.identities && user.identities.length > 0 ? (
                    <View style={styles.identitiesList}>
                      {user.identities.map((identity) => {
                        const metadataText = (() => {
                          if (!identity.metadata) return null;
                          try {
                            const parsed = JSON.parse(identity.metadata);
                            return JSON.stringify(parsed, null, 2);
                          } catch {
                            return identity.metadata;
                          }
                        })();

                        return (
                          <Card
                            key={identity.id}
                            style={styles.identityItem}
                            mode="outlined"
                          >
                            <Card.Content>
                              <View style={styles.identityHeader}>
                                <View style={styles.identityProvider}>
                                  {identity.providerType && (
                                    <OAuthProviderIcon
                                      providerType={identity.providerType}
                                      size={32}
                                      iconSize={22}
                                    />
                                  )}
                                </View>
                                <View style={styles.identityMainInfo}>
                                  <Text
                                    variant="titleSmall"
                                    style={styles.identityEmail}
                                  >
                                    {identity.email || "—"}
                                  </Text>
                                  <Text
                                    variant="bodySmall"
                                    style={styles.identityProviderType}
                                  >
                                    {identity.providerType || "LOCAL"}
                                  </Text>
                                </View>
                              </View>

                              <Divider style={styles.divider} />

                              <Text
                                variant="bodySmall"
                                style={styles.identityId}
                                selectable
                              >
                                ID: {identity.id}
                              </Text>
                              <Text
                                variant="bodySmall"
                                style={styles.identityCreatedAt}
                              >
                                {t("administration.createdAt")}:{" "}
                                {new Date(identity.createdAt).toLocaleString()}
                              </Text>

                              {metadataText && (
                                <>
                                  <Divider style={styles.divider} />
                                  <Text
                                    variant="bodySmall"
                                    style={styles.metadataLabel}
                                  >
                                    {t("administration.identityMetadata")}
                                  </Text>
                                  <TextInput
                                    value={metadataText}
                                    multiline
                                    editable={false}
                                    scrollEnabled
                                    style={[
                                      styles.metadataInput,
                                      {
                                        backgroundColor:
                                          theme.colors.surfaceVariant,
                                        color: theme.colors.onSurface,
                                        borderColor: theme.colors.outline,
                                        borderWidth: 1,
                                      },
                                    ]}
                                  />
                                </>
                              )}
                            </Card.Content>
                          </Card>
                        );
                      })}
                    </View>
                  ) : (
                    <Text variant="bodyMedium" style={styles.noDataText}>
                      {t("administration.noIdentitiesFound")}
                    </Text>
                  )}
                </Card.Content>
              </Card>

              {/* User Devices Section */}
              <Card style={styles.section} mode="outlined">
                <Card.Content>
                  <Text variant="titleMedium" style={styles.sectionTitle}>
                    {t("administration.userDevices")}
                  </Text>

                  {user.devices && user.devices.length > 0 ? (
                    <View style={styles.devicesList}>
                      {user.devices.map((device) => (
                        <Card
                          key={device.id}
                          style={styles.deviceItem}
                          mode="outlined"
                        >
                          <Card.Content>
                            <View style={styles.deviceInfo}>
                              <View style={styles.deviceHeader}>
                                <Text
                                  variant="titleSmall"
                                  style={styles.deviceName}
                                >
                                  {device.deviceName || device.platform}
                                </Text>
                                <Chip
                                  mode="flat"
                                  compact
                                  style={[
                                    {
                                      backgroundColor:
                                        device.platform === "IOS"
                                          ? theme.colors.primary
                                          : device.platform === "ANDROID"
                                          ? "#3DDC84"
                                          : device.platform === "WEB"
                                          ? theme.colors.secondary
                                          : theme.colors.outline,
                                    },
                                  ]}
                                  textStyle={styles.chipText}
                                >
                                  {device.platform}
                                </Chip>
                              </View>

                              {device.deviceModel && (
                                <Text
                                  variant="bodySmall"
                                  style={styles.deviceDetail}
                                >
                                  📱 {device.deviceModel}
                                </Text>
                              )}

                              {device.osVersion && (
                                <Text
                                  variant="bodySmall"
                                  style={styles.deviceDetail}
                                >
                                  💿 {device.osVersion}
                                </Text>
                              )}

                              {device.metadata && (
                                <VersionInfo
                                  compact
                                  versions={JSON.parse(device.metadata)}
                                />
                              )}

                              {device.onlyLocal && (
                                <Chip
                                  mode="outlined"
                                  compact
                                  style={styles.localChip}
                                  textStyle={styles.localChipText}
                                >
                                  🏠 {t("administration.localOnly")}
                                </Chip>
                              )}

                              <Text
                                variant="bodySmall"
                                style={styles.deviceDate}
                              >
                                {t("administration.lastUsed")}:{" "}
                                {new Date(device.lastUsed).toLocaleString()}
                              </Text>

                              <Text variant="bodySmall" style={styles.deviceId}>
                                ID: {device.id}
                              </Text>
                            </View>
                          </Card.Content>
                        </Card>
                      ))}
                    </View>
                  ) : (
                    <Text variant="bodyMedium" style={styles.noDataText}>
                      {t("administration.noDevicesFound")}
                    </Text>
                  )}
                </Card.Content>
              </Card>
            </>
          )}

          {/* App Logs Section - Moved outside PaperScrollView */}
        </PaperScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: "transparent",
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    marginBottom: 16,
  },
  userDetails: {
    marginBottom: 20,
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  detailLabel: {
    opacity: 0.7,
    flex: 1,
  },
  detailValue: {
    flex: 2,
    textAlign: "right",
    fontFamily: "monospace",
  },
  divider: {
    marginVertical: 4,
  },
  sectionDivider: {
    marginVertical: 16,
  },
  roleSection: {
    marginBottom: 16,
  },
  roleLabel: {
    marginBottom: 12,
  },
  bucketsList: {
    gap: 12,
  },
  bucketItem: {
    marginBottom: 8,
  },
  bucketInfo: {
    flex: 1,
  },
  bucketName: {
    marginBottom: 4,
  },
  bucketId: {
    opacity: 0.6,
    fontFamily: "monospace",
  },
  devicesList: {
    gap: 12,
  },
  deviceItem: {
    marginBottom: 8,
  },
  deviceInfo: {
    flex: 1,
  },
  deviceHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  deviceName: {
    flex: 1,
    marginRight: 8,
  },
  chipText: {
    fontSize: 10,
    color: "#fff",
    flexShrink: 1,
  },
  deviceDetail: {
    opacity: 0.7,
    marginBottom: 4,
  },
  deviceMetadata: {
    opacity: 0.7,
    marginTop: 4,
    fontSize: 11,
  },
  localChip: {
    alignSelf: "flex-start",
    marginTop: 4,
    marginBottom: 4,
  },
  localChipText: {
    fontSize: 10,
  },
  deviceDate: {
    opacity: 0.6,
    marginTop: 8,
    fontSize: 11,
  },
  deviceId: {
    opacity: 0.5,
    fontFamily: "monospace",
    fontSize: 10,
    marginTop: 4,
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
    gap: 12,
  },
  statItem: {
    width: "48%",
    borderRadius: 12,
    alignItems: "center",
  },
  statValue: {
    marginBottom: 4,
  },
  statLabel: {
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
  identitiesList: {
    gap: 12,
  },
  identityItem: {
    marginBottom: 8,
  },
  identityHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  identityProvider: {
    marginRight: 12,
  },
  identityMainInfo: {
    flex: 1,
  },
  identityEmail: {
    marginBottom: 2,
  },
  identityProviderType: {
    opacity: 0.7,
  },
  identityId: {
    fontFamily: "monospace",
    opacity: 0.8,
    marginBottom: 4,
  },
  identityCreatedAt: {
    opacity: 0.8,
    marginBottom: 4,
  },
  metadataLabel: {
    opacity: 0.8,
    marginBottom: 4,
  },
  metadataInput: {
    fontFamily: "monospace",
    fontSize: 12,
    padding: 8,
    borderRadius: 6,
    minHeight: 80,
    maxHeight: 200,
    textAlignVertical: "top",
  },
  logsScrollView: {
    maxHeight: 600,
  },
  logsList: {
    gap: 12,
  },
  logItem: {
    marginBottom: 8,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  logEvent: {
    fontWeight: "600",
    flex: 1,
  },
  logDate: {
    opacity: 0.7,
    fontSize: 11,
  },
  logMessage: {
    marginBottom: 4,
    opacity: 0.9,
  },
  logContext: {
    marginBottom: 4,
    opacity: 0.7,
    fontSize: 11,
    fontFamily: "monospace",
  },
  logMetaRow: {
    flexDirection: "row",
    marginBottom: 4,
    gap: 8,
  },
  logMetaLabel: {
    opacity: 0.7,
    fontWeight: "600",
  },
  logMetaValue: {
    opacity: 0.9,
  },
  logPayload: {
    fontFamily: Platform.OS === "ios" ? "Courier" : "monospace",
    fontSize: 11,
    padding: 8,
    borderRadius: 6,
    minHeight: 60,
    maxHeight: 150,
    textAlignVertical: "top",
    marginTop: 8,
    marginBottom: 4,
  },
  logId: {
    fontFamily: "monospace",
    opacity: 0.5,
    fontSize: 10,
    marginTop: 4,
  },
});
