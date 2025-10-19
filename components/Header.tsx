import { useAppContext } from "@/contexts/AppContext";
import { useBadgeSync } from "@/hooks";
import { useDeviceType } from "@/hooks/useDeviceType";
import { TranslationKeyPath, useI18n } from "@/hooks/useI18n";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { useAppTheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Icon,
  IconButton,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LoginModal } from "./LoginModal";
import StatusBadge from "./StatusBadge";
import UserDropdown from "./UserDropdown";

const ROUTES_WITH_HOME_BUTTON: string[] = [
  "/(mobile)/(settings)",
  "/(mobile)/(admin)",
  "/(tablet)/(settings)",
  "/(tablet)/(admin)",
  // "/(mobile)/(home)/notification/[id]",
];

const HOME_ROUTES: string[] = [
  "/(mobile)/(home)/(tabs)/notifications",
  "/(mobile)/(home)/(tabs)/buckets",
  "/(mobile)/(home)/(tabs)/gallery",
  "/(tablet)/(home)/",
];

// Routes that should show back button
const ROUTES_WITH_BACK_BUTTON: string[] = [
  "/(common)/(auth)/register",
  "/(common)/(auth)/forgot-password",
  "/(common)/(auth)/email-confirmation",
  "/(mobile)/(home)/bucket/settings/[id]",
  "/(mobile)/(home)/bucket/[id]",
  "/(mobile)/(home)/notification/[id]",
  "/(mobile)/(home)/bucket/link/[id]",
  "/(mobile)/(home)/bucket/settings/create",
  "/(mobile)/(home)/bucket/create",
  "/(mobile)/(settings)/user/",
  "/(mobile)/(settings)/app-settings",
  "/(mobile)/(settings)/bucket/",
  "/(mobile)/(settings)/access-token/",
  "/(mobile)/(settings)/webhook/",
  "/(mobile)/(settings)/devices",
  "/(mobile)/(settings)/user-sessions",
  "/(mobile)/(settings)/notifications",
  "/(mobile)/(settings)/logs",
  "/(mobile)/(admin)/user-management/",
  "/(mobile)/(admin)/oauth-providers/",
  "/(mobile)/(admin)/system-access-tokens/",
  "/(mobile)/(admin)/server-settings",
  "/(mobile)/(admin)/backup-management",
  "/(mobile)/(admin)/server-logs",
  "/(mobile)/(admin)/events-review",
  "/(mobile)/(settings)/payload-mapper/",
  "/(common)/(auth)/app-settings",
];

// Route-based title mapping
const ROUTE_TITLES: Partial<Record<string, TranslationKeyPath>> = {
  "/(mobile)/(admin)": "administration.title",
  "/(mobile)/(settings)": "common.settings",
  "/(mobile)/(settings)/app-settings": "appSettings.title",
  "/(common)/(auth)/app-settings": "appSettings.title",
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
  "/(mobile)/(settings)/access-token/[id]": "accessTokens.form.editTitle",
  "/(tablet)/(settings)/access-token/[id]": "accessTokens.form.editTitle",
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
  "/(mobile)/(admin)/server-settings": "administration.serverSettings",
  "/(mobile)/(admin)/backup-management": "administration.backupManagement",
  "/(mobile)/(admin)/events-review": "eventsReview.title",
  "/(tablet)/(admin)/events-review": "eventsReview.title",
  "/(tablet)/(admin)/server-logs": "serverLogs.title",
  "/(mobile)/(admin)/server-logs": "serverLogs.title",
  "/(mobile)/(settings)/bucket/link/[id]": "buckets.danglingBucketTitle",
  "/(tablet)/(settings)/bucket/link/[id]": "buckets.danglingBucketTitle",
  "/(mobile)/(home)/bucket/link/[id]": "buckets.danglingBucketTitle",
  "/(mobile)/(settings)/payload-mapper/create": "payloadMappers.create",
  "/(mobile)/(settings)/payload-mapper/[id]": "payloadMappers.edit",
  "/(mobile)/(settings)/payload-mapper/list": "payloadMappers.title",
  "/(tablet)/(settings)/payload-mapper/create": "payloadMappers.create",
  "/(tablet)/(settings)/payload-mapper/[id]": "payloadMappers.edit",
  "/(tablet)/(settings)/payload-mapper/list": "payloadMappers.title",
};

