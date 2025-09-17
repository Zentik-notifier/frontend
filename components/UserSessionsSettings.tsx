import { Colors } from "@/constants/Colors";
import {
  SessionInfoDto,
  useGetUserSessionsQuery,
  usePublicAppConfigQuery,
  useRevokeSessionMutation,
  useRevokeAllOtherSessionsMutation,
} from "@/generated/gql-operations-generated";
import { useDateFormat } from "@/hooks/useDateFormat";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import { Alert, Image, StyleSheet, TouchableOpacity, View } from "react-native";
import SwipeableItem from "./SwipeableItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import { AppLoader } from "./ui/AppLoader";

interface UserSessionsSettingsProps {
  refreshing?: boolean;
}

export function UserSessionsSettings({
  refreshing,
}: UserSessionsSettingsProps) {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const { data, loading, refetch } = useGetUserSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeAllOtherSessions] = useRevokeAllOtherSessionsMutation();
  const { data: providersData } = usePublicAppConfigQuery();
  useEffect(() => setMainLoading(loading), [loading]);

  const sessions = data?.getUserSessions || [];
  const sortedSessions = useEntitySorting(sessions, "desc");

  useEffect(() => {
    if (refreshing) {
      console.log("UserSessionsSettings: Refreshing data...");
    }
    refetch();
  }, [refreshing, refetch]);

  const deleteSession = async (sessionId: string) => {
    try {
      await revokeSession({
        variables: { sessionId },
      });
      refetch(); // Refresh the list
    } catch (error) {
      console.error("Error deleting session:", error);
      Alert.alert(t("common.error"), t("userSessions.deleteError") as string);
    }
  };

  const revokeAllOtherSessionsHandler = async () => {
    try {
      await revokeAllOtherSessions();
      refetch(); // Refresh the list
    } catch (error) {
      console.error("Error revoking all other sessions:", error);
      Alert.alert(t("common.error"), t("userSessions.deleteError") as string);
    }
  };

  const formatSessionDate = (dateString: string) => {
    return formatDateService(dateString);
  };

  const getDeviceIcon = (
    deviceName?: string | null,
    operatingSystem?: string | null
  ): keyof typeof Ionicons.glyphMap => {
    if (!deviceName && !operatingSystem) return "phone-portrait-outline";

    const device = (deviceName || "").toLowerCase();
    const os = (operatingSystem || "").toLowerCase();

    if (
      os.includes("ios") ||
      device.includes("iphone") ||
      device.includes("ipad")
    ) {
      return "phone-portrait-outline";
    }
    if (os.includes("android")) {
      return "phone-portrait-outline";
    }
    if (os.includes("mac") || os.includes("darwin")) {
      return "laptop-outline";
    }
    if (os.includes("windows")) {
      return "desktop-outline";
    }
    if (os.includes("linux")) {
      return "terminal-outline";
    }

    return "globe-outline";
  };

  const getLocationDisplay = (session: SessionInfoDto): string | null => {
    if (session.location) {
      // Se abbiamo una location geolocalizzata, mostriamola
      return session.location;
    }

    if (session.ipAddress) {
      // Se abbiamo solo l'IP, mostriamo quello
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

  const renderSessionItem = (item: SessionInfoDto) => {
    const isExpired = item.expiresAt && new Date(item.expiresAt) < new Date();
    const provider = item.loginProvider
      ? providersData?.publicAppConfig.oauthProviders.find(
          (el) => el.providerId === item.loginProvider
        )
      : undefined;

    return (
      <SwipeableItem
        key={item.id}
        rightAction={
          !(isOfflineAuth || isBackendUnreachable)
            ? {
                icon: "logout",
                label: t("userSessions.item.revoke") as string,
                backgroundColor: "#ff6b6b",
                onPress: () => deleteSession(item.id),
                showAlert: {
                  title: t("userSessions.item.revokeSessionTitle") as string,
                  message: t(
                    "userSessions.item.revokeSessionMessage"
                  ) as string,
                  confirmText: t(
                    "userSessions.item.revokeSessionConfirm"
                  ) as string,
                  cancelText: t("common.cancel") as string,
                },
              }
            : undefined
        }
        marginBottom={12}
        borderRadius={12}
      >
        <ThemedView
          style={[
            styles.sessionItem,
            {
              backgroundColor: Colors[colorScheme ?? "light"].backgroundCard,
            },
            isExpired && styles.expiredSession,
            item.isCurrent && styles.currentSession,
          ]}
        >
          <View style={styles.sessionHeader}>
            <View style={styles.deviceInfo}>
              <Ionicons
                name={getDeviceIcon(item.deviceName, item.operatingSystem)}
                size={20}
                color={Colors[colorScheme ?? "light"].text}
                style={styles.deviceIcon}
              />
              <View style={styles.deviceTextInfo}>
                <ThemedText style={styles.deviceName}>
                  {getDeviceDescription(item)}
                </ThemedText>
                {getLocationDisplay(item) && (
                  <ThemedText style={styles.locationText}>
                    📍 {getLocationDisplay(item)}
                  </ThemedText>
                )}
              </View>
            </View>

            <View style={styles.headerRight}>
              {/* Show login provider icon */}
              {item.loginProvider && (
                <View style={styles.providerInfo}>
                  {provider?.iconUrl ? (
                    <Image
                      source={{ uri: provider.iconUrl }}
                      style={[styles.providerIcon, styles.providerIconImage]}
                    />
                  ) : (
                    <Ionicons
                      name={
                        item.loginProvider === "github"
                          ? "logo-github"
                          : item.loginProvider === "google"
                          ? "logo-google"
                          : item.loginProvider === "local"
                          ? "person-outline"
                          : "key-outline"
                      }
                      size={18}
                      color={Colors[colorScheme ?? "light"].text}
                      style={styles.providerIcon}
                    />
                  )}
                </View>
              )}

              <View style={styles.badges}>
                {item.isCurrent && (
                  <View style={[styles.badge, styles.currentBadge]}>
                    <ThemedText style={styles.currentText}>
                      {t("userSessions.item.current") as string}
                    </ThemedText>
                  </View>
                )}
                {isExpired && (
                  <View style={[styles.badge, styles.expiredBadge]}>
                    <ThemedText style={styles.expiredText}>
                      {t("userSessions.item.expired") as string}
                    </ThemedText>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.sessionDetails}>
            {item.ipAddress && (
              <ThemedText style={styles.sessionDetail}>
                {t("userSessions.item.ipAddress") as string}: {item.ipAddress}
              </ThemedText>
            )}

            <ThemedText style={styles.sessionDetail}>
              {t("userSessions.item.created") as string}:{" "}
              {formatSessionDate(item.createdAt)}
            </ThemedText>

            {item.lastActivity && (
              <ThemedText style={styles.sessionDetail}>
                {t("userSessions.item.lastActivity") as string}:{" "}
                {formatSessionDate(item.lastActivity)}
              </ThemedText>
            )}

            {item.expiresAt && (
              <ThemedText
                style={[
                  styles.sessionDetail,
                  isExpired && styles.expiredDetail,
                ]}
              >
                {t("userSessions.item.expires") as string}:{" "}
                {formatSessionDate(item.expiresAt)}
              </ThemedText>
            )}
          </View>
        </ThemedView>
      </SwipeableItem>
    );
  };

  return (
    <ThemedView style={styles.container}>
      <View style={styles.header}>
        <ThemedText style={styles.title}>
          {t("userSessions.title") as string}
        </ThemedText>
      </View>

      <ThemedText style={styles.description}>
        {t("userSessions.description") as string}
      </ThemedText>

      {sortedSessions.length > 1 && (
        <TouchableOpacity
          style={[
            styles.revokeAllButton,
            {
              backgroundColor: Colors[colorScheme ?? "light"].buttonError,
              borderColor: Colors[colorScheme ?? "light"].buttonError,
            },
          ]}
          onPress={() => {
            Alert.alert(
              t("userSessions.revokeAllOthersTitle") as string,
              t("userSessions.revokeAllOthersMessage") as string,
              [
                {
                  text: t("common.cancel") as string,
                  style: "cancel",
                },
                {
                  text: t("userSessions.revokeAllOthersConfirm") as string,
                  style: "destructive",
                  onPress: revokeAllOtherSessionsHandler,
                },
              ]
            );
          }}
          activeOpacity={0.7}
        >
          <Ionicons
            name="log-out-outline"
            size={18}
            color="#FFFFFF"
            style={styles.revokeAllIcon}
          />
          <ThemedText style={styles.revokeAllText}>
            {t("userSessions.revokeAllOthers") as string}
          </ThemedText>
        </TouchableOpacity>
      )}

      {sortedSessions.length === 0 ? (
        <ThemedView style={styles.emptyState}>
          <Ionicons
            name="globe-outline"
            size={64}
            color={Colors[colorScheme ?? "light"].icon}
          />
          <ThemedText style={styles.emptyText}>
            {t("userSessions.noSessionsTitle") as string}
          </ThemedText>
          <ThemedText style={styles.emptySubtext}>
            {t("userSessions.noSessionsSubtext") as string}
          </ThemedText>
        </ThemedView>
      ) : (
        <View style={styles.sessionsContainer}>
          {sortedSessions.map((item) => renderSessionItem(item))}
        </View>
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
  description: {
    fontSize: 14,
    opacity: 0.7,
    marginBottom: 16,
  },
  revokeAllButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 24,
    gap: 8,
  },
  revokeAllIcon: {
    marginRight: 4,
  },
  revokeAllText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
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
  sessionsContainer: {
    flex: 1,
  },
  sessionItem: {
    padding: 16,
    borderRadius: 12,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
  deviceIcon: {
    marginRight: 8,
  },
  deviceTextInfo: {
    flex: 1,
  },
  deviceName: {
    fontSize: 16,
    fontWeight: "600",
  },
  locationText: {
    fontSize: 13,
    opacity: 0.7,
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
    fontSize: 12,
    fontWeight: "600",
  },
  expiredText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
  },
  sessionDetails: {
    gap: 4,
  },
  sessionDetail: {
    fontSize: 13,
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
  providerIcon: {
    opacity: 0.8,
  },
  providerIconImage: {
    width: 18,
    height: 18,
    borderRadius: 2,
  },
});
