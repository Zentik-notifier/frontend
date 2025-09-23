import SettingsScrollView from "@/components/SettingsScrollView";
import { Colors } from "@/constants/Colors";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { useColorScheme } from "@/hooks/useTheme";
import { useAppContext } from "@/services/app-context";
import React, { useEffect, useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useGetUserDevicesQuery } from "../generated/gql-operations-generated";
import SwipeableDeviceItem from "./SwipeableDeviceItem";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";
import Icon from "./ui/Icon";

export default function DevicesSettings() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [managingDevice, setManagingDevice] = useState(false);
  const { deviceToken, push } = useAppContext();

  const { data: userDevicesData, loading, refetch } = useGetUserDevicesQuery();
  const {
    setMainLoading,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  useEffect(() => setMainLoading(loading), [loading]);

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
      const currentDevice = sortedDevices.find(
        (device) => device.deviceToken === deviceToken
      );

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

  return (
    <SettingsScrollView onRefresh={refetch}>
      <ThemedView style={styles.container}>
        <View style={styles.buttonContainer}>
          {(() => {
            const disabledRegister =
              managingDevice ||
              !push.isReady() ||
              isOfflineAuth ||
              isBackendUnreachable ||
              push.pushPermissionError;
            return (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.registerButton,
                  {
                    backgroundColor: disabledRegister
                      ? Colors[colorScheme ?? "light"].buttonDisabled
                      : Colors[colorScheme ?? "light"].tint,
                  },
                ]}
                onPress={handleRegisterDevice}
                disabled={disabledRegister}
              >
                <Text style={styles.registerButtonText}>
                  {managingDevice
                    ? t("devices.registering")
                    : t("devices.registerDevice")}
                </Text>
              </TouchableOpacity>
            );
          })()}

          {(() => {
            const disabledRegister =
              managingDevice ||
              !push.isReady() ||
              isOfflineAuth ||
              isBackendUnreachable;
            const isCurrentRegistered = sortedDevices.some(
              (device) => device.deviceToken === deviceToken
            );
            const disabledUnregister =
              managingDevice ||
              isOfflineAuth ||
              isBackendUnreachable ||
              disabledRegister ||
              !isCurrentRegistered;
            return (
              <TouchableOpacity
                style={[
                  styles.button,
                  styles.unregisterButton,
                  {
                    backgroundColor: disabledUnregister
                      ? Colors[colorScheme ?? "light"].buttonDisabled
                      : Colors[colorScheme ?? "light"].backgroundCard,
                    borderColor: Colors[colorScheme ?? "light"].border,
                  },
                ]}
                onPress={handleUnregisterDevice}
                disabled={disabledUnregister}
              >
                <Text
                  style={[
                    styles.unregisterButtonText,
                    {
                      color: disabledUnregister
                        ? Colors[colorScheme ?? "light"].textSecondary
                        : "#FF3B30",
                    },
                  ]}
                >
                  {managingDevice
                    ? t("devices.unregistering")
                    : t("devices.unregisterDevice")}
                </Text>
              </TouchableOpacity>
            );
          })()}
        </View>

        {/* Messaggio di errore per permessi push */}
        {push.pushPermissionError && (
          <ThemedText style={styles.errorMessage}>
            {t("common.pushPermissionsHint")}
          </ThemedText>
        )}

        {sortedDevices.length === 0 ? (
          <ThemedView style={styles.emptyState}>
            <Icon
              name="mobile"
              size={64}
              color={Colors[colorScheme ?? "light"].icon}
            />
            <ThemedText style={styles.emptyText}>
              {t("devices.noDevicesTitle")}
            </ThemedText>
            <ThemedText style={styles.emptySubtext}>
              {t("devices.noDevicesSubtext")}
            </ThemedText>
          </ThemedView>
        ) : (
          <View style={styles.devicesContainer}>
            {sortedDevices.map((item) => (
              <SwipeableDeviceItem
                key={item.id}
                device={item}
                isCurrentDevice={deviceToken === item.deviceToken}
              />
            ))}
          </View>
        )}
      </ThemedView>
    </SettingsScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  buttonContainer: {
    gap: 12,
    marginBottom: 24,
  },
  button: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  registerButton: {
    // Background color set dynamically
  },
  registerButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  unregisterButton: {
    borderWidth: 1,
  },
  unregisterButtonText: {
    fontSize: 16,
    fontWeight: "600",
  },
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
