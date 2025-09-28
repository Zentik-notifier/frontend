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
import { useAppContext } from "@/contexts/AppContext";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, View } from "react-native";
import SwipeableItem from "./SwipeableItem";
import PaperScrollView from "@/components/ui/PaperScrollView";
import {
  Button,
  Card,
  Dialog,
  Icon,
  Portal,
  Text,
  useTheme,
} from "react-native-paper";

export function UserSessionsSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const { formatDate: formatDateService } = useDateFormat();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();
  const [showErrorDialog, setShowErrorDialog] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const { data, loading, refetch } = useGetUserSessionsQuery();
  const [revokeSession] = useRevokeSessionMutation();
  const [revokeAllOtherSessions] = useRevokeAllOtherSessionsMutation();
  const { data: providersData } = usePublicAppConfigQuery();
  useEffect(() => setMainLoading(loading), [loading]);

  const sessions = data?.getUserSessions || [];
  const sortedSessions = useEntitySorting(sessions, "desc");

  const deleteSession = async (sessionId: string) => {
    try {
      await revokeSession({
        variables: { sessionId },
      });
      refetch(); // Refresh the list
    } catch (error) {
      console.error("Error deleting session:", error);
      setErrorMessage(t("userSessions.deleteError") as string);
      setShowErrorDialog(true);
    }
  };

  const revokeAllOtherSessionsHandler = async () => {
    try {
      await revokeAllOtherSessions();
      refetch(); // Refresh the list
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
        <View
          style={[
            styles.sessionItem,
            isExpired && styles.expiredSession,
            item.isCurrent && styles.currentSession,
          ]}
        >
            <View style={styles.sessionHeader}>
              <View style={styles.deviceInfo}>
                <Icon
                  source={getDeviceIcon(item.deviceName, item.operatingSystem)}
                  size={20}
                  color={theme.colors.onSurface}
                />
                <View style={styles.deviceTextInfo}>
                  <Text variant="titleMedium" style={styles.deviceName}>
                    {getDeviceDescription(item)}
                  </Text>
                  {getLocationDisplay(item) && (
                    <Text variant="bodySmall" style={styles.locationText}>
                      📍 {getLocationDisplay(item)}
                    </Text>
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
                      <Icon
                        source={
                          item.loginProvider === "github"
                            ? "github"
                            : item.loginProvider === "google"
                            ? "google"
                            : item.loginProvider === "local"
                            ? "account"
                            : "key"
                        }
                        size={18}
                        color={theme.colors.onSurface}
                      />
                    )}
                  </View>
                )}

                <View style={styles.badges}>
                  {item.isCurrent && (
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
              {item.ipAddress && (
                <Text variant="bodySmall" style={styles.sessionDetail}>
                  {t("userSessions.item.ipAddress") as string}: {item.ipAddress}
                </Text>
              )}

              <Text variant="bodySmall" style={styles.sessionDetail}>
                {t("userSessions.item.created") as string}:{" "}
                {formatSessionDate(item.createdAt)}
              </Text>

              {item.lastActivity && (
                <Text variant="bodySmall" style={styles.sessionDetail}>
                  {t("userSessions.item.lastActivity") as string}:{" "}
                  {formatSessionDate(item.lastActivity)}
                </Text>
              )}

              {item.expiresAt && (
                <Text
                  variant="bodySmall"
                  style={[
                    styles.sessionDetail,
                    isExpired && styles.expiredDetail,
                  ]}
                >
                  {t("userSessions.item.expires") as string}:{" "}
                  {formatSessionDate(item.expiresAt)}
                </Text>
              )}
            </View>
        </View>
      </SwipeableItem>
    );
  };

  return (
    <View style={styles.container}>
      <PaperScrollView 
        refreshing={loading} 
        onRefresh={refetch}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
      >
        {sortedSessions.length > 1 && (
          <Button
            mode="contained"
            buttonColor={theme.colors.error}
            textColor={theme.colors.onError}
            icon="logout"
            onPress={() => setShowConfirmDialog(true)}
            style={styles.revokeAllButton}
          >
            {t("userSessions.revokeAllOthers") as string}
          </Button>
        )}

        {sortedSessions.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="web"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text variant="headlineSmall" style={styles.emptyText}>
              {t("userSessions.noSessionsTitle") as string}
            </Text>
            <Text variant="bodyMedium" style={styles.emptySubtext}>
              {t("userSessions.noSessionsSubtext") as string}
            </Text>
          </View>
        ) : (
          <View style={styles.sessionsContainer}>
            {sortedSessions.map((item) => renderSessionItem(item))}
          </View>
        )}
      </PaperScrollView>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    paddingHorizontal: 0, // Rimuove il padding orizzontale di PaperScrollView
  },
  scrollContent: {
    paddingHorizontal: 16, // Aggiunge il padding orizzontale solo al contenuto
    paddingVertical: 8, // Aggiunge padding verticale per evitare gap
  },
  revokeAllButton: {
    marginBottom: 24,
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  sessionsContainer: {
    flex: 1,
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
  providerIconImage: {
    width: 18,
    height: 18,
    borderRadius: 2,
  },
});
