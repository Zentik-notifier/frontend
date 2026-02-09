import PaperScrollView from "@/components/ui/PaperScrollView";
import { useEntitySorting } from "@/hooks/useEntitySorting";
import { useI18n } from "@/hooks/useI18n";
import { useNavigationUtils } from "@/utils/navigation";
import React from "react";
import { StyleSheet, View } from "react-native";
import { Icon, Text, useTheme } from "react-native-paper";
import {
  useGetExternalNotifySystemsQuery,
  usePublicAppConfigQuery,
} from "@/generated/gql-operations-generated";
import SwipeableExternalNotifySystemItem from "./SwipeableExternalNotifySystemItem";

interface ExternalNotifySystemsSettingsProps {
  refreshing?: boolean;
}

export default function ExternalNotifySystemsSettings({
  refreshing,
}: ExternalNotifySystemsSettingsProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const { navigateToCreateExternalNotifySystem } = useNavigationUtils();
  const { data: appConfig } = usePublicAppConfigQuery();
  const externalNotifySystemsEnabled =
    appConfig?.publicAppConfig?.externalNotifySystemsEnabled ?? true;

  const {
    data,
    loading,
    refetch,
    error,
  } = useGetExternalNotifySystemsQuery();

  const systems = data?.externalNotifySystems ?? [];
  const sorted = useEntitySorting(systems, "desc");

  const handleCreate = () => {
    navigateToCreateExternalNotifySystem();
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (!externalNotifySystemsEnabled) {
    return (
      <PaperScrollView loading={false}>
        <View style={styles.emptyState}>
          <Icon
            source="server-off"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="headlineSmall" style={styles.emptyText}>
            {t("externalServers.featureDisabledTitle")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            {t("externalServers.featureDisabledSubtext")}
          </Text>
        </View>
      </PaperScrollView>
    );
  }

  return (
    <PaperScrollView
      onAdd={handleCreate}
      onRefresh={handleRefresh}
      loading={loading}
      error={!loading && !!error}
    >
      {sorted.length === 0 ? (
        <View style={styles.emptyState}>
          <Icon
            source="server"
            size={64}
            color={theme.colors.onSurfaceVariant}
          />
          <Text variant="headlineSmall" style={styles.emptyText}>
            {t("externalServers.noServersTitle")}
          </Text>
          <Text variant="bodyMedium" style={styles.emptySubtext}>
            {t("externalServers.noServersSubtext")}
          </Text>
        </View>
      ) : (
        <View style={styles.listContainer}>
          {sorted.map((system) => (
            <SwipeableExternalNotifySystemItem key={system.id} system={system} />
          ))}
        </View>
      )}
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 16,
    textAlign: "center",
  },
  emptySubtext: {
    marginTop: 8,
    textAlign: "center",
  },
  listContainer: {
    flex: 1,
  },
});
