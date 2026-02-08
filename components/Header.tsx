import { useAppContext } from "@/contexts/AppContext";
import { useBadgeSync } from "@/hooks";
import { useDeviceType } from "@/hooks/useDeviceType";
import { TranslationKeyPath, useI18n } from "@/hooks/useI18n";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { useSettings } from "@/hooks/useSettings";
import { useAppTheme } from "@/hooks/useTheme";
import { useNavigationUtils } from "@/utils/navigation";
import { useSegments } from "expo-router";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Appbar,
  Icon,
  Surface,
  Text,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { HelpModal } from "./Help";
import { LoginModal } from "./LoginModal";
import StatusBadge from "./StatusBadge";
import { ThemeSwitcher } from "./ThemeSwitcher";
import { FeedbackButton } from "./ui";
import UserDropdown from "./UserDropdown";

const ROUTES_WITH_HOME_BUTTON: string[] = [
  "/(phone)/(settings)",
  "/(phone)/(admin)",
  "/(desktop)/(settings)",
  "/(desktop)/(admin)",
  "/(phone)/(home)/notification/[id]",
  "/(phone)/(home)/bucket/[id]",
];

const HOME_ROUTES: string[] = [
  "/(phone)/(home)/(tabs)/notifications",
  "/(phone)/(home)/(tabs)/buckets",
  "/(phone)/(home)/(tabs)/gallery",
  "/(desktop)/(home)/",
];

// Routes that should show back button
const ROUTES_WITH_BACK_BUTTON: string[] = [
  "/(common)/(auth)/register",
  "/(common)/(auth)/forgot-password",
  "/(common)/(auth)/email-confirmation",
  "/(phone)/(home)/bucket/settings/[id]",
  "/(phone)/(home)/bucket/[id]",
  "/(phone)/(home)/notification/[id]",
  "/(phone)/(home)/bucket/link/[id]",
  "/(phone)/(home)/bucket/settings/create",
  "/(phone)/(home)/bucket/create",
  "/(phone)/(settings)/user/",
  "/(phone)/(settings)/app-settings",
  "/(phone)/(settings)/watch-cloud",
  "/(phone)/(settings)/bucket/",
  "/(phone)/(settings)/access-token/",
  "/(phone)/(settings)/webhook/",
  "/(phone)/(settings)/devices",
  "/(phone)/(settings)/user-sessions",
  "/(phone)/(settings)/notifications/settings",
  "/(phone)/(settings)/notifications/create",
  "/(phone)/(settings)/logs",
  "/(phone)/(settings)/cached-data",
  "/(phone)/(settings)/downloads",
  "/(phone)/(settings)/message-reminders",
  "/(phone)/(admin)/user-management/",
  "/(phone)/(admin)/oauth-providers/",
  "/(phone)/(admin)/system-access-tokens/",
  "/(phone)/(admin)/changelogs/",
  "/(phone)/(admin)/server-settings",
  "/(phone)/(admin)/backup-management",
  "/(phone)/(admin)/server-logs",
  "/(phone)/(admin)/server-files",
  "/(phone)/(admin)/events-review",
  "/(phone)/(admin)/user-logs",
  "/(phone)/(settings)/payload-mapper/",
  "/(phone)/(settings)/user-template/",
  "/(phone)/(settings)/external-notify-system/",
  "/(desktop)/(settings)/external-notify-system/",
  "/(desktop)/(settings)/downloads",
  "/(desktop)/(settings)/message-reminders",
  "/(common)/(auth)/app-settings",
];

