import {
  UpdateUserRoleInput,
  UserRole,
  useGetUserByIdQuery,
  useUpdateUserRoleMutation,
  useUserNotificationStatsByUserIdQuery,
} from "@/generated/gql-operations-generated";
import { useI18n } from "@/hooks/useI18n";
import React from "react";
import { Alert, StyleSheet, View, TextInput } from "react-native";
import {
  ActivityIndicator,
  Card,
  Chip,
  Divider,
  Surface,
  Text,
  useTheme,
} from "react-native-paper";
import OAuthProviderIcon from "./OAuthProviderIcon";
import PaperScrollView from "./ui/PaperScrollView";
import Selector from "./ui/Selector";
import NotificationStats from "./NotificationStats";

interface UserDetailsProps {
  userId: string;
}

export default function UserDetails({ userId }: UserDetailsProps) {
  const theme = useTheme();
  const { t } = useI18n();

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
    await Promise.all([refetchUser(), refetchStats()]);
  };

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={userLoading || statsLoading}
      onRetry={handleRefresh}
      error={!!userError}
    >
      {/* User Info Section */}
      {user && (
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
                          <Text variant="titleSmall" style={styles.bucketName}>
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
                {t("administration.userIdentities" as any) as string}
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
                              <OAuthProviderIcon
                                providerType={identity.providerType as any}
                                size={32}
                                iconSize={22}
                              />
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
                            {t("administration.createdAt") as string}:{" "}
                            {new Date(identity.createdAt).toLocaleString()}
                          </Text>

                          {metadataText && (
                            <>
                              <Divider style={styles.divider} />
                              <Text
                                variant="bodySmall"
                                style={styles.metadataLabel}
                              >
                                {
                                  t(
                                    "administration.identityMetadata" as any
                                  ) as string
                                }
                              </Text>
                              <TextInput
                                value={metadataText}
                                multiline
                                editable={false}
                                scrollEnabled
                                style={[
                                  styles.metadataInput,
                                  {
                                    backgroundColor: theme.colors.surfaceVariant,
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
                  {t("administration.noIdentitiesFound" as any) as string}
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

                          <Text variant="bodySmall" style={styles.deviceDate}>
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

          {/* Notification Statistics Section */}
          {statsData?.userNotificationStats && (
            <NotificationStats
              dateStats={statsData.userNotificationStats}
              showAcked
            />
          )}
        </>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
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
});
