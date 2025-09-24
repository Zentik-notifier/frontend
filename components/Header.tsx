import { useBadgeSync } from "@/hooks";
import { useDownloadQueue } from "@/hooks/useMediaCache";
import { useAppContext } from "@/services/app-context";
import { loadedFromPersistedCacheVar } from "@/config/apollo-client";
import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useReactiveVar } from "@apollo/client";
import {
  ActivityIndicator,
  Animated,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useColorScheme } from "@/hooks/useTheme";
import { Colors } from "@/constants/Colors";
import { LoginModal } from "./LoginModal";
import { StatusBadge } from "./StatusBadge";
import UserDropdown from "./UserDropdown";

export default function Header() {
  const {
    handleMarkAllAsRead,
    hasUnreadNotifications,
    unreadCount,
    isMarkingAllAsRead,
  } = useBadgeSync();
  const { isLoginModalOpen, closeLoginModal, isMainLoading, isLoadingGqlData } =
    useAppContext();
  const { itemsInQueue, inProcessing } = useDownloadQueue();
  const colorScheme = useColorScheme();

  // Animazione per l'icona download che lampeggia
  const downloadBlinkAnim = useRef(new Animated.Value(1)).current;

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
      <SafeAreaView
        style={[
          styles.headerContainer,
          { backgroundColor: Colors[colorScheme ?? "light"].background },
        ]}
        edges={["top"]}
      >
        {/* Main Loading Indicator */}
        {(isMainLoading || isLoadingGqlData) && (
          <View style={styles.mainLoadingContainer}>
            <View style={styles.mainLoadingButton}>
              <ActivityIndicator size="small" color="#fff" />
            </View>
          </View>
        )}

        {hasUnreadNotifications && !isLoadingGqlData && (
          <View style={styles.markAllButtonContainer}>
            <TouchableOpacity
              style={[
                styles.markAllButton,
                hasUnreadNotifications
                  ? styles.markAllButtonActive
                  : styles.markAllButtonInactive,
              ]}
              onPress={handleMarkAllAsRead}
              disabled={!hasUnreadNotifications || isMarkingAllAsRead}
              activeOpacity={0.7}
            >
              {isMarkingAllAsRead ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark-done" size={18} color="#fff" />
              )}
            </TouchableOpacity>
            {unreadCount > 0 && (
              <View style={styles.badge}>
                {isLoadingGqlData ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.badgeText}>
                    {unreadCount > 99 ? "99+" : unreadCount.toString()}
                  </Text>
                )}
              </View>
            )}
          </View>
        )}

        {/* Download Queue Progress Icon */}
        {inProcessing && (
          <View style={styles.downloadQueueContainer}>
            <TouchableOpacity
              style={[
                styles.downloadQueueButton,
                styles.downloadQueueButtonActive,
              ]}
              activeOpacity={0.7}
            >
              <Animated.View style={{ opacity: downloadBlinkAnim }}>
                <Ionicons name="download" size={18} color="#fff" />
              </Animated.View>
            </TouchableOpacity>
            <View style={styles.downloadQueueBadge}>
              <Text style={styles.downloadQueueBadgeText}>
                {itemsInQueue > 99 ? "99+" : itemsInQueue.toString()}
              </Text>
            </View>
          </View>
        )}

        <StatusBadge />
        <View style={styles.spacer} />
        <UserDropdown />
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

  markAllButtonContainer: {
    position: "relative",
    marginRight: 10,
  },
  markAllButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 12,
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
    alignItems: "center",
    justifyContent: "center",
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
    fontSize: 12,
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
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#0a7ea4",
  },
  spacer: {
    flex: 1,
  },
});
