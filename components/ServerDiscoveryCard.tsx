import React from "react";
import { View, StyleSheet } from "react-native";
import {
  Button,
  Card,
  Text,
  ActivityIndicator,
  useTheme,
  List,
} from "react-native-paper";
import { useI18n } from "@/hooks/useI18n";
import { useServerDiscovery, DiscoveredServer } from "@/hooks/useServerDiscovery";

export interface ServerDiscoveryCardProps {
  currentServerUrl: string;
  onSelectServer: (baseUrl: string) => void;
}

export function ServerDiscoveryCard({
  currentServerUrl,
  onSelectServer,
}: ServerDiscoveryCardProps) {
  const theme = useTheme();
  const { t } = useI18n();
  const {
    isNative,
    scanning,
    servers,
    error,
    startScan,
    stopScan,
  } = useServerDiscovery();

  const hasCurrent = currentServerUrl.trim().length > 0;
  const currentDisplay = hasCurrent
    ? currentServerUrl.replace(/\/$/, "")
    : t("appSettings.serverDiscovery.noServerSet");

  return (
    <Card style={styles.card}>
      <Card.Content>
        <Text variant="headlineSmall" style={styles.sectionTitle}>
          {t("appSettings.serverDiscovery.title")}
        </Text>
        <Text
          variant="bodyMedium"
          style={[
            styles.sectionDescription,
            { color: theme.colors.onSurfaceVariant, marginBottom: 8 },
          ]}
        >
          {t("appSettings.serverDiscovery.description")}
        </Text>
        <Text
          variant="bodySmall"
          style={[styles.currentServer, { color: theme.colors.primary }]}
          numberOfLines={1}
        >
          {t("appSettings.serverDiscovery.currentServer")}: {currentDisplay}
        </Text>

        {!isNative ? (
          <Text
            variant="bodySmall"
            style={[
              styles.sectionDescription,
              { color: theme.colors.onSurfaceVariant, marginTop: 12 },
            ]}
          >
            {t("appSettings.serverDiscovery.onlyOnNative")}
          </Text>
        ) : (
          <>
            <View style={styles.actions}>
              <Button
                mode="outlined"
                onPress={scanning ? stopScan : startScan}
                disabled={false}
                icon={scanning ? "stop" : "lan-connect"}
                style={styles.scanButton}
              >
                {scanning
                  ? t("appSettings.serverDiscovery.stopScan")
                  : t("appSettings.serverDiscovery.findOnLan")}
              </Button>
              {scanning && (
                <ActivityIndicator size="small" style={styles.spinner} />
              )}
            </View>
            {error && (
              <Text
                variant="bodySmall"
                style={{ color: theme.colors.error, marginTop: 8 }}
              >
                {error}
              </Text>
            )}
            {servers.length > 0 && (
              <View style={styles.listContainer}>
                <Text
                  variant="labelMedium"
                  style={[
                    styles.listTitle,
                    { color: theme.colors.onSurfaceVariant },
                  ]}
                >
                  {t("appSettings.serverDiscovery.discoveredServers")}
                </Text>
                {servers.map((server) => (
                  <DiscoveredServerItem
                    key={server.id}
                    server={server}
                    onSelect={() => onSelectServer(server.baseUrl)}
                  />
                ))}
              </View>
            )}
            {!scanning && servers.length === 0 && hasCurrent && (
              <Text
                variant="bodySmall"
                style={[
                  styles.sectionDescription,
                  { color: theme.colors.onSurfaceVariant, marginTop: 8 },
                ]}
              >
                {t("appSettings.serverDiscovery.hint")}
              </Text>
            )}
          </>
        )}
      </Card.Content>
    </Card>
  );
}

function DiscoveredServerItem({
  server,
  onSelect,
}: {
  server: DiscoveredServer;
  onSelect: () => void;
}) {
  const { t } = useI18n();
  return (
    <List.Item
      title={server.name}
      description={`${server.host}:${server.port}`}
      right={() => (
        <Button mode="contained-tonal" compact onPress={onSelect}>
          {t("appSettings.serverDiscovery.useThisServer")}
        </Button>
      )}
      style={styles.listItem}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
  },
  sectionTitle: {
    marginBottom: 4,
  },
  sectionDescription: {
    lineHeight: 20,
  },
  currentServer: {
    marginTop: 4,
    fontWeight: "500",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 12,
    gap: 8,
  },
  scanButton: {
    flex: 0,
  },
  spinner: {
    marginLeft: 4,
  },
  listContainer: {
    marginTop: 16,
  },
  listTitle: {
    marginBottom: 8,
  },
  listItem: {
    paddingVertical: 4,
  },
});
