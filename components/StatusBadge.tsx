import React, { useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Icon, IconButton, useTheme } from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { useAppContext } from "@/contexts/AppContext";

export default function StatusBadge() {
  const {
    openLoginModal,
    push,
    connectionStatus: { isUpdating, isCheckingUpdate, status },
  } = useAppContext();
  const { t } = useI18n();
  const theme = useTheme();

  if (!status) return null;

  const handlePress = async () => {
    if (status.type === "push-notifications") {
      try {
        await push.registerDevice();
      } catch (error) {
        console.error("Error registering device:", error);
      }
    } else if (status.type === "push-permissions") {
      Alert.alert(t("common.notice"), t("common.pushPermissionsDetails"));
    } else if (status.type === "push-needs-pwa") {
      Alert.alert(t("common.notice"), t("common.pushNeedsPwaDetails"));
    } else if (status.type === "filesystem-permission") {
      Alert.alert(t("common.notice"), t("common.filesystemPermissionDetails"));
    } else if (status.type === "offline") {
      openLoginModal();
    } else if (status.type === "update" && status.action) {
      status.action();
    }
  };

  const getStatusIcon = () => {
    if (status.type === "push-needs-pwa") return "progress-download";
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
    (status.type === "push-notifications" && !push.registeringDevice) ||
    status.type === "push-permissions" ||
    status.type === "push-needs-pwa" ||
    status.type === "filesystem-permission";

  const isNegativeStatus =
    status.type === "push-notifications" ||
    status.type === "push-permissions" ||
    status.type === "push-needs-pwa" ||
    status.type === "filesystem-permission" ||
    status.type === "offline" ||
    status.type === "backend" ||
    status.type === "network";

  const containerColor = isNegativeStatus
    ? theme.colors.errorContainer
    : theme.colors.primaryContainer;

  const iconColor = isNegativeStatus
    ? theme.colors.onErrorContainer
    : theme.colors.onPrimaryContainer;

  const extraIcon = (() => {
    if (status.type === "update" && (isCheckingUpdate || isUpdating)) {
      return "dots-horizontal";
    }

    if (status.type === "push-notifications") {
      return push.registeringDevice ? "clock" : "alert";
    }

    return null;
  })();

  return (
    <View style={styles.statusBadgeContainer}>
      <IconButton
        icon={getStatusIcon()}
        size={20}
        iconColor={iconColor}
        containerColor={containerColor}
        onPress={handlePress}
        disabled={!isClickable}
        style={styles.statusBadge}
      />

      {extraIcon && (
        <View
          style={[
            styles.extraIconContainer,
            {
              backgroundColor: containerColor,
              borderColor: theme.colors.background,
            },
          ]}
        >
          <Icon source={extraIcon} size={10} color={iconColor} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  statusBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 8,
    position: "relative",
  },
  statusBadge: {
    margin: 0,
  },
  extraIconContainer: {
    position: "absolute",
    right: -2,
    bottom: -2,
    width: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
});
