import { useBadgeSync } from "@/hooks";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/services/app-context";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { ActivityIndicator, Button, Surface, Text, Icon } from "react-native-paper";
import { SafeAreaView } from "react-native-safe-area-context";
import { LoginModal } from "./LoginModal";
import UserDropdown from "./UserDropdown";

export default function Header() {
  const {
    handleMarkAllAsRead,
    hasUnreadNotifications,
    unreadCount,
    isMarkingAllAsRead,
  } = useBadgeSync();
  const { isLoginModalOpen, closeLoginModal, isMainLoading, isLoadingGqlData, openLoginModal } =
    useAppContext();
  const { itemsInQueue, inProcessing } = useDownloadQueue();
  const { t } = useI18n();
  const { push, connectionStatus: { getPriorityStatus, isUpdating, isCheckingUpdate } } = useAppContext();
  const [isRegistering, setIsRegistering] = useState(false);

  const downloadBlinkAnim = useRef(new Animated.Value(1)).current;

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

  return (
    <>
      <SafeAreaView edges={["top"]}>
        <Surface
          style={styles.headerContainer}
          elevation={2}
        >
          {/* Main Loading Indicator */}
          {(isMainLoading || isLoadingGqlData) && (
            <View style={styles.mainLoadingContainer}>
              <Button
                mode="contained"
                style={styles.mainLoadingButton}
                contentStyle={styles.buttonContent}
                disabled
              >
                <ActivityIndicator size="small" color="#fff" />
              </Button>
            </View>
          )}

          {hasUnreadNotifications && !isLoadingGqlData && (
            <View style={styles.markAllButtonContainer}>
              <Button
                mode="contained"
                onPress={handleMarkAllAsRead}
                disabled={!hasUnreadNotifications || isMarkingAllAsRead}
                style={[
                  styles.markAllButton,
                  hasUnreadNotifications
                    ? styles.markAllButtonActive
                    : styles.markAllButtonInactive,
                ]}
                contentStyle={styles.buttonContent}
              >
                {isMarkingAllAsRead ? (
                  <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <Icon source="check-all" size={18} color="#fff" />
                    )}
              </Button>
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
              <Button
                mode="contained"
                style={[
                  styles.downloadQueueButton,
                  styles.downloadQueueButtonActive,
                ]}
                contentStyle={styles.buttonContent}
                disabled
              >
                    <Animated.View style={{ opacity: downloadBlinkAnim }}>
                      <Icon source="download" size={18} color="#fff" />
                    </Animated.View>
              </Button>
              <Surface style={styles.downloadQueueBadge} elevation={3}>
                <Text variant="labelSmall" style={styles.downloadQueueBadgeText}>
                  {itemsInQueue > 99 ? "99+" : itemsInQueue.toString()}
                </Text>
              </Surface>
            </View>
          )}

          {/* Status Badge */}
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
        </Surface>
      </SafeAreaView>

      <LoginModal visible={isLoginModalOpen} onClose={closeLoginModal} />
    </>
  );
}

const styles = StyleSheet.create({
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
