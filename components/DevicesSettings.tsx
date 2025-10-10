import PaperScrollView from "@/components/ui/PaperScrollView";
import { useAppContext } from "@/contexts/AppContext";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Button, Icon, Text, useTheme } from "react-native-paper";
import { useGetUserDevicesQuery } from "../generated/gql-operations-generated";
import SwipeableDeviceItem from "./SwipeableDeviceItem";

export default function DevicesSettings() {
  const { t } = useI18n();
  const theme = useTheme();
  const [managingDevice, setManagingDevice] = useState(false);

  const {
    data: userDevicesData,
    loading,
    refetch,
    error,
  } = useGetUserDevicesQuery();
  const {
    deviceToken,
    push,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  const handleRefresh = async () => {
    await refetch();
  };

  const devices = userDevicesData?.userDevices || [];
  const sortedDevices = useEntitySorting(devices, "desc");

  const handleRegisterDevice = async () => {
    setManagingDevice(true);
    try {
      const success = await push.registerDevice();
      if (success) {
        await refetch();
      }
    } catch (error) {
      console.error("Error registering device:", error);
      Alert.alert(t("common.error"), t("devices.registerErrorMessage"));
    } finally {
      setManagingDevice(false);
    }
  };

  const handleUnregisterDevice = async () => {
    setManagingDevice(true);
    try {
      // Find the current device in the list
      const currentDevice = deviceToken
        ? sortedDevices.find((device) => device.deviceToken === deviceToken)
        : undefined;

      if (!currentDevice) {
        console.warn("⚠️ Current device not found in registered devices list");
        Alert.alert(
          t("common.error"),
          "Current device not found in registered devices list"
        );
        return;
      }

      try {
        await push.unregisterDevice();
      } catch (error) {}

      // Refresh the devices list
      await refetch();
    } catch (error: any) {
      console.error("❌ Error unregistering current device:", error);
      console.error("Error details:", {
        message: error?.message,
        graphQLErrors: error?.graphQLErrors,
        networkError: error?.networkError,
        status: error?.networkError?.statusCode,
      });

      // Check if it's a 403 error
      if (
        error?.networkError?.statusCode === 403 ||
        error?.graphQLErrors?.some(
          (e: any) => e.extensions?.code === "FORBIDDEN"
        )
      ) {
        Alert.alert(
          t("common.error"),
          "Unauthorized: You may not have permission to unregister this device or your session may have expired. Please try logging out and back in."
        );
      } else {
        Alert.alert(t("common.error"), t("devices.unregisterErrorMessage"));
      }
    } finally {
      setManagingDevice(false);
    }
  };

  const disabledRegister =
    managingDevice ||
    isOfflineAuth ||
    isBackendUnreachable ||
    push.needsPwa ||
    push.pushPermissionError;

  const isCurrentRegistered = sortedDevices.some(
    (device) => device.deviceToken === deviceToken
  );
  const disabledUnregister =
    managingDevice ||
    isOfflineAuth ||
    isBackendUnreachable ||
    push.needsPwa ||
    disabledRegister ||
    !isCurrentRegistered;

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!loading && !!error}
      customActions={[
        {
          icon: "plus",
          label: t("devices.registerDevice"),
          onPress: handleRegisterDevice,
          style: { backgroundColor: theme.colors.primary },
        },
        {
          icon: "minus",
          label: t("devices.unregisterDevice"),
          onPress: handleUnregisterDevice,
          style: { backgroundColor: theme.colors.errorContainer },
        },
      ]}
    >
      <View style={styles.content}>
        {/* Messaggio di errore per PWA */}
        {push.needsPwa ? (
          <Text style={[styles.errorMessage, { color: theme.colors.error }]}>
            {t("common.pushNeedsPwaHint")}
          </Text>
        ) : push.pushPermissionError ? (
          <Text style={[styles.errorMessage, { color: theme.colors.error }]}>
            {t("common.pushPermissionsHint")}
          </Text>
        ) : null}

        {sortedDevices.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon
              source="cellphone"
              size={64}
              color={theme.colors.onSurfaceVariant}
            />
            <Text style={[styles.emptyText, { color: theme.colors.onSurface }]}>
              {t("devices.noDevicesTitle")}
            </Text>
            <Text
              style={[
                styles.emptySubtext,
                { color: theme.colors.onSurfaceVariant },
              ]}
            >
              {t("devices.noDevicesSubtext")}
            </Text>
          </View>
        ) : (
          <View style={styles.devicesContainer}>
            {sortedDevices.map((item) => (
              <SwipeableDeviceItem
                key={item.id}
                device={item}
                isCurrentDevice={
                  !!deviceToken && deviceToken === item.deviceToken
                }
              />
            ))}
          </View>
        )}
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  content: {},
  errorMessage: {
    color: "#FF3B30",
    fontSize: 14,
    textAlign: "center",
    fontWeight: "500",
    marginBottom: 16,
    paddingHorizontal: 16,
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
  devicesContainer: {
    flex: 1,
  },
});