// Route-based title mapping
const ROUTE_TITLES: Partial<Record<string, TranslationKeyPath>> = {
  "/(phone)/(admin)": "administration.title",
  "/(phone)/(settings)": "common.settings",
  "/(phone)/(settings)/app-settings": "appSettings.title",
  "/(phone)/(settings)/watch-cloud": "settingsWatchCloud.title",
  "/(common)/(auth)/app-settings": "appSettings.title",
  "/(phone)/(settings)/bucket/list": "buckets.title",
  "/(phone)/(settings)/bucket/create": "buckets.form.createTitle",
  "/(desktop)/(settings)/bucket/create": "buckets.form.createTitle",
  "/(phone)/(settings)/bucket/[id]": "buckets.form.editTitle",
  "/(phone)/(home)/bucket/settings/[id]": "buckets.form.editTitle",
  "/(desktop)/(home)/bucket/settings/[id]": "buckets.form.editTitle",
  "/(desktop)/(settings)/bucket/[id]": "buckets.form.editTitle",
  "/(phone)/(settings)/webhook/list": "webhooks.title",
  "/(phone)/(settings)/webhook/create": "webhooks.create",
  "/(phone)/(settings)/webhook/[id]": "webhooks.edit",
  "/(phone)/(home)/bucket/settings/create": "buckets.form.createTitle",
  "/(desktop)/(settings)/webhook/create": "webhooks.create",
  "/(desktop)/(settings)/webhook/[id]": "webhooks.edit",
  "/(phone)/(settings)/access-token/list": "accessTokens.title",
  "/(phone)/(settings)/access-token/create": "accessTokens.form.title",
  "/(desktop)/(settings)/access-token/create": "accessTokens.form.title",
  "/(phone)/(settings)/access-token/[id]": "accessTokens.form.editTitle",
  "/(desktop)/(settings)/access-token/[id]": "accessTokens.form.editTitle",
  "/(phone)/(settings)/devices": "devices.title",
  "/(phone)/(settings)/notifications/settings": "notifications.title",
  "/(phone)/(settings)/notifications/create": "notifications.title",
  "/(phone)/(settings)/user-sessions": "userSessions.title",
  "/(phone)/(settings)/logs": "appLogs.title",
  "/(phone)/(settings)/cached-data": "cachedData.title",
  "/(phone)/(settings)/downloads": "downloads.title",
  "/(phone)/(settings)/message-reminders": "messageReminders.title",
  "/(phone)/(settings)/user/change-password": "changePassword.title",
  "/(phone)/(settings)/user/profile": "userProfile.title",
  "/(phone)/(home)/notification/[id]": "notificationDetail.title",
  "/(desktop)/(admin)/user-management/list": "administration.userManagement",
  "/(phone)/(admin)/user-management/list": "administration.userManagement",
  "/(desktop)/(settings)/bucket/list": "buckets.title",
  "/(phone)/(home)/bucket/[id]": "buckets.title",
  "/(desktop)/(settings)/app-settings": "appSettings.title",
  "/(desktop)/(settings)/watch-cloud": "settingsWatchCloud.title",
  "/(desktop)/(settings)/access-token/list": "accessTokens.title",
  "/(desktop)/(settings)/webhook/list": "webhooks.title",
  "/(desktop)/(settings)/devices": "devices.title",
  "/(desktop)/(settings)/notifications/settings": "notifications.title",
  "/(desktop)/(settings)/notifications/create": "notifications.title",
  "/(desktop)/(settings)/user-sessions": "userSessions.title",
  "/(desktop)/(settings)/logs": "appLogs.title",
  "/(desktop)/(settings)/cached-data": "cachedData.title",
  "/(desktop)/(settings)/downloads": "downloads.title",
  "/(desktop)/(settings)/message-reminders": "messageReminders.title",
  "/(desktop)/(settings)/user/profile": "userProfile.title",
  "/(desktop)/(settings)/user/change-password": "changePassword.title",
  "/(desktop)/(admin)/user-management/[id]": "administration.userDetails",
  "/(phone)/(admin)/user-management/[id]": "administration.userDetails",
  "/(phone)/(admin)/oauth-providers/create":
    "administration.oauthProviderForm.createTitle",
  "/(desktop)/(admin)/oauth-providers/create":
    "administration.oauthProviderForm.createTitle",
  "/(phone)/(admin)/oauth-providers/[id]":
    "administration.oauthProviderForm.editTitle",
  "/(desktop)/(admin)/oauth-providers/[id]":
    "administration.oauthProviderForm.editTitle",
  "/(phone)/(admin)/oauth-providers/list": "administration.oauthProviders",
  "/(desktop)/(admin)/oauth-providers/list": "administration.oauthProviders",
  "/(desktop)/(admin)/system-access-tokens/list":
    "administration.systemTokensTitle",
  "/(phone)/(admin)/system-access-tokens/list":
    "administration.systemTokensTitle",
  "/(desktop)/(admin)/system-access-tokens/create":
    "systemAccessTokens.form.title",
  "/(phone)/(admin)/system-access-tokens/create":
    "systemAccessTokens.form.title",
  "/(phone)/(admin)/server-settings": "administration.serverSettings",
  "/(phone)/(admin)/backup-management": "administration.backupManagement",
  "/(phone)/(admin)/events-review": "eventsReview.title",
  "/(desktop)/(admin)/events-review": "eventsReview.title",
  "/(desktop)/(admin)/server-logs": "serverLogs.title",
  "/(phone)/(admin)/server-logs": "serverLogs.title",
  "/(phone)/(admin)/server-files": "administration.serverFiles.title",
  "/(desktop)/(admin)/server-files": "administration.serverFiles.title",
  "/(desktop)/(admin)/changelogs/list": "administration.changelogsTitle",
  "/(phone)/(admin)/changelogs/list": "administration.changelogsTitle",
  "/(desktop)/(admin)/changelogs/create": "changelog.createTitle",
  "/(phone)/(admin)/changelogs/create": "changelog.createTitle",
  "/(phone)/(settings)/bucket/link/[id]": "buckets.danglingBucketTitle",
  "/(desktop)/(settings)/bucket/link/[id]": "buckets.danglingBucketTitle",
  "/(phone)/(home)/bucket/link/[id]": "buckets.danglingBucketTitle",
  "/(phone)/(settings)/payload-mapper/create": "payloadMappers.create",
  "/(phone)/(settings)/payload-mapper/[id]": "payloadMappers.edit",
  "/(phone)/(settings)/payload-mapper/list": "payloadMappers.title",
  "/(desktop)/(settings)/payload-mapper/create": "payloadMappers.create",
  "/(desktop)/(settings)/payload-mapper/[id]": "payloadMappers.edit",
  "/(desktop)/(settings)/payload-mapper/list": "payloadMappers.title",
  "/(phone)/(settings)/user-template/create": "userTemplates.create",
  "/(phone)/(settings)/user-template/[id]": "userTemplates.edit",
  "/(phone)/(settings)/user-template/list": "userTemplates.title",
  "/(desktop)/(settings)/user-template/create": "userTemplates.create",
  "/(desktop)/(settings)/user-template/[id]": "userTemplates.edit",
  "/(desktop)/(settings)/user-template/list": "userTemplates.title",
  "/(phone)/(settings)/external-notify-system/list": "externalServers.title",
  "/(desktop)/(settings)/external-notify-system/list": "externalServers.title",
  "/(phone)/(settings)/external-notify-system/create": "externalServers.create",
  "/(desktop)/(settings)/external-notify-system/create": "externalServers.create",
  "/(phone)/(settings)/external-notify-system/[id]": "externalServers.edit",
  "/(desktop)/(settings)/external-notify-system/[id]": "externalServers.edit",
};