export default function Header() {
  const {
    handleMarkAllAsRead,
    hasUnreadNotifications,
    unreadCount,
    isMarkingAllAsRead,
  } = useBadgeSync();
  const { isLoginModalOpen, closeLoginModal, isMainLoading } = useAppContext();
  const { itemsInQueue } = useDownloadQueue();
  const { t } = useI18n();
  const { navigateToHome, navigateBack, navigateToAppSettings } =
    useNavigationUtils();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { themeMode, setThemeMode } = useAppTheme();
  const { isMobile } = useDeviceType();
  const isPublic = segments[0] === "(common)";
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  // Pulsating animations
  const markAllOpacity = useRef(new Animated.Value(1)).current;
  const downloadOpacity = useRef(new Animated.Value(1)).current;

  // Animate mark all as read icon
  useEffect(() => {
    if (hasUnreadNotifications && !isMarkingAllAsRead) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(markAllOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(markAllOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      markAllOpacity.setValue(1);
    }
  }, [hasUnreadNotifications, isMarkingAllAsRead, markAllOpacity]);

  // Animate download icon
  useEffect(() => {
    if (itemsInQueue > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(downloadOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(downloadOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      downloadOpacity.setValue(1);
    }
  }, [itemsInQueue, downloadOpacity]);

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

  const currentTitle = ROUTE_TITLES[currentRoute];

  function getNextThemeMode(): "system" | "light" | "dark" {
    // ciclo: System -> Light -> Dark -> System
    if (themeMode === "system") return "light";
    if (themeMode === "light") return "dark";
    return "system";
  }

  function getThemeCycleIcon(): string {
    const next = getNextThemeMode();
    if (next === "system") return "theme-light-dark";
    if (next === "light") return "white-balance-sunny";
    return "weather-night";
  }

  function handleThemeToggle() {
    setThemeMode(getNextThemeMode());
  }

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
          onTouchStart={() => {
            if (isMenuOpen) {
              setIsMenuOpen(false);
            }
          }}
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
            {isMainLoading && !currentTitle && (
              <View style={styles.mainLoadingContainer}>
                <ActivityIndicator
                  size="small"
                  color="#fff"
                  style={styles.loadingIcon}
                />
              </View>
            )}

            {/* Mark All as Read Button */}
            {shouldShowStatusBadges && hasUnreadNotifications && (
              <View style={styles.markAllButtonContainer}>
                <Animated.View style={{ opacity: markAllOpacity }}>
                  <Surface style={styles.iconButtonSurface} elevation={2}>
                    <TouchableRipple
                      onPress={handleMarkAllAsRead}
                      disabled={!hasUnreadNotifications || isMarkingAllAsRead}
                      style={styles.iconButtonRipple}
                      borderless
                    >
                      <View style={styles.iconButtonContent}>
                        {isMarkingAllAsRead ? (
                          <ActivityIndicator size="small" color="#fff" />
                        ) : (
                          <Icon source="check-all" size={20} color="#fff" />
                        )}
                      </View>
                    </TouchableRipple>
                  </Surface>
                </Animated.View>
                {unreadCount > 0 && (
                  <Surface style={styles.badge} elevation={3}>
                    <Text variant="labelSmall" style={styles.badgeText}>
                      {unreadCount > 99 ? "99+" : unreadCount.toString()}
                    </Text>
                  </Surface>
                )}
              </View>
            )}

            {/* Download Queue Progress Icon */}
            {shouldShowStatusBadges && itemsInQueue > 0 && (
              <View style={styles.downloadQueueContainer}>
                <Animated.View style={{ opacity: downloadOpacity }}>
                  <Surface style={styles.iconButtonSurface} elevation={2}>
                    <TouchableRipple
                      disabled
                      style={styles.iconButtonRipple}
                      borderless
                    >
                      <View style={styles.iconButtonContent}>
                        <Icon source="download" size={20} color="#fff" />
                      </View>
                    </TouchableRipple>
                  </Surface>
                </Animated.View>
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
            {shouldShowStatusBadges && <StatusBadge />}
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
            {isPublic ? (
              segments[1] !== "terms-acceptance" && (
                <View style={styles.publicButtonsContainer}>
                  {/* Theme Toggle Button */}
                  <Surface style={styles.unauthButtonWrapper} elevation={2}>
                    <TouchableRipple
                      style={[
                        styles.unauthSettingsButton,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      onPress={handleThemeToggle}
                      accessibilityLabel={t("userDropdown.themes.theme")}
                      accessibilityRole="button"
                    >
                      <Icon
                        source={getThemeCycleIcon()}
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </TouchableRipple>
                  </Surface>

                  {/* Settings Button */}
                  <Surface style={styles.unauthButtonWrapper} elevation={2}>
                    <TouchableRipple
                      style={[
                        styles.unauthSettingsButton,
                        {
                          backgroundColor: theme.colors.surfaceVariant,
                          borderColor: theme.colors.outline,
                        },
                      ]}
                      onPress={() => navigateToAppSettings(false)}
                      accessibilityLabel={t("common.settings")}
                      accessibilityRole="button"
                    >
                      <Icon
                        source="cog"
                        size={20}
                        color={theme.colors.onSurfaceVariant}
                      />
                    </TouchableRipple>
                  </Surface>
                </View>
              )
            ) : (
              <UserDropdown
                isMenuOpen={isMenuOpen}
                setIsMenuOpen={setIsMenuOpen}
              />
            )}
          </View>
        </Appbar.Header>
      </View>

      <LoginModal visible={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
}

const styles = StyleSheet.create({
  unauthContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  unauthContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingBottom: 10,
    height: 44,
  },
  unauthLeftSpace: {
    width: 44,
  },
  unauthCenter: {
    flex: 1,
    alignItems: "center",
  },
  unauthRightSection: {
    width: 44,
    alignItems: "flex-end",
  },
  publicButtonsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  unauthButtonWrapper: {
    borderRadius: 22,
  },
  unauthSettingsButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
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
  iconButtonSurface: {
    borderRadius: 18,
    overflow: "hidden",
  },
  iconButtonRipple: {
    borderRadius: 18,
  },
  iconButtonContent: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#0a7ea4",
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
