import { downloadHistoryService, DownloadHistoryEntry } from "@/services/download-history-service";
import { useI18n } from "@/hooks/useI18n";
import React, { useCallback, useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Button, List, Text, useTheme } from "react-native-paper";
import PaperScrollView from "./ui/PaperScrollView";

function formatDate(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatSize(bytes?: number): string {
  if (bytes == null || bytes === 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function DownloadsList() {
  const theme = useTheme();
  const { t } = useI18n();
  const [entries, setEntries] = useState<DownloadHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const list = await downloadHistoryService.getDownloads();
      setEntries(list);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleClear = useCallback(async () => {
    await downloadHistoryService.clear();
    setEntries([]);
  }, []);

  return (
    <PaperScrollView>
      <View style={styles.container}>
        {entries.length > 0 && (
          <Button mode="outlined" onPress={handleClear} style={styles.clearButton}>
            {t("downloads.clear")}
          </Button>
        )}
        {loading ? (
          <Text variant="bodyMedium" style={{ color: theme.colors.onSurfaceVariant }}>
            …
          </Text>
        ) : entries.length === 0 ? (
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurfaceVariant }}>
            {t("downloads.noDownloads")}
          </Text>
        ) : (
          <List.Section>
            {entries.map((entry) => (
              <List.Item
                key={entry.id}
                title={entry.bucketName ?? entry.mediaType ?? entry.url.slice(0, 40)}
                description={`${formatDate(entry.completedAt)} · ${formatSize(entry.size)}`}
                left={(props) => <List.Icon {...props} icon="file-download-outline" />}
              />
            ))}
          </List.Section>
        )}
      </View>
    </PaperScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
  },
  clearButton: {
    marginBottom: 16,
    alignSelf: "flex-start",
  },
});
