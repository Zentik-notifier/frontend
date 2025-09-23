import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import { Icon } from "@/components/ui";
import { Colors } from "@/constants/Colors";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { FlashList } from "@shopify/flash-list";
import { openSharedCacheDb } from "@/services/media-cache-db";
import { AppLog, LogRepository } from "@/services/log-repository";
import { useColorScheme } from "@/hooks/useTheme";
import { SafeAreaView } from "react-native-safe-area-context";
import { useI18n } from "@/hooks/useI18n";
import * as Sharing from "expo-sharing";
import { File, Paths } from "expo-file-system";

export default function AppLogs() {
  const colorScheme = useColorScheme();
  const { t } = useI18n();
  const [logs, setLogs] = useState<AppLog[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);
  const [query, setQuery] = useState<string>("");
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const loadLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const db = await openSharedCacheDb();
      const repo = new LogRepository(db);
      const all = await repo.listSince(0);
      setLogs(all);
    } catch (e) {
      console.warn("Failed to load logs", e);
      setLogs([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshFromDb = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await loadLogs();
    } finally {
      setIsRefreshing(false);
    }
  }, [loadLogs]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const levelToColor = useMemo(
    () =>
      ({
        debug: Colors[colorScheme].textSecondary,
        info: Colors[colorScheme].tint,
        warn: Colors[colorScheme].warning,
        error: Colors[colorScheme].error,
      } as const),
    [colorScheme]
  );

  const renderItem = useCallback(
    ({ item }: { item: AppLog }) => {
      let meta: any = null;
      try {
        meta = item.metaJson ? JSON.parse(item.metaJson) : null;
      } catch {}
      return (
        <View
          style={[
            styles.logItem,
            {
              borderColor: Colors[colorScheme].border,
              backgroundColor: Colors[colorScheme].backgroundCard,
            },
          ]}
        >
          <View style={styles.logHeader}>
            <View style={styles.levelBadgeContainer}>
              <View
                style={[
                  styles.levelBadge,
                  { backgroundColor: levelToColor[item.level] },
                ]}
              />
              <ThemedText style={styles.levelText}>
                {item.level.toUpperCase()}
              </ThemedText>
            </View>
            <ThemedText style={styles.dateText}>
              {new Date(item.timestamp).toLocaleString()}
            </ThemedText>
          </View>
          {!!item.tag && (
            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>tag:</ThemedText>
              <ThemedText style={styles.metaValue}>{item.tag}</ThemedText>
            </View>
          )}
          <View style={styles.metaRow}>
            <ThemedText style={styles.metaLabel}>message:</ThemedText>
            <ThemedText style={styles.metaValue}>{item.message}</ThemedText>
          </View>
          {!!meta && (
            <View style={styles.metaRow}>
              <ThemedText style={styles.metaLabel}>meta:</ThemedText>
              <ThemedText style={styles.metaValue}>
                {truncate(JSON.stringify(meta))}
              </ThemedText>
            </View>
          )}
        </View>
      );
    },
    [colorScheme, levelToColor]
  );

  const filteredLogs = useMemo(() => {
    if (!query) return logs;
    const q = query.toLowerCase();
    return logs.filter((l) => {
      const parts = [l.level, l.tag ?? "", l.message, l.metaJson ?? ""];
      return parts.some((p) => (p ?? "").toString().toLowerCase().includes(q));
    });
  }, [logs, query]);

  const handleExportLogs = useCallback(async () => {
    try {
      setIsExporting(true);
      const db = await openSharedCacheDb();
      const repo = new LogRepository(db);
      const logs = await repo.listSince(0);

      const formattedLogs = logs.map((l: any) => ({
        ...l,
        timeLocal: new Date(Number(l.timestamp)).toLocaleString(),
      }));

      const payload = {
        meta: {
          exportedAt: new Date().toISOString(),
          count: formattedLogs.length,
        },
        logs: formattedLogs,
      };

      const json = JSON.stringify(payload, null, 2);
      const fileName = `app-logs-${new Date().toISOString().replace(/[:]/g, "-")}.json`;
      const destPath = `${Paths.document.uri}${fileName}`;
      const file = new File(destPath);
      file.write(json);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(destPath, {
          mimeType: "application/json",
          dialogTitle: t("appSettings.logs.exportComplete"),
        });
      } else {
        Alert.alert(
          t("appSettings.logs.exportComplete"),
          t("appSettings.logs.exportCompleteMessage", { path: destPath })
        );
      }
      try {
        file.delete();
      } catch {}
    } catch (error) {
      console.error("Error exporting logs:", error);
      Alert.alert(t("appSettings.logs.exportError"));
    } finally {
      setIsExporting(false);
    }
  }, [t]);

  return (
    <SafeAreaView
      edges={["left", "right", "bottom"]}
      style={[styles.safe, { backgroundColor: Colors[colorScheme].background }]}
    >
      <ThemedView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[
              styles.exportButton,
              {
                borderColor: Colors[colorScheme].border,
                backgroundColor: Colors[colorScheme].backgroundCard,
              },
            ]}
            onPress={handleExportLogs}
            activeOpacity={0.8}
            disabled={isExporting}
          >
            {isExporting ? (
              <ActivityIndicator size="small" color={Colors[colorScheme].tint} />
            ) : (
              <Icon name="share" size="sm" color="primary" />
            )}
            <ThemedText style={styles.exportText}>
              {t("appSettings.logs.exportButton")}
            </ThemedText>
          </TouchableOpacity>
        </View>

        <ThemedView
          style={[
            styles.searchContainer,
            {
              backgroundColor: Colors[colorScheme].inputBackground,
              borderColor: Colors[colorScheme].border,
            },
          ]}
        >
          <Icon name="search" size="sm" color="secondary" />
          <TextInput
            style={[styles.searchInput, { color: Colors[colorScheme].text }]}
            placeholder={t("appLogs.filterPlaceholder")}
            placeholderTextColor={Colors[colorScheme].textSecondary}
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {query.length > 0 && (
            <TouchableOpacity onPress={() => setQuery("")} style={styles.clearBtn}>
              <Icon name="cancel" size="sm" color="secondary" />
            </TouchableOpacity>
          )}
        </ThemedView>

        {isLoading && logs.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors[colorScheme].tint} />
            <ThemedText style={styles.loadingText}>{t("appLogs.loading")}</ThemedText>
          </View>
        ) : (
          <FlashList
            data={filteredLogs}
            keyExtractor={(item) => String(item.id ?? item.timestamp)}
            renderItem={renderItem}
            refreshControl={
              <RefreshControl
                refreshing={isRefreshing}
                onRefresh={refreshFromDb}
                colors={[Colors[colorScheme].tint]}
                tintColor={Colors[colorScheme].tint}
              />
            }
            contentContainerStyle={styles.listContent}
          />
        )}
      </ThemedView>
    </SafeAreaView>
  );
}

function truncate(text: string, max: number = 300): string {
  if (!text) return "";
  return text.length > max ? text.slice(0, max) + "…" : text;
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    marginBottom: 12,
  },
  exportButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    height: 36,
  },
  exportText: {
    fontSize: 14,
    fontWeight: "600",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    height: 40,
    marginBottom: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    height: 40,
  },
  clearBtn: {
    padding: 4,
  },
  listContent: {
    paddingVertical: 8,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    opacity: 0.7,
  },
  logItem: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  levelBadgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  levelBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  levelText: {
    fontSize: 12,
    fontWeight: "700",
    opacity: 0.85,
  },
  dateText: {
    fontSize: 12,
    opacity: 0.7,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginTop: 2,
  },
  metaLabel: {
    fontSize: 12,
    fontWeight: "600",
    opacity: 0.75,
    minWidth: 64,
  },
  metaValue: {
    flex: 1,
    fontSize: 12,
    opacity: 0.9,
  },
});


