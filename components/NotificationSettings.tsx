import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React, { useEffect, useState, useMemo } from "react";
import { Alert, StyleSheet, View } from "react-native";
import { Card, Icon, Text, useTheme } from "react-native-paper";
import {
  useUserNotificationStatsQuery,
  ExecutionType,
  useGetUserDevicesQuery,
} from "@/generated/gql-operations-generated";
import EntityExecutionsSection from "./EntityExecutionsSection";
import PaperScrollView from "./ui/PaperScrollView";
import DetailSectionCard from "./ui/DetailSectionCard";
import { useAppContext } from "@/contexts/AppContext";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { settingsService } from "@/services/settings-service";
import SwipeableDeviceItem from "./SwipeableDeviceItem";

export default function NotificationSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToCreateNotification } = useNavigationUtils();
  const [managingDevice, setManagingDevice] = useState(false);
  const [storedDeviceId, setStoredDeviceId] = useState<string | null>(null);

  const {
    data: statsData,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useUserNotificationStatsQuery();

  const {
    data: userDevicesData,
    loading: devicesLoading,
    refetch: refetchDevices,
    error: devicesError,
  } = useGetUserDevicesQuery();

  const {
    deviceToken,
    push,
    connectionStatus: { isOfflineAuth, isBackendUnreachable },
  } = useAppContext();

  // Load stored device ID on mount
  useEffect(() => {
    const deviceId = settingsService.getAuthData().deviceId;
    setStoredDeviceId(deviceId);
  }, []);

  const handleRefresh = async () => {
    await Promise.all([refetchStats(), refetchDevices()]);
  };

  const devices = userDevicesData?.userDevices || [];
  const sortedDevices = useEntitySorting(devices, "desc");

  const handleRegisterDevice = async () => {
    setManagingDevice(true);
    try {
      const success = await push.registerDevice();
      if (success) {
        await refetchDevices();
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
      const currentDevice = storedDeviceId
        ? sortedDevices.find((device) => device.id === storedDeviceId)
        : deviceToken
        ? sortedDevices.find((device) => device.deviceToken === deviceToken)
        : undefined;

      if (!currentDevice) {
        console.warn("⚠️ Current device not found in registered devices list");
        Alert.alert(
          t("common.error"),
          t("devices.deviceNotFoundErrorMessage" as any)
        );
        return;
      }

      try {
        await push.unregisterDevice();
      } catch (error) {}

      await refetchDevices();
    } catch (error: any) {
      console.error("❌ Error unregistering current device:", error);
      if (
        error?.networkError?.statusCode === 403 ||
        error?.graphQLErrors?.some(
          (e: any) => e.extensions?.code === "FORBIDDEN"
        )
      ) {
        Alert.alert(
          t("common.error"),
          t("devices.unauthorizedErrorMessage" as any)
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

  const loading = statsLoading || devicesLoading;
  const error = statsError || devicesError;

  // Prepare stats items for DetailSectionCard
  const statItems = useMemo(() => {
    if (!statsData?.userNotificationStats) return [];
    const stats = statsData.userNotificationStats;
    return [
      {
        label: t("userProfile.today"),
        value: stats.today,
        acked: stats.todayAcked,
      },
      {
        label: t("userProfile.thisWeek"),
        value: stats.thisWeek,
        acked: stats.thisWeekAcked,
      },
      {
        label: t("userProfile.last7Days"),
        value: stats.last7Days,
        acked: stats.last7DaysAcked,
      },
      {
        label: t("userProfile.thisMonth"),
        value: stats.thisMonth,
        acked: stats.thisMonthAcked,
      },
      {
        label: t("userProfile.last30Days"),
        value: stats.last30Days,
        acked: stats.last30DaysAcked,
      },
      {
        label: t("userProfile.total"),
        value: stats.total,
        acked: stats.totalAcked,
      },
    ];
  }, [statsData, t]);

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!loading && !!error}
      customActions={[
        {
          label: t("notifications.createNew"),
          icon: "plus",
          onPress: navigateToCreateNotification,
        },
        {
          icon: "plus",
          label: t("devices.registerDevice"),
          onPress: handleRegisterDevice,
          disabled: disabledRegister,
          style: { backgroundColor: theme.colors.primary },
        },
        {
          icon: "minus",
          label: t("devices.unregisterDevice"),
          onPress: handleUnregisterDevice,
          disabled: disabledUnregister,
          style: { backgroundColor: theme.colors.errorContainer },
        },
      ]}
    >
      <View style={styles.container}>
        {/* Notification Stats Section */}
        {statsData?.userNotificationStats && (
          <DetailSectionCard
            title={t("userProfile.notificationStats")}
            items={[{ key: "stats-grid" }]}
            renderItem={() => (
              <View style={styles.statsGrid}>
                {statItems.map((item, index) => (
                  <Card key={index} style={styles.statItem}>
                    <Card.Content style={styles.statContent}>
                      <Text
                        variant="headlineSmall"
                        style={[
                          styles.statValue,
                          { color: theme.colors.primary },
                        ]}
                      >
                        {item.value}
                      </Text>
                      {item.acked !== undefined && (
                        <Text
                          variant="bodyMedium"
                          style={[
                            styles.ackedValue,
                            { color: theme.colors.secondary },
                          ]}
                        >
                          {t("userProfile.acked")}: {item.acked}
                        </Text>
                      )}
                      <Text
                        variant="bodySmall"
                        style={[
                          styles.statLabel,
                          { color: theme.colors.onSurfaceVariant },
                        ]}
                      >
                        {item.label}
                      </Text>
                    </Card.Content>
                  </Card>
                ))}
              </View>
            )}
            maxHeight={400}
          />
        )}

        {/* Devices Section */}
        <DetailSectionCard
          title={t("devices.title")}
          description={
            push.needsPwa
              ? t("common.pushNeedsPwaHint")
              : push.pushPermissionError
              ? t("common.pushPermissionsHint")
              : undefined
          }
          actionButton={{
            label: t("devices.registerThisDevice"),
            icon: "cellphone-link",
            onPress: handleRegisterDevice,
            disabled: disabledRegister,
            loading: managingDevice,
          }}
          // actionButton={
          //   isCurrentRegistered
          //     ? {
          //         label: t("devices.unregisterDevice"),
          //         icon: "cellphone-off",
          //         onPress: handleUnregisterDevice,
          //         disabled: disabledUnregister,
          //         loading: managingDevice,
          //       }
          //     : {
          //         label: t("devices.registerThisDevice"),
          //         icon: "cellphone-link",
          //         onPress: handleRegisterDevice,
          //         disabled: disabledRegister,
          //         loading: managingDevice,
          //       }
          // }
          loading={devicesLoading}
          emptyState={{
            icon: "cellphone",
            text: sortedDevices.length === 0 ? t("devices.noDevicesTitle") : "",
          }}
          items={sortedDevices}
          renderItem={(device) => {
            const isCurrentDevice = storedDeviceId
              ? device.id === storedDeviceId
              : !!deviceToken && deviceToken === device.deviceToken;

            return (
              <SwipeableDeviceItem
                key={device.id}
                device={device}
                isCurrentDevice={isCurrentDevice}
              />
            );
          }}
          maxHeight={500}
        />

        {/* Entity Executions Section - Show notification sending history */}
        <View style={styles.executionsSection}>
          <EntityExecutionsSection entityType={ExecutionType.Notification} />
        </View>
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 12,
  },
  statItem: {
    width: "48%",
    marginBottom: 0,
  },
  statContent: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 12,
  },
  statValue: {
    marginBottom: 4,
    textAlign: "center",
  },
  ackedValue: {
    marginBottom: 4,
    textAlign: "center",
  },
  statLabel: {
    textAlign: "center",
  },
  executionsSection: {
    marginTop: 16,
    marginBottom: 100,
  },
});
