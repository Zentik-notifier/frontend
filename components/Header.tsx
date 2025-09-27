import { useBadgeSync } from "@/hooks";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useRef, useState } from "react";
import { Animated, Platform, StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Button,
  Surface,
  Text,
  Icon,
  Appbar,
  TouchableRipple,
  useTheme,
} from "react-native-paper";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Href, useSegments } from "expo-router";
import { LoginModal } from "./LoginModal";
import UserDropdown from "./UserDropdown";

// Routes that should show home button instead of back button
const HOME_ROUTES: Href[] = [
  "/(mobile)/(admin)",
  "/(mobile)/(settings)",
  "/(tablet)/(admin)/user-management/list",
  "/(tablet)/(settings)/user-profile",
];

// Routes that should show back button
const BACK_ROUTES: Href[] = [
  "/(mobile)/(home)/bucket/settings/[id]",
  "/(mobile)/(home)/bucket/[id]",
  "/(mobile)/(home)/notification/[id]",
  "/(mobile)/(home)/bucket/settings/create",
];

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

  // Determine current route
  const currentRoute = `/${segments.join("/")}`;
  const shouldShowHomeButton = HOME_ROUTES.some(
    (route) => currentRoute === route
  );
  const shouldShowBackButton = BACK_ROUTES.some(
    (route) => currentRoute === route
  );

  const downloadBlinkAnim = useRef(new Animated.Value(1)).current;
  const markBlinkAnim = useRef(new Animated.Value(1)).current;
  console.log("currentRoute", currentRoute);

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
          {/* Navigation Button */}
          {shouldShowBackButton && (
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
                  color={theme.colors.onPrimary}
                />
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onPrimary }}
                >
                  {t("common.back")}
                </Text>
              </View>
            </TouchableRipple>
          )}
          {shouldShowHomeButton && (
            <TouchableRipple
              style={styles.homeButton}
              onPress={navigateToHome}
              accessibilityLabel={t("common.home")}
              accessibilityRole="button"
            >
              <View style={styles.homeButtonContent}>
                <Icon source="home" size={24} color={theme.colors.onPrimary} />
                <Text
                  variant="titleMedium"
                  style={{ color: theme.colors.onPrimary }}
                >
                  {t("common.home")}
                </Text>
              </View>
            </TouchableRipple>
          )}

          {/* Main Loading Indicator */}
          {(isMainLoading || isLoadingGqlData) && (
            <View style={styles.mainLoadingContainer}>
              <Appbar.Action
                icon={() => <ActivityIndicator size="small" color="#fff" />}
                disabled
                style={styles.loadingIcon}
              />
            </View>
          )}

          {hasUnreadNotifications && !isLoadingGqlData && (
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
          {inProcessing && (
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

          {/* Status Badge reale */}
          {status.type !== "none" && (
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
              {status.type === "update" && (isCheckingUpdate || isUpdating) && (
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

          <View style={styles.spacer} />
          <UserDropdown />
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
  },
  backButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  backButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  homeButton: {
    paddingHorizontal: 8,
    paddingVertical: 8,
  },
  homeButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
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
  spacer: {
    flex: 1,
  },
});
