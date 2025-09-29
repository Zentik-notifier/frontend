import { useAppContext } from "@/contexts/AppContext";
import { useBadgeSync } from "@/hooks";
import { useDeviceType } from "@/hooks/useDeviceType";
import { useI18n } from "@/hooks/useI18n";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { TranslationKeyPath } from "@/utils";
import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Button,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginModal } from "./LoginModal";
import UserDropdown from "./UserDropdown";

const ROUTES_WITH_HOME_BUTTON: string[] = [
  "/(mobile)/(settings)",
  "/(mobile)/(admin)",
  "/(tablet)/(settings)",
  "/(tablet)/(admin)",
];

const HOME_ROUTES: string[] = [
  "/(mobile)/(home)/(tabs)/notifications",
  "/(mobile)/(home)/(tabs)/buckets",
  "/(mobile)/(home)/(tabs)/gallery",
];

// Routes that should show back button
const ROUTES_WITH_BACK_BUTTON: string[] = [
  "/(mobile)/(home)/bucket/settings/[id]",
  "/(mobile)/(home)/bucket/[id]",
  "/(mobile)/(home)/notification/[id]",
  "/(mobile)/(home)/bucket/settings/create",
  "/(mobile)/(home)/bucket/create",
  "/(mobile)/(settings)/user/",
  "/(mobile)/(settings)/app-settings/",
  "/(mobile)/(settings)/bucket/",
  "/(mobile)/(settings)/access-token/",
  "/(mobile)/(settings)/webhook/",
  "/(mobile)/(settings)/devices/",
  "/(mobile)/(settings)/user-sessions",
  "/(mobile)/(settings)/notifications",
  "/(mobile)/(settings)/logs",
  "/(mobile)/(admin)/user-management/",
  "/(mobile)/(admin)/oauth-providers/",
  "/(mobile)/(admin)/system-access-tokens/",
  "/(mobile)/(admin)/events-review",
];

// Route-based title mapping
const ROUTE_TITLES: Partial<Record<string, TranslationKeyPath>> = {
  "/(mobile)/(admin)": "administration.title",
  "/(mobile)/(settings)": "common.settings",
  "/(mobile)/(settings)/app-settings": "appSettings.title",
  "/(mobile)/(settings)/bucket/list": "buckets.title",
  "/(mobile)/(settings)/bucket/create": "buckets.form.createTitle",
  "/(tablet)/(settings)/bucket/create": "buckets.form.createTitle",
  "/(mobile)/(settings)/bucket/[id]": "buckets.form.editTitle",
  "/(mobile)/(home)/bucket/settings/[id]": "buckets.form.editTitle",
  "/(tablet)/(home)/bucket/settings/[id]": "buckets.form.editTitle",
  "/(tablet)/(settings)/bucket/[id]": "buckets.form.editTitle",
  "/(mobile)/(settings)/webhook/list": "webhooks.title",
  "/(mobile)/(settings)/webhook/create": "webhooks.create",
  "/(mobile)/(settings)/webhook/[id]": "webhooks.edit",
  "/(mobile)/(home)/bucket/settings/create": "webhooks.create",
  "/(tablet)/(settings)/webhook/create": "webhooks.create",
  "/(tablet)/(settings)/webhook/[id]": "webhooks.edit",
  "/(mobile)/(settings)/access-token/list": "accessTokens.title",
  "/(mobile)/(settings)/access-token/create": "accessTokens.form.title",
  "/(tablet)/(settings)/access-token/create": "accessTokens.form.title",
  "/(mobile)/(settings)/devices": "devices.title",
  "/(mobile)/(settings)/notifications": "notifications.title",
  "/(mobile)/(settings)/user-sessions": "userSessions.title",
  "/(mobile)/(settings)/logs": "appLogs.title",
  "/(mobile)/(settings)/user/change-password": "changePassword.title",
  "/(mobile)/(settings)/user/profile": "userProfile.title",
  "/(mobile)/(home)/notification/[id]": "notificationDetail.title",
  "/(tablet)/(admin)/user-management/list": "administration.userManagement",
  "/(mobile)/(admin)/user-management/list": "administration.userManagement",
  "/(tablet)/(settings)/bucket/list": "buckets.title",
  "/(mobile)/(home)/bucket/[id]": "buckets.title",
  "/(tablet)/(settings)/app-settings": "appSettings.title",
  "/(tablet)/(settings)/access-token/list": "accessTokens.title",
  "/(tablet)/(settings)/webhook/list": "webhooks.title",
  "/(tablet)/(settings)/devices": "devices.title",
  "/(tablet)/(settings)/notifications": "notifications.title",
  "/(tablet)/(settings)/user-sessions": "userSessions.title",
  "/(tablet)/(settings)/logs": "appLogs.title",
  "/(tablet)/(settings)/user/profile": "userProfile.title",
  "/(tablet)/(settings)/user/change-password": "changePassword.title",
  "/(tablet)/(admin)/user-management/[id]": "administration.userDetails",
  "/(mobile)/(admin)/user-management/[id]": "administration.userDetails",
  "/(mobile)/(admin)/oauth-providers/create":
    "administration.oauthProviderForm.createTitle",
  "/(tablet)/(admin)/oauth-providers/create":
    "administration.oauthProviderForm.createTitle",
  "/(mobile)/(admin)/oauth-providers/[id]":
    "administration.oauthProviderForm.editTitle",
  "/(tablet)/(admin)/oauth-providers/[id]":
    "administration.oauthProviderForm.editTitle",
  "/(mobile)/(admin)/oauth-providers/list": "administration.oauthProviders",
  "/(tablet)/(admin)/oauth-providers/list": "administration.oauthProviders",
  "/(tablet)/(admin)/system-access-tokens/list":
    "administration.systemTokensTitle",
  "/(mobile)/(admin)/system-access-tokens/list":
    "administration.systemTokensTitle",
  "/(tablet)/(admin)/system-access-tokens/create":
    "systemAccessTokens.form.title",
  "/(mobile)/(admin)/system-access-tokens/create":
    "systemAccessTokens.form.title",
  "/(mobile)/(admin)/events-review": "eventsReview.title",
  "/(tablet)/(admin)/events-review": "eventsReview.title",
};

