import { useI18n } from "@/hooks/useI18n";
import { useUserNotificationStatsQuery } from "@/generated/gql-operations-generated";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  ActivityIndicator,
  Card,
  Text,
  useTheme,
} from "react-native-paper";

interface NotificationStatsProps {
  refreshing?: boolean;
}

export default function NotificationStats({ refreshing }: NotificationStatsProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const { data, loading, error, refetch } = useUserNotificationStatsQuery({
    fetchPolicy: 'cache-and-network',
  });

  React.useEffect(() => {
    if (refreshing) {
      refetch();
    }
  }, [refreshing, refetch]);

  if (loading && !data) {
    return (
      <Card style={styles.container}>
        <Card.Content style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text style={[styles.loadingText, { color: theme.colors.onSurface }]}>
            {t("common.loading")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  if (error) {
    return (
      <Card style={styles.container}>
        <Card.Content style={styles.errorContainer}>
          <Text style={[styles.errorText, { color: theme.colors.error }]}>
            {t("common.error")}
          </Text>
        </Card.Content>
      </Card>
    );
  }

  const stats = data?.userNotificationStats;

  if (!stats) {
    return null;
  }

  const statItems = [
    { label: t("userProfile.today"), value: stats.today },
    { label: t("userProfile.thisWeek"), value: stats.thisWeek },
    { label: t("userProfile.thisMonth"), value: stats.thisMonth },
    { label: t("userProfile.total"), value: stats.total },
  ];

  return (
    <Card style={styles.container}>
      <Card.Content>
        <View style={styles.header}>
          <Text variant="titleMedium" style={{ color: theme.colors.onSurface }}>
            {t("userProfile.notificationStats")}
          </Text>
        </View>
        
        <View style={styles.statsGrid}>
          {statItems.map((item, index) => (
            <Card key={index} style={styles.statItem}>
              <Card.Content style={styles.statContent}>
                <Text variant="headlineSmall" style={[styles.statValue, { color: theme.colors.primary }]}>
                  {item.value}
                </Text>
                <Text variant="bodySmall" style={[styles.statLabel, { color: theme.colors.onSurfaceVariant }]}>
                  {item.label}
                </Text>
              </Card.Content>
            </Card>
          ))}
        </View>
      </Card.Content>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  loadingContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 16,
  },
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    textAlign: "center",
  },
  header: {
    marginBottom: 16,
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
  statLabel: {
    textAlign: "center",
  },
});
