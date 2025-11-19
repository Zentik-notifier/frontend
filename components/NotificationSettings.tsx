import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from "react-native-paper";
import { useUserNotificationStatsQuery } from "@/generated/gql-operations-generated";
import NotificationStats from "./NotificationStats";
import PaperScrollView from "./ui/PaperScrollView";

export default function NotificationSettings() {
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToCreateNotification } = useNavigationUtils();

  const {
    data: statsData,
    loading,
    error,
    refetch,
  } = useUserNotificationStatsQuery();

  const handleRefresh = async () => {
    await refetch();
  };

  return (
    <PaperScrollView
      onRefresh={handleRefresh}
      loading={loading}
      error={!loading && !!error}
      customActions={[
        {
          label: t("notifications.title"),
          icon: "plus",
          onPress: navigateToCreateNotification,
        },
      ]}
    >
      <View style={styles.container}>
        {statsData?.userNotificationStats && (
          <NotificationStats dateStats={statsData.userNotificationStats} />
        )}
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  noDataContainer: {
    padding: 24,
    alignItems: "center",
    justifyContent: "center",
  },
});
