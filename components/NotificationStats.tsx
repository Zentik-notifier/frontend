import { Colors } from "@/constants/Colors";
import { useI18n } from "@/hooks/useI18n";
import { useColorScheme } from "@/hooks/useTheme";
import { useUserNotificationStatsQuery } from "@/generated/gql-operations-generated";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { ThemedText } from "./ThemedText";
import { ThemedView } from "./ThemedView";

interface NotificationStatsProps {
  refreshing?: boolean;
}

export default function NotificationStats({ refreshing }: NotificationStatsProps) {
  const colorScheme = useColorScheme();
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
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t("userProfile.notificationStats")}</ThemedText>
        <ThemedText style={styles.loading}>{t("common.loading")}</ThemedText>
      </ThemedView>
    );
  }

  if (error) {
    return (
      <ThemedView style={styles.container}>
        <ThemedText style={styles.title}>{t("userProfile.notificationStats")}</ThemedText>
        <ThemedText style={styles.error}>{t("common.error")}</ThemedText>
      </ThemedView>
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
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>{t("userProfile.notificationStats")}</ThemedText>
      <View style={styles.statsGrid}>
        {statItems.map((item, index) => (
          <ThemedView key={index} style={[styles.statItem, { backgroundColor: Colors[colorScheme ?? 'light'].background }]}>
            <ThemedText style={styles.statValue}>{item.value}</ThemedText>
            <ThemedText style={styles.statLabel}>{item.label}</ThemedText>
          </ThemedView>
        ))}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
  },
  loading: {
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
    paddingVertical: 20,
  },
  error: {
    fontSize: 14,
    color: '#ff6b6b',
    textAlign: 'center',
    paddingVertical: 20,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    opacity: 0.7,
    textAlign: 'center',
  },
});