export default function Header() {
  const {
    handleMarkAllAsRead,
    hasUnreadNotifications,
    unreadCount,
    isMarkingAllAsRead,
  } = useBadgeSync();
  const {
    isLoginModalOpen,
    closeLoginModal,
    isMainLoading,
    isLoadingGqlData,
    openLoginModal,
  } = useAppContext();
  const { itemsInQueue, inProcessing } = useDownloadQueue();
  const { t } = useI18n();
  const {
    push,
    connectionStatus: { getPriorityStatus, isUpdating, isCheckingUpdate },
  } = useAppContext();
  const { navigateToHome, navigateBack } = useNavigationUtils();
  const segments = useSegments();
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const [isRegistering, setIsRegistering] = useState(false);
  const { isMobile } = useDeviceType();

  // Determine current route
  const currentRoute = `/${segments.join("/")}`;
  const shouldShowHomeButton = ROUTES_WITH_HOME_BUTTON.some((route) =>
    currentRoute.startsWith(route)
  );
  const shouldShowBackButton = ROUTES_WITH_BACK_BUTTON.some((route) =>
    currentRoute.startsWith(route)
  );
  const shouldShowStatusBadges = HOME_ROUTES.some((route) =>
    currentRoute.startsWith(route)
  );
  console.log(shouldShowStatusBadges, currentRoute);

  const currentTitle = ROUTE_TITLES[currentRoute];

  const downloadBlinkAnim = useRef(new Animated.Value(1)).current;
  const markBlinkAnim = useRef(new Animated.Value(1)).current;

  // Status badge logic
  const status = getPriorityStatus();

  const handleStatusPress = async () => {
    if (status.type === "push-notifications") {
      setIsRegistering(true);
      try {
        await push.registerDevice();
      } catch (error) {
        console.error("Error registering device:", error);
      } finally {
        setIsRegistering(false);
      }
    } else if (status.type === "push-permissions") {
      // Alert will be handled by the global wrapper
      console.log("Push permissions needed");
    } else if (status.type === "offline") {
      openLoginModal();
    } else if (status.type === "update" && status.action) {
      status.action();
    }
  };

  const getStatusLabel = () => {
    switch (status.type) {
      case "push-notifications":
        return isRegistering
          ? t("common.loading")
          : t("common.deviceNotRegistered");
      case "update":
        return t("common.updateAvailable");
      case "push-permissions":
        return t("common.notificationsDisabled");
      case "offline":
        return t("common.offline");
      case "backend":
        return t("common.backendUnreachable");
      case "network":
        return t("common.noConnection");
      default:
        return "";
    }
  };

  const getStatusIcon = () => {
    if (status.type === "update") {
      if (isUpdating) return "hourglass";
      if (isCheckingUpdate) return "sync";
      return status.icon;
    }
    return status.icon;
  };

  const isStatusClickable =
    status.type === "offline" ||
    (status.type === "update" && status.action) ||
    (status.type === "push-notifications" && !isRegistering) ||
    status.type === "push-permissions";

  useEffect(() => {
    if (inProcessing) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(downloadBlinkAnim, {
            toValue: 0.3,
            duration: 500,
            useNativeDriver: true,
          }),
          Animated.timing(downloadBlinkAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true,
          }),
        ])
      );
      blinkAnimation.start();

      return () => blinkAnimation.stop();
    } else {
      downloadBlinkAnim.setValue(1);
    }
  }, [inProcessing, downloadBlinkAnim]);

  useEffect(() => {
    if (hasUnreadNotifications && !isMarkingAllAsRead) {
      const blinkAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(markBlinkAnim, {
            toValue: 0.7,
            duration: 900,
            useNativeDriver: true,
          }),
          Animated.timing(markBlinkAnim, {
            toValue: 1,
            duration: 900,
            useNativeDriver: true,
          }),
        ])
      );
      blinkAnimation.start();
      return () => blinkAnimation.stop();
    } else {
      markBlinkAnim.setValue(1);
    }
  }, [hasUnreadNotifications, isMarkingAllAsRead, markBlinkAnim]);

  return (
    <>
      <View
        style={[
          styles.safeArea,
          { paddingTop: insets.top, backgroundColor: theme.colors.primary },
        ]}
      >
        <Appbar.Header
          mode="small"
          elevated
          statusBarHeight={0}
          style={styles.appbar}
        >
          {/* SEZIONE SINISTRA: Navigation + Badge di Status */}
          <View style={styles.leftSection}>
            {/* Navigation Button */}
            {shouldShowBackButton && (
              <Surface
                style={[
                  styles.buttonWrapper,
                  { backgroundColor: theme.colors.surface },
                ]}
                elevation={2}
              >
                <TouchableRipple
                  style={styles.backButton}
                  onPress={navigateBack}
                  accessibilityLabel={t("common.back")}
                  accessibilityRole="button"
                >
                  <View style={styles.backButtonContent}>
                    <Icon
                      source="arrow-left"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                    {!isMobile && (
                      <Text
                        variant="titleMedium"
                        style={{ color: theme.colors.onSurface }}
                      >
                        {t("common.back")}
                      </Text>
                    )}
                  </View>
                </TouchableRipple>
              </Surface>
            )}

            {shouldShowHomeButton && (
              <Surface
                style={[
                  styles.buttonWrapper,
                  { backgroundColor: theme.colors.surface },
                ]}
                elevation={2}
              >
                <TouchableRipple
                  style={styles.homeButton}
                  onPress={navigateToHome}
                  accessibilityLabel={t("common.home")}
                  accessibilityRole="button"
                >
                  <View style={styles.homeButtonContent}>
                    <Icon
                      source="home"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                    {!isMobile && (
                      <Text
                        variant="titleMedium"
                        style={{ color: theme.colors.onSurface }}
                      >
                        {t("common.home")}
                      </Text>
                    )}
                  </View>
                </TouchableRipple>
              </Surface>
            )}

            {/* Main Loading Indicator */}
            {(isMainLoading || isLoadingGqlData) && !currentTitle && (
              <View style={styles.mainLoadingContainer}>
                <Appbar.Action
                  icon={() => <ActivityIndicator size="small" color="#fff" />}
                  disabled
                  style={styles.loadingIcon}
                />
              </View>
            )}

            {/* Mark All as Read Button */}
            {shouldShowStatusBadges &&
              hasUnreadNotifications &&
              !isLoadingGqlData && (
                <View style={styles.markAllButtonContainer}>
                  <Animated.View style={{ opacity: markBlinkAnim }}>
                    <Appbar.Action
                      onPress={handleMarkAllAsRead}
                      disabled={!hasUnreadNotifications || isMarkingAllAsRead}
                      icon={() =>
                        isMarkingAllAsRead ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Icon source="check-all" size={20} color="#fff" />
                        )
                      }
                      style={styles.markAllIcon}
                    />
                  </Animated.View>
                  {unreadCount > 0 && (
                    <Surface style={styles.badge} elevation={3}>
                      {isLoadingGqlData ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text variant="labelSmall" style={styles.badgeText}>
                          {unreadCount > 99 ? "99+" : unreadCount.toString()}
                        </Text>
                      )}
                    </Surface>
                  )}
                </View>
              )}

            {/* Download Queue Progress Icon */}
            {shouldShowStatusBadges && inProcessing && (
              <View style={styles.downloadQueueContainer}>
                <Appbar.Action
                  icon={() => (
                    <Animated.View style={{ opacity: downloadBlinkAnim }}>
                      <Icon source="download" size={20} color="#fff" />
                    </Animated.View>
                  )}
                  disabled
                  style={styles.downloadIcon}
                />
                <Surface style={styles.downloadQueueBadge} elevation={3}>
                  <Text
                    variant="labelSmall"
                    style={styles.downloadQueueBadgeText}
                  >
                    {itemsInQueue > 99 ? "99+" : itemsInQueue.toString()}
                  </Text>
                </Surface>
              </View>
            )}

            {/* Status Badge */}
            {shouldShowStatusBadges && status.type !== "none" && (
              <Button
                mode="contained"
                onPress={handleStatusPress}
                disabled={!isStatusClickable}
                style={[
                  styles.statusBadge,
                  { backgroundColor: status.color },
                  !isStatusClickable && styles.statusBadgeNonClickable,
                ]}
                contentStyle={styles.statusBadgeContent}
              >
                <Icon source={getStatusIcon() as any} size={16} color="#fff" />
                <Text variant="labelSmall" style={styles.statusText}>
                  {getStatusLabel()}
                </Text>

                {/* Indicatore di loading per aggiornamenti */}
                {status.type === "update" &&
                  (isCheckingUpdate || isUpdating) && (
                    <View style={styles.loadingIndicator}>
                      <Icon source="dots-horizontal" size={12} color="#fff" />
                    </View>
                  )}

                {/* Indicatore per dispositivo non registrato */}
                {status.type === "push-notifications" && (
                  <View style={styles.loadingIndicator}>
                    <Icon
                      source={isRegistering ? "clock" : "alert"}
                      size={12}
                      color="#fff"
                    />
                  </View>
                )}
              </Button>
            )}
          </View>

          {/* SEZIONE CENTRO: Titolo sempre centrato */}
          <View style={styles.centerSection}>
            {currentTitle && (
              <Text
                variant="titleMedium"
                style={[styles.titleText, { color: theme.colors.onPrimary }]}
                numberOfLines={1}
              >
                {t(currentTitle as any)}
              </Text>
            )}
          </View>

          {/* SEZIONE DESTRA: User Profile */}
          <View style={styles.rightSection}>
            <UserDropdown />
          </View>
        </Appbar.Header>
      </View>

      <LoginModal visible={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    zIndex: 1000,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  appbar: {
    paddingVertical: 0,
    paddingHorizontal: 15,
    minHeight: 48,
    backgroundColor: "transparent", // Trasparente perché il colore è nel container
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // Sezioni dell'header
  leftSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-start",
  },
  centerSection: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    position: "absolute",
    left: 0,
    right: 0,
    zIndex: -1, // Sotto gli altri elementi
  },
  rightSection: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "flex-end",
  },
  buttonWrapper: {
    borderRadius: 20,
    marginRight: 8,
  },
  backButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  backButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homeButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  homeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  titleText: {
    fontWeight: "600",
    textAlign: "center",
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    minHeight: Platform.OS === "android" ? 56 : 44,
    paddingHorizontal: 30,
    paddingVertical: 8,
  },
  buttonContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  markAllButtonContainer: {
    position: "relative",
    marginRight: 10,
  },
  markAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  markAllButtonActive: {
    backgroundColor: "#0a7ea4",
  },
  markAllButtonInactive: {
    backgroundColor: "#ccc",
    opacity: 0.5,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ff4444",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  badgeText: {
    color: "#fff",
    fontWeight: "bold",
    textAlign: "center",
  },
  downloadQueueContainer: {
    position: "relative",
    marginRight: 10,
  },
  downloadQueueButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  downloadQueueButtonActive: {
    backgroundColor: "#28a745",
  },
  downloadQueueButtonInactive: {
    backgroundColor: "#6c757d",
  },
  downloadQueueBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#ffc107",
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "#fff",
  },
  downloadQueueBadgeText: {
    color: "#000",
    fontWeight: "bold",
    textAlign: "center",
  },
  mainLoadingContainer: {
    position: "relative",
    marginRight: 10,
  },
  mainLoadingButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0a7ea4",
  },
  roundIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
  },
  loadingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f4b400",
    alignItems: "center",
    justifyContent: "center",
  },
  markAllIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0a7ea4",
    alignItems: "center",
    justifyContent: "center",
  },
  downloadIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#28a745",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    marginRight: 8,
    minHeight: 28,
  },
  statusBadgeContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  statusBadgeNonClickable: {
    opacity: 0.9,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
  },
  loadingIndicator: {
    marginLeft: 4,
  },
});
