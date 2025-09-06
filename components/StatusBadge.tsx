import { useI18n } from "@/hooks/useI18n";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useAppContext } from "@/services/app-context";
import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

export function StatusBadge() {
  const {
    openLoginModal,
    connectionStatus: { getPriorityStatus, isUpdating, isCheckingUpdate },
  } = useAppContext();
  const { t } = useI18n();
  const { registerDevice } = usePushNotifications();
  const [isRegistering, setIsRegistering] = useState(false);

  const status = getPriorityStatus();

  if (status.type === "none") {
    return null;
  }

  const handlePress = async () => {
    if (status.type === "push-notifications") {
      setIsRegistering(true);
      try {
        await registerDevice();
      } catch (error) {
        console.error("Error registering device:", error);
      } finally {
        setIsRegistering(false);
      }
    } else if (status.type === "offline") {
      // Apre il modal di login per la modalità offline
      openLoginModal();
    } else if (status.type === "update" && status.action) {
      // Applica l'aggiornamento
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

  const isClickable =
    status.type === "offline" ||
    (status.type === "update" && status.action) ||
    (status.type === "push-notifications" && !isRegistering);

  return (
    <TouchableOpacity
      style={[
        styles.statusBadge,
        { backgroundColor: status.color },
        !isClickable && styles.statusBadgeNonClickable,
      ]}
      onPress={handlePress}
      disabled={!isClickable}
      activeOpacity={isClickable ? 0.7 : 1}
    >
      <Ionicons name={getStatusIcon() as any} size={16} color="#fff" />
      <Text style={styles.statusText}>{getStatusLabel()}</Text>

      {/* Indicatore di loading per aggiornamenti */}
      {status.type === "update" && (isCheckingUpdate || isUpdating) && (
        <View style={styles.loadingIndicator}>
          <Ionicons name="ellipsis-horizontal" size={12} color="#fff" />
        </View>
      )}

      {/* Indicatore per dispositivo non registrato */}
      {status.type === "push-notifications" && (
        <View style={styles.loadingIndicator}>
          <Ionicons
            name={isRegistering ? "hourglass" : "warning"}
            size={12}
            color="#fff"
          />
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    marginRight: 8,
    minHeight: 28,
  },
  statusBadgeNonClickable: {
    opacity: 0.9,
  },
  statusText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
  },
  loadingIndicator: {
    marginLeft: 4,
  },
});