export default function Header() {
  const {
    handleMarkAllAsRead,
    hasUnreadNotifications,
    unreadCount,
    isMarkingAllAsRead,
  } = useBadgeSync();
  const { isLoginModalOpen, closeLoginModal, logout } = useAppContext();
  const { itemsInQueue } = useDownloadQueue();
  const { t } = useI18n();
  const { settings } = useSettings();
  const { navigateToHome, navigateBack, navigateToSettings } =
    useNavigationUtils();
  const segments = useSegments() as string[];
  const insets = useSafeAreaInsets();
  const theme = useTheme();
  const { themeMode, setThemeMode } = useAppTheme();
  const { isMobile } = useDeviceType();
  const isPublic = segments[0] === "(common)";
  const isSelfService = segments[0] === "self-service";
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isHelpModalVisible, setIsHelpModalVisible] = useState(false);

  const hideHints = settings.hideHints ?? false;

  // Pulsating animations for icons only (not the entire badge)
  const markAllIconOpacity = useRef(new Animated.Value(1)).current;
  const downloadIconOpacity = useRef(new Animated.Value(1)).current;

  // Animate mark all as read icon
  useEffect(() => {
    if (hasUnreadNotifications && !isMarkingAllAsRead) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(markAllIconOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(markAllIconOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      markAllIconOpacity.setValue(1);
    }
  }, [hasUnreadNotifications, isMarkingAllAsRead, markAllIconOpacity]);

  // Animate download icon
  useEffect(() => {
    if (itemsInQueue > 0) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(downloadIconOpacity, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(downloadIconOpacity, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      );
      animation.start();
      return () => animation.stop();
    } else {
      downloadIconOpacity.setValue(1);
    }
  }, [itemsInQueue, downloadIconOpacity]);

  // Determine current route
  const currentRoute = `/${segments.join("/")}`;
  // console.log("currentRoute", currentRoute);
  const shouldShowHomeButton = ROUTES_WITH_HOME_BUTTON.some((route) =>
    currentRoute.startsWith(route)
  );
  const shouldShowBackButton = ROUTES_WITH_BACK_BUTTON.some((route) =>
    currentRoute.startsWith(route)
  );
  const isHome = HOME_ROUTES.some((route) => currentRoute.startsWith(route));
  const showFeedbackButton = isPublic || isSelfService || isHome;

  const currentTitle =
    ROUTE_TITLES[currentRoute] ??
    (/^\/\(desktop\)\/\(settings\)\/external-notify-system\/[^/]+$/.test(
      currentRoute
    ) ||
    /^\/\(phone\)\/\(settings\)\/external-notify-system\/[^/]+$/.test(
      currentRoute
    )
      ? "externalServers.edit"
      : undefined);


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
          <View style={styles.leftSection}>
            {/* Feedback Button - always visible */}
            {showFeedbackButton && <FeedbackButton variant="header" />}
            {/* Help Button - Only on home routes and if hints are not hidden */}
            {isHome && !hideHints && (
              <Surface
                style={[
                  styles.buttonWrapper,
                  { backgroundColor: theme.colors.surface },
                ]}
                elevation={2}
              >
                <TouchableRipple
                  style={styles.helpButton}
                  onPress={() => setIsHelpModalVisible(true)}
                  accessibilityLabel={t("notificationsHelp.title")}
                  accessibilityRole="button"
                >
                  <View style={styles.helpButtonContent}>
                    <Icon
                      source="help"
                      size={24}
                      color={theme.colors.onSurface}
                    />
                  </View>
                </TouchableRipple>
              </Surface>
            )}

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

            {/* Mark All as Read Button */}
            {isHome && hasUnreadNotifications && (
              <View style={styles.markAllButtonContainer}>
                <TouchableRipple
                  onPress={handleMarkAllAsRead}
                  disabled={!hasUnreadNotifications || isMarkingAllAsRead}
                  style={styles.iconButtonRipple}
                  borderless
                >
                  <Surface
                    style={[
                      styles.iconButtonSurface,
                      { backgroundColor: theme.colors.primaryContainer },
                    ]}
                    elevation={2}
                  >
                    <View
                      style={[
                        styles.iconButtonContent,
                        { backgroundColor: theme.colors.primaryContainer },
                      ]}
                    >
                      {isMarkingAllAsRead ? (
                        <ActivityIndicator
                          size="small"
                          color={theme.colors.onPrimaryContainer}
                        />
                      ) : (
                        <Animated.View style={{ opacity: markAllIconOpacity }}>
                          <Icon
                            source="check-all"
                            size={20}
                            color={theme.colors.onSurface}
                          />
                        </Animated.View>
                      )}
                    </View>
                  </Surface>
                </TouchableRipple>
                {unreadCount > 0 && (
                  <Surface
                    style={[
                      styles.badge,
                      { backgroundColor: theme.colors.error },
                    ]}
                    elevation={3}
                  >
                    <Text
                      variant="labelSmall"
                      style={[
                        styles.badgeText,
                        { color: theme.colors.onError },
                      ]}
                    >
                      {unreadCount > 99 ? "99+" : unreadCount.toString()}
                    </Text>
                  </Surface>
                )}
              </View>
            )}

            {/* Download Queue Progress Icon */}
            {isHome && itemsInQueue > 0 && (
              <View style={styles.downloadQueueContainer}>
                <TouchableRipple
                  disabled
                  style={styles.iconButtonRipple}
                  borderless
                >
                  <Surface
                    style={[
                      styles.iconButtonSurface,
                      { backgroundColor: theme.colors.secondaryContainer },
                    ]}
                    elevation={2}
                  >
                    <View
                      style={[
                        styles.iconButtonContent,
                        { backgroundColor: theme.colors.secondaryContainer },
                      ]}
                    >
                      <Animated.View style={{ opacity: downloadIconOpacity }}>
                        <Icon
                          source="download"
                          size={20}
                          color={theme.colors.onSurface}
                        />
                      </Animated.View>
                    </View>
                  </Surface>
                </TouchableRipple>
                <Surface
                  style={[
                    styles.downloadQueueBadge,
                    { backgroundColor: theme.colors.primary },
                  ]}
                  elevation={3}
                >
                  <Text
                    variant="labelSmall"
                    style={[
                      styles.downloadQueueBadgeText,
                      { color: theme.colors.onPrimary },
                    ]}
                  >
                    {itemsInQueue > 99 ? "99+" : itemsInQueue.toString()}
                  </Text>
                </Surface>
              </View>
            )}

            {/* Status Badge */}
            {isHome && <StatusBadge />}
          </View>

          {/* SEZIONE CENTRO: Titolo sempre centrato */}
          <View style={styles.centerSection}>
            {currentTitle && (
              <Text
                variant="titleMedium"
                style={[styles.titleText, { color: theme.colors.onPrimary }]}
                numberOfLines={1}
              >
                {t(currentTitle) as string}
              </Text>
            )}
          </View>

          {/* SEZIONE DESTRA: User Profile */}
          <View style={styles.rightSection}>
            {isPublic || isSelfService ? (
              segments[1] !== "terms-acceptance" && (
                <View style={styles.publicButtonsContainer}>
                  {/* Theme Toggle Button */}
                  <ThemeSwitcher variant="button" />

                  {/* Settings Button - opens usual settings page (filtered to app/cache/logs when not logged in) */}
                  {isPublic && (
                    <Surface style={styles.unauthButtonWrapper} elevation={2}>
                      <TouchableRipple
                        style={[
                          styles.unauthSettingsButton,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        onPress={navigateToSettings}
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
                  )}

                  {/* Self-service: Home shortcut */}
                  {isSelfService && (
                    <Surface style={styles.unauthButtonWrapper} elevation={2}>
                      <TouchableRipple
                        style={[
                          styles.unauthSettingsButton,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        onPress={navigateToHome}
                        accessibilityLabel={t("common.home")}
                        accessibilityRole="button"
                      >
                        <Icon
                          source="home"
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </TouchableRipple>
                    </Surface>
                  )}

                  {/* Self-service: add Logout as third button */}
                  {isSelfService && (
                    <Surface style={styles.unauthButtonWrapper} elevation={2}>
                      <TouchableRipple
                        style={[
                          styles.unauthSettingsButton,
                          {
                            backgroundColor: theme.colors.surfaceVariant,
                            borderColor: theme.colors.outline,
                          },
                        ]}
                        onPress={logout}
                        accessibilityLabel={t("userProfile.logout")}
                        accessibilityRole="button"
                      >
                        <Icon
                          source="logout"
                          size={20}
                          color={theme.colors.onSurfaceVariant}
                        />
                      </TouchableRipple>
                    </Surface>
                  )}
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
      <HelpModal
        visible={isHelpModalVisible}
        onDismiss={() => setIsHelpModalVisible(false)}
      />
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
  authButtonsContainer: {
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
  feedbackButtonWrapper: {
    borderRadius: 20,
    marginRight: 8,
  },
  feedbackButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  feedbackButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
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
  helpButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  helpButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
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
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  badgeText: {
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
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: "transparent",
  },
  downloadQueueBadgeText: {
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
  },
  iconButtonRipple: {
    borderRadius: 18,
    padding: 4, // Aggiunge area cliccabile attorno all'icona
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
