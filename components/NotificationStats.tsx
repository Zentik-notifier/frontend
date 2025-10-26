import { useI18n } from "@/hooks/useI18n";
import { UserNotificationStatsFragment } from "@/generated/gql-operations-generated";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  Card,
  Text,
  useTheme,
} from "react-native-paper";

interface NotificationStatsProps {
  dateStats: UserNotificationStatsFragment;
  showAcked?: boolean;
}

export default function NotificationStats({ 
  dateStats,
  showAcked = false,
}: NotificationStatsProps) {
  const theme = useTheme();
  const { t } = useI18n();

  const stats = dateStats;

  if (!stats) {
    return null;
  }

  const statItems = [
    { label: t("userProfile.today"), value: stats.today, acked: stats.todayAcked },
    { label: t("userProfile.thisWeek"), value: stats.thisWeek, acked: stats.thisWeekAcked },
    { label: t("userProfile.last7Days"), value: stats.last7Days, acked: stats.last7DaysAcked },
    { label: t("userProfile.thisMonth"), value: stats.thisMonth, acked: stats.thisMonthAcked },
    { label: t("userProfile.last30Days"), value: stats.last30Days, acked: stats.last30DaysAcked },
    { label: t("userProfile.total"), value: stats.total, acked: stats.totalAcked },
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
                {showAcked && item.acked !== undefined && (
                  <Text variant="bodyMedium" style={[styles.ackedValue, { color: theme.colors.secondary }]}>
                    {t("userProfile.acked")}: {item.acked}
                  </Text>
                )}
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
  ackedValue: {
    marginBottom: 4,
    textAlign: "center",
  },
  statLabel: {
    textAlign: "center",
  },
});
